const { Pool } = require('pg');

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
        console.log('\n' + '='.repeat(80));
        console.log('📊 RAPPORT FINAL - HIÉRARCHIE ORGANISATIONNELLE');
        console.log('='.repeat(80) + '\n');
        
        // Statistiques principales
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM direction_generale) as dg,
                (SELECT COUNT(*) FROM directions) as dir,
                (SELECT COUNT(*) FROM sous_directions) as sd,
                (SELECT COUNT(*) FROM services) as serv,
                (SELECT COUNT(*) FROM agents) as agents,
                (SELECT COUNT(*) FROM agents WHERE id_direction_generale IS NOT NULL) as agents_dg,
                (SELECT COUNT(*) FROM agents WHERE id_direction IS NOT NULL) as agents_dir,
                (SELECT COUNT(*) FROM agents WHERE id_sous_direction IS NOT NULL) as agents_sd
        `);
        
        const s = stats.rows[0];
        
        console.log('✅ TABLES ET DONNÉES:');
        console.log(`   direction_generale: ${s.dg} enregistrements`);
        console.log(`   directions: ${s.dir} enregistrements`);
        console.log(`   sous_directions: ${s.sd} enregistrements`);
        console.log(`   services: ${s.serv} enregistrements`);
        console.log(`   agents: ${s.agents} enregistrements\n`);
        
        console.log('📊 AFFECTATIONS DES AGENTS:');
        console.log(`   Avec Direction Générale: ${s.agents_dg} (${((s.agents_dg / s.agents) * 100).toFixed(1)}%)`);
        console.log(`   Avec Direction: ${s.agents_dir} (${((s.agents_dir / s.agents) * 100).toFixed(1)}%)`);
        console.log(`   Avec Sous-Direction: ${s.agents_sd} (${((s.agents_sd / s.agents) * 100).toFixed(1)}%)\n`);
        
        // DG créées
        const dgs = await client.query('SELECT id, code, libelle FROM direction_generale');
        console.log('📋 DIRECTIONS GÉNÉRALES:');
        dgs.rows.forEach(dg => {
            console.log(`   ${dg.id}. [${dg.code}] ${dg.libelle}`);
        });
        
        // Directions par DG
        const dirsByDG = await client.query(`
            SELECT 
                COALESCE(dg.libelle, 'Sans DG') as dg,
                COUNT(*) as nb
            FROM directions d
            LEFT JOIN direction_generale dg ON d.id_direction_generale = dg.id
            GROUP BY dg.libelle
            ORDER BY nb DESC
        `);
        
        console.log('\n🏢 DIRECTIONS PAR DG:');
        dirsByDG.rows.forEach(row => {
            console.log(`   ${row.dg}: ${row.nb} direction(s)`);
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('🎉 INSTALLATION COMPLÈTE !');
        console.log('='.repeat(80) + '\n');
        
        console.log('💡 REQUÊTES UTILES:');
        console.log('   SELECT * FROM direction_generale;');
        console.log('   SELECT * FROM v_hierarchie_complete LIMIT 20;');
        console.log('   SELECT direction_generale, COUNT(*) FROM v_hierarchie_complete');
        console.log('   WHERE direction_generale IS NOT NULL GROUP BY direction_generale;\n');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main();




















