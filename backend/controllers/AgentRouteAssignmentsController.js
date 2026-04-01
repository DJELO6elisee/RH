const BaseController = require('./BaseController');
const pool = require('../config/database');

class AgentRouteAssignmentsController extends BaseController {
    constructor() {
        super();
    }

    // Assigner une route à un ou plusieurs agents
    async assignRoutes(req, res) {
        try {
            const { agentIds, routeIds } = req.body;
            const assignedBy = req.user.id; // L'utilisateur connecté (DRH)

            if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La liste des agents est requise'
                });
            }

            if (!routeIds || !Array.isArray(routeIds) || routeIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La liste des routes est requise'
                });
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const assignments = [];
                for (const agentId of agentIds) {
                    for (const routeId of routeIds) {
                        // Utiliser INSERT ... ON CONFLICT pour éviter les doublons
                        const result = await client.query(`
                            INSERT INTO agent_route_assignments 
                            (id_agent, route_id, assigned_by, is_active)
                            VALUES ($1, $2, $3, TRUE)
                            ON CONFLICT (id_agent, route_id) 
                            DO UPDATE SET 
                                is_active = TRUE,
                                assigned_by = $3,
                                updated_at = CURRENT_TIMESTAMP
                            RETURNING *
                        `, [agentId, routeId, assignedBy]);

                        assignments.push(result.rows[0]);
                    }
                }

                await client.query('COMMIT');

                return res.json({
                    success: true,
                    message: `${assignments.length} assignation(s) effectuée(s) avec succès`,
                    data: assignments
                });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Erreur lors de l\'assignation des routes:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'assignation des routes',
                error: error.message
            });
        }
    }

    // Récupérer toutes les routes assignées à un agent
    async getAgentRoutes(req, res) {
        try {
            const { agentId } = req.params;

            const result = await pool.query(`
                SELECT 
                    ara.*,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    u.username AS assigned_by_username
                FROM agent_route_assignments ara
                LEFT JOIN agents a ON ara.id_agent = a.id
                LEFT JOIN utilisateurs u ON ara.assigned_by = u.id
                WHERE ara.id_agent = $1 AND ara.is_active = TRUE
                ORDER BY ara.assigned_at DESC
            `, [agentId]);

            return res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des routes de l\'agent:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des routes',
                error: error.message
            });
        }
    }

    // Récupérer tous les agents assignés à une route
    async getRouteAgents(req, res) {
        try {
            const { routeId } = req.params;

            const result = await pool.query(`
                SELECT 
                    ara.*,
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.email,
                    d.libelle AS direction_libelle,
                    s.libelle AS service_libelle,
                    u.username AS assigned_by_username
                FROM agent_route_assignments ara
                LEFT JOIN agents a ON ara.id_agent = a.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN services s ON a.id_service = s.id
                LEFT JOIN utilisateurs u ON ara.assigned_by = u.id
                WHERE ara.route_id = $1 AND ara.is_active = TRUE
                ORDER BY a.nom, a.prenom
            `, [routeId]);

            return res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents de la route:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents',
                error: error.message
            });
        }
    }

    // Récupérer toutes les assignations (pour l'interface DRH)
    async getAllAssignments(req, res) {
        try {
            const { agentId, routeId } = req.query;

            let query = `
                SELECT 
                    ara.*,
                    a.id AS agent_id,
                    a.matricule,
                    a.nom AS agent_nom,
                    a.prenom AS agent_prenom,
                    a.email AS agent_email,
                    d.libelle AS direction_libelle,
                    s.libelle AS service_libelle,
                    u.username AS assigned_by_username,
                    u.id AS assigned_by_id
                FROM agent_route_assignments ara
                LEFT JOIN agents a ON ara.id_agent = a.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN services s ON a.id_service = s.id
                LEFT JOIN utilisateurs u ON ara.assigned_by = u.id
                WHERE ara.is_active = TRUE
            `;

            const params = [];
            if (agentId) {
                params.push(agentId);
                query += ` AND ara.id_agent = $${params.length}`;
            }
            if (routeId) {
                params.push(routeId);
                query += ` AND ara.route_id = $${params.length}`;
            }

            query += ' ORDER BY ara.assigned_at DESC';

            const result = await pool.query(query, params);

            return res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des assignations:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des assignations',
                error: error.message
            });
        }
    }

    // Retirer une route d'un agent (désactiver l'assignation)
    async unassignRoute(req, res) {
        try {
            const { assignmentId } = req.params;

            const result = await pool.query(`
                UPDATE agent_route_assignments
                SET is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [assignmentId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignation non trouvée'
                });
            }

            return res.json({
                success: true,
                message: 'Route retirée avec succès',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors du retrait de la route:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors du retrait de la route',
                error: error.message
            });
        }
    }

    // Retirer plusieurs routes de plusieurs agents en une fois
    async unassignRoutes(req, res) {
        try {
            const { assignmentIds } = req.body;

            if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La liste des IDs d\'assignation est requise'
                });
            }

            const result = await pool.query(`
                UPDATE agent_route_assignments
                SET is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1)
                RETURNING *
            `, [assignmentIds]);

            return res.json({
                success: true,
                message: `${result.rows.length} assignation(s) retirée(s) avec succès`,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors du retrait des routes:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors du retrait des routes',
                error: error.message
            });
        }
    }

    // Récupérer les routes assignées à l'agent connecté
    async getMyRoutes(req, res) {
        try {
            const userId = req.user.id;

            // Récupérer l'ID de l'agent depuis le compte utilisateur
            const userResult = await pool.query(
                'SELECT id_agent FROM utilisateurs WHERE id = $1',
                [userId]
            );

            if (userResult.rows.length === 0 || !userResult.rows[0].id_agent) {
                return res.json({
                    success: true,
                    data: []
                });
            }

            const agentId = userResult.rows[0].id_agent;

            const result = await pool.query(`
                SELECT route_id
                FROM agent_route_assignments
                WHERE id_agent = $1 AND is_active = TRUE
            `, [agentId]);

            const routeIds = result.rows.map(row => row.route_id);

            return res.json({
                success: true,
                data: routeIds
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des routes assignées:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des routes',
                error: error.message
            });
        }
    }

    // Récupérer toutes les routes disponibles pour l'assignation
    // Cette méthode retourne toutes les routes uniques qui ont été assignées au moins une fois
    // ou toutes les routes possibles depuis la configuration
    async getAvailableRoutes(req, res) {
        try {
            // Récupérer toutes les routes uniques qui ont été assignées
            const assignedRoutesResult = await pool.query(`
                SELECT DISTINCT route_id
                FROM agent_route_assignments
                WHERE is_active = TRUE
                ORDER BY route_id
            `);

            // Récupérer aussi toutes les routes possibles depuis les assignations (même inactives)
            // pour avoir une liste complète
            const allRoutesResult = await pool.query(`
                SELECT DISTINCT route_id
                FROM agent_route_assignments
                ORDER BY route_id
            `);

            const allRouteIds = new Set();
            assignedRoutesResult.rows.forEach(row => allRouteIds.add(row.route_id));
            allRoutesResult.rows.forEach(row => allRouteIds.add(row.route_id));

            // Retourner la liste des routes disponibles
            return res.json({
                success: true,
                data: Array.from(allRouteIds).sort()
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des routes disponibles:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des routes disponibles',
                error: error.message
            });
        }
    }
}

module.exports = new AgentRouteAssignmentsController();

