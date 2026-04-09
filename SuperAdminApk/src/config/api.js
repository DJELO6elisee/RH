// Fonction pour obtenir les headers d'authentification
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && token !== 'null' && token !== 'undefined' && token.trim() !== '' && { 'Authorization': `Bearer ${token}` })
    };
};

// Fonction pour obtenir l'URL de l'API
export const getApiUrl = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'https://tourisme.2ise-groupe.com';
    }
    return 'https://tourisme.2ise-groupe.com';
};

// URL de l'API (pour compatibilité)
export const apiUrl = getApiUrl();

