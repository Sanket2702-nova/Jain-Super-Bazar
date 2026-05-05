const getDb = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        const db = await getDb();
        const passwordHash = await bcrypt.hash('password123', 10);

        // Add admin
        await db.run('INSERT OR IGNORE INTO Users (username, password, role) VALUES (?, ?, ?)', ['admin', passwordHash, 'Admin']);

        // Fetch branches
        const branches = await db.all('SELECT * FROM Branches');
        
        for (let branch of branches) {
            const username = branch.name.toLowerCase().replace(/\\s+/g, '');
            await db.run('INSERT OR IGNORE INTO Users (username, password, branch_id, role) VALUES (?, ?, ?, ?)', [username, passwordHash, branch.id, 'Branch']);
        }

        console.log('Seeding completed successfully with SQLite!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
