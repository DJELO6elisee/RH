/**
 * Script d'importation avancé des agents depuis le fichier CSV
 * Gère également les tables de référence : emplois, échelons, fonction_agents, etc.
 */

const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');
const path = require('path');

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
 * Parse l'échelon au format "2E Cla-4E Ech" ou "1R Cla-2E Ech"
 */
function parseEchelon(echelonStr) {
    if (!echelonStr || echelonStr.trim() === '') {
        return { classe: null, echelon: null };
    }

    // Format: "2E Cla-4E Ech" ou "1R Cla-2E Ech"
    const match = echelonStr.match(/(\d+[ER])\s*Cla-(\d+[ER])\s*Ech/i);

    if (match) {
        return {
            classe: match[1], // "2E" ou "1R"
            echelon: match[2] // "4E" ou "2E"
        };
    }

    return { classe: null, echelon: null };
}

/**
 * Récupère ou crée une localité
 */
async function getOrCreateLocalite(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM localites WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        // Générer un code unique basé sur le timestamp et un nombre aléatoire
        const uniqueCode = `LOC${Date.now()}${Math.floor(Math.random() * 1000)}`;

        const insertResult = await db.query(
            'INSERT INTO localites (libele, code) VALUES ($1, $2) RETURNING id', [libelle.trim(), uniqueCode]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur localité "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère ou crée une direction
 */
async function getOrCreateDirection(libelle, id_ministere) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM directions WHERE UPPER(libelle) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await db.query(
            'INSERT INTO directions (libelle, id_ministere) VALUES ($1, $2) RETURNING id', [libelle.trim(), id_ministere]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur direction "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère ou crée un service
 */
async function getOrCreateService(libelle, id_direction) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM services WHERE UPPER(libelle) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        if (id_direction) {
            const insertResult = await db.query(
                'INSERT INTO services (libelle, id_direction) VALUES ($1, $2) RETURNING id', [libelle.trim(), id_direction]
            );

            return insertResult.rows[0].id;
        }

        return null;
    } catch (error) {
        console.error(`Erreur service "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère ou crée une position
 */
async function getOrCreatePosition(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await db.query(
            'INSERT INTO positions (libele) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur position "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère ou crée un emploi
 */
async function getOrCreateEmploi(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM emplois WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await db.query(
            'INSERT INTO emplois (libele) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur emploi "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère ou crée un échelon
 */
async function getOrCreateEchelon(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM echelons WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await db.query(
            'INSERT INTO echelons (libele) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur échelon "${libelle}":`, error.message);
        return null;
    }
}

/**
 * Récupère ou crée une catégorie
 */
async function getOrCreateCategorie(libelle) {
    if (!libelle || libelle.trim() === '') return null;

    try {
        const result = await db.query(
            'SELECT id FROM categories WHERE UPPER(libele) = UPPER($1) LIMIT 1', [libelle.trim()]
        );

        if (result.rows.length > 0) {
            return result.rows[0].id;
        }

        const insertResult = await db.query(
            'INSERT INTO categories (libele) VALUES ($1) RETURNING id', [libelle.trim()]
        );

        return insertResult.rows[0].id;
    } catch (error) {
        console.error(`Erreur catégorie "${libelle}":`, error.message);
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
        console.error('Erreur ministère:', error.message);
        return null;
    }
}

/**
 * Traite une ligne du CSV et prépare les données
 */
async function processRow(row, id_ministere) {
    // Ignorer les lignes de séparation
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
        console.warn(`⚠️  Ligne ignorée - Nom/Prénom invalide: ${row.Matricule}`);
        return null;
    }

    // Récupérer les IDs des tables de référence
    const id_direction = await getOrCreateDirection(row['Direction'], id_ministere);
    const id_localite = await getOrCreateLocalite(row['Localité']);
    const id_service = await getOrCreateService(row['Service'], id_direction);
    const id_position = await getOrCreatePosition(row['Position']);
    const id_emploi = await getOrCreateEmploi(row['Emploi']);
    const id_categorie = await getOrCreateCategorie(row['Categorie']);

    // Parser l'échelon
    const { classe, echelon } = parseEchelon(row['Echelon']);
    const id_echelon = await getOrCreateEchelon(row['Echelon actualisé'] || row['Echelon']);

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
        id_emploi: id_emploi,
        id_echelon: id_echelon,
        id_categorie: id_categorie,
        id_ministere: id_ministere,
        statut_emploi: 'actif',
    };

    // Données pour fonction_agents (historique des fonctions)
    const fonctionData = {
        designation_poste: row['fonction'] || row['Fonction'] || null,
        date_entree: parseDate(row['PS Dir.']) || parseDate(row['1ère PS']),
        date_sortie: null,
    };

    return { agentData, fonctionData };
}

/**
 * Insère un agent dans la base de données
 */
async function insertAgent(agentData, fonctionData) {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Vérifier si l'agent existe déjà
        const existingAgent = await client.query(
            'SELECT id FROM agents WHERE matricule = $1', [agentData.matricule]
        );

        if (existingAgent.rows.length > 0) {
            await client.query('ROLLBACK');
            return { success: false, reason: 'exists', matricule: agentData.matricule };
        }

        // Préparer la requête d'insertion de l'agent
        const fields = [];
        const values = [];
        const placeholders = [];

        Object.keys(agentData).forEach((key) => {
            if (agentData[key] !== null && agentData[key] !== undefined) {
                fields.push(key);
                values.push(agentData[key]);
                placeholders.push(`$${values.length}`);
            }
        });

        const insertQuery = `
            INSERT INTO agents (${fields.join(', ')})
            VALUES (${placeholders.join(', ')})
            RETURNING id, matricule, nom, prenom
        `;

        const result = await client.query(insertQuery, values);
        const agent = result.rows[0];

        // Note: fonction_agents nécessite id_nomination qui n'est pas disponible dans le CSV
        // Cette table sera remplie ultérieurement via le système de nominations

        await client.query('COMMIT');

        console.log(`✅ ${agent.matricule} - ${agent.nom} ${agent.prenom}`);

        return { success: true, agent: agent };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Erreur ${agentData.matricule}:`, error.message);
        return { success: false, reason: 'error', error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Fonction principale d'importation
 */
async function importAgents(csvFilePath) {
    console.log('🚀 Démarrage de l\'importation avancée des agents...\n');

    const stats = {
        total: 0,
        success: 0,
        skipped: 0,
        errors: 0,
        exists: 0
    };

    // Récupérer l'ID du ministère
    const id_ministere = await getMinistereId();

    if (!id_ministere) {
        throw new Error('Impossible de trouver le ministère du Tourisme');
    }

    console.log(`📍 Ministère ID: ${id_ministere}\n`);

    return new Promise((resolve, reject) => {
        const agents = [];

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                agents.push(row);
            })
            .on('end', async() => {
                console.log(`📋 ${agents.length} lignes lues du fichier CSV\n`);
                console.log('⏳ Traitement en cours...\n');

                for (const row of agents) {
                    stats.total++;

                    const processedData = await processRow(row, id_ministere);

                    if (!processedData) {
                        stats.skipped++;
                        continue;
                    }

                    const result = await insertAgent(processedData.agentData, processedData.fonctionData);

                    if (result.success) {
                        stats.success++;
                    } else if (result.reason === 'exists') {
                        stats.exists++;
                    } else {
                        stats.errors++;
                    }
                }

                console.log('\n📊 RÉSUMÉ DE L\'IMPORTATION:');
                console.log('═══════════════════════════════════');
                console.log(`📝 Total de lignes traitées: ${stats.total}`);
                console.log(`✅ Agents créés avec succès: ${stats.success}`);
                console.log(`⚠️  Agents déjà existants: ${stats.exists}`);
                console.log(`⏭️  Lignes ignorées (vides): ${stats.skipped}`);
                console.log(`❌ Erreurs rencontrées: ${stats.errors}`);
                console.log('═══════════════════════════════════\n');

                resolve(stats);
            })
            .on('error', (error) => {
                console.error('❌ Erreur lecture CSV:', error);
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
            console.log('🎉 Importation terminée avec succès !');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { importAgents };