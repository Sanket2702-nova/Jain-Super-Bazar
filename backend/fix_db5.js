const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    // 1. Add new columns
    db.run("ALTER TABLE CashReports ADD COLUMN card_upi_total REAL DEFAULT 0.00");
    db.run("ALTER TABLE CashReports ADD COLUMN card_upi_proof_url TEXT DEFAULT NULL");
    db.run("ALTER TABLE CashReports ADD COLUMN credit_note_total REAL DEFAULT 0.00");

    // 2. Migrate data
    db.run("UPDATE CashReports SET card_upi_total = card_total + paytm_total");
    db.run("UPDATE CashReports SET card_upi_proof_url = card_proof_url");
    db.run("UPDATE CashReports SET credit_note_total = cc_total");

    console.log("Migration completed: Added card_upi_total and credit_note_total, and migrated existing data.");
});
