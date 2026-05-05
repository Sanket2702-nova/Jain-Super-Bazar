const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function check() {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    
    const reports = await db.all('SELECT id, branch_id, report_date, cheque_total FROM CashReports ORDER BY id DESC LIMIT 5');
    console.log('Last 5 reports:', JSON.stringify(reports, null, 2));
    
    const cheques = await db.all('SELECT * FROM Cheques ORDER BY id DESC LIMIT 10');
    console.log('Last 10 cheques:', JSON.stringify(cheques, null, 2));
    
    const count = await db.get('SELECT COUNT(*) as total FROM Cheques');
    console.log('Total cheques in DB:', count.total);
}

check();
