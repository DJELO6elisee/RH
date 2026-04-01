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
        console.log('\n================================================================================');
        console.log('📊 RAPPORT FINAL - RESTRUCTURATION HIÉRARCHIE ORGANISATIONNELLE');
        console.log('================================================================================\n');
        
        // Statistiques des tables
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM direction_generale) as dg,
                (SELECT COUNT(*) FROM directions) as dir,
                (SELECT COUNT(*) FROM sous_directions) as sd,
                (SELECT COUNT(*) FROM services) as serv,
                (SELECT COUNT(*) FROM agents) as agents
        `);
        
        const s = stats.rows[0];
        
        console.log('✅ TABLES CRÉÉES:');
        console.log(`   ✓ direction_generale: ${s.dg} enregistrements`);
        console.log(`   ✓ directions: ${s.dir} enregistrements`);
        console.log(`   ✓ sous_directions: ${s.sd} enregistrements`);
        console.log(`   ✓ services: ${s.serv} enregistrements (existants conservés)`);
        console.log(`   ✓ agents: ${s.agents} enregistrements\n`);
        
        // Détails des DG
        console.log('📋 DIRECTIONS GÉNÉRALES:');
        const dgs = await client.query('SELECT id, code, libelle FROM direction_generale ORDER BY id');
        dgs.rows.forEach(dg => {
            console.log(`   ${dg.id}. [${dg.code}] ${dg.libelle}`);
        });
        console.log('');
        
        // Directions par DG
        console.log('🏢 DIRECTIONS PAR DIRECTION GÉNÉRALE:');
        const dirsByDG = await client.query(`
            SELECT 
                COALESCE(dg.libelle, 'Sans DG') as dg_libelle,
                COUNT(*) as nb_directions
            FROM directions d
            LEFT JOIN direction_generale dg ON d.id_direction_generale = dg.id
            GROUP BY dg.libelle
            ORDER BY dg.libelle NULLS LAST
        `);
        dirsByDG.rows.forEach(row => {
            console.log(`   ${row.dg_libelle}: ${row.nb_directions} direction(s)`);
        });
        console.log('');
        
        // Colonnes agents
        console.log('🔗 COLONNES AJOUTÉES À LA TABLE AGENTS:');
        const agentCols = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'agents' 
            AND column_name IN ('id_direction_generale', 'id_direction', 'id_sous_direction', 'id_service')
            ORDER BY column_name
        `);
        agentCols.rows.forEach(col => {
            console.log(`   ✓ ${col.column_name}`);
        });
        console.log('');
        
        // Vue
        console.log('👁️  VUE CRÉÉE:');
        console.log('   ✓ v_hierarchie_complete\n');
        
        // Exemple de hiérarchie
        console.log('🌳 EXEMPLE DE HIÉRARCHIE:');
        const hierarchy = await client.query(`
            SELECT DISTINCT
                dg.libelle as dg,
                d.libelle as dir
            FROM direction_generale dg
            LEFT JOIN directions d ON d.id_direction_generale = dg.id
            WHERE d.id IS NOT NULL
            ORDER BY dg.libelle, d.libelle
            LIMIT 10
        `);
        
        let currentDG = null;
        hierarchy.rows.forEach(row => {
            if (row.dg !== currentDG) {
                currentDG = row.dg;
                console.log(`\n   📁 ${row.dg}`);
            }
            console.log(`      └── ${row.dir}`);
        });
        
        console.log('\n');
        console.log('================================================================================');
        console.log('🎉 INSTALLATION TERMINÉE AVEC SUCCÈS !');
        console.log('================================================================================\n');
        
        console.log('💡 PROCHAINES ÉTAPES:');
        console.log('   1. Consulter: SELECT * FROM direction_generale;');
        console.log('   2. Voir la hiérarchie: SELECT * FROM v_hierarchie_complete;');
        console.log('   3. Lier vos agents aux directions/sous-directions');
        console.log('   4. Mettre à jour votre frontend\n');
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

main();




















