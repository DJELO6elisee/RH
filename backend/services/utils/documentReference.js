const DEFAULT_SIGLE = '';
const DEFAULT_ID_PLACEHOLDER = '00000';
function sanitizeManualReference(reference) {
    if (!reference || typeof reference !== 'string') {
        return null;
    }
    const trimmed = reference.trim();
    if (!trimmed || /^[_\s/\\-]+$/u.test(trimmed)) {
        return null;
    }
    if (/_{3,}/u.test(trimmed)) {
        return null;
    }
    return trimmed.replace(/^N°\s*/iu, '').trim();
}

function toAcronym(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const upper = trimmed.toUpperCase();
    const normalized = upper.replace(/[^A-Z0-9]/gu, '');
    if (!normalized) {
        return null;
    }
    return normalized.slice(0, 8);
}

function extractSigle({ demande, agent, validateur, userInfo, sigle }) {
    const candidates = [
        sigle,
        demande?.ministere_sigle,
        agent?.ministere_sigle,
        validateur?.ministere_sigle,
        userInfo?.ministere_sigle
    ];
    for (const candidate of candidates) {
        const acronym = toAcronym(candidate);
        if (acronym) {
            return acronym;
        }
    }
    return DEFAULT_SIGLE;
}

// N'utilise pas document.id : le numéro affiché doit être le séquentiel par type_document (via getDocumentReference), pas l'id du document.
function extractDemandeId({ demande, document }) {
    const candidates = [
        demande?.id,
        demande?.id_demande,
        document?.id_demande,
        document?.demande_id
    ];
    for (const candidate of candidates) {
        if (candidate !== undefined && candidate !== null) {
            const numeric = Number(candidate);
            if (!Number.isNaN(numeric) && numeric >= 0) {
                return Math.trunc(numeric);
            }
        }
    }
    return null;
}

/**
 * Retourne le numéro séquentiel du document (rang) par type de document et par ministère.
 * Ordre : date_generation ASC, puis id ASC (en cas d'égalité de date).
 * Rang = nombre de documents du même type (et ministère) générés avant ou en même temps.
 * @param {string} typeDocument - type_document (ex: 'certificat_cessation')
 * @param {number|null} idMinistere - id_ministere de l'agent destinataire
 * @param {number} documentId - id du document dans documents_autorisation
 * @returns {Promise<string>} - Numéro formaté sur 5 chiffres (ex: "00001")
 */
async function getSequentialDocumentNumber(typeDocument, idMinistere, documentId) {
    const db = require('../../config/database');
    try {
        if (!typeDocument || documentId == null) {
            return null;
        }
        const docIdInt = parseInt(documentId, 10);
        if (isNaN(docIdInt)) {
            return null;
        }
        let idMin = idMinistere != null ? parseInt(idMinistere, 10) : null;
        if ((idMin == null || isNaN(idMin)) && docIdInt != null) {
            const minResult = await db.query(`
                SELECT COALESCE(a.id_ministere, d.id_ministere) AS id_ministere
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions d ON a.id_direction = d.id
                WHERE da.id = $1
            `, [docIdInt]);
            if (minResult.rows.length > 0 && minResult.rows[0].id_ministere != null) {
                idMin = parseInt(minResult.rows[0].id_ministere, 10);
            }
        }
        // Ordre par date_generation puis id (NULL date_generation traité comme ancienne date)
        const orderCondition = `(
            COALESCE(da.date_generation, '1970-01-01'::timestamp) < ref.doc_date
            OR (COALESCE(da.date_generation, '1970-01-01'::timestamp) = ref.doc_date AND da.id <= $3)
        )`;
        let result;
        if (idMin != null && !isNaN(idMin)) {
            result = await db.query(`
                SELECT COUNT(*) AS rank
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions d ON a.id_direction = d.id
                CROSS JOIN (
                    SELECT COALESCE(date_generation, '1970-01-01'::timestamp) AS doc_date
                    FROM documents_autorisation WHERE id = $3
                ) ref
                WHERE da.type_document = $1 AND COALESCE(a.id_ministere, d.id_ministere) = $2 AND ` + orderCondition,
            [typeDocument, idMin, docIdInt]);
        }
        if (!result || result.rows.length === 0) {
            result = await db.query(`
                SELECT COUNT(*) AS rank
                FROM documents_autorisation da
                CROSS JOIN (
                    SELECT COALESCE(date_generation, '1970-01-01'::timestamp) AS doc_date
                    FROM documents_autorisation WHERE id = $2
                ) ref
                WHERE da.type_document = $1 AND ` + orderCondition.replace('$3', '$2'),
            [typeDocument, docIdInt]);
        }
        const rank = parseInt(result.rows[0]?.rank || 0, 10);
        const formatted = rank > 0 ? String(rank).padStart(5, '0') : null;
        if (process.env.DEBUG_DOCUMENT_REFERENCE === '1') {
            console.log('[getSequentialDocumentNumber]', { typeDocument, documentId: docIdInt, idMin, rank, formatted });
        }
        return formatted;
    } catch (error) {
        console.error('❌ Erreur getSequentialDocumentNumber:', error);
        return null;
    }
}

function extractMinistereNom({ demande, agent, validateur, userInfo }) {
    const candidates = [
        demande?.ministere_nom,
        agent?.ministere_nom,
        validateur?.ministere_nom,
        userInfo?.ministere_nom
    ];
    for (const candidate of candidates) {
        if (candidate && typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }
    return null;
}

function formatDocumentReference({
    demande = null,
    document = null,
    agent = null,
    validateur = null,
    userInfo = null,
    sigle: sigleOverride = null,
    manualReference = null,
    sequentialNumber = null
} = {}) {
    const cleanedManualReference = sanitizeManualReference(
        manualReference
        || userInfo?.document_reference
        || demande?.numero_document
        || demande?.reference
        || document?.numero_document
        || document?.reference
    );
    if (cleanedManualReference) {
        return cleanedManualReference;
    }

    const paddedId = sequentialNumber != null && String(sequentialNumber).trim() !== ''
        ? String(sequentialNumber).padStart(5, '0')
        : (() => {
            const demandeId = extractDemandeId({ demande, document });
            return demandeId !== null ? String(demandeId).padStart(5, '0') : DEFAULT_ID_PLACEHOLDER;
        })();

    const sigle = extractSigle({ demande, agent, validateur, userInfo, sigle: sigleOverride });
    
    // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS'
    const ministereNom = extractMinistereNom({ demande, agent, validateur, userInfo });
    const isMinTourismeEtLoisirs = ministereNom && 
        ministereNom.toUpperCase().includes('TOURISME') && 
        ministereNom.toUpperCase().includes('LOISIRS');

    if (sigle) {
        // Si c'est le ministère du tourisme et des loisirs, ajouter /DRH/SDGP
        if (isMinTourismeEtLoisirs) {
            return `${paddedId}/${sigle}/DRH/SDGP`;
        }
        return `${paddedId}/${sigle}`;
    }
    return paddedId;
}

/**
 * Génère le numéro de document avec numéro séquentiel par type de document et par ministère
 * (au lieu de l'ID du document). À utiliser pour l'affichage sur les certificats/attestations.
 * @param {Object} options - Mêmes options que formatDocumentReference + document.type_document, agent.id_ministere
 * @returns {Promise<string>} - Référence formatée (ex: "00001/MINTOUR/DRH/SDGP")
 */
async function getDocumentReference(options = {}) {
    const { document = null, agent = null } = options;
    const typeDocument = document?.type_document;
    const idMinistere = agent?.id_ministere ?? document?.id_ministere ?? null;
    const documentId = document?.id != null ? parseInt(document.id, 10) : null;

    if (typeDocument && documentId != null && !isNaN(documentId)) {
        const sequentialNumber = await getSequentialDocumentNumber(typeDocument, idMinistere, documentId);
        if (sequentialNumber != null) {
            if (process.env.DEBUG_DOCUMENT_REFERENCE === '1') {
                console.log('[getDocumentReference]', { typeDocument, documentId, idMinistere, sequentialNumber });
            }
            return formatDocumentReference({ ...options, sequentialNumber });
        }
    }
    return formatDocumentReference(options);
}

/**
 * Génère un numéro de document pour une note de service basé sur le nombre de notes de service de la journée
 * @param {Date} date - La date de génération
 * @param {number} idMinistere - ID du ministère (optionnel). Si fourni, le comptage est fait par ministère.
 * @returns {Promise<string>} - Le numéro de document formaté (ex: "01")
 */
async function generateNoteDeServiceNumber(date = new Date(), idMinistere = null) {
    const db = require('../../config/database');
    try {
        // Extraire la date du jour (sans l'heure)
        const dateDebut = new Date(date);
        dateDebut.setHours(0, 0, 0, 0);
        const dateFin = new Date(date);
        dateFin.setHours(23, 59, 59, 999);

        let query, params;
        if (idMinistere != null) {
            // Compter par ministère : joindre agents sur id_agent_destinataire
            query = `
                SELECT COUNT(*) as count
                FROM documents_autorisation da
                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                WHERE da.type_document IN ('note_de_service', 'note_de_service_mutation')
                AND da.date_generation >= $1
                AND da.date_generation <= $2
                AND a.id_ministere = $3
            `;
            params = [dateDebut, dateFin, idMinistere];
        } else {
            query = `
                SELECT COUNT(*) as count
                FROM documents_autorisation
                WHERE type_document IN ('note_de_service', 'note_de_service_mutation')
                AND date_generation >= $1
                AND date_generation <= $2
            `;
            params = [dateDebut, dateFin];
        }

        const result = await db.query(query, params);

        const count = parseInt(result.rows[0]?.count || 0, 10);
        // Le prochain numéro sera count + 1, formaté avec 2 chiffres
        const nextNumber = count + 1;
        return String(nextNumber).padStart(2, '0');
    } catch (error) {
        console.error('❌ Erreur lors de la génération du numéro de note de service:', error);
        // Retourner "01" par défaut en cas d'erreur
        return '01';
    }
}

/**
 * Génère un numéro de document séquentiel pour une note de service basé sur le nombre total de notes de service
 * Le comptage est fait par ministère si idMinistere est fourni.
 * @param {string} typeDocument - Type de document ('note_de_service', 'note_de_service_mutation', 'certificat_non_jouissance_conge', etc.)
 * @param {number} excludeDocumentId - ID du document à exclure du comptage (optionnel)
 * @param {number} idMinistere - ID du ministère (optionnel). Si fourni, le comptage est fait par ministère.
 * @returns {Promise<string>} - Le numéro de document formaté avec 4 chiffres (ex: "0001")
 */
async function generateSequentialNoteDeServiceDocumentNumber(typeDocument = 'note_de_service', excludeDocumentId = null, idMinistere = null) {
    const db = require('../../config/database');
    try {
        let query, params;
        if (idMinistere != null) {
            // Compter par ministère : joindre agents sur id_agent_destinataire
            query = `
                SELECT COUNT(*) as count
                FROM documents_autorisation da
                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                WHERE da.type_document = $1
                AND a.id_ministere = $2
            `;
            params = [typeDocument, idMinistere];
            if (excludeDocumentId) {
                query += ` AND da.id != $3`;
                params.push(excludeDocumentId);
            }
        } else {
            query = `
                SELECT COUNT(*) as count
                FROM documents_autorisation
                WHERE type_document = $1
            `;
            params = [typeDocument];
            if (excludeDocumentId) {
                query += ` AND id != $2`;
                params.push(excludeDocumentId);
            }
        }

        const result = await db.query(query, params);

        const count = parseInt(result.rows[0]?.count || 0, 10);
        // Le prochain numéro sera count + 1, formaté avec 4 chiffres (0001, 0002, etc.)
        const nextNumber = count + 1;
        return String(nextNumber).padStart(4, '0');
    } catch (error) {
        console.error('❌ Erreur lors de la génération du numéro séquentiel de note de service:', error);
        // Retourner "0001" par défaut en cas d'erreur
        return '0001';
    }
}

module.exports = {
    formatDocumentReference,
    getDocumentReference,
    getSequentialDocumentNumber,
    generateNoteDeServiceNumber,
    generateSequentialNoteDeServiceDocumentNumber
};

