const db = require('../config/database');

class AffectationsTemporairesInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    at.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM affectations_temporaires_institutions at
                LEFT JOIN agents_institutions_main a ON at.id_agent = a.id
                LEFT JOIN entites_institutions e ON at.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                ORDER BY at.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des affectations temporaires:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    at.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM affectations_temporaires_institutions at
                LEFT JOIN agents_institutions_main a ON at.id_agent = a.id
                LEFT JOIN entites_institutions e ON at.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                WHERE at.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Affectation temporaire non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'affectation temporaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_agent, id_entite, date_debut, date_fin, motif, statut } = req.body;

            if (!id_agent || !id_entite || !date_debut) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent, l\'entité et la date de début sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO affectations_temporaires_institutions (id_agent, id_entite, date_debut, date_fin, motif, statut)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [id_agent, id_entite, date_debut, date_fin, motif, statut]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'affectation temporaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_agent, id_entite, date_debut, date_fin, motif, statut } = req.body;

            const result = await db.query(`
                UPDATE affectations_temporaires_institutions SET
                    id_agent = COALESCE($1, id_agent),
                    id_entite = COALESCE($2, id_entite),
                    date_debut = COALESCE($3, date_debut),
                    date_fin = COALESCE($4, date_fin),
                    motif = COALESCE($5, motif),
                    statut = COALESCE($6, statut),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `, [id_agent, id_entite, date_debut, date_fin, motif, statut, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Affectation temporaire non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'affectation temporaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM affectations_temporaires_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Affectation temporaire non trouvée' });
            }

            res.json({ success: true, message: 'Affectation temporaire supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'affectation temporaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new AffectationsTemporairesInstitutionsController();