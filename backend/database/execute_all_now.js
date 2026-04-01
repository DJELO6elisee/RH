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
        console.log('\n🚀 Exécution du script d\'assignation...\n');
        
        const sql = fs.readFileSync(
            path.join(__dirname, 'assign_agents_only.sql'), 
            'utf8'
        );
        
        await client.query(sql);
        
        console.log('✅ Script exécuté!\n');
        
        // Rapport final
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(id_direction) as avec_dir,
                COUNT(id_direction_generale) as avec_dg,
                COUNT(id_sous_direction) as avec_sd
            FROM agents
        `);
        
        const s = stats.rows[0];
        console.log('📊 RÉSULTATS:');
        console.log(`   Total: ${s.total} agents`);
        console.log(`   Direction: ${s.avec_dir} (${((s.avec_dir/s.total)*100).toFixed(1)}%)`);
        console.log(`   DG: ${s.avec_dg} (${((s.avec_dg/s.total)*100).toFixed(1)}%)`);
        console.log(`   S/D: ${s.avec_sd} (${((s.avec_sd/s.total)*100).toFixed(1)}%)\n`);
        
        console.log('🎉 TERMINÉ!\n');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main();

