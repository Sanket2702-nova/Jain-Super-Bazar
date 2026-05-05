const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run('DROP TABLE IF EXISTS CurrencyDetails');
    db.run('DROP TABLE IF EXISTS Cheques');
    db.run('DROP TABLE IF EXISTS CashReports');
    
    db.run(`CREATE TABLE CashReports (
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
        shift INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE CASCADE,
        UNIQUE(branch_id, report_date, shift)
    )`);

    db.run(`CREATE TABLE CurrencyDetails (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        denomination INTEGER NOT NULL,
        quantity INTEGER DEFAULT 0,
        total REAL DEFAULT 0.00,
        FOREIGN KEY (report_id) REFERENCES CashReports(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE Cheques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        report_id INTEGER NOT NULL,
        cheque_no TEXT NOT NULL,
        amount REAL NOT NULL,
        cheque_date TEXT NOT NULL,
        FOREIGN KEY (report_id) REFERENCES CashReports(id) ON DELETE CASCADE
    )`);

    console.log('Database updated with Shift support schema.');
});
