/**
 * Utilitaires pour le calcul et la gestion des jours de congés
 * Ces fonctions garantissent que les calculs sont toujours cohérents
 */

/**
 * Calcule les jours restants de manière cohérente
 * @param {number} jours_alloues - Jours alloués
 * @param {number} jours_pris - Jours pris
 * @returns {number} Jours restants (jamais négatif)
 */
export const calculerJoursRestants = (jours_alloues, jours_pris) => {
    const alloues = parseInt(jours_alloues, 10) || 0;
    const pris = parseInt(jours_pris, 10) || 0;
    return Math.max(0, alloues - pris);
};

/**
 * Normalise et recalcule les données de congés pour garantir la cohérence
 * Cette fonction doit être utilisée pour TOUS les objets de congés avant affichage
 * @param {Object} conges - Objet de congés (peut venir de la DB ou de l'état)
 * @returns {Object} Objet de congés normalisé avec jours_restants recalculé
 */
export const normaliserConges = (conges) => {
    if (!conges || typeof conges !== 'object') {
        return {
            annee: null,
            jours_alloues: 30,
            jours_pris: 0,
            jours_restants: 30,
            jours_reportes: 0
        };
    }

    const jours_alloues = conges.jours_alloues !== null && conges.jours_alloues !== undefined 
        ? parseInt(conges.jours_alloues, 10) 
        : 30;
    
    const jours_pris = conges.jours_pris !== null && conges.jours_pris !== undefined 
        ? parseInt(conges.jours_pris, 10) 
        : 0;

    // TOUJOURS recalculer jours_restants pour garantir la cohérence
    const jours_restants = calculerJoursRestants(jours_alloues, jours_pris);

    return {
        ...conges,
        annee: conges.annee ? parseInt(conges.annee, 10) : null,
        jours_alloues: jours_alloues,
        jours_pris: jours_pris,
        jours_restants: jours_restants, // TOUJOURS utiliser la valeur recalculée
        jours_reportes: conges.jours_reportes !== null && conges.jours_reportes !== undefined 
            ? parseInt(conges.jours_reportes, 10) 
            : 0
    };
};

/**
 * Normalise un tableau de congés
 * @param {Array} congesArray - Tableau d'objets de congés
 * @returns {Array} Tableau de congés normalisés
 */
export const normaliserCongesArray = (congesArray) => {
    if (!Array.isArray(congesArray)) {
        return [];
    }
    return congesArray.map(c => normaliserConges(c));
};

/**
 * Récupère les congés pour une année donnée depuis un tableau
 * @param {Array} congesArray - Tableau d'objets de congés
 * @param {number} annee - Année recherchée
 * @returns {Object} Objet de congés normalisé pour l'année
 */
export const getCongesForYear = (congesArray, annee) => {
    if (!Array.isArray(congesArray)) {
        return normaliserConges({ annee, jours_alloues: 30, jours_pris: 0, jours_restants: 30 });
    }

    const conges = congesArray.find(c => parseInt(c.annee, 10) === parseInt(annee, 10));
    
    if (!conges) {
        return normaliserConges({ annee, jours_alloues: 30, jours_pris: 0, jours_restants: 30 });
    }

    return normaliserConges(conges);
};

