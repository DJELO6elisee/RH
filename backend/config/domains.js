// Configuration des domaines pour les organisations
const domainConfig = {
    // Ministères
    'ministere-ressources-humaines.gov.ci': {
        type: 'ministere',
        id: 1,
        name: 'Ministère des Ressources Humaines',
        code: 'MIN001',
        description: 'Excellence, Innovation et Service Public au cœur de notre mission'
    },
    'ministere-education.gov.ci': {
        type: 'ministere',
        id: 2,
        name: 'Ministère de l\'Éducation Nationale',
        code: 'MIN002',
        description: 'Éducation de qualité pour tous'
    },
    'ministere-sante.gov.ci': {
        type: 'ministere',
        id: 3,
        name: 'Ministère de la Santé Publique',
        code: 'MIN003',
        description: 'Santé pour tous, partout'
    },
    'ministere-interieur.gov.ci': {
        type: 'ministere',
        id: 4,
        name: 'Ministère de l\'Intérieur et de la Sécurité',
        code: 'MIN004',
        description: 'Sécurité et paix pour tous'
    },
    'ministere-agriculture.gov.ci': {
        type: 'ministere',
        id: 5,
        name: 'Ministère de l\'Agriculture et du Développement Rural',
        code: 'MIN005',
        description: 'Agriculture moderne et durable'
    },
    'ministere-economie.gov.ci': {
        type: 'ministere',
        id: 6,
        name: 'Ministère de l\'Économie et des Finances',
        code: 'MIN006',
        description: 'Économie prospère et inclusive'
    },

    // Institutions
    'institution-formation.gov.ci': {
        type: 'institution',
        id: 1,
        name: 'Institution Nationale de Formation',
        code: 'INST001',
        description: 'Formation professionnelle d\'excellence'
    },
    'institution-recherche.gov.ci': {
        type: 'institution',
        id: 2,
        name: 'Institution de Recherche Scientifique',
        code: 'INST002',
        description: 'Recherche et innovation au service du développement'
    },
    'institution-culture.gov.ci': {
        type: 'institution',
        id: 3,
        name: 'Institution Culturelle Nationale',
        code: 'INST003',
        description: 'Préservation et promotion du patrimoine culturel'
    },

    // Domaines de développement/test
    'localhost': {
        type: 'ministere',
        id: 1,
        name: 'Ministère des Ressources Humaines',
        code: 'MIN001',
        description: 'Environnement de développement'
    },
    '127.0.0.1': {
        type: 'ministere',
        id: 1,
        name: 'Ministère des Ressources Humaines',
        code: 'MIN001',
        description: 'Environnement de développement'
    }
};

// Fonction pour obtenir l'organisation basée sur le domaine
const getOrganizationByDomain = (hostname) => {
    // Vérifier le mapping direct
    if (domainConfig[hostname]) {
        return domainConfig[hostname];
    }

    // Vérifier les sous-domaines (ex: www.ministere-ressources-humaines.gov.ci)
    const subdomain = hostname.replace('www.', '');
    if (domainConfig[subdomain]) {
        return domainConfig[subdomain];
    }

    // Fallback pour le développement
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return domainConfig['localhost'];
    }

    // Si aucun mapping trouvé, retourner null
    return null;
};

// Middleware pour détecter l'organisation depuis le domaine
const domainMiddleware = (req, res, next) => {
    const hostname = req.get('host') || req.hostname;
    const organization = getOrganizationByDomain(hostname);

    if (organization) {
        req.organization = organization;
    }

    next();
};

module.exports = {
    domainConfig,
    getOrganizationByDomain,
    domainMiddleware
};