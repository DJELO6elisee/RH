/**
 * Utilitaire pour formater les dates et éviter les décalages de fuseau horaire
 * Convertit les dates avec timestamp en format YYYY-MM-DD uniquement
 * 
 * @param {string|Date|null} dateValue - La date à formater
 * @returns {string|null} - La date formatée au format YYYY-MM-DD ou null si invalide
 */
function formatDateOnly(dateValue) {
    if (!dateValue) return null;
    
    // Si c'est déjà au format YYYY-MM-DD, on le retourne tel quel
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }
    
    // Si c'est une date avec timestamp, extraire juste la partie date
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
        // Extraire la partie date avant le 'T'
        const datePart = dateValue.split('T')[0];
        // Extraire l'heure UTC
        const timePart = dateValue.split('T')[1];
        if (timePart) {
            // Si l'heure UTC est 23h ou 22h, cela signifie que la date locale est le jour suivant
            // car PostgreSQL stocke les dates DATE comme minuit local, qui devient 23h ou 22h UTC
            const hour = parseInt(timePart.split(':')[0], 10);
            if (hour >= 22) {
                // Ajouter un jour à la date pour obtenir la vraie date stockée
                const date = new Date(datePart + 'T00:00:00');
                date.setUTCDate(date.getUTCDate() + 1);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        }
        return datePart;
    }
    
    // Sinon, parser la date et extraire la partie date
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return null;
    }
    
    // Utiliser les méthodes UTC pour obtenir la date correcte
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formate un objet en formatant tous les champs de date spécifiés
 * 
 * @param {Object} obj - L'objet à formater
 * @param {Array<string>} dateFields - Liste des noms de champs de date à formater
 * @returns {Object} - L'objet avec les dates formatées
 */
function formatDatesInObject(obj, dateFields) {
    if (!obj || !dateFields || !Array.isArray(dateFields)) {
        return obj;
    }
    
    const formatted = { ...obj };
    dateFields.forEach(field => {
        if (formatted[field]) {
            formatted[field] = formatDateOnly(formatted[field]);
        }
    });
    
    return formatted;
}

/**
 * Formate un tableau d'objets en formatant tous les champs de date spécifiés
 * 
 * @param {Array<Object>} array - Le tableau d'objets à formater
 * @param {Array<string>} dateFields - Liste des noms de champs de date à formater
 * @returns {Array<Object>} - Le tableau avec les dates formatées
 */
function formatDatesInArray(array, dateFields) {
    if (!array || !Array.isArray(array) || !dateFields || !Array.isArray(dateFields)) {
        return array;
    }
    
    return array.map(obj => formatDatesInObject(obj, dateFields));
}

module.exports = {
    formatDateOnly,
    formatDatesInObject,
    formatDatesInArray
};
