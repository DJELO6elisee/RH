const db = require('../config/database');
const pool = require('../config/database');
const CongesInstitutionsController = require('./CongesInstitutionsController');

class DemandesInstitutionsController {
    constructor() {
        this.tableName = 'demandes_institutions';
        this.agentsTable = 'agents_institutions_main';
        this.congesTable = 'agent_conges_institutions';
    }

    // Récupérer l'ID de l'institution de l'utilisateur
    async getUserInstitutionId(req) {
        if (req.user && req.user.organization && req.user.organization.type === 'institution') {
            return req.user.organization.id;
        }
        if (req.user && req.user.id_agent) {
            const result = await pool.query(
                `SELECT id_institution FROM ${this.agentsTable} WHERE id = $1`,
                [req.user.id_agent]
            );
            if (result.rows.length > 0) {
                return result.rows[0].id_institution;
            }
        }
        return null;
    }

    // Récupérer toutes les demandes
    async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                type_demande,
                id_agent,
                id_institution,
                niveau_actuel
            } = req.query;

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (institutionId) {
                whereClause += ` AND d.id_institution = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            if (status) {
                whereClause += ` AND d.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            if (type_demande) {
                whereClause += ` AND d.type_demande = $${paramIndex}`;
                params.push(type_demande);
                paramIndex++;
            }

            if (id_agent) {
                whereClause += ` AND d.id_agent = $${paramIndex}`;
                params.push(id_agent);
                paramIndex++;
            }

            if (niveau_actuel) {
                whereClause += ` AND d.niveau_actuel = $${paramIndex}`;
                params.push(niveau_actuel);
                paramIndex++;
            }

            const query = `
                SELECT 
                    d.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    i.nom as institution_nom
                FROM ${this.tableName} d
                JOIN ${this.agentsTable} a ON d.id_agent = a.id
                LEFT JOIN institutions i ON d.id_institution = i.id
                ${whereClause}
                ORDER BY d.date_creation DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);
            const result = await pool.query(query, params);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM ${this.tableName} d
                ${whereClause}
            `;
            const countResult = await pool.query(countQuery, params.slice(0, -2));
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des demandes:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer une demande par ID
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    d.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    i.nom as institution_nom,
                    cs.nom as chef_service_nom,
                    cs.prenom as chef_service_prenom,
                    sd.nom as sous_directeur_nom,
                    sd.prenom as sous_directeur_prenom,
                    dir.nom as directeur_nom,
                    dir.prenom as directeur_prenom,
                    drh.nom as drh_nom,
                    drh.prenom as drh_prenom
                FROM ${this.tableName} d
                JOIN ${this.agentsTable} a ON d.id_agent = a.id
                LEFT JOIN institutions i ON d.id_institution = i.id
                LEFT JOIN ${this.agentsTable} cs ON d.id_chef_service = cs.id
                LEFT JOIN ${this.agentsTable} sd ON d.id_sous_directeur = sd.id
                LEFT JOIN ${this.agentsTable} dir ON d.id_directeur = dir.id
                LEFT JOIN ${this.agentsTable} drh ON d.id_drh = drh.id
                WHERE d.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Demande non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de la demande:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Créer une nouvelle demande
    async create(req, res) {
        try {
            const demandeData = req.body;

            // Validation de base
            if (!demandeData.id_agent || !demandeData.type_demande) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent et le type de demande sont requis'
                });
            }

            // Récupérer l'institution de l'agent
            const agentQuery = `SELECT id_institution FROM ${this.agentsTable} WHERE id = $1`;
            const agentResult = await pool.query(agentQuery, [demandeData.id_agent]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Agent non trouvé' });
            }

            demandeData.id_institution = agentResult.rows[0].id_institution;
            demandeData.created_by = req.user?.id;

            // Calculer le nombre de jours si dates fournies
            if (demandeData.date_debut && demandeData.date_fin) {
                const dateDebut = new Date(demandeData.date_debut);
                const dateFin = new Date(demandeData.date_fin);
                const diffTime = Math.abs(dateFin - dateDebut);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                demandeData.nombre_jours = diffDays;
            }

            // Construire la requête d'insertion
            const fields = Object.keys(demandeData);
            const values = Object.values(demandeData);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
                INSERT INTO ${this.tableName} (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;

            const result = await pool.query(query, values);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de la demande:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Valider une demande (workflow)
    async valider(req, res) {
        try {
            const { id } = req.params;
            const { niveau, statut, commentaire } = req.body;

            if (!niveau || !statut) {
                return res.status(400).json({
                    success: false,
                    message: 'Le niveau et le statut sont requis'
                });
            }

            // Récupérer la demande actuelle
            const demandeQuery = `SELECT * FROM ${this.tableName} WHERE id = $1`;
            const demandeResult = await pool.query(demandeQuery, [id]);

            if (demandeResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Demande non trouvée' });
            }

            const demande = demandeResult.rows[0];

            // Vérifier que c'est le bon niveau
            if (demande.niveau_actuel !== niveau) {
                return res.status(400).json({
                    success: false,
                    message: `Cette demande est au niveau ${demande.niveau_actuel}, pas ${niveau}`
                });
            }

            // Déterminer le prochain niveau
            const niveaux = ['chef_service', 'sous_directeur', 'directeur', 'drh', 'president'];
            const currentIndex = niveaux.indexOf(niveau);
            const nextNiveau = statut === 'validee' && currentIndex < niveaux.length - 1 
                ? niveaux[currentIndex + 1] 
                : null;

            // Préparer les champs à mettre à jour
            const updateFields = {
                [`statut_${niveau}`]: statut,
                [`date_validation_${niveau}`]: new Date(),
                [`commentaire_${niveau}`]: commentaire || null,
                [`id_validateur_${niveau}`]: req.user?.id || null
            };

            // Si validé, passer au niveau suivant, sinon marquer comme rejeté
            if (statut === 'validee' && nextNiveau) {
                updateFields.niveau_actuel = nextNiveau;
            } else if (statut === 'rejetee') {
                updateFields.status = 'rejetee';
                updateFields.niveau_actuel = null;
            } else if (statut === 'validee' && !nextNiveau) {
                // Dernière validation - demande complètement validée
                updateFields.status = 'validee';
                updateFields.niveau_actuel = null;
            }

            // Construire la requête de mise à jour
            const setClause = Object.keys(updateFields)
                .map((field, i) => `${field} = $${i + 2}`)
                .join(', ');

            const updateQuery = `
                UPDATE ${this.tableName}
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const updateValues = [id, ...Object.values(updateFields)];
            const result = await pool.query(updateQuery, updateValues);

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la validation de la demande:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer les demandes par agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            const { annee, status } = req.query;

            let whereClause = 'WHERE d.id_agent = $1';
            const params = [agentId];
            let paramIndex = 2;

            if (annee) {
                whereClause += ` AND EXTRACT(YEAR FROM d.date_debut) = $${paramIndex}`;
                params.push(parseInt(annee));
                paramIndex++;
            }

            if (status) {
                whereClause += ` AND d.status = $${paramIndex}`;
                params.push(status);
                paramIndex++;
            }

            const query = `
                SELECT 
                    d.*,
                    i.nom as institution_nom
                FROM ${this.tableName} d
                LEFT JOIN institutions i ON d.id_institution = i.id
                ${whereClause}
                ORDER BY d.date_creation DESC
            `;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des demandes de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer les demandes en attente pour un validateur
    async getEnAttenteByValidateur(req, res) {
        try {
            const { niveau } = req.query;
            const userId = req.user?.id_agent;

            if (!niveau) {
                return res.status(400).json({
                    success: false,
                    message: 'Le niveau de validation est requis'
                });
            }

            const query = `
                SELECT 
                    d.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    i.nom as institution_nom
                FROM ${this.tableName} d
                JOIN ${this.agentsTable} a ON d.id_agent = a.id
                LEFT JOIN institutions i ON d.id_institution = i.id
                WHERE d.niveau_actuel = $1 
                  AND d.status = 'en_attente'
                  AND d.id_${niveau} = $2
                ORDER BY d.date_creation ASC
            `;

            const result = await pool.query(query, [niveau, userId]);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des demandes en attente:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Mettre à jour une demande
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            updateData.updated_by = req.user?.id;

            // Construire la requête de mise à jour
            const fields = Object.keys(updateData);
            const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');

            const query = `
                UPDATE ${this.tableName}
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${fields.length + 1}
                RETURNING *
            `;

            const values = [...Object.values(updateData), id];
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Demande non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la demande:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Annuler une demande
    async annuler(req, res) {
        try {
            const { id } = req.params;
            const { motif } = req.body;

            const query = `
                UPDATE ${this.tableName}
                SET status = 'annulee',
                    commentaire_drh = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(query, [id, motif || 'Demande annulée']);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Demande non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de l\'annulation de la demande:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Supprimer une demande
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Demande non trouvée' });
            }

            res.json({ success: true, message: 'Demande supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la demande:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Statistiques des demandes
    async getStats(req, res) {
        try {
            const { id_institution, annee = new Date().getFullYear() } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE EXTRACT(YEAR FROM d.date_creation) = $1';
            const params = [annee];
            let paramIndex = 2;

            if (institutionId) {
                whereClause += ` AND d.id_institution = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            const query = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE d.status = 'en_attente') as en_attente,
                    COUNT(*) FILTER (WHERE d.status = 'validee') as validees,
                    COUNT(*) FILTER (WHERE d.status = 'rejetee') as rejetees,
                    COUNT(*) FILTER (WHERE d.status = 'annulee') as annulees,
                    COUNT(*) FILTER (WHERE d.type_demande = 'conge') as conges,
                    COUNT(*) FILTER (WHERE d.type_demande = 'autorisation_absence') as autorisations,
                    COUNT(*) FILTER (WHERE d.type_demande = 'mission') as missions
                FROM ${this.tableName} d
                ${whereClause}
            `;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }
}

module.exports = new DemandesInstitutionsController();

