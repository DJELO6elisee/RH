const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

async function main() {
    const client = await pool.connect();
    
    try {
        console.log('\n🚀 Exécution du script create_configurations_table.sql...\n');
        
        const sql = fs.readFileSync(
            path.join(__dirname, 'create_configurations_table.sql'), 
            'utf8'
        );
        
        await client.query(sql);
        
        console.log('✅ Table configurations créée et initialisée!\n');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
