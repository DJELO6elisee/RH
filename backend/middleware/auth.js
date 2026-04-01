const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { getRouteIdFromApiUrl } = require('../config/api-route-mapping');

class AuthMiddleware {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'your-secret-key';
    }

    // Middleware pour vérifier l'authentification
    async authenticate(req, res, next) {
        try {
            // Permettre les requêtes OPTIONS (preflight CORS) sans authentification
            if (req.method === 'OPTIONS') {
                return next();
            }

            const token = req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;

            console.log(`🔐 Authentification - URL: ${req.originalUrl}`);
            console.log(`🔐 Token présent: ${!!token}`);
            console.log(`🔐 Authorization header: ${req.headers.authorization}`);

            if (!token) {
                console.log('❌ Token manquant');
                return res.status(401).json({
                    success: false,
                    message: 'Token d\'authentification requis'
                });
            }

            // Vérifier le token
            const decoded = jwt.verify(token, this.secretKey);
            console.log(`🔐 Token décodé - User ID: ${decoded.id}`);

            // Récupérer les informations utilisateur mises à jour
            const user = await pool.query(`
                SELECT 
                    u.*, 
                    r.nom as role_nom, 
                    r.permissions,
                    a.id_ministere,
                    a.id_direction,
                    a.id_direction_generale,
                    (SELECT d.id_direction_generale FROM directions d WHERE d.id = a.id_direction LIMIT 1) AS id_direction_generale_via_direction
                FROM utilisateurs u
                JOIN roles r ON u.id_role = r.id
                LEFT JOIN agents a ON u.id_agent = a.id
                WHERE u.id = $1 AND u.is_active = true
            `, [decoded.id]);

            console.log(`🔐 Utilisateur trouvé: ${user.rows.length > 0}`);
            if (user.rows.length > 0) {
                console.log(`🔐 Rôle: ${user.rows[0].role_nom}, Actif: ${user.rows[0].is_active}`);
            }

            if (user.rows.length === 0) {
                console.log('❌ Utilisateur non trouvé ou inactif');
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non trouvé ou inactif'
                });
            }

            // Ajouter les informations utilisateur à la requête
            const u = user.rows[0];
            const effectiveDgId = u.id_direction_generale || u.id_direction_generale_via_direction || null;
            req.user = {
                id: u.id,
                username: u.username,
                email: u.email,
                role: u.role_nom,
                permissions: u.permissions,
                id_agent: u.id_agent,
                id_ministere: u.id_ministere,
                id_direction: u.id_direction,
                id_direction_generale: effectiveDgId
            };

            next();

        } catch (error) {
            console.log(`❌ Erreur d'authentification: ${error.name} - ${error.message}`);

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token invalide'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expiré'
                });
            }

            console.error('Erreur lors de l\'authentification:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Middleware pour vérifier les rôles
    requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    message: 'Accès refusé. Rôle insuffisant.',
                    required: allowedRoles,
                    current: userRole
                });
            }

            next();
        };
    }

    // Middleware pour vérifier les rôles OU si l'agent a la route assignée
    requireRoleOrAssignedRoute(roles, routeId = null) {
        return async(req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            const userRole = req.user.role;
            const allowedRoles = Array.isArray(roles) ? roles : [roles];

            // Normaliser les rôles pour comparaison case-insensitive
            const userRoleLower = userRole ? userRole.toLowerCase() : '';
            const allowedRolesLower = allowedRoles.map(role => role ? role.toLowerCase() : '');

            // Si l'utilisateur a un des rôles autorisés, autoriser l'accès
            if (allowedRolesLower.includes(userRoleLower)) {
                console.log(`✅ requireRoleOrAssignedRoute - Rôle autorisé: ${userRole} (normalisé: ${userRoleLower})`);
                return next();
            }

            // Si aucune routeId n'est fournie, essayer de la détecter automatiquement depuis l'URL
            let detectedRouteId = routeId;
            if (!detectedRouteId && req.originalUrl) {
                detectedRouteId = getRouteIdFromApiUrl(req.originalUrl);
                console.log(`🔍 requireRoleOrAssignedRoute - RouteId détectée depuis URL: ${req.originalUrl} -> ${detectedRouteId}`);
            }

            // Exception universelle : Tout utilisateur avec un id_agent peut accéder à ses propres données
            // Cela inclut : agents, sous-directeurs, directeurs, DRH, chef_service, dir_cabinet, etc.
            // Règle : Si l'utilisateur a un id_agent et que l'ID demandé correspond à son id_agent, autoriser l'accès
            if (req.user.id_agent) {
                // Exception 1: Utilisateur accédant à ses propres données d'agent
                // Ex: /api/agents/1824 où 1824 est l'id_agent de l'utilisateur connecté
                if (req.params.id && parseInt(req.params.id) === req.user.id_agent) {
                    console.log(`✅ ${userRole} (id_agent: ${req.user.id_agent}) accède à ses propres données, accès autorisé`);
                    return next();
                }

                // Exception 2: Utilisateur accédant à ses propres notifications/demandes via son agentId
                // Ex: /api/demandes/notifications/agent/1824/... où 1824 est l'id_agent de l'utilisateur connecté
                if (req.params.agentId && parseInt(req.params.agentId) === req.user.id_agent) {
                    console.log(`✅ ${userRole} (id_agent: ${req.user.id_agent}) accède à ses propres ressources (notifications/demandes via agentId), accès autorisé`);
                    return next();
                }

                // Exception 3: Routes spécifiques pour l'utilisateur connecté avec id_agent
                // Ex: /api/demandes/notifications/agent/:id_agent/nombre-non-lues où id_agent est dans l'URL et correspond à l'utilisateur
                if (req.params.id_agent && parseInt(req.params.id_agent) === req.user.id_agent) {
                    console.log(`✅ ${userRole} (id_agent: ${req.user.id_agent}) accède à ses propres ressources via id_agent, accès autorisé`);
                    return next();
                }

                // Exception 4: Création de demande (POST /api/demandes) - Tout agent peut créer ses propres demandes
                // Le contrôleur utilise toujours req.user.id_agent, donc la demande est toujours pour l'agent connecté
                if (req.method === 'POST' && (req.originalUrl === '/api/demandes' || req.originalUrl.startsWith('/api/demandes?'))) {
                    console.log(`✅ ${userRole} (id_agent: ${req.user.id_agent}) crée sa propre demande, accès autorisé`);
                    return next();
                }
            }

            // Vérification des routes assignées pour les agents uniquement
            // (Les autres rôles avec id_agent ont déjà été gérés par les exceptions ci-dessus)
            const isAgent = userRole && (userRole.toLowerCase() === 'agent' || userRole === 'agent');
            if (isAgent) {
                // Vérifier que l'agent a un id_agent défini
                if (!req.user.id_agent) {
                    console.log(`⚠️ requireRoleOrAssignedRoute - Agent ${req.user.id} n'a pas d'id_agent défini`);
                    return res.status(403).json({
                        success: false,
                        message: 'Accès refusé. Aucun agent associé à ce compte utilisateur.',
                        required: allowedRoles,
                        current: userRole,
                        routeId: detectedRouteId || null
                    });
                }

                // Si une routeId est fournie (ou détectée), vérifier si la route est assignée
                if (detectedRouteId) {
                    const agentId = parseInt(req.user.id_agent, 10);
                    const routeIdStr = String(detectedRouteId).trim();

                    console.log(`🔍 requireRoleOrAssignedRoute - Vérification route assignée pour agent ${agentId}, routeId: "${routeIdStr}"`);
                    console.log(`🔍 requireRoleOrAssignedRoute - URL originale: ${req.originalUrl}`);
                    console.log(`🔍 requireRoleOrAssignedRoute - Types: agentId=${typeof agentId}, routeId=${typeof routeIdStr}`);

                    try {
                        // D'abord, vérifier toutes les routes assignées à cet agent pour le débogage
                        const allRoutesResult = await pool.query(`
                            SELECT route_id, is_active, id_agent
                            FROM agent_route_assignments
                            WHERE id_agent = $1
                            ORDER BY route_id
                        `, [agentId]);

                        console.log(`🔍 requireRoleOrAssignedRoute - Toutes les routes assignées à l'agent ${agentId}:`, JSON.stringify(allRoutesResult.rows, null, 2));

                        // Vérifier aussi les routes inactives pour le débogage
                        const inactiveRoutesResult = await pool.query(`
                            SELECT route_id, is_active
                            FROM agent_route_assignments
                            WHERE id_agent = $1 AND route_id = $2 AND is_active = FALSE
                        `, [agentId, routeIdStr]);

                        if (inactiveRoutesResult.rows.length > 0) {
                            console.log(`⚠️ requireRoleOrAssignedRoute - Route "${routeIdStr}" trouvée mais INACTIVE pour l'agent ${agentId}`);
                        }

                        // Maintenant, vérifier la route spécifique (avec conversion explicite des types)
                        // Essayer d'abord avec une correspondance exacte
                        let result = await pool.query(`
                            SELECT route_id, is_active
                            FROM agent_route_assignments
                            WHERE id_agent = $1::integer AND route_id = $2::text AND is_active = TRUE
                        `, [agentId, routeIdStr]);

                        console.log(`🔍 requireRoleOrAssignedRoute - Résultat requête exacte pour routeId "${routeIdStr}":`, JSON.stringify(result.rows, null, 2));

                        if (result.rows.length > 0) {
                            console.log(`✅ Agent ${agentId} a la route "${routeIdStr}" assignée, accès autorisé`);
                            return next();
                        }

                        // Si pas de correspondance exacte, essayer une vérification case-insensitive et avec trim
                        const caseInsensitiveResult = await pool.query(`
                            SELECT route_id, is_active
                            FROM agent_route_assignments
                            WHERE id_agent = $1::integer 
                            AND LOWER(TRIM(BOTH FROM route_id)) = LOWER(TRIM(BOTH FROM $2::text)) 
                            AND is_active = TRUE
                        `, [agentId, routeIdStr]);

                        console.log(`🔍 requireRoleOrAssignedRoute - Résultat case-insensitive pour routeId "${routeIdStr}":`, JSON.stringify(caseInsensitiveResult.rows, null, 2));

                        if (caseInsensitiveResult.rows.length > 0) {
                            console.log(`✅ Agent ${agentId} a la route assignée (correspondance case-insensitive), accès autorisé`);
                            return next();
                        }

                        // Règle spéciale : Si la route demandée est "agents" mais l'agent a "agents_reports" assigné,
                        // autoriser l'accès pour les routes de rapports ET la route principale /api/agents
                        if (routeIdStr === 'agents') {
                            const agentsReportsResult = await pool.query(`
                                SELECT route_id, is_active
                                FROM agent_route_assignments
                                WHERE id_agent = $1::integer 
                                AND route_id = 'agents_reports' 
                                AND is_active = TRUE
                            `, [agentId]);

                            if (agentsReportsResult.rows.length > 0) {
                                // Vérifier si la route demandée est une route de rapport ou la route principale /api/agents
                                const isReportRoute = req.originalUrl.includes('/hierarchical-report') ||
                                    req.originalUrl.includes('/stats/') ||
                                    req.originalUrl.includes('/retirement-') ||
                                    req.originalUrl.includes('/upcoming-birthdays') ||
                                    req.originalUrl.includes('/retired');

                                // Vérifier si c'est la route principale /api/agents (avec ou sans paramètres de requête)
                                const isMainAgentsRoute = req.originalUrl === '/api/agents' ||
                                    req.originalUrl.startsWith('/api/agents?') ||
                                    req.originalUrl.match(/^\/api\/agents(\?|$)/);

                                if (isReportRoute || isMainAgentsRoute) {
                                    console.log(`✅ Agent ${agentId} a "agents_reports" assigné, accès autorisé à la route "${req.originalUrl}"`);
                                    return next();
                                }
                            }
                        }

                        // Vérifier si une route similaire existe (pour débogage)
                        const similarRoutesResult = await pool.query(`
                            SELECT route_id, is_active
                            FROM agent_route_assignments
                            WHERE id_agent = $1::integer 
                            AND (
                                route_id LIKE $2 
                                OR route_id LIKE $3 
                                OR LOWER(TRIM(BOTH FROM route_id)) = LOWER(TRIM(BOTH FROM $4::text))
                            )
                            ORDER BY route_id
                        `, [agentId, `%${routeIdStr}%`, `${routeIdStr}%`, routeIdStr]);

                        if (similarRoutesResult.rows.length > 0) {
                            console.log(`⚠️ requireRoleOrAssignedRoute - Routes similaires trouvées pour l'agent ${agentId}:`, JSON.stringify(similarRoutesResult.rows, null, 2));
                            console.log(`⚠️ requireRoleOrAssignedRoute - Route recherchée: "${routeIdStr}"`);
                        } else {
                            console.log(`❌ Agent ${agentId} n'a pas la route "${routeIdStr}" assignée (actives)`);
                        }
                    } catch (error) {
                        console.error('❌ Erreur lors de la vérification de la route assignée:', error);
                        console.error('❌ Stack:', error.stack);
                        console.error('❌ AgentId:', agentId, 'RouteId:', routeIdStr);
                        // Ne pas bloquer, continuer pour retourner l'erreur 403 standard
                    }
                } else {
                    console.log(`⚠️ requireRoleOrAssignedRoute - Aucune routeId détectée pour agent ${req.user.id_agent}`);
                    console.log(`⚠️ requireRoleOrAssignedRoute - URL originale: ${req.originalUrl}`);
                }
            }

            // Message d'erreur plus détaillé pour les agents
            let errorMessage = 'Accès refusé. Rôle insuffisant ou route non assignée.';
            if (isAgent && req.user.id_agent && detectedRouteId) {
                errorMessage = `Accès refusé. La route "${detectedRouteId}" n'est pas assignée à cet agent.`;
            }

            return res.status(403).json({
                success: false,
                message: errorMessage,
                required: allowedRoles,
                current: userRole,
                routeId: detectedRouteId || null,
                agentId: isAgent && req.user.id_agent ? req.user.id_agent : undefined
            });
        };
    }

    // Middleware pour vérifier les permissions
    requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            const userPermissions = req.user.permissions;

            // Super admin a accès à tout
            if (userPermissions.all === true) {
                return next();
            }

            // Vérifier la permission spécifique
            if (!userPermissions[permission]) {
                return res.status(403).json({
                    success: false,
                    message: `Permission requise: ${permission}`,
                    current: userPermissions
                });
            }

            next();
        };
    }

    // Middleware pour vérifier l'accès aux données d'un ministère
    async requireMinistereAccess(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            const userRole = req.user.role;
            const ministereId = req.params.id_ministere || req.body.id_ministere;

            // Super admin a accès à tout
            if (userRole === 'super_admin') {
                return next();
            }

            // DRH a accès à son ministère
            if (userRole && userRole.toLowerCase() === 'drh') {
                // TODO: Vérifier que l'utilisateur DRH appartient au ministère demandé
                // Pour l'instant, on autorise l'accès
                return next();
            }

            // Admin d'entité a accès à son entité et ministère
            if (userRole === 'admin_entite') {
                // TODO: Vérifier que l'utilisateur admin appartient à l'entité du ministère demandé
                return next();
            }

            // Agent a accès limité
            if (userRole === 'agent') {
                // TODO: Vérifier que l'agent appartient au ministère demandé
                return next();
            }

            next();

        } catch (error) {
            console.error('Erreur lors de la vérification d\'accès au ministère:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Middleware pour vérifier l'accès aux données d'une entité
    async requireEntiteAccess(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            const userRole = req.user.role;
            const entiteId = req.params.id || req.body.id_entite;

            // Super admin a accès à tout
            if (userRole === 'super_admin') {
                return next();
            }

            // DRH a accès aux entités de son ministère
            if (userRole && userRole.toLowerCase() === 'drh') {
                // TODO: Vérifier que l'utilisateur DRH a accès à l'entité demandée
                return next();
            }

            // Admin d'entité a accès à son entité
            if (userRole === 'admin_entite') {
                // TODO: Vérifier que l'utilisateur admin a accès à l'entité demandée
                return next();
            }

            // Agent a accès limité
            if (userRole === 'agent') {
                // TODO: Vérifier que l'agent appartient à l'entité demandée
                return next();
            }

            next();

        } catch (error) {
            console.error('Erreur lors de la vérification d\'accès à l\'entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Middleware pour vérifier l'accès aux données d'un agent
    async requireAgentAccess(req, res, next) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentification requise'
                });
            }

            const userRole = req.user.role;
            const agentId = req.params.id || req.body.id_agent;

            // Super admin a accès à tout
            if (userRole === 'super_admin') {
                return next();
            }

            // DRH a accès aux agents de son ministère
            if (userRole && userRole.toLowerCase() === 'drh') {
                // TODO: Vérifier que l'utilisateur DRH a accès à l'agent demandé
                return next();
            }

            // Admin d'entité a accès aux agents de son entité
            if (userRole === 'admin_entite') {
                // TODO: Vérifier que l'utilisateur admin a accès à l'agent demandé
                return next();
            }

            // Agent a accès à ses propres données
            if (userRole === 'agent') {
                if (req.user.id_agent !== parseInt(agentId)) {
                    return res.status(403).json({
                        success: false,
                        message: 'Accès refusé. Vous ne pouvez accéder qu\'à vos propres données.'
                    });
                }
            }

            next();

        } catch (error) {
            console.error('Erreur lors de la vérification d\'accès à l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }
}

const authMiddleware = new AuthMiddleware();

module.exports = {
    authenticate: authMiddleware.authenticate.bind(authMiddleware),
    requireRole: authMiddleware.requireRole.bind(authMiddleware),
    requireRoleOrAssignedRoute: authMiddleware.requireRoleOrAssignedRoute.bind(authMiddleware),
    requirePermission: authMiddleware.requirePermission.bind(authMiddleware),
    requireMinistereAccess: authMiddleware.requireMinistereAccess.bind(authMiddleware),
    requireEntiteAccess: authMiddleware.requireEntiteAccess.bind(authMiddleware),
    requireAgentAccess: authMiddleware.requireAgentAccess.bind(authMiddleware)
};