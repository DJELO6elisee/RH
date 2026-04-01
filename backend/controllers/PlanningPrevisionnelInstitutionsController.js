const pool = require('../config/database');

class PlanningPrevisionnelInstitutionsController {
    constructor() {
        this.tableName = 'planning_previsionnel_institutions';
        this.agentsTable = 'agents_institutions_main';
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

    // Récupérer le planning prévisionnel
    async getAll(req, res) {
        try {
            const {
                id_institution,
                annee = new Date().getFullYear(),
                trimestre,
                mois,
                id_agent,
                statut
            } = req.query;

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (institutionId) {
                whereClause += ` AND p.id_institution = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            if (annee) {
                whereClause += ` AND p.annee = $${paramIndex}`;
                params.push(parseInt(annee));
                paramIndex++;
            }

            if (trimestre) {
                whereClause += ` AND p.trimestre = $${paramIndex}`;
                params.push(parseInt(trimestre));
                paramIndex++;
            }

            if (mois) {
                whereClause += ` AND p.mois = $${paramIndex}`;
                params.push(parseInt(mois));
                paramIndex++;
            }

            if (id_agent) {
                whereClause += ` AND p.id_agent = $${paramIndex}`;
                params.push(id_agent);
                paramIndex++;
            }

            if (statut) {
                whereClause += ` AND p.statut = $${paramIndex}`;
                params.push(statut);
                paramIndex++;
            }

            const query = `
                SELECT 
                    p.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    i.nom as institution_nom,
                    v.username as validateur_nom
                FROM ${this.tableName} p
                JOIN ${this.agentsTable} a ON p.id_agent = a.id
                LEFT JOIN institutions i ON p.id_institution = i.id
                LEFT JOIN utilisateurs v ON p.valide_par = v.id
                ${whereClause}
                ORDER BY p.annee DESC, p.mois ASC, p.date_debut_prevue ASC
            `;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération du planning prévisionnel:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer le planning d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            const { annee = new Date().getFullYear() } = req.query;

            const query = `
                SELECT 
                    p.*,
                    i.nom as institution_nom
                FROM ${this.tableName} p
                LEFT JOIN institutions i ON p.id_institution = i.id
                WHERE p.id_agent = $1 AND p.annee = $2
                ORDER BY p.mois ASC, p.date_debut_prevue ASC
            `;

            const result = await pool.query(query, [agentId, parseInt(annee)]);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération du planning de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Créer un planning prévisionnel
    async create(req, res) {
        try {
            const planningData = req.body;

            // Validation
            if (!planningData.id_agent || !planningData.annee) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent et l\'année sont requis'
                });
            }

            // Récupérer l'institution de l'agent
            const agentQuery = `SELECT id_institution FROM ${this.agentsTable} WHERE id = $1`;
            const agentResult = await pool.query(agentQuery, [planningData.id_agent]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Agent non trouvé' });
            }

            planningData.id_institution = agentResult.rows[0].id_institution;

            // Calculer le nombre de jours si dates fournies
            if (planningData.date_debut_prevue && planningData.date_fin_prevue) {
                const dateDebut = new Date(planningData.date_debut_prevue);
                const dateFin = new Date(planningData.date_fin_prevue);
                const diffTime = Math.abs(dateFin - dateDebut);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                planningData.nombre_jours_prevus = diffDays;
            }

            // Construire la requête d'insertion
            const fields = Object.keys(planningData);
            const values = Object.values(planningData);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const query = `
                INSERT INTO ${this.tableName} (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;

            const result = await pool.query(query, values);
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du planning:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Valider un planning prévisionnel
    async valider(req, res) {
        try {
            const { id } = req.params;

            const query = `
                UPDATE ${this.tableName}
                SET statut = 'valide',
                    valide_par = $2,
                    date_validation = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(query, [id, req.user?.id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Planning non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la validation du planning:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Mettre à jour un planning
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Recalculer le nombre de jours si dates modifiées
            if (updateData.date_debut_prevue && updateData.date_fin_prevue) {
                const dateDebut = new Date(updateData.date_debut_prevue);
                const dateFin = new Date(updateData.date_fin_prevue);
                const diffTime = Math.abs(dateFin - dateDebut);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                updateData.nombre_jours_prevus = diffDays;
            }

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
                return res.status(404).json({ success: false, message: 'Planning non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du planning:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Supprimer un planning
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Planning non trouvé' });
            }

            res.json({ success: true, message: 'Planning supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du planning:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Rapport du planning par trimestre
    async getRapportByTrimestre(req, res) {
        try {
            const { id_institution, annee, trimestre } = req.query;

            if (!annee || !trimestre) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'année et le trimestre sont requis'
                });
            }

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE p.annee = $1 AND p.trimestre = $2';
            const params = [parseInt(annee), parseInt(trimestre)];
            let paramIndex = 3;

            if (institutionId) {
                whereClause += ` AND p.id_institution = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            const query = `
                SELECT 
                    p.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    i.nom as institution_nom
                FROM ${this.tableName} p
                JOIN ${this.agentsTable} a ON p.id_agent = a.id
                LEFT JOIN institutions i ON p.id_institution = i.id
                ${whereClause}
                ORDER BY p.mois ASC, a.nom, a.prenom
            `;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la génération du rapport:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }
}

module.exports = new PlanningPrevisionnelInstitutionsController();

