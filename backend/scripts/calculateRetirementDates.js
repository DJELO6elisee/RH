/**
 * Script de calcul automatique des dates de retraite
 * 
 * Ce script calcule et met à jour les dates de retraite pour tous les agents selon les règles :
 * - Grades A4, A5, A6, A7 : retraite à 65 ans
 * - Autres grades : retraite à 60 ans
 * - Date de retraite : 31 décembre de l'année où l'agent atteint l'âge de retraite
 * 
 * Usage:
 *   node calculateRetirementDates.js --simulate    (Mode simulation)
 *   node calculateRetirementDates.js --apply       (Appliquer les changements)
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

// Configuration de la connexion
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ma_rh_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '12345',
});

// Calculer l'âge de retraite basé sur le grade
function calculateRetirementAge(gradeLibele) {
    if (!gradeLibele) return 60; // Par défaut 60 ans si pas de grade
    
    const gradesSpeciaux = ['A4', 'A5', 'A6', 'A7'];
    return gradesSpeciaux.includes(gradeLibele.toUpperCase()) ? 65 : 60;
}

// Calculer la date de retraite
function calculateRetirementDate(dateNaissance, gradeLibele) {
    if (!dateNaissance) return null;
    
    const birthDate = new Date(dateNaissance);
    const birthYear = birthDate.getFullYear();
    
    const retirementAge = calculateRetirementAge(gradeLibele);
    const retirementYear = birthYear + retirementAge;
    
    // La date de retraite est toujours le 31 décembre de l'année de retraite
    return new Date(retirementYear, 11, 31); // Mois 11 = Décembre (0-indexed)
}

async function processRetirementCalculations(simulate = true) {
    const client = await pool.connect();
    
    try {
        log.info('Connexion à la base de données...');
        
        // Démarrer une transaction
        await client.query('BEGIN');
        
        // Récupérer tous les agents actifs avec leur grade et date de naissance
        const query = `
            SELECT 
                a.id,
                a.matricule,
                a.nom,
                a.prenom,
                a.date_de_naissance,
                a.date_retraite as date_retraite_actuelle,
                a.id_grade,
                g.libele as grade_libele
            FROM agents a
            LEFT JOIN grades g ON a.id_grade = g.id
            WHERE a.date_de_naissance IS NOT NULL
                AND a.statut_emploi != 'licencie'
                AND a.statut_emploi != 'demission'
            ORDER BY a.nom, a.prenom
        `;
        
        const result = await client.query(query);
        const agents = result.rows;
        
        log.info(`${agents.length} agents à traiter`);
        
        let stats = {
            total: agents.length,
            updated: 0,
            unchanged: 0,
            grade_65_ans: 0,
            grade_60_ans: 0,
            sans_grade: 0,
            errors: []
        };
        
        console.log('\n📊 Traitement des agents...\n');
        
        // Traiter chaque agent
        for (const agent of agents) {
            try {
                const retirementAge = calculateRetirementAge(agent.grade_libele);
                const newRetirementDate = calculateRetirementDate(agent.date_de_naissance, agent.grade_libele);
                
                // Comptabiliser par type d'âge de retraite
                if (retirementAge === 65) {
                    stats.grade_65_ans++;
                } else if (retirementAge === 60) {
                    if (agent.grade_libele) {
                        stats.grade_60_ans++;
                    } else {
                        stats.sans_grade++;
                    }
                } else {
                    stats.sans_grade++;
                }
                
                // Vérifier si la date a changé
                const currentDate = agent.date_retraite_actuelle ? new Date(agent.date_retraite_actuelle) : null;
                const datesAreEqual = currentDate && newRetirementDate && 
                    currentDate.getTime() === newRetirementDate.getTime();
                
                if (!datesAreEqual) {
                    // Mettre à jour la date de retraite
                    await client.query(
                        'UPDATE agents SET date_retraite = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                        [newRetirementDate, agent.id]
                    );
                    stats.updated++;
                    
                    if (simulate && stats.updated <= 5) {
                        console.log(`  ✏️  ${agent.matricule} - ${agent.nom} ${agent.prenom}`);
                        console.log(`      Grade: ${agent.grade_libele || 'Sans grade'} → Âge retraite: ${retirementAge} ans`);
                        console.log(`      Date retraite: ${currentDate ? currentDate.toLocaleDateString('fr-FR') : 'Aucune'} → ${newRetirementDate.toLocaleDateString('fr-FR')}`);
                        console.log('');
                    }
                } else {
                    stats.unchanged++;
                }
                
            } catch (error) {
                stats.errors.push({
                    matricule: agent.matricule,
                    nom: `${agent.nom} ${agent.prenom}`,
                    error: error.message
                });
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('RÉSUMÉ DU CALCUL DES DATES DE RETRAITE');
        console.log('='.repeat(60) + '\n');
        
        console.log(`📊 Total d'agents traités : ${stats.total}`);
        console.log(`✅ Mises à jour effectuées : ${stats.updated}`);
        console.log(`➡️  Dates inchangées : ${stats.unchanged}`);
        console.log('');
        console.log(`🔵 Agents avec retraite à 65 ans (A4-A7) : ${stats.grade_65_ans}`);
        console.log(`🔘 Agents avec retraite à 60 ans (autres grades) : ${stats.grade_60_ans}`);
        console.log(`⚪ Agents sans grade : ${stats.sans_grade}`);
        
        if (stats.errors.length > 0) {
            console.log('');
            log.warning(`${stats.errors.length} erreurs rencontrées`);
            stats.errors.forEach(err => {
                console.log(`  - ${err.matricule} (${err.nom}): ${err.error}`);
            });
        }
        
        console.log('\n' + '='.repeat(60) + '\n');
        
        // Afficher quelques exemples
        if (simulate) {
            log.info('Affichage d\'un échantillon de 10 agents avec leurs dates de retraite...\n');
            
            const sampleQuery = `
                SELECT 
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.date_de_naissance,
                    a.date_retraite,
                    g.libele as grade_libele
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE a.date_retraite IS NOT NULL
                ORDER BY a.date_retraite ASC
                LIMIT 10
            `;
            
            const sampleResult = await client.query(sampleQuery);
            
            console.log('┌────────────────┬──────────────────────────┬────────┬─────────────┬─────────────────┐');
            console.log('│ Matricule      │ Nom                      │ Grade  │ Naissance   │ Date Retraite   │');
            console.log('├────────────────┼──────────────────────────┼────────┼─────────────┼─────────────────┤');
            
            sampleResult.rows.forEach(agent => {
                const matricule = (agent.matricule || '-').padEnd(14);
                const nom = (`${agent.nom} ${agent.prenom}`.substring(0, 24)).padEnd(24);
                const grade = (agent.grade_libele || '-').padEnd(6);
                const naissance = agent.date_de_naissance ? new Date(agent.date_de_naissance).toLocaleDateString('fr-FR').padEnd(11) : '-'.padEnd(11);
                const retraite = agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR').padEnd(15) : '-'.padEnd(15);
                
                console.log(`│ ${matricule} │ ${nom} │ ${grade} │ ${naissance} │ ${retraite} │`);
            });
            
            console.log('└────────────────┴──────────────────────────┴────────┴─────────────┴─────────────────┘');
            console.log('');
        }
        
        // Décider de commit ou rollback
        if (simulate) {
            await client.query('ROLLBACK');
            log.warning('Mode SIMULATION - Aucun changement appliqué (ROLLBACK)');
            console.log('\n💡 Pour appliquer les changements, exécutez :');
            console.log('   node calculateRetirementDates.js --apply\n');
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
│  CALCUL AUTOMATIQUE DES DATES DE RETRAITE      │
└─────────────────────────────────────────────────┘${colors.reset}

Usage:
  ${colors.green}node calculateRetirementDates.js --simulate${colors.reset}  (Prévisualiser les changements)
  ${colors.yellow}node calculateRetirementDates.js --apply${colors.reset}     (Appliquer définitivement)

📝 Le script :
  1. Lit tous les agents de la base de données
  2. Calcule leur âge et date de retraite selon leur grade
  3. Met à jour la colonne date_retraite

📋 Règles de calcul :
  • Grades A4, A5, A6, A7 → Retraite à 65 ans
  • Autres grades → Retraite à 60 ans
  • Date de retraite : 31 décembre de l'année concernée
    `);
    process.exit(0);
}

const simulate = mode === '--simulate';

log.info(`Mode : ${simulate ? 'SIMULATION' : 'APPLICATION'}`);
processRetirementCalculations(simulate)
    .then(() => {
        log.success('Script terminé avec succès !');
        process.exit(0);
    })
    .catch((error) => {
        log.error(`Erreur fatale : ${error.message}`);
        process.exit(1);
    });

