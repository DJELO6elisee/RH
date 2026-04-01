// Utilitaires d'authentification et de vérification d'appartenance
// ==============================================================

const API_BASE_URL = 'https://tourisme.2ise-groupe.com';

/**
 * Vérifie si l'utilisateur connecté appartient au ministère spécifié
 * @param {string} token - Token JWT de l'utilisateur
 * @param {number} ministereId - ID du ministère à vérifier
 * @returns {Promise<boolean>} - true si autorisé, false sinon
 */
export const checkAgentAuthorization = async(token, ministereId) => {
    if (!token || !ministereId) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/check-agent-ministere`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ministereId: ministereId
            })
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.authorized;
    } catch (error) {
        console.error('Erreur de vérification agent:', error);
        return false;
    }
};

/**
 * Vérifie si un utilisateur peut accéder à une organisation
 * @param {string} username - Nom d'utilisateur
 * @param {number} organizationId - ID de l'organisation
 * @param {string} organizationType - Type d'organisation ('ministere' ou 'institution')
 * @returns {Promise<boolean>} - true si autorisé, false sinon
 */
export const checkUserOrganizationAccess = async(username, organizationId, organizationType) => {
    if (!username || !organizationId || !organizationType) return false;

    try {
        if (organizationType === 'ministere') {
            const response = await fetch(`${API_BASE_URL}/api/auth/check-login-ministere`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    ministereId: organizationId
                })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.authorized;
        }

        // Pour les institutions, on peut ajouter une logique similaire plus tard
        return true;
    } catch (error) {
        console.error('Erreur de vérification organisation:', error);
        return false;
    }
};

/**
 * Récupère les informations de l'utilisateur avec vérification d'appartenance
 * @param {string} token - Token JWT de l'utilisateur
 * @param {number} organizationId - ID de l'organisation
 * @param {string} organizationType - Type d'organisation
 * @returns {Promise<Object|null>} - Informations de l'utilisateur ou null si non autorisé
 */
export const getUserWithAuthorization = async(token, organizationId, organizationType) => {
    if (!token) return null;

    try {
        // Vérifier d'abord l'appartenance
        const isAuthorized = await checkAgentAuthorization(token, organizationId);
        if (!isAuthorized) {
            return null;
        }

        // Récupérer les informations de l'utilisateur
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Erreur de récupération utilisateur:', error);
        return null;
    }
};

/**
 * Vérifie si l'utilisateur a le rôle requis
 * @param {Object} user - Objet utilisateur
 * @param {string|Array} requiredRoles - Rôle(s) requis
 * @returns {boolean} - true si l'utilisateur a le rôle requis
 */
export const hasRequiredRole = (user, requiredRoles) => {
    if (!user || !user.role) return false;

    if (Array.isArray(requiredRoles)) {
        return requiredRoles.includes(user.role);
    }

    return user.role === requiredRoles;
};

/**
 * Vérifie si l'agent a une route assignée
 * @param {string} token - Token JWT
 * @param {string} routeId - ID de la route à vérifier
 * @returns {Promise<boolean>} - true si l'agent a la route assignée
 */
const checkAgentAssignedRoute = async (token, routeId) => {
    if (!token || !routeId) {
        console.warn('checkAgentAssignedRoute: token ou routeId manquant', { token: !!token, routeId });
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/agent-route-assignments/my-routes`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                const hasRoute = data.data.includes(routeId);
                console.log('🔍 checkAgentAssignedRoute:', { routeId, hasRoute, allRoutes: data.data });
                return hasRoute;
            }
        } else {
            console.error('checkAgentAssignedRoute: réponse non OK', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de la route assignée:', error);
    }
    return false;
};

/**
 * Vérifie si l'utilisateur peut accéder à une route protégée
 * @param {Object} user - Objet utilisateur
 * @param {string} token - Token JWT
 * @param {number} organizationId - ID de l'organisation
 * @param {string} organizationType - Type d'organisation
 * @param {string|Array} requiredRoles - Rôle(s) requis
 * @param {string} routeId - ID de la route (optionnel, pour vérifier les routes assignées)
 * @returns {Promise<boolean>} - true si l'utilisateur peut accéder
 */
export const canAccessRoute = async(user, token, organizationId, organizationType, requiredRoles = null, routeId = null) => {
    // Vérifier si l'utilisateur est connecté
    if (!user || !token) return false;

    // Si c'est un super_admin ou DRH, autoriser l'accès (ils ont tous les droits)
    const isSuperAdmin = user.role === 'super_admin';
    const isDRH = user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh';
    
    if (isSuperAdmin || isDRH) {
        // Pour les DRH et super_admin, on autorise toujours l'accès
        // SAUF si un rôle spécifique est requis et qu'ils ne l'ont pas
        if (requiredRoles) {
            return hasRequiredRole(user, requiredRoles);
        }
        
        // Les DRH et super_admin ont accès à toutes les pages
        return true;
    }

    // Vérifier si c'est un directeur
    const isDirecteur = user.role === 'directeur' || user.role?.toLowerCase() === 'directeur';
    
    if (isDirecteur && routeId) {
        // Pour les directeurs, vérifier si la route autorise leur rôle
        try {
            // Importer backendRoutes pour vérifier les rôles de la route
            const { backendRoutes } = require('../config/routes');
            const route = backendRoutes.find(r => r.id === routeId);
            
            if (route && route.roles) {
                // Vérifier si 'directeur' est dans les rôles autorisés de la route
                const routeRoles = Array.isArray(route.roles) ? route.roles : [route.roles];
                const normalizedRouteRoles = routeRoles.map(r => r?.toLowerCase());
                const userRoleLower = user.role?.toLowerCase();
                
                if (normalizedRouteRoles.includes(userRoleLower) || normalizedRouteRoles.includes('directeur')) {
                    console.log('✅ Directeur a accès à la route:', routeId, 'basé sur son rôle');
                    return true;
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de la route pour directeur:', error);
        }
    }

    // Pour les agents réguliers, vérifier si la route est assignée
    // Si routeId est fourni, c'est une route spécifique qui nécessite une assignation
    if (routeId) {
        const hasAssignedRoute = await checkAgentAssignedRoute(token, routeId);
        if (hasAssignedRoute) {
            console.log('✅ Agent a la route assignée:', routeId);
            return true; // L'agent a cette route assignée, autoriser l'accès
        } else {
            console.log('❌ Agent n\'a pas la route assignée:', routeId);
            // Si la route n'est pas assignée, refuser l'accès pour les agents
            return false;
        }
    }

    // Si routeId est null pour un agent, cela signifie que la route n'a pas été trouvée
    // Pour les agents, refuser l'accès par défaut si routeId est null
    // (sauf pour certaines routes publiques comme agent-dashboard)
    console.warn('⚠️ canAccessRoute: routeId est null pour un agent. Refus de l\'accès par défaut.');
    
    // Vérifier l'appartenance à l'organisation
    if (organizationId && organizationType === 'ministere') {
        const isAuthorized = await checkAgentAuthorization(token, organizationId);
        if (!isAuthorized) return false;
    }

    // Vérifier le rôle si spécifié
    if (requiredRoles) {
        return hasRequiredRole(user, requiredRoles);
    }

    // Pour les agents, refuser l'accès par défaut si routeId est null
    // Les agents ne peuvent accéder qu'aux routes qui leur sont assignées
    return false;
};