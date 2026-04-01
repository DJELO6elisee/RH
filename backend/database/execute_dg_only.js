const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration de la base de données
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ma_rh_db',
    password: '12345',
    port: 5432,
});

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'cyan');
    console.log('='.repeat(80) + '\n');
}

async function executeSQLFile(filePath, description) {
    const client = await pool.connect();
    
    try {
        log(`📄 Exécution: ${description}`, 'blue');
        log(`   Fichier: ${filePath}`, 'blue');
        
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        const startTime = Date.now();
        await client.query(sqlContent);
        const duration = Date.now() - startTime;
        
        log(`✅ Succès en ${duration}ms`, 'green');
        return true;
    } catch (error) {
        log(`❌ Erreur: ${error.message}`, 'red');
        console.error(error);
        return false;
    } finally {
        client.release();
    }
}

async function verifyStructure() {
    const client = await pool.connect();
    
    try {
        logSection('📊 Vérification de la Structure');
        
        // Vérifier la table direction_generale
        const dgQuery = `SELECT COUNT(*) as count FROM direction_generale;`;
        const dgResult = await client.query(dgQuery);
        log(`✅ Table direction_generale créée: ${dgResult.rows[0].count} DG`, 'green');
        
        // Vérifier les colonnes ajoutées
        const columnsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = 'directions' AND column_name = 'id_direction_generale') as col_dir,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = 'sous_directions' AND column_name = 'id_direction') as col_sd,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = 'services' AND column_name = 'id_sous_direction') as col_serv,
                (SELECT COUNT(*) FROM information_schema.columns 
                 WHERE table_name = 'agents' AND column_name = 'id_direction_generale') as col_agent;
        `;
        
        const columnsResult = await client.query(columnsQuery);
        const cols = columnsResult.rows[0];
        
        console.log('\n🔗 Colonnes ajoutées:');
        log(`   ✓ directions.id_direction_generale: ${cols.col_dir ? 'OUI' : 'NON'}`, cols.col_dir ? 'green' : 'red');
        log(`   ✓ sous_directions.id_direction: ${cols.col_sd ? 'OUI' : 'NON'}`, cols.col_sd ? 'green' : 'red');
        log(`   ✓ services.id_sous_direction: ${cols.col_serv ? 'OUI' : 'NON'}`, cols.col_serv ? 'green' : 'red');
        log(`   ✓ agents.id_direction_generale: ${cols.col_agent ? 'OUI' : 'NON'}`, cols.col_agent ? 'green' : 'red');
        
        // Statistiques des tables existantes
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM direction_generale) as nb_dg,
                (SELECT COUNT(*) FROM directions) as nb_dir,
                (SELECT COUNT(*) FROM sous_directions) as nb_sd,
                (SELECT COUNT(*) FROM services) as nb_serv,
                (SELECT COUNT(*) FROM agents) as nb_agents;
        `;
        
        const statsResult = await client.query(statsQuery);
        const stats = statsResult.rows[0];
        
        console.log('\n📈 Statistiques des tables:');
        log(`   Directions Générales: ${stats.nb_dg}`, 'cyan');
        log(`   Directions: ${stats.nb_dir}`, 'cyan');
        log(`   Sous-Directions: ${stats.nb_sd}`, 'cyan');
        log(`   Services: ${stats.nb_serv}`, 'cyan');
        log(`   Agents: ${stats.nb_agents}`, 'cyan');
        
        // Vérifier les liens
        const linksQuery = `
            SELECT 
                (SELECT COUNT(*) FROM directions WHERE id_direction_generale IS NOT NULL) as dir_avec_dg,
                (SELECT COUNT(*) FROM sous_directions WHERE id_direction IS NOT NULL) as sd_avec_dir,
                (SELECT COUNT(*) FROM agents WHERE id_direction_generale IS NOT NULL) as agents_avec_dg;
        `;
        
        const linksResult = await client.query(linksQuery);
        const links = linksResult.rows[0];
        
        console.log('\n🔗 Liens créés:');
        log(`   Directions liées à une DG: ${links.dir_avec_dg}`, 'cyan');
        log(`   Sous-Directions liées à une Direction: ${links.sd_avec_dir}`, 'cyan');
        log(`   Agents avec Direction Générale: ${links.agents_avec_dg}`, 'cyan');
        
    } catch (error) {
        log(`❌ Erreur lors de la vérification: ${error.message}`, 'red');
        console.error(error);
    } finally {
        client.release();
    }
}

async function displayHierarchy() {
    const client = await pool.connect();
    
    try {
        logSection('🌳 Aperçu de la Hiérarchie');
        
        const hierarchyQuery = `
            SELECT 
                dg.libelle as "Direction Générale",
                COUNT(DISTINCT d.id) as "Nb Directions"
            FROM direction_generale dg
            LEFT JOIN directions d ON d.id_direction_generale = dg.id
            GROUP BY dg.id, dg.libelle
            ORDER BY dg.libelle;
        `;
        
        const hierarchyResult = await client.query(hierarchyQuery);
        
        if (hierarchyResult.rows.length > 0) {
            console.table(hierarchyResult.rows);
        } else {
            log('   Aucune direction générale trouvée', 'yellow');
        }
        
        // Afficher un échantillon de la vue
        const viewQuery = `
            SELECT 
                direction_generale,
                direction,
                COUNT(*) as nb_agents
            FROM v_hierarchie_complete
            WHERE direction_generale IS NOT NULL
            GROUP BY direction_generale, direction
            ORDER BY direction_generale, direction
            LIMIT 5;
        `;
        
        const viewResult = await client.query(viewQuery);
        
        if (viewResult.rows.length > 0) {
            console.log('\n📋 Exemples de hiérarchie (5 premiers):');
            console.table(viewResult.rows);
        }
        
    } catch (error) {
        log(`❌ Erreur lors de l'affichage: ${error.message}`, 'red');
        console.error(error);
    } finally {
        client.release();
    }
}

async function main() {
    try {
        logSection('🚀 AJOUT DE LA TABLE DIRECTION_GENERALE');
        
        log('Ce script va:', 'yellow');
        log('  1. Créer la table direction_generale', 'yellow');
        log('  2. Ajouter les colonnes nécessaires à vos tables existantes', 'yellow');
        log('  3. Insérer les 2 Directions Générales', 'yellow');
        log('  4. Mettre à jour les liens entre vos données', 'yellow');
        log('  5. Créer la vue v_hierarchie_complete\n', 'yellow');
        
        const scripts = [
            {
                file: path.join(__dirname, 'add_direction_generale_only.sql'),
                description: 'Création de la table direction_generale et ajout des colonnes'
            },
            {
                file: path.join(__dirname, 'update_existing_tables.sql'),
                description: 'Mise à jour des données dans vos tables existantes'
            }
        ];
        
        let allSuccess = true;
        for (let i = 0; i < scripts.length; i++) {
            logSection(`ETAPE ${i + 1}/${scripts.length}: ${scripts[i].description}`);
            
            const success = await executeSQLFile(scripts[i].file, scripts[i].description);
            if (!success) {
                allSuccess = false;
                log(`\n⚠️  Le script ${scripts[i].file} a échoué.`, 'red');
                log('Vous pouvez quand même continuer, certaines parties peuvent avoir réussi.', 'yellow');
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Vérifier la structure même si certains scripts ont échoué
        await verifyStructure();
        await displayHierarchy();
        
        if (allSuccess) {
            logSection('✅ INSTALLATION TERMINÉE AVEC SUCCÈS');
            log('La table direction_generale a été créée et vos tables existantes ont été mises à jour.', 'green');
            log('\nVous pouvez maintenant:', 'cyan');
            log('  - Consulter: SELECT * FROM direction_generale;', 'cyan');
            log('  - Voir la hiérarchie: SELECT * FROM v_hierarchie_complete;', 'cyan');
            log('  - Utiliser les API pour gérer les DG\n', 'cyan');
        } else {
            logSection('⚠️  INSTALLATION TERMINÉE AVEC AVERTISSEMENTS');
            log('Certaines parties peuvent avoir échoué mais la structure de base devrait être créée.', 'yellow');
            log('Consultez les messages ci-dessus pour plus de détails.', 'yellow');
        }
        
    } catch (error) {
        log(`\n❌ Erreur fatale: ${error.message}`, 'red');
        console.error(error);
    } finally {
        await pool.end();
        log('\n👋 Fin de l\'exécution', 'cyan');
    }
}

// Exécuter le script principal
main();




















