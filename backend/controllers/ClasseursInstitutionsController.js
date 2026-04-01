const db = require('../config/database');

class ClasseursInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    c.*,
                    i.nom as institution_nom,
                    d.libelle as dossier_nom
                FROM classeurs_institutions c
                LEFT JOIN institutions i ON c.id_institution = i.id
                LEFT JOIN dossiers_institutions d ON c.id_dossier = d.id
                ORDER BY c.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des classeurs:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    c.*,
                    i.nom as institution_nom,
                    d.libelle as dossier_nom
                FROM classeurs_institutions c
                LEFT JOIN institutions i ON c.id_institution = i.id
                LEFT JOIN dossiers_institutions d ON c.id_dossier = d.id
                WHERE c.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Classeur non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du classeur:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_institution, id_dossier, libelle } = req.body;

            if (!id_institution || !id_dossier || !libelle) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'institution, le dossier et le libellé sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO classeurs_institutions (id_institution, id_dossier, libelle)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [id_institution, id_dossier, libelle]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du classeur:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_institution, id_dossier, libelle } = req.body;

            const result = await db.query(`
                UPDATE classeurs_institutions SET
                    id_institution = COALESCE($1, id_institution),
                    id_dossier = COALESCE($2, id_dossier),
                    libelle = COALESCE($3, libelle),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `, [id_institution, id_dossier, libelle, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Classeur non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du classeur:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM classeurs_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Classeur non trouvé' });
            }

            res.json({ success: true, message: 'Classeur supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du classeur:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new ClasseursInstitutionsController();