/**
 * Script d'import des catégories depuis le CSV
 * 
 * Ce script lit le fichier CSV et met à jour les catégories manquantes
 * dans la base de données
 */

const fs = require('fs');
const path = require('path');
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

// Mapper les catégories vers leurs IDs
const categorieMap = {
    'A': 5,
    'B': 6,
    'C': 9,
    'D': 8
};

// Parser une ligne CSV simple (gérer les guillemets)
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
        } else {
            currentField += char;
        }
    }
    fields.push(currentField.trim());
    
    return fields;
}

async function readCSVAndExtractCategories(csvPath) {
    log.title('LECTURE DU FICHIER CSV');
    
    try {
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = fileContent.split('\n');
        
        const agentsWithCategories = [];
        let totalLines = 0;
        let linesWithCategories = 0;
        let linesWithoutCategories = 0;
        
        // Ignorer la première ligne (en-tête)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const fields = parseCSVLine(line);
            
            // Colonnes : 0=Matricule, 1=Nom, 2=Sexe, 3=Catégorie, 4=Grade
            const matricule = fields[0];
            const nom = fields[1];
            const sexe = fields[2];
            const categorie = fields[3];
            const grade = fields[4];
            
            // Ignorer les lignes de sous-total et d'en-tête de section
            if (!matricule || matricule.includes('total') || matricule.includes('DIR / SER')) {
                continue;
            }
            
            // Ignorer les lignes sans matricule valide (doit contenir des chiffres ou lettres)
            if (!/[A-Z0-9]/.test(matricule)) {
                continue;
            }
            
            totalLines++;
            
            if (categorie && (categorie === 'A' || categorie === 'B' || categorie === 'C' || categorie === 'D')) {
                linesWithCategories++;
                agentsWithCategories.push({
                    matricule: matricule,
                    nom: nom,
                    sexe: sexe,
                    categorie: categorie,
                    categorieId: categorieMap[categorie],
                    grade: grade
                });
            } else {
                linesWithoutCategories++;
            }
        }
        
        log.info(`Total de lignes traitées : ${totalLines}`);
        log.success(`Agents avec catégorie dans le CSV : ${linesWithCategories}`);
        log.info(`Agents sans catégorie dans le CSV : ${linesWithoutCategories}`);
        
        return agentsWithCategories;
        
    } catch (error) {
        log.error(`Erreur lors de la lecture du CSV : ${error.message}`);
        throw error;
    }
}

async function updateCategories(agents, dryRun = true) {
    log.title(dryRun ? 'MODE SIMULATION (DRY RUN)' : 'MISE À JOUR RÉELLE');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        let foundInDB = 0;
        let notFoundInDB = 0;
        let alreadyHasCategory = 0;
        let updated = 0;
        let errors = 0;
        
        log.info(`Traitement de ${agents.length} agents avec catégorie du CSV...`);
        
        for (const agent of agents) {
            try {
                // Vérifier si l'agent existe dans la base
                const checkQuery = `
                    SELECT id, matricule, nom, prenom, id_categorie
                    FROM agents
                    WHERE matricule = $1
                `;
                const checkResult = await client.query(checkQuery, [agent.matricule]);
                
                if (checkResult.rows.length === 0) {
                    notFoundInDB++;
                    if (notFoundInDB <= 5) {
                        log.warning(`Matricule ${agent.matricule} (${agent.nom}) non trouvé dans la base`);
                    }
                    continue;
                }
                
                foundInDB++;
                const dbAgent = checkResult.rows[0];
                
                // Vérifier si l'agent a déjà une catégorie
                if (dbAgent.id_categorie && dbAgent.id_categorie === agent.categorieId) {
                    alreadyHasCategory++;
                    continue;
                }
                
                // Mettre à jour la catégorie
                const updateQuery = `
                    UPDATE agents
                    SET 
                        id_categorie = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE matricule = $2
                `;
                
                await client.query(updateQuery, [agent.categorieId, agent.matricule]);
                updated++;
                
                if (updated <= 10) {
                    log.success(`${agent.matricule} - ${agent.nom} → Catégorie ${agent.categorie} (ID: ${agent.categorieId})`);
                }
                
            } catch (error) {
                errors++;
                if (errors <= 5) {
                    log.error(`Erreur pour ${agent.matricule}: ${error.message}`);
                }
            }
        }
        
        // Afficher le résumé
        console.log('\n' + '='.repeat(60));
        console.log('RÉSUMÉ DE L\'IMPORT');
        console.log('='.repeat(60));
        console.log(`Agents traités depuis le CSV : ${agents.length}`);
        console.log(`Trouvés dans la base : ${foundInDB}`);
        console.log(`Non trouvés dans la base : ${notFoundInDB}`);
        console.log(`Avaient déjà la bonne catégorie : ${alreadyHasCategory}`);
        log.success(`Catégories mises à jour : ${updated}`);
        if (errors > 0) {
            log.error(`Erreurs rencontrées : ${errors}`);
        }
        console.log('='.repeat(60) + '\n');
        
        // Afficher la répartition finale
        const statsQuery = `
            SELECT 
                COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
                COUNT(*) as nombre
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
        `;
        
        const statsResult = await client.query(statsQuery);
        
        console.log('Répartition après import :');
        statsResult.rows.forEach(row => {
            console.log(`  - ${row.categorie}: ${row.nombre} agents`);
        });
        
        if (dryRun) {
            await client.query('ROLLBACK');
            log.warning('Mode simulation : Aucune modification appliquée (ROLLBACK)');
            log.info('Pour appliquer réellement les changements, exécutez : node importCategoriesFromCSV.js --apply');
        } else {
            await client.query('COMMIT');
            log.success('Modifications appliquées avec succès (COMMIT)');
        }
        
        return { foundInDB, notFoundInDB, alreadyHasCategory, updated, errors };
        
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
        log.title('IMPORT DES CATÉGORIES DEPUIS LE CSV');
        
        // Chemin vers le fichier CSV
        const csvPath = path.join(__dirname, '..', '..', 'Liste-du-Personel-_1_.csv');
        
        // Vérifier que le fichier existe
        if (!fs.existsSync(csvPath)) {
            log.error(`Fichier CSV non trouvé : ${csvPath}`);
            log.info('Assurez-vous que le fichier Liste-du-Personel-_1_.csv est à la racine du projet');
            process.exit(1);
        }
        
        log.success(`Fichier CSV trouvé : ${csvPath}`);
        
        // Lire le CSV et extraire les agents avec catégories
        const agents = await readCSVAndExtractCategories(csvPath);
        
        if (agents.length === 0) {
            log.warning('Aucun agent avec catégorie trouvé dans le CSV');
            process.exit(0);
        }
        
        // Afficher un échantillon
        console.log('\nÉchantillon des agents trouvés :');
        agents.slice(0, 10).forEach(agent => {
            console.log(`  - ${agent.matricule}: ${agent.nom} → Catégorie ${agent.categorie}`);
        });
        console.log(`  ... et ${agents.length - 10} autres\n`);
        
        // Vérifier si on est en mode simulation ou application
        const applyChanges = process.argv.includes('--apply');
        
        if (!applyChanges) {
            log.warning('Mode SIMULATION activé (aucune modification ne sera appliquée)');
            log.info('Pour appliquer réellement les changements, ajoutez le flag --apply');
            console.log('\nExemple : node importCategoriesFromCSV.js --apply\n');
        }
        
        // Effectuer la mise à jour
        const results = await updateCategories(agents, !applyChanges);
        
        if (applyChanges) {
            log.success('✨ Import des catégories terminé avec succès !');
            log.info('Vous pouvez maintenant exécuter : node updateAgentTypes.js --apply');
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

