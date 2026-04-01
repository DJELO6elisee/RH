const db = require('../config/database');
const { validationResult } = require('express-validator');
const { genererTexteNotificationAbsence, genererTexteNotificationAttestationPresence, genererTexteNotificationSortieTerritoire } = require('../utils/absenceUtils');
const DocumentGenerationService = require('../services/DocumentGenerationService');
const CongesController = require('./CongesController');
const { formatDatesInObject } = require('../utils/dateFormatter');

/**
 * Applique la logique de déduction des jours de congés pour une demande de cessation
 * Les jours sont déduits en priorité sur la 2ème année précédente, puis sur la 1ère année précédente.
 * Si les deux années sont épuisées, seuls les congés exceptionnels peuvent impacter l'année en cours.
 *
 * @param {object} params
 * @param {object} params.client - Client PostgreSQL (db ou transaction)
 * @param {number} params.agentId - Identifiant de l'agent
 * @param {number} params.nombreJours - Nombre de jours demandés
 * @param {string} params.motifConge - Motif sélectionné
 * @param {string|null} params.raisonExceptionnelle - Justification éventuelle
 * @param {string|Date|null} params.dateReference - Date de référence pour déterminer l'année courante
 * @param {number|null} params.demandeId - Identifiant de la demande (pour mettre à jour jours_restants_apres_deduction)
 *
 * @returns {Promise<{joursRestantsApresDeduction: number, soldeNegatif: number}>}
 */
async function appliquerDeductionCessation({
    client = db,
    agentId,
    nombreJours,
    motifConge,
    raisonExceptionnelle = null,
    dateReference = new Date(),
    demandeId = null
}) {
    const joursADeduire = parseInt(nombreJours, 10);
    if (Number.isNaN(joursADeduire) || joursADeduire <= 0) {
        throw new Error('Le nombre de jours à déduire est invalide');
    }

    const dateRef = dateReference ? new Date(dateReference) : new Date();
    const anneeCourante = dateRef.getFullYear();
    const premiereAnneePrecedente = anneeCourante - 1;
    const deuxiemeAnneePrecedente = anneeCourante - 2;
    const isCongeExceptionnel = motifConge === 'congé exceptionnel';

    const years = [deuxiemeAnneePrecedente, premiereAnneePrecedente, anneeCourante];
    const getCongesQuery = `
        SELECT id, annee, jours_alloues, jours_pris, jours_restants, dette_annee_suivante
        FROM agent_conges
        WHERE id_agent = $1 AND annee = ANY($2::int[])
    `;
    const congesResult = await client.query(getCongesQuery, [agentId, years]);

    const defaultRecord = (annee) => ({
        id: null,
        annee,
        jours_alloues: 30,
        jours_pris: 0,
        jours_restants: 30,
        dette_annee_suivante: 0
    });

    const congesMap = {
        [deuxiemeAnneePrecedente]: defaultRecord(deuxiemeAnneePrecedente),
        [premiereAnneePrecedente]: defaultRecord(premiereAnneePrecedente),
        [anneeCourante]: defaultRecord(anneeCourante)
    };

    congesResult.rows.forEach((row) => {
        congesMap[row.annee] = {
            ...row,
            jours_alloues: row.jours_alloues ? row.jours_alloues : 30,
            jours_pris: row.jours_pris ? row.jours_pris : 0,
            jours_restants: row.jours_restants ? row.jours_restants : Math.max(0, (row.jours_alloues ? row.jours_alloues : 30) - (row.jours_pris ? row.jours_pris : 0)),
            dette_annee_suivante: row.dette_annee_suivante ? row.dette_annee_suivante : 0
        };
    });

    const upsertConges = async({ annee, joursAlloues, joursPris, joursRestants }) => {
        await client.query(`
            INSERT INTO agent_conges (id_agent, annee, jours_alloues, jours_pris, jours_restants, jours_reportes, dette_annee_suivante)
            VALUES ($1, $2, $3, $4, $5, 0, 0)
            ON CONFLICT (id_agent, annee)
            DO UPDATE SET
                jours_pris = EXCLUDED.jours_pris,
                jours_restants = EXCLUDED.jours_restants,
                updated_at = CURRENT_TIMESTAMP
        `, [agentId, annee, joursAlloues, joursPris, joursRestants]);
    };

    let resteADeduire = joursADeduire;
    let soldeNegatif = 0;
    let joursRestantsApresDeduction = 0;

    const conges2emeAnnee = congesMap[deuxiemeAnneePrecedente];
    const conges1ereAnnee = congesMap[premiereAnneePrecedente];
    let congesAnneeCourante = congesMap[anneeCourante];

    if (!isCongeExceptionnel) {
        const totalDisponible = (conges2emeAnnee.jours_restants || 0) + (conges1ereAnnee.jours_restants || 0);
        if (totalDisponible < joursADeduire) {
            throw new Error(`Vous n'avez que ${totalDisponible} jour(s) disponible(s) dans les années précédentes (${deuxiemeAnneePrecedente}: ${conges2emeAnnee.jours_restants} jours, ${premiereAnneePrecedente}: ${conges1ereAnnee.jours_restants} jours). Veuillez choisir un congé exceptionnel pour dépasser ce nombre.`);
        }
    }

    const deduireSurAnnee = async(congesAnnee, anneeLabel) => {
        if (resteADeduire <= 0 || congesAnnee.jours_restants <= 0) {
            return 0;
        }

        const deduction = Math.min(resteADeduire, congesAnnee.jours_restants);
        const nouveauxJoursPris = (congesAnnee.jours_pris || 0) + deduction;
        const nouveauxJoursRestants = (congesAnnee.jours_restants || 0) - deduction;
        await upsertConges({
            annee: anneeLabel,
            joursAlloues: congesAnnee.jours_alloues || 30,
            joursPris: nouveauxJoursPris,
            joursRestants: nouveauxJoursRestants
        });
        congesAnnee.jours_pris = nouveauxJoursPris;
        congesAnnee.jours_restants = nouveauxJoursRestants;
        resteADeduire -= deduction;
        return deduction;
    };

    // Déduire d'abord sur la 2ème année précédente puis la 1ère
    await deduireSurAnnee(conges2emeAnnee, deuxiemeAnneePrecedente);
    await deduireSurAnnee(conges1ereAnnee, premiereAnneePrecedente);

    if (resteADeduire > 0) {
        if (!isCongeExceptionnel) {
            throw new Error(`Impossible de déduire ${joursADeduire} jour(s). Les années ${deuxiemeAnneePrecedente} et ${premiereAnneePrecedente} sont épuisées.`);
        }

        // Pour les congés exceptionnels, déduire sur l'année en cours
        if (!congesAnneeCourante || !congesAnneeCourante.id) {
            await CongesController.createOrUpdateConges(agentId, anneeCourante);
            const refreshed = await client.query(`
                SELECT annee, jours_alloues, jours_pris, jours_restants, dette_annee_suivante
                FROM agent_conges
                WHERE id_agent = $1 AND annee = $2
            `, [agentId, anneeCourante]);
            congesAnneeCourante = refreshed.rows[0] || congesAnneeCourante;
        }

        const nouveauxJoursPris = (congesAnneeCourante.jours_pris || 0) + resteADeduire;
        let nouveauxJoursRestants = (congesAnneeCourante.jours_alloues || 30) - nouveauxJoursPris;
        if (nouveauxJoursRestants < 0) {
            soldeNegatif = Math.abs(nouveauxJoursRestants);
            nouveauxJoursRestants = 0;
        }

        await client.query(`
            UPDATE agent_conges
            SET 
                jours_pris = $3,
                jours_restants = $4,
                dette_annee_suivante = COALESCE(dette_annee_suivante, 0) + $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_agent = $1 AND annee = $2
        `, [agentId, anneeCourante, nouveauxJoursPris, nouveauxJoursRestants, soldeNegatif]);

        resteADeduire = 0;
        joursRestantsApresDeduction = nouveauxJoursRestants;
    } else {
        // Tous les jours ont été prélevés sur les années précédentes
        if (joursADeduire <= conges2emeAnnee.jours_pris) {
            joursRestantsApresDeduction = conges2emeAnnee.jours_restants;
        } else {
            joursRestantsApresDeduction = conges1ereAnnee.jours_restants;
        }
    }

    if (demandeId) {
        await client.query(
            `UPDATE demandes SET jours_restants_apres_deduction = $2 WHERE id = $1`, [demandeId, joursRestantsApresDeduction]
        );
    }

    if (soldeNegatif > 0 && raisonExceptionnelle) {
        console.log(`⚠️ Congé exceptionnel - dette de ${soldeNegatif} jours pour l'agent ${agentId}. Raison: ${raisonExceptionnelle}`);
    }

    return {
        joursRestantsApresDeduction,
        soldeNegatif
    };
}

function normalizePositionLabel(label) {
    return String(label || '')
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}


async function getPositionIdByLabels(client, labels) {
    if (!Array.isArray(labels) || labels.length === 0) {
        return null;
    }

    const labelsResult = await client.query('SELECT id, libele FROM positions');
    const positions = labelsResult.rows || [];
    const normalizedMap = new Map();

    positions.forEach((position) => {
        normalizedMap.set(normalizePositionLabel(position.libele), position.id);
    });

    for (const label of labels) {
        const positionId = normalizedMap.get(normalizePositionLabel(label));
        if (positionId) {
            return positionId;
        }
    }

    return null;
}

async function updateAgentPositionFromDemandeApproval(client, demande) {
    if (!demande || !demande.id_agent || !demande.type_demande) {
        return null;
    }

    const typeDemande = demande.type_demande;
    let labels = null;
    let absenceMotifLabel = null;

    // On ne met à jour la position que si l'évènement est effectif à "aujourd'hui".
    // Sinon, la position reste inchangée et sera recalculée côté `AgentsController.getById`
    // quand la date effective sera atteinte.
    // Utiliser la date locale (et non UTC via toISOString) pour éviter les décalages d'un jour
    // qui peuvent rendre une absence "non effective aujourd'hui".
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const toDateOnlyStr = (v) => {
        if (!v) return null;
        if (typeof v === 'string') {
            const s = v.trim();
            return s.length >= 10 ? s.slice(0, 10) : null;
        }
        const d = v instanceof Date ? v : new Date(v);
        if (Number.isNaN(d.getTime())) return null;
        // Conversion locale pour éviter les décalages UTC.
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    if (typeDemande === 'certificat_reprise_service') {
        const dateRepriseStr = toDateOnlyStr(demande.date_reprise_service);
        if (!dateRepriseStr || todayStr < dateRepriseStr) {
            return null;
        }
        labels = ['En activite', 'En activité'];
    } else if (typeDemande === 'absence' || typeDemande === 'sortie_territoire') {
        // Pour absence: actif uniquement sur la période [date_debut, date_fin].
        // Pour sortie du territoire: actif à partir de date_debut et reste actif
        // tant qu'aucun certificat de reprise de service n'est effectif.
        const debutStr = toDateOnlyStr(demande.date_debut);
        const finStr = toDateOnlyStr(demande.date_fin);
        if (!debutStr) {
            return null;
        }
        if (todayStr < debutStr) {
            console.log('DEBUG absence/sortie effective skip (hors période):', {
                id_agent: demande.id_agent,
                type_demande: typeDemande,
                todayStr,
                debutStr,
                finStr
            });
            return null;
        }
        // Règle métier: pour absence et sortie du territoire, la position reste active
        // jusqu'à un certificat de reprise de service effectif (date_fin non bloquante).
        // IMPORTANT:
        // - si le motif saisi n'existe pas dans `positions`, on le crée automatiquement
        // - sinon on utilise l'identifiant existant
        // Certains formulaires alimentent le "motif" dans `description`.
        absenceMotifLabel = (demande.motif_conge || demande.agree_motif || demande.description || '').trim() || null;

        // Pour déclencher l'insertion si le motif n'existe pas, on ne met que le motif dans `labels`.
        // Le fallback générique "En congé" est géré plus bas si besoin.
        labels = absenceMotifLabel ? [absenceMotifLabel] : ['En conge', 'En congé'];
    } else if (typeDemande === 'certificat_cessation') {
        // Les cessations de service ont des motifs (congé maternité/paternité/annuel/...), donc on choisit la position selon le motif.
        const dateCessationStr = toDateOnlyStr(demande.agree_date_cessation);
        if (!dateCessationStr || todayStr < dateCessationStr) {
            return null;
        }
        const motifCongeRaw = demande.motif_conge || demande.agree_motif || '';
        const motifConge = normalizePositionLabel(motifCongeRaw);

        // Valeur par défaut si le motif ne correspond à rien.
        labels = ['En conge', 'En congé'];

        if (motifConge.includes('matern')) {
            labels = ['CONGE DE MATERNITE', 'CONGE DE MATERNITE ', 'En conge', 'En congé'];
        } else if (motifConge.includes('patern')) {
            labels = ['CONGE DE PATERNITE', 'CONGE DE PATERNITE ', 'En conge', 'En congé'];
        } else if (motifConge.includes('annuel') || motifConge.includes('annuelle')) {
            labels = ['CONGE ANNUEL', 'CONGE ANNUEL ', 'En conge', 'En congé'];
        }
    } else {
        return null;
    }

    let targetPositionId = await getPositionIdByLabels(client, labels);
    // Cas où le motif saisi (absence/sortie) ne correspond à aucun libellé de `positions`:
    // on insère une nouvelle position pour pouvoir l'utiliser comme `id_position`.
    if (!targetPositionId && (typeDemande === 'absence' || typeDemande === 'sortie_territoire') && absenceMotifLabel) {
        try {
            const existingPos = await client.query(
                'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1',
                [absenceMotifLabel]
            );

            if (existingPos.rows && existingPos.rows.length > 0) {
                targetPositionId = existingPos.rows[0].id;
            } else {
                const insertPos = await client.query(
                    'INSERT INTO positions (libele) VALUES ($1) RETURNING id',
                    [absenceMotifLabel]
                );
                targetPositionId = insertPos.rows && insertPos.rows[0] ? insertPos.rows[0].id : null;
            }
        } catch (e) {
            // Ne jamais bloquer la validation si l'insertion automatique échoue.
            console.error('❌ Erreur insertion position (absence/sortie motif):', e?.message || e);
            // En cas de collision concurrente, récupérer l'ID inséré par une autre requête.
            try {
                const retryPos = await client.query(
                    'SELECT id FROM positions WHERE UPPER(libele) = UPPER($1) LIMIT 1',
                    [absenceMotifLabel]
                );
                targetPositionId = retryPos.rows && retryPos.rows.length > 0 ? retryPos.rows[0].id : null;
            } catch (_retryErr) {
                targetPositionId = null;
            }
        }
    }

    // Dernier recours: retomber sur la position générique "En congé".
    if (!targetPositionId && (typeDemande === 'absence' || typeDemande === 'sortie_territoire')) {
        targetPositionId = await getPositionIdByLabels(client, ['En conge', 'En congé']);
    }
    if (!targetPositionId) {
        console.warn(`⚠️ Impossible de mettre à jour la position: aucune position trouvée pour type_demande='${demande.type_demande}'`);
        return null;
    }

    const updateResult = await client.query(
        `UPDATE agents
         SET id_position = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND (id_position IS DISTINCT FROM $1)
         RETURNING id, id_position`,
        [targetPositionId, demande.id_agent]
    );

    if (updateResult.rows.length > 0) {
        console.log(`✅ Position agent mise à jour: agent=${demande.id_agent}, type_demande=${demande.type_demande}, id_position=${targetPositionId}`);
    } else {
        console.log(`ℹ️ Position agent inchangée: agent=${demande.id_agent}, type_demande=${demande.type_demande}`);
    }

    return targetPositionId;
}

class DemandesController {
    // Créer une nouvelle demande
    static async createDemande(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const {
                type_demande,
                description,
                date_debut,
                date_fin,
                lieu,
                priorite = 'normale',
                documents_joints,
                agree_motif,
                agree_date_cessation,
                // Nouveaux champs pour les demandes d'absence
                motif_conge,
                nombre_jours,
                raison_exceptionnelle,
                // Champs pour les certificats de reprise de service
                date_reprise_service,
                date_fin_conges,
                // Champs pour les demandes de mutation
                id_direction_destination,
                date_effet_mutation,
                motif_mutation,
                // Champ pour le certificat de non jouissance de congé
                annee_non_jouissance_conge,
                // Année au titre de laquelle le congé est demandé (pour le numéro de décision sur le document - congé annuel)
                annee_au_titre_conge,
                nombre_agents,
                poste_souhaite
            } = req.body;

            // Récupérer l'ID de l'agent depuis l'utilisateur connecté
            const id_agent = req.user.id_agent;

            // Vérifier que l'ID agent est présent
            if (!id_agent) {
                console.log('❌ Erreur: id_agent manquant dans req.user');
                console.log('req.user:', JSON.stringify(req.user, null, 2));
                return res.status(400).json({
                    success: false,
                    error: 'ID agent manquant. Veuillez vous reconnecter.'
                });
            }

            // Log des données reçues pour débogage
            console.log('📋 Données reçues pour création de demande:');
            console.log('- Type de demande:', type_demande);
            console.log('- Motif:', agree_motif);
            console.log('- Date cessation:', agree_date_cessation);
            console.log('- Description:', description);
            console.log('- Agent ID (depuis req.user.id_agent):', id_agent);
            console.log('- User complet:', JSON.stringify(req.user, null, 2));
            console.log('- Tous les champs reçus:', JSON.stringify(req.body, null, 2));

            // Log des erreurs de validation si elles existent
            if (!errors.isEmpty()) {
                console.log('❌ Erreurs de validation détectées:');
                errors.array().forEach((error, index) => {
                    console.log(`${index + 1}. ${error.msg} (${error.param})`);
                });
            } else {
                console.log('✅ Aucune erreur de validation détectée');
            }


            // Vérifier que l'agent existe et récupérer ses informations (y compris sous-direction et directeur)
            // Le directeur est déterminé en cherchant parmi les agents de la direction celui qui a le rôle "directeur"
            // Le sous-directeur est déterminé en cherchant parmi les agents de la sous-direction celui qui a le rôle "sous_directeur"
            const agentQuery = `
                SELECT 
                    a.*, 
                    s.libelle as service_nom, 
                    m.nom as ministere_nom,
                    a.id_sous_direction,
                    sd.libelle as sous_direction_libelle,
                    -- Trouver le directeur : agent de la direction avec rôle directeur, DRH, directeur_central ou rôles assimilés.
                    -- IMPORTANT: on priorise DRH > directeur_central > directeur > rôles assimilés pour éviter un LIMIT 1 non déterministe.
                    (SELECT dir_agent.id 
                     FROM agents dir_agent
                     JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                     JOIN roles dir_role ON dir_user.id_role = dir_role.id
                     WHERE dir_agent.id_direction = s.id 
                     AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                     ORDER BY CASE LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e'))
                        WHEN 'directeur_central' THEN 1
                        WHEN 'directeur' THEN 2
                        WHEN 'drh' THEN 3
                        WHEN 'gestionnaire_du_patrimoine' THEN 4
                        WHEN 'president_du_fond' THEN 5
                        WHEN 'responsble_cellule_de_passation' THEN 6
                        ELSE 99
                     END
                     LIMIT 1) as directeur_id,
                    (SELECT dir_agent.id 
                     FROM agents dir_agent
                     JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                     JOIN roles dir_role ON dir_user.id_role = dir_role.id
                     WHERE dir_agent.id_direction = s.id 
                     AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                     ORDER BY CASE LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e'))
                        WHEN 'directeur_central' THEN 1
                        WHEN 'directeur' THEN 2
                        WHEN 'drh' THEN 3
                        WHEN 'gestionnaire_du_patrimoine' THEN 4
                        WHEN 'president_du_fond' THEN 5
                        WHEN 'responsble_cellule_de_passation' THEN 6
                        ELSE 99
                     END
                     LIMIT 1) as directeur_agent_id,
                    (SELECT dir_role.nom 
                     FROM agents dir_agent
                     JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                     JOIN roles dir_role ON dir_user.id_role = dir_role.id
                     WHERE dir_agent.id_direction = s.id 
                     AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                     ORDER BY CASE LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e'))
                        WHEN 'directeur_central' THEN 1
                        WHEN 'directeur' THEN 2
                        WHEN 'drh' THEN 3
                        WHEN 'gestionnaire_du_patrimoine' THEN 4
                        WHEN 'president_du_fond' THEN 5
                        WHEN 'responsble_cellule_de_passation' THEN 6
                        ELSE 99
                     END
                     LIMIT 1) as directeur_role_nom,
                    -- Trouver le sous-directeur : agent de la sous-direction avec le rôle "sous_directeur"
                    (SELECT sous_dir_agent.id 
                     FROM agents sous_dir_agent
                     JOIN utilisateurs sous_dir_user ON sous_dir_agent.id = sous_dir_user.id_agent
                     JOIN roles sous_dir_role ON sous_dir_user.id_role = sous_dir_role.id
                     WHERE sous_dir_agent.id_sous_direction = sd.id 
                     AND sous_dir_role.nom = 'sous_directeur'
                     LIMIT 1) as sous_directeur_id,
                    (SELECT sous_dir_role.nom 
                     FROM agents sous_dir_agent
                     JOIN utilisateurs sous_dir_user ON sous_dir_agent.id = sous_dir_user.id_agent
                     JOIN roles sous_dir_role ON sous_dir_user.id_role = sous_dir_role.id
                     WHERE sous_dir_agent.id_sous_direction = sd.id 
                     AND sous_dir_role.nom = 'sous_directeur'
                     LIMIT 1) as sous_directeur_role_nom,
                    s.id_direction_generale as id_direction_generale_direction,
                    (SELECT dg_agent.id FROM agents dg_agent
                     JOIN utilisateurs dg_user ON dg_agent.id = dg_user.id_agent
                     JOIN roles dg_role ON dg_user.id_role = dg_role.id
                     WHERE dg_agent.id_direction_generale = COALESCE(s.id_direction_generale, a.id_direction_generale)
                     AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dg_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur_general', 'directeur_generale')
                     AND COALESCE(s.id_direction_generale, a.id_direction_generale) IS NOT NULL
                     LIMIT 1) as directeur_general_id,
                    (SELECT ig_agent.id FROM agents ig_agent
                     JOIN utilisateurs ig_user ON ig_agent.id = ig_user.id_agent
                     JOIN roles ig_role ON ig_user.id_role = ig_role.id
                     WHERE ig_agent.id_direction_generale = COALESCE(s.id_direction_generale, a.id_direction_generale)
                     AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(ig_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) = 'inspecteur_general'
                     AND COALESCE(s.id_direction_generale, a.id_direction_generale) IS NOT NULL
                     LIMIT 1) as inspecteur_general_id
                FROM agents a
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                WHERE a.id = $1
            `;
            const agentResult = await db.query(agentQuery, [id_agent]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            const agent = agentResult.rows[0];

            // Validation spécifique pour les demandes de mutation
            if (type_demande === 'mutation') {
                if (!id_direction_destination) {
                    return res.status(400).json({
                        success: false,
                        error: 'La direction de destination est requise pour une demande de mutation'
                    });
                }

                // Vérifier que la direction de destination existe
                const directionDestQuery = `SELECT id, libelle FROM directions WHERE id = $1`;
                const directionDestResult = await db.query(directionDestQuery, [id_direction_destination]);

                if (directionDestResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'La direction de destination spécifiée n\'existe pas'
                    });
                }

                // Vérifier que l'agent ne demande pas une mutation vers sa propre direction
                if (agent.id_direction === parseInt(id_direction_destination)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Vous ne pouvez pas demander une mutation vers votre direction actuelle'
                    });
                }

                if (!date_effet_mutation) {
                    return res.status(400).json({
                        success: false,
                        error: 'La date d\'effet de la mutation est requise'
                    });
                }

                // Vérifier que la date d'effet n'est pas dans le passé
                const dateEffet = new Date(date_effet_mutation);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (dateEffet < today) {
                    return res.status(400).json({
                        success: false,
                        error: 'La date d\'effet de la mutation ne peut pas être dans le passé'
                    });
                }

                console.log(`✅ Validation mutation réussie - Direction destination: ${directionDestResult.rows[0].libelle}, Date effet: ${date_effet_mutation}`);
            }

            // Validation spécifique pour les certificats de cessation
            if (type_demande === 'certificat_cessation') {
                // Vérifier que l'agent a au moins 2 ans de service
                // Pour le congé annuel, utiliser la date de première prise de service (date_embauche)
                // car l'agent peut avoir travaillé ailleurs avant de venir au ministère
                // Le délai de 2 ans ferme à observer est lié à la date de 1ère prise de service
                const motifConge = motif_conge || agree_motif || '';
                const isCongeAnnuel = motifConge.toLowerCase().includes('congé annuel') ||
                    motifConge.toLowerCase().includes('conge annuel') ||
                    (motifConge.toLowerCase().includes('congé') && motifConge.toLowerCase().includes('annuel'));

                // Pour le congé annuel, priorité à date_embauche (1ère prise de service)
                // Sinon, utiliser date_prise_service_au_ministere
                const datePriseService = isCongeAnnuel ?
                    (agent.date_embauche || agent.date_prise_service_au_ministere) :
                    (agent.date_prise_service_au_ministere || agent.date_embauche);

                if (!datePriseService) {
                    return res.status(400).json({
                        success: false,
                        error: 'Impossible de vérifier les années de service. La date de prise de service n\'est pas définie.'
                    });
                }

                const datePriseServiceObj = new Date(datePriseService);
                const dateActuelle = new Date();
                const anneeActuelle = dateActuelle.getFullYear();
                const moisActuel = dateActuelle.getMonth();
                const jourActuel = dateActuelle.getDate();
                const anneePriseService = datePriseServiceObj.getFullYear();
                const moisPriseService = datePriseServiceObj.getMonth();
                const jourPriseService = datePriseServiceObj.getDate();

                // Calculer les années complètes de service
                let anneesService = anneeActuelle - anneePriseService;
                if (moisActuel < moisPriseService || (moisActuel === moisPriseService && jourActuel < jourPriseService)) {
                    anneesService--;
                }

                // L'agent doit avoir au moins 2 ans de service (donc être dans sa 3ème année)
                if (anneesService < 2) {
                    return res.status(400).json({
                        success: false,
                        error: `Vous devez avoir au moins 2 ans de service pour effectuer une demande de cessation. Vous avez actuellement ${anneesService} année${anneesService > 1 ? 's' : ''} de service.`,
                        annees_service: anneesService,
                        date_prise_service: datePriseService
                    });
                }

                if (!agree_motif || agree_motif.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        error: 'Le motif de cessation est requis pour les certificats de cessation de service'
                    });
                }

                if (!agree_date_cessation) {
                    return res.status(400).json({
                        success: false,
                        error: 'La date de cessation est requise pour les certificats de cessation de service'
                    });
                }

                // Vérifier que la date de cessation est valide
                const dateCessation = new Date(agree_date_cessation);
                if (isNaN(dateCessation.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'La date de cessation fournie est invalide'
                    });
                }

                // Vérifier que la date de cessation n'est pas dans le passé (optionnel)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (dateCessation < today) {
                    return res.status(400).json({
                        success: false,
                        error: 'La date de cessation ne peut pas être dans le passé'
                    });
                }

                // Vérifier la longueur du motif
                if (agree_motif.length > 500) {
                    return res.status(400).json({
                        success: false,
                        error: 'Le motif de cessation ne peut pas dépasser 500 caractères'
                    });
                }

                console.log(`✅ Validation certificat cessation réussie - Motif: "${agree_motif}", Date: "${agree_date_cessation}"`);
            }

            // Vérifier si l'agent qui crée la demande est un chef de service via son rôle utilisateur
            const roleQuery = `
                SELECT r.nom as role_nom, u.username
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_agent]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom) || '';
            const username = (roleResult.rows[0] && roleResult.rows[0].username) || '';

            // Normaliser le nom du rôle (accents/espaces/tirets) pour éviter les non-détections
            // Exemples supportés: "Sous Directeur", "Sous-directeur", "Directeur central", etc.
            const roleNomNorm = (roleNom || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');

            const isAgentChefService = roleNomNorm === 'chef_service';
            const isAgentSousDirecteur = roleNomNorm === 'sous_directeur';
            const isAgentDirecteur = roleNomNorm === 'directeur';
            const isAgentDRH = roleNomNorm === 'drh';
            const isAgentDirCabinet = roleNomNorm === 'dir_cabinet';
            const isAgentChefCabinet = roleNomNorm === 'chef_cabinet';
            const isAgentDirecteurGeneral = roleNomNorm === 'directeur_general' || roleNomNorm === 'directeur_generale';
            const isAgentDirecteurCentral = roleNomNorm === 'directeur_central';
            const isAgentConseillerTechnique = roleNomNorm === 'conseiller_technique';
            const isAgentChargeDEtude = roleNomNorm === 'charge_d_etude';
            const isAgentChargeDeMission = roleNomNorm === 'charge_de_mission';
            const isAgentChefDuSecretariatParticulier = roleNomNorm === 'chef_du_secretariat_particulier';
            const isAgentInspecteurGeneral = roleNomNorm === 'inspecteur_general';
            const isAgentDirecteurServiceExterieur = roleNomNorm === 'directeur_service_exterieur';
            const isAgentGestionnairePatrimoine = roleNomNorm === 'gestionnaire_du_patrimoine';
            const isAgentPresidentFond = roleNomNorm === 'president_du_fond';
            const isAgentResponsableCellulePassation = roleNomNorm === 'responsble_cellule_de_passation';
            const isAgent = roleNomNorm === 'agent' || (!isAgentChefService && !isAgentSousDirecteur && !isAgentDirecteur && !isAgentDRH && !isAgentDirCabinet && !isAgentChefCabinet && !isAgentDirecteurGeneral && !isAgentDirecteurCentral && !isAgentConseillerTechnique && !isAgentChargeDEtude && !isAgentChargeDeMission && !isAgentChefDuSecretariatParticulier && !isAgentInspecteurGeneral && !isAgentDirecteurServiceExterieur && !isAgentGestionnairePatrimoine && !isAgentPresidentFond && !isAgentResponsableCellulePassation);

            if (type_demande === 'besoin_personnel') {
                if (isAgent) {
                    return res.status(403).json({
                        success: false,
                        error: 'Les agents simples ne sont pas autorisés à exprimer des besoins en personnel.'
                    });
                }
                if (!nombre_agents || parseInt(nombre_agents, 10) <= 0) {
                    return res.status(400).json({
                        success: false,
                        error: "Le nombre d'agents souhaités est requis et doit être supérieur à 0."
                    });
                }
                if (!poste_souhaite) {
                    return res.status(400).json({
                        success: false,
                        error: 'Le poste souhaité est requis.'
                    });
                }
            }

            console.log(`Agent créateur - Rôle: "${roleNom}", Username: "${username}"`);
            console.log(`Est agent: ${isAgent}`);
            console.log(`Est chef de service: ${isAgentChefService}`);
            console.log(`Est sous-directeur: ${isAgentSousDirecteur}`);
            console.log(`Est directeur: ${isAgentDirecteur}`);
            console.log(`Est DRH: ${isAgentDRH}`);
            console.log(`Est directeur de cabinet: ${isAgentDirCabinet}`);
            console.log(`Est chef_cabinet: ${isAgentChefCabinet}`);
            console.log(`Est directeur_general: ${isAgentDirecteurGeneral}`);
            console.log(`Est directeur_central: ${isAgentDirecteurCentral}`);

            // Déterminer le niveau initial selon le statut de l'agent et le type de demande
            let niveauInitial = 'soumis';

            // Récupérer Cabinet (DG), chef_cabinet et dir_cabinet du ministère pour les workflows Cabinet / Dir Cabinet
            let cabinetDgId = null;
            let chefCabinetAgentId = null;
            let dirCabinetAgentId = null;
            try {
                const cabinetDgResult = await db.query(
                    `SELECT id FROM direction_generale WHERE id_ministere = $1 AND (UPPER(libelle) LIKE '%CABINET%') LIMIT 1`,
                    [agent.id_ministere]
                );
                cabinetDgId = cabinetDgResult.rows[0] ? cabinetDgResult.rows[0].id : null;
                const chefDirResult = await db.query(`
                    SELECT (SELECT a.id FROM agents a JOIN utilisateurs u ON a.id = u.id_agent JOIN roles r ON u.id_role = r.id WHERE a.id_ministere = $1 AND LOWER(r.nom) = 'chef_cabinet' LIMIT 1) as chef_cabinet_id,
                           (SELECT a.id FROM agents a JOIN utilisateurs u ON a.id = u.id_agent JOIN roles r ON u.id_role = r.id WHERE a.id_ministere = $1 AND LOWER(r.nom) = 'dir_cabinet' LIMIT 1) as dir_cabinet_id
                `, [agent.id_ministere]);
                chefCabinetAgentId = chefDirResult.rows[0] ? chefDirResult.rows[0].chef_cabinet_id : null;
                dirCabinetAgentId = chefDirResult.rows[0] ? chefDirResult.rows[0].dir_cabinet_id : null;
            } catch (e) {
                console.warn('Erreur récupération Cabinet/chef_cabinet/dir_cabinet:', e.message);
            }

            let idValidateurChefCabinet = null;
            let idValidateurDirCabinet = null;
            let idValidateurDirecteurGeneral = null;
            let idValidateurDirecteurServiceExterieur = null;
            // Validateurs de la chaîne "classique" (utilisés aussi plus bas à l'insertion)
            let idValidateurSousDirecteur = null;
            let idValidateurDirecteur = null;

            const isAgentDuCabinet = cabinetDgId && (Number(agent.id_direction_generale) === Number(cabinetDgId) || Number(agent.id_direction_generale_direction) === Number(cabinetDgId));
            const directionSansDG = !agent.id_direction_generale_direction;
            const directionAvecDG = !!agent.id_direction_generale_direction && !!agent.directeur_general_id;

            // NOUVELLE HIÉRARCHIE selon les spécifications utilisateur
            // 1. dir_cabinet, chef_cabinet, conseiller_technique → Ministre puis DRH (finalisation)
            if (isAgentDirCabinet || isAgentChefCabinet || isAgentConseillerTechnique) {
                niveauInitial = 'valide_par_ministre';
                console.log(`Demande du ${roleNom} - Workflow: ${roleNom} → Ministre → DRH (finalisation)`);
            }
            // 2. charge_d_etude, charge_de_mission, chef_du_secretariat_particulier + agents directement sous DG Cabinet (sans direction) → Chef de cabinet puis DRH
            // Les agents en "direction centrale" (direction rattachée au CABINET) passent d'abord par leur directeur central, pas par le chef de cabinet.
            else if (isAgentChargeDEtude || isAgentChargeDeMission || isAgentChefDuSecretariatParticulier || (isAgent && isAgentDuCabinet && !agent.id_direction)) {
                niveauInitial = 'valide_par_chef_cabinet';
                idValidateurChefCabinet = chefCabinetAgentId;
                console.log(`Demande (${roleNom}${isAgentDuCabinet && !agent.id_direction ? ' / agent Cabinet (sans direction)' : ''}) - Workflow: → Chef de cabinet (ID: ${idValidateurChefCabinet}) → DRH`);
            }
            // 3. directeur_central, directeur_general, DRH, inspecteur_general, gestionnaire_du_patrimoine, president_du_fond, responsble_cellule_de_passation → Dir Cabinet puis DRH (finalisation)
            else if (isAgentDirecteurCentral || isAgentDirecteurGeneral || isAgentDRH || isAgentInspecteurGeneral || isAgentGestionnairePatrimoine || isAgentPresidentFond || isAgentResponsableCellulePassation) {
                niveauInitial = 'valide_par_dir_cabinet';
                idValidateurDirCabinet = dirCabinetAgentId;
                console.log(`Demande du ${roleNom} - Workflow: → Dir Cabinet (ID: ${idValidateurDirCabinet}) → DRH (finalisation)`);
            }
            // 4. Directeur (rôle) : si sa direction est rattachée à une DG → Directeur général ; sinon → Directeur des services extérieurs
            else if (isAgentDirecteur && !isAgentDirecteurServiceExterieur) {
                if (directionAvecDG) {
                    niveauInitial = 'valide_par_directeur_general';
                    idValidateurDirecteurGeneral = agent.directeur_general_id;
                    console.log('Demande du Directeur (direction rattachée à une DG) - Workflow: → Directeur général (ID: ' + idValidateurDirecteurGeneral + ') → DRH');
                } else {
                    niveauInitial = 'valide_par_directeur_service_exterieur';
                    try {
                        const dseResult = await db.query(
                            `SELECT a.id FROM agents a
                             JOIN utilisateurs u ON a.id = u.id_agent
                             JOIN roles r ON u.id_role = r.id
                             WHERE a.id_ministere = $1 AND LOWER(r.nom) = 'directeur_service_exterieur' LIMIT 1`,
                            [agent.id_ministere]
                        );
                        idValidateurDirecteurServiceExterieur = dseResult.rows[0] ? dseResult.rows[0].id : null;
                    } catch (e) {
                        console.warn('Erreur récupération DSE validateur:', e.message);
                    }
                    console.log('Demande du Directeur (direction non rattachée à une DG) - Workflow: → Directeur service extérieur (ID: ' + idValidateurDirecteurServiceExterieur + ') → DRH');
                }
            }
            // 5. Directeur service extérieur (direction avec DG) → Directeur général puis DRH
            else if (isAgentDirecteurServiceExterieur && directionAvecDG) {
                niveauInitial = 'valide_par_directeur_general';
                idValidateurDirecteurGeneral = agent.directeur_general_id;
                console.log('Demande du Directeur service extérieur (direction avec DG) - Workflow: → Directeur général (ID: ' + idValidateurDirecteurGeneral + ') → DRH');
            }
            // 6. Directeur service extérieur sans DG (cas rare / incohérence de données) → même logique que directeur avec DG si directeur_general_id dispo, sinon DRH
            else if (isAgentDirecteurServiceExterieur && directionSansDG) {
                niveauInitial = agent.directeur_general_id ? 'valide_par_directeur_general' : 'valide_par_drh';
                if (agent.directeur_general_id) {
                    idValidateurDirecteurGeneral = agent.directeur_general_id;
                    console.log('Demande du Directeur service extérieur (considéré comme avec DG) - Workflow: → Directeur général → DRH');
                } else {
                    console.log('Demande du Directeur service extérieur - Workflow: → DRH (finalisation, pas de DG trouvée)');
                }
            }
            // 8. Agent (hors Cabinet) → appliquer les 8 scénarios demandés
            else if (isAgent) {
                // Règle générale : si l'agent a une sous-direction, on commence toujours par le sous-directeur,
                // quelle que soit la direction (DRH, DSE, direction rattachée à une DG, etc.)
                if (agent.id_sous_direction && agent.sous_directeur_id) {
                    // Cas 2, 3, 7 : Agent dans une sous-direction
                    // - direction normale        → Sous-directeur → Directeur → DRH
                    // - sous-direction de la DRH → Sous-directeur → DRH
                    // - sous-direction de la DSE → Sous-directeur → DSE → DRH
                    niveauInitial = 'soumis';
                    console.log(`Demande d'agent - Workflow: Agent → Sous-directeur (ID: ${agent.sous_directeur_id}) → (Directeur / DRH / DSE) → DRH`);
                } else if (!agent.id_direction && agent.id_direction_generale) {
                    // Cas 4 : Agent rattaché uniquement à une Direction Générale (pas de direction)
                    // Si la DG a un inspecteur général : Agent → Inspecteur général → DRH
                    // Sinon si la DG a un directeur général : Agent → Directeur général → DRH
                    // Sinon : envoi direct au DRH
                    const idValidateurDG = agent.inspecteur_general_id || agent.directeur_general_id;
                    if (idValidateurDG) {
                        niveauInitial = 'valide_par_directeur_general';
                        idValidateurDirecteurGeneral = idValidateurDG;
                        const validateurType = agent.inspecteur_general_id ? 'Inspecteur général' : 'Directeur général';
                        console.log(`Demande d'agent - Agent rattaché directement à une DG → ${validateurType} (ID: ${idValidateurDirecteurGeneral}) → DRH`);
                    } else {
                        niveauInitial = 'valide_par_drh';
                        console.warn('Demande d\'agent - Agent rattaché à une DG mais aucun inspecteur général ni directeur général trouvé, envoi direct au DRH');
                    }
                } else if (agent.directeur_id) {
                    // Cas 1, 5, 6 : Agent rattaché directement à une direction (sans sous-direction)
                    // - direction de la DRH : Agent → Directeur (DRH) → DRH (finalisation)
                    // - direction rattachée à une DG : Agent → Directeur → DRH (le DG ne valide pas)
                    // - direction des services extérieurs : Agent → DSE (comme directeur) → DRH
                    const directeurEstDRH = agent.directeur_role_nom && agent.directeur_role_nom.toLowerCase() === 'drh';
                    if (directeurEstDRH) {
                        // Agent dans la direction de la DRH (sans sous-direction)
                        niveauInitial = 'valide_par_directeur';
                        console.log(`Demande d'agent - Agent direction DRH (sans sous-direction) → Directeur (DRH) → DRH (finalisation)`);
                    } else {
                        // Agent dans une autre direction : on commence toujours par le directeur,
                        // la distinction "direction simple / rattachée à une DG" sera gérée au moment
                        // de la validation du directeur (dans validerDemande).
                        niveauInitial = 'soumis';
                        console.log(`Demande d'agent - Agent direction directe → Directeur → (DSE ou DRH selon présence de DG)`);
                    }
                } else {
                    // Fallback : pas de directeur assigné → workflow par défaut via sous-directeur/DRH
                    niveauInitial = 'soumis';
                    console.log('Demande d\'agent - Pas de directeur assigné, workflow par défaut (→ DRH)');
                }
            }
            // 9. Sous-directeur → Directeur (ou Directeur central) → DRH
            // Règles:
            // - Si le directeur de la direction est le DRH → envoi direct DRH
            // - Envoi au DSE UNIQUEMENT si le "directeur" trouvé a le rôle directeur_service_exterieur
            // - Sinon (même si la direction est rattachée à une DG) → envoi au directeur (directeur / directeur_central / assimilé) de la direction puis DRH
            else if (isAgentSousDirecteur) {
                const directeurRoleNomNorm = (agent.directeur_role_nom || '')
                    .toLowerCase()
                    .trim()
                    .replace(/\s+/g, '_')
                    .replace(/é/g, 'e')
                    .replace(/è/g, 'e');
                const directeurEstDRH = directeurRoleNomNorm === 'drh';

                if (directeurEstDRH) {
                    // Envoi direct au DRH (directeur de la direction = DRH)
                    niveauInitial = 'valide_par_drh';
                    // Important: la visibilité DRH se fait sur niveau_actuel='drh' dans getDemandesEnAttente
                    // donc on force le niveau actuel initial à DRH.
                    console.log('Demande de sous-directeur - Workflow: Sous-directeur → DRH (directeur de la direction = DRH)');
                } else if (directeurRoleNomNorm === 'directeur_service_exterieur') {
                    // Directeur de la direction = DSE → DSE puis DRH
                    niveauInitial = 'valide_par_directeur_service_exterieur';
                    if (!idValidateurDirecteurServiceExterieur) {
                        try {
                            const dseResult = await db.query(
                                `SELECT a.id FROM agents a
                                 JOIN utilisateurs u ON a.id = u.id_agent
                                 JOIN roles r ON u.id_role = r.id
                                 WHERE a.id_ministere = $1 AND LOWER(r.nom) = 'directeur_service_exterieur' LIMIT 1`,
                                [agent.id_ministere]
                            );
                            idValidateurDirecteurServiceExterieur = dseResult.rows[0] ? dseResult.rows[0].id : null;
                        } catch (e) {
                            console.warn('Erreur récupération DSE validateur (sous-directeur):', e.message);
                        }
                    }
                    console.log(`Demande de sous-directeur - Workflow: Sous-directeur → Directeur service extérieur (ID: ${idValidateurDirecteurServiceExterieur || 'N/A'}) → DRH`);
                } else {
                    // Envoi au directeur (ou directeur_central / assimilé) de sa direction
                    niveauInitial = 'soumis';
                    idValidateurDirecteur = agent.directeur_id || null;
                    const cible = directeurRoleNomNorm === 'directeur_central' ? 'Directeur central' : 'Directeur';
                    console.log(`Demande de sous-directeur - Workflow: Sous-directeur → ${cible} (ID: ${idValidateurDirecteur || 'N/A'}) → DRH`);
                }
            }
            // Par défaut (chef de service, etc.)
            else {
                niveauInitial = 'soumis';
                console.log(`Demande du ${roleNom} - Workflow par défaut: → Sous-directeur`);
            }

            // Log du niveau initial après détermination
            console.log(`🎯 Niveau initial déterminé: "${niveauInitial}" (type: ${typeof niveauInitial})`);

            // Construire la description pour les certificats de cessation de service et mutations
            let descriptionFinale = description;
            if (type_demande === 'certificat_cessation' && motif_conge && nombre_jours) {
                descriptionFinale = `${motif_conge} - ${nombre_jours} jour(s)`;
                if (raison_exceptionnelle && motif_conge === 'congé exceptionnel') {
                    descriptionFinale += ` - Raison: ${raison_exceptionnelle}`;
                }
                // Utiliser aussi agree_motif pour compatibilité
                if (!agree_motif) {
                    agree_motif = motif_conge;
                }
            } else if (type_demande === 'mutation' && id_direction_destination) {
                const directionDestQuery = `SELECT libelle FROM directions WHERE id = $1`;
                const directionDestResult = await db.query(directionDestQuery, [id_direction_destination]);
                const directionDestName = directionDestResult.rows[0] ? directionDestResult.rows[0].libelle || 'Direction inconnue' : 'Direction inconnue';

                // Stocker les infos de mutation dans un format JSON dans description
                const mutationData = {
                    id_direction_destination: parseInt(id_direction_destination),
                    direction_destination: directionDestName,
                    date_effet: date_effet_mutation || new Date().toISOString().split('T')[0],
                    motif: motif_mutation || null
                };
                descriptionFinale = `MUTATION_DATA:${JSON.stringify(mutationData)}`;
            }

            // Déterminer l'ID du validateur pour les agents
            if (isAgent && agent.id_sous_direction && agent.sous_directeur_id) {
                // Agent dans une sous-direction → Assigner au sous-directeur
                if (idValidateurSousDirecteur == null) idValidateurSousDirecteur = agent.sous_directeur_id;
                console.log(`✅ Sous-directeur validateur assigné: ID ${idValidateurSousDirecteur} pour la sous-direction ${agent.sous_direction_libelle || agent.id_sous_direction}`);
            } else if (isAgent && !agent.id_sous_direction && agent.directeur_id) {
                // Agent directement lié à une direction → Assigner au directeur
                if (idValidateurDirecteur == null) idValidateurDirecteur = agent.directeur_id;
                console.log(`✅ Directeur validateur assigné: ID ${idValidateurDirecteur} (Rôle: ${agent.directeur_role_nom || 'directeur'})`);
            }

            // niveau_actuel = qui doit agir maintenant (chef_cabinet, directeur_general, etc.)
            let niveauActuelInitial = null;
            if (niveauInitial === 'valide_par_chef_cabinet') niveauActuelInitial = 'chef_cabinet';
            else if (niveauInitial === 'valide_par_directeur_general') niveauActuelInitial = 'directeur_general';
            else if (niveauInitial === 'valide_par_directeur_service_exterieur') niveauActuelInitial = 'directeur_service_exterieur';
            else if (niveauInitial === 'valide_par_dir_cabinet') niveauActuelInitial = 'dir_cabinet';
            else if (niveauInitial === 'valide_par_drh') niveauActuelInitial = 'drh';
            else if (niveauInitial === 'soumis') {
                // 'soumis' = demande déposée, mais le "niveau_actuel" doit pointer vers le prochain acteur.
                // - Si le demandeur est un sous-directeur, la demande doit aller au directeur (ou DRH si directeur=DRH, géré plus haut).
                // - Sinon (agent), la demande est en attente du sous-directeur.
                if (isAgentSousDirecteur) {
                    const directeurRoleNomNorm = (agent.directeur_role_nom || '')
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, '_')
                        .replace(/é/g, 'e')
                        .replace(/è/g, 'e');
                    niveauActuelInitial = directeurRoleNomNorm === 'directeur_central' ? 'directeur_central' : 'directeur';
                } else {
                    niveauActuelInitial = 'sous_directeur';
                }
            }

            // Insérer la demande
            const insertQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, date_debut, date_fin, 
                    lieu, priorite, documents_joints, created_by, niveau_evolution_demande, niveau_actuel, status,
                    agree_motif, agree_date_cessation,
                    motif_conge, nombre_jours, raison_exceptionnelle, jours_restants_apres_deduction,
                    id_validateur_sous_directeur, id_validateur_directeur,
                    id_validateur_chef_cabinet, id_validateur_dir_cabinet, id_validateur_directeur_general,
                    id_validateur_directeur_service_exterieur,
                    date_reprise_service, date_fin_conges, annee_non_jouissance_conge, annee_au_titre_conge,
                    nombre_agents, poste_souhaite, agents_satisfaits
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
                RETURNING id
            `;

            // Pour les mutations, on stocke les infos supplémentaires dans description ou dans une table annexe si nécessaire
            // Pour l'instant, on utilise description pour stocker les infos de mutation

            let transactionClient = null;
            let insertClient = db;
            let deductionResult = null;
            let insertResult = null;
            let demande = null;

            try {
                // NOTE: La déduction des jours de congés pour les certificats de cessation
                // sera effectuée uniquement lors de la validation/approbation de la demande
                // et non lors de la création. Si la demande est rejetée, les jours restent intacts.
                if (type_demande === 'certificat_cessation' && motif_conge && nombre_jours) {
                    // Pas de déduction lors de la création - seulement lors de l'approbation
                    deductionResult = null;
                }

                // Pour les mutations, utiliser date_debut pour stocker date_effet_mutation
                let dateDebutFinale = date_debut;
                if (type_demande === 'mutation' && date_effet_mutation) {
                    dateDebutFinale = date_effet_mutation;
                }

                insertResult = await insertClient.query(insertQuery, [
                    id_agent,
                    type_demande,
                    descriptionFinale && descriptionFinale.trim() !== '' ? descriptionFinale : null,
                    dateDebutFinale && dateDebutFinale.trim() !== '' ? dateDebutFinale : null,
                    date_fin && date_fin.trim() !== '' ? date_fin : null,
                    lieu && lieu.trim() !== '' ? lieu : null,
                    priorite,
                    JSON.stringify(documents_joints || []),
                    req.user.id,
                    niveauInitial,
                    niveauActuelInitial,
                    'en_attente',
                    agree_motif && agree_motif.trim() !== '' ? agree_motif : null,
                    agree_date_cessation && agree_date_cessation.trim() !== '' ? agree_date_cessation : null,
                    motif_conge && motif_conge.trim() !== '' ? motif_conge : null,
                    nombre_jours ? parseInt(nombre_jours, 10) : null,
                    raison_exceptionnelle && raison_exceptionnelle.trim() !== '' ? raison_exceptionnelle : null,
                    deductionResult ? deductionResult.joursRestantsApresDeduction : null,
                    idValidateurSousDirecteur,
                    idValidateurDirecteur,
                    idValidateurChefCabinet,
                    idValidateurDirCabinet,
                    idValidateurDirecteurGeneral,
                    idValidateurDirecteurServiceExterieur,
                    date_reprise_service && date_reprise_service.trim() !== '' ? date_reprise_service : null,
                    date_fin_conges && date_fin_conges.trim() !== '' ? date_fin_conges : null,
                    annee_non_jouissance_conge ? parseInt(annee_non_jouissance_conge, 10) : null,
                    annee_au_titre_conge ? parseInt(annee_au_titre_conge, 10) : null,
                    nombre_agents ? parseInt(nombre_agents, 10) : null,
                    poste_souhaite && poste_souhaite.trim() !== '' ? poste_souhaite : null,
                    0
                ]);

                if (transactionClient) {
                    await transactionClient.query('COMMIT');
                    transactionClient.release();
                }

                // Récupérer la demande créée avec les informations de l'agent
                const demandeQuery = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    WHERE d.id = $1
                `;

                const demandeResult = await db.query(demandeQuery, [insertResult.rows[0].id]);
                const demande = demandeResult.rows[0];

            } catch (transactionError) {
                // En cas d'erreur, annuler la transaction si elle existe
                if (transactionClient) {
                    try {
                        await transactionClient.query('ROLLBACK');
                        transactionClient.release();
                    } catch (rollbackError) {
                        console.error('Erreur lors du rollback:', rollbackError);
                    }
                }
                throw transactionError; // Re-lancer l'erreur pour qu'elle soit gérée par le catch externe
            }

            // Si c'est une demande d'absence, d'attestation de présence ou de sortie du territoire, créer une notification détaillée pour le sous-directeur
            if (type_demande === 'absence' || type_demande === 'attestation_presence' || type_demande === 'sortie_territoire') {
                try {
                    // Récupérer les informations complètes de l'agent
                    const agentQuery = `
                        SELECT a.*, s.libelle as service_nom, m.nom as ministere_nom,
                               ech_actuelle.echelon_libelle as echelon_libelle
                        FROM agents a
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        LEFT JOIN (
                            SELECT DISTINCT ON (ea.id_agent)
                                ea.id_agent,
                                e.libele AS echelon_libelle
                            FROM echelons_agents ea
                            LEFT JOIN echelons e ON ea.id_echelon = e.id
                            ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                        ) ech_actuelle ON a.id = ech_actuelle.id_agent
                        WHERE a.id = $1
                    `;
                    const agentResult = await db.query(agentQuery, [id_agent]);
                    const agent = agentResult.rows[0];

                    // Générer le texte de notification détaillé selon le type de demande
                    let texteNotification;
                    let typeNotification;
                    let titreNotification;

                    if (type_demande === 'absence') {
                        texteNotification = genererTexteNotificationAbsence(demande, agent);
                        typeNotification = 'nouvelle_demande_absence';
                        titreNotification = `Demande d'absence - ${agent.prenom} ${agent.nom}`;
                    } else if (type_demande === 'attestation_presence') {
                        texteNotification = genererTexteNotificationAttestationPresence(demande, agent, { prenom: 'Chef', nom: 'Service' }, 'chef_service');
                        typeNotification = 'nouvelle_demande_attestation';
                        titreNotification = `Demande d'attestation de présence - ${agent.prenom} ${agent.nom}`;
                    } else if (type_demande === 'sortie_territoire') {
                        // Générer le texte de notification pour les demandes de sortie du territoire
                        texteNotification = genererTexteNotificationSortieTerritoire(demande, agent);
                        typeNotification = 'nouvelle_demande_sortie_territoire';
                        titreNotification = `Demande de sortie du territoire - ${agent.prenom} ${agent.nom}`;
                    }

                    // Créer une notification détaillée pour le chef de service
                    const notificationQuery = `
                        INSERT INTO notifications_demandes (
                            id_demande, 
                            id_agent_destinataire, 
                            type_notification, 
                            titre, 
                            message
                        ) VALUES ($1, $2, $3, $4, $5)
                    `;

                    // Récupérer l'ID du chef de service (sera assigné par le trigger)
                    const chefServiceQuery = `
                        SELECT id_chef_service FROM demandes WHERE id = $1
                    `;
                    const chefServiceResult = await db.query(chefServiceQuery, [insertResult.rows[0].id]);

                    if (chefServiceResult.rows[0] && chefServiceResult.rows[0].id_chef_service) {
                        await db.query(notificationQuery, [
                            insertResult.rows[0].id,
                            chefServiceResult.rows[0].id_chef_service,
                            typeNotification,
                            titreNotification,
                            texteNotification
                        ]);
                    }
                } catch (notificationError) {
                    console.error('Erreur lors de la création de la notification détaillée:', notificationError);
                    // Ne pas faire échouer la création de la demande si la notification échoue
                }
            }

            // Si c'est une demande de chef de service, créer une notification pour le DRH
            if (isAgentChefService) {
                try {
                    // Récupérer les DRH du même ministère via leurs rôles
                    const drhQuery = `
                        SELECT a.id, a.prenom, a.nom, a.email
                        FROM agents a
                        LEFT JOIN utilisateurs u ON a.id = u.id_agent
                        LEFT JOIN roles r ON u.id_role = r.id
                        WHERE a.id_ministere = $1
                        AND LOWER(r.nom) = 'drh'
                    `;

                    const drhResult = await db.query(drhQuery, [agent.id_ministere]);

                    if (drhResult.rows.length > 0) {
                        // Créer une notification pour chaque DRH
                        for (const drh of drhResult.rows) {
                            const notificationQuery = `
                                INSERT INTO notifications (
                                    id_agent, titre, message, type, statut, date_creation
                                ) VALUES ($1, $2, $3, $4, $5, NOW())
                            `;

                            await db.query(notificationQuery, [
                                drh.id,
                                'Nouvelle demande de chef de service',
                                `Le chef de service ${agent.prenom} ${agent.nom} (${agent.matricule}) a soumis une demande de ${type_demande} qui nécessite votre validation.`,
                                'demande_validation',
                                'non_lue'
                            ]);

                            console.log(`Notification créée pour DRH: ${drh.prenom} ${drh.nom} (${drh.email})`);
                        }
                    }
                } catch (notificationError) {
                    console.error('Erreur lors de la création de la notification DRH:', notificationError);
                    // Ne pas faire échouer la création de demande si la notification échoue
                }
            }

            // Pour les demandes d'absence (ancien système avec dates), vérifier que l'agent a assez de jours de congés restants
            if (type_demande === 'absence' && date_debut && date_fin) {
                try {
                    const anneeCourante = new Date(date_debut).getFullYear();

                    // S'assurer que les congés de l'agent existent pour l'année
                    await CongesController.createOrUpdateConges(id_agent, anneeCourante);

                    // Calculer les jours ouvrés entre date_debut et date_fin
                    const joursOuvres = await CongesController.calculerJoursOuvres(date_debut, date_fin);
                    console.log(`📅 Jours ouvrés calculés pour la demande d'absence: ${joursOuvres} jours`);
                    console.log(`   Période: ${date_debut} au ${date_fin}`);

                    // Vérifier que l'agent a assez de jours restants
                    const pool = require('../config/database');
                    const congesQuery = `
                        SELECT jours_alloues, jours_pris, jours_restants 
                        FROM agent_conges
                        WHERE id_agent = $1 AND annee = $2
                    `;
                    const congesResult = await pool.query(congesQuery, [id_agent, anneeCourante]);

                    if (congesResult.rows.length > 0) {
                        const conges = congesResult.rows[0];
                        const joursRestants = conges.jours_restants;

                        if (joursOuvres > joursRestants) {
                            return res.status(400).json({
                                success: false,
                                error: `Vous n'avez pas assez de jours de congés restants pour cette demande.`,
                                details: {
                                    jours_demandes: joursOuvres,
                                    jours_restants: joursRestants,
                                    jours_alloues: conges.jours_alloues,
                                    jours_pris: conges.jours_pris,
                                    message: `Vous avez ${joursRestants} jour(s) de congé(s) restant(s) sur ${conges.jours_alloues} jour(s) alloué(s) pour l'année ${anneeCourante}. Vous ne pouvez pas demander ${joursOuvres} jour(s).`
                                }
                            });
                        }

                        console.log(`✅ Validation des jours de congés: ${joursOuvres} jours demandés, ${joursRestants} jours restants disponibles`);
                    } else {
                        console.warn(`⚠️ Aucun enregistrement de congés trouvé pour l'agent ${id_agent} pour l'année ${anneeCourante}`);
                    }
                } catch (congesError) {
                    console.error('❌ Erreur lors de la vérification des jours de congés:', congesError);
                    // Si c'est une erreur de validation (jours insuffisants), on l'a déjà retournée
                    // Sinon, on continue quand même la création de la demande
                    if (congesError.message && congesError.message.includes('pas assez')) {
                        throw congesError; // Re-lancer l'erreur de validation
                    }
                }
            }

            // Pour les certificats de cessation de service, vérifier les jours de congés selon le type de congé
            if (type_demande === 'certificat_cessation' && motif_conge && nombre_jours) {
                try {
                    // Validation des champs obligatoires
                    if (!motif_conge) {
                        return res.status(400).json({
                            success: false,
                            error: 'Le motif de congé est requis pour les cessations de service'
                        });
                    }

                    if (!nombre_jours || parseInt(nombre_jours) < 5) {
                        return res.status(400).json({
                            success: false,
                            error: 'Le nombre minimum de jours pour une cessation de service est de 5 jours'
                        });
                    }

                    const joursDemandes = parseInt(nombre_jours, 10);
                    // IMPORTANT:
                    // Pour la cessation, la validation des jours doit se faire sur l'année choisie
                    // par l'utilisateur (annee_au_titre_conge), pas sur l'année de la date de cessation.
                    const anneeChoisie = annee_au_titre_conge != null && String(annee_au_titre_conge).trim() !== ''
                        ? parseInt(annee_au_titre_conge, 10)
                        : (agree_date_cessation ? new Date(agree_date_cessation).getFullYear() : new Date().getFullYear());
                    const anneeCourante = Number.isNaN(anneeChoisie)
                        ? (agree_date_cessation ? new Date(agree_date_cessation).getFullYear() : new Date().getFullYear())
                        : anneeChoisie;

                    // S'assurer que les congés de l'agent existent pour l'année
                    await CongesController.createOrUpdateConges(id_agent, anneeCourante);

                    // Récupérer les jours restants de l'agent
                    const pool = require('../config/database');
                    const congesQuery = `
                        SELECT jours_alloues, jours_pris, jours_restants 
                        FROM agent_conges
                        WHERE id_agent = $1 AND annee = $2
                    `;
                    const congesResult = await pool.query(congesQuery, [id_agent, anneeCourante]);

                    if (congesResult.rows.length > 0) {
                        const conges = congesResult.rows[0];
                        const joursRestants = conges.jours_restants;

                        // Validation selon le type de congé
                        if (motif_conge === 'congé exceptionnel') {
                            // Pour les congés exceptionnels, la raison est obligatoire
                            if (!raison_exceptionnelle || raison_exceptionnelle.trim() === '') {
                                return res.status(400).json({
                                    success: false,
                                    error: 'La raison du congé exceptionnel est requise'
                                });
                            }

                            // Les congés exceptionnels peuvent dépasser les jours restants
                            // Le solde négatif sera reporté sur l'année suivante
                            console.log(`✅ Congé exceptionnel: ${joursDemandes} jours demandés, ${joursRestants} jours restants`);
                            console.log(`   Raison: ${raison_exceptionnelle}`);
                            if (joursDemandes > joursRestants) {
                                const soldeNegatif = joursDemandes - joursRestants;
                                console.log(`   ⚠️ Solde négatif: ${soldeNegatif} jours seront reportés sur l'année suivante`);
                            }
                        } else {
                            // Pour les congés normaux (annuel, paternité, maternité, partiel), vérifier les jours restants
                            if (joursDemandes > joursRestants) {
                                return res.status(400).json({
                                    success: false,
                                    error: `Vous n'avez pas assez de jours de congés restants pour cette demande.`,
                                    details: {
                                        jours_demandes: joursDemandes,
                                        jours_restants: joursRestants,
                                        jours_alloues: conges.jours_alloues,
                                        jours_pris: conges.jours_pris,
                                        motif_conge: motif_conge,
                                        message: `Vous avez ${joursRestants} jour(s) de congé(s) restant(s) sur ${conges.jours_alloues} jour(s) alloué(s) pour l'année ${anneeCourante}. Vous ne pouvez pas demander ${joursDemandes} jour(s) pour un ${motif_conge}.`
                                    }
                                });
                            }

                            console.log(`✅ Validation des jours de congés: ${joursDemandes} jours demandés (${motif_conge}), ${joursRestants} jours restants disponibles`);
                        }
                    } else {
                        console.warn(`⚠️ Aucun enregistrement de congés trouvé pour l'agent ${id_agent} pour l'année ${anneeCourante}`);
                    }
                } catch (congesError) {
                    console.error('❌ Erreur lors de la vérification des jours de congés:', congesError);
                    // Si c'est une erreur de validation (jours insuffisants), on l'a déjà retournée
                    // Sinon, on continue quand même la création de la demande
                    if (congesError.message && congesError.message.includes('pas assez')) {
                        throw congesError; // Re-lancer l'erreur de validation
                    }
                }
            }

            res.status(201).json({
                success: true,
                message: isAgentChefService ?
                    'Demande créée avec succès et transmise directement au DRH' : 'Demande créée avec succès',
                data: demande
            });

        } catch (error) {
            console.error('❌ ERREUR lors de la création de la demande:');
            console.error('Message d\'erreur:', error.message);
            console.error('Stack trace:', error.stack);
            console.error('Données reçues:', JSON.stringify(req.body, null, 2));
            console.error('Headers:', JSON.stringify(req.headers, null, 2));
            console.error('User:', req.user ? JSON.stringify(req.user, null, 2) : 'Non authentifié');

            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer les demandes d'un agent
    static async getDemandesByAgent(req, res) {
        try {
            const { id_agent } = req.params;
            const { status, type_demande, date_debut, date_fin, page = 1, limit = 10 } = req.query;
            const dateOutputTimeZone = process.env.APP_TIMEZONE || 'Africa/Libreville';
            const toLocalDateOnlyStr = (value) => {
                if (!value) return null;
                if (typeof value === 'string') {
                    const raw = value.trim();
                    if (!raw) return null;
                    // Si c'est une date pure (sans heure), renvoyer telle quelle.
                    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
                    if (dateOnly) return dateOnly[1];
                    const parsed = new Date(raw);
                    if (Number.isNaN(parsed.getTime())) return null;
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: dateOutputTimeZone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }).format(parsed);
                }
                const d = value instanceof Date ? value : new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return new Intl.DateTimeFormat('en-CA', {
                    timeZone: dateOutputTimeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(d);
            };

            let query = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       cs.prenom as chef_service_prenom, cs.nom as chef_service_nom,
                       drh.prenom as drh_prenom, drh.nom as drh_nom,
                       dir.prenom as directeur_prenom, dir.nom as directeur_nom,
                       min.prenom as ministre_prenom, min.nom as ministre_nom,
                       sd.prenom as sous_directeur_prenom, sd.nom as sous_directeur_nom,
                       d.commentaire_sous_directeur, d.commentaire_directeur, d.commentaire_drh,
                       d.commentaire_dir_cabinet, d.commentaire_ministre,
                       d.statut_sous_directeur, d.statut_directeur, d.statut_drh,
                       d.statut_dir_cabinet, d.statut_ministre
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN agents cs ON d.id_chef_service = cs.id
                LEFT JOIN agents drh ON d.id_drh = drh.id
                LEFT JOIN agents dir ON d.id_directeur = dir.id
                LEFT JOIN agents min ON d.id_ministre = min.id
                LEFT JOIN agents sd ON d.id_validateur_sous_directeur = sd.id
                WHERE d.id_agent = $1
            `;

            const params = [id_agent];
            let paramCount = 1;

            if (status) {
                paramCount++;
                query += ` AND d.status = $${paramCount}`;
                params.push(status);
            }

            if (type_demande) {
                paramCount++;
                query += ` AND d.type_demande = $${paramCount}`;
                params.push(type_demande);
            }

            if (date_debut) {
                paramCount++;
                query += ` AND d.date_creation >= $${paramCount}`;
                params.push(date_debut);
            }

            if (date_fin) {
                paramCount++;
                // Inclure toute la journée de fin
                query += ` AND d.date_creation <= $${paramCount}::date + INTERVAL '1 day' - INTERVAL '1 second'`;
                params.push(date_fin);
            }

            query += ` ORDER BY d.date_creation DESC`;

            // Pagination
            const offset = (page - 1) * limit;
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(limit);

            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);

            const result = await db.query(query, params);
            const data = (result.rows || []).map((row) => ({
                ...row,
                // Champs de "date métier" renvoyés en YYYY-MM-DD pour éviter les décalages timezone.
                date_debut: toLocalDateOnlyStr(row.date_debut),
                date_fin: toLocalDateOnlyStr(row.date_fin),
                agree_date_cessation: toLocalDateOnlyStr(row.agree_date_cessation),
                date_reprise_service: toLocalDateOnlyStr(row.date_reprise_service),
                date_fin_conges: toLocalDateOnlyStr(row.date_fin_conges),
                date_cessation: toLocalDateOnlyStr(row.date_cessation)
            }));

            res.json({
                success: true,
                data,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: data.length
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des demandes:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les demandes en attente de validation
    static async getDemandesEnAttente(req, res) {
        try {
            const { id_validateur } = req.params;
            const { type_demande, agent_search, service_id, niveau_actuel, priorite, statut, page = 1, limit = 10 } = req.query;

            // Variable pour stocker les informations de debug (accessible dans tout le scope)
            let debugInfo = null;

            // D'abord, récupérer les informations du validateur pour déterminer son rôle et son service
            const validateurQuery = `
                SELECT a.id, a.id_direction, a.id_ministere, a.fonction_actuelle, a.id_direction_generale
                FROM agents a
                WHERE a.id = $1
            `;

            const validateurResult = await db.query(validateurQuery, [id_validateur]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const validateur = validateurResult.rows[0];

            // Récupérer le rôle de l'utilisateur pour déterminer son niveau d'autorisation
            const roleQuery = `
                SELECT r.nom as role_nom, u.username
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_validateur]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom) || '';
            const username = (roleResult.rows[0] && roleResult.rows[0].username) || '';

            console.log(`Rôle utilisateur: "${roleNom}"`);
            console.log(`Rôle utilisateur (lowercase): "${roleNom.toLowerCase()}"`);
            console.log(`Username: "${username}"`);

            const roleNomNorm = (roleNom || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
            const isChefService = roleNomNorm === 'chef_service';
            const isSousDirecteur = roleNomNorm === 'sous_directeur';
            const isDirecteur = roleNomNorm === 'directeur';
            const isDirCabinet = roleNomNorm === 'dir_cabinet';
            const isChefCabinet = roleNomNorm === 'chef_cabinet';
            const isDirecteurGeneral = roleNomNorm === 'directeur_general' || roleNomNorm === 'directeur_generale';
            const isDirecteurCentral = roleNomNorm === 'directeur_central';
            const isInspecteurGeneral = roleNomNorm === 'inspecteur_general';
            const isDRH = roleNomNorm === 'drh';
            const isMinistre = roleNomNorm === 'ministre';
            const isSuperAdmin = roleNomNorm === 'super_admin';
            const isDirecteurServiceExterieur = roleNomNorm === 'directeur_service_exterieur';
            const isGestionnairePatrimoine = roleNomNorm === 'gestionnaire_du_patrimoine';
            const isPresidentFond = roleNomNorm === 'president_du_fond';
            const isResponsableCellulePassation = roleNomNorm === 'responsble_cellule_de_passation';

            console.log(`🔍 isDRH détecté: ${isDRH}`);
            console.log(`🔍 Comparaison: "${roleNom.toLowerCase()}" === "drh" = ${roleNom.toLowerCase() === 'drh'}`);

            console.log(`Validateur ID: ${id_validateur}, Rôle: "${roleNom}"`);
            console.log(`Rôles détectés - Chef: ${isChefService}, Sous-Dir: ${isSousDirecteur}, Directeur: ${isDirecteur}, Dir Cabinet: ${isDirCabinet}, DRH: ${isDRH}, Ministre: ${isMinistre}, Super Admin: ${isSuperAdmin}`);

            let query = '';
            let params = [];

            if (isChefService) {
                // Le chef de service n'intervient plus dans le workflow
                // Retourner une liste vide car les demandes vont directement au sous-directeur
                console.log(`⚠️ Chef de service détecté - Le chef de service n'intervient plus dans le workflow`);
                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           ech_actuelle.echelon_libelle as echelon_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    LEFT JOIN (
                        SELECT DISTINCT ON (ea.id_agent)
                            ea.id_agent,
                            e.libele AS echelon_libelle
                        FROM echelons_agents ea
                        LEFT JOIN echelons e ON ea.id_echelon = e.id
                        ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                    ) ech_actuelle ON a.id = ech_actuelle.id_agent
                    WHERE d.status = 'en_attente' 
                    AND 1 = 0  -- Retourner toujours une liste vide car le chef de service n'intervient plus
                    ORDER BY d.date_creation ASC
                `;
                params = [];

                console.log(`Requête chef de service (demandes nécessitant sa validation): ${query}`);
                console.log(`Paramètres: ${JSON.stringify(params)}`);

                // Debug: Vérifier s'il y a des demandes dans le service
                const debugQuery = `
                    SELECT COUNT(*) as total_demandes, 
                           COUNT(CASE WHEN d.status = 'en_attente' THEN 1 END) as demandes_attente,
                           COUNT(CASE WHEN d.niveau_evolution_demande = 'soumis' THEN 1 END) as demandes_soumises,
                           COUNT(CASE WHEN d.phase IS NULL THEN 1 END) as demandes_phase_null
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    WHERE a.id_direction = $1 AND a.id_ministere = $2
                `;
                const debugResult = await db.query(debugQuery, [validateur.id_direction, validateur.id_ministere]);
                console.log(`Debug - Total demandes dans le service: ${JSON.stringify(debugResult.rows[0])}`);
            } else if (isDRH) {
                console.log('🔍 ✅ DRH détecté - Entrée dans le bloc isDRH');
                // DRH : voir toutes les demandes en attente dont le niveau actuel est DRH
                // (peu importe comment elles sont arrivées : directeur, DSE, sous-directeur, etc.)
                // Exclure uniquement les demandes déjà finalisées ou en attente à un autre niveau.
                let whereConditions = [
                    "d.status = 'en_attente'",
                    "d.niveau_actuel = 'drh'",
                    "a.id_ministere = $1",
                    "d.id_agent != $2"
                ];

                // Note: Les demandes valide_par_directeur peuvent avoir été validées par un sous-directeur de la direction de la DRH
                // On les inclut déjà dans la condition ci-dessus, mais on doit vérifier que le sous-directeur est dans la direction de la DRH
                // Cette vérification se fera dans la condition sousDirecteurCondition
                // Paramètres de base : ministère du validateur + éviter de lui montrer ses propres demandes
                params = [validateur.id_ministere, id_validateur];
                // Prochain paramètre utilisable dans les filtres optionnels
                let paramIndex = 3;
                console.log(`🔍 DRH - id_direction du validateur: ${validateur.id_direction}`);

                // Filtre par recherche d'agent (nom, prénom ou matricule)
                if (agent_search) {
                    whereConditions.push(`(LOWER(a.prenom) LIKE LOWER($${paramIndex}) OR LOWER(a.nom) LIKE LOWER($${paramIndex}) OR LOWER(a.matricule) LIKE LOWER($${paramIndex}))`);
                    params.push(`%${agent_search}%`);
                    paramIndex++;
                }

                // Filtre par service
                if (service_id) {
                    whereConditions.push(`a.id_direction = $${paramIndex}`);
                    params.push(service_id);
                    paramIndex++;
                }

                // Filtre par type de demande
                if (type_demande) {
                    whereConditions.push(`d.type_demande = $${paramIndex}`);
                    params.push(type_demande);
                    paramIndex++;
                }

                // Filtre par niveau d'évolution
                if (niveau_actuel) {
                    whereConditions.push(`d.niveau_evolution_demande = $${paramIndex}`);
                    params.push(niveau_actuel);
                    paramIndex++;
                }

                // Filtre par priorité
                if (priorite) {
                    whereConditions.push(`d.priorite = $${paramIndex}`);
                    params.push(priorite);
                    paramIndex++;
                }

                // Pour simplifier et garantir la visibilité, on n'applique plus de filtre complexe
                // basé sur les sous-directeurs : toute demande au niveau_actuel='drh' est visible.
                let sousDirecteurCondition = '';

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           e.libele as echelon_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    LEFT JOIN echelons e ON a.id_echelon = e.id
                    WHERE ${whereConditions.join(' AND ')}
                    ${sousDirecteurCondition}
                    ORDER BY d.date_creation ASC
                `;

                // Préparer les informations de debug pour la réponse
                debugInfo = {
                    drhId: id_validateur,
                    isDRH: isDRH,
                    roleNom: roleNom,
                    roleNomLowercase: roleNom.toLowerCase(),
                    validateurIdDirection: validateur.id_direction,
                    params: params,
                    whereConditions: whereConditions
                };

                console.log('🔍 DRH détecté - Recherche des demandes à valider');
                console.log(`🔍 DRH ID: ${id_validateur}`);
                console.log(`🔍 Condition sousDirecteurCondition:`, sousDirecteurCondition.substring(0, 200) + '...');
                console.log(`🔍 Requête SQL complète:`, query);
                console.log(`🔍 Paramètres de la requête:`, JSON.stringify(params, null, 2));
                console.log(`🔍 Conditions de recherche: status='en_attente', (niveau_actuel='drh' OR niveau_evolution_demande IN ('valide_par_sous_directeur', 'valide_par_directeur', 'valide_par_superieur', 'retour_ministre')), id_ministere=${validateur.id_ministere}`);

                // Debug spécifique pour les demandes valide_par_sous_directeur
                // (désactivé pour simplifier; l'ancien debug utilisait drhDirectionId)
                if (false) {
                    const debugSousDirQuery = `
                        SELECT d.id, d.type_demande, d.status, d.niveau_evolution_demande, 
                               d.id_validateur_sous_directeur,
                               a.id as agent_id, a.id_sous_direction, a.id_direction,
                               sous_dir_agent.id as sous_dir_id, 
                               sous_dir_agent.id_direction as sous_dir_direction_id,
                               sous_dir_agent.id_sous_direction as sous_dir_sous_direction_id,
                               sd.id_direction as sous_dir_table_direction_id
                        FROM demandes d
                        LEFT JOIN agents a ON d.id_agent = a.id
                        LEFT JOIN agents sous_dir_agent ON (
                            sous_dir_agent.id = d.id_validateur_sous_directeur 
                            OR (sous_dir_agent.id_sous_direction = a.id_sous_direction AND sous_dir_agent.id_direction = a.id_direction)
                        )
                        LEFT JOIN sous_directions sd ON sous_dir_agent.id_sous_direction = sd.id
                        WHERE d.status = 'en_attente'
                        AND d.niveau_evolution_demande = 'valide_par_sous_directeur'
                        AND a.id_ministere = $1
                        AND a.id != $2
                        ORDER BY d.date_creation DESC
                        LIMIT 10
                    `;
                    const debugSousDirResult = await db.query(debugSousDirQuery, [validateur.id_ministere, id_validateur]);
                    console.log(`🔍 Debug - Demandes valide_par_sous_directeur dans le ministère:`, debugSousDirResult.rows);
                    console.log(`🔍 Nombre de demandes valide_par_sous_directeur: ${debugSousDirResult.rows.length}`);

                    // Vérifier lesquelles sont dans la direction de la DRH
                    if (debugSousDirResult.rows.length > 0) {
                        console.log(`🔍 Analyse des demandes valide_par_sous_directeur:`);
                        debugSousDirResult.rows.forEach((row, index) => {
                            const isInDRHDirection =
                                row.sous_dir_direction_id === drhDirectionId ||
                                row.sous_dir_table_direction_id === drhDirectionId;
                            console.log(`  ${index + 1}. Demande ID: ${row.id}, Sous-dir ID: ${row.sous_dir_id}, Sous-dir direction: ${row.sous_dir_direction_id}, Sous-dir table direction: ${row.sous_dir_table_direction_id}, Dans direction DRH: ${isInDRHDirection}`);
                        });
                    }

                    // Vérifier lesquelles sont dans la direction de la DRH
                    const debugSousDirDRHQuery = `
                        SELECT d.id, d.type_demande, d.status, d.niveau_evolution_demande, 
                               d.id_validateur_sous_directeur,
                               a.id as agent_id, a.id_sous_direction, a.id_direction,
                               sous_dir_agent.id as sous_dir_id, 
                               sous_dir_agent.id_direction as sous_dir_direction_id,
                               sous_dir_agent.id_sous_direction as sous_dir_sous_direction_id,
                               sd.id_direction as sous_dir_table_direction_id
                        FROM demandes d
                        LEFT JOIN agents a ON d.id_agent = a.id
                        LEFT JOIN agents sous_dir_agent ON (
                            sous_dir_agent.id = d.id_validateur_sous_directeur 
                            OR (sous_dir_agent.id_sous_direction = a.id_sous_direction AND sous_dir_agent.id_direction = a.id_direction)
                        )
                        LEFT JOIN utilisateurs sous_dir_user ON sous_dir_agent.id = sous_dir_user.id_agent
                        LEFT JOIN roles sous_dir_role ON sous_dir_user.id_role = sous_dir_role.id
                        LEFT JOIN sous_directions sd ON sous_dir_agent.id_sous_direction = sd.id
                        WHERE d.status = 'en_attente'
                        AND d.niveau_evolution_demande = 'valide_par_sous_directeur'
                        AND a.id_ministere = $1
                        AND a.id != $2
                        AND LOWER(sous_dir_role.nom) = 'sous_directeur'
                        AND (
                            sous_dir_agent.id_direction = $3
                            OR sd.id_direction = $3
                        )
                        ORDER BY d.date_creation DESC
                        LIMIT 10
                    `;
                    const debugSousDirDRHResult = await db.query(debugSousDirDRHQuery, [validateur.id_ministere, id_validateur, drhDirectionId]);
                    console.log(`🔍 Debug - Demandes valide_par_sous_directeur dans la direction ${drhDirectionId} de la DRH:`, debugSousDirDRHResult.rows);
                    console.log(`🔍 Nombre de demandes valide_par_sous_directeur dans la direction DRH: ${debugSousDirDRHResult.rows.length}`);
                }

                // Debug: Vérifier quelles demandes existent dans le ministère
                const debugQuery = `
                    SELECT d.id, d.type_demande, d.status, d.niveau_actuel, d.niveau_evolution_demande, d.phase,
                           a.prenom, a.nom, a.matricule, a.id_ministere
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    WHERE a.id_ministere = $1
                    ORDER BY d.date_creation DESC
                    LIMIT 20
                `;
                const debugResult = await db.query(debugQuery, [validateur.id_ministere]);
                console.log(`🔍 Debug - Toutes les demandes dans le ministère ${validateur.id_ministere}:`, debugResult.rows);

                // Debug spécifique pour les demandes qui devraient être visibles par le DRH
                const drhVisibleQuery = `
                    SELECT d.id, d.type_demande, d.status, d.niveau_actuel, d.niveau_evolution_demande, d.phase,
                           d.statut_directeur, d.statut_sous_directeur,
                           a.prenom, a.nom, a.matricule, a.id_ministere, a.id as agent_id
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    WHERE d.status = 'en_attente'
                    AND (d.niveau_actuel = 'drh' 
                         OR d.niveau_evolution_demande IN ('valide_par_sous_directeur', 'valide_par_directeur', 'valide_par_superieur', 'retour_ministre', 'retour_dir_cabinet')
                         OR (d.niveau_evolution_demande = 'valide_par_directeur' AND d.statut_directeur = 'approuve'))
                    AND a.id_ministere = $1
                    AND d.id_agent != $2
                    ORDER BY d.date_creation DESC
                `;
                const drhVisibleResult = await db.query(drhVisibleQuery, [validateur.id_ministere, id_validateur]);
                console.log(`🔍 Debug - Demandes visibles par le DRH (ministère ${validateur.id_ministere}, excluant agent ${id_validateur}):`, drhVisibleResult.rows);
                console.log(`🔍 Nombre de demandes visibles: ${drhVisibleResult.rows.length}`);

                // Debug supplémentaire : toutes les demandes en attente du ministère (sans filtre)
                const allPendingQuery = `
                    SELECT d.id, d.type_demande, d.status, d.niveau_actuel, d.niveau_evolution_demande, d.phase,
                           d.statut_directeur, d.statut_sous_directeur,
                           a.prenom, a.nom, a.matricule, a.id_ministere, a.id as agent_id
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    WHERE d.status = 'en_attente'
                    AND a.id_ministere = $1
                    ORDER BY d.date_creation DESC
                `;
                const allPendingResult = await db.query(allPendingQuery, [validateur.id_ministere]);
                console.log(`🔍 Debug - Toutes les demandes en attente du ministère (sans filtre DRH):`, allPendingResult.rows);
                console.log(`🔍 Nombre total de demandes en attente: ${allPendingResult.rows.length}`);
            } else if (isSousDirecteur) {
                // Sous-directeur : voir les demandes des agents de sa sous-direction
                // Filtrage par id_validateur_sous_directeur OU par id_sous_direction pour plus de robustesse
                console.log(`Sous-directeur détecté - Filtrage par id_validateur_sous_directeur et id_sous_direction`);

                // Récupérer l'id_sous_direction du validateur
                const validateurInfoQuery = `
                    SELECT id_sous_direction, id_direction, id_ministere
                    FROM agents
                    WHERE id = $1
                `;
                const validateurInfoResult = await db.query(validateurInfoQuery, [id_validateur]);
                const validateurSousDirectionId = validateurInfoResult.rows[0] ? validateurInfoResult.rows[0].id_sous_direction || null : null;
                const validateurDirectionId = validateurInfoResult.rows[0] ? validateurInfoResult.rows[0].id_direction || null : null;
                const validateurMinistereId = validateurInfoResult.rows[0] ? validateurInfoResult.rows[0].id_ministere || null : null;

                console.log(`Sous-directeur - ID sous-direction: ${validateurSousDirectionId}, ID direction: ${validateurDirectionId}, ID ministère: ${validateurMinistereId}`);

                let whereConditions = [
                    "d.status = 'en_attente'",
                    "(d.niveau_evolution_demande = 'soumis' OR d.niveau_evolution_demande = 'retour_drh')"
                ];
                params = [];
                let paramIndex = 1;

                // Construire la condition pour filtrer les demandes de la sous-direction
                if (validateurSousDirectionId) {
                    // Filtrer par id_validateur_sous_directeur OU par id_sous_direction des agents
                    whereConditions.push(`(
                        d.id_validateur_sous_directeur = $${paramIndex} OR 
                        a.id_sous_direction = $${paramIndex + 1}
                    )`);
                    params.push(id_validateur);
                    params.push(validateurSousDirectionId);
                    paramIndex += 2;
                } else {
                    // Si pas d'id_sous_direction, utiliser uniquement id_validateur_sous_directeur
                    whereConditions.push(`d.id_validateur_sous_directeur = $${paramIndex}`);
                    params.push(id_validateur);
                    paramIndex++;
                }

                // Filtrer par ministère si disponible
                if (validateurMinistereId) {
                    whereConditions.push(`a.id_ministere = $${paramIndex}`);
                    params.push(validateurMinistereId);
                    paramIndex++;
                }

                // Filtre par recherche d'agent (nom, prénom ou matricule)
                if (agent_search) {
                    whereConditions.push(`(LOWER(a.prenom) LIKE LOWER($${paramIndex}) OR LOWER(a.nom) LIKE LOWER($${paramIndex}) OR LOWER(a.matricule) LIKE LOWER($${paramIndex}))`);
                    params.push(`%${agent_search}%`);
                    paramIndex++;
                }

                // Filtre par service
                if (service_id) {
                    whereConditions.push(`a.id_direction = $${paramIndex}`);
                    params.push(service_id);
                    paramIndex++;
                }

                // Filtre par type de demande
                if (type_demande) {
                    whereConditions.push(`d.type_demande = $${paramIndex}`);
                    params.push(type_demande);
                    paramIndex++;
                }

                // Filtre par priorité
                if (priorite) {
                    whereConditions.push(`d.priorite = $${paramIndex}`);
                    params.push(priorite);
                    paramIndex++;
                }

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           e.libele as echelon_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    LEFT JOIN echelons e ON a.id_echelon = e.id
                    WHERE ${whereConditions.join(' AND ')}
                    ORDER BY d.date_creation ASC
                `;
                console.log(`Sous-directeur détecté - Recherche des demandes assignées (id_validateur_sous_directeur = ${id_validateur})`);
                console.log(`Paramètres de la requête: ${JSON.stringify(params)}`);
            } else if (isDirecteur || isGestionnairePatrimoine || isPresidentFond || isResponsableCellulePassation) {
                // Directeur / Gestionnaire patrimoine / Président fond / Responsable cellule passation :
                // voir les demandes assignées via id_validateur_directeur ou validées par les sous-directeurs de sa direction
                console.log(`${isGestionnairePatrimoine || isPresidentFond || isResponsableCellulePassation ? 'Directeur assimilé' : 'Directeur'} détecté - Filtrage par id_validateur_directeur = ${id_validateur} ou demandes validées par sous-directeurs`);

                // Récupérer l'ID de la direction du directeur (rôle directeur, directeur_central ou rôles assimilés)
                const directionQuery = `
                    SELECT d.id 
                    FROM directions d
                    JOIN agents a ON a.id_direction = d.id
                    JOIN utilisateurs u ON a.id = u.id_agent
                    JOIN roles r ON u.id_role = r.id
                    WHERE a.id = $1 AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(r.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                    LIMIT 1
                `;
                const directionResult = await db.query(directionQuery, [id_validateur]);
                const directionId = directionResult.rows[0] ? directionResult.rows[0].id || null : null;

                let whereConditions = [
                    "d.status = 'en_attente'"
                ];
                params = [id_validateur];
                let paramIndex = 2;

                // Exclure les demandes déjà validées par ce directeur/directeur central (statut_directeur = 'approuve'),
                // sinon elles resteraient affichées après validation alors qu'elles sont passées au DRH.
                whereConditions.push(`(d.statut_directeur IS NULL OR d.statut_directeur != 'approuve')`);

                // Construire la condition pour les demandes du directeur
                if (directionId) {
                    whereConditions.push(`(
                        (d.niveau_evolution_demande = 'valide_par_sous_directeur' AND a.id_direction = $${paramIndex}) OR
                        (d.niveau_evolution_demande = 'soumis' AND d.id_validateur_directeur = $1) OR
                        (d.niveau_evolution_demande = 'valide_par_directeur' AND d.id_validateur_directeur = $1)
                    )`);
                    params.push(directionId);
                    paramIndex++;
                } else {
                    whereConditions.push(`(
                        (d.niveau_evolution_demande = 'soumis' AND d.id_validateur_directeur = $1) OR
                        (d.niveau_evolution_demande = 'valide_par_directeur' AND d.id_validateur_directeur = $1)
                    )`);
                }

                // Filtre par recherche d'agent
                if (agent_search) {
                    whereConditions.push(`(LOWER(a.prenom) LIKE LOWER($${paramIndex}) OR LOWER(a.nom) LIKE LOWER($${paramIndex}) OR LOWER(a.matricule) LIKE LOWER($${paramIndex}))`);
                    params.push(`%${agent_search}%`);
                    paramIndex++;
                }

                // Filtre par service
                if (service_id) {
                    whereConditions.push(`a.id_direction = $${paramIndex}`);
                    params.push(service_id);
                    paramIndex++;
                }

                // Filtre par type de demande
                if (type_demande) {
                    whereConditions.push(`d.type_demande = $${paramIndex}`);
                    params.push(type_demande);
                    paramIndex++;
                }

                // Filtre par priorité
                if (priorite) {
                    whereConditions.push(`d.priorite = $${paramIndex}`);
                    params.push(priorite);
                    paramIndex++;
                }

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           e.libele as echelon_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    LEFT JOIN echelons e ON a.id_echelon = e.id
                    WHERE ${whereConditions.join(' AND ')}
                    ORDER BY d.date_creation ASC
                `;
                console.log(`Directeur détecté - Recherche des demandes assignées (id_validateur_directeur = ${id_validateur})`);
                console.log(`Paramètres de la requête: ${JSON.stringify(params)}`);
            } else if (isMinistre) {
                // Ministre : voir UNIQUEMENT les demandes EN ATTENTE de SA validation
                // (et non celles déjà approuvées par lui puis parties chez le DRH).
                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status = 'en_attente'
                    AND a.id_ministere = $1
                    AND (
                        -- Anciennes demandes où le niveau actuel est encore le ministre
                        d.niveau_actuel = 'ministre'
                        OR
                        -- Compatibilité : anciennes lignes sans niveau_actuel mais marquées valides par le ministre
                        (d.niveau_actuel IS NULL 
                         AND d.niveau_evolution_demande = 'valide_par_ministre' 
                         AND (d.statut_ministre IS NULL OR d.statut_ministre = 'en_attente'))
                    )
                    ORDER BY d.date_creation ASC
                `;
                params = [validateur.id_ministere];
                console.log('Ministre détecté - Demandes actuellement en attente de sa validation');
            } else if (isChefCabinet) {
                // Chef de Cabinet : voir TOUTES les demandes "En attente Chef Cabinet" du ministère (ou du même cabinet).
                // Ne plus filtrer par id_validateur_chef_cabinet pour que tout chef de cabinet voie les demandes,
                // même si la demande a été assignée à un autre chef_cabinet à la création (LIMIT 1).
                const cabinetDgId = validateur.id_direction_generale != null ? validateur.id_direction_generale : null;
                if (cabinetDgId != null) {
                    query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status = 'en_attente' 
                    AND (d.niveau_actuel = 'chef_cabinet' OR (d.niveau_actuel IS NULL AND d.niveau_evolution_demande = 'valide_par_chef_cabinet'))
                    AND a.id_ministere = $1
                    AND a.id_direction_generale = $2
                    ORDER BY d.date_creation ASC
                `;
                    params = [validateur.id_ministere, cabinetDgId];
                } else {
                    query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status = 'en_attente' 
                    AND (d.niveau_actuel = 'chef_cabinet' OR (d.niveau_actuel IS NULL AND d.niveau_evolution_demande = 'valide_par_chef_cabinet'))
                    AND a.id_ministere = $1
                    ORDER BY d.date_creation ASC
                `;
                    params = [validateur.id_ministere];
                }
                console.log('Chef de Cabinet détecté - Demandes en attente de validation chef de cabinet (tous les chefs voient toutes les demandes du cabinet)');
            } else if (isDirCabinet) {
                // Directeur de cabinet : demandes en attente de SA validation uniquement.
                // Exclure les demandes déjà validées par le Dir Cabinet (statut_dir_cabinet = 'approuve'),
                // sinon elles resteraient affichées car niveau_evolution_demande reste 'valide_par_dir_cabinet' après passage au DRH.
                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status = 'en_attente' 
                    AND d.niveau_evolution_demande = 'valide_par_dir_cabinet'
                    AND (d.statut_dir_cabinet IS NULL OR d.statut_dir_cabinet = 'en_attente')
                    AND a.id_ministere = $1
                    ORDER BY d.date_creation ASC
                `;
                params = [validateur.id_ministere];
                console.log('Directeur de cabinet détecté - Demandes en attente de validation Dir Cabinet (exclut déjà validées)');
            } else if (isDirecteurServiceExterieur) {
                // Directeur service extérieur : voir les demandes des directeurs dont la direction n'est pas rattachée à une DG
                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status = 'en_attente'
                    AND d.niveau_evolution_demande = 'valide_par_directeur_service_exterieur'
                    AND (d.statut_directeur_service_exterieur IS NULL OR d.statut_directeur_service_exterieur = 'en_attente')
                    AND a.id_ministere = $1
                    ORDER BY d.date_creation ASC
                `;
                params = [validateur.id_ministere];
                console.log('Directeur service extérieur détecté - Demandes des directeurs à valider avant envoi au DRH');
            } else if (isDirecteurGeneral || isInspecteurGeneral) {
                // Directeur général ou Inspecteur général : voir les demandes en attente DG
                // (directeurs/DSE de leur DG + agents éventuellement rattachés directement à la DG)
                let dgId = validateur.id_direction_generale != null ? validateur.id_direction_generale : null;
                if (!dgId && validateur.id_direction) {
                    const dgFromDir = await db.query('SELECT id_direction_generale FROM directions WHERE id = $1', [validateur.id_direction]);
                    if (dgFromDir.rows[0]?.id_direction_generale != null) dgId = dgFromDir.rows[0].id_direction_generale;
                }
                if (dgId) {
                    // Afficher uniquement les demandes en attente d'action du DG (niveau_actuel = directeur_general)
                    // ou anciennes demandes sans niveau_actuel mais pas encore validées par le DG
                    query = `
                        SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                               fa.designation_poste as fonction_actuelle,
                               s.libelle as service_nom, m.nom as ministere_nom,
                               f.libele as fonction_libelle
                        FROM demandes d
                        LEFT JOIN agents a ON d.id_agent = a.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                            SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                        )
                        LEFT JOIN fonctions f ON fa.id_fonction = f.id
                        WHERE d.status = 'en_attente'
                        AND (d.niveau_actuel = 'directeur_general' OR (d.niveau_actuel IS NULL AND d.niveau_evolution_demande = 'valide_par_directeur_general' AND (d.statut_directeur_general IS NULL OR d.statut_directeur_general != 'approuve')))
                        AND a.id_ministere = $1
                        AND (d.id_validateur_directeur_general = $2 OR s.id_direction_generale = $3 OR (a.id_direction_generale = $3 AND a.id_direction IS NULL))
                        ORDER BY d.date_creation ASC
                    `;
                    params = [validateur.id_ministere, id_validateur, dgId];
                } else {
                    query = `
                        SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                               fa.designation_poste as fonction_actuelle,
                               s.libelle as service_nom, m.nom as ministere_nom,
                               f.libele as fonction_libelle
                        FROM demandes d
                        LEFT JOIN agents a ON d.id_agent = a.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                            SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                        )
                        LEFT JOIN fonctions f ON fa.id_fonction = f.id
                        WHERE d.status = 'en_attente'
                        AND (d.niveau_actuel = 'directeur_general' OR (d.niveau_actuel IS NULL AND d.niveau_evolution_demande = 'valide_par_directeur_general' AND (d.statut_directeur_general IS NULL OR d.statut_directeur_general != 'approuve')))
                        AND a.id_ministere = $1
                        AND d.id_validateur_directeur_general = $2
                        ORDER BY d.date_creation ASC
                    `;
                    params = [validateur.id_ministere, id_validateur];
                }
                console.log(`${isInspecteurGeneral ? 'Inspecteur général' : 'Directeur général'} détecté - Demandes des directeurs/DSE de sa DG`);
            } else if (isDirecteurCentral) {
                // Directeur central : voir les demandes en attente dont le niveau actuel est "directeur_central"
                // ou qui lui sont explicitement assignées via id_validateur_directeur.
                console.log('Directeur central détecté - Récupération des demandes avec niveau_actuel = directeur_central ou assignées comme directeur');

                // Récupérer l'ID de la direction du directeur central
                const directionQueryDc = `
                    SELECT d.id 
                    FROM directions d
                    JOIN agents a ON a.id_direction = d.id
                    WHERE a.id = $1
                    LIMIT 1
                `;
                const directionResultDc = await db.query(directionQueryDc, [id_validateur]);
                const directionIdDc = directionResultDc.rows[0] ? directionResultDc.rows[0].id || null : null;

                let whereConditionsDc = [
                    "d.status = 'en_attente'"
                ];
                // Pour le directeur central, on ne passe pas d'ID validateur en paramètre direct
                // (tous les paramètres utilisés dans la requête sont ajoutés explicitement ci‑dessous).
                params = [];
                let paramIndexDc = 1;

                // Restreindre aux agents de sa direction si connue
                if (directionIdDc) {
                    whereConditionsDc.push(`a.id_direction = $${paramIndexDc}`);
                    params.push(directionIdDc);
                    paramIndexDc++;
                }

                // Inclure UNIQUEMENT les demandes dont le niveau actuel est "directeur_central".
                // Ainsi, le directeur central ne voit plus les demandes déjà passées au niveau DRH.
                whereConditionsDc.push(`d.niveau_actuel = 'directeur_central'`);

                // Filtres additionnels (recherche, service, type, priorité)
                if (agent_search) {
                    whereConditionsDc.push(`(LOWER(a.prenom) LIKE LOWER($${paramIndexDc}) OR LOWER(a.nom) LIKE LOWER($${paramIndexDc}) OR LOWER(a.matricule) LIKE LOWER($${paramIndexDc}))`);
                    params.push(`%${agent_search}%`);
                    paramIndexDc++;
                }

                if (service_id) {
                    whereConditionsDc.push(`a.id_direction = $${paramIndexDc}`);
                    params.push(service_id);
                    paramIndexDc++;
                }

                if (type_demande) {
                    whereConditionsDc.push(`d.type_demande = $${paramIndexDc}`);
                    params.push(type_demande);
                    paramIndexDc++;
                }

                if (priorite) {
                    whereConditionsDc.push(`d.priorite = $${paramIndexDc}`);
                    params.push(priorite);
                    paramIndexDc++;
                }

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE ${whereConditionsDc.join(' AND ')}
                    ORDER BY d.date_creation ASC
                `;
                console.log('Directeur central - Requête des demandes en attente:', query);
                console.log('Directeur central - Paramètres:', JSON.stringify(params));
            } else if (isSuperAdmin) {
                // Super admin : voir toutes les demandes en attente
                console.log('Super admin détecté - Accès à toutes les demandes');
                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status = 'en_attente' 
                    ORDER BY d.date_creation ASC
                `;
                params = [];
            } else {
                // Si aucun rôle n'est détecté, essayer de récupérer les demandes du service du validateur
                console.log('Aucun rôle spécifique détecté, tentative de récupération des demandes du service');
                console.log(`ID Service validateur: ${validateur.id_direction}, ID Ministère: ${validateur.id_ministere}`);

                // Essayer d'abord comme chef de service
                if (validateur.id_direction) {
                    query = `
                        SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                               fa.designation_poste as fonction_actuelle,
                               s.libelle as service_nom, m.nom as ministere_nom,
                               f.libele as fonction_libelle
                        FROM demandes d
                        LEFT JOIN agents a ON d.id_agent = a.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                            SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                        )
                        LEFT JOIN fonctions f ON fa.id_fonction = f.id
                        WHERE d.status = 'en_attente' 
                        AND (
                            (d.phase = 'aller' AND d.niveau_evolution_demande = 'soumis') OR
                            (d.phase = 'retour' AND d.niveau_evolution_demande = 'retour_drh')
                        )
                        AND a.id_direction = $1
                        AND a.id_ministere = $2
                        AND d.id_agent != $3
                        ORDER BY d.date_creation ASC
                    `;
                    params = [validateur.id_direction, validateur.id_ministere, id_validateur];
                } else {
                    // Fallback : récupérer toutes les demandes du ministère
                    query = `
                        SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                               fa.designation_poste as fonction_actuelle,
                               s.libelle as service_nom, m.nom as ministere_nom,
                               f.libele as fonction_libelle
                        FROM demandes d
                        LEFT JOIN agents a ON d.id_agent = a.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                            SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                        )
                        LEFT JOIN fonctions f ON fa.id_fonction = f.id
                        WHERE d.status = 'en_attente' 
                        AND (
                            (d.niveau_evolution_demande = 'valide_par_superieur') OR
                            (d.niveau_evolution_demande = 'retour_ministre')
                        )
                        AND a.id_ministere = $1
                        ORDER BY d.date_creation ASC
                    `;
                    params = [validateur.id_ministere];
                }

                console.log(`Requête fallback: ${query}`);
                console.log(`Paramètres fallback: ${JSON.stringify(params)}`);
            }

            // Appliquer le filtre par type de demande si fourni
            if (type_demande) {
                // Ajouter la condition juste avant l'ORDER BY
                query = query.replace(
                    /ORDER BY\s+d\.date_creation\s+ASC/,
                    `AND d.type_demande = $${params.length + 1}\n                    ORDER BY d.date_creation ASC`
                );
                params.push(type_demande);
            }

            // Ajouter la pagination si elle n'est pas déjà présente
            if (!query.includes('LIMIT') && !query.includes('OFFSET')) {
                const offset = (page - 1) * limit;
                query = query.replace(
                    /ORDER BY\s+d\.date_creation\s+ASC/i,
                    `ORDER BY d.date_creation ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
                );
                params.push(limit);
                params.push(offset);
            }

            console.log('🔍 Exécution de la requête finale pour DRH');
            console.log(`🔍 Requête SQL finale:`, query);
            console.log(`🔍 Paramètres finaux:`, JSON.stringify(params, null, 2));

            const result = await db.query(query, params);

            console.log(`Requête exécutée avec ${result.rows.length} résultats`);
            if (result.rows.length > 0) {
                console.log('Première demande:', {
                    id: result.rows[0].id,
                    agent: `${result.rows[0].prenom} ${result.rows[0].nom}`,
                    niveau_evolution_demande: result.rows[0].niveau_evolution_demande,
                    status: result.rows[0].status,
                    phase: result.rows[0].phase,
                    type_demande: result.rows[0].type_demande
                });
                console.log('Toutes les demandes trouvées:');
                result.rows.forEach((demande, index) => {
                    console.log(`${index + 1}. ID: ${demande.id}, Agent: ${demande.prenom} ${demande.nom}, Statut: ${demande.niveau_evolution_demande}`);
                });
            } else {
                console.log('Aucune demande trouvée. Vérifiez les conditions suivantes:');
                console.log(`- Status: en_attente`);
                console.log(`- Niveau évolution: soumis (phase aller) ou retour_drh (phase retour)`);
                console.log(`- Service ID: ${validateur.id_direction}`);
                console.log(`- Ministère ID: ${validateur.id_ministere}`);
            }

            // Ajouter les informations de debug si disponibles (pour DRH uniquement)
            const response = {
                success: true,
                data: result.rows
            };

            // Si c'est une requête DRH et que debugInfo existe, l'ajouter à la réponse
            if (isDRH && typeof debugInfo !== 'undefined' && debugInfo !== null) {
                response.debug = debugInfo;
                response.debug.resultCount = result.rows.length;
            }

            res.json(response);

        } catch (error) {
            console.error('Erreur lors de la récupération des demandes en attente:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Valider une demande
    static async validerDemande(req, res) {
            let id_demande = null;
            try {
                // Vérifier que les paramètres sont présents
                if (!req.params || !req.params.id_demande) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID de demande manquant dans les paramètres'
                    });
                }

                id_demande = req.params.id_demande;
                let { action, commentaire } = req.body || {};
                let documentGenerated = null;
                let nextNiveau = null; // Déclaré au niveau de la fonction pour être accessible partout
                let nextEvolutionNiveau = null; // Déclaré au niveau de la fonction pour être accessible partout
                let shouldFinalize = false; // Déclaré au niveau de la fonction pour être accessible partout

                // Initialiser commentaire si non fourni
                if (!commentaire) {
                    commentaire = '';
                }

                // Si action n'est pas fournie, définir automatiquement à 'approuve' (validation automatique)
                if (!action || action === '' || action === 'valider') {
                    action = 'approuve';
                    console.log('✅ Validation automatique: action définie à "approuve"');
                }

                // VÉRIFICATION: Si la demande est rejetée, le motif est OBLIGATOIRE
                if ((action === 'rejeter' || action === 'rejete') && (!commentaire || commentaire.trim() === '')) {
                    return res.status(400).json({
                        success: false,
                        error: 'Le motif de rejet est obligatoire. Veuillez saisir un motif pour rejeter la demande.'
                    });
                }

                // Vérifier que l'utilisateur est authentifié
                if (!req.user || !req.user.id) {
                    return res.status(401).json({
                        success: false,
                        error: 'Utilisateur non authentifié'
                    });
                }

                // Vérifier que db est disponible
                if (!db) {
                    console.error('❌ Erreur: db n\'est pas disponible');
                    return res.status(500).json({
                        success: false,
                        error: 'Erreur de connexion à la base de données'
                    });
                }

                // Récupérer la demande
                const demandeQuery = 'SELECT * FROM demandes WHERE id = $1';
                const demandeResult = await db.query(demandeQuery, [id_demande]);

                if (demandeResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Demande non trouvée'
                    });
                }

                const demande = demandeResult.rows[0];
                const validateurId = req.user.id_agent;

                // Récupérer le rôle du validateur (utilisateur qui valide)
                const validateurRoleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id = $1 OR u.id_agent = $2
                LIMIT 1
            `;
                const validateurRoleResult = await db.query(validateurRoleQuery, [req.user.id, validateurId]);
                const validateurRole = (validateurRoleResult.rows[0] && validateurRoleResult.rows[0].role_nom) || '';
                const validateurRoleLower = (validateurRole || '').toLowerCase().replace(/\s+/g, '_').replace(/é/g, 'e').replace(/è/g, 'e');

                console.log(`🔍 DEBUG: Demande ${id_demande} - État actuel: ${demande.niveau_evolution_demande}, Type: ${demande.type_demande}`);
                console.log(`🔍 DEBUG: Validateur ID: ${validateurId}, User ID: ${req.user.id}, Rôle: ${validateurRole} (${validateurRoleLower})`);
                console.log(`🔍 DEBUG: Résultat de la requête de rôle du validateur:`, validateurRoleResult.rows);

                // Interdiction: un agent ne peut pas valider/rejeter sa propre demande
                // Exception: le DRH peut finaliser sa propre demande quand elle revient du directeur de cabinet (retour_dir_cabinet / retour_drh) pour générer le document
                if (demande.id_agent === validateurId) {
                    const niveauEvolution = (demande.niveau_evolution_demande || '').toLowerCase();
                    const isDRHFinalizingOwnDemande = validateurRoleLower === 'drh' &&
                        ['retour_dir_cabinet', 'retour_drh'].indexOf(niveauEvolution) !== -1;
                    if (!isDRHFinalizingOwnDemande) {
                        return res.status(403).json({
                            success: false,
                            error: "Vous ne pouvez pas traiter votre propre demande"
                        });
                    }
                    console.log(`✅ Exception: DRH finalise sa propre demande (niveau: ${niveauEvolution}) → autorisé`);
                }

                // Récupérer le rôle du demandeur (agent qui a créé la demande)
                const demandeurRoleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
                const demandeurRoleResult = await db.query(demandeurRoleQuery, [demande.id_agent]);
                const demandeurRole = (demandeurRoleResult.rows[0] && demandeurRoleResult.rows[0].role_nom) || 'agent';
                const demandeurRoleLower = demandeurRole.toLowerCase();

                console.log(`🔍 DEBUG: Rôle du demandeur: ${demandeurRole}`);

                // Déterminer le niveau de validation basé sur le niveau_evolution_demande ET le rôle du demandeur
                let niveauValidation = '';
                let statutField = '';
                let dateField = '';
                let commentaireField = '';
                // nextNiveau et nextEvolutionNiveau sont déjà déclarés au début de la fonction
                let phase = demande.phase || 'aller';

                console.log(`🔍 DEBUG: Demande ${id_demande} - niveau_evolution_demande: ${demande.niveau_evolution_demande}, type: ${demande.type_demande}, demandeur: ${demandeurRole}`);
                console.log(`🔍 DEBUG: Validateur actuel - role: ${validateurRole}, roleLower: ${validateurRoleLower}`);

                // VÉRIFICATION PRIORITAIRE : Si le validateur est un DRH, il peut valider et finaliser n'importe quelle demande
                if (validateurRoleLower === 'drh') {
                    niveauValidation = 'drh';
                    statutField = 'statut_drh';
                    dateField = 'date_validation_drh';
                    commentaireField = 'commentaire_drh';
                    nextNiveau = 'finalise';
                    nextEvolutionNiveau = 'valide_par_drh';
                    phase = 'retour';
                    console.log(`✅ VÉRIFICATION PRIORITAIRE: DRH valide une demande → Finalisation directe`);
                }
                // Ministre valide une demande en attente ministre (dir_cabinet, chef_cabinet, conseiller_technique) → envoi au DRH (c'est le DRH qui finalise)
                else if (!niveauValidation && validateurRoleLower === 'ministre' && demande.niveau_evolution_demande === 'valide_par_ministre') {
                    niveauValidation = 'ministre';
                    statutField = 'statut_ministre';
                    dateField = 'date_validation_ministre';
                    commentaireField = 'commentaire_ministre';
                    // Après validation du Ministre, la demande part au DRH
                    nextNiveau = 'drh';
                    nextEvolutionNiveau = 'valide_par_ministre';
                    phase = 'aller';
                    console.log('✅ Ministre valide → Demande envoyée au DRH (finalisation par le DRH uniquement)');
                }
                // Chef de cabinet valide (charge_d_etude, charge_de_mission, chef_du_secretariat_particulier, agents Cabinet) → envoi au DRH (c'est le DRH qui finalise)
                else if (!niveauValidation && validateurRoleLower === 'chef_cabinet' && demande.niveau_evolution_demande === 'valide_par_chef_cabinet') {
                    niveauValidation = 'chef_cabinet';
                    statutField = 'statut_chef_cabinet';
                    dateField = 'date_validation_chef_cabinet';
                    commentaireField = 'commentaire_chef_cabinet';
                    nextNiveau = 'drh';
                    nextEvolutionNiveau = 'valide_par_chef_cabinet';
                    phase = 'aller';
                    console.log('✅ Chef de cabinet valide → Demande transmise au DRH (finalisation par le DRH uniquement)');
                }
                // Directeur service extérieur valide → envoi au DRH (pas de finalisation, le DRH finalise)
                else if (!niveauValidation && validateurRoleLower === 'directeur_service_exterieur' && demande.niveau_evolution_demande === 'valide_par_directeur_service_exterieur') {
                    niveauValidation = 'directeur_service_exterieur';
                    statutField = 'statut_directeur_service_exterieur';
                    dateField = 'date_validation_directeur_service_exterieur';
                    commentaireField = 'commentaire_directeur_service_exterieur';
                    nextNiveau = 'drh';
                    nextEvolutionNiveau = 'valide_par_directeur_service_exterieur';
                    phase = 'retour';
                    console.log('✅ Directeur service extérieur valide → Demande envoyée au DRH');
                }
                // Directeur général valide (directeur/DSE avec DG ou agent rattaché à la DG) → envoi au DRH (qui finalise)
                else if (!niveauValidation && (validateurRoleLower === 'directeur_general' || validateurRoleLower === 'directeur_generale' || validateurRoleLower === 'inspecteur_general') && demande.niveau_evolution_demande === 'valide_par_directeur_general') {
                    niveauValidation = 'directeur_general';
                    statutField = 'statut_directeur_general';
                    dateField = 'date_validation_directeur_general';
                    commentaireField = 'commentaire_directeur_general';
                    // Après validation du Directeur général, la demande part au DRH
                    nextNiveau = 'drh';
                    nextEvolutionNiveau = 'valide_par_directeur_general';
                    phase = 'aller';
                    console.log('✅ Directeur général valide → Demande envoyée au DRH');
                }
                // NOUVEAU WORKFLOW selon le rôle du demandeur (seulement si niveauValidation n'a pas été défini ci-dessus)
                else if (!niveauValidation) {
                    // 1. Agent → Sous-directeur → Directeur → DRH
                    // OU Agent (directement lié à direction) → Directeur → DRH (ou directement DRH si directeur est DRH)
                    if (demandeurRoleLower === 'agent' || (!demandeurRoleResult.rows[0])) {
                        // Vérifier si la demande vient d'un agent directement lié à une direction (sans sous-direction)
                        // Le directeur est déterminé : rôle directeur, directeur_central ou rôles assimilés (gestionnaire_du_patrimoine, president_du_fond, responsble_cellule_de_passation)
                        const demandeAgentQuery = `
                    SELECT 
                        a.id_sous_direction,
                        (SELECT dir_agent.id 
                         FROM agents dir_agent
                         JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                         JOIN roles dir_role ON dir_user.id_role = dir_role.id
                         WHERE dir_agent.id_direction = d.id 
                         AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                         LIMIT 1) as directeur_id,
                        (SELECT dir_agent.id 
                         FROM agents dir_agent
                         JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                         JOIN roles dir_role ON dir_user.id_role = dir_role.id
                         WHERE dir_agent.id_direction = d.id 
                         AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                         LIMIT 1) as directeur_agent_id,
                        (SELECT dir_role.nom 
                         FROM agents dir_agent
                         JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                         JOIN roles dir_role ON dir_user.id_role = dir_role.id
                         WHERE dir_agent.id_direction = d.id 
                         AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                         LIMIT 1) as directeur_role_nom
                    FROM agents a
                    LEFT JOIN directions d ON a.id_direction = d.id
                    WHERE a.id = $1
                `;
                        const demandeAgentResult = await db.query(demandeAgentQuery, [demande.id_agent]);
                        const agentInfo = demandeAgentResult.rows[0] || {};
                        const agentSansSousDirection = !agentInfo.id_sous_direction && agentInfo.directeur_id;
                        const directeurEstDRH = agentInfo.directeur_role_nom &&
                            (agentInfo.directeur_role_nom.toLowerCase() === 'drh' ||
                                agentInfo.directeur_role_nom.toLowerCase() === 'drh');

                        if (demande.niveau_evolution_demande === 'soumis') {
                            // Si le validateur est le chef de service, il valide en tant que chef_service → la demande part au sous-directeur/directeur, jamais en finalisation (seul le DRH finalise)
                            if (validateurRoleLower === 'chef_service') {
                                niveauValidation = 'chef_service';
                                statutField = 'statut_chef_service';
                                dateField = 'date_validation_chef_service';
                                commentaireField = 'commentaire_chef_service';
                                console.log(`Chef de service valide une demande "soumis" → Demande part au sous-directeur/directeur (pas de finalisation)`);
                            } else if (agentSansSousDirection) {
                                // Agent directement lié à direction → Directeur (ou DRH si directeur est DRH)
                                if (directeurEstDRH) {
                                    niveauValidation = 'drh';
                                    statutField = 'statut_drh';
                                    dateField = 'date_validation_drh';
                                    commentaireField = 'commentaire_drh';
                                    console.log(`Agent directement lié à direction - Directeur est DRH → Validation DRH`);
                                } else {
                                    niveauValidation = 'directeur';
                                    statutField = 'statut_directeur';
                                    dateField = 'date_validation_directeur';
                                    commentaireField = 'commentaire_directeur';
                                    console.log(`Agent directement lié à direction → Validation Directeur`);
                                }
                            } else {
                                // Agent dans sous-direction → Sous-directeur
                                niveauValidation = 'sous_directeur';
                                statutField = 'statut_sous_directeur';
                                dateField = 'date_validation_sous_directeur';
                                commentaireField = 'commentaire_sous_directeur';
                            }
                        } else if (demande.niveau_evolution_demande === 'valide_par_sous_directeur') {
                            // Vérifier si le sous-directeur est rattaché à une direction où le directeur est la DRH
                            // Si oui, la demande va directement au DRH, sinon au directeur
                            const sousDirecteurInfoQuery = `
                        SELECT 
                            a.id_direction,
                            -- Trouver le directeur de la direction du sous-directeur (rôles assimilés directeur)
                            (SELECT dir_role.nom 
                             FROM agents dir_agent
                             JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                             JOIN roles dir_role ON dir_user.id_role = dir_role.id
                             WHERE dir_agent.id_direction = a.id_direction 
                             AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                             LIMIT 1) as directeur_role_nom
                        FROM agents a
                        WHERE a.id = (SELECT id_agent FROM demandes WHERE id = $1)
                    `;
                            const sousDirecteurInfoResult = await db.query(sousDirecteurInfoQuery, [id_demande]);
                            const sousDirecteurInfo = sousDirecteurInfoResult.rows[0] || {};
                            const directeurEstDRH = sousDirecteurInfo.directeur_role_nom &&
                                (sousDirecteurInfo.directeur_role_nom.toLowerCase() === 'drh');

                            if (directeurEstDRH) {
                                // Sous-directeur rattaché à la direction de la DRH → Demande va directement au DRH
                                niveauValidation = 'drh';
                                statutField = 'statut_drh';
                                dateField = 'date_validation_drh';
                                commentaireField = 'commentaire_drh';
                                console.log(`✅ Demande validée par sous-directeur (rattaché à DRH) → Validation par DRH`);
                            } else {
                                // Sous-directeur normal → Demande va au directeur
                                niveauValidation = 'directeur';
                                statutField = 'statut_directeur';
                                dateField = 'date_validation_directeur';
                                commentaireField = 'commentaire_directeur';
                                console.log(`✅ Demande validée par sous-directeur → Validation par Directeur`);
                            }
                        } else if (demande.niveau_evolution_demande === 'valide_par_directeur') {
                            // Vérifier que le validateur est bien un DRH avant de lui permettre de valider
                            if (validateurRoleLower === 'drh') {
                                niveauValidation = 'drh';
                                statutField = 'statut_drh';
                                dateField = 'date_validation_drh';
                                commentaireField = 'commentaire_drh';
                                console.log(`✅ Demande validée par directeur → Validation par DRH (niveauValidation='drh')`);
                                console.log(`🔍 DEBUG: validateurRoleLower='${validateurRoleLower}', validateurRole='${validateurRole}'`);
                            } else {
                                // Si le validateur n'est pas un DRH, c'est une erreur
                                console.error(`❌ Erreur: La demande nécessite une validation DRH mais le validateur est ${validateurRole}`);
                                return res.status(403).json({
                                    success: false,
                                    error: `Cette demande nécessite une validation par le DRH. Vous êtes ${validateurRole}, vous ne pouvez pas valider cette demande.`
                                });
                            }
                        }
                    }
                    // 2. Sous-directeur → Directeur → DRH (ou directement DRH si le directeur est la DRH)
                    else if (demandeurRoleLower === 'sous_directeur') {
                        if (demande.niveau_evolution_demande === 'soumis') {
                            // Vérifier si le sous-directeur est rattaché à une direction où le directeur est la DRH
                            const sousDirecteurDemandeurQuery = `
                        SELECT 
                            a.id_direction,
                            -- Trouver le directeur de la direction du sous-directeur (rôles assimilés directeur)
                            (SELECT dir_role.nom 
                             FROM agents dir_agent
                             JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                             JOIN roles dir_role ON dir_user.id_role = dir_role.id
                             WHERE dir_agent.id_direction = a.id_direction 
                             AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                             LIMIT 1) as directeur_role_nom
                        FROM agents a
                        WHERE a.id = $1
                    `;
                            const sousDirecteurDemandeurResult = await db.query(sousDirecteurDemandeurQuery, [demande.id_agent]);
                            const sousDirecteurDemandeurInfo = sousDirecteurDemandeurResult.rows[0] || {};
                            const directeurEstDRH = sousDirecteurDemandeurInfo.directeur_role_nom &&
                                (sousDirecteurDemandeurInfo.directeur_role_nom.toLowerCase() === 'drh');

                            if (directeurEstDRH) {
                                // Sous-directeur rattaché à la direction de la DRH → Demande va directement au DRH
                                niveauValidation = 'drh';
                                statutField = 'statut_drh';
                                dateField = 'date_validation_drh';
                                commentaireField = 'commentaire_drh';
                                console.log(`✅ Demande créée par sous-directeur (rattaché à DRH) → Validation par DRH`);
                            } else {
                                // Sous-directeur normal → Demande va au directeur
                                niveauValidation = 'directeur';
                                statutField = 'statut_directeur';
                                dateField = 'date_validation_directeur';
                                commentaireField = 'commentaire_directeur';
                                console.log(`✅ Demande créée par sous-directeur → Validation par Directeur`);
                            }
                        } else if (demande.niveau_evolution_demande === 'valide_par_directeur') {
                            niveauValidation = 'drh';
                            statutField = 'statut_drh';
                            dateField = 'date_validation_drh';
                            commentaireField = 'commentaire_drh';
                        }
                    }
                    // 3. Directeur central, Directeur général, DRH, Inspecteur général, Gestionnaire patrimoine, Président fond, Responsable cellule passation → Dir Cabinet → DRH (finalisation)
                    else if (demandeurRoleLower === 'directeur' || demandeurRoleLower === 'drh' ||
                        demandeurRoleLower === 'directeur_general' || demandeurRoleLower === 'directeur_central' || demandeurRoleLower === 'inspecteur_general' ||
                        demandeurRoleLower === 'gestionnaire_du_patrimoine' || demandeurRoleLower === 'president_du_fond' || demandeurRoleLower === 'responsble_cellule_de_passation') {
                        if (demande.niveau_evolution_demande === 'valide_par_directeur' ||
                            demande.niveau_evolution_demande === 'valide_par_drh' ||
                            demande.niveau_evolution_demande === 'valide_par_directeur_general' ||
                            demande.niveau_evolution_demande === 'valide_par_directeur_central' ||
                            demande.niveau_evolution_demande === 'valide_par_dir_cabinet') {
                            niveauValidation = 'dir_cabinet';
                            statutField = 'statut_dir_cabinet';
                            dateField = 'date_validation_dir_cabinet';
                            commentaireField = 'commentaire_dir_cabinet';
                            console.log(`✅ Demande de ${demandeurRoleLower} → Validation par Dir Cabinet`);
                        } else if (demande.niveau_evolution_demande === 'retour_dir_cabinet') {
                            // Retour du Dir Cabinet vers DRH (comme ordre à exécuter)
                            niveauValidation = 'drh';
                            statutField = 'statut_drh';
                            dateField = 'date_validation_drh';
                            commentaireField = 'commentaire_drh';
                        }
                    }
                    // 4. Directeur de cabinet, Chef de cabinet → Ministre
                    else if (demandeurRoleLower === 'dir_cabinet' || demandeurRoleLower === 'chef_cabinet') {
                        if (demande.niveau_evolution_demande === 'valide_par_dir_cabinet' ||
                            demande.niveau_evolution_demande === 'valide_par_chef_cabinet') {
                            niveauValidation = 'ministre';
                            statutField = 'statut_ministre';
                            dateField = 'date_validation_ministre';
                            commentaireField = 'commentaire_ministre';
                        }
                    }
                    // Gestion des retours
                    else if (demande.niveau_evolution_demande === 'retour_ministre') {
                        niveauValidation = 'dir_cabinet';
                        statutField = 'statut_dir_cabinet';
                        dateField = 'date_validation_dir_cabinet';
                        commentaireField = 'commentaire_dir_cabinet';
                    } else if (demande.niveau_evolution_demande === 'retour_drh') {
                        // Le chef de service n'intervient plus - le DRH finalise directement
                        // Ce cas ne devrait plus se produire, mais on le gère pour compatibilité
                        niveauValidation = 'drh';
                        statutField = 'statut_drh';
                        dateField = 'date_validation_drh';
                        commentaireField = 'commentaire_drh';
                        console.warn(`⚠️ Demande avec retour_drh détectée - Le chef de service n'intervient plus, traitement comme validation DRH`);
                    }
                } // Fin du bloc else if (!niveauValidation)

                // Log du niveau de validation déterminé
                console.log(`🔍 DEBUG: Niveau de validation déterminé:`, {
                    niveauValidation,
                    statutField,
                    dateField,
                    commentaireField,
                    niveau_evolution_demande: demande.niveau_evolution_demande,
                    demandeurRole: demandeurRole,
                    validateurRole: validateurRole,
                    validateurRoleLower: validateurRoleLower,
                    demandeId: id_demande,
                    type_demande: demande.type_demande,
                    phase: demande.phase
                });

                // Vérifier que le niveau de validation a été déterminé
                if (!niveauValidation || !statutField || !dateField || !commentaireField) {
                    console.error('❌ Erreur: Niveau de validation non déterminé', {
                        niveauValidation,
                        statutField,
                        dateField,
                        commentaireField,
                        niveau_evolution_demande: demande.niveau_evolution_demande,
                        demandeurRole: demandeurRole,
                        validateurRole: validateurRole,
                        demandeId: id_demande,
                        type_demande: demande.type_demande,
                        phase: demande.phase,
                        id_agent: demande.id_agent,
                        validateurId: validateurId
                    });

                    // Construire un message d'erreur plus détaillé
                    let errorDetails = `Impossible de déterminer le niveau de validation pour cette demande.\n`;
                    errorDetails += `État de la demande: niveau_evolution_demande="${demande.niveau_evolution_demande}", phase="${demande.phase}", type="${demande.type_demande}"\n`;
                    errorDetails += `Rôles: demandeur="${demandeurRole}", validateur="${validateurRole}"\n`;
                    errorDetails += `Valeurs déterminées: niveauValidation="${niveauValidation}", statutField="${statutField}", dateField="${dateField}", commentaireField="${commentaireField}"`;

                    return res.status(500).json({
                        success: false,
                        error: 'Impossible de déterminer le niveau de validation pour cette demande. Contactez l\'administrateur.',
                        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
                    });
                }

                // Mapper l'action vers les valeurs attendues par la base de données
                let statutValue = '';
                if (action === 'valider' || action === 'approuve') {
                    statutValue = 'approuve';
                } else if (action === 'rejeter' || action === 'rejete') {
                    statutValue = 'rejete';
                } else {
                    statutValue = action || 'approuve'; // Par défaut approuve si action invalide
                }

                console.log(`🔍 DEBUG: Niveau de validation déterminé: ${niveauValidation}, action: ${action}, statut: ${statutValue}`);

                // Mettre à jour la demande
                // Pour les mutations, mettre à jour date_debut avec date_effet_mutation si fournie
                let updateFields = [`${statutField} = $1`, `${dateField} = CURRENT_TIMESTAMP`, `${commentaireField} = $2`, `updated_by = $3`];
                let updateValues = [statutValue, commentaire || '', req.user.id];
                let paramIndex = 4;

                // Enregistrer le validateur DSE quand c'est lui qui valide
                if (niveauValidation === 'directeur_service_exterieur' && req.user.id_agent) {
                    updateFields.push(`id_validateur_directeur_service_exterieur = $${paramIndex}`);
                    updateValues.push(req.user.id_agent);
                    paramIndex++;
                }

                // Enregistrer le validateur DG quand c'est lui qui valide (pour l'historique)
                if (niveauValidation === 'directeur_general' && req.user.id_agent) {
                    updateFields.push(`id_validateur_directeur_general = $${paramIndex}`);
                    updateValues.push(req.user.id_agent);
                    paramIndex++;
                }

                // Enregistrer le Chef de cabinet quand c'est lui qui valide (pour l'historique)
                if (niveauValidation === 'chef_cabinet' && req.user.id_agent) {
                    updateFields.push(`id_validateur_chef_cabinet = $${paramIndex}`);
                    updateValues.push(req.user.id_agent);
                    paramIndex++;
                }

                // Enregistrer le Ministre quand c'est lui qui valide (pour l'historique des demandes validées par le ministre)
                if (niveauValidation === 'ministre' && req.user.id_agent) {
                    updateFields.push(`id_ministre = $${paramIndex}`);
                    updateValues.push(req.user.id_agent);
                    paramIndex++;
                }

                // Si c'est une mutation et qu'une date d'effet est fournie, l'ajouter à la mise à jour
                if (demande.type_demande === 'mutation' && date_effet_mutation && (action === 'approuve' || !action)) {
                    updateFields.push(`date_debut = $${paramIndex}`);
                    updateValues.push(date_effet_mutation);
                    paramIndex++;
                    console.log(`📅 Mise à jour de la date d'effet de la mutation: ${date_effet_mutation}`);
                }

                const updateQuery = `
                UPDATE demandes 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
            `;
                updateValues.push(id_demande);

                try {
                    await db.query(updateQuery, updateValues);
                    console.log(`✅ Demande ${id_demande} mise à jour avec succès`);
                } catch (updateError) {
                    console.error('❌ Erreur lors de la mise à jour de la demande:', updateError);
                    throw new Error(`Erreur lors de la mise à jour de la demande: ${updateError.message}`);
                }

                // Si rejeté, finaliser la demande
                if (statutValue === 'rejete') {
                    // Finaliser la demande rejetée
                    await db.query(
                        'UPDATE demandes SET status = $1, niveau_actuel = $2, niveau_evolution_demande = $3, phase = $4 WHERE id = $5', ['rejete', 'finalise', `rejete_par_${niveauValidation}`, 'retour', id_demande]
                    );
                    console.log(`✅ Demande ${id_demande} rejetée et finalisée par ${niveauValidation}`);
                }
                // Si approuvé, gérer la phase aller ou retour
                else if (statutValue === 'approuve') {
                    // 🔹 CAS SPÉCIAL : validation par le Directeur des services extérieurs
                    // On force systématiquement le passage au DRH, sans finalisation.
                    if (niveauValidation === 'directeur_service_exterieur') {
                        try {
                            const phaseNext = 'aller';
                            const nextNiveauLocal = 'drh';
                            const nextEvolutionLocal = 'valide_par_directeur_service_exterieur';

                            // Mettre la demande en attente chez le DRH
                            const updateToDrhResult = await db.query(
                                `UPDATE demandes 
                                 SET niveau_actuel = $1,
                                     niveau_evolution_demande = $2,
                                     phase = $3,
                                     status = $4
                                 WHERE id = $5
                                 RETURNING id, status, niveau_actuel, niveau_evolution_demande, phase, statut_drh`,
                                [nextNiveauLocal, nextEvolutionLocal, phaseNext, 'en_attente', id_demande]
                            );
                            const demandeFinale = updateToDrhResult.rows[0] || null;

                            // Notifier les DRH du ministère de l'agent
                            try {
                                const demandeAgentQuery = `SELECT a.id_ministere FROM agents a WHERE a.id = $1`;
                                const demandeAgentResult = await db.query(demandeAgentQuery, [demande.id_agent]);
                                const idMinistereAgent = (demandeAgentResult.rows[0] && demandeAgentResult.rows[0].id_ministere) || null;

                                if (idMinistereAgent) {
                                    const drhQuery = `
                                        SELECT a.id AS id_agent
                                        FROM agents a
                                        JOIN utilisateurs u ON u.id_agent = a.id
                                        JOIN roles r ON r.id = u.id_role
                                        WHERE LOWER(r.nom) = 'drh' AND a.id_ministere = $1
                                    `;
                                    const drhResult = await db.query(drhQuery, [idMinistereAgent]);

                                    for (const row of drhResult.rows) {
                                        const notificationQueryForDRH = `
                                            INSERT INTO notifications_demandes (
                                                id_demande, id_agent_destinataire, type_notification, 
                                                titre, message, lu, date_creation
                                            ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                                        `;

                                        const titre = 'Nouvelle demande à valider';
                                        const message = `Une demande de ${demande.type_demande} nécessite votre validation au niveau DRH.`;

                                        await db.query(notificationQueryForDRH, [
                                            id_demande,
                                            row.id_agent,
                                            'nouvelle_demande',
                                            titre,
                                            message
                                        ]);
                                    }
                                }
                            } catch (notifyErr) {
                                console.error('Erreur lors de la notification aux DRH après validation DSE :', notifyErr);
                            }

                            // Réponse spécifique pour le cas DSE → DRH
                            return res.json({
                                success: true,
                                message: 'Demande approuvée avec succès',
                                demande_id: id_demande,
                                niveau_validation: niveauValidation,
                                prochain_niveau: nextNiveauLocal,
                                debug: {
                                    niveauValidation,
                                    nextNiveau: nextNiveauLocal,
                                    nextEvolutionNiveau: nextEvolutionLocal,
                                    shouldFinalize: false,
                                    validateurRole,
                                    validateurRoleLower,
                                    demandeInitiale: {
                                        niveau_evolution_demande: demande.niveau_evolution_demande,
                                        phase: demande.phase,
                                        statut_drh: demande.statut_drh
                                    },
                                    demandeFinale
                                },
                                demande: demandeFinale,
                                document_generated: false
                            });
                        } catch (dseError) {
                            console.error('❌ Erreur lors du traitement spécial Directeur service extérieur → DRH :', dseError);
                            // En cas d’erreur, on laisse continuer le flux normal pour ne pas bloquer,
                            // mais normalement ce bloc doit suffire.
                        }
                    }

                    // 🔹 CAS SPÉCIAL : validation par le Chef de cabinet
                    // La demande doit toujours passer au DRH (jamais être finalisée ici).
                    if (niveauValidation === 'chef_cabinet') {
                        try {
                            const phaseNext = 'aller';
                            const nextNiveauLocal = 'drh';
                            const nextEvolutionLocal = 'valide_par_chef_cabinet';

                            const updateToDrhResult = await db.query(
                                `UPDATE demandes 
                                 SET niveau_actuel = $1,
                                     niveau_evolution_demande = $2,
                                     phase = $3,
                                     status = $4
                                 WHERE id = $5
                                 RETURNING id, status, niveau_actuel, niveau_evolution_demande, phase, statut_drh`,
                                [nextNiveauLocal, nextEvolutionLocal, phaseNext, 'en_attente', id_demande]
                            );
                            const demandeFinale = updateToDrhResult.rows[0] || null;

                            // Optionnel : notifier les DRH du ministère concerné
                            try {
                                const demandeAgentQuery = `SELECT a.id_ministere FROM agents a WHERE a.id = $1`;
                                const demandeAgentResult = await db.query(demandeAgentQuery, [demande.id_agent]);
                                const idMinistereAgent = (demandeAgentResult.rows[0] && demandeAgentResult.rows[0].id_ministere) || null;

                                if (idMinistereAgent) {
                                    const drhQuery = `
                                        SELECT a.id AS id_agent
                                        FROM agents a
                                        JOIN utilisateurs u ON u.id_agent = a.id
                                        JOIN roles r ON r.id = u.id_role
                                        WHERE LOWER(r.nom) = 'drh' AND a.id_ministere = $1
                                    `;
                                    const drhResult = await db.query(drhQuery, [idMinistereAgent]);

                                    for (const row of drhResult.rows) {
                                        const notificationQueryForDRH = `
                                            INSERT INTO notifications_demandes (
                                                id_demande, id_agent_destinataire, type_notification, 
                                                titre, message, lu, date_creation
                                            ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                                        `;

                                        const titre = 'Nouvelle demande à valider (Chef de cabinet)';
                                        const message = `Une demande de ${demande.type_demande} validée par le Chef de cabinet nécessite votre validation au niveau DRH.`;

                                        await db.query(notificationQueryForDRH, [
                                            id_demande,
                                            row.id_agent,
                                            'nouvelle_demande',
                                            titre,
                                            message
                                        ]);
                                    }
                                }
                            } catch (notifyErr) {
                                console.error('Erreur lors de la notification aux DRH après validation Chef de cabinet :', notifyErr);
                            }

                            return res.json({
                                success: true,
                                message: 'Demande approuvée avec succès',
                                demande_id: id_demande,
                                niveau_validation: niveauValidation,
                                prochain_niveau: nextNiveauLocal,
                                debug: {
                                    niveauValidation,
                                    nextNiveau: nextNiveauLocal,
                                    nextEvolutionNiveau: nextEvolutionLocal,
                                    shouldFinalize: false,
                                    validateurRole,
                                    validateurRoleLower,
                                    demandeInitiale: {
                                        niveau_evolution_demande: demande.niveau_evolution_demande,
                                        phase: demande.phase,
                                        statut_drh: demande.statut_drh
                                    },
                                    demandeFinale
                                },
                                demande: demandeFinale,
                                document_generated: false
                            });
                        } catch (chefCabError) {
                            console.error('❌ Erreur lors du traitement spécial Chef de cabinet → DRH :', chefCabError);
                            // En cas d’erreur, on laisse continuer le flux normal pour ne pas bloquer.
                        }
                    }

                    // 🔹 Flux normal (tous les autres validateurs)
                    // Ne pas réinitialiser si le validateur a déjà défini la suite (ex: DG → DRH, chef de cabinet → DRH, etc.)
                    // On ne remet à zéro que si aucun prochain niveau n'a encore été calculé
                    if (niveauValidation !== 'directeur_general' && !nextNiveau) {
                        nextNiveau = null;
                        nextEvolutionNiveau = null;
                    }
                    let phase = demande.phase || 'aller'; // Par défaut phase aller
                    // documentGenerated est déclaré au début de la fonction, donc accessible ici

                    // Vérifier si on est en phase retour
                    if (demande.phase === 'retour') {
                        // Phase retour : remonter la hiérarchie vers l'agent
                        if (niveauValidation === 'ministre') {
                            // Ministre → Directeur Général
                            nextNiveau = 'directeur_general';
                            nextEvolutionNiveau = 'retour_ministre';
                        } else if (niveauValidation === 'directeur_general') {
                            // Directeur Général → Directeur Central
                            nextNiveau = 'directeur_central';
                            nextEvolutionNiveau = 'retour_directeur_general';
                        } else if (niveauValidation === 'directeur_central') {
                            // Directeur Central → Chef de Cabinet
                            nextNiveau = 'chef_cabinet';
                            nextEvolutionNiveau = 'retour_directeur_central';
                        } else if (niveauValidation === 'chef_cabinet') {
                            // Chef de Cabinet → Dir Cabinet
                            nextNiveau = 'dir_cabinet';
                            nextEvolutionNiveau = 'retour_chef_cabinet';
                        } else if (niveauValidation === 'dir_cabinet') {
                            // Dir Cabinet → Finalisation (pour la plupart des demandes après approbation finale)
                            nextNiveau = 'finalise';
                            nextEvolutionNiveau = 'retour_dir_cabinet';
                        } else if (niveauValidation === 'drh') {
                            // DRH → Finalisation directe (le chef de service n'intervient plus)
                            nextNiveau = 'finalise';
                            nextEvolutionNiveau = 'valide_par_drh';
                            phase = 'retour';
                        } else if (niveauValidation === 'directeur_service_exterieur') {
                            // Directeur des services extérieurs en phase retour → renvoie toujours vers le DRH (jamais de finalisation directe)
                            nextNiveau = 'drh';
                            nextEvolutionNiveau = 'valide_par_directeur_service_exterieur';
                            phase = 'aller';
                            console.log(`✅ Phase retour avec directeur_service_exterieur → Demande renvoyée au DRH`);
                        } else {
                            // Cas par défaut pour phase retour : finaliser si c'est une validation finale
                            console.warn(`⚠️ Cas non géré en phase retour pour niveauValidation=${niveauValidation}, finalisation par défaut`);
                            nextNiveau = 'finalise';
                            nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                            phase = 'retour';
                        }
                    } else {
                        // Phase aller : descendre la hiérarchie selon NOUVEAU WORKFLOW selon le rôle du demandeur
                        // 1. Agent → Sous-directeur → Directeur → DRH → Document généré → Transmis à l'agent
                        // OU Agent (directement lié à direction) → Directeur → DRH (ou directement DRH si directeur est DRH)
                        if (demandeurRoleLower === 'agent' || (!demandeurRoleResult.rows[0])) {
                            // Vérifier si l'agent est directement lié à une direction
                            // Le directeur est déterminé : rôle directeur ou rôles assimilés (directeur_central, gestionnaire_du_patrimoine, president_du_fond, responsble_cellule_de_passation)
                            const agentInfoQuery = `
                            SELECT 
                                a.id_sous_direction,
                                (SELECT dir_agent.id 
                                 FROM agents dir_agent
                                 JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                                 JOIN roles dir_role ON dir_user.id_role = dir_role.id
                                 WHERE dir_agent.id_direction = d.id 
                                 AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                                 LIMIT 1) as directeur_id,
                                (SELECT dir_agent.id 
                                 FROM agents dir_agent
                                 JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                                 JOIN roles dir_role ON dir_user.id_role = dir_role.id
                                 WHERE dir_agent.id_direction = d.id 
                                 AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                                 LIMIT 1) as directeur_agent_id,
                                (SELECT dir_role.nom 
                                 FROM agents dir_agent
                                 JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                                 JOIN roles dir_role ON dir_user.id_role = dir_role.id
                                 WHERE dir_agent.id_direction = d.id 
                                 AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                                 LIMIT 1) as directeur_role_nom
                            FROM agents a
                            LEFT JOIN directions d ON a.id_direction = d.id
                            WHERE a.id = $1
                        `;
                            const agentInfoResult = await db.query(agentInfoQuery, [demande.id_agent]);
                            const agentInfo = agentInfoResult.rows[0] || {};
                            const agentSansSousDirection = !agentInfo.id_sous_direction && agentInfo.directeur_id;
                            const directeurEstDRH = agentInfo.directeur_role_nom &&
                                (agentInfo.directeur_role_nom.toLowerCase() === 'drh' ||
                                    agentInfo.directeur_role_nom.toLowerCase() === 'drh');

                            // Le chef de service n'intervient plus dans le workflow
                            // Les demandes vont directement du niveau "soumis" au sous-directeur
                            if (niveauValidation === 'sous_directeur') {
                                // Vérifier si le sous-directeur est rattaché à une direction où le directeur est la DRH
                                const sousDirecteurNextQuery = `
                                    SELECT 
                                        a.id_direction,
                                        a.id_direction_generale,
                                        (SELECT dir_role.nom 
                                         FROM agents dir_agent
                                         JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                                         JOIN roles dir_role ON dir_user.id_role = dir_role.id
                                         WHERE dir_agent.id_direction = a.id_direction 
                                         AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                                         LIMIT 1) as directeur_role_nom
                                    FROM agents a
                                    WHERE a.id = (SELECT id_agent FROM demandes WHERE id = $1)
                                `;
                                const sousDirecteurNextResult = await db.query(sousDirecteurNextQuery, [id_demande]);
                                const sousDirecteurNextInfo = sousDirecteurNextResult.rows[0] || {};
                                const directeurEstDRH = sousDirecteurNextInfo.directeur_role_nom &&
                                    (sousDirecteurNextInfo.directeur_role_nom.toLowerCase() === 'drh');

                                const agentRattacheDirectementDG = !sousDirecteurNextInfo.id_direction && !!sousDirecteurNextInfo.id_direction_generale;

                                if (agentRattacheDirectementDG) {
                                    // Sous-direction rattachée directement à une Direction Générale (sans direction)
                                    // → Après validation du sous-directeur, la demande va au Directeur général, puis au DRH.
                                    nextNiveau = 'directeur_general';
                                    nextEvolutionNiveau = 'valide_par_directeur_general';
                                    console.log(`✅ Sous-directeur valide (agent rattaché directement à une DG) → Demande va chez Directeur général`);
                                } else if (directeurEstDRH) {
                                    // Sous-directeur rattaché à la direction de la DRH → Demande va directement au DRH
                                    nextNiveau = 'drh';
                                    nextEvolutionNiveau = 'valide_par_sous_directeur';
                                    console.log(`✅ Sous-directeur (rattaché à DRH) valide → Demande va directement chez DRH`);
                                } else {
                                    // Sous-directeur normal → Demande va chez Directeur
                                    nextNiveau = 'directeur';
                                    nextEvolutionNiveau = 'valide_par_sous_directeur';
                                    console.log(`✅ Sous-directeur valide → Demande va chez Directeur`);
                                }
                            } else if (niveauValidation === 'chef_service') {
                                // Chef de service a validé → la demande part au sous-directeur ou au directeur (jamais en finalisation ; seul le DRH finalise)
                                if (agentSansSousDirection) {
                                    if (directeurEstDRH) {
                                        nextNiveau = 'drh';
                                        nextEvolutionNiveau = 'valide_par_chef_service';
                                        console.log(`✅ Chef de service a validé → Demande va chez le DRH (agent sans sous-direction, directeur = DRH)`);
                                    } else {
                                        nextNiveau = 'directeur';
                                        nextEvolutionNiveau = 'valide_par_chef_service';
                                        console.log(`✅ Chef de service a validé → Demande va chez le Directeur`);
                                    }
                                } else {
                                    nextNiveau = 'sous_directeur';
                                    nextEvolutionNiveau = 'valide_par_chef_service';
                                    console.log(`✅ Chef de service a validé → Demande va chez le Sous-directeur`);
                                }
                            } else if (niveauValidation === 'directeur') {
                                // Directeur valide pour un agent (ou sous-directeur) :
                                // - si la direction n'a PAS de DG au-dessus (direction "simple") → passage par le DSE, puis DRH
                                // - si la direction est rattachée à une DG → aller directement au DRH (le DG n'intervient pas pour cet agent)
                                const dirDemandeurQuery = `
                                    SELECT dir.id_direction_generale
                                    FROM agents a
                                    JOIN directions dir ON a.id_direction = dir.id
                                    WHERE a.id = $1
                                `;
                                const dirDemandeurResult = await db.query(dirDemandeurQuery, [demande.id_agent]);
                                const directionSansDG = !dirDemandeurResult.rows[0] || dirDemandeurResult.rows[0].id_direction_generale == null;

                                if (directionSansDG) {
                                    // Cas 8 : Directeur d'une direction simple (sans DG au-dessus) → DSE → DRH
                                    nextNiveau = 'directeur_service_exterieur';
                                    nextEvolutionNiveau = 'valide_par_directeur_service_exterieur';
                                    console.log(`✅ Directeur valide (direction sans DG) → Demande va chez Directeur des services extérieurs (DSE)`);
                                } else {
                                    // Cas 1,2,5 : direction rattachée à une DG → le DG ne valide pas, la demande va directement au DRH
                                    nextNiveau = 'drh';
                                    nextEvolutionNiveau = 'valide_par_directeur';
                                    console.log(`✅ Directeur valide (direction rattachée à une DG) → Demande va directement au DRH (sans passer par le DG)`);
                                }
                            } else if (niveauValidation === 'drh') {
                                // DRH valide → Toujours finaliser directement (pas d'étape supplémentaire)
                                nextNiveau = 'finalise';
                                nextEvolutionNiveau = 'valide_par_drh';
                                phase = 'retour';
                                console.log(`✅ DRH valide → Finalisation directe`);
                            } else if (niveauValidation === 'chef_cabinet') {
                                // Chef de cabinet a validé (agent Cabinet) → Demande va au DRH (seul le DRH finalise)
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'valide_par_chef_cabinet';
                                console.log(`✅ Chef de cabinet a validé → Demande va chez le DRH (finalisation par le DRH)`);
                            } else if (niveauValidation === 'directeur_general') {
                                // Directeur général a validé (agent rattaché à la DG) → Demande va au DRH (seul le DRH finalise)
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'valide_par_directeur_general';
                                phase = 'aller';
                                console.log(`✅ Directeur général a validé → Demande va chez le DRH (finalisation par le DRH)`);
                            } else {
                                // Cas par défaut pour agent : utiliser la hiérarchie par défaut
                                console.warn(`⚠️ Cas non géré pour agent avec niveauValidation=${niveauValidation}, utilisation de la hiérarchie par défaut`);
                                const niveauHierarchy = {
                                    'sous_directeur': 'directeur',
                                    'directeur': 'drh',
                                    'drh': 'finalise',
                                    'dir_cabinet': 'ministre',
                                    'ministre': 'finalise',
                                    'chef_cabinet': 'drh',
                                    'directeur_general': 'drh'
                                };
                                nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                                nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                                if (nextNiveau === 'finalise') {
                                    phase = 'retour';
                                }
                            }
                        }
                        // 2. Sous-directeur → Directeur → DRH → Document généré → Transmis au sous-directeur
                        // OU Sous-directeur (rattaché à DRH) → DRH directement
                        else if (demandeurRoleLower === 'sous_directeur') {
                            if (niveauValidation === 'directeur') {
                                // Directeur valide une demande d'un sous-directeur :
                                // - direction sans DG → passage par le DSE, puis DRH
                                // - direction rattachée à une DG → aller directement au DRH
                                const dirDemandeurQuery = `
                                SELECT dir.id_direction_generale
                                FROM agents a
                                JOIN directions dir ON a.id_direction = dir.id
                                WHERE a.id = $1
                            `;
                                const dirDemandeurResult = await db.query(dirDemandeurQuery, [demande.id_agent]);
                                const directionSansDG = !dirDemandeurResult.rows[0] || dirDemandeurResult.rows[0].id_direction_generale == null;
                                if (directionSansDG) {
                                    // Cas 7 / 8 : direction simple sans DG → DSE
                                    nextNiveau = 'directeur_service_exterieur';
                                    nextEvolutionNiveau = 'valide_par_directeur_service_exterieur';
                                    console.log(`✅ Directeur valide (direction sans DG) → Demande va chez Directeur des services extérieurs (DSE)`);
                                } else {
                                    // Direction rattachée à une DG → DRH direct
                                    nextNiveau = 'drh';
                                    nextEvolutionNiveau = 'valide_par_directeur';
                                    console.log(`✅ Directeur valide (direction rattachée à une DG) → Demande va directement au DRH (sans DG intermédiaire)`);
                                }
                            } else if (niveauValidation === 'drh') {
                                // DRH valide → Document généré et transmis au sous-directeur
                                nextNiveau = 'finalise';
                                nextEvolutionNiveau = 'valide_par_drh';
                                phase = 'retour';
                            } else if (niveauValidation === 'sous_directeur') {
                                // Vérifier si le sous-directeur demandeur est rattaché à une direction où le directeur est la DRH
                                const sousDirecteurDemandeurNextQuery = `
                                    SELECT 
                                        a.id_direction,
                                        (SELECT dir_role.nom 
                                         FROM agents dir_agent
                                         JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                                         JOIN roles dir_role ON dir_user.id_role = dir_role.id
                                         WHERE dir_agent.id_direction = a.id_direction 
                                         AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                                         LIMIT 1) as directeur_role_nom
                                    FROM agents a
                                    WHERE a.id = $1
                                `;
                                const sousDirecteurDemandeurNextResult = await db.query(sousDirecteurDemandeurNextQuery, [demande.id_agent]);
                                const sousDirecteurDemandeurNextInfo = sousDirecteurDemandeurNextResult.rows[0] || {};
                                const directeurEstDRH = sousDirecteurDemandeurNextInfo.directeur_role_nom &&
                                    (sousDirecteurDemandeurNextInfo.directeur_role_nom.toLowerCase() === 'drh');

                                if (directeurEstDRH) {
                                    // Sous-directeur rattaché à la direction de la DRH → Demande va directement au DRH
                                    nextNiveau = 'drh';
                                    nextEvolutionNiveau = 'valide_par_sous_directeur';
                                    console.log(`✅ Sous-directeur (rattaché à DRH) valide → Demande va directement chez DRH`);
                                } else {
                                    // Sous-directeur normal → Demande va chez Directeur
                                    nextNiveau = 'directeur';
                                    nextEvolutionNiveau = 'valide_par_sous_directeur';
                                    console.log(`✅ Sous-directeur valide → Demande va chez Directeur`);
                                }
                            } else {
                                // Cas par défaut pour sous-directeur
                                console.warn(`⚠️ Cas non géré pour sous-directeur avec niveauValidation=${niveauValidation}, utilisation de la hiérarchie par défaut`);
                                const niveauHierarchy = {
                                    'sous_directeur': 'directeur',
                                    'directeur': 'drh',
                                    'drh': 'finalise',
                                    'dir_cabinet': 'ministre',
                                    'ministre': 'finalise'
                                };
                                nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                                nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                                if (nextNiveau === 'finalise') {
                                    phase = 'retour';
                                }
                            }
                        }
                        // 3. Directeur, DRH, Directeur général, Directeur central → Directeur de cabinet → Retour DRH
                        else if (demandeurRoleLower === 'directeur' || demandeurRoleLower === 'drh' ||
                            demandeurRoleLower === 'directeur_general' || demandeurRoleLower === 'directeur_central' ||
                            demandeurRoleLower === 'gestionnaire_du_patrimoine' || demandeurRoleLower === 'president_du_fond' || demandeurRoleLower === 'responsble_cellule_de_passation') {
                            // Si la demande vient d'être créée par un Directeur ou DRH, elle doit aller au Dir Cabinet
                            if (demande.niveau_evolution_demande === 'valide_par_directeur' || demande.niveau_evolution_demande === 'valide_par_drh') {
                                // Demande créée par un Directeur ou DRH → Va au Dir Cabinet
                                nextNiveau = 'dir_cabinet';
                                nextEvolutionNiveau = demande.niveau_evolution_demande === 'valide_par_drh' ? 'valide_par_drh' : 'valide_par_directeur';
                                console.log(`✅ Demande de ${demandeurRoleLower} → Va au Dir Cabinet (nextEvolutionNiveau: ${nextEvolutionNiveau})`);
                            } else if (niveauValidation === 'dir_cabinet') {
                                // Dir Cabinet valide → Retour vers DRH (comme ordre à exécuter)
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'retour_dir_cabinet';
                                phase = 'retour';
                            } else if (niveauValidation === 'drh' && demande.phase === 'retour') {
                                // DRH exécute l'ordre → Document généré et transmis au Directeur
                                nextNiveau = 'finalise';
                                nextEvolutionNiveau = 'valide_par_drh';
                                phase = 'retour';
                            } else if (niveauValidation === 'drh') {
                                // DRH valide → Finaliser directement
                                nextNiveau = 'finalise';
                                nextEvolutionNiveau = 'valide_par_drh';
                                phase = 'retour';
                            } else {
                                // Cas par défaut pour directeur/DRH
                                console.warn(`⚠️ Cas non géré pour ${demandeurRoleLower} avec niveauValidation=${niveauValidation}, utilisation de la hiérarchie par défaut`);
                                const niveauHierarchy = {
                                    'sous_directeur': 'directeur',
                                    'directeur': 'drh',
                                    'drh': 'finalise',
                                    'dir_cabinet': 'ministre',
                                    'ministre': 'finalise'
                                };
                                nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                                nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                                if (nextNiveau === 'finalise') {
                                    phase = 'retour';
                                }
                            }
                        }
                        // 4. Directeur de cabinet, Chef de cabinet → Ministre puis DRH (le DRH finalise)
                        else if (demandeurRoleLower === 'dir_cabinet' || demandeurRoleLower === 'chef_cabinet') {
                            if (niveauValidation === 'ministre') {
                                // Ministre valide → envoi au DRH (pas de finalisation par le Ministre)
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'valide_par_ministre';
                                phase = 'aller';
                                console.log(`✅ Ministre valide une demande provenant du ${demandeurRoleLower} → Demande envoyée au DRH (finalisation par le DRH)`);
                            } else {
                                // Cas par défaut pour directeur de cabinet
                                console.warn(`⚠️ Cas non géré pour ${demandeurRoleLower} avec niveauValidation=${niveauValidation}, utilisation de la hiérarchie par défaut`);
                                const niveauHierarchy = {
                                    'sous_directeur': 'directeur',
                                    'directeur': 'drh',
                                    'drh': 'finalise',
                                    'dir_cabinet': 'ministre',
                                    // Après le Ministre, la demande va au DRH (qui finalise)
                                    'ministre': 'drh'
                                };
                                nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                                nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                                if (nextNiveau === 'finalise') {
                                    phase = 'retour';
                                }
                            }
                        }
                        // Gestion par défaut pour les autres rôles
                        else {
                            // Le chef de service n'intervient plus dans le workflow
                            // Les demandes vont directement du niveau "soumis" au sous-directeur
                            if (niveauValidation === 'sous_directeur') {
                                // Sous-directeur valide → Demande va chez Directeur
                                nextNiveau = 'directeur';
                                nextEvolutionNiveau = 'valide_par_sous_directeur';
                                console.log(`✅ Sous-directeur valide → Demande va chez Directeur`);
                            } else if (niveauValidation === 'directeur') {
                                // Directeur valide (cas générique) :
                                // - direction sans DG → DSE puis DRH
                                // - direction rattachée à une DG → DRH direct (le DG n'intervient pas pour cet agent)
                                const dirDemandeurQuery = `
                                SELECT dir.id_direction_generale
                                FROM agents a
                                JOIN directions dir ON a.id_direction = dir.id
                                WHERE a.id = $1
                            `;
                                const dirDemandeurResult = await db.query(dirDemandeurQuery, [demande.id_agent]);
                                const directionSansDG = !dirDemandeurResult.rows[0] || dirDemandeurResult.rows[0].id_direction_generale == null;
                                if (directionSansDG) {
                                    nextNiveau = 'directeur_service_exterieur';
                                    nextEvolutionNiveau = 'valide_par_directeur_service_exterieur';
                                    console.log(`✅ Directeur valide (direction sans DG) → Demande va chez Directeur des services extérieurs (DSE)`);
                                } else {
                                    nextNiveau = 'drh';
                                    nextEvolutionNiveau = 'valide_par_directeur';
                                    console.log(`✅ Directeur valide (direction rattachée à une DG) → Demande va directement au DRH (sans DG)`);
                                }
                            } else if (niveauValidation === 'drh') {
                                // DRH valide → Toujours finaliser directement
                                nextNiveau = 'finalise';
                                nextEvolutionNiveau = 'valide_par_drh';
                                phase = 'retour';
                                console.log(`✅ DRH valide → Finalisation directe`);
                            } else if (niveauValidation === 'dir_cabinet') {
                                // Dir Cabinet valide (demande DG/DC/DRH/inspecteur_general) → DRH puis finalisation
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'valide_par_dir_cabinet';
                            } else if (niveauValidation === 'directeur_general') {
                                // Directeur général valide (ex: demande d'un DSE) → transmettre au DRH pour finalisation, jamais finaliser ici
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'valide_par_directeur_general';
                                phase = 'aller';
                                console.log(`✅ Directeur général a validé (demande DSE/autre) → Demande transmise au DRH pour finalisation`);
                            } else if (niveauValidation === 'ministre') {
                                // Le Ministre ne finalise plus : il envoie toujours au DRH
                                nextNiveau = 'drh';
                                nextEvolutionNiveau = 'valide_par_ministre';
                                phase = 'aller';
                                console.log(`✅ Ministre valide (cas générique) → Demande envoyée au DRH (finalisation par le DRH)`);
                            } else {
                                // Cas par défaut : si aucun cas ne correspond, logger une erreur mais définir une valeur par défaut
                                console.error(`⚠️ Cas non géré pour niveauValidation=${niveauValidation}, demandeurRole=${demandeurRoleLower}, phase=${demande.phase}`);
                                // Par défaut, si c'est une validation DRH, finaliser
                                if (niveauValidation === 'drh') {
                                    nextNiveau = 'finalise';
                                    nextEvolutionNiveau = 'valide_par_drh';
                                    phase = 'retour';
                                } else {
                                    // Pour les autres cas, essayer de déterminer le prochain niveau basé sur le niveau de validation
                                    const niveauHierarchy = {
                                        'sous_directeur': 'directeur',
                                        'directeur': 'drh',
                                        'drh': 'finalise',
                                        'dir_cabinet': 'ministre',
                                        'ministre': 'finalise',
                                        'directeur_general': 'drh'
                                    };
                                    nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                                    nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                                    if (nextNiveau === 'finalise') {
                                        phase = 'retour';
                                    }
                                    console.warn(`⚠️ Utilisation de la hiérarchie par défaut: ${niveauValidation} → ${nextNiveau}`);
                                }
                            }
                        }
                    }

                    console.log(`🔍 DEBUG: nextNiveau = ${nextNiveau}, nextEvolutionNiveau = ${nextEvolutionNiveau}, niveauValidation = ${niveauValidation}`);
                    console.log(`🔍 DEBUG: Contexte - demandeurRole: ${demandeurRole}, validateurRole: ${validateurRole}, niveau_evolution_demande: ${demande.niveau_evolution_demande}, phase: ${demande.phase}`);

                    // VÉRIFICATION SPÉCIALE : Si c'est un DRH qui valide, TOUJOURS finaliser
                    // Cette vérification doit se faire AVANT l'évaluation de shouldFinalize
                    if (niveauValidation === 'drh') {
                        if (nextNiveau !== 'finalise') {
                            console.log(`🔧 CORRECTION FORCÉE: DRH valide détecté (niveauValidation='${niveauValidation}') mais nextNiveau='${nextNiveau}' - FORCAGE à 'finalise'`);
                            console.log(`   Contexte: demandeurRole='${demandeurRole}', demande.niveau_evolution_demande='${demande.niveau_evolution_demande}', phase='${demande.phase}'`);
                            nextNiveau = 'finalise';
                            if (!nextEvolutionNiveau) {
                                nextEvolutionNiveau = 'valide_par_drh';
                            }
                            phase = 'retour';
                            console.log(`✅ Correction FORCÉE appliquée: nextNiveau='finalise', nextEvolutionNiveau='${nextEvolutionNiveau}', phase='retour'`);
                        } else {
                            console.log(`✅ DRH valide - nextNiveau est déjà 'finalise' - Pas de correction nécessaire`);
                        }
                    }

                    // Vérifier que nextNiveau et nextEvolutionNiveau sont définis
                    // Si ce n'est pas le cas, utiliser une valeur par défaut basée sur le niveau de validation
                    if (!nextNiveau || !nextEvolutionNiveau) {
                        console.warn('⚠️ nextNiveau ou nextEvolutionNiveau non défini, utilisation de la hiérarchie par défaut', {
                            nextNiveau,
                            nextEvolutionNiveau,
                            niveauValidation,
                            niveau_evolution_demande: demande.niveau_evolution_demande,
                            demandeurRole: demandeurRole,
                            phase: demande.phase,
                            statutValue
                        });

                        // Utiliser la hiérarchie par défaut
                        const niveauHierarchy = {
                            'sous_directeur': 'directeur',
                            'directeur': 'drh',
                            'drh': 'finalise',
                            'dir_cabinet': 'ministre',
                            'ministre': 'finalise',
                            'chef_cabinet': 'drh',
                            'directeur_general': 'drh',
                            'directeur_central': 'dir_cabinet',
                            // Le chef de service n'a jamais le droit de finaliser → envoi au sous-directeur/directeur
                            'chef_service': 'sous_directeur',
                            // Le directeur des services extérieurs envoie toujours au DRH, ne finalise jamais
                            'directeur_service_exterieur': 'drh',
                            // Rôles assimilés directeur (gestionnaire patrimoine, président fond, responsable cellule passation) → DRH
                            'gestionnaire_du_patrimoine': 'drh',
                            'president_du_fond': 'drh',
                            'responsble_cellule_de_passation': 'drh'
                        };

                        nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                        nextEvolutionNiveau = nextEvolutionNiveau || `valide_par_${niveauValidation}`;

                        // Si c'est une validation finale (DRH, ministre, etc.), finaliser directement
                        if (niveauValidation === 'drh' || niveauValidation === 'ministre' || nextNiveau === 'finalise') {
                            nextNiveau = 'finalise';
                            phase = 'retour';
                        }

                        console.log(`✅ Valeurs par défaut appliquées: nextNiveau=${nextNiveau}, nextEvolutionNiveau=${nextEvolutionNiveau}`);
                    }

                    // Si c'est une validation DRH, toujours finaliser et générer le document.
                    // IMPORTANT:
                    // - Si niveauValidation === 'drh', shouldFinalize DOIT être true
                    // - directeur_service_exterieur NE DOIT JAMAIS finaliser directement (il envoie toujours au DRH)
                    // - directeur_general ne finalise pas non plus : il envoie au DRH
                    shouldFinalize =
                        // Finalisation normale uniquement si ce n'est PAS le DSE ni le Directeur général
                        // Le chef de cabinet et le Ministre n'ont jamais le droit de finaliser : ils transmettent au DRH
                        (nextNiveau === 'finalise'
                            && niveauValidation !== 'directeur_service_exterieur'
                            && niveauValidation !== 'directeur_general'
                            && niveauValidation !== 'ministre') ||
                        niveauValidation === 'drh' ||
                        (niveauValidation === 'dir_cabinet' && demande.phase === 'retour');

                    console.log(`🔍 DEBUG: Évaluation shouldFinalize pour demande ${id_demande}:`, {
                        nextNiveau,
                        niveauValidation,
                        shouldFinalize,
                        demande_niveau_evolution: demande.niveau_evolution_demande,
                        demande_phase: demande.phase,
                        validateurRole: validateurRole,
                        validateurRoleLower: validateurRoleLower
                    });

                    // VÉRIFICATION CRITIQUE : Si c'est un DRH qui valide, FORCER shouldFinalize à true
                    if (niveauValidation === 'drh' && !shouldFinalize) {
                        console.error(`❌ ERREUR CRITIQUE: niveauValidation='drh' mais shouldFinalize=false - FORCAGE shouldFinalize à true`);
                        // Ne pas modifier shouldFinalize directement, mais s'assurer que nextNiveau est 'finalise'
                        if (nextNiveau !== 'finalise') {
                            nextNiveau = 'finalise';
                            if (!nextEvolutionNiveau) {
                                nextEvolutionNiveau = 'valide_par_drh';
                            }
                            phase = 'retour';
                            console.log(`✅ Correction d'urgence appliquée: nextNiveau='finalise'`);
                        }
                    }

                    // IMPORTANT : ne jamais finaliser quand le validateur est le DSE ou le directeur général (ils transmettent au DRH)
                    if ((shouldFinalize || nextNiveau === 'finalise') && niveauValidation !== 'directeur_service_exterieur' && niveauValidation !== 'directeur_general') {
                        // S'assurer que nextNiveau est 'finalise' pour la génération du document
                        if (nextNiveau !== 'finalise') {
                            console.log(`🔄 Ajustement: nextNiveau changé de '${nextNiveau}' à 'finalise' pour génération du document (niveauValidation: ${niveauValidation})`);
                            nextNiveau = 'finalise';
                            if (!nextEvolutionNiveau) {
                                nextEvolutionNiveau = `valide_par_${niveauValidation}`;
                            }
                            phase = 'retour';
                        }
                        // VÉRIFICATION SPÉCIALE : Si c'est un DRH qui valide, s'assurer que nextEvolutionNiveau est 'valide_par_drh'
                        if (niveauValidation === 'drh' && nextEvolutionNiveau !== 'valide_par_drh') {
                            console.log(`🔄 Correction: nextEvolutionNiveau changé de '${nextEvolutionNiveau}' à 'valide_par_drh' pour validation DRH`);
                            nextEvolutionNiveau = 'valide_par_drh';
                        }
                        console.log(`🔍 DEBUG: Finalisation de la demande ${id_demande} (type: ${demande.type_demande}, niveau: ${niveauValidation})`);
                        console.log(`🔍 DEBUG: nextNiveau=${nextNiveau}, nextEvolutionNiveau=${nextEvolutionNiveau}, phase=${phase}`);

                        // Finaliser la demande
                        const finaliseResult = await db.query(
                            'UPDATE demandes SET status = $1, niveau_actuel = $2, niveau_evolution_demande = $3, phase = $4 WHERE id = $5 RETURNING id, status, niveau_actuel, niveau_evolution_demande, phase', ['approuve', 'finalise', nextEvolutionNiveau, phase, id_demande]
                        );

                        if (finaliseResult.rows.length > 0) {
                            const finalisedDemande = finaliseResult.rows[0];
                            console.log(`✅ DEBUG: Demande ${id_demande} finalisée avec succès:`, {
                                id: finalisedDemande.id,
                                status: finalisedDemande.status,
                                niveau_actuel: finalisedDemande.niveau_actuel,
                                niveau_evolution_demande: finalisedDemande.niveau_evolution_demande,
                                phase: finalisedDemande.phase
                            });

                            try {
                                await updateAgentPositionFromDemandeApproval(db, demande);
                            } catch (positionError) {
                                // Ne doit pas bloquer la finalisation de la demande.
                                console.error(`❌ Erreur lors de la mise à jour de la position de l'agent pour la demande ${id_demande}:`, positionError);
                            }
                        } else {
                            console.error(`❌ ERREUR: La demande ${id_demande} n'a pas été trouvée lors de la finalisation`);
                        }

                        console.log(`🔍 DEBUG: Demande ${id_demande} finalisée, début génération document...`);

                        // Générer le document pour TOUTES les demandes finalisées (tous types, tous rôles)
                        const DocumentGenerationService = require('../services/DocumentGenerationService');

                        // Réinitialiser documentGenerated (déjà déclaré au début de la fonction)
                        documentGenerated = null;

                        try {
                            console.log(`📄 Génération du document pour la demande ${id_demande} (type: ${demande.type_demande}, validateur: ${niveauValidation})`);

                            // Récupérer les informations complètes de l'agent et du validateur
                            const agentQuery = `
                            SELECT 
                                a.*,
                                s.libelle as service_nom,
                                m.nom as ministere_nom,
                                m.sigle as ministere_sigle,
                                sig.signature_url AS signature_url,
                                sig.signature_path AS signature_path,
                                sig.signature_type AS signature_type
                            FROM agents a
                            LEFT JOIN directions s ON a.id_direction = s.id
                            LEFT JOIN ministeres m ON a.id_ministere = m.id
                            LEFT JOIN agent_signatures sig ON sig.id_agent = a.id AND sig.is_active = true
                            WHERE a.id = $1
                        `;
                            const agentResult = await db.query(agentQuery, [demande.id_agent]);

                            const validateurQuery = `
                            SELECT 
                                a.*,
                                s.libelle as service_nom,
                                m.nom as ministere_nom,
                                m.sigle as ministere_sigle,
                                sig.id AS signature_id,
                                sig.signature_url AS signature_url,
                                sig.signature_path AS signature_path,
                                sig.signature_type AS signature_type
                            FROM agents a
                            LEFT JOIN directions s ON a.id_direction = s.id
                            LEFT JOIN ministeres m ON a.id_ministere = m.id
                            LEFT JOIN agent_signatures sig ON sig.id_agent = a.id AND sig.is_active = true
                            WHERE a.id = $1
                        `;
                            const validateurResult = await db.query(validateurQuery, [validateurId]);

                            if (agentResult.rows.length > 0 && validateurResult.rows.length > 0) {
                                const agent = agentResult.rows[0];
                                const validateur = validateurResult.rows[0];

                                // Générer le document selon le type de demande
                                if (demande.type_demande === 'attestation_presence') {
                                    documentGenerated = await DocumentGenerationService.generateAttestationPresence(demande, agent, validateur);
                                    console.log(`✅ Document d'attestation de présence généré avec succès: ${documentGenerated.id}`);
                                } else if (demande.type_demande === 'attestation_travail') {
                                    documentGenerated = await DocumentGenerationService.generateAttestationTravail(demande, agent, validateur);
                                    console.log(`✅ Document d'attestation de travail généré avec succès: ${documentGenerated.id}`);
                                } else if (demande.type_demande === 'absence') {
                                    documentGenerated = await DocumentGenerationService.generateAutorisationAbsence(demande, agent, validateur);
                                    console.log(`✅ Document d'autorisation d'absence généré avec succès: ${documentGenerated.id}`);

                                    // DÉDUCTION AUTOMATIQUE DES JOURS DE CONGÉS LORS DE LA FINALISATION D'UNE DEMANDE D'ABSENCE (ancien système avec dates)
                                    try {
                                        const pool = require('../config/database');

                                        // Déterminer le nombre de jours à déduire
                                        let joursADeduire = 0;

                                        if (demande.nombre_jours) {
                                            // Utiliser le nombre_jours si disponible (nouveau système)
                                            joursADeduire = parseInt(demande.nombre_jours);
                                            console.log(`📅 Déduction pour la demande d'absence ${demande.id} (Agent: ${demande.id_agent})`);
                                            console.log(`   Nombre de jours demandés: ${joursADeduire} jours`);
                                            console.log(`   Motif: ${demande.motif_conge || 'Non spécifié'}`);
                                        } else if (demande.date_debut && demande.date_fin) {
                                            // Calculer depuis les dates (ancien système)
                                            joursADeduire = await CongesController.calculerJoursOuvres(demande.date_debut, demande.date_fin);
                                            console.log(`📅 Calcul des jours ouvrés pour la demande d'absence ${demande.id} (Agent: ${demande.id_agent})`);
                                            console.log(`   Période: ${demande.date_debut} au ${demande.date_fin}`);
                                            console.log(`   Jours ouvrés calculés: ${joursADeduire} jours`);
                                        } else {
                                            throw new Error('Impossible de déterminer le nombre de jours: ni nombre_jours ni dates fournies');
                                        }

                                        const anneeCourante = demande.date_debut ? new Date(demande.date_debut).getFullYear() : new Date().getFullYear();

                                        // S'assurer que les congés de l'agent existent pour l'année
                                        await CongesController.createOrUpdateConges(demande.id_agent, anneeCourante);

                                        // Récupérer l'état actuel des congés
                                        const currentCongesQuery = `
                                        SELECT jours_alloues, jours_pris, jours_restants 
                                        FROM agent_conges
                                        WHERE id_agent = $1 AND annee = $2
                                    `;
                                        const currentCongesResult = await pool.query(currentCongesQuery, [demande.id_agent, anneeCourante]);

                                        if (currentCongesResult.rows.length === 0) {
                                            throw new Error('Aucun enregistrement de congés trouvé pour cet agent');
                                        }

                                        const currentConges = currentCongesResult.rows[0];
                                        const isCongeExceptionnel = demande.motif_conge === 'congé exceptionnel';

                                        // Calculer les nouveaux jours pris et restants
                                        const nouveauxJoursPris = currentConges.jours_pris + joursADeduire;
                                        let nouveauxJoursRestants = currentConges.jours_alloues - nouveauxJoursPris;
                                        let soldeNegatif = 0;

                                        // Gestion spéciale pour les congés exceptionnels
                                        if (isCongeExceptionnel && nouveauxJoursRestants < 0) {
                                            // Pour les congés exceptionnels, on permet le solde négatif
                                            soldeNegatif = Math.abs(nouveauxJoursRestants);
                                            console.log(`⚠️ Congé exceptionnel: solde négatif de ${soldeNegatif} jours sera reporté sur l'année suivante`);
                                            console.log(`   Raison: ${demande.raison_exceptionnelle || 'Non spécifiée'}`);

                                            // Le solde négatif sera appliqué sur l'année suivante
                                            // On met à jour pour cette année avec le solde négatif

                                        } else if (!isCongeExceptionnel && nouveauxJoursRestants < 0) {
                                            // Pour les congés normaux, bloquer si pas assez de jours
                                            const errorMessage = `Impossible de finaliser la demande: L'agent n'a pas assez de jours de congés restants. Jours restants: ${currentConges.jours_restants}, Jours demandés: ${joursADeduire}`;
                                            console.error(`❌ ${errorMessage}`);
                                            console.error(`   Détails: Jours alloués: ${currentConges.jours_alloues}, Jours déjà pris: ${currentConges.jours_pris}`);
                                            throw new Error(errorMessage);
                                        }

                                        // Mettre à jour les congés de l'année en cours
                                        const updateCongesQuery = `
                                        UPDATE agent_conges
                                        SET 
                                            jours_pris = $3,
                                            jours_restants = $4,
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE id_agent = $1 AND annee = $2
                                        RETURNING *
                                    `;

                                        const updateResult = await pool.query(updateCongesQuery, [
                                            demande.id_agent,
                                            anneeCourante,
                                            nouveauxJoursPris,
                                            nouveauxJoursRestants
                                        ]);

                                        if (updateResult.rows.length > 0) {
                                            const congesMisAJour = updateResult.rows[0];
                                            console.log(`✅ Congés mis à jour pour l'agent ${demande.id_agent}:`);
                                            console.log(`   - ${joursADeduire} jours déduits`);
                                            console.log(`   - Jours pris: ${currentConges.jours_pris} → ${congesMisAJour.jours_pris}`);
                                            console.log(`   - Jours restants: ${currentConges.jours_restants} → ${congesMisAJour.jours_restants}`);

                                            // Si c'est un congé exceptionnel avec solde négatif, enregistrer la dette pour l'année suivante
                                            if (isCongeExceptionnel && soldeNegatif > 0) {
                                                // Enregistrer la dette dans la colonne dette_annee_suivante de l'année en cours
                                                const updateDetteQuery = `
                                                UPDATE agent_conges
                                                SET 
                                                    dette_annee_suivante = $3,
                                                    updated_at = CURRENT_TIMESTAMP
                                                WHERE id_agent = $1 AND annee = $2
                                                RETURNING *
                                            `;

                                                await pool.query(updateDetteQuery, [
                                                    demande.id_agent,
                                                    anneeCourante,
                                                    soldeNegatif
                                                ]);

                                                console.log(`✅ Dette enregistrée pour l'année suivante: ${soldeNegatif} jours`);
                                                console.log(`   Raison: ${demande.raison_exceptionnelle || 'Non spécifiée'}`);
                                                console.log(`   L'agent aura ${30 - soldeNegatif} jours au lieu de 30 pour l'année ${anneeCourante + 1}`);

                                                // Mettre à jour la demande avec le solde après déduction
                                                const updateDemandeQuery = `
                                                UPDATE demandes
                                                SET jours_restants_apres_deduction = $2
                                                WHERE id = $1
                                            `;
                                                await pool.query(updateDemandeQuery, [demande.id, nouveauxJoursRestants]);
                                            } else {
                                                // Pour les congés normaux, mettre à jour jours_restants_apres_deduction
                                                const updateDemandeQuery = `
                                                UPDATE demandes
                                                SET jours_restants_apres_deduction = $2
                                                WHERE id = $1
                                            `;
                                                await pool.query(updateDemandeQuery, [demande.id, nouveauxJoursRestants]);
                                            }
                                        } else {
                                            throw new Error('Aucune ligne mise à jour dans agent_conges');
                                        }
                                    } catch (congesError) {
                                        console.error('❌ Erreur lors de la mise à jour des congés pour la demande d\'absence:', congesError);
                                        console.error('   Stack trace:', congesError.stack);

                                        // Si l'erreur est liée à des jours insuffisants (pour congés normaux), bloquer la finalisation
                                        if (congesError.message && (
                                                congesError.message.includes('pas assez') ||
                                                congesError.message.includes('assez de jours') ||
                                                (congesError.message.includes('jours restants') && demande.motif_conge !== 'congé exceptionnel')
                                            )) {
                                            // Re-lancer l'erreur pour bloquer la finalisation
                                            throw congesError;
                                        }

                                        // Pour les autres erreurs (ex: erreur de connexion DB), on continue la finalisation
                                        // mais on log l'erreur pour pouvoir la corriger manuellement si nécessaire
                                        console.warn('⚠️ Erreur non bloquante lors de la mise à jour des congés - la finalisation continue');
                                    }
                                } else if (demande.type_demande === 'sortie_territoire') {
                                    // Pour les sorties de territoire, générer un document spécifique
                                    documentGenerated = await DocumentGenerationService.generateAutorisationSortieTerritoire(demande, agent, validateur);
                                    console.log(`✅ Document d'autorisation de sortie du territoire généré avec succès: ${documentGenerated.id}`);
                                } else if (demande.type_demande === 'certificat_cessation') {
                                    // Pour les certificats de cessation, générer un document spécifique
                                    console.log(`🔍 DEBUG: Génération du certificat de cessation pour la demande ${demande.id}`);
                                    documentGenerated = await DocumentGenerationService.generateCertificatCessation(demande, agent, validateur);
                                    console.log(`✅ Document de certificat de cessation généré avec succès: ${documentGenerated.id}`);

                                    // Déduction des jours de congés sur l'année choisie (congé annuel, partiel, exceptionnel)
                                    if (demande.motif_conge && demande.nombre_jours) {
                                        try {
                                            const pool = require('../config/database');
                                            const nombreJours = parseInt(demande.nombre_jours, 10);
                                            const anneeChoisie = demande.annee_au_titre_conge != null ?
                                                parseInt(demande.annee_au_titre_conge, 10) :
                                                new Date(demande.agree_date_cessation || demande.date_debut || Date.now()).getFullYear();
                                            const isCongeExceptionnel = String(demande.motif_conge).toLowerCase().includes('exceptionnel');

                                            console.log(`📅 Déduction des jours de congés pour la demande de cessation ${demande.id} (Agent: ${demande.id_agent})`);
                                            console.log(`   Année choisie: ${anneeChoisie}, Nombre de jours: ${nombreJours}, Motif: ${demande.motif_conge}`);

                                            await CongesController.createOrUpdateConges(demande.id_agent, anneeChoisie);
                                            const congesResult = await pool.query(
                                                `SELECT id, jours_alloues, jours_pris, jours_restants FROM agent_conges WHERE id_agent = $1 AND annee = $2`, [demande.id_agent, anneeChoisie]
                                            );
                                            if (congesResult.rows.length === 0) {
                                                throw new Error(`Aucun enregistrement de congés pour l'année ${anneeChoisie}`);
                                            }
                                            const conges = congesResult.rows[0];
                                            const joursRestants = parseInt(conges.jours_restants, 10) || 0;
                                            const joursAlloues = parseInt(conges.jours_alloues, 10) || 30;
                                            const joursPris = parseInt(conges.jours_pris, 10) || 0;

                                            if (joursRestants < nombreJours && !isCongeExceptionnel) {
                                                throw new Error(`L'agent n'a pas assez de jours de congés pour l'année ${anneeChoisie}. Disponible: ${joursRestants} jour(s), Demandé: ${nombreJours} jour(s).`);
                                            }

                                            const nouveauxJoursPris = joursPris + nombreJours;
                                            let nouveauxJoursRestants = joursAlloues - nouveauxJoursPris;
                                            let detteAnneeSuivante = 0;
                                            if (nouveauxJoursRestants < 0 && isCongeExceptionnel) {
                                                detteAnneeSuivante = Math.abs(nouveauxJoursRestants);
                                                nouveauxJoursRestants = 0;
                                            } else if (nouveauxJoursRestants < 0) {
                                                nouveauxJoursRestants = 0;
                                            }

                                            await pool.query(
                                                `UPDATE agent_conges SET jours_pris = $3, jours_restants = $4, 
                                             dette_annee_suivante = COALESCE(dette_annee_suivante, 0) + $5, updated_at = CURRENT_TIMESTAMP
                                             WHERE id_agent = $1 AND annee = $2`, [demande.id_agent, anneeChoisie, nouveauxJoursPris, nouveauxJoursRestants, detteAnneeSuivante]
                                            );
                                            await pool.query(
                                                `UPDATE demandes SET jours_restants_apres_deduction = $2 WHERE id = $1`, [demande.id, nouveauxJoursRestants]
                                            );
                                            console.log(`✅ Congés déduits pour l'agent ${demande.id_agent} (année ${anneeChoisie}): ${nombreJours} jour(s). Restants: ${nouveauxJoursRestants}${detteAnneeSuivante ? `, dette année suivante: ${detteAnneeSuivante}` : ''}.`);
                                    } catch (congesError) {
                                        console.error('❌ Erreur lors de la déduction des congés pour la demande de cessation:', congesError);
                                        if (congesError.message && (congesError.message.includes('pas assez') || congesError.message.includes('Disponible'))) {
                                            throw congesError;
                                        }
                                        console.warn('⚠️ Erreur non bloquante - la finalisation continue');
                                    }
                                }
                            } else if (demande.type_demande === 'certificat_reprise_service') {
                                // Pour les certificats de reprise de service, générer un document spécifique
                                console.log(`🔍 DEBUG: Génération du certificat de reprise de service pour la demande ${demande.id}`);
                                documentGenerated = await DocumentGenerationService.generateCertificatRepriseService(demande, agent, validateur);
                                console.log(`✅ Document de certificat de reprise de service généré avec succès: ${documentGenerated.id}`);
                            } else if (demande.type_demande === 'certificat_non_jouissance_conge') {
                                // Pour les certificats de non jouissance de congé, générer un document spécifique
                                console.log(`🔍 DEBUG: Génération du certificat de non jouissance de congé pour la demande ${demande.id}`);
                                documentGenerated = await DocumentGenerationService.generateCertificatNonJouissanceConge(demande, agent, validateur);
                                console.log(`✅ Document de certificat de non jouissance de congé généré avec succès: ${documentGenerated.id}`);
                            } else if (demande.type_demande === 'mutation') {
                                // Pour les mutations, générer une note de service de mutation
                                console.log(`🔍 DEBUG: Génération de la note de service de mutation pour la demande ${demande.id}`);
                                
                                // Extraire les informations de mutation depuis la description (format JSON)
                                // La date d'effet est la date de validation (date_debut qui a été mise à jour avec CURRENT_TIMESTAMP)
                                let mutationOptions = {
                                    id_direction_destination: null,
                                    direction_destination: null,
                                    date_effet: demande.date_debut || new Date(),
                                    motif: null
                                };
                                
                                // Parser les données de mutation depuis description
                                try {
                                    if (demande.description && demande.description.startsWith('MUTATION_DATA:')) {
                                        const jsonStr = demande.description.replace('MUTATION_DATA:', '');
                                        const mutationData = JSON.parse(jsonStr);
                                        mutationOptions = {
                                            id_direction_destination: mutationData.id_direction_destination,
                                            direction_destination: mutationData.direction_destination,
                                            // Utiliser date_debut (qui contient la date de validation) comme date d'effet
                                            date_effet: demande.date_debut || new Date(),
                                            motif: mutationData.motif
                                        };
                                    }
                                } catch (e) {
                                    console.warn('⚠️ Erreur lors de l\'extraction des infos de mutation:', e);
                                }
                                
                                documentGenerated = await DocumentGenerationService.generateMutation(demande, agent, validateur, mutationOptions);
                                console.log(`✅ Document de note de service de mutation généré avec succès: ${documentGenerated.id}`);
                                
                                // Mettre à jour la direction de l'agent si la mutation est approuvée
                                if (mutationOptions.id_direction_destination) {
                                    try {
                                        await db.query(
                                            `UPDATE agents SET id_direction = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                                            [mutationOptions.id_direction_destination, demande.id_agent]
                                        );
                                        console.log(`✅ Direction de l'agent ${demande.id_agent} mise à jour vers la direction ${mutationOptions.id_direction_destination}`);
                                    } catch (updateError) {
                                        console.error('❌ Erreur lors de la mise à jour de la direction de l\'agent:', updateError);
                                        // Ne pas faire échouer la génération du document si la mise à jour échoue
                                    }
                                }
                            } else {
                                // Cas par défaut : générer un document générique pour les types non spécifiquement gérés
                                console.log(`⚠️ Type de demande non spécifiquement géré: ${demande.type_demande}, génération d'un document générique`);
                                try {
                                    // Pour les autres types, générer une autorisation d'absence par défaut
                                    documentGenerated = await DocumentGenerationService.generateAutorisationAbsence(demande, agent, validateur);
                                    console.log(`✅ Document générique généré avec succès: ${documentGenerated.id}`);
                                } catch (defaultError) {
                                    console.error(`❌ Erreur lors de la génération du document générique pour ${demande.type_demande}:`, defaultError);
                                    // Ne pas bloquer la finalisation si la génération échoue
                                }
                            }
                            
                            // Vérifier que le document a été généré
                            if (!documentGenerated || !documentGenerated.id) {
                                console.error(`❌ ATTENTION: Aucun document généré pour la demande ${id_demande} de type ${demande.type_demande}`);
                                console.error(`   Validateur: ${niveauValidation}, Agent: ${demande.id_agent}`);
                                console.error(`   Vérifiez les logs ci-dessus pour voir l'erreur de génération`);
                            } else {
                                console.log(`✅ Document généré avec succès pour la demande ${id_demande}:`, {
                                    document_id: documentGenerated.id,
                                    type_demande: demande.type_demande,
                                    validateur: niveauValidation,
                                    document_path: documentGenerated.path || documentGenerated.url || documentGenerated.chemin_fichier || 'N/A'
                                });
                                
                                // Vérifier que le document existe réellement dans la base de données
                                try {
                                    const docCheckQuery = `SELECT id, id_demande, type_document, chemin_fichier FROM documents_autorisation WHERE id = $1`;
                                    const docCheckResult = await db.query(docCheckQuery, [documentGenerated.id]);
                                    if (docCheckResult.rows.length > 0) {
                                        console.log(`✅ Document vérifié dans la base de données:`, docCheckResult.rows[0]);
                                        // S'assurer que documentGenerated a les bonnes propriétés
                                        if (!documentGenerated.type_document) {
                                            documentGenerated.type_document = docCheckResult.rows[0].type_document;
                                        }
                                    } else {
                                        console.error(`❌ ERREUR: Le document ${documentGenerated.id} n'existe pas dans la table documents_autorisation`);
                                        // Marquer le document comme non généré si il n'existe pas en base
                                        documentGenerated = null;
                                    }
                                } catch (docCheckError) {
                                    console.error(`❌ Erreur lors de la vérification du document dans la base:`, docCheckError);
                                    // En cas d'erreur de vérification, considérer que le document n'a pas été généré
                                    documentGenerated = null;
                                }
                            }
                        } else {
                            // Agent ou validateur non trouvé - ne pas générer de document
                            console.error(`❌ ERREUR: Impossible de générer le document - Agent ou validateur non trouvé`);
                            console.error(`   Agent trouvé: ${agentResult.rows.length > 0}, Validateur trouvé: ${validateurResult.rows.length > 0}`);
                            console.error(`   Agent ID: ${demande.id_agent}, Validateur ID: ${validateurId}`);
                            documentGenerated = null;
                        } // Fermer le bloc if (agentResult.rows.length > 0 && validateurResult.rows.length > 0)
                        } catch (docGenError) {
                            console.error(`❌ ERREUR lors de la génération du document pour la demande ${id_demande}:`, docGenError);
                            console.error(`❌ Stack trace:`, docGenError.stack);
                            // Marquer explicitement que le document n'a pas été généré
                            documentGenerated = null;
                            // Ne pas faire échouer la validation si la génération du document échoue
                            // Mais vérifier que la demande est bien finalisée
                            try {
                                const checkDemandeQuery = `SELECT id, status, niveau_actuel, niveau_evolution_demande FROM demandes WHERE id = $1`;
                                const checkDemandeResult = await db.query(checkDemandeQuery, [id_demande]);
                                if (checkDemandeResult.rows.length > 0) {
                                    const checkedDemande = checkDemandeResult.rows[0];
                                    console.log(`🔍 Vérification de la demande après erreur de génération:`, {
                                        id: checkedDemande.id,
                                        status: checkedDemande.status,
                                        niveau_actuel: checkedDemande.niveau_actuel,
                                        niveau_evolution_demande: checkedDemande.niveau_evolution_demande
                                    });
                                    if (checkedDemande.status !== 'approuve') {
                                        console.error(`❌ ERREUR CRITIQUE: La demande ${id_demande} n'a pas le status 'approuve' après finalisation. Status actuel: ${checkedDemande.status}`);
                                    }
                                }
                            } catch (checkError) {
                                console.error(`❌ Erreur lors de la vérification de la demande:`, checkError);
                            }
                        }

                        // NOUVELLE LOGIQUE : Si c'est une demande d'absence, de sortie du territoire ou certificat de cessation validée par le DRH, notifier le sous-directeur
                        // Cette notification se fait APRÈS la génération du document (même si elle a échoué)
                        if ((demande.type_demande === 'absence' || demande.type_demande === 'sortie_territoire' || demande.type_demande === 'certificat_cessation') && niveauValidation === 'drh') {
                            try {
                                // Récupérer les informations de l'agent pour la notification
                                const agentForNotificationQuery = `
                                    SELECT a.prenom, a.nom
                                    FROM agents a
                                    WHERE a.id = $1
                                `;
                                const agentForNotificationResult = await db.query(agentForNotificationQuery, [demande.id_agent]);
                                const agentForNotification = agentForNotificationResult.rows[0] || { prenom: '', nom: '' };
                                
                                const sousDirecteurQuery = `
                                    SELECT a.id AS id_agent
                                    FROM agents a
                                    JOIN utilisateurs u ON u.id_agent = a.id
                                    JOIN roles r ON r.id = u.id_role
                                    WHERE LOWER(r.nom) = 'sous_directeur' 
                                    AND a.id_direction = (SELECT id_direction FROM agents WHERE id = $1)
                                    AND a.id_ministere = (SELECT id_ministere FROM agents WHERE id = $1)
                                `;
                                const sousDirecteurResult = await db.query(sousDirecteurQuery, [demande.id_agent]);

                                for (const row of sousDirecteurResult.rows) {
                                    const notificationQueryForSousDir = `
                                        INSERT INTO notifications_demandes (
                                            id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation
                                        ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                                    `;

                                    let titre, message;
                                    if (demande.type_demande === 'certificat_cessation') {
                                        titre = 'Information - Certificat de cessation validé par le DRH';
                                        message = `Le certificat de cessation que vous avez transmis au DRH a été validé et finalisé. Le document de certificat a été généré automatiquement et transmis au demandeur.`;
                                    } else if (demande.type_demande === 'sortie_territoire') {
                                        titre = 'Information - Autorisation de sortie du territoire validée par le DRH';
                                        message = `L'autorisation de sortie du territoire que vous avez transmise au DRH a été validée et finalisée. L'agent ${agentForNotification.prenom} ${agentForNotification.nom} a été autorisé à sortir du territoire pour se rendre au ${demande.lieu || 'pays de destination'} du ${new Date(demande.date_debut).toLocaleDateString('fr-FR')} au ${new Date(demande.date_fin).toLocaleDateString('fr-FR')}. Le document d'autorisation a été généré automatiquement et transmis au demandeur.`;
                                    } else {
                                        titre = 'Information - Demande d\'absence validée par le DRH';
                                        message = `La demande d'absence que vous avez transmise au DRH a été validée et finalisée. Le document d'autorisation a été généré automatiquement et transmis au demandeur.`;
                                    }

                                    await db.query(notificationQueryForSousDir, [
                                        id_demande,
                                        row.id_agent,
                                        'information',
                                        titre,
                                        message
                                    ]);

                                    console.log(`✅ Notification envoyée au sous-directeur ${row.id_agent} pour la demande ${demande.type_demande} finalisée`);
                                }
                            } catch (notifyError) {
                                console.error('❌ Erreur lors de la notification au sous-directeur:', notifyError);
                            }
                        }
                    } else {
                        // VÉRIFICATION CRITIQUE : Si c'est un DRH qui valide, FORCER la finalisation même si on est dans le bloc else
                        let demandeFinaliseeDansElse = false;
                        if (niveauValidation === 'drh') {
                            console.error(`❌ ERREUR CRITIQUE: DRH valide mais code entré dans bloc else (non finalisation) - FORCAGE finalisation`);
                            console.error(`   nextNiveau: ${nextNiveau}, shouldFinalize: ${shouldFinalize}, niveauValidation: ${niveauValidation}`);
                            
                            // Forcer la finalisation
                            nextNiveau = 'finalise';
                            if (!nextEvolutionNiveau) {
                                nextEvolutionNiveau = 'valide_par_drh';
                            }
                            phase = 'retour';
                            
                            // Finaliser la demande
                            const finaliseResult = await db.query(
                                'UPDATE demandes SET status = $1, niveau_actuel = $2, niveau_evolution_demande = $3, phase = $4 WHERE id = $5 RETURNING id, status, niveau_actuel, niveau_evolution_demande, phase', 
                                ['approuve', 'finalise', nextEvolutionNiveau, phase, id_demande]
                            );
                            
                            if (finaliseResult.rows.length > 0) {
                                console.log(`✅ Demande ${id_demande} FORCÉE à finaliser (correction d'urgence pour DRH)`);

                                try {
                                    await updateAgentPositionFromDemandeApproval(db, demande);
                                } catch (positionError) {
                                    // Ne doit pas bloquer la finalisation de la demande.
                                    console.error(`❌ Erreur lors de la mise à jour de la position de l'agent (correction d'urgence) pour la demande ${id_demande}:`, positionError);
                                }
                                
                                // Générer le document maintenant
                                try {
                                    const DocumentGenerationService = require('../services/DocumentGenerationService');
                                    const agentQuery = `
                                        SELECT a.*, s.libelle as service_nom, m.nom as ministere_nom, m.sigle as ministere_sigle
                                        FROM agents a
                                        LEFT JOIN directions s ON a.id_direction = s.id
                                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                                        WHERE a.id = $1
                                    `;
                                    const validateurQuery = `
                                        SELECT a.*, s.libelle as service_nom, m.nom as ministere_nom, m.sigle as ministere_sigle
                                        FROM agents a
                                        LEFT JOIN directions s ON a.id_direction = s.id
                                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                                        WHERE a.id = $1
                                    `;
                                    const agentResult = await db.query(agentQuery, [demande.id_agent]);
                                    const validateurResult = await db.query(validateurQuery, [validateurId]);
                                    
                                    if (agentResult.rows.length > 0 && validateurResult.rows.length > 0) {
                                        const agent = agentResult.rows[0];
                                        const validateur = validateurResult.rows[0];
                                        
                                        // Récupérer la demande mise à jour
                                        const demandeUpdated = finaliseResult.rows[0];
                                        const demandeWithData = { ...demande, ...demandeUpdated };
                                        
                                        // Générer le document selon le type
                                        if (demande.type_demande === 'attestation_presence') {
                                            documentGenerated = await DocumentGenerationService.generateAttestationPresence(demandeWithData, agent, validateur);
                                        } else if (demande.type_demande === 'absence') {
                                            documentGenerated = await DocumentGenerationService.generateAutorisationAbsence(demandeWithData, agent, validateur);
                                        } else if (demande.type_demande === 'certificat_cessation') {
                                            documentGenerated = await DocumentGenerationService.generateCertificatCessation(demandeWithData, agent, validateur);
                                        } else if (demande.type_demande === 'sortie_territoire') {
                                            documentGenerated = await DocumentGenerationService.generateAutorisationSortieTerritoire(demandeWithData, agent, validateur);
                                        }
                                        
                                        if (documentGenerated && documentGenerated.id) {
                                            console.log(`✅ Document généré avec succès (correction d'urgence): ${documentGenerated.id}`);
                                        }
                                    }
                                } catch (docError) {
                                    console.error(`❌ Erreur lors de la génération du document (correction d'urgence):`, docError);
                                }
                                
                                demandeFinaliseeDansElse = true;
                                console.log(`✅ Demande finalisée dans le bloc else (correction DRH) - Saut du reste du bloc else`);
                            }
                        }
                        
                        // Passer au niveau suivant (cas normal, pas DRH ou si la demande n'a pas été finalisée dans le bloc ci-dessus)
                        if (!demandeFinaliseeDansElse) {
                            // IMPORTANT: Maintenir le statut à 'en_attente' pour que la demande soit visible au niveau suivant
                            console.log(`🔄 Mise à jour de la demande ${id_demande} pour passer au niveau suivant (NON finalisée):`);
                            console.log(`   - nextNiveau: ${nextNiveau}`);
                            console.log(`   - nextEvolutionNiveau: ${nextEvolutionNiveau}`);
                            console.log(`   - niveauValidation: ${niveauValidation}`);
                            console.log(`   - shouldFinalize: ${shouldFinalize}`);
                            console.log(`   - phase: ${phase}`);
                            console.log(`   - status: 'en_attente' (maintenu)`);
                            console.log(`   ⚠️ ATTENTION: La demande n'est pas finalisée - le document ne sera PAS généré`);
                            
                            // Quand la demande passe au directeur (après validation sous-directeur), assigner id_validateur_directeur
                            // (directeur ou directeur_central de la direction de l'agent) pour que le directeur central voie bien la demande
                            let idValidateurDirecteurToSet = null;
                            if (nextNiveau === 'directeur' && nextEvolutionNiveau === 'valide_par_sous_directeur') {
                                try {
                                    const dirValidateurQuery = `
                                        SELECT dir_agent.id
                                        FROM demandes d
                                        JOIN agents a ON d.id_agent = a.id
                                        JOIN directions dir ON a.id_direction = dir.id
                                        JOIN agents dir_agent ON dir_agent.id_direction = dir.id
                                        JOIN utilisateurs dir_user ON dir_agent.id = dir_user.id_agent
                                        JOIN roles dir_role ON dir_user.id_role = dir_role.id
                                        WHERE d.id = $1
                                        AND LOWER(REPLACE(REPLACE(REPLACE(TRIM(dir_role.nom), ' ', '_'), 'é', 'e'), 'è', 'e')) IN ('directeur', 'drh', 'directeur_central', 'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation')
                                        LIMIT 1
                                    `;
                                    const dirValidateurResult = await db.query(dirValidateurQuery, [id_demande]);
                                    if (dirValidateurResult.rows.length > 0) {
                                        idValidateurDirecteurToSet = dirValidateurResult.rows[0].id;
                                        console.log(`   - id_validateur_directeur assigné: ${idValidateurDirecteurToSet} (sous-direction → directeur/directeur central)`);
                                    }
                                } catch (err) {
                                    console.warn('Récupération id_validateur_directeur après validation sous-directeur:', err.message);
                                }
                            }
                            
                            const updateFields = ['niveau_actuel = $1', 'niveau_evolution_demande = $2', 'phase = $3', 'status = $5'];
                            const updateParams = [nextNiveau, nextEvolutionNiveau, phase, id_demande, 'en_attente'];
                            if (idValidateurDirecteurToSet != null) {
                                updateFields.push('id_validateur_directeur = $6');
                                updateParams.push(idValidateurDirecteurToSet);
                            }
                            const updateResult = await db.query(
                                `UPDATE demandes SET ${updateFields.join(', ')} WHERE id = $4 RETURNING id, niveau_actuel, niveau_evolution_demande, phase, status`,
                                updateParams
                            );
                            
                            if (updateResult.rows.length > 0) {
                                const updatedDemande = updateResult.rows[0];
                                console.log(`✅ Demande ${id_demande} mise à jour avec succès:`, updatedDemande);
                                console.log(`✅ État final: niveau_actuel=${updatedDemande.niveau_actuel}, niveau_evolution_demande=${updatedDemande.niveau_evolution_demande}, status=${updatedDemande.status}, phase=${updatedDemande.phase}`);
                                
                                // Vérifier que la mise à jour est correcte pour le DRH
                                if (nextNiveau === 'drh') {
                                    if (updatedDemande.niveau_actuel !== 'drh') {
                                        console.error(`❌ ERREUR: La demande devrait avoir niveau_actuel='drh' mais a ${updatedDemande.niveau_actuel}`);
                                    }
                                    if (updatedDemande.status !== 'en_attente') {
                                        console.error(`❌ ERREUR: La demande devrait avoir status='en_attente' mais a ${updatedDemande.status}`);
                                    }
                                    const okEvolution = updatedDemande.niveau_evolution_demande === 'valide_par_directeur' || updatedDemande.niveau_evolution_demande === 'valide_par_directeur_service_exterieur';
                                    if (!okEvolution) {
                                        console.error(`❌ ERREUR: La demande devrait avoir niveau_evolution_demande='valide_par_directeur' ou 'valide_par_directeur_service_exterieur' mais a ${updatedDemande.niveau_evolution_demande}`);
                                    }
                                }
                            } else {
                                console.error(`❌ Aucune ligne mise à jour pour la demande ${id_demande}`);
                            }

                            // Notifications selon le niveau suivant
                            try {
                                if (nextNiveau === 'drh') {
                                    console.log(`🔔 Notification: Demande ${id_demande} va être notifiée aux DRH du ministère`);
                                    // Si on passe au DRH, notifier le(s) DRH du ministère de l'agent
                                    const demandeAgentQuery = `SELECT a.id_ministere FROM agents a WHERE a.id = $1`;
                                    const demandeAgentResult = await db.query(demandeAgentQuery, [demande.id_agent]);
                                    const idMinistereAgent = (demandeAgentResult.rows[0] && demandeAgentResult.rows[0].id_ministere) || null;

                                    if (idMinistereAgent) {
                                        // Trouver les DRH de ce ministère
                                        const drhQuery = `
                                            SELECT a.id AS id_agent
                                            FROM agents a
                                            JOIN utilisateurs u ON u.id_agent = a.id
                                            JOIN roles r ON r.id = u.id_role
                                            WHERE LOWER(r.nom) = 'drh' AND a.id_ministere = $1
                                        `;
                                        const drhResult = await db.query(drhQuery, [idMinistereAgent]);

                                        for (const row of drhResult.rows) {
                                            const notificationQueryForDRH = `
                                                INSERT INTO notifications_demandes (
                                                    id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation
                                                ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                                            `;

                                            const titre = 'Nouvelle demande à valider';
                                            const message = `Une demande de ${demande.type_demande} nécessite votre validation au niveau DRH.`;

                                            await db.query(notificationQueryForDRH, [
                                                id_demande,
                                                row.id_agent,
                                                'nouvelle_demande',
                                                titre,
                                                message
                                            ]);
                                        }
                                    }
                                }
                            } catch (notifyErr) {
                                console.error('Erreur lors de la notification:', notifyErr);
                            }
                        }
                    }
            } else if (statutValue === 'rejete') {
                // Rejeter la demande
                await db.query(
                    'UPDATE demandes SET status = $1, niveau_evolution_demande = $2, phase = $3 WHERE id = $4', ['rejete', 'rejete', demande.phase || 'aller', id_demande]
                );
            }

            // Enregistrer dans le workflow
            // Vérifier que niveauValidation est valide avant l'insertion
            console.log(`🔍 DEBUG: Tentative d'insertion dans workflow_demandes avec niveauValidation: ${niveauValidation}`);
            
            const workflowQuery = `
                INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                VALUES ($1, $2, $3, $4, $5)
            `;

            try {
                await db.query(workflowQuery, [id_demande, niveauValidation, validateurId, statutValue, commentaire]);
                console.log(`✅ Enregistrement dans workflow_demandes réussi pour niveauValidation: ${niveauValidation}`);
            } catch (workflowError) {
                console.error(`❌ Erreur lors de l'insertion dans workflow_demandes:`, workflowError);
                console.error(`❌ Détails: niveauValidation=${niveauValidation}, validateurId=${validateurId}, action=${statutValue}`);
                // Ne pas faire échouer la validation si l'enregistrement du workflow échoue
                // mais logger l'erreur pour déboguer
            }

            // Créer une notification pour l'agent concerné par la demande
            try {
                let notificationTitre = '';
                let notificationMessage = '';
                let notificationType = '';

                if (statutValue === 'approuve') {
                    notificationType = 'demande_approuvee';
                    notificationTitre = 'Demande approuvée';

                    // Pour les attestations de présence validées par le DRH, créer une notification spécifique
                    if (demande.type_demande === 'attestation_presence' && niveauValidation === 'drh') {
                        notificationTitre = 'Attestation de présence validée par le DRH';
                        notificationMessage = `Votre demande d'attestation de présence a été validée par le DRH. Votre document d'attestation de présence a été généré automatiquement et est maintenant disponible dans votre espace.`;
                        if (commentaire) {
                            notificationMessage += ` Commentaire du DRH: ${commentaire}`;
                        }
                    } else {
                        // Message standard pour tous les cas avec détails de la validation
                        const niveauNom = {
                            'chef_service': 'Chef de Service',
                            'sous_directeur': 'Sous-Directeur',
                            'directeur': 'Directeur',
                            'drh': 'DRH',
                            'dir_cabinet': 'Directeur de Cabinet',
                            'chef_cabinet': 'Chef de Cabinet',
                            'directeur_central': 'Directeur Central',
                            'directeur_general': 'Directeur Général',
                            'ministre': 'Ministre',
                            'gestionnaire_du_patrimoine': 'Gestionnaire du patrimoine',
                            'president_du_fond': 'Président du fond',
                            'responsble_cellule_de_passation': 'Responsable cellule de passation'
                        };

                        // Récupérer le nom du validateur pour personnaliser le message
                        let validateurNom = niveauNom[niveauValidation] || niveauValidation;
                        try {
                            const validateurInfoQuery = `
                                SELECT prenom, nom, fonction_actuelle
                                FROM agents
                                WHERE id = $1
                            `;
                            const validateurInfoResult = await db.query(validateurInfoQuery, [validateurId]);
                            if (validateurInfoResult.rows.length > 0) {
                                const validateurInfo = validateurInfoResult.rows[0];
                                validateurNom = `${validateurInfo.prenom} ${validateurInfo.nom} (${niveauNom[niveauValidation] || niveauValidation})`;
                            }
                        } catch (err) {
                            console.error('Erreur lors de la récupération du nom du validateur:', err);
                        }

                        const typeDemandeLabel = {
                            'absence': 'd\'absence',
                            'sortie_territoire': 'de sortie du territoire',
                            'attestation_travail': 'd\'attestation de travail',
                            'attestation_presence': 'd\'attestation de présence',
                            'certificat_cessation': 'de certificat de cessation',
                            'certificat_reprise_service': 'de certificat de reprise de service',
                            'certificat_non_jouissance_conge': 'de certificat de non jouissance de congé',
                            'autorisation_conges': 'd\'autorisation de congé',
                            'mutation': 'de mutation'
                        };

                        notificationTitre = `Demande approuvée par le ${niveauNom[niveauValidation] || niveauValidation}`;
                        notificationMessage = `✅ Votre demande ${typeDemandeLabel[demande.type_demande] || demande.type_demande} a été approuvée par ${validateurNom}.\n\n`;

                        // Ajouter l'information sur la prochaine étape
                        if (demande.niveau_evolution_demande === 'valide_par_drh' || demande.niveau_evolution_demande === 'finalise') {
                            notificationMessage += `🎉 Votre demande a été finalisée avec succès ! Le document est maintenant disponible dans votre espace "Mes Documents".`;
                        } else if (nextNiveau) {
                            const prochainNiveauNom = niveauNom[nextNiveau] || nextNiveau;
                            notificationMessage += `📋 Votre demande est maintenant transmise au ${prochainNiveauNom} pour validation.`;
                        } else {
                            notificationMessage += `📋 Votre demande a été traitée avec succès.`;
                        }

                        if (commentaire) {
                            notificationMessage += `\n\n💬 Commentaire du validateur : ${commentaire}`;
                        }
                    }
                } else if (statutValue === 'rejete') {
                    notificationType = 'demande_rejetee';

                    const niveauNom = {
                        'chef_service': 'Chef de Service',
                        'sous_directeur': 'Sous-Directeur',
                        'directeur': 'Directeur',
                        'drh': 'DRH',
                        'dir_cabinet': 'Directeur de Cabinet',
                        'chef_cabinet': 'Chef de Cabinet',
                        'directeur_central': 'Directeur Central',
                        'directeur_general': 'Directeur Général',
                        'ministre': 'Ministre',
                        'gestionnaire_du_patrimoine': 'Gestionnaire du patrimoine',
                        'president_du_fond': 'Président du fond',
                        'responsble_cellule_de_passation': 'Responsable cellule de passation'
                    };

                    notificationTitre = `Demande rejetée par le ${niveauNom[niveauValidation] || niveauValidation}`;
                    // Le motif est maintenant obligatoire, donc il sera toujours présent
                    notificationMessage = `❌ Votre demande de ${demande.type_demande} a été rejetée par le ${niveauNom[niveauValidation] || niveauValidation}.`;
                    notificationMessage += `\n\n📋 Motif du rejet : ${commentaire || 'Aucun motif spécifié'}`;
                }

                if (notificationType) {
                    const notificationQuery = `
                        INSERT INTO notifications_demandes (
                            id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation
                        ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                    `;

                    await db.query(notificationQuery, [
                        id_demande,
                        demande.id_agent,
                        notificationType,
                        notificationTitre,
                        notificationMessage
                    ]);

                    console.log(`Notification créée pour l'agent ${demande.id_agent}: ${notificationTitre}`);
                }
            } catch (notificationError) {
                console.error('Erreur lors de la création de la notification:', notificationError);
                // Ne pas faire échouer la validation si la notification échoue
            }

            // Générer le document d'autorisation si la demande d'absence est approuvée par le DRH

            // Préparer la réponse
            const actionForMessage = statutValue === 'approuve' ? 'approuvée' : 'rejetée';
            
            // Vérification finale : s'assurer que nextNiveau est défini pour les demandes approuvées
            if (statutValue === 'approuve' && (!nextNiveau || !nextEvolutionNiveau)) {
                console.warn(`⚠️ nextNiveau ou nextEvolutionNiveau non défini pour la demande ${id_demande} après validation - application de la hiérarchie par défaut`, {
                    nextNiveau,
                    nextEvolutionNiveau,
                    niveauValidation,
                    statutValue
                });
                
                // Utiliser la hiérarchie par défaut
                const niveauHierarchy = {
                    'sous_directeur': 'directeur',
                    'directeur': 'drh',
                    'drh': 'finalise',
                    'dir_cabinet': 'ministre',
                    'ministre': 'finalise',
                    'chef_cabinet': 'drh',
                    'directeur_general': 'dir_cabinet',
                    'directeur_central': 'dir_cabinet'
                };
                
                nextNiveau = niveauHierarchy[niveauValidation] || 'finalise';
                nextEvolutionNiveau = nextEvolutionNiveau || `valide_par_${niveauValidation}`;
                
                // Si c'est une validation finale (DRH, ministre, etc.), finaliser directement (pas chef_cabinet : il transmet au DRH)
                if (niveauValidation === 'drh' || niveauValidation === 'ministre' || nextNiveau === 'finalise') {
                    nextNiveau = 'finalise';
                }
                
                console.log(`✅ Valeurs par défaut appliquées en vérification finale: nextNiveau=${nextNiveau}, nextEvolutionNiveau=${nextEvolutionNiveau}`);
            }
            
            // Log avant de construire la réponse
            console.log(`🔍 DEBUG: Construction de la réponse - niveauValidation: ${niveauValidation}, nextNiveau: ${nextNiveau}, validateurRole: ${validateurRole}`);
            
            // Récupérer l'état final de la demande pour l'inclure dans la réponse
            let demandeFinale = null;
            try {
                const demandeFinaleQuery = await db.query(
                    'SELECT id, status, niveau_actuel, niveau_evolution_demande, phase, statut_drh FROM demandes WHERE id = $1',
                    [id_demande]
                );
                if (demandeFinaleQuery.rows.length > 0) {
                    demandeFinale = demandeFinaleQuery.rows[0];
                }
            } catch (err) {
                console.error('❌ Erreur lors de la récupération de l\'état final de la demande:', err);
            }
            
            const response = {
                success: true,
                message: `Demande ${actionForMessage} avec succès`,
                demande_id: id_demande,
                niveau_validation: niveauValidation || 'unknown',
                prochain_niveau: nextNiveau || 'finalise',
                // Informations de débogage pour le frontend
                debug: {
                    niveauValidation: niveauValidation,
                    nextNiveau: nextNiveau,
                    nextEvolutionNiveau: nextEvolutionNiveau,
                    shouldFinalize: shouldFinalize,
                    validateurRole: validateurRole,
                    validateurRoleLower: validateurRoleLower,
                    documentGenerated: documentGenerated ? {
                        id: documentGenerated.id,
                        type_document: documentGenerated.type_document,
                        titre: documentGenerated.titre
                    } : null,
                    demandeInitiale: {
                        niveau_evolution_demande: demande.niveau_evolution_demande,
                        phase: demande.phase,
                        statut_drh: demande.statut_drh
                    },
                    demandeFinale: demandeFinale
                },
                // Inclure l'état de la demande dans la réponse principale
                demande: demandeFinale
            };
            
            // S'assurer que nextNiveau est défini dans la réponse (devrait toujours être le cas maintenant)
            if (!nextNiveau && statutValue === 'approuve') {
                console.error(`❌ ERREUR CRITIQUE: nextNiveau est toujours null pour la demande ${id_demande} après toutes les vérifications`);
                response.prochain_niveau = 'finalise';
            } else {
                response.prochain_niveau = nextNiveau || 'finalise';
            }

            // Ajouter les informations du document si généré ET vérifié dans la base de données
            if (documentGenerated && documentGenerated.id) {
                // Vérifier une dernière fois que le document existe réellement dans la base de données
                try {
                    const finalDocCheckQuery = `SELECT id, type_document, titre FROM documents_autorisation WHERE id = $1`;
                    const finalDocCheckResult = await db.query(finalDocCheckQuery, [documentGenerated.id]);
                    
                    if (finalDocCheckResult.rows.length > 0) {
                        const docInDb = finalDocCheckResult.rows[0];
                        response.document_generated = true;
                        response.document_id = documentGenerated.id;
                        response.document_titre = documentGenerated.titre || docInDb.titre;
                        response.document_type = documentGenerated.type_document || docInDb.type_document;

                        const docType = response.document_type;
                        if (docType === 'attestation_presence') {
                            response.message += '. Un document d\'attestation de présence a été généré automatiquement.';
                        } else if (docType === 'certificat_cessation') {
                            response.message += '. Un document de certificat de cessation a été généré automatiquement.';
                        } else if (docType === 'certificat_non_jouissance_conge') {
                            response.message += '. Un document de certificat de non jouissance de congé a été généré automatiquement.';
                        } else if (docType === 'note_de_service_mutation') {
                            response.message += '. Une note de service de mutation a été générée automatiquement.';
                        } else if (docType === 'certificat_reprise_service') {
                            response.message += '. Un document de certificat de reprise de service a été généré automatiquement.';
                        } else if (docType === 'autorisation_sortie_territoire') {
                            response.message += '. Un document d\'autorisation de sortie du territoire a été généré automatiquement.';
                        } else {
                            response.message += '. Un document a été généré automatiquement.';
                        }
                        
                        console.log(`✅ Document confirmé dans la base de données - ID: ${documentGenerated.id}, Type: ${docType}`);
                    } else {
                        console.error(`❌ ERREUR: Le document ${documentGenerated.id} n'existe pas dans documents_autorisation - ne pas informer le frontend`);
                        // Ne pas ajouter le message de succès si le document n'existe pas
                        response.document_generated = false;
                    }
                } catch (finalCheckError) {
                    console.error(`❌ Erreur lors de la vérification finale du document:`, finalCheckError);
                    // En cas d'erreur, ne pas dire au frontend que le document a été généré
                    response.document_generated = false;
                }
            } else {
                // Document non généré - ne pas ajouter de message
                console.log(`⚠️ Aucun document généré pour la demande ${id_demande} - documentGenerated:`, documentGenerated);
                response.document_generated = false;
            }

            res.json(response);

        } catch (error) {
            console.error('❌ Erreur lors de la validation de la demande:', error);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Demande ID:', id_demande);
            console.error('❌ Validateur ID:', req.user?.id_agent);
            console.error('❌ User ID:', req.user?.id);
            console.error('❌ Action:', req.body?.action);
            console.error('❌ Erreur message:', error.message);
            console.error('❌ Erreur name:', error.name);
            
            // Log des informations de la demande si disponibles
            if (id_demande) {
                try {
                    const demandeDebugQuery = 'SELECT id, type_demande, niveau_evolution_demande, phase, id_agent FROM demandes WHERE id = $1';
                    const demandeDebugResult = await db.query(demandeDebugQuery, [id_demande]);
                    if (demandeDebugResult.rows.length > 0) {
                        console.error('❌ État de la demande:', demandeDebugResult.rows[0]);
                    }
                } catch (debugError) {
                    console.error('❌ Erreur lors de la récupération des infos de debug:', debugError);
                }
            }
            
            // Si l'erreur est liée à des jours de congés insuffisants, renvoyer un message clair
            if (error.message && (
                error.message.includes('pas assez') || 
                error.message.includes('assez de jours') ||
                error.message.includes('jours restants') ||
                error.message.includes('Impossible de finaliser')
            )) {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                    details: {
                        message: 'L\'agent n\'a pas assez de jours de congés restants pour finaliser cette demande d\'absence.'
                    }
                });
            }
            
            // Si l'erreur est liée à la base de données
            if (error.message && (
                error.message.includes('ECONNREFUSED') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('database') ||
                error.message.includes('connection') ||
                error.message.includes('timeout')
            )) {
                return res.status(503).json({
                    success: false,
                    error: 'Service temporairement indisponible. Erreur de connexion à la base de données.',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            // Si l'erreur est liée à la détermination du niveau de validation
            if (error.message && (
                error.message.includes('Impossible de déterminer le niveau de validation') ||
                error.message.includes('niveau de validation non déterminé')
            )) {
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Impossible de déterminer le niveau de validation pour cette demande. Contactez l\'administrateur.',
                    details: process.env.NODE_ENV === 'development' ? {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    } : undefined
                });
            }
            
            // Pour les autres erreurs, renvoyer une erreur avec plus de détails
            const errorResponse = {
                success: false,
                error: 'Erreur interne du serveur lors de la validation de la demande',
                errorMessage: error.message || 'Erreur inconnue'
            };
            
            // Toujours inclure le message d'erreur même en production pour faciliter le débogage
            if (process.env.NODE_ENV === 'development') {
                errorResponse.details = {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    demandeId: id_demande,
                    validateurId: req.user?.id_agent
                };
            }
            
            res.status(500).json(errorResponse);
        }
    }

    // Récupérer l'historique d'une demande
    static async getHistoriqueDemande(req, res) {
        try {
            const { id_demande } = req.params;

            const query = `
                SELECT h.*, u.username as modifie_par_nom
                FROM demandes_historique h
                LEFT JOIN utilisateurs u ON h.modifie_par = u.id
                WHERE h.id_demande = $1
                ORDER BY h.date_modification DESC
            `;

            const result = await db.query(query, [id_demande]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les statistiques des demandes
    static async getStatistiquesDemandes(req, res) {
        try {
            const { id_agent } = req.params;

            const query = `
                SELECT 
                    COUNT(*) as total_demandes,
                    COUNT(CASE WHEN status = 'en_attente' THEN 1 END) as en_attente,
                    COUNT(CASE WHEN status = 'approuve' THEN 1 END) as approuvees,
                    COUNT(CASE WHEN status = 'rejete' THEN 1 END) as rejetees,
                    COUNT(CASE WHEN type_demande = 'absence' THEN 1 END) as absences,
                    COUNT(CASE WHEN type_demande = 'sortie_territoire' THEN 1 END) as sorties,
                    COUNT(CASE WHEN type_demande = 'attestation_travail' THEN 1 END) as attestations
                FROM demandes 
                WHERE id_agent = $1
            `;

            const result = await db.query(query, [id_agent]);

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Suivi des demandes pour l'agent
    static async getDemandesSuivi(req, res) {
        try {
            const { id_agent } = req.params;
            const dateOutputTimeZone = process.env.APP_TIMEZONE || 'Africa/Libreville';
            const toLocalDateOnlyStr = (value) => {
                if (!value) return null;
                if (typeof value === 'string') {
                    const raw = value.trim();
                    if (!raw) return null;
                    // Si c'est une date pure (sans heure), renvoyer telle quelle.
                    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
                    if (dateOnly) return dateOnly[1];
                    const parsed = new Date(raw);
                    if (Number.isNaN(parsed.getTime())) return null;
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: dateOutputTimeZone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }).format(parsed);
                }
                const d = value instanceof Date ? value : new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return new Intl.DateTimeFormat('en-CA', {
                    timeZone: dateOutputTimeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(d);
            };

            const query = `
                SELECT 
                    d.*,
                    a.prenom, a.nom, a.matricule, a.email,
                    fa.designation_poste as fonction_actuelle,
                    s.libelle as service_nom, m.nom as ministere_nom,
                    f.libele as fonction_libelle,
                    CASE 
                        WHEN d.phase = 'aller' THEN
                            CASE d.niveau_evolution_demande
                                WHEN 'soumis' THEN 
                                    CASE d.niveau_actuel
                                        WHEN 'directeur_central' THEN 'En attente de validation par le directeur central'
                                        WHEN 'directeur' THEN 'En attente de validation par le directeur'
                                        WHEN 'directeur_service_exterieur' THEN 'En attente de validation par le directeur des services extérieurs'
                                        WHEN 'directeur_general' THEN 'En attente de validation par le directeur général'
                                        WHEN 'drh' THEN 'En attente de validation par le DRH'
                                        WHEN 'sous_directeur' THEN 'En attente de validation par le sous-directeur'
                                        ELSE 'En attente de validation'
                                    END
                                WHEN 'valide_par_chef_service' THEN 'En attente de validation par le sous-directeur'
                                WHEN 'valide_par_sous_directeur' THEN 'En attente de validation par le DRH'
                                WHEN 'valide_par_superieur' THEN 'En attente de validation par le DRH'
                                WHEN 'valide_par_drh' THEN 
                                    CASE d.type_demande
                                        WHEN 'attestation_presence' THEN 'En attente de finalisation'
                                        WHEN 'attestation_travail' THEN 'En attente de finalisation'
                                        WHEN 'sortie_territoire' THEN 'En attente de validation par le ministre'
                                        ELSE 'En attente de validation par le directeur de cabinet'
                                    END
                                WHEN 'valide_par_dir_cabinet' THEN 'En attente de validation par le ministre'
                                WHEN 'valide_par_chef_cabinet' THEN 'En attente de validation par le ministre'
                                WHEN 'valide_par_directeur_central' THEN 'En attente de validation par le directeur de cabinet'
                                WHEN 'valide_par_directeur_general' THEN 'En attente de validation par le directeur de cabinet'
                                WHEN 'valide_par_ministre' THEN 'En attente de retour'
                            END
                        WHEN d.phase = 'retour' THEN
                            CASE d.niveau_evolution_demande
                                WHEN 'retour_ministre' THEN 'Retour du ministre vers le DRH'
                                WHEN 'retour_drh' THEN 'Retour du DRH vers le chef de service'
                                WHEN 'retour_chef_service' THEN 'Retour du chef de service vers vous'
                            END
                        ELSE 'Statut inconnu'
                    END as statut_detaille,
                    CASE 
                        WHEN d.phase = 'aller' THEN 'Phase aller'
                        WHEN d.phase = 'retour' THEN 'Phase retour'
                        ELSE 'Phase inconnue'
                    END as phase_label
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                    SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                )
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                WHERE d.id_agent = $1
                ORDER BY d.date_creation DESC
            `;

            const result = await db.query(query, [id_agent]);
            const data = (result.rows || []).map((row) => ({
                ...row,
                date_debut: toLocalDateOnlyStr(row.date_debut),
                date_fin: toLocalDateOnlyStr(row.date_fin),
                agree_date_cessation: toLocalDateOnlyStr(row.agree_date_cessation),
                date_reprise_service: toLocalDateOnlyStr(row.date_reprise_service),
                date_fin_conges: toLocalDateOnlyStr(row.date_fin_conges),
                date_cessation: toLocalDateOnlyStr(row.date_cessation)
            }));

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('Erreur lors du suivi des demandes:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer l'historique des demandes pour un validateur (chef de service, DRH, etc.)
    static async getHistoriqueDemandes(req, res) {
        try {
            const { id_validateur } = req.params;
            const { type_demande } = req.query;

            // D'abord, récupérer les informations du validateur
            const validateurQuery = `
                SELECT a.id, a.id_direction, a.id_ministere
                FROM agents a
                WHERE a.id = $1
            `;

            const validateurResult = await db.query(validateurQuery, [id_validateur]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const validateur = validateurResult.rows[0];

            // Récupérer le rôle de l'utilisateur
            const roleQuery = `
                SELECT r.nom as role_nom, u.username
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_validateur]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom) || '';
            const roleNomNorm = (roleNom || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');

            console.log(`Historique - Rôle utilisateur: "${roleNom}" (normalisé: "${roleNomNorm}")`);

            let query = '';
            let params = [];

            if (roleNomNorm === 'chef_service') {
                // Chef de service : voir les demandes finalisées de son service (historique uniquement)
                // IMPORTANT: Exclure les demandes en attente (status='en_attente')
                console.log(`Historique chef de service - Service: ${validateur.id_direction}, Ministère: ${validateur.id_ministere}`);

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE a.id_direction = $1
                    AND a.id_ministere = $2
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [validateur.id_direction, validateur.id_ministere];

                console.log(`Requête historique chef de service: ${query}`);
                console.log(`Paramètres: ${JSON.stringify(params)}`);

            } else if (roleNomNorm === 'drh') {
                // DRH : voir les demandes finalisées de son ministère (historique uniquement)
                // IMPORTANT: Exclure les demandes en attente (status='en_attente')
                console.log(`Historique DRH - Ministère: ${validateur.id_ministere}`);

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE a.id_ministere = $1
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [validateur.id_ministere];

            } else if (roleNomNorm === 'directeur_general' || roleNomNorm === 'directeur_generale' || roleNomNorm === 'inspecteur_general') {
                // Directeur général ou Inspecteur général : voir les demandes qu'il a validées (id_validateur_directeur_general),
                // ou les demandes validées au niveau DG de sa direction générale (repli si id_validateur non enregistré).
                console.log(`Historique ${roleNomNorm === 'inspecteur_general' ? 'Inspecteur général' : 'Directeur général'} - Agent validateur: ${validateur.id}`);

                let dgId = null;
                if (validateur.id_direction) {
                    const dgDirRes = await db.query('SELECT id_direction_generale FROM directions WHERE id = $1', [validateur.id_direction]);
                    dgId = dgDirRes.rows[0]?.id_direction_generale ?? null;
                }
                const agentDgRes = await db.query('SELECT id_direction_generale FROM agents WHERE id = $1', [id_validateur]);
                if (dgId == null && agentDgRes.rows[0]?.id_direction_generale != null) {
                    dgId = agentDgRes.rows[0].id_direction_generale;
                }

                const whereDg = dgId != null
                    ? `(d.id_validateur_directeur_general = $1 OR (d.id_validateur_directeur_general IS NULL AND d.niveau_evolution_demande = 'valide_par_directeur_general' AND d.statut_directeur_general IS NOT NULL AND (s.id_direction_generale = $2 OR (a.id_direction_generale = $2 AND a.id_direction IS NULL))))`
                    : `d.id_validateur_directeur_general = $1`;
                const paramsDg = dgId != null ? [id_validateur, dgId] : [id_validateur];

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_sous_directeur' THEN 'Validée par sous-directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_general' THEN 'Validée par directeur général'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur' THEN 'Validée par directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE ${whereDg}
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = paramsDg;

            } else if (roleNomNorm === 'directeur_service_exterieur') {
                // Directeur des services extérieurs : voir les demandes qu'il a validées,
                // même après finalisation par le DRH (historique uniquement).
                // On filtre donc sur id_validateur_directeur_service_exterieur.
                console.log(`Historique Directeur service extérieur - Agent validateur: ${validateur.id}`);

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_sous_directeur' THEN 'Validée par sous-directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_service_exterieur' THEN 'Validée par directeur des services extérieurs'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur' THEN 'Validée par directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.id_validateur_directeur_service_exterieur = $1
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [validateur.id];

            } else if (roleNomNorm === 'directeur_central') {
                // Directeur central : voir uniquement l'historique des demandes qu'il a validées
                // ET dont le demandeur (agent) appartient à SA direction centrale (pas aux autres directions centrales).
                console.log(`Historique Directeur central - Agent validateur: ${validateur.id}, Direction: ${validateur.id_direction}`);

                const whereDirection = validateur.id_direction != null
                    ? ' AND a.id_direction = $2'
                    : '';

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_sous_directeur' THEN 'Validée par sous-directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur' THEN 'Validée par directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_central' THEN 'Validée par directeur central'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_general' THEN 'Validée par directeur général'
                               WHEN d.niveau_evolution_demande = 'valide_par_dir_cabinet' THEN 'Validée par directeur de cabinet'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.id_validateur_directeur = $1
                    AND d.status IN ('approuve', 'rejete')${whereDirection}
                    ORDER BY d.date_creation DESC
                `;
                params = validateur.id_direction != null
                    ? [validateur.id, validateur.id_direction]
                    : [validateur.id];

            } else if (roleNomNorm === 'chef_cabinet') {
                // Chef de cabinet : voir les demandes qu'il a validées,
                // même après finalisation par le DRH ou le ministre (historique uniquement).
                // On filtre donc sur id_validateur_chef_cabinet.
                console.log(`Historique Chef de cabinet - Agent validateur: ${validateur.id}`);

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_sous_directeur' THEN 'Validée par sous-directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_central' THEN 'Validée par directeur central'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_general' THEN 'Validée par directeur général'
                               WHEN d.niveau_evolution_demande = 'valide_par_chef_cabinet' THEN 'Validée par chef de cabinet'
                               WHEN d.niveau_evolution_demande = 'valide_par_dir_cabinet' THEN 'Validée par directeur de cabinet'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.id_validateur_chef_cabinet = $1
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [validateur.id];

            } else if (roleNomNorm === 'dir_cabinet') {
                // Directeur de cabinet : voir les demandes qu'il a validées,
                // même après finalisation par le ministre ou le DRH (historique uniquement).
                // On filtre donc sur id_validateur_dir_cabinet.
                console.log(`Historique Directeur de cabinet - Agent validateur: ${validateur.id}`);

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_sous_directeur' THEN 'Validée par sous-directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_central' THEN 'Validée par directeur central'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_general' THEN 'Validée par directeur général'
                               WHEN d.niveau_evolution_demande = 'valide_par_dir_cabinet' THEN 'Validée par directeur de cabinet'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.id_validateur_dir_cabinet = $1
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [validateur.id];

            } else if (roleNomNorm === 'ministre') {
                // Ministre : voir les demandes qu'il a validées (historique de ses validations)
                console.log(`Historique Ministre - Agent validateur: ${validateur.id}`);

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_sous_directeur' THEN 'Validée par sous-directeur'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_central' THEN 'Validée par directeur central'
                               WHEN d.niveau_evolution_demande = 'valide_par_directeur_general' THEN 'Validée par directeur général'
                               WHEN d.niveau_evolution_demande = 'valide_par_dir_cabinet' THEN 'Validée par directeur de cabinet'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.id_ministre = $1
                    AND (
                        -- Demandes totalement finalisées
                        d.status IN ('approuve', 'rejete')
                        OR
                        -- Demandes encore en attente au DRH mais déjà approuvées par le Ministre
                        (d.status = 'en_attente' 
                         AND d.niveau_evolution_demande = 'valide_par_ministre'
                         AND d.statut_ministre = 'approuve')
                    )
                    ORDER BY d.date_creation DESC
                `;
                params = [validateur.id];

            } else if (roleNomNorm === 'super_admin') {
                // Super admin : voir les demandes finalisées (historique uniquement)
                // IMPORTANT: Exclure les demandes en attente (status='en_attente')
                console.log('Historique Super Admin - Demandes finalisées uniquement');

                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [];

            } else {
                // Autres rôles : voir leurs propres demandes finalisées (historique uniquement)
                // IMPORTANT: Exclure les demandes en attente (status='en_attente')
                query = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                           fa.designation_poste as fonction_actuelle,
                           s.libelle as service_nom, m.nom as ministere_nom,
                           f.libele as fonction_libelle,
                           CASE 
                               WHEN d.status = 'approuve' THEN 'Approuvée'
                               WHEN d.status = 'rejete' THEN 'Rejetée'
                               WHEN d.status = 'en_attente' THEN 'En attente'
                               ELSE d.status
                           END as statut_libelle,
                           CASE 
                               WHEN d.niveau_evolution_demande = 'soumis' THEN 'Soumise'
                               WHEN d.niveau_evolution_demande = 'valide_par_superieur' THEN 'Validée par chef de service'
                               WHEN d.niveau_evolution_demande = 'valide_par_drh' THEN 'Validée par DRH'
                               WHEN d.niveau_evolution_demande = 'valide_par_ministre' THEN 'Validée par ministre'
                               WHEN d.niveau_evolution_demande = 'retour_drh' THEN 'Retour DRH'
                               WHEN d.niveau_evolution_demande = 'retour_chef_service' THEN 'Retour chef de service'
                               WHEN d.niveau_evolution_demande = 'retour_ministre' THEN 'Retour ministre'
                               ELSE d.niveau_evolution_demande
                           END as niveau_libelle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                        SELECT MAX(date_entree) FROM fonction_agents WHERE id_agent = a.id
                    )
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    WHERE d.id_agent = $1
                    AND d.status IN ('approuve', 'rejete')
                    ORDER BY d.date_creation DESC
                `;
                params = [id_validateur];
            }

            // Appliquer le filtre par type de demande si fourni
            if (type_demande) {
                query = query.replace(
                    /ORDER BY\s+d\.date_creation\s+DESC/,
                    `AND d.type_demande = $${params.length + 1}\n                    ORDER BY d.date_creation DESC`
                );
                params.push(type_demande);
            }

            const result = await db.query(query, params);

            console.log(`Historique - Requête exécutée avec ${result.rows.length} résultats`);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    static async getDemandesHistoriqueGlobal(req, res) {
        try {
            const {
                page = 1,
                limit = 50,
                start_date,
                end_date,
                type_demande,
                statut,
                status,
                agent_id,
                service_id,
                group_by = 'month',
                search,
                id_ministere,
                ministere_id
            } = req.query;

            // Accepter id_ministere (frontend) ou ministere_id (alternatif) pour filtrer par ministère
            const idMinistere = id_ministere || ministere_id;

            const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
            const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
            const offset = (parsedPage - 1) * parsedLimit;

            const filters = [];
            const params = [];
            let paramIndex = 1;

            if (start_date) {
                filters.push(`d.date_creation >= $${paramIndex++}::timestamp`);
                params.push(start_date);
            }

            if (end_date) {
                filters.push(`d.date_creation <= $${paramIndex++}::timestamp`);
                params.push(end_date);
            }

            if (type_demande) {
                filters.push(`d.type_demande = $${paramIndex++}`);
                params.push(type_demande);
            }

            const statutParam = statut || status;
            if (statutParam) {
                const statusList = statutParam
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);

                if (statusList.length === 1) {
                    filters.push(`d.status = $${paramIndex++}`);
                    params.push(statusList[0]);
                } else if (statusList.length > 1) {
                    filters.push(`d.status = ANY($${paramIndex++}::text[])`);
                    params.push(statusList);
                }
            }

            if (agent_id) {
                filters.push(`d.id_agent = $${paramIndex++}`);
                params.push(agent_id);
            }

            if (service_id) {
                filters.push(`a.id_direction = $${paramIndex++}`);
                params.push(service_id);
            }

            if (idMinistere) {
                filters.push(`a.id_ministere = $${paramIndex++}`);
                params.push(idMinistere);
            }

            if (search) {
                filters.push(`(
                    CONCAT(COALESCE(a.prenom, ''), ' ', COALESCE(a.nom, '')) ILIKE $${paramIndex}
                    OR COALESCE(a.matricule, '') ILIKE $${paramIndex}
                )`);
                params.push(`%${search}%`);
                paramIndex += 1;
            }

            const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

            const fromClause = `
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN directions dir ON a.id_direction = dir.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
            `;

            const listQuery = `
                SELECT
                    d.id,
                    d.type_demande,
                    d.status,
                    d.niveau_evolution_demande,
                    d.phase,
                    d.priorite,
                    d.date_creation,
                    d.date_debut,
                    d.date_fin,
                    d.description,
                    d.nombre_agents,
                    d.poste_souhaite,
                    d.agents_satisfaits,
                    a.id AS agent_id,
                    a.prenom,
                    a.nom,
                    a.matricule,
                    dir.id AS service_id,
                    dir.libelle AS service_nom,
                    m.id AS ministere_id,
                    m.nom AS ministere_nom
                ${fromClause}
                ${whereClause}
                ORDER BY d.date_creation DESC
                LIMIT $${params.length + 1}
                OFFSET $${params.length + 2}
            `;

            const listParams = [...params, parsedLimit, offset];
            const { rows: demandes } = await db.query(listQuery, listParams);

            const countQuery = `
                SELECT COUNT(*)::int AS total
                ${fromClause}
                ${whereClause}
            `;
            const { rows: countRows } = await db.query(countQuery, params);
            const total = (countRows && countRows[0] && countRows[0].total) || 0;
            const totalPages = parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 1;

            const statusQuery = `
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE d.status = 'approuve')::int AS approuve,
                    COUNT(*) FILTER (WHERE d.status = 'rejete')::int AS rejete,
                    COUNT(*) FILTER (WHERE d.status = 'en_attente')::int AS en_attente
                ${fromClause}
                ${whereClause}
            `;
            const { rows: statusRows } = await db.query(statusQuery, params);
            const globalStatus = (statusRows && statusRows[0]) || {
                total: 0,
                approuve: 0,
                rejete: 0,
                en_attente: 0
            };

            const typeQuery = `
                SELECT
                    d.type_demande,
                    COUNT(*)::int AS total
                ${fromClause}
                ${whereClause}
                GROUP BY d.type_demande
                ORDER BY d.type_demande
            `;
            const { rows: typeRows } = await db.query(typeQuery, params);

            const safeGroupBy = ['month', 'year', 'semester'].includes((group_by || '').toLowerCase())
                ? (group_by || '').toLowerCase()
                : 'month';

            let periodQuery = '';

            if (safeGroupBy === 'year') {
                periodQuery = `
                    SELECT
                        DATE_TRUNC('year', d.date_creation) AS period_start,
                        DATE_TRUNC('year', d.date_creation) + INTERVAL '1 year' - INTERVAL '1 day' AS period_end,
                        TO_CHAR(DATE_TRUNC('year', d.date_creation), 'YYYY') AS period_label,
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE d.status = 'approuve')::int AS approuve,
                        COUNT(*) FILTER (WHERE d.status = 'rejete')::int AS rejete,
                        COUNT(*) FILTER (WHERE d.status = 'en_attente')::int AS en_attente
                    ${fromClause}
                    ${whereClause}
                    GROUP BY period_start, period_end, period_label
                    ORDER BY period_start DESC
                `;
            } else if (safeGroupBy === 'semester') {
                const semesterExpression = `((EXTRACT(MONTH FROM d.date_creation)::int - 1) / 6) + 1`;
                periodQuery = `
                    SELECT
                        DATE_TRUNC('year', d.date_creation) + ((${semesterExpression} - 1) * INTERVAL '6 months') AS period_start,
                        DATE_TRUNC('year', d.date_creation) + ((${semesterExpression}) * INTERVAL '6 months') - INTERVAL '1 day' AS period_end,
                        CONCAT('S', ${semesterExpression}, ' ', TO_CHAR(DATE_TRUNC('year', d.date_creation), 'YYYY')) AS period_label,
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE d.status = 'approuve')::int AS approuve,
                        COUNT(*) FILTER (WHERE d.status = 'rejete')::int AS rejete,
                        COUNT(*) FILTER (WHERE d.status = 'en_attente')::int AS en_attente
                    ${fromClause}
                    ${whereClause}
                    GROUP BY period_start, period_end, period_label
                    ORDER BY period_start DESC
                `;
            } else {
                periodQuery = `
                    SELECT
                        DATE_TRUNC('month', d.date_creation) AS period_start,
                        DATE_TRUNC('month', d.date_creation) + INTERVAL '1 month' - INTERVAL '1 day' AS period_end,
                        TO_CHAR(DATE_TRUNC('month', d.date_creation), 'YYYY-MM') AS period_label,
                        COUNT(*)::int AS total,
                        COUNT(*) FILTER (WHERE d.status = 'approuve')::int AS approuve,
                        COUNT(*) FILTER (WHERE d.status = 'rejete')::int AS rejete,
                        COUNT(*) FILTER (WHERE d.status = 'en_attente')::int AS en_attente
                    ${fromClause}
                    ${whereClause}
                    GROUP BY period_start, period_end, period_label
                    ORDER BY period_start DESC
                `;
            }

            const periodRows = periodQuery ? (await db.query(periodQuery, params)).rows : [];

            res.json({
                success: true,
                data: demandes,
                pagination: {
                    total,
                    total_pages: totalPages,
                    page: parsedPage,
                    limit: parsedLimit
                },
                resume: {
                    global: globalStatus,
                    par_type: typeRows,
                    par_periode: periodRows,
                    group_by: safeGroupBy
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique global des demandes:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Endpoint de débogage pour vérifier les données du validateur
    static async debugValidateur(req, res) {
        try {
            const { id_validateur } = req.params;

            // Récupérer les informations complètes du validateur
            const validateurQuery = `
                SELECT a.*, s.libelle as service_nom, m.nom as ministere_nom
                FROM agents a
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id = $1
            `;

            const validateurResult = await db.query(validateurQuery, [id_validateur]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const validateur = validateurResult.rows[0];

            // Récupérer la fonction actuelle
            const fonctionQuery = `
                SELECT f.libele as fonction_libelle, fa.designation_poste
                FROM fonction_agents fa
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                WHERE fa.id_agent = $1
                ORDER BY fa.date_entree DESC
                LIMIT 1
            `;
            const fonctionResult = await db.query(fonctionQuery, [id_validateur]);
            const fonctionActuelle = (fonctionResult.rows[0] && fonctionResult.rows[0].fonction_libelle) || '';
            const designationPoste = (fonctionResult.rows[0] && fonctionResult.rows[0].designation_poste) || '';

            // Vérifier s'il y a des demandes dans son service
            const demandesQuery = `
                SELECT COUNT(*) as total_demandes
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE a.id_direction = $1 AND a.id_ministere = $2
            `;
            const demandesResult = await db.query(demandesQuery, [validateur.id_direction, validateur.id_ministere]);

            // Vérifier les demandes en attente spécifiquement
            const demandesAttenteQuery = `
                SELECT COUNT(*) as demandes_attente
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE d.status = 'en_attente' 
                AND a.id_direction = $1 
                AND a.id_ministere = $2
            `;
            const demandesAttenteResult = await db.query(demandesAttenteQuery, [validateur.id_direction, validateur.id_ministere]);

            res.json({
                success: true,
                data: {
                    validateur: {
                        id: validateur.id,
                        nom: validateur.nom,
                        prenom: validateur.prenom,
                        matricule: validateur.matricule,
                        id_service: validateur.id_direction,
                        id_ministere: validateur.id_ministere,
                        service_nom: validateur.service_nom,
                        ministere_nom: validateur.ministere_nom
                    },
                    fonction: {
                        libelle: fonctionActuelle,
                        designation_poste: designationPoste
                    },
                    statistiques: {
                        total_demandes_service: parseInt(demandesResult.rows[0].total_demandes),
                        demandes_attente_service: parseInt(demandesAttenteResult.rows[0].demandes_attente)
                    }
                }
            });

        } catch (error) {
            console.error('Erreur lors du débogage du validateur:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer la liste des agents pour les filtres DRH
    static async getAgentsForFilter(req, res) {
        try {
            const { id_validateur } = req.params;

            // Récupérer le ministère du validateur
            const validateurQuery = `
                SELECT a.id_ministere
                FROM agents a
                WHERE a.id = $1
            `;
            const validateurResult = await db.query(validateurQuery, [id_validateur]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const ministereId = validateurResult.rows[0].id_ministere;

            // Récupérer tous les agents du ministère
            const agentsQuery = `
                SELECT a.id, a.prenom, a.nom, a.matricule, s.libelle as service_nom
                FROM agents a
                LEFT JOIN directions s ON a.id_direction = s.id
                WHERE a.id_ministere = $1
                ORDER BY a.prenom, a.nom
            `;

            const agentsResult = await db.query(agentsQuery, [ministereId]);

            res.json({
                success: true,
                data: agentsResult.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer la liste des services pour les filtres DRH
    static async getServicesForFilter(req, res) {
        try {
            const { id_validateur } = req.params;

            // Récupérer le ministère du validateur
            const validateurQuery = `
                SELECT a.id_ministere
                FROM agents a
                WHERE a.id = $1
            `;
            const validateurResult = await db.query(validateurQuery, [id_validateur]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const ministereId = validateurResult.rows[0].id_ministere;

            // Récupérer tous les services du ministère
            const servicesQuery = `
                SELECT s.id, s.libelle, s.description
                FROM directions s
                WHERE s.id_ministere = $1
                ORDER BY s.libelle
            `;

            const servicesResult = await db.query(servicesQuery, [ministereId]);

            res.json({
                success: true,
                data: servicesResult.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des services:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère les détails d'une demande spécifique par son ID
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getDemandeById(req, res) {
        try {
            const { id_demande } = req.params;

            console.log(`📋 Récupération des détails de la demande ${id_demande}...`);

            // Récupérer les détails complets de la demande
            const query = `
                SELECT 
                    d.*,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.email, a.sexe,
                    a.fonction_actuelle, a.date_de_naissance, a.lieu_de_naissance,
                    c.libele as civilite,
                    s.libelle as service_nom, s.description as service_description,
                    m.nom as ministere_nom, m.description as ministere_description,
                    cs.prenom as chef_service_prenom, cs.nom as chef_service_nom,
                    drh.prenom as drh_prenom, drh.nom as drh_nom,
                    dir.prenom as directeur_prenom, dir.nom as directeur_nom,
                    min.prenom as ministre_prenom, min.nom as ministre_nom,
                    -- Informations sur les documents générés
                    da.id as document_id, da.type_document, da.statut as document_statut,
                    da.date_generation, da.date_transmission, da.date_reception,
                    da.commentaire_transmission, da.chemin_fichier,
                    -- Informations sur le workflow
                    wd.niveau_validation, wd.action, wd.commentaire as workflow_commentaire,
                    wd.date_action, wd.id_validateur as workflow_validateur_id,
                    wv.prenom as workflow_validateur_prenom, wv.nom as workflow_validateur_nom
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents cs ON d.id_chef_service = cs.id
                LEFT JOIN agents drh ON d.id_drh = drh.id
                LEFT JOIN agents dir ON d.id_directeur = dir.id
                LEFT JOIN agents min ON d.id_ministre = min.id
                LEFT JOIN documents_autorisation da ON d.id = da.id_demande
                LEFT JOIN workflow_demandes wd ON d.id = wd.id_demande
                LEFT JOIN agents wv ON wd.id_validateur = wv.id
                WHERE d.id = $1
                ORDER BY wd.date_action DESC
            `;

            const result = await db.query(query, [id_demande]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Demande non trouvée'
                });
            }

            // Organiser les données
            const demande = result.rows[0];
            const workflow = result.rows
                .filter(row => row.niveau_validation)
                .map(row => ({
                    niveau_validation: row.niveau_validation,
                    action: row.action,
                    commentaire: row.workflow_commentaire,
                    date_action: row.date_action,
                    validateur: {
                        id: row.workflow_validateur_id,
                        prenom: row.workflow_validateur_prenom,
                        nom: row.workflow_validateur_nom
                    }
                }));

            // Informations sur les documents
            const documents = result.rows
                .filter(row => row.document_id)
                .map(row => ({
                    id: row.document_id,
                    type_document: row.type_document,
                    statut: row.document_statut,
                    date_generation: row.date_generation,
                    date_transmission: row.date_transmission,
                    date_reception: row.date_reception,
                    commentaire_transmission: row.commentaire_transmission,
                    chemin_fichier: row.chemin_fichier
                }));

            // Préparer la réponse
            const demandeDateFields = [
                'date_debut',
                'date_fin',
                'date_creation',
                'date_cessation',
                'agree_date_cessation',
                'date_reprise_service',
                'date_fin_conges'
            ];
            
            const agentDateFields = ['date_naissance'];
            
            const response = {
                success: true,
                data: {
                    demande: formatDatesInObject({
                        id: demande.id,
                        type_demande: demande.type_demande,
                        description: demande.description,
                        date_debut: demande.date_debut,
                        date_fin: demande.date_fin,
                        lieu: demande.lieu,
                        priorite: demande.priorite,
                        status: demande.status,
                        niveau_evolution_demande: demande.niveau_evolution_demande,
                        phase: demande.phase,
                        date_creation: demande.date_creation,
                        motif: demande.motif,
                        date_cessation: demande.date_cessation,
                        agree_motif: demande.agree_motif,
                        agree_date_cessation: demande.agree_date_cessation,
                        date_reprise_service: demande.date_reprise_service,
                        date_fin_conges: demande.date_fin_conges,
                        documents_joints: demande.documents_joints ? (() => {
                            try {
                                return JSON.parse(demande.documents_joints);
                            } catch (error) {
                                console.warn('⚠️ Erreur lors du parsing des documents_joints:', error.message);
                                return [];
                            }
                        })() : []
                    }, demandeDateFields),
                    agent: formatDatesInObject({
                        id: demande.id_agent,
                        prenom: demande.agent_prenom,
                        nom: demande.agent_nom,
                        matricule: demande.matricule,
                        email: demande.email,
                        sexe: demande.sexe,
                        fonction_actuelle: demande.fonction_actuelle,
                        date_naissance: demande.date_de_naissance,
                        lieu_naissance: demande.lieu_de_naissance,
                        civilite: demande.civilite
                    }, agentDateFields),
                    service: {
                        nom: demande.service_nom,
                        description: demande.service_description
                    },
                    ministere: {
                        nom: demande.ministere_nom,
                        description: demande.ministere_description
                    },
                    validateurs: {
                        chef_service: demande.chef_service_prenom && demande.chef_service_nom ? {
                            prenom: demande.chef_service_prenom,
                            nom: demande.chef_service_nom
                        } : null,
                        drh: demande.drh_prenom && demande.drh_nom ? {
                            prenom: demande.drh_prenom,
                            nom: demande.drh_nom
                        } : null,
                        directeur: demande.directeur_prenom && demande.directeur_nom ? {
                            prenom: demande.directeur_prenom,
                            nom: demande.directeur_nom
                        } : null,
                        ministre: demande.ministre_prenom && demande.ministre_nom ? {
                            prenom: demande.ministre_prenom,
                            nom: demande.ministre_nom
                        } : null
                    },
                    documents: documents,
                    workflow: workflow
                }
            };

            console.log(`✅ Détails de la demande ${id_demande} récupérés avec succès`);

            res.json(response);

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des détails de la demande:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }
    // Méthode pour mettre à jour les agents satisfaits suite à une demande de besoin_personnel
    static async satisfaireBesoin(req, res) {
        try {
            const { id_demande } = req.params;
            const { agents_satisfaits } = req.body;
            
            if (agents_satisfaits === undefined || agents_satisfaits < 0) {
                return res.status(400).json({ success: false, error: 'Le nombre d\'agents satisfaits est invalide.' });
            }

            const checkDemandeQuery = 'SELECT * FROM demandes WHERE id = $1 AND type_demande = $2';
            const checkDemandeResult = await db.query(checkDemandeQuery, [id_demande, 'besoin_personnel']);
            
            if (checkDemandeResult.rows.length === 0) {
                return res.status(404).json({ success: false, error: 'Demande introuvable ou type incorrect.' });
            }

            const demande = checkDemandeResult.rows[0];

            if (agents_satisfaits > demande.nombre_agents) {
                return res.status(400).json({ success: false, error: 'Le nombre d\'agents satisfaits ne peut dépasser le nombre demandé.' });
            }

            const updateQuery = 'UPDATE demandes SET agents_satisfaits = $1 WHERE id = $2 RETURNING *';
            const updateResult = await db.query(updateQuery, [agents_satisfaits, id_demande]);

            res.json({
                success: true,
                message: 'Demande mise à jour avec succès.',
                data: updateResult.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la satisfaction de la demande:', error);
            res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = DemandesController;