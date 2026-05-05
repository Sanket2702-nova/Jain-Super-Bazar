const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS CashReports_new (
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
        expense REAL DEFAULT 0.00,
        expense_desc TEXT DEFAULT NULL,
        total_cash REAL DEFAULT 0.00,
        cheque_total REAL DEFAULT 0.00,
        grand_total REAL DEFAULT 0.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE CASCADE
    )`);
    db.run('INSERT INTO CashReports_new SELECT * FROM CashReports');
    db.run('DROP TABLE CashReports');
    db.run('ALTER TABLE CashReports_new RENAME TO CashReports');
    console.log('Done migrating');
});
