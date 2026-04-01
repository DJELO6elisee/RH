const db = require('../config/database');

class NotificationsController {
    // Récupérer les notifications d'un agent
    static async getNotificationsByAgent(req, res) {
        try {
            const { id_agent } = req.params;
            const { page = 1, limit = 10, lu = null, type_notification = '' } = req.query;

            // Récupérer le rôle de l'agent pour filtrer les notifications
            const roleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_agent]);
            const userRole = roleResult.rows[0] ? roleResult.rows[0].role_nom : 'agent';

            let query = `
                SELECT n.*, d.type_demande, d.description, d.status, d.niveau_actuel
                FROM notifications_demandes n
                LEFT JOIN demandes d ON n.id_demande = d.id
                WHERE n.id_agent_destinataire = $1
            `;

            const params = [id_agent];
            let paramCount = 1;

            // Filtrer les notifications selon le rôle
            if (userRole === 'agent') {
                // Les agents voient toutes leurs notifications : validations, rejets, notes de service, anniversaires, congés prévisionnels
                paramCount++;
                query += ` AND n.type_notification IN ($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, $${paramCount + 6})`;
                params.push('demande_approuvee', 'demande_rejetee', 'document_transmis', 'note_service', 'anniversaire_aujourdhui', 'anniversaire_avenir', 'conges_previsionnel');
                paramCount += 6;
            }
            // Les autres rôles (chef_service, drh, ministre) voient toutes leurs notifications

            // Filtrer par type de notification
            if (type_notification && type_notification !== '') {
                paramCount++;
                if (type_notification === 'note_service') {
                    // Pour les notes de service, inclure aussi les demandes approuvées qui sont des notes de service
                    query += ` AND (n.type_notification = $${paramCount} OR (n.type_notification = 'demande_approuvee' AND d.type_demande = 'note_service'))`;
                    params.push(type_notification);
                } else if (type_notification === 'anniversaire') {
                    // Pour les anniversaires, inclure les deux types
                    query += ` AND (n.type_notification = $${paramCount} OR n.type_notification = $${paramCount + 1})`;
                    params.push('anniversaire_aujourdhui', 'anniversaire_avenir');
                    paramCount++;
                } else {
                    query += ` AND n.type_notification = $${paramCount}`;
                    params.push(type_notification);
                }
            }

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

    // Récupérer une notification par son ID
    static async getNotificationById(req, res) {
        try {
            const { id_notification } = req.params;

            const query = `
                SELECT n.*, d.type_demande, d.description, d.status, d.niveau_actuel
                FROM notifications_demandes n
                LEFT JOIN demandes d ON n.id_demande = d.id
                WHERE n.id = $1
            `;

            const result = await db.query(query, [id_notification]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Notification non trouvée'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la notification:', error);
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

            // Récupérer le rôle de l'agent pour filtrer les notifications
            const roleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_agent]);
            const userRole = roleResult.rows[0] ? roleResult.rows[0].role_nom : 'agent';

            let query = `
                SELECT COUNT(*) as nombre_non_lues
                FROM notifications_demandes 
                WHERE id_agent_destinataire = $1 AND lu = false
            `;

            const params = [id_agent];
            let paramCount = 1;

            // Filtrer les notifications selon le rôle
            if (userRole === 'agent') {
                // Les agents simples comptent les notifications de validation/rejet de leurs demandes et les congés prévisionnels
                paramCount++;
                query += ` AND type_notification IN ($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3})`;
                params.push('demande_approuvee', 'demande_rejetee', 'document_transmis', 'conges_previsionnel');
            }
            // Les autres rôles (chef_service, drh, ministre) comptent toutes leurs notifications

            const result = await db.query(query, params);

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

    // Envoyer une note de service à tous les agents sélectionnés
    static async envoyerNoteService(req, res) {
            try {
                const {
                    contenu,
                    date_evenement,
                    date_debut,
                    date_fin,
                    lieu,
                    scope,
                    id_service,
                    id_ministere
                } = req.body;

                // Validation des données requises
                if (!contenu) {
                    return res.status(400).json({
                        success: false,
                        error: 'Le contenu de la note est requis'
                    });
                }

                if (!scope) {
                    return res.status(400).json({
                        success: false,
                        error: 'La portée d\'envoi est requise'
                    });
                }

                // Debug: Afficher les données reçues
                console.log('Données reçues:', {
                    contenu,
                    scope,
                    id_ministere,
                    id_service,
                    user: req.user
                });

                // Si pas d'ID ministère, essayer de le récupérer depuis la base de données
                if (!id_ministere) {
                    console.log('ID ministère manquant, tentative de récupération...');

                    // Essayer d'abord depuis req.user
                    if (req.user && req.user.id_ministere) {
                        id_ministere = req.user.id_ministere;
                        console.log('ID ministère récupéré depuis req.user:', id_ministere);
                    } else if (req.user && req.user.id_agent) {
                        // Récupérer l'ID ministère depuis la base de données
                        try {
                            const agentQuery = `
                            SELECT id_ministere 
                            FROM agents 
                            WHERE id = $1
                        `;
                            const agentResult = await db.query(agentQuery, [req.user.id_agent]);
                            if (agentResult.rows.length > 0) {
                                id_ministere = agentResult.rows[0].id_ministere;
                                console.log('ID ministère récupéré depuis la base de données:', id_ministere);
                            }
                        } catch (error) {
                            console.error('Erreur lors de la récupération de l\'ID ministère:', error);
                        }
                    }
                }

                if (!id_ministere) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID ministère requis. Veuillez vous assurer d\'être connecté avec un compte valide.'
                    });
                }

                if (scope === 'service' && !id_service) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID service requis pour la portée service'
                    });
                }

                // Récupérer la liste des agents selon la portée
                let agentsQuery;
                let params;

                if (scope === 'service') {
                    // Envoyer aux agents du service uniquement
                    agentsQuery = `
                    SELECT a.id, a.prenom, a.nom, a.email
                    FROM agents a
                    WHERE a.id_direction = $1 AND a.id_ministere = $2
                `;
                    params = [id_service, id_ministere];
                } else {
                    // Envoyer à tous les agents du ministère
                    agentsQuery = `
                    SELECT a.id, a.prenom, a.nom, a.email
                    FROM agents a
                    WHERE a.id_ministere = $1
                `;
                    params = [id_ministere];
                }

                const agentsResult = await db.query(agentsQuery, params);
                const agents = agentsResult.rows;

                if (agents.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Aucun agent trouvé pour la portée sélectionnée'
                    });
                }

                // Créer les notifications pour chaque agent
                const notifications = [];
                const titre = 'Note de Service';
                const message = `Nouvelle note de service reçue${date_evenement ? ` pour l'événement du ${date_evenement}` : ''}${lieu ? ` à ${lieu}` : ''}`;

            // Créer une demande fictive pour les notes de service
            const demandeQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, status, niveau_actuel, 
                    date_creation, priorite, date_debut, date_fin, lieu
                ) VALUES ($1, 'note_service', $2, 'approuve', 'finalise', CURRENT_TIMESTAMP, 'normale', $3, $4, $5)
                RETURNING id
            `;

            const demandeResult = await db.query(demandeQuery, [
                req.user.id_agent, contenu, date_debut, date_fin, lieu
            ]);
            const id_demande_fictive = demandeResult.rows[0].id;

            for (const agent of agents) {
                const notificationQuery = `
                    INSERT INTO notifications_demandes (
                        id_demande, id_agent_destinataire, type_notification, titre, message
                    ) VALUES ($1, $2, 'note_service', $3, $4)
                    RETURNING id
                `;

                const result = await db.query(notificationQuery, [
                    id_demande_fictive, agent.id, titre, message
                ]);

                notifications.push({
                    id: result.rows[0].id,
                    agent: {
                        id: agent.id,
                        nom: agent.nom,
                        prenom: agent.prenom,
                        email: agent.email
                    }
                });
            }

            // Log de l'envoi
            console.log(`Note de service envoyée à ${agents.length} agents (scope: ${scope})`);

            res.status(201).json({
                success: true,
                message: `Note de service envoyée à ${agents.length} agents avec succès`,
                data: {
                    nombre_agents: agents.length,
                    scope: scope,
                    notifications: notifications
                }
            });

        } catch (error) {
            console.error('Erreur lors de l\'envoi de la note de service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
}

module.exports = NotificationsController;