const db = require('../config/database');

class TiersInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT t.*, i.nom as institution_nom
                FROM tiers_institutions t
                LEFT JOIN institutions i ON t.id_institution = i.id
                ORDER BY t.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des tiers:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT t.*, i.nom as institution_nom
                FROM tiers_institutions t
                LEFT JOIN institutions i ON t.id_institution = i.id
                WHERE t.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Tiers non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du tiers:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_institution, nom, prenom, telephone, adresse } = req.body;

            if (!id_institution || !nom || !prenom) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'institution, le nom et le prénom sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO tiers_institutions (id_institution, nom, prenom, telephone, adresse)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [id_institution, nom, prenom, telephone, adresse]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du tiers:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_institution, nom, prenom, telephone, adresse } = req.body;

            const result = await db.query(`
                UPDATE tiers_institutions SET
                    id_institution = COALESCE($1, id_institution),
                    nom = COALESCE($2, nom),
                    prenom = COALESCE($3, prenom),
                    telephone = COALESCE($4, telephone),
                    adresse = COALESCE($5, adresse),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6
                RETURNING *
            `, [id_institution, nom, prenom, telephone, adresse, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Tiers non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du tiers:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM tiers_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Tiers non trouvé' });
            }

            res.json({ success: true, message: 'Tiers supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du tiers:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new TiersInstitutionsController();