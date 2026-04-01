/**
 * Script de mise à jour intelligente des grades
 * 
 * Ce script lit le CSV et met à jour les grades dans la base de données
 * 
 * Usage:
 *   node updateAgentGrades.js --simulate    (Mode simulation)
 *   node updateAgentGrades.js --apply       (Appliquer les changements)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

// Configuration de la connexion (même configuration que backend/config/database.js)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ma_rh_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
});

// Mapper les grades vers leurs IDs
const gradeMap = {
    'A3': 37,
    'A4': 38,
    'A5': 39,
    'A6': 40,
    'A7': 41,
    'B1': 42,
    'B2': 43,
    'B3': 44,
    'C1': 45,
    'C2': 46,
    'D1': 47
};

// Parser une ligne CSV
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

async function showStatistics(client) {
    const query = `
        SELECT 
            COALESCE(g.libele, 'SANS GRADE') as grade,
            COUNT(*) as nombre
        FROM agents a
        LEFT JOIN grades g ON a.id_grade = g.id
        GROUP BY g.libele, g.id
        ORDER BY g.libele;
    `;
    
    const result = await client.query(query);
    console.log('\n📊 Statistiques des grades :');
    console.log('┌─────────────────┬──────────┐');
    console.log('│ Grade           │ Nombre   │');
    console.log('├─────────────────┼──────────┤');
    result.rows.forEach(row => {
        const grade = row.grade.padEnd(15);
        const nombre = row.nombre.toString().padStart(8);
        console.log(`│ ${grade} │ ${nombre} │`);
    });
    console.log('└─────────────────┴──────────┘\n');
}

async function parseCSVAndUpdateGrades(simulate = true) {
    const client = await pool.connect();
    
    try {
        log.info('Connexion à la base de données...');
        
        // Démarrer une transaction
        await client.query('BEGIN');
        
        // Afficher les statistiques AVANT
        console.log(`\n${'='.repeat(50)}`);
        console.log('AVANT MISE À JOUR');
        console.log('='.repeat(50));
        await showStatistics(client);
        
        // Lire le CSV
        const csvPath = path.join(__dirname, '..', '..', 'Liste-du-Personel-_1_.csv');
        log.info(`Lecture du fichier : ${csvPath}`);
        
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = fileContent.split('\n');
        
        let updates = [];
        let gradeStats = {};
        let notFound = [];
        let unknownGrades = new Set();
        
        // Parser chaque ligne du CSV
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const fields = parseCSVLine(line);
            
            // Colonnes : 0=Matricule, 1=Nom, 2=Sexe, 3=Catégorie, 4=Grade
            const matricule = fields[0];
            const categorie = fields[3];
            const gradeNumero = fields[4];
            
            // Ignorer les lignes de sous-total et d'en-tête
            if (!matricule || matricule.includes('total') || matricule.includes('DIR / SER')) {
                continue;
            }
            
            // Ignorer les lignes sans matricule valide
            if (!/[A-Z0-9]/.test(matricule)) {
                continue;
            }
            
            // Si l'agent a une catégorie ET un numéro de grade
            if (categorie && (categorie === 'A' || categorie === 'B' || categorie === 'C' || categorie === 'D') && gradeNumero) {
                // Construire le libellé du grade (ex: A3, B1, C2, D1)
                const gradeLibele = `${categorie}${gradeNumero}`;
                const gradeId = gradeMap[gradeLibele];
                
                if (gradeId) {
                    updates.push({ matricule, gradeId, gradeLibele });
                    
                    if (!gradeStats[gradeLibele]) {
                        gradeStats[gradeLibele] = 0;
                    }
                    gradeStats[gradeLibele]++;
                } else {
                    unknownGrades.add(gradeLibele);
                }
            }
        }
        
        log.info(`${updates.length} mises à jour de grades à effectuer`);
        
        // Appliquer les mises à jour
        let successCount = 0;
        
        for (const update of updates) {
            const result = await client.query(
                'UPDATE agents SET id_grade = $1, updated_at = CURRENT_TIMESTAMP WHERE matricule = $2',
                [update.gradeId, update.matricule]
            );
            
            if (result.rowCount > 0) {
                successCount++;
            } else {
                notFound.push(update.matricule);
            }
        }
        
        log.info(`${successCount} agents mis à jour avec succès`);
        
        if (notFound.length > 0) {
            log.warning(`${notFound.length} matricules non trouvés dans la base`);
            if (notFound.length <= 10) {
                console.log(`   Matricules: ${notFound.join(', ')}`);
            }
        }
        
        if (unknownGrades.size > 0) {
            log.warning(`Grades non reconnus (non mis à jour) :`);
            console.log(`   ${Array.from(unknownGrades).join(', ')}`);
        }
        
        // Afficher les statistiques APRÈS
        console.log(`\n${'='.repeat(50)}`);
        console.log('APRÈS MISE À JOUR');
        console.log('='.repeat(50));
        await showStatistics(client);
        
        // Afficher le résumé
        console.log(`\n${'='.repeat(50)}`);
        console.log('RÉSUMÉ DE LA MISE À JOUR DES GRADES');
        console.log('='.repeat(50));
        console.log(`Total mises à jour : ${successCount}`);
        console.log('\nRépartition par grade :');
        Object.keys(gradeStats).sort().forEach(grade => {
            console.log(`  - Grade ${grade} : ${gradeStats[grade]} agents`);
        });
        
        // Décider de commit ou rollback
        if (simulate) {
            await client.query('ROLLBACK');
            log.warning('Mode SIMULATION - Aucun changement appliqué (ROLLBACK)');
            console.log('\n💡 Pour appliquer les changements, exécutez :');
            console.log('   node updateAgentGrades.js --apply\n');
        } else {
            await client.query('COMMIT');
            log.success('Changements APPLIQUÉS avec succès ! (COMMIT)');
        }
        
    } catch (error) {
        await client.query('ROLLBACK');
        log.error(`Erreur : ${error.message}`);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Récupérer le mode depuis les arguments
const args = process.argv.slice(2);
const mode = args[0];

if (!mode || (mode !== '--simulate' && mode !== '--apply')) {
    console.log(`
${colors.cyan}┌─────────────────────────────────────────────────┐
│  MISE À JOUR INTELLIGENTE DES GRADES            │
└─────────────────────────────────────────────────┘${colors.reset}

Usage:
  ${colors.green}node updateAgentGrades.js --simulate${colors.reset}  (Prévisualiser les changements)
  ${colors.yellow}node updateAgentGrades.js --apply${colors.reset}     (Appliquer définitivement)

📝 Le script :
  1. Lit le fichier CSV
  2. Identifie les grades de chaque agent
  3. Met à jour la base de données
  4. Affiche les statistiques avant/après
    `);
    process.exit(0);
}

const simulate = mode === '--simulate';

log.info(`Mode : ${simulate ? 'SIMULATION' : 'APPLICATION'}`);
parseCSVAndUpdateGrades(simulate)
    .then(() => {
        log.success('Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        log.error(`Erreur fatale : ${error.message}`);
        process.exit(1);
    });

