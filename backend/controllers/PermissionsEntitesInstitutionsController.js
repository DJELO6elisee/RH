const db = require('../config/database');

class PermissionsEntitesInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    p.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM permissions_entites_institutions p
                LEFT JOIN agents_institutions_main a ON p.id_agent = a.id
                LEFT JOIN entites_institutions e ON p.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                ORDER BY p.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des permissions:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    p.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule,
                    e.nom as entite_nom,
                    i.nom as institution_nom
                FROM permissions_entites_institutions p
                LEFT JOIN agents_institutions_main a ON p.id_agent = a.id
                LEFT JOIN entites_institutions e ON p.id_entite = e.id
                LEFT JOIN institutions i ON e.id_institution = i.id
                WHERE p.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Permission non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de la permission:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_agent, id_entite, type_permission, date_debut, date_fin, statut } = req.body;

            if (!id_agent || !id_entite || !type_permission) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent, l\'entité et le type de permission sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO permissions_entites_institutions (id_agent, id_entite, type_permission, date_debut, date_fin, statut)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [id_agent, id_entite, type_permission, date_debut, date_fin, statut]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de la permission:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_agent, id_entite, type_permission, date_debut, date_fin, statut } = req.body;

            const result = await db.query(`
                UPDATE permissions_entites_institutions SET
                    id_agent = COALESCE($1, id_agent),
                    id_entite = COALESCE($2, id_entite),
                    type_permission = COALESCE($3, type_permission),
                    date_debut = COALESCE($4, date_debut),
                    date_fin = COALESCE($5, date_fin),
                    statut = COALESCE($6, statut),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *
            `, [id_agent, id_entite, type_permission, date_debut, date_fin, statut, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Permission non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la permission:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM permissions_entites_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Permission non trouvée' });
            }

            res.json({ success: true, message: 'Permission supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la permission:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new PermissionsEntitesInstitutionsController();