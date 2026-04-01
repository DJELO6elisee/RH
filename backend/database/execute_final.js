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

async function exec(filename) {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8');
        await client.query(sql);
        return true;
    } catch (error) {
        console.error(`Erreur ${filename}:`, error.message);
        return false;
    } finally {
        client.release();
    }
}

async function main() {
    console.log('\n🚀 Exécution finale...\n');
    
    await exec('assign_agents_from_csv_structure.sql');
    
    const client = await pool.connect();
    try {
        const r = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(id_direction) as dir,
                COUNT(id_direction_generale) as dg,
                COUNT(id_sous_direction) as sd
            FROM agents
        `);
        
        const s = r.rows[0];
        console.log('📊 RÉSULTATS:');
        console.log(`   Total: ${s.total} agents`);
        console.log(`   Avec Direction: ${s.dir} (${((s.dir/s.total)*100).toFixed(1)}%)`);
        console.log(`   Avec DG: ${s.dg} (${((s.dg/s.total)*100).toFixed(1)}%)`);
        console.log(`   Avec S/D: ${s.sd} (${((s.sd/s.total)*100).toFixed(1)}%)\n`);
        
        console.log('✅ Terminé!\n');
    } finally {
        client.release();
        await pool.end();
    }
}

main();




















