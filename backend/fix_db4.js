const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run("ALTER TABLE CashReports ADD COLUMN bill_amount REAL DEFAULT 0.00", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column bill_amount already exists.');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Column bill_amount added to CashReports.');
        }
    });
});
