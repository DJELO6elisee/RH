const db = require('../config/database');

class NotificationsController {
    // Récupérer les notifications d'un agent
    static async getNotificationsByAgent(req, res) {
        try {
            const { id_agent } = req.params;
            const { lu, type_notification, page = 1, limit = 20 } = req.query;

            let query = `
                SELECT n.*, d.type_demande, d.description, d.status, d.niveau_actuel
                FROM notifications_demandes n
                LEFT JOIN demandes d ON n.id_demande = d.id
                WHERE n.id_agent_destinataire = ?
            `;

            const params = [id_agent];

            if (lu !== undefined) {
                query += ' AND n.lu = ?';
                params.push(lu === 'true' ? 1 : 0);
            }

            if (type_notification) {
                query += ' AND n.type_notification = ?';
                params.push(type_notification);
            }

            query += ' ORDER BY n.date_creation DESC';

            // Pagination
            const offset = (page - 1) * limit;
            query += ` LIMIT ${limit} OFFSET ${offset}`;

            const [notifications] = await db.execute(query, params);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM notifications_demandes n 
                WHERE n.id_agent_destinataire = ?
                ${lu !== undefined ? ' AND n.lu = ?' : ''}
                ${type_notification ? ' AND n.type_notification = ?' : ''}
            `;

            const countParams = [id_agent];
            if (lu !== undefined) countParams.push(lu === 'true' ? 1 : 0);
            if (type_notification) countParams.push(type_notification);

            const [countResult] = await db.execute(countQuery, countParams);
            const total = countResult[0].total;

            res.json({
                success: true,
                data: notifications,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / limit)
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
                SET lu = TRUE, date_lecture = NOW() 
                WHERE id = ? AND id_agent_destinataire = ?
            `;

            const [result] = await db.execute(query, [id_notification, req.user.id_agent]);

            if (result.affectedRows === 0) {
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
            console.error('Erreur lors du marquage de la notification:', error);
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
                SET lu = TRUE, date_lecture = NOW() 
                WHERE id_agent_destinataire = ? AND lu = FALSE
            `;

            const [result] = await db.execute(query, [id_agent]);

            res.json({
                success: true,
                message: `${result.affectedRows} notifications marquées comme lues`
            });

        } catch (error) {
            console.error('Erreur lors du marquage des notifications:', error);
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

            const query = `
                DELETE FROM notifications_demandes 
                WHERE id = ? AND id_agent_destinataire = ?
            `;

            const [result] = await db.execute(query, [id_notification, req.user.id_agent]);

            if (result.affectedRows === 0) {
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
                WHERE id_agent_destinataire = ? AND lu = FALSE
            `;

            const [result] = await db.execute(query, [id_agent]);

            res.json({
                success: true,
                data: {
                    nombre_non_lues: result[0].nombre_non_lues
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
            const { periode = '30' } = req.query; // jours

            const query = `
                SELECT 
                    COUNT(*) as total_notifications,
                    SUM(CASE WHEN lu = FALSE THEN 1 ELSE 0 END) as non_lues,
                    SUM(CASE WHEN type_notification = 'nouvelle_demande' THEN 1 ELSE 0 END) as nouvelles_demandes,
                    SUM(CASE WHEN type_notification = 'demande_approuvee' THEN 1 ELSE 0 END) as demandes_approuvees,
                    SUM(CASE WHEN type_notification = 'demande_rejetee' THEN 1 ELSE 0 END) as demandes_rejetees,
                    SUM(CASE WHEN type_notification = 'demande_en_cours' THEN 1 ELSE 0 END) as demandes_en_cours,
                    SUM(CASE WHEN type_notification = 'rappel_validation' THEN 1 ELSE 0 END) as rappels_validation
                FROM notifications_demandes 
                WHERE id_agent_destinataire = ? 
                AND date_creation >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `;

            const [stats] = await db.execute(query, [id_agent, periode]);

            res.json({
                success: true,
                data: stats[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques des notifications:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Créer une notification manuelle
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
                ) VALUES (?, ?, ?, ?, ?)
            `;

            const [result] = await db.execute(query, [
                id_demande, id_agent_destinataire, type_notification, titre, message
            ]);

            res.status(201).json({
                success: true,
                message: 'Notification créée avec succès',
                data: { id: result.insertId }
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