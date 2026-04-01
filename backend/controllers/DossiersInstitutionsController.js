const db = require('../config/database');

class DossiersInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    d.*,
                    i.nom as institution_nom,
                    e.nom as entite_nom
                FROM dossiers_institutions d
                LEFT JOIN institutions i ON d.id_institution = i.id
                LEFT JOIN entites_institutions e ON d.id_entite = e.id
                ORDER BY d.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des dossiers:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    d.*,
                    i.nom as institution_nom,
                    e.nom as entite_nom
                FROM dossiers_institutions d
                LEFT JOIN institutions i ON d.id_institution = i.id
                LEFT JOIN entites_institutions e ON d.id_entite = e.id
                WHERE d.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du dossier:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_institution, id_entite, libelle } = req.body;

            if (!id_institution || !id_entite || !libelle) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'institution, l\'entité et le libellé sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO dossiers_institutions (id_institution, id_entite, libelle)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [id_institution, id_entite, libelle]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du dossier:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_institution, id_entite, libelle } = req.body;

            const result = await db.query(`
                UPDATE dossiers_institutions SET
                    id_institution = COALESCE($1, id_institution),
                    id_entite = COALESCE($2, id_entite),
                    libelle = COALESCE($3, libelle),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `, [id_institution, id_entite, libelle, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du dossier:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM dossiers_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Dossier non trouvé' });
            }

            res.json({ success: true, message: 'Dossier supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du dossier:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new DossiersInstitutionsController();