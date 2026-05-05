const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const supabase = require('./supabase');
const bcrypt = require('bcryptjs');

async function migrate() {
    console.log('--- STARTING MIGRATION ---');
    
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    try {
        // 1. Migrate Branches
        console.log('Migrating Branches...');
        const branches = await db.all('SELECT * FROM Branches');
        for (const b of branches) {
            const { error } = await supabase.from('branches').upsert({ id: b.id, name: b.name });
            if (error) console.error(`Error migrating branch ${b.name}:`, error.message);
        }

        // 2. Migrate Users
        console.log('Migrating Users...');
        const users = await db.all('SELECT * FROM Users');
        for (const u of users) {
            const { error } = await supabase.from('users').upsert({
                id: u.id,
                username: u.username,
                password: u.password,
                role: u.role,
                branch_id: u.branch_id,
                is_blocked: u.is_blocked
            });
            if (error) console.error(`Error migrating user ${u.username}:`, error.message);
        }

        // 3. Migrate Settings
        console.log('Migrating Settings...');
        const settings = await db.all('SELECT * FROM Settings');
        for (const s of settings) {
            await supabase.from('settings').upsert({ key: s.key, value: s.value });
        }

        // 4. Migrate Reports
        console.log('Migrating Cash Reports...');
        const reports = await db.all('SELECT * FROM CashReports');
        for (const r of reports) {
            const { error: reportError } = await supabase.from('cashreports').upsert({
                id: r.id,
                branch_id: r.branch_id,
                report_date: r.report_date,
                system_total: r.system_total,
                card_upi_total: r.card_upi_total,
                card_upi_proof_url: r.card_upi_proof_url,
                sodexo_total: r.sodexo_total,
                credit_note_total: r.credit_note_total,
                expense: r.expense,
                expense_desc: r.expense_desc,
                total_cash: r.total_cash,
                cheque_total: r.cheque_total,
                bill_amount: r.bill_amount,
                grand_total: r.grand_total,
                shift: r.shift,
                created_at: r.created_at
            });
            if (reportError) {
                console.error(`Error migrating report ${r.id}:`, reportError.message);
                continue;
            }

            // Migrate Denoms
            const denoms = await db.all('SELECT * FROM CurrencyDetails WHERE report_id = ?', [r.id]);
            if (denoms.length > 0) {
                await supabase.from('currencydetails').upsert(denoms.map(d => ({
                    id: d.id,
                    report_id: d.report_id,
                    denomination: d.denomination,
                    quantity: d.quantity,
                    total: d.total
                })));
            }

            // Migrate Cheques
            const cheques = await db.all('SELECT * FROM Cheques WHERE report_id = ?', [r.id]);
            if (cheques.length > 0) {
                await supabase.from('cheques').upsert(cheques.map(c => ({
                    id: c.id,
                    report_id: c.report_id,
                    cheque_no: c.cheque_no,
                    amount: c.amount,
                    cheque_date: c.cheque_date
                })));
            }
        }

        console.log('--- MIGRATION COMPLETE ---');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await db.close();
    }
}

migrate();
