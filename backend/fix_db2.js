const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run('DROP TABLE IF EXISTS CashReports');
    db.run(`CREATE TABLE IF NOT EXISTS CashReports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        report_date TEXT NOT NULL,
        system_total REAL DEFAULT 0.00,
        card_total REAL DEFAULT 0.00,
        card_proof_url TEXT DEFAULT NULL,
        paytm_total REAL DEFAULT 0.00,
        paytm_proof_url TEXT DEFAULT NULL,
        sodexo_total REAL DEFAULT 0.00,
        cc_total REAL DEFAULT 0.00,
        cheque_total REAL DEFAULT 0.00,
        expense REAL DEFAULT 0.00,
        expense_desc TEXT DEFAULT NULL,
        total_cash REAL DEFAULT 0.00,
        grand_total REAL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE CASCADE,
        UNIQUE (branch_id, report_date)
    )`);
    console.log('Fixed DB schema');
});
