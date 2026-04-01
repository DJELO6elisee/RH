/**
 * Mapping entre les routes API et les routeIds du frontend
 * Ce mapping permet au middleware de vérifier automatiquement si un agent
 * a la route assignée lorsqu'il accède à une API protégée.
 */
module.exports = {
    // Gestion des comptes utilisateur
    '/api/user-accounts': 'agent-user-accounts',
    
    // Gestion des agents
    '/api/agents': 'agents',
    '/api/agents/hierarchical-report': 'agents',
    '/api/agents-institutions': 'agents-institutions',
    
    // Gestion des entités et organisation
    '/api/entites': 'entites',
    '/api/entites-institutions': 'entites-institutions',
    '/api/entites-administratives': 'entites',
    '/api/ministeres': 'ministeres',
    '/api/institutions': 'institutions',
    '/api/directions': 'directions',
    '/api/directions-institutions': 'directions',
    '/api/sous-directions': 'sous-directions',
    '/api/sous-directions-institutions': 'sous-directions',
    '/api/services': 'services',
    '/api/services-institutions': 'services-institutions',
    '/api/services-entites': 'services-entites-ministres',
    '/api/services-entites-ministres': 'services-entites-ministres',
    
    // Gestion du personnel
    '/api/conges': 'jours-conges',
    '/api/conges-institutions': 'jours-conges',
    '/api/mariages': 'gestion-mariages',
    '/api/demandes': 'historique-des-agents',
    '/api/demandes-institutions': 'historique-des-agents',
    '/api/planning-previsionnel': 'planning-previsionnel-conges',
    '/api/planning-previsionnel-institutions': 'planning-previsionnel-conges',
    '/api/retraites': 'retraites',
    '/api/verification-retraite': 'verification-retraite',
    '/api/prolongement-retraite': 'prolongement-retraite',
    
    // Gestion des documents administratifs
    '/api/documents': 'documents-generated',
    '/api/decisions': 'decision',
    '/api/emargement': 'emargement',
    '/api/generer-documents': 'generer-documents',
    
    // Gestion des enfants et famille
    '/api/enfants': 'enfants',
    '/api/enfants-institutions': 'enfants-institutions',
    
    // Paramètres et référentiels - Identité
    '/api/civilites': 'civilites',
    '/api/nationalites': 'nationalites',
    '/api/situation-matrimonials': 'situation_matrimonials',
    '/api/situation_matrimonials': 'situation_matrimonials',
    '/api/pays': 'pays',
    
    // Paramètres et référentiels - Carrière
    '/api/type-d-agents': 'type-d-agents',
    '/api/type_d_agents': 'type_d_agents',
    '/api/categories': 'categories',
    '/api/grades': 'grades',
    '/api/echelons': 'echelons',
    '/api/emplois': 'emplois',
    '/api/fonctions': 'fonctions',
    '/api/agent-fonctions': 'agent-fonctions',
    '/api/agent-emplois': 'agent-emplois',
    '/api/fonction-agents': 'agent-fonctions',
    '/api/emploi-agents': 'agent-emplois',
    
    // Paramètres et référentiels - Compétences
    '/api/diplomes': 'diplomes',
    '/api/specialites': 'specialites',
    '/api/langues': 'langues',
    '/api/niveau-langues': 'niveau_langues',
    '/api/niveau_langues': 'niveau_langues',
    '/api/logiciels': 'logiciels',
    '/api/niveau-informatiques': 'niveau_informatiques',
    '/api/niveau_informatiques': 'niveau_informatiques',
    
    // Paramètres et référentiels - Positions
    '/api/positions': 'positions',
    '/api/type-conges': 'type_de_conges',
    '/api/type_de_conges': 'type_de_conges',
    '/api/autre-absences': 'autre_absences',
    '/api/autre_absences': 'autre_absences',
    '/api/mode-entrees': 'mode_d_entrees',
    '/api/mode_d_entrees': 'mode_d_entrees',
    
    // Paramètres et référentiels - Départ
    '/api/motif-departs': 'motif_de_departs',
    '/api/motif_de_departs': 'motif_de_departs',
    '/api/type-retraites': 'type_de_retraites',
    '/api/type_de_retraites': 'type_de_retraites',
    
    // Paramètres et référentiels - Découpage administratif
    '/api/regions': 'regions',
    '/api/departements': 'departements',
    '/api/localites': 'localites',
    
    // Paramètres et référentiels - États de santé
    '/api/handicaps': 'handicaps',
    '/api/pathologies': 'pathologies',
    '/api/nature-accidents': 'nature_d_accidents',
    '/api/nature_d_accidents': 'nature_d_accidents',
    
    // Paramètres et référentiels - Discipline
    '/api/sanctions': 'sanctions',
    
    // Paramètres et référentiels - Documents
    '/api/type-documents': 'type_de_documents',
    '/api/type_de_documents': 'type_de_documents',
    '/api/type-documents-institutions': 'type-documents-institutions',
    '/api/nature-actes': 'nature_actes',
    '/api/nature_actes': 'nature_actes',
    '/api/type-courriers': 'type_de_couriers',
    '/api/type_de_couriers': 'type_de_couriers',
    '/api/type-destinations': 'type_de_destinations',
    '/api/type_de_destinations': 'type_de_destinations',
    '/api/dossiers': 'dossiers',
    '/api/dossiers-institutions': 'dossiers-institutions',
    '/api/classeurs': 'classeurs',
    '/api/classeurs-institutions': 'classeurs-institutions',
    '/api/tiers': 'tiers',
    '/api/tiers-institutions': 'tiers-institutions',
    
    // Paramètres et référentiels - Formation
    '/api/type-seminaires': 'type_de_seminaire_de_formation',
    '/api/type_de_seminaire_de_formation': 'type_de_seminaire_de_formation',
    '/api/type-seminaire-institutions': 'type-seminaire-institutions',
    '/api/seminaire-formation': 'seminaire_formation',
    '/api/seminaire-participants': 'seminaire_formation',
    '/api/evenements': 'gestion_evenements',
    
    // Paramètres et référentiels - Organisation
    '/api/type-etablissements': 'type_etablissements',
    '/api/type_etablissements': 'type_etablissements',
    '/api/unite-administratives': 'unite_administratives',
    '/api/unite_administratives': 'unite_administratives',
    
    // Paramètres et référentiels - Vie associative
    '/api/sindicats': 'sindicats',
    '/api/associations': 'sindicats', // Utiliser le même routeId que sindicats pour les permissions
    '/api/agent-associations': 'sindicats',
    '/api/agent-sindicats': 'sindicats',
    
    // Paramètres et référentiels - Récompenses
    '/api/distinctions': 'distinctions',
    
    // Paramètres et référentiels - Recrutement
    '/api/type-de-materiels': 'type_de_materiels',
    '/api/type_de_materiels': 'type_de_materiels',
    
    // Gestion des agents et affectations (Institutions)
    '/api/agents-entites-institutions': 'agents-entites-institutions',
    '/api/affectations-temporaires-institutions': 'affectations-temporaires-institutions',
    '/api/permissions-entites-institutions': 'permissions-entites-institutions',
    
    // Assignation des routes (gestion interne, non assignable aux agents)
    // '/api/agent-route-assignments': 'attribution-taches-agents', // Réservé au DRH
};

/**
 * Fonction utilitaire pour trouver le routeId à partir d'une URL API
 * @param {string} url - L'URL de la requête API (ex: '/api/user-accounts/roles')
 * @returns {string|null} - Le routeId correspondant ou null si non trouvé
 */
function getRouteIdFromApiUrl(url) {
    if (!url) return null;
    
    // Normaliser l'URL (enlever les paramètres de requête)
    let normalizedUrl = url.split('?')[0];
    
    // Chercher une correspondance exacte d'abord (avant normalisation des IDs)
    if (module.exports[normalizedUrl]) {
        return module.exports[normalizedUrl];
    }
    
    // Remplacer les IDs numériques par :id pour la correspondance
    let normalizedUrlWithIds = normalizedUrl.replace(/\/\d+/g, '/:id');
    // Remplacer aussi les IDs dans les chemins comme /entite/123
    normalizedUrlWithIds = normalizedUrlWithIds.replace(/\/(entite|institution|agent|id)\/\d+/g, '/$1/:id');
    
    // Chercher une correspondance exacte après normalisation des IDs
    if (module.exports[normalizedUrlWithIds]) {
        return module.exports[normalizedUrlWithIds];
    }
    
    // Chercher par préfixe (la route API la plus longue qui correspond)
    // D'abord avec l'URL originale, puis avec l'URL normalisée
    let bestMatch = null;
    let bestMatchLength = 0;
    
    // Trier les routes par longueur décroissante pour prioriser les routes les plus spécifiques
    const sortedRoutes = Object.keys(module.exports).sort((a, b) => b.length - a.length);
    
    for (const apiRoute of sortedRoutes) {
        // Vérifier si l'URL commence par la route API (correspondance exacte ou préfixe)
        if (normalizedUrl.startsWith(apiRoute) && apiRoute.length > bestMatchLength) {
            bestMatch = module.exports[apiRoute];
            bestMatchLength = apiRoute.length;
        }
    }
    
    // Si pas de correspondance avec l'URL originale, essayer avec l'URL normalisée
    if (!bestMatch) {
        for (const apiRoute of sortedRoutes) {
            const normalizedApiRoute = apiRoute.replace(/\/\d+/g, '/:id');
            if (normalizedUrlWithIds.startsWith(normalizedApiRoute) && apiRoute.length > bestMatchLength) {
                bestMatch = module.exports[apiRoute];
                bestMatchLength = apiRoute.length;
            }
        }
    }
    
    return bestMatch;
}

module.exports.getRouteIdFromApiUrl = getRouteIdFromApiUrl;
