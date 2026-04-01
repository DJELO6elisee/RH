/**
 * Utilitaires pour la grammaire française dans les documents
 */

/**
 * Détermine la préposition correcte à utiliser avant un nom de direction/service
 * @param {string} direction - Le nom de la direction/service
 * @returns {string} - La préposition correcte : "au", "à la", ou "à l'"
 */
function getPrepositionForDirection(direction) {
    if (!direction || typeof direction !== 'string') {
        return 'à la'; // Par défaut
    }

    // Normaliser le nom (enlever les espaces, mettre en majuscules)
    const normalized = direction.trim().toUpperCase();

    // Cas spéciaux : noms masculins qui nécessitent "au"
    // Ces mots peuvent apparaître au début ou être le mot principal
    const masculineDirections = [
        'CABINET',
        'BUREAU',
        'DIRECTEUR',
        'DIRECTION',
        'SERVICE',
        'DÉPARTEMENT',
        'MINISTÈRE',
        'SECRÉTARIAT',
        'CONSEIL',
        'COMITÉ',
        'GROUPE',
        'CENTRE',
        'INSTITUT',
        'OFFICE',
        'AGENCE',
        'ORGANISME',
        'ÉTABLISSEMENT',
        'CONSERVATOIRE',
        'MUSÉE',
        'ARCHIVE',
        'BIBLIOTHÈQUE'
    ];

    // Vérifier si le nom commence par un de ces mots masculins
    for (const masculine of masculineDirections) {
        // Vérifier au début du nom
        if (normalized.startsWith(masculine)) {
            return 'au';
        }
        // Vérifier si le nom contient "BUREAU" ou "CABINET" (même s'il n'est pas au début)
        // Ex: "Direction du Bureau" ou "Service du Cabinet"
        if ((masculine === 'BUREAU' || masculine === 'CABINET') && normalized.includes(masculine)) {
            return 'au';
        }
    }

    // Vérifier si le nom commence par une voyelle (nécessite "à l'")
    const firstChar = normalized.charAt(0);
    if (['A', 'E', 'I', 'O', 'U', 'É', 'È', 'Ê', 'À', 'Ù', 'Ô'].includes(firstChar)) {
        return 'à l\'';
    }

    // Par défaut, utiliser "à la" pour les noms féminins
    return 'à la';
}

/**
 * Formate la phrase d'affectation avec la bonne préposition
 * @param {string} direction - Le nom de la direction/service
 * @param {string} genre - Le genre de l'agent ('F' pour féminin, 'M' pour masculin)
 * @returns {string} - La phrase formatée : "est affectée au/à la/à l' [direction]"
 */
function formatAffectationPhrase(direction, genre = 'F') {
    const preposition = getPrepositionForDirection(direction);
    const verbe = genre === 'F' ? 'affectée' : 'affecté';
    
    return `est ${verbe} ${preposition} ${direction}`;
}

/**
 * Adapte la formulation "Directeur de..." selon le nom de la direction pour éviter "Directeur de Direction...".
 * Ex. "Direction Départementale d'Agboville" → "Directeur du Département d'Agboville"
 * @param {string} directionName - Libellé de la direction
 * @returns {string} - Formulation adaptée (ex. "Directeur du Département de Mankono")
 */
function formatDirecteurFromDirection(directionName) {
    if (!directionName || typeof directionName !== 'string') return '';
    const raw = directionName.trim();
    const u = raw.toUpperCase();
    if (u.includes('RESSOURCES HUMAINES') || u.includes('DRH')) return 'Directeur des Ressources Humaines';
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const voyelle = (s) => /^[AEIOUYÉÈÊËÀÂ]/u.test((s || '').trim());
    let m;
    m = u.match(/DIRECTION\s+D[EÉ]PARTEMENTALE\s+D['']\s*(.+)/i);
    if (m) {
        const x = cap(m[1].trim());
        return `Directeur du Département d'${x}`;
    }
    m = u.match(/DIRECTION\s+D[EÉ]PARTEMENTALE\s+DE\s+(.+)/i);
    if (m) {
        const x = cap(m[1].trim());
        const de = voyelle(x) ? "d'" : 'de ';
        return `Directeur du Département ${de}${x}`;
    }
    m = u.match(/DIRECTION\s+R[EÉ]GIONALE\s+(?:D['']|DE\s+|DU\s+)?(.+)/i);
    if (m) {
        const x = cap(m[1].trim());
        const de = voyelle(x) ? "d'" : 'de ';
        return `Directeur du Département Régional ${de}${x}`;
    }
    m = u.match(/DIRECTION\s+G[EÉ]N[EÉ]RALE/i);
    if (m) return 'Directeur Général';
    const strip = raw.replace(/^\s*DIRECTION\s+(?:D['']|DE\s+|DU\s+|DES\s+|DE LA\s+)/i, '').trim();
    if (strip && strip.length > 0) {
        const de = voyelle(strip) ? "d'" : 'de ';
        return `Directeur ${de}${strip}`;
    }
    return `Directeur de ${raw}`;
}

module.exports = {
    getPrepositionForDirection,
    formatAffectationPhrase,
    formatDirecteurFromDirection
};
