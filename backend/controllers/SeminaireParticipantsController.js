const pool = require('../config/database');

class SeminaireParticipantsController {
    // Obtenir tous les participants d'un séminaire
    static async getBySeminaire(req, res) {
        try {
            const { seminaireId } = req.params;
            const query = `
                SELECT 
                    sp.*,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.email
                FROM seminaire_participants sp
                LEFT JOIN agents a ON sp.id_agent = a.id
                WHERE sp.id_seminaire = $1
                ORDER BY a.nom, a.prenom
            `;

            const result = await pool.query(query, [seminaireId]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des participants:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des participants' });
        }
    }

    // Ajouter un participant à un séminaire
    static async addParticipant(req, res) {
        try {
            const { seminaireId } = req.params;
            const { id_agent, statut_participation, notes } = req.body;

            // Validation des données
            if (!id_agent) {
                return res.status(400).json({
                    error: 'L\'identifiant de l\'agent est obligatoire'
                });
            }

            // Vérifier que le séminaire existe
            const seminaireCheck = await pool.query('SELECT id FROM seminaire_formation WHERE id = $1', [seminaireId]);
            if (seminaireCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Séminaire non trouvé' });
            }

            // Vérifier que l'agent existe
            const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [id_agent]);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Agent non trouvé' });
            }

            // Vérifier que l'agent n'est pas déjà inscrit
            const existingParticipant = await pool.query(
                'SELECT id FROM seminaire_participants WHERE id_seminaire = $1 AND id_agent = $2', [seminaireId, id_agent]
            );
            if (existingParticipant.rows.length > 0) {
                return res.status(400).json({ error: 'Cet agent est déjà inscrit à ce séminaire' });
            }

            const query = `
                INSERT INTO seminaire_participants 
                (id_seminaire, id_agent, statut_participation, notes)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;

            const values = [
                seminaireId,
                id_agent,
                statut_participation || 'inscrit',
                notes || null
            ];
            const result = await pool.query(query, values);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de l\'ajout du participant:', error);
            res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du participant' });
        }
    }

    // Mettre à jour le statut d'un participant
    static async updateParticipant(req, res) {
        try {
            const { participantId } = req.params;
            const { statut_participation, notes } = req.body;

            // Vérifier que le participant existe
            const existingParticipant = await pool.query('SELECT id FROM seminaire_participants WHERE id = $1', [participantId]);
            if (existingParticipant.rows.length === 0) {
                return res.status(404).json({ error: 'Participant non trouvé' });
            }

            const query = `
                UPDATE seminaire_participants 
                SET 
                    statut_participation = COALESCE($2, statut_participation),
                    notes = COALESCE($3, notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const values = [participantId, statut_participation, notes];
            const result = await pool.query(query, values);

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du participant:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du participant' });
        }
    }

    // Supprimer un participant d'un séminaire
    static async removeParticipant(req, res) {
        try {
            const { participantId } = req.params;

            // Vérifier que le participant existe
            const existingParticipant = await pool.query('SELECT id FROM seminaire_participants WHERE id = $1', [participantId]);
            if (existingParticipant.rows.length === 0) {
                return res.status(404).json({ error: 'Participant non trouvé' });
            }

            const query = 'DELETE FROM seminaire_participants WHERE id = $1';
            await pool.query(query, [participantId]);

            res.json({ message: 'Participant supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du participant:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la suppression du participant' });
        }
    }

    // Obtenir les statistiques des participants d'un séminaire
    static async getStatistics(req, res) {
        try {
            const { seminaireId } = req.params;
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_participants,
                    COUNT(CASE WHEN statut_participation = 'inscrit' THEN 1 END) as inscrits,
                    COUNT(CASE WHEN statut_participation = 'present' THEN 1 END) as presents,
                    COUNT(CASE WHEN statut_participation = 'absent' THEN 1 END) as absents,
                    COUNT(CASE WHEN statut_participation = 'excuse' THEN 1 END) as excuses
                FROM seminaire_participants
                WHERE id_seminaire = $1
            `;

            const result = await pool.query(statsQuery, [seminaireId]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
        }
    }

    // Obtenir tous les agents disponibles (non inscrits) pour un séminaire, filtrés par ministère/entité
    static async getAvailableAgents(req, res) {
        try {
            const { seminaireId } = req.params;

            // Récupérer l'organisme de l'utilisateur connecté pour filtrer les agents
            let userEntite = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);

                    if (userQuery.rows.length > 0) {
                        const userData = userQuery.rows[0];
                        // Priorité à l'entité principale si disponible
                        userEntite = userData.id_entite_principale || userData.id_ministere;
                        console.log(`🔍 Filtrage des agents par entité: ${userEntite}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }

            let query = `
                SELECT a.id, a.nom, a.prenom, a.matricule, a.email,
                       e.nom as entite_nom, m.nom as ministere_nom
                FROM agents a
                LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id NOT IN (
                    SELECT id_agent 
                    FROM seminaire_participants 
                    WHERE id_seminaire = $1
                )
            `;

            const values = [seminaireId];
            let paramCount = 1;

            // Filtrer par ministère/entité de l'utilisateur connecté
            if (userEntite) {
                paramCount++;
                query += ` AND (a.id_entite_principale = $${paramCount} OR a.id_ministere = $${paramCount})`;
                values.push(userEntite);
            }

            query += ` ORDER BY a.nom, a.prenom`;

            const result = await pool.query(query, values);

            console.log(`✅ ${result.rows.length} agent(s) trouvé(s) pour l'entité ${userEntite}`);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des agents disponibles:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des agents disponibles' });
        }
    }

    // Obtenir tous les séminaires d'un agent
    static async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            
            console.log(`📥 Récupération des séminaires pour l'agent ${agentId}`);
            
            // Vérifier d'abord si l'agent existe
            const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [agentId]);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Agent non trouvé' 
                });
            }
            
            const query = `
                SELECT 
                    sf.id,
                    sf.theme_seminaire,
                    sf.date_debut,
                    sf.date_fin,
                    sf.lieu,
                    sf.type_organisme,
                    sf.id_entite,
                    sp.id as participation_id,
                    sp.statut_participation,
                    sp.notes,
                    sp.created_at as date_inscription,
                    e.nom as organisme_nom,
                    m.nom as ministere_nom
                FROM seminaire_participants sp
                INNER JOIN seminaire_formation sf ON sp.id_seminaire = sf.id
                LEFT JOIN entites_administratives e ON sf.id_entite = e.id AND sf.type_organisme = 'entite'
                LEFT JOIN ministeres m ON sf.id_entite = m.id AND sf.type_organisme = 'ministere'
                WHERE sp.id_agent = $1
                ORDER BY sf.date_debut DESC, sf.date_fin DESC
            `;

            const result = await pool.query(query, [agentId]);
            
            console.log(`✅ ${result.rows.length} séminaire(s) trouvé(s) pour l'agent ${agentId}`);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des séminaires de l\'agent:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({ 
                success: false,
                error: 'Erreur serveur lors de la récupération des séminaires de l\'agent',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = SeminaireParticipantsController;