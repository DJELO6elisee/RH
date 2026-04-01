const db = require('../config/database');

class InstitutionsController {
    // Récupérer toutes les institutions
    async getAll(req, res) {
        try {
            const result = await db.query('SELECT * FROM institutions ORDER BY id');
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des institutions:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer une institution par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('SELECT * FROM institutions WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Institution non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'institution:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Créer une nouvelle institution
    async create(req, res) {
        try {
            const { nom, sigle, description, adresse, telephone, email, website, logo_url, is_active } = req.body;

            // Validation des données
            if (!nom) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom est obligatoire'
                });
            }

            // Générer automatiquement le code
            const lastCodeResult = await db.query(
                'SELECT code FROM institutions WHERE code LIKE $1 ORDER BY code DESC LIMIT 1', ['INST%']
            );

            let nextCode = 'INST001';
            if (lastCodeResult.rows.length > 0) {
                const lastCode = lastCodeResult.rows[0].code;
                const lastNumber = parseInt(lastCode.replace('INST', ''));
                nextCode = `INST${String(lastNumber + 1).padStart(3, '0')}`;
            }

            const result = await db.query(
                'INSERT INTO institutions (code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *', [nextCode, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active]
            );

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'institution:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Mettre à jour une institution
    async update(req, res) {
        try {
            const { id } = req.params;
            const { code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active } = req.body;

            const result = await db.query(
                'UPDATE institutions SET code = $1, nom = $2, sigle = $3, description = $4, adresse = $5, telephone = $6, email = $7, website = $8, logo_url = $9, is_active = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 RETURNING *', [code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Institution non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'institution:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Supprimer une institution
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await db.query('DELETE FROM institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Institution non trouvée' });
            }

            res.json({ success: true, message: 'Institution supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'institution:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer la hiérarchie des entités d'une institution
    async getHierarchy(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'institution
            const institutionResult = await db.query('SELECT * FROM institutions WHERE id = $1', [id]);
            if (institutionResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Institution non trouvée' });
            }

            // Récupérer les entités de l'institution
            const entitesResult = await db.query(
                'SELECT * FROM entites_institutions WHERE id_institution = $1 ORDER BY id', [id]
            );

            res.json({
                success: true,
                data: {
                    institution: institutionResult.rows[0],
                    entites: entitesResult.rows
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération de la hiérarchie:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new InstitutionsController();