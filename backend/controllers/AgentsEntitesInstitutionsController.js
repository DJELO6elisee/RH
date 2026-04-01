const db = require('../config/database');

class AgentsEntitesInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    ae.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM agents_entites_institutions ae
                LEFT JOIN agents_institutions_main a ON ae.id_agent = a.id
                LEFT JOIN entites_institutions e ON ae.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                ORDER BY ae.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des affectations agents-entités:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    ae.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM agents_entites_institutions ae
                LEFT JOIN agents_institutions_main a ON ae.id_agent = a.id
                LEFT JOIN entites_institutions e ON ae.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                WHERE ae.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Affectation non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'affectation:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_agent, id_entite, date_debut, date_fin, statut } = req.body;

            if (!id_agent || !id_entite || !date_debut) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent, l\'entité et la date de début sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO agents_entites_institutions (id_agent, id_entite, date_debut, date_fin, statut)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [id_agent, id_entite, date_debut, date_fin, statut]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'affectation:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_agent, id_entite, date_debut, date_fin, statut } = req.body;

            const result = await db.query(`
                UPDATE agents_entites_institutions SET
                    id_agent = COALESCE($1, id_agent),
                    id_entite = COALESCE($2, id_entite),
                    date_debut = COALESCE($3, date_debut),
                    date_fin = COALESCE($4, date_fin),
                    statut = COALESCE($5, statut),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `, [id_agent, id_entite, date_debut, date_fin, statut, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Affectation non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'affectation:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM agents_entites_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Affectation non trouvée' });
            }

            res.json({ success: true, message: 'Affectation supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'affectation:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer les affectations d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            const result = await db.query(`
                SELECT 
                    ae.*,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM agents_entites_institutions ae
                LEFT JOIN entites_institutions e ON ae.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                WHERE ae.id_agent = $1 
                ORDER BY ae.date_debut DESC
            `, [agentId]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des affectations de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer les agents d'une entité
    async getByEntite(req, res) {
        try {
            const { entiteId } = req.params;
            const result = await db.query(`
                SELECT 
                    ae.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule
                FROM agents_entites_institutions ae
                LEFT JOIN agents_institutions_main a ON ae.id_agent = a.id
                WHERE ae.id_entite = $1 
                ORDER BY ae.date_debut DESC
            `, [entiteId]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents de l\'entité:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new AgentsEntitesInstitutionsController();