/**
 * Script d'importation des agents depuis le fichier CSV
 * Ce script mappe les colonnes du CSV vers les champs de la table agents
 */

const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');
const path = require('path');

// Mapping des colonnes CSV vers les champs de la base de données
const CSV_TO_DB_MAPPING = {
    // Colonnes directes
    'Matricule': 'matricule',
    'Nom et Prénom': null, // À traiter séparément (nom + prénom)
    'Sexe': 'sexe',
    'Date nais.': 'date_de_naissance',
    '1ère PS': 'date_embauche', // Première prise de service
    'PS Min.': 'date_prise_service_au_ministere',
    'PS Dir.': 'date_prise_service_dans_la_direction',
    'N° tel. bureau': 'telephone1',
    'N° tel. domicile': 'telephone2',
    'N° tel. cellulaire': null, // Pourrait être telephone1 ou telephone2
    'Adresse mail': 'email',
    'fonction': 'fonction_actuelle',
    'Localité': null, // À mapper vers id_localite
    'Direction': null, // À mapper vers id_direction
    'Service': null, // À mapper vers id_service
    'Région': null, // Information supplémentaire
    'Position': null, // À mapper vers id_position
    'Date posit.': null, // Date de position

    // Colonnes nécessitant une transformation
    'Categorie': null, // À mapper vers id_categorie
    'Echelon': null, // À mapper vers id_echelon (plusieurs colonnes)
    'Emploi': null, // À mapper vers id_emploi
    'Diplome': null, // À mapper vers id_diplome
};

/**
 * Extrait le nom et le prénom d'une chaîne "NOM PRENOM"
 */
function parseNomPrenom(nomComplet) {
    if (!nomComplet || nomComplet.trim() === '') {
        return { nom: '', prenom: '' };
    }

    const parts = nomComplet.trim().split(/\s+/);
    if (parts.length === 1) {
        return { nom: parts[0], prenom: '' };
    }

    // Le premier mot est généralement le nom de famille
    const nom = parts[0];
    const prenom = parts.slice(1).join(' ');

    return { nom, prenom };
}

/**
 * Convertit une date du format CSV vers le format ISO
 */
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '' || dateStr === 'CPS abs.') {
        return null;
    }

    try {
        // Format attendu: "M/D/YYYY" ou "MM/DD/YYYY"
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }
    } catch (error) {
        console.warn(`Erreur lors du parsing de la date: ${dateStr}`, error.message);
    }

    return null;
}

/**
 * Normalise le sexe (M/F)
 */
function parseSexe(sexeStr) {
    if (!sexeStr || sexeStr.trim() === '') {
        return null;
    }

    const sexe = sexeStr.trim().toUpperCase();
    return (sexe === 'M' || sexe === 'F') ? sexe : null;
}

/**
 * Récupère l'ID d'une localité par son libellé
 */
async function getLocaliteId(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM localites WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        // Créer la localité si elle n'existe pas avec un code unique
        const uniqueCode = `LOC${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const insertResult = await db.query(
            'INSERT INTO localites (libele, code) VALUES ($1, $2) RETURNING id', [libelle.trim(), uniqueCode]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la localité "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère l'ID d'une direction par son libellé
 */
async function getDirectionId(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM directions WHERE UPPER(libelle) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        // Créer la direction si elle n'existe pas
        const insertResult = await db.query(
            'INSERT INTO directions (libelle) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la direction "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère l'ID d'un service par son libellé
 */
async function getServiceId(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM services WHERE UPPER(libelle) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        // Le service n'existe pas, on retourne null
        // (ne pas créer automatiquement les services car ils dépendent de la direction)
        console.warn(`Service non trouvé: "${libelle}"`);
        return null;
    } catch (error) {
        console.error(`Erreur lors de la récupération du service "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère l'ID d'une position par son libellé
 */
async function getPositionId(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        // Créer la position si elle n'existe pas
        const insertResult = await db.query(
            'INSERT INTO positions (libele) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur lors de la récupération de la position "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère le ministère ID 1 (tous les agents appartiennent au ministère 1)
 */
async function getMinistereId() {
    try {
        // Tous les agents appartiennent au ministère ID 1
        const result = await db.query(
            "SELECT id, nom FROM ministeres WHERE id = 1 LIMIT 1"
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        console.warn('⚠️  Ministère ID 1 non trouvé');
        return null;
    } catch (error) {
        console.error('Erreur lors de la récupération du ministère:', error.message);
        return null;
    }
}

/**
 * Traite une ligne du CSV et prépare les données pour l'insertion
 */
async function processRow(row) {
    // Ignorer les lignes de séparation (DIR / SER : ...)
    if (row.Matricule && row.Matricule.startsWith('DIR / SER')) {
        return null;
    }

    // Ignorer les lignes vides
    if (!row.Matricule || row.Matricule.trim() === '') {
        return null;
    }

    // Parser le nom et prénom
    const { nom, prenom } = parseNomPrenom(row['Nom et Prénom']);

    if (!nom || !prenom) {
        console.warn(`Ligne ignorée - Nom/Prénom invalide: ${row.Matricule}`);
        return null;
    }

    // Récupérer les IDs des tables de référence
    const id_localite = await getLocaliteId(row['Localité']);
    const id_direction = await getDirectionId(row['Direction']);
    const id_service = await getServiceId(row['Service']);
    const id_position = await getPositionId(row['Position']);
    const id_ministere = await getMinistereId();

    // Préparer les données de l'agent
    const agentData = {
        matricule: row.Matricule.trim(),
        nom: nom,
        prenom: prenom,
        sexe: parseSexe(row.Sexe),
        date_de_naissance: parseDate(row['Date nais.']),
        date_embauche: parseDate(row['1ère PS']),
        date_prise_service_au_ministere: parseDate(row['PS Min.']),
        date_prise_service_dans_la_direction: parseDate(row['PS Dir.']),
        telephone1: row['N° tel. bureau'] || row['N° tel. cellulaire'] || null,
        telephone2: row['N° tel. domicile'] || null,
        email: row['Adresse mail'] || null,
        fonction_actuelle: row['fonction'] || row['Fonction'] || null,
        lieu_de_naissance: row['Localité'] || null,
        id_localite: id_localite,
        id_direction: id_direction,
        id_service: id_service,
        id_position: id_position,
        id_ministere: id_ministere,
        statut_emploi: 'actif',
    };

    return agentData;
}

/**
 * Insère un agent dans la base de données
 */
async function insertAgent(agentData) {
    try {
        // Vérifier si l'agent existe déjà
        const existingAgent = await db.query(
            'SELECT id FROM agents WHERE matricule = $1', [agentData.matricule]
        );

        if (existingAgent.rows.length > 0) {
            console.log(`⚠️  Agent déjà existant: ${agentData.matricule} - ${agentData.nom} ${agentData.prenom}`);
            return { success: false, reason: 'exists' };
        }

        // Préparer la requête d'insertion
        const fields = [];
        const values = [];
        const placeholders = [];

        Object.keys(agentData).forEach((key, index) => {
            if (agentData[key] !== null && agentData[key] !== undefined) {
                fields.push(key);
                values.push(agentData[key]);
                placeholders.push(`$${index + 1}`);
            }
        });

        const query = `
            INSERT INTO agents (${fields.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING id, matricule, nom, prenom
        `;

        const result = await db.query(query, values);

        console.log(`✅ Agent créé: ${result.rows[0].matricule} - ${result.rows[0].nom} ${result.rows[0].prenom}`);

        return { success: true, agent: result.rows[0] };

    } catch (error) {
        console.error(`❌ Erreur lors de l'insertion de l'agent ${agentData.matricule}:`, error.message);
        return { success: false, reason: 'error', error: error.message };
    }
}

/**
 * Fonction principale d'importation
 */
async function importAgents(csvFilePath) {
    console.log('🚀 Démarrage de l\'importation des agents...\n');

    const stats = {
        total: 0,
        success: 0,
        skipped: 0,
        errors: 0,
        exists: 0
    };

    return new Promise((resolve, reject) => {
        const agents = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                agents.push(row);
            })
            .on('end', async() => {
                console.log(`📋 ${agents.length} lignes lues du fichier CSV\n`);

                for (const row of agents) {
                    stats.total++;

                    const agentData = await processRow(row);

                    if (!agentData) {
                        stats.skipped++;
                        continue;
                    }

                    const result = await insertAgent(agentData);

                    if (result.success) {
                        stats.success++;
                    } else if (result.reason === 'exists') {
                        stats.exists++;
                    } else {
                        stats.errors++;
                    }
                }

                console.log('\n📊 RÉSUMÉ DE L\'IMPORTATION:');
                console.log('─────────────────────────────');
                console.log(`Total de lignes traitées: ${stats.total}`);
                console.log(`✅ Agents créés: ${stats.success}`);
                console.log(`⚠️  Agents déjà existants: ${stats.exists}`);
                console.log(`⏭️  Lignes ignorées: ${stats.skipped}`);
                console.log(`❌ Erreurs: ${stats.errors}`);
                console.log('─────────────────────────────\n');

                resolve(stats);
            })
            .on('error', (error) => {
                console.error('❌ Erreur lors de la lecture du fichier CSV:', error);
                reject(error);
            });
    });
}

// Exécution du script
if (require.main === module) {
    const csvFilePath = process.argv[2] || path.join(__dirname, '..', '..', 'Liste-du-Personel-_1_.csv');

    console.log(`📂 Fichier CSV: ${csvFilePath}\n`);

    importAgents(csvFilePath)
        .then(() => {
            console.log('✅ Importation terminée avec succès');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { importAgents };