const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
    db.run('DELETE FROM CurrencyDetails');
    db.run('DELETE FROM Cheques');
    db.run('DELETE FROM CashReports');
    console.log('All user data cleared.');
});
