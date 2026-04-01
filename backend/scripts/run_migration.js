const fs = require('fs');
const path = require('path');
const db = require('../config/database'); // Utilize existing db config

async function run() {
    try {
        console.log('Connecting to database and running migration...');
        const sql = fs.readFileSync(path.join(__dirname, '../database/add_besoin_personnel_demandes.sql'), 'utf-8');
        await db.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

run();
