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
        
        // Lire le fichier SQL
        const sqlContent = fs.readFileSync(filePath, 'utf8');
        
        // Exécuter le SQL
        const startTime = Date.now();
        await client.query(sqlContent);
        const duration = Date.now() - startTime;
        
        log(`✅ Succès en ${duration}ms`, 'green');
        return true;
    } catch (error) {
        log(`❌ Erreur lors de l'exécution: ${error.message}`, 'red');
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
        
        // Vérifier les tables
        const tablesQuery = `
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('direction_generale', 'directions', 'sous_directions', 'services')
            ORDER BY tablename;
        `;
        
        const tablesResult = await client.query(tablesQuery);
        log(`Tables créées: ${tablesResult.rows.length}/4`, 'cyan');
        tablesResult.rows.forEach(row => {
            log(`   ✓ ${row.tablename}`, 'green');
        });
        
        // Compter les enregistrements
        const countsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM direction_generale) as nb_dg,
                (SELECT COUNT(*) FROM directions) as nb_directions,
                (SELECT COUNT(*) FROM sous_directions) as nb_sous_directions,
                (SELECT COUNT(*) FROM services) as nb_services;
        `;
        
        const countsResult = await client.query(countsQuery);
        const counts = countsResult.rows[0];
        
        console.log('\n📈 Statistiques:');
        log(`   Directions Générales: ${counts.nb_dg}`, 'cyan');
        log(`   Directions: ${counts.nb_directions}`, 'cyan');
        log(`   Sous-Directions: ${counts.nb_sous_directions}`, 'cyan');
        log(`   Services: ${counts.nb_services}`, 'cyan');
        
        // Vérifier les colonnes dans agents
        const agentsColumnsQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'agents' 
            AND column_name IN ('id_direction_generale', 'id_direction', 'id_sous_direction', 'id_service')
            ORDER BY column_name;
        `;
        
        const columnsResult = await client.query(agentsColumnsQuery);
        console.log('\n🔗 Colonnes dans la table agents:');
        columnsResult.rows.forEach(row => {
            log(`   ✓ ${row.column_name}`, 'green');
        });
        
        // Statistiques d'affectation des agents
        const agentsStatsQuery = `
            SELECT 
                COUNT(*) as total_agents,
                COUNT(id_direction_generale) as avec_dg,
                COUNT(id_direction) as avec_direction,
                COUNT(id_sous_direction) as avec_sous_direction,
                COUNT(id_service) as avec_service
            FROM agents;
        `;
        
        const agentsStatsResult = await client.query(agentsStatsQuery);
        const agentsStats = agentsStatsResult.rows[0];
        
        console.log('\n👥 Affectations des agents:');
        log(`   Total agents: ${agentsStats.total_agents}`, 'cyan');
        log(`   Avec Direction Générale: ${agentsStats.avec_dg} (${((agentsStats.avec_dg / agentsStats.total_agents) * 100).toFixed(1)}%)`, 'cyan');
        log(`   Avec Direction: ${agentsStats.avec_direction} (${((agentsStats.avec_direction / agentsStats.total_agents) * 100).toFixed(1)}%)`, 'cyan');
        log(`   Avec Sous-Direction: ${agentsStats.avec_sous_direction} (${((agentsStats.avec_sous_direction / agentsStats.total_agents) * 100).toFixed(1)}%)`, 'cyan');
        log(`   Avec Service: ${agentsStats.avec_service} (${((agentsStats.avec_service / agentsStats.total_agents) * 100).toFixed(1)}%)`, 'cyan');
        
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
                COUNT(DISTINCT d.id) as "Nb Directions",
                COUNT(DISTINCT sd.id) as "Nb Sous-Directions",
                COUNT(DISTINCT s.id) as "Nb Services"
            FROM direction_generale dg
            LEFT JOIN directions d ON d.id_direction_generale = dg.id
            LEFT JOIN sous_directions sd ON sd.id_direction = d.id
            LEFT JOIN services s ON s.id_sous_direction = sd.id
            GROUP BY dg.id, dg.libelle
            ORDER BY dg.libelle;
        `;
        
        const hierarchyResult = await client.query(hierarchyQuery);
        
        if (hierarchyResult.rows.length > 0) {
            console.table(hierarchyResult.rows);
        } else {
            log('   Aucune direction générale trouvée', 'yellow');
        }
        
        // Afficher quelques exemples de la vue v_hierarchie_complete
        const viewQuery = `
            SELECT 
                ministere,
                direction_generale,
                direction,
                sous_direction,
                service,
                COUNT(*) as nb_agents
            FROM v_hierarchie_complete
            WHERE direction_generale IS NOT NULL
            GROUP BY ministere, direction_generale, direction, sous_direction, service
            ORDER BY direction_generale, direction, sous_direction, service
            LIMIT 10;
        `;
        
        const viewResult = await client.query(viewQuery);
        
        if (viewResult.rows.length > 0) {
            console.log('\n📋 Exemples de hiérarchie complète (10 premiers):');
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
        logSection('🚀 RESTRUCTURATION DE LA HIÉRARCHIE ORGANISATIONNELLE');
        
        log('Ce script va:', 'yellow');
        log('  1. Créer les tables de la hiérarchie (direction_generale, directions, sous_directions, services)', 'yellow');
        log('  2. Importer les données depuis les codes DIR/SER', 'yellow');
        log('  3. Mettre à jour les affectations des agents', 'yellow');
        log('  4. Vérifier la structure créée\n', 'yellow');
        
        // Définir les scripts à exécuter
        const scripts = [
            {
                file: path.join(__dirname, 'restructure_hierarchie_complete.sql'),
                description: 'Création de la structure de la hiérarchie'
            },
            {
                file: path.join(__dirname, 'import_hierarchie_from_csv.sql'),
                description: 'Importation des données DIR/SER'
            },
            {
                file: path.join(__dirname, 'update_agents_from_csv.sql'),
                description: 'Mise à jour des affectations des agents'
            }
        ];
        
        // Exécuter chaque script
        let allSuccess = true;
        for (let i = 0; i < scripts.length; i++) {
            logSection(`ETAPE ${i + 1}/${scripts.length}: ${scripts[i].description}`);
            
            const success = await executeSQLFile(scripts[i].file, scripts[i].description);
            if (!success) {
                allSuccess = false;
                log(`\n⚠️  Le script ${scripts[i].file} a échoué. Arrêt de l'exécution.`, 'red');
                break;
            }
            
            // Pause entre les scripts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (allSuccess) {
            // Vérifier la structure
            await verifyStructure();
            
            // Afficher la hiérarchie
            await displayHierarchy();
            
            logSection('✅ RESTRUCTURATION TERMINÉE AVEC SUCCÈS');
            log('La hiérarchie organisationnelle a été créée et les données importées.', 'green');
            log('\nVous pouvez maintenant:', 'cyan');
            log('  - Consulter la vue: SELECT * FROM v_hierarchie_complete;', 'cyan');
            log('  - Utiliser les API pour gérer la hiérarchie', 'cyan');
            log('  - Afficher l\'organigramme dans l\'application frontend\n', 'cyan');
        } else {
            logSection('❌ RESTRUCTURATION ÉCHOUÉE');
            log('Certains scripts ont échoué. Consultez les erreurs ci-dessus.', 'red');
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




















