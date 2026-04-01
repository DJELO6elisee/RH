const db = require('../config/database');

class NotificationsController {
    // Récupérer les notifications d'un agent
    static async getNotificationsByAgent(req, res) {
        try {
            const { id_agent } = req.params;
            const { page = 1, limit = 10, lu = null } = req.query;

            let query = `
                SELECT n.*, d.type_demande, d.description, d.status, d.niveau_actuel
                FROM notifications_demandes n
                LEFT JOIN demandes d ON n.id_demande = d.id
                WHERE n.id_agent_destinataire = $1
            `;

            const params = [id_agent];
            let paramCount = 1;

            if (lu !== null) {
                paramCount++;
                query += ` AND n.lu = $${paramCount}`;
                params.push(lu === 'true');
            }

            query += ` ORDER BY n.date_creation DESC`;

            // Pagination
            const offset = (page - 1) * limit;
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(limit);

            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);

            const result = await db.query(query, params);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: result.rows.length
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Marquer une notification comme lue
    static async marquerCommeLue(req, res) {
        try {
            const { id_notification } = req.params;

            const query = `
                UPDATE notifications_demandes 
                SET lu = true, date_lecture = CURRENT_TIMESTAMP 
                WHERE id = $1
            `;

            const result = await db.query(query, [id_notification]);

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification non trouvée'
                });
            }

            res.json({
                success: true,
                message: 'Notification marquée comme lue'
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de la notification:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Marquer toutes les notifications comme lues
    static async marquerToutesCommeLues(req, res) {
        try {
            const { id_agent } = req.params;

            const query = `
                UPDATE notifications_demandes 
                SET lu = true, date_lecture = CURRENT_TIMESTAMP 
                WHERE id_agent_destinataire = $1 AND lu = false
            `;

            const result = await db.query(query, [id_agent]);

            res.json({
                success: true,
                message: `${result.rowCount} notifications marquées comme lues`
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour des notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Supprimer une notification
    static async supprimerNotification(req, res) {
        try {
            const { id_notification } = req.params;

            const query = 'DELETE FROM notifications_demandes WHERE id = $1';
            const result = await db.query(query, [id_notification]);

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification non trouvée'
                });
            }

            res.json({
                success: true,
                message: 'Notification supprimée'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de la notification:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer le nombre de notifications non lues
    static async getNombreNotificationsNonLues(req, res) {
        try {
            const { id_agent } = req.params;

            const query = `
                SELECT COUNT(*) as nombre_non_lues
                FROM notifications_demandes 
                WHERE id_agent_destinataire = $1 AND lu = false
            `;

            const result = await db.query(query, [id_agent]);

            res.json({
                success: true,
                data: {
                    nombre_non_lues: parseInt(result.rows[0].nombre_non_lues)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du nombre de notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les statistiques des notifications
    static async getStatistiquesNotifications(req, res) {
        try {
            const { id_agent } = req.params;

            const query = `
                SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN lu = false THEN 1 END) as non_lues,
                    COUNT(CASE WHEN lu = true THEN 1 END) as lues,
                    COUNT(CASE WHEN type_notification = 'nouvelle_demande' THEN 1 END) as nouvelles_demandes,
                    COUNT(CASE WHEN type_notification = 'demande_approuvee' THEN 1 END) as demandes_approuvees,
                    COUNT(CASE WHEN type_notification = 'demande_rejetee' THEN 1 END) as demandes_rejetees
                FROM notifications_demandes 
                WHERE id_agent_destinataire = $1
            `;

            const result = await db.query(query, [id_agent]);

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Créer une notification
    static async creerNotification(req, res) {
        try {
            const {
                id_demande,
                id_agent_destinataire,
                type_notification,
                titre,
                message
            } = req.body;

            const query = `
                INSERT INTO notifications_demandes (
                    id_demande, id_agent_destinataire, type_notification, titre, message
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `;

            const result = await db.query(query, [
                id_demande, id_agent_destinataire, type_notification, titre, message
            ]);

            res.status(201).json({
                success: true,
                message: 'Notification créée avec succès',
                data: { id: result.rows[0].id }
            });

        } catch (error) {
            console.error('Erreur lors de la création de la notification:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
}

module.exports = NotificationsController;