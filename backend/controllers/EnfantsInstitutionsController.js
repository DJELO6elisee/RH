const db = require('../config/database');

class EnfantsInstitutionsController {
    // Récupérer tous les enfants des institutions
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    e.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule
                FROM enfants_institutions e
                LEFT JOIN agents_institutions_main a ON e.id_agent = a.id
                ORDER BY e.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des enfants:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer un enfant par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    e.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule
                FROM enfants_institutions e
                LEFT JOIN agents_institutions_main a ON e.id_agent = a.id
                WHERE e.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Enfant non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'enfant:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Créer un nouvel enfant
    async create(req, res) {
        try {
            const { id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit } = req.body;

            // Validation des données obligatoires
            if (!id_agent || !nom || !prenom || !date_de_naissance) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent, le nom, le prénom et la date de naissance sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO enfants_institutions (id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'enfant:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Mettre à jour un enfant
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit } = req.body;

            const result = await db.query(`
                UPDATE enfants_institutions SET
                    id_agent = COALESCE($1, id_agent),
                    nom = COALESCE($2, nom),
                    prenom = COALESCE($3, prenom),
                    sexe = COALESCE($4, sexe),
                    date_de_naissance = COALESCE($5, date_de_naissance),
                    scolarise = COALESCE($6, scolarise),
                    ayant_droit = COALESCE($7, ayant_droit),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *
            `, [id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Enfant non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'enfant:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Supprimer un enfant
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await db.query('DELETE FROM enfants_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Enfant non trouvé' });
            }

            res.json({ success: true, message: 'Enfant supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'enfant:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer les enfants d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            const result = await db.query(`
                SELECT * FROM enfants_institutions 
                WHERE id_agent = $1 
                ORDER BY date_de_naissance
            `, [agentId]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des enfants de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new EnfantsInstitutionsController();