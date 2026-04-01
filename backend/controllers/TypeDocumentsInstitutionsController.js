const db = require('../config/database');

class TypeDocumentsInstitutionsController {
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    t.*,
                    s.libelle as service_nom,
                    i.nom as institution_nom
                FROM type_de_documents_institutions t
                LEFT JOIN services_institutions s ON t.id_service = s.id
                LEFT JOIN institutions i ON t.id_institution = i.id
                ORDER BY t.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des types de documents:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    t.*,
                    s.libelle as service_nom,
                    i.nom as institution_nom
                FROM type_de_documents_institutions t
                LEFT JOIN services_institutions s ON t.id_service = s.id
                LEFT JOIN institutions i ON t.id_institution = i.id
                WHERE t.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Type de document non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du type de document:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async create(req, res) {
        try {
            const { id_service, id_institution, libelle } = req.body;

            if (!id_institution || !libelle) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'institution et le libellé sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO type_de_documents_institutions (id_service, id_institution, libelle)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [id_service, id_institution, libelle]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du type de document:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_service, id_institution, libelle } = req.body;

            const result = await db.query(`
                UPDATE type_de_documents_institutions SET
                    id_service = COALESCE($1, id_service),
                    id_institution = COALESCE($2, id_institution),
                    libelle = COALESCE($3, libelle),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `, [id_service, id_institution, libelle, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Type de document non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du type de document:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM type_de_documents_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Type de document non trouvé' });
            }

            res.json({ success: true, message: 'Type de document supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du type de document:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new TypeDocumentsInstitutionsController();