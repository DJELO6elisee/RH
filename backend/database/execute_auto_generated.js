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
        console.log('\n================================================================================');
        console.log('🚀 ASSIGNATION AUTOMATIQUE DE TOUS LES AGENTS');
        console.log('================================================================================\n');
        
        console.log('📄 Lecture du fichier SQL généré...\n');
        
        const sqlFile = path.join(__dirname, 'assign_all_agents_auto_generated.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('🔄 Exécution en cours... (cela peut prendre 1-2 minutes)\n');
        
        const startTime = Date.now();
        await client.query(sql);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Assignation terminée en ${duration}s!\n`);
        
        // Statistiques finales
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(id_direction) as avec_dir,
                COUNT(id_direction_generale) as avec_dg,
                COUNT(id_sous_direction) as avec_sd,
                COUNT(id_service) as avec_serv
            FROM agents
        `);
        
        const s = stats.rows[0];
        
        console.log('================================================================================');
        console.log('📊 RÉSULTATS FINAUX');
        console.log('================================================================================\n');
        console.log(`   Total agents: ${s.total}`);
        console.log(`   Avec Direction: ${s.avec_dir} (${((s.avec_dir / s.total) * 100).toFixed(1)}%)`);
        console.log(`   Avec Direction Générale: ${s.avec_dg} (${((s.avec_dg / s.total) * 100).toFixed(1)}%)`);
        console.log(`   Avec Sous-Direction: ${s.avec_sd} (${((s.avec_sd / s.total) * 100).toFixed(1)}%)`);
        console.log(`   Avec Service: ${s.avec_serv} (${((s.avec_serv / s.total) * 100).toFixed(1)}%)`);
        
        // Exemples d'agents avec hiérarchie complète
        console.log('\n👥 Exemples d\'agents avec hiérarchie:\n');
        
        const examples = await client.query(`
            SELECT 
                a.matricule,
                a.nom,
                a.prenom,
                dg.libelle as direction_generale,
                d.libelle as direction,
                sd.libelle as sous_direction,
                s.libelle as service
            FROM agents a
            LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
            LEFT JOIN directions d ON a.id_direction = d.id
            LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
            LEFT JOIN services s ON a.id_service = s.id
            WHERE a.id_direction IS NOT NULL 
               OR a.id_sous_direction IS NOT NULL
               OR a.id_service IS NOT NULL
            ORDER BY a.matricule
            LIMIT 10
        `);
        
        console.table(examples.rows.map(r => ({
            Matricule: r.matricule,
            Nom: r.nom,
            Prénom: r.prenom,
            DG: r.direction_generale,
            Direction: r.direction ? r.direction.substring(0, 30) : null,
            'S/D': r.sous_direction ? r.sous_direction.substring(0, 30) : null
        })));
        
        console.log('\n================================================================================');
        console.log('🎉 INSTALLATION COMPLÈTE TERMINÉE !');
        console.log('================================================================================\n');
        
        console.log('💡 Vous pouvez maintenant consulter:');
        console.log('   SELECT * FROM v_hierarchie_complete WHERE direction IS NOT NULL LIMIT 20;\n');
        
    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        console.error(error);
    } finally {
        client.release();
        await pool.end();
    }
}

main();




















