const db = require('../config/database');
const { validationResult } = require('express-validator');

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
                id_agent,
                type_demande,
                description,
                date_debut,
                date_fin,
                lieu,
                priorite = 'normale',
                documents_joints
            } = req.body;

            // Vérifier que l'agent existe
            const agentQuery = 'SELECT * FROM agents WHERE id = $1';
            const agentResult = await db.query(agentQuery, [id_agent]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            // Insérer la demande
            const insertQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, date_debut, date_fin, 
                    lieu, priorite, documents_joints, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `;

            const result = await db.query(insertQuery, [
                id_agent, type_demande, description, date_debut, date_fin,
                lieu, priorite, JSON.stringify(documents_joints || []), req.user.id
            ]);

            // Récupérer la demande créée avec les informations de l'agent
            const demandeQuery = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE d.id = $1
            `;

            const demandeResult = await db.query(demandeQuery, [result.rows[0].id]);

            res.status(201).json({
                success: true,
                message: 'Demande créée avec succès',
                data: demandeResult.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création de la demande:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les demandes d'un agent
    static async getDemandesByAgent(req, res) {
        try {
            const { id_agent } = req.params;
            const { status, type_demande, page = 1, limit = 10 } = req.query;

            let query = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       cs.prenom as chef_service_prenom, cs.nom as chef_service_nom,
                       drh.prenom as drh_prenom, drh.nom as drh_nom,
                       dir.prenom as directeur_prenom, dir.nom as directeur_nom,
                       min.prenom as ministre_prenom, min.nom as ministre_nom
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN agents cs ON d.id_chef_service = cs.id
                LEFT JOIN agents drh ON d.id_drh = drh.id
                LEFT JOIN agents dir ON d.id_directeur = dir.id
                LEFT JOIN agents min ON d.id_ministre = min.id
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

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.rows.length
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

            const query = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       a.service, a.direction
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE d.status = 'en_attente' 
                AND (
                    (d.niveau_actuel = 'chef_service' AND d.id_chef_service = $1) OR
                    (d.niveau_actuel = 'drh' AND d.id_drh = $1) OR
                    (d.niveau_actuel = 'directeur' AND d.id_directeur = $1) OR
                    (d.niveau_actuel = 'ministre' AND d.id_ministre = $1)
                )
                ORDER BY d.date_creation ASC
            `;

            const result = await db.query(query, [id_validateur]);

            res.json({
                success: true,
                data: result.rows
            });

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
        try {
            const { id_demande } = req.params;
            const { action, commentaire } = req.body;

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

            // Déterminer le niveau de validation
            let niveauValidation = '';
            let statutField = '';
            let dateField = '';
            let commentaireField = '';

            if (demande.niveau_actuel === 'chef_service') {
                niveauValidation = 'chef_service';
                statutField = 'statut_chef_service';
                dateField = 'date_validation_chef_service';
                commentaireField = 'commentaire_chef_service';
            } else if (demande.niveau_actuel === 'drh') {
                niveauValidation = 'drh';
                statutField = 'statut_drh';
                dateField = 'date_validation_drh';
                commentaireField = 'commentaire_drh';
            } else if (demande.niveau_actuel === 'directeur') {
                niveauValidation = 'directeur';
                statutField = 'statut_directeur';
                dateField = 'date_validation_directeur';
                commentaireField = 'commentaire_directeur';
            } else if (demande.niveau_actuel === 'ministre') {
                niveauValidation = 'ministre';
                statutField = 'statut_ministre';
                dateField = 'date_validation_ministre';
                commentaireField = 'commentaire_ministre';
            }

            // Mettre à jour la demande
            const updateQuery = `
                UPDATE demandes 
                SET ${statutField} = $1,
                    ${dateField} = CURRENT_TIMESTAMP,
                    ${commentaireField} = $2,
                    updated_by = $3
                WHERE id = $4
            `;

            await db.query(updateQuery, [action, commentaire, req.user.id, id_demande]);

            // Si approuvé, passer au niveau suivant ou finaliser
            if (action === 'approuve') {
                let nextNiveau = '';
                if (niveauValidation === 'chef_service') {
                    nextNiveau = 'drh';
                } else if (niveauValidation === 'drh') {
                    nextNiveau = 'directeur';
                } else if (niveauValidation === 'directeur') {
                    nextNiveau = 'ministre';
                } else if (niveauValidation === 'ministre') {
                    nextNiveau = 'finalise';
                }

                if (nextNiveau === 'finalise') {
                    // Finaliser la demande
                    await db.query(
                        'UPDATE demandes SET status = $1, niveau_actuel = $2 WHERE id = $3', ['approuve', 'finalise', id_demande]
                    );
                } else {
                    // Passer au niveau suivant
                    await db.query(
                        'UPDATE demandes SET niveau_actuel = $1 WHERE id = $2', [nextNiveau, id_demande]
                    );
                }
            } else if (action === 'rejete') {
                // Rejeter la demande
                await db.query(
                    'UPDATE demandes SET status = $1 WHERE id = $2', ['rejete', id_demande]
                );
            }

            // Enregistrer dans le workflow
            const workflowQuery = `
                INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                VALUES ($1, $2, $3, $4, $5)
            `;

            await db.query(workflowQuery, [id_demande, niveauValidation, validateurId, action, commentaire]);

            res.json({
                success: true,
                message: `Demande ${action === 'approuve' ? 'approuvée' : 'rejetée'} avec succès`
            });

        } catch (error) {
            console.error('Erreur lors de la validation de la demande:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
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
}

module.exports = DemandesController;