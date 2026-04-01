/**
 * Script de mise à jour des types d'agents
 * 
 * Ce script attribue automatiquement le type d'agent selon la règle :
 * - Agents avec catégorie (A, B, C, D) → FONCTIONNAIRE
 * - Agents sans catégorie → CONTRACTUEL
 */

const pool = require('../config/database');

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`)
};

async function analyzeCurrentState() {
    log.title('ANALYSE DE L\'ÉTAT ACTUEL');
    
    try {
        // Total des agents
        const totalResult = await pool.query('SELECT COUNT(*) as count FROM agents');
        const total = parseInt(totalResult.rows[0].count);
        log.info(`Total des agents : ${total}`);
        
        // Agents par catégorie
        const categoriesResult = await pool.query(`
            SELECT 
                COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
                COUNT(*) as count
            FROM agents a
            LEFT JOIN categories c ON a.id_categorie = c.id
            GROUP BY c.libele
            ORDER BY 
                CASE 
                    WHEN c.libele = 'A' THEN 1
                    WHEN c.libele = 'B' THEN 2
                    WHEN c.libele = 'C' THEN 3
                    WHEN c.libele = 'D' THEN 4
                    ELSE 5
                END
        `);
        
        console.log('\nRépartition par catégorie :');
        categoriesResult.rows.forEach(row => {
            console.log(`  - ${row.categorie}: ${row.count} agents`);
        });
        
        // Agents par type actuel
        const typesResult = await pool.query(`
            SELECT 
                COALESCE(ta.libele, 'SANS TYPE') as type_agent,
                COUNT(*) as count
            FROM agents a
            LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
            GROUP BY ta.libele
            ORDER BY count DESC
        `);
        
        console.log('\nRépartition par type actuel :');
        typesResult.rows.forEach(row => {
            console.log(`  - ${row.type_agent}: ${row.count} agents`);
        });
        
        // Agents à mettre à jour
        const toUpdateFonc = await pool.query(`
            SELECT COUNT(*) as count
            FROM agents
            WHERE id_categorie IN (5, 6, 8, 9)
              AND (id_type_d_agent IS NULL OR id_type_d_agent != 1)
        `);
        
        const toUpdateContr = await pool.query(`
            SELECT COUNT(*) as count
            FROM agents
            WHERE (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
              AND (id_type_d_agent IS NULL OR (id_type_d_agent != 2 AND id_type_d_agent != 16 AND id_type_d_agent != 17))
        `);
        
        console.log('\nAgents à mettre à jour :');
        log.warning(`${toUpdateFonc.rows[0].count} agents deviendront FONCTIONNAIRES`);
        log.warning(`${toUpdateContr.rows[0].count} agents deviendront CONTRACTUELS`);
        
        return {
            total,
            toUpdateFonc: parseInt(toUpdateFonc.rows[0].count),
            toUpdateContr: parseInt(toUpdateContr.rows[0].count)
        };
    } catch (error) {
        log.error(`Erreur lors de l'analyse : ${error.message}`);
        throw error;
    }
}

async function updateAgentTypes(dryRun = true) {
    const client = await pool.connect();
    
    try {
        log.title(dryRun ? 'MODE SIMULATION (DRY RUN)' : 'MISE À JOUR RÉELLE');
        
        await client.query('BEGIN');
        
        // 1. Mettre à jour les FONCTIONNAIRES (avec catégorie)
        log.info('Mise à jour des agents avec catégorie → FONCTIONNAIRE...');
        const updateFoncResult = await client.query(`
            UPDATE agents 
            SET 
                id_type_d_agent = 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE 
                id_categorie IN (5, 6, 8, 9)
                AND (id_type_d_agent IS NULL OR id_type_d_agent != 1)
        `);
        log.success(`${updateFoncResult.rowCount} agents mis à jour comme FONCTIONNAIRES`);
        
        // 2. Mettre à jour les CONTRACTUELS (sans catégorie)
        log.info('Mise à jour des agents sans catégorie → CONTRACTUEL...');
        const updateContrResult = await client.query(`
            UPDATE agents 
            SET 
                id_type_d_agent = 2,
                updated_at = CURRENT_TIMESTAMP
            WHERE 
                (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
                AND (id_type_d_agent IS NULL OR (id_type_d_agent != 2 AND id_type_d_agent != 16 AND id_type_d_agent != 17))
        `);
        log.success(`${updateContrResult.rowCount} agents mis à jour comme CONTRACTUELS`);
        
        // Vérification finale
        const verificationResult = await client.query(`
            SELECT 
                ta.libele as type_agent,
                COUNT(*) as count
            FROM agents a
            LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
            GROUP BY ta.libele
            ORDER BY count DESC
        `);
        
        console.log('\nRépartition après mise à jour :');
        verificationResult.rows.forEach(row => {
            console.log(`  - ${row.type_agent || 'SANS TYPE'}: ${row.count} agents`);
        });
        
        if (dryRun) {
            await client.query('ROLLBACK');
            log.warning('Mode simulation : Aucune modification n\'a été appliquée (ROLLBACK)');
            log.info('Pour appliquer réellement les changements, exécutez : node updateAgentTypes.js --apply');
        } else {
            await client.query('COMMIT');
            log.success('Modifications appliquées avec succès (COMMIT)');
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        log.error(`Erreur lors de la mise à jour : ${error.message}`);
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    try {
        log.title('MISE À JOUR DES TYPES D\'AGENTS');
        
        // Analyser l'état actuel
        const analysis = await analyzeCurrentState();
        
        if (analysis.toUpdateFonc === 0 && analysis.toUpdateContr === 0) {
            log.success('Aucune mise à jour nécessaire ! Tous les agents ont déjà le bon type.');
            process.exit(0);
        }
        
        // Vérifier si on est en mode simulation ou application
        const applyChanges = process.argv.includes('--apply');
        
        if (!applyChanges) {
            log.warning('Mode SIMULATION activé (aucune modification ne sera appliquée)');
            log.info('Pour appliquer réellement les changements, ajoutez le flag --apply');
            console.log('\nExemple : node updateAgentTypes.js --apply\n');
        }
        
        // Effectuer la mise à jour
        await updateAgentTypes(!applyChanges);
        
        if (applyChanges) {
            log.success('✨ Mise à jour terminée avec succès !');
        }
        
        process.exit(0);
        
    } catch (error) {
        log.error('Erreur fatale lors de l\'exécution du script');
        console.error(error);
        process.exit(1);
    }
}

// Exécuter le script
main();

