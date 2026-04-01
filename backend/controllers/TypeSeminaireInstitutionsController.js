const db = require('../config/database');

class TypeSeminaireInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT t.*, i.nom as institution_nom
                FROM type_de_seminaire_de_formation_institutions t
                LEFT JOIN institutions i ON t.id_institution = i.id
                ORDER BY t.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des types de séminaires:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT t.*, i.nom as institution_nom
                FROM type_de_seminaire_de_formation_institutions t
                LEFT JOIN institutions i ON t.id_institution = i.id
                WHERE t.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Type de séminaire non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du type de séminaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_institution, libelle, annee } = req.body;

            if (!id_institution || !libelle || !annee) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'institution, le libellé et l\'année sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO type_de_seminaire_de_formation_institutions (id_institution, libelle, annee)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [id_institution, libelle, annee]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du type de séminaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_institution, libelle, annee } = req.body;

            const result = await db.query(`
                UPDATE type_de_seminaire_de_formation_institutions SET
                    id_institution = COALESCE($1, id_institution),
                    libelle = COALESCE($2, libelle),
                    annee = COALESCE($3, annee),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `, [id_institution, libelle, annee, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Type de séminaire non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du type de séminaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM type_de_seminaire_de_formation_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Type de séminaire non trouvé' });
            }

            res.json({ success: true, message: 'Type de séminaire supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du type de séminaire:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new TypeSeminaireInstitutionsController();