const db = require('../../config/database');

const FUNCTION_LABEL_CANDIDATES = [
    'fonction_resolue',
    'fonction_resolved',
    'fonction',
    'designation_poste',
    'fonction_nom',
    'fonction_label',
    'fonction_libelle',
    'poste',
    'role'
];

function extractAgentId(agent = {}) {
    return agent.id
        || agent.id_agent
        || agent.agent_id
        || agent.id_agent_generateur
        || agent.id_agent_validateur
        || agent.validateur_id
        || null;
}

function normalizeFunctionLabel(label = '', fallback = 'Le Directeur') {
    if (!label) {
        return fallback;
    }

    const cleaned = label.trim();
    if (!cleaned) {
        return fallback;
    }

    const normalized = cleaned.toLowerCase();
    const patternsToFallback = [
        'directeur des ressources humaines',
        'directeur général des ressources humaines',
        'directrice des ressources humaines',
        'directrice générale des ressources humaines',
        'directeur des ressources humaines (drh)',
        'directrice des ressources humaines (drh)',
        'directeur resources humaines',
        'directrice resources humaines',
        'drh',
    ];

    if (patternsToFallback.some(pattern => normalized.includes(pattern))) {
        return fallback;
    }

    return cleaned;
}

function getResolvedFunctionLabel(agent = {}) {
    for (const key of FUNCTION_LABEL_CANDIDATES) {
        if (agent[key] && typeof agent[key] === 'string') {
            const cleaned = agent[key].trim();
            if (cleaned) {
                return cleaned;
            }
        }
    }
    return '';
}

async function fetchLatestFunctionLabel(agentId) {
    if (!agentId) {
        return '';
    }

    const query = `
        SELECT
            COALESCE(fa.designation_poste, f.libele) AS fonction_label
        FROM fonction_agents fa
        LEFT JOIN fonctions f ON fa.id_fonction = f.id
        WHERE fa.id_agent = $1
        ORDER BY fa.date_entree DESC NULLS LAST, fa.created_at DESC NULLS LAST, fa.id DESC
        LIMIT 1
    `;

    try {
        const result = await db.query(query, [agentId]);
        if (result.rows.length > 0) {
            const label = result.rows[0].fonction_label;
            if (label) {
                return label.trim();
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de la fonction de l\'agent:', error);
    }

    return '';
}

async function hydrateAgentWithLatestFunction(agent) {
    if (!agent || typeof agent !== 'object') {
        return agent;
    }

    const existingLabel = getResolvedFunctionLabel(agent);
    if (existingLabel) {
        agent.fonction_resolved = normalizeFunctionLabel(existingLabel);
        return agent;
    }

    const agentId = extractAgentId(agent);
    const latestLabel = await fetchLatestFunctionLabel(agentId);
    if (latestLabel) {
        agent.fonction_resolved = normalizeFunctionLabel(latestLabel);
    }

    return agent;
}

function normalizeCivilite(civilite = '', sexe = null) {
    if (!civilite && sexe) {
        return sexe === 'F' ? 'Mme' : 'M.';
    }
    
    if (!civilite) {
        return 'M.';
    }
    
    const normalized = civilite.trim().toLowerCase();
    
    // Abréviations pour les civilités courantes
    const abbreviations = {
        'monsieur': 'M.',
        'm.': 'M.',
        'm': 'M.',
        'madame': 'Mme',
        'mme': 'Mme',
        'mademoiselle': 'Mlle',
        'mlle': 'Mlle',
        'mle': 'Mlle'
    };
    
    return abbreviations[normalized] || civilite;
}

/**
 * Retourne le libellé à afficher pour le poste/emploi d'un agent dans les documents.
 * - FONCTIONNAIRE : emploi issu de la table emploi_agents (emploi_libele, emploi_designation_poste).
 * - Autres types : fonction issue de la table fonction_agents (fonction_actuelle).
 * @param {Object} agent - Objet agent avec type_agent_libele, emploi_libele, emploi_designation_poste, fonction_actuelle, poste
 * @returns {string}
 */
function getAgentPosteOuEmploi(agent = {}) {
    const isFonctionnaire = agent.type_agent_libele && String(agent.type_agent_libele).toUpperCase() === 'FONCTIONNAIRE';
    return isFonctionnaire
        ? (agent.emploi_libele || agent.emploi_designation_poste || agent.emploi_actuel_libele || 'Agent')
        : (agent.fonction_actuelle || agent.poste || 'Agent');
}

function formatAgentDisplayName(agent = {}) {
    if (!agent) {
        return '';
    }

    const parts = [];

    // Mettre les prénoms en majuscules
    const prenom = agent.prenom
        ? agent.prenom.toUpperCase().trim()
        : '';

    const nom = agent.nom ? agent.nom.toUpperCase() : '';

    if (prenom) {
        parts.push(prenom);
    }
    if (nom) {
        parts.push(nom);
    }

    if (parts.length === 0) {
        return '';
    }

    return parts.join(' ');
}

module.exports = {
    hydrateAgentWithLatestFunction,
    getResolvedFunctionLabel,
    getAgentPosteOuEmploi,
    formatAgentDisplayName,
    normalizeFunctionLabel,
    normalizeCivilite,
    extractAgentId,
};

