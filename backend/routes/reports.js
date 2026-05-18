const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const auth = require('../middleware/auth');
const { logError } = require('../logger');
const { validateReport } = require('../aiValidator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

if (!process.env.VERCEL && !fs.existsSync('uploads')) {
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

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
};

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
            const parseErr = new Error(`[REPORT SUBMIT] Cheque parse failed for branch_id=${branch_id}, date=${report_date}: ${e.message}`);
            await logError(parseErr, req);
            console.error('Cheque Parse Error:', e.message);
        }

        if (!Array.isArray(parsedCheques)) parsedCheques = [];
        
        // Strict Validation
        for (const c of parsedCheques) {
            if ((c.amount && !c.cheque_no) || (!c.amount && c.cheque_no)) {
                const valErr = new Error(`[REPORT SUBMIT] Incomplete cheque details for branch_id=${branch_id}, date=${report_date}: cheque_no=${c.cheque_no}, amount=${c.amount}`);
                await logError(valErr, req);
                return res.status(400).json({ error: 'Incomplete cheque details: Both number and amount are required.' });
            }
        }

        // ── AI/ML Anomaly Detection ─────────────────────────────────
        let parsedExpenses = [];
        try { parsedExpenses = JSON.parse(expense_desc || '[]'); } catch {}

        const aiResult = validateReport({
            branch_id,
            report_date,
            shift,
            system_total,
            total_cash: parsedDenoms.reduce((a, d) => a + parseFloat(d.total || 0), 0),
            card_upi_total,
            sodexo_total,
            credit_note_total,
            cheque_total: parsedCheques.filter(c => c && c.cheque_no && parseFloat(c.amount) >= 0).reduce((a, c) => a + parseFloat(c.amount || 0), 0),
            expense,
            grand_total: parsedDenoms.reduce((a, d) => a + parseFloat(d.total || 0), 0) + card_upi_total + sodexo_total + credit_note_total + parsedCheques.filter(c => c && c.cheque_no).reduce((a, c) => a + parseFloat(c.amount || 0), 0) + expense,
            cheques: parsedCheques,
            expenses: parsedExpenses,
        });

        // Block HIGH-risk reports that fail validation
        if (!aiResult.isValid) {
            const aiErr = new Error(`[AI VALIDATION] HIGH-risk report blocked for branch_id=${branch_id}, date=${report_date}: ${aiResult.violations.map(v => v.rule_id).join(', ')}`);
            await logError(aiErr, req);
            return res.status(422).json({
                error: 'Report blocked by AI Integrity Check.',
                aiAnalysis: aiResult,
            });
        }

        if (aiResult.riskLevel !== 'CLEAR') {
            console.warn(`[AI WARNING] Risk=${aiResult.riskLevel} | Hash=${aiResult.reportHash} | branch=${branch_id} | date=${report_date}`);
        }

        const validCheques = parsedCheques.filter(c => c && c.cheque_no && (parseFloat(c.amount) >= 0));

        let total_cash = 0;
        parsedDenoms.forEach(d => { total_cash += parseFloat(d.total || 0); });

        let total_cheques = 0;
        validCheques.forEach(c => { total_cheques += parseFloat(c.amount || 0); });

        const grand_total = total_cash + card_upi_total + sodexo_total + credit_note_total + total_cheques + expense;

        // Handle File Uploads
        const getFileUrl = async (file) => {
            if (!file) return null;
            if (process.env.VERCEL) {
                try {
                    const fileName = `${Date.now()}-${file.originalname}`;
                    const { data, error } = await supabase.storage
                        .from('proofs')
                        .upload(fileName, file.buffer, { contentType: file.mimetype });
                    if (error) throw error;
                    const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(fileName);
                    return publicUrl;
                } catch (e) {
                    await logError(new Error(`[FILE UPLOAD] Proof upload failed for branch_id=${branch_id}: ${e.message}`), req);
                    console.error('Supabase Storage Error:', e.message);
                    return null;
                }
            }
            return file.path.replace(/\\/g, '/');
        };

        const card_upi_proof_file = req.files && req.files.find(f => f.fieldname === 'card_upi_proof');
        const card_upi_proof_url = await getFileUrl(card_upi_proof_file);

        // Re-parse parsedExpenses (already done in AI block above, now handle proofs)
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

        // Check for existing report
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
            if (req.user.role === 'Branch') {
                const dupErr = new Error(`[REPORT SUBMIT] Duplicate submission blocked: branch_id=${branch_id}, date=${report_date}, shift=${shift}, user="${req.user.username}"`);
                await logError(dupErr, req);
                return res.status(403).json({ error: 'Report already submitted for this shift. You cannot refill it.' });
            }
            reportId = existingReport.id;
            const { error: updateError } = await supabase
                .from('cashreports')
                .update(reportData)
                .eq('id', reportId);
            if (updateError) {
                await logError(new Error(`[REPORT UPDATE] Failed to update report ID=${reportId}: ${updateError.message}`), req);
                throw updateError;
            }
        } else {
            const { data: newReport, error: insertError } = await supabase
                .from('cashreports')
                .insert(reportData)
                .select()
                .single();
            if (insertError) {
                await logError(new Error(`[REPORT INSERT] Failed to insert report for branch_id=${branch_id}, date=${report_date}: ${insertError.message}`), req);
                throw insertError;
            }
            reportId = newReport.id;
        }

        // Handle Details
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
            if (denomError) {
                await logError(new Error(`[DENOMINATIONS] Failed to save currency details for report ID=${reportId}: ${denomError.message}`), req);
                throw denomError;
            }
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
            if (chqError) {
                await logError(new Error(`[CHEQUES] Failed to save cheques for report ID=${reportId}: ${chqError.message}`), req);
                throw chqError;
            }
        }

        // Local file backup — SKIP ON VERCEL
        if (!process.env.VERCEL) {
            try {
                const { data: branch } = await supabase.from('branches').select('name').eq('id', branch_id).single();
                const branchName = branch ? branch.name : `Branch${branch_id}`;
                const { data: setting } = await supabase.from('settings').select('value').eq('key', 'backup_path').single();
                const folderPath = setting ? setting.value : 'C:\\Users\\admin\\Desktop\\reporting';

                const lines = [
                    `========================================`,
                    `     JAIN SUPER BAZAR`,
                    `     DAILY CASH REPORT`,
                    `========================================`,
                    `Branch   : ${branchName}`,
                    `Date     : ${formatDate(report_date)} (Shift ${shift})`,
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
                    `----------------------------------------`,
                    `AI INTEGRITY CHECK`,
                    `  Report Hash  : ${aiResult.reportHash}`,
                    `  Risk Level   : ${aiResult.riskLevel}`,
                    `  Verified At  : ${aiResult.timestamp}`,
                    `========================================`,
                ];

                const fileName = `${branchName.toLowerCase()}_s${shift}_${formatDate(report_date)}.txt`;
                if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
                // Retry file save up to 3 times
                let saved = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        fs.writeFileSync(path.join(folderPath, fileName), lines.join('\n'), 'utf8');
                        saved = true;
                        break;
                    } catch (writeErr) {
                        if (attempt === 3) throw writeErr;
                        await new Promise(r => setTimeout(r, 300 * attempt));
                    }
                }
                if (!saved) throw new Error('File write failed after 3 attempts');
            } catch (fileErr) {
                await logError(new Error(`[FILE BACKUP] Report file not saved for branch_id=${branch_id}, date=${report_date}: ${fileErr.message}`), req);
                console.error('File backup error:', fileErr.message);
            }
        }

        res.json({
            message: 'Report submitted successfully',
            reportId,
            reportHash: aiResult.reportHash,
            aiAnalysis: {
                riskLevel: aiResult.riskLevel,
                riskScore: aiResult.riskScore,
                violations: aiResult.violations,
                timestamp: aiResult.timestamp,
            },
        });
    } catch (err) {
        console.error(err);
        await logError(new Error(`[REPORT SUBMIT CRASH] ${err.message}`), req);
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

        const formattedReports = reports.map(r => ({
            ...r,
            branch_name: r.branches ? r.branches.name : `Branch${r.branch_id}`,
            denominations: r.currencydetails || [],
            cheques: r.cheques || []
        }));

        res.json(formattedReports);
    } catch (err) {
        console.error(err);
        await logError(new Error(`[GET REPORTS] Failed to fetch reports: ${err.message}`), req);
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
            await logError(new Error(`[UNAUTHORIZED] User "${req.user.username}" tried to access report ID=${req.params.id}`), req);
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
        await logError(new Error(`[GET REPORT DETAIL] Failed to fetch report ID=${req.params.id}: ${err.message}`), req);
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
        await logError(new Error(`[GET SETTINGS] ${err.message}`), req);
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
        await logError(new Error(`[UPDATE SETTINGS] Failed to update setting "${req.body.key}": ${err.message}`), req);
        res.status(500).json({ error: 'Server error' });
    }
});

// ── Verify Save Endpoint ─────────────────────────────────────────────────
// Frontend calls this after successfully saving the .txt file to confirm
// the file-save loop is complete and log the confirmation audit trail.
router.post('/verify-save', auth, async (req, res) => {
    try {
        const { reportId, reportHash, savedAt } = req.body;
        if (!reportId || !reportHash) {
            return res.status(400).json({ error: 'reportId and reportHash are required.' });
        }

        // Fetch the report to cross-validate
        const { data: report, error } = await supabase
            .from('cashreports')
            .select('id, branch_id, report_date, shift, grand_total, total_cash, card_upi_total, sodexo_total, credit_note_total, cheque_total, expense, system_total')
            .eq('id', reportId)
            .single();

        if (error || !report) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        const { generateReportHash } = require('../aiValidator');
        const expectedHash = generateReportHash(report);

        if (expectedHash !== reportHash) {
            await logError(
                new Error(`[VERIFY SAVE] Hash mismatch for report ID=${reportId}. Expected=${expectedHash}, Got=${reportHash}`),
                req
            );
            return res.status(409).json({ error: 'Report hash mismatch. File integrity could not be verified.' });
        }

        // Log the confirmed save to Supabase audit table (if it exists) or error_logs
        await logError(
            Object.assign(new Error(`[SAVE CONFIRMED] Report ID=${reportId} | Hash=${reportHash} | SavedAt=${savedAt || new Date().toISOString()} | User=${req.user?.username}`), { stack: 'SAVE_CONFIRMATION_AUDIT' }),
            req
        ).catch(() => {});

        res.json({ verified: true, reportId, reportHash });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Verification failed: ' + err.message });
    }
});

module.exports = router;
