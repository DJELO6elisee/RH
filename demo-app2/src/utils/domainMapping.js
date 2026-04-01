// Mapping des domaines vers les organisations
export const domainMapping = {
    // Ministères
    'ministere-ressources-humaines.gov.ci': {
        type: 'ministere',
        id: 10,
        name: 'Ministère des Ressources Humaines',
        code: 'MIN001'
    },
    'tourisme.2ise-groupe.com': {
        type: 'ministere',
        id: 10,
        name: 'Ministère du Tourisme',
        code: 'MIN001'
    },

    // Domaines de développement/test
    'localhost': {
        type: 'ministere',
        id: 10,
        name: 'Ministère des Ressources Humaines',
        code: 'MIN001'
    },
    '127.0.0.1': {
        type: 'ministere',
        id: 10,
        name: 'Ministère des Ressources Humaines',
        code: 'MIN001'
    }
};

// Fonction pour obtenir l'organisation basée sur le domaine
export const getOrganizationByDomain = () => {
    const hostname = window.location.hostname;

    // Vérifier le mapping direct
    if (domainMapping[hostname]) {
        return domainMapping[hostname];
    }

    // Vérifier les sous-domaines (ex: www.ministere-ressources-humaines.gov.ci)
    const subdomain = hostname.replace('www.', '');
    if (domainMapping[subdomain]) {
        return domainMapping[subdomain];
    }

    // Fallback pour le développement
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
        return domainMapping['localhost'];
    }

    // Si aucun mapping trouvé, retourner null
    return null;
};

// Fonction pour obtenir l'URL de connexion basée sur le domaine
export const getLoginUrl = () => {
    const organization = getOrganizationByDomain();
    if (organization) {
        return `/login-page?organization=${organization.type}&id=${organization.id}`;
    }
    return '/login-page';
};

// Fonction pour obtenir l'URL de retour basée sur le domaine
// export const getHomeUrl = () => {
//     const organization = getOrganizationByDomain();
//     if (organization) {
//         return `/${organization.type}/${organization.id}`;
//     }
//     return '/ministere';
// };
export const getHomeUrl = () => {
    const organization = getOrganizationByDomain();
    if (organization) {
        return `/${organization.type}`;
    }
    return '/ministere';
};

// Fonction pour vérifier si l'utilisateur appartient à l'organisation du domaine
export const validateUserOrganization = (user, organization) => {
    if (!user || !organization) return false;

    // Vérifier si l'utilisateur appartient à cette organisation
    if (organization.type === 'ministere') {
        return user.organization && user.organization.type === 'ministere' &&
            user.organization.id === organization.id;
    } else if (organization.type === 'institution') {
        return user.organization && user.organization.type === 'institution' &&
            user.organization.id === organization.id;
    }

    return false;
};