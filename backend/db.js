const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let dbInstance = null;

async function getDb() {
    if (dbInstance) return dbInstance;
    
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    
    // Initialize schema
    await db.exec(`
        CREATE TABLE IF NOT EXISTS Branches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            branch_id INTEGER,
            role TEXT NOT NULL,
            is_blocked INTEGER DEFAULT 0,
            FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS Settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        -- Initialize default backup path
        INSERT OR IGNORE INTO Settings (key, value) VALUES ('backup_path', 'C:\\Users\\admin\\Desktop\\reporting');
        CREATE TABLE IF NOT EXISTS CashReports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_id INTEGER NOT NULL,
            report_date TEXT NOT NULL,
            system_total REAL DEFAULT 0.00,
            card_upi_total REAL DEFAULT 0.00,
            card_upi_proof_url TEXT DEFAULT NULL,
            sodexo_total REAL DEFAULT 0.00,
            credit_note_total REAL DEFAULT 0.00,
            expense REAL DEFAULT 0.00,
            expense_desc TEXT DEFAULT NULL,
            total_cash REAL DEFAULT 0.00,
            cheque_total REAL DEFAULT 0.00,
            bill_amount REAL DEFAULT 0.00,
            grand_total REAL DEFAULT 0.00,
            shift INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (branch_id) REFERENCES Branches(id) ON DELETE CASCADE,
            UNIQUE(branch_id, report_date, shift)
        );
        CREATE TABLE IF NOT EXISTS CurrencyDetails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            denomination INTEGER NOT NULL,
            quantity INTEGER DEFAULT 0,
            total REAL DEFAULT 0.00,
            FOREIGN KEY (report_id) REFERENCES CashReports(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS Cheques (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER NOT NULL,
            cheque_no TEXT NOT NULL,
            amount REAL NOT NULL,
            cheque_date TEXT NOT NULL,
            FOREIGN KEY (report_id) REFERENCES CashReports(id) ON DELETE CASCADE
        );
        
        INSERT OR IGNORE INTO Branches (name) VALUES 
        ('Slave 1'), ('Slave 2'), ('Slave 3'), ('Slave 4'), ('JSB03'), ('JSB05'), ('JSB07');
    `);
    
    // Migrate existing DB – add new columns if they don't exist yet
    const migrations = [
        `ALTER TABLE CashReports ADD COLUMN sodexo_total REAL DEFAULT 0.00`,
        `ALTER TABLE CashReports ADD COLUMN cc_total REAL DEFAULT 0.00`,
        `ALTER TABLE CashReports ADD COLUMN cheque_total REAL DEFAULT 0.00`,
        `ALTER TABLE Users ADD COLUMN is_blocked INTEGER DEFAULT 0`,
    ];
    for (const sql of migrations) {
        try { await db.run(sql); } catch (_) { /* column already exists */ }
    }

    // One-time update for existing records to populate cheque_total
    await db.run(`
        UPDATE CashReports 
        SET cheque_total = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM Cheques 
            WHERE Cheques.report_id = CashReports.id
        )
        WHERE cheque_total = 0
    `);

    dbInstance = db;
    return db;
}

module.exports = getDb;
