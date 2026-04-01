const pool = require('../config/database');
const EvenementsController = require('./EvenementsController');

class EvenementParticipantsController {
    // Obtenir tous les participants d'un événement
    static async getByEvenement(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { id } = req.params;
            const query = `
                SELECT 
                    ep.*,
                    a.id as agent_id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.email,
                    a.fonction_actuelle
                FROM evenement_participants ep
                LEFT JOIN agents a ON ep.id_agent = a.id
                WHERE ep.id_evenement = $1
                ORDER BY a.nom, a.prenom
            `;

            const result = await pool.query(query, [id]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des participants:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des participants' });
        }
    }

    // Ajouter ou mettre à jour les participants d'un événement
    static async saveParticipants(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { id } = req.params;
            const { participants } = req.body;

            if (!Array.isArray(participants)) {
                return res.status(400).json({ error: 'Les participants doivent être un tableau' });
            }

            // Vérifier que l'événement existe
            const eventCheck = await pool.query('SELECT id FROM evenements WHERE id = $1', [id]);
            if (eventCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Événement non trouvé' });
            }

            // Supprimer tous les participants existants
            await pool.query('DELETE FROM evenement_participants WHERE id_evenement = $1', [id]);

            // Ajouter les nouveaux participants
            if (participants.length > 0) {
                const insertQuery = `
                    INSERT INTO evenement_participants (id_evenement, id_agent, created_at)
                    VALUES ${participants.map((_, index) => `($1, $${index + 2}, CURRENT_TIMESTAMP)`).join(', ')}
                    RETURNING *
                `;
                const values = [id, ...participants];
                await pool.query(insertQuery, values);
            }

            // Récupérer les participants mis à jour
            const updatedQuery = `
                SELECT 
                    ep.*,
                    a.id as agent_id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.email,
                    a.fonction_actuelle
                FROM evenement_participants ep
                LEFT JOIN agents a ON ep.id_agent = a.id
                WHERE ep.id_evenement = $1
                ORDER BY a.nom, a.prenom
            `;
            const result = await pool.query(updatedQuery, [id]);

            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement des participants:', error);
            res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement des participants' });
        }
    }

    // Supprimer un participant
    static async removeParticipant(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { id } = req.params;

            const result = await pool.query('DELETE FROM evenement_participants WHERE id = $1 RETURNING *', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Participant non trouvé' });
            }

            res.json({ message: 'Participant supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du participant:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la suppression du participant' });
        }
    }
}

module.exports = EvenementParticipantsController;

