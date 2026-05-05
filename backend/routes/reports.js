const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const auth = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Use memory storage for Vercel, disk storage for local
const storage = process.env.VERCEL ? multer.memoryStorage() : multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Submit Report
router.post('/', auth, upload.any(), async (req, res) => {
    try {
        console.log('--- SUPABASE SUBMISSION START ---');
        
        const branch_id = parseInt(req.body.branch_id);
        const report_date = req.body.report_date;
        const system_total = parseFloat(req.body.system_total || 0);
        const card_upi_total = parseFloat(req.body.card_upi_total || 0);
        const sodexo_total = parseFloat(req.body.sodexo_total || 0);
        const credit_note_total = parseFloat(req.body.credit_note_total || 0);
        const expense = parseFloat(req.body.expense || 0);
        const shift = parseInt(req.body.shift || 1);
        const bill_amount = parseFloat(req.body.bill_amount || 0);
        const denominations = req.body.denominations;
        const cheques = req.body.cheques;
        let { expense_desc } = req.body;

        const parsedDenoms = JSON.parse(denominations || '[]');
        let parsedCheques = [];
        try {
            if (cheques) {
                parsedCheques = typeof cheques === 'string' ? JSON.parse(cheques) : cheques;
            }
        } catch (e) {
            console.error('Cheque Parse Error:', e.message);
        }

        if (!Array.isArray(parsedCheques)) parsedCheques = [];
        const validCheques = parsedCheques.filter(c => c && c.cheque_no && (parseFloat(c.amount) >= 0));

        let total_cash = 0;
        parsedDenoms.forEach(d => { total_cash += parseFloat(d.total || 0); });

        let total_cheques = 0;
        validCheques.forEach(c => { total_cheques += parseFloat(c.amount || 0); });

        const grand_total = total_cash + card_upi_total + sodexo_total + credit_note_total + total_cheques + expense;

        // Handle File Uploads (Memory or Disk)
        const getFileUrl = async (file) => {
            if (!file) return null;
            if (process.env.VERCEL) {
                // For Vercel, you should ideally upload to Supabase Storage
                // For now, we'll return a placeholder or implement Supabase Storage if bucket exists
                try {
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const { data, error } = await supabase.storage
                        .from('proofs')
                        .upload(fileName, file.buffer, { contentType: file.mimetype });
                    if (error) throw error;
                    const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(fileName);
                    return publicUrl;
                } catch (e) {
                    console.error('Supabase Storage Error:', e.message);
                    return null;
                }
            }
            return file.path.replace(/\\/g, '/');
        };

        const card_upi_proof_file = req.files && req.files.find(f => f.fieldname === 'card_upi_proof');
        const card_upi_proof_url = await getFileUrl(card_upi_proof_file);

        let parsedExpenses = [];
        try { parsedExpenses = JSON.parse(expense_desc); } catch {}
        
        if (Array.isArray(parsedExpenses)) {
            for (let idx = 0; idx < parsedExpenses.length; idx++) {
                const exp = parsedExpenses[idx];
                const proof_file = req.files && req.files.find(f => f.fieldname === `expense_proof_${idx}`);
                if (proof_file) {
                    exp.proof_url = await getFileUrl(proof_file);
                }
            }
            expense_desc = JSON.stringify(parsedExpenses);
        }

        // Supabase Insert/Update Logic
        // 1. Check for existing report
        const { data: existingReport } = await supabase
            .from('cashreports')
            .select('id')
            .eq('branch_id', branch_id)
            .eq('report_date', report_date)
            .eq('shift', shift)
            .single();

        let reportId;
        const reportData = {
            branch_id,
            report_date,
            system_total,
            card_upi_total,
            card_upi_proof_url,
            sodexo_total,
            credit_note_total,
            cheque_total: total_cheques,
            expense,
            expense_desc,
            total_cash,
            grand_total,
            shift,
            bill_amount
        };

        if (existingReport) {
            reportId = existingReport.id;
            const { error: updateError } = await supabase
                .from('cashreports')
                .update(reportData)
                .eq('id', reportId);
            if (updateError) throw updateError;
        } else {
            const { data: newReport, error: insertError } = await supabase
                .from('cashreports')
                .insert(reportData)
                .select()
                .single();
            if (insertError) throw insertError;
            reportId = newReport.id;
        }

        // 2. Handle Details (Delete and Re-insert)
        await supabase.from('currencydetails').delete().eq('report_id', reportId);
        await supabase.from('cheques').delete().eq('report_id', reportId);

        if (parsedDenoms.length > 0) {
            const { error: denomError } = await supabase
                .from('currencydetails')
                .insert(parsedDenoms.map(d => ({
                    report_id: reportId,
                    denomination: parseInt(d.denomination),
                    quantity: parseInt(d.quantity),
                    total: parseFloat(d.total)
                })));
            if (denomError) throw denomError;
        }

        if (validCheques.length > 0) {
            const { error: chqError } = await supabase
                .from('cheques')
                .insert(validCheques.map(c => ({
                    report_id: reportId,
                    cheque_no: c.cheque_no,
                    amount: parseFloat(c.amount),
                    cheque_date: c.cheque_date || report_date
                })));
            if (chqError) throw chqError;
        }

        // 3. Save report backup (Local file) - SKIP ON VERCEL
        if (!process.env.VERCEL) {
            try {
                const { data: branch } = await supabase.from('branches').select('name').eq('id', branch_id).single();
                const branchName = branch ? branch.name : `Branch${branch_id}`;
                const { data: setting } = await supabase.from('settings').select('value').eq('key', 'backup_path').single();
                const folderPath = setting ? setting.value : 'C:\\Users\\admin\\Desktop\\reporting';

                const lines = [
                    `========================================`,
                    `     DAILY CASH REPORT (SUPABASE)`,
                    `========================================`,
                    `Branch   : ${branchName}`,
                    `Date     : ${report_date} (Shift ${shift})`,
                    `----------------------------------------`,
                    `CASH DENOMINATIONS`,
                    ...parsedDenoms.filter(d => d.quantity > 0).map(d => `  ₹${d.denomination} x ${d.quantity} = ₹${d.total}`),
                    `  Total Cash         : ₹ ${total_cash.toFixed(2)}`,
                    `----------------------------------------`,
                    `DIGITAL PAYMENTS`,
                    `  Card & UPI Payments : ₹ ${card_upi_total.toFixed(2)}`,
                    `  Sodexo Total       : ₹ ${sodexo_total.toFixed(2)}`,
                    `  Credit Note Total  : ₹ ${credit_note_total.toFixed(2)}`,
                    `  System Total       : ₹ ${system_total.toFixed(2)}`,
                    `----------------------------------------`,
                    `CHEQUES`,
                    ...(validCheques.length > 0 ? validCheques.map((c, i) => `  ${i+1}. No: ${c.cheque_no} | ₹${parseFloat(c.amount).toFixed(2)} | Date: ${c.cheque_date || report_date}`) : [`  No cheques`]),
                    `  Total Cheques      : ₹ ${total_cheques.toFixed(2)}`,
                    `----------------------------------------`,
                    `EXPENSES`,
                    `  Total Expenses     : ₹ ${expense.toFixed(2)}`,
                    `========================================`,
                    `  GRAND TOTAL        : ₹ ${grand_total.toFixed(2)}`,
                    `========================================`,
                    `Submitted at: ${new Date().toLocaleString()}`,
                ];

                const fileName = `${branchName.toLowerCase()}_s${shift}_${report_date}.txt`;
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
                fs.writeFileSync(path.join(folderPath, fileName), lines.join('\n'), 'utf8');
            } catch (fileErr) {
                console.error('File backup error:', fileErr.message);
            }
        }

        res.json({ message: 'Report submitted successfully', reportId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error: ' + err.message });
    }
});

// Get all reports
router.get('/', auth, async (req, res) => {
    try {
        let query = supabase
            .from('cashreports')
            .select('*, branches(name), currencydetails(*), cheques(*)');

        if (req.user.role === 'Branch') {
            query = query.eq('branch_id', req.user.branch_id);
        } else {
            if (req.query.branch_id) query = query.eq('branch_id', req.query.branch_id);
        }

        if (req.query.date) {
            query = query.eq('report_date', req.query.date);
        } else if (req.query.start_date && req.query.end_date) {
            query = query.gte('report_date', req.query.start_date).lte('report_date', req.query.end_date);
        }

        const { data: reports, error } = await query.order('report_date', { ascending: false });
        if (error) throw error;

        // Flatten branch name and details for frontend compatibility
        const formattedReports = reports.map(r => ({
            ...r,
            branch_name: r.branches ? r.branches.name : `Branch${r.branch_id}`,
            denominations: r.currencydetails || [],
            cheques: r.cheques || []
        }));

        res.json(formattedReports);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get report details
router.get('/:id', auth, async (req, res) => {
    try {
        const { data: report, error } = await supabase
            .from('cashreports')
            .select('*, branches(name), currencydetails(*), cheques(*)')
            .eq('id', req.params.id)
            .single();
        
        if (error || !report) return res.status(404).json({ error: 'Not found' });

        if (req.user.role !== 'Admin' && req.user.branch_id !== report.branch_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        res.json({
            ...report,
            branch_name: report.branches ? report.branches.name : null,
            denominations: report.currencydetails || [],
            cheques: report.cheques || []
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Settings (Admin only)
router.get('/settings', auth, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/settings', auth, async (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const { key, value } = req.body;
        const { error } = await supabase.from('settings').upsert({ key, value });
        if (error) throw error;
        res.json({ message: 'Setting updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
