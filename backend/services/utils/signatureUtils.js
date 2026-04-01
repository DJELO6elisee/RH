const pool = require('../../config/database');

/**
 * Récupère l'agent DRH (rôle DRH) par direction ou ministère pour utiliser sa signature.
 * Priorités : 1) DRH de la direction "Direction des Ressources Humaines" ; 2) même direction que l'agent ; 3) même ministère.
 * @param {number|null} idDirection - ID de la direction de l'agent du document
 * @param {number|null} idMinistere - ID du ministère de l'agent du document
 * @returns {Promise<Object|null>} - Agent DRH avec signature attachée, ou null
 */
async function fetchDRHForSignature(idDirection, idMinistere) {
    const hasDirection = idDirection != null && idDirection !== '';
    const hasMinistere = idMinistere != null && idMinistere !== '';
    if (!hasDirection && !hasMinistere) {
        return null;
    }
    try {
        const dirParam = hasDirection ? idDirection : null;
        const minParam = hasMinistere ? idMinistere : null;
        const { rows } = await pool.query(
            `
            SELECT a.id, a.prenom, a.nom, a.sexe, a.fonction_actuelle,
                   d.libelle as direction_nom, m.nom as ministere_nom, m.sigle as ministere_sigle,
                   c.libele as civilite,
                   fa.designation_poste as fonction_designation
            FROM utilisateurs u
            JOIN roles r ON u.id_role = r.id
            JOIN agents a ON u.id_agent = a.id
            LEFT JOIN directions d ON a.id_direction = d.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            LEFT JOIN civilites c ON a.id_civilite = c.id
            LEFT JOIN fonction_agents fa ON a.id = fa.id_agent AND fa.date_entree = (
                SELECT MAX(fa2.date_entree) FROM fonction_agents fa2 WHERE fa2.id_agent = a.id
            )
            WHERE UPPER(TRIM(r.nom)) = 'DRH' AND (u.is_active IS NULL OR u.is_active = true)
              AND (
                ($1::int IS NOT NULL AND a.id_direction = $1)
                OR
                ($2::int IS NOT NULL AND a.id_ministere = $2)
              )
            ORDER BY
              CASE WHEN UPPER(TRIM(COALESCE(d.libelle, ''))) LIKE '%RESSOURCES HUMAINES%' OR UPPER(TRIM(COALESCE(d.libelle, ''))) LIKE '%DRH%' THEN 0 ELSE 1 END,
              CASE WHEN $1::int IS NOT NULL AND a.id_direction = $1 THEN 0 ELSE 1 END
            LIMIT 1
            `,
            [dirParam, minParam]
        );
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        const drh = {
            id: row.id,
            prenom: row.prenom,
            nom: row.nom,
            sexe: row.sexe,
            fonction: row.fonction_designation || row.fonction_actuelle,
            fonction_actuelle: row.fonction_actuelle,
            ministere_nom: row.ministere_nom,
            ministere_sigle: row.ministere_sigle,
            direction_nom: row.direction_nom,
            service_nom: row.direction_nom,
            structure_nom: row.direction_nom,
            civilite: row.civilite
        };
        await attachActiveSignature(drh);
        return drh;
    } catch (err) {
        console.error('❌ [fetchDRHForSignature] Erreur:', err);
        return null;
    }
}

async function attachActiveSignature(agent = null) {
    if (!agent || !agent.id) {
        console.warn(`⚠️ [attachActiveSignature] Agent invalide ou sans ID:`, {
            hasAgent: !!agent,
            hasId: !!(agent && agent.id),
            agentId: agent?.id
        });
        return agent;
    }

    try {
        console.log(`🔍 [attachActiveSignature] Récupération de la signature active pour agent ${agent.id}...`);
        const { rows } = await pool.query(
            `
                SELECT 
                    signature_path,
                    signature_type,
                    signature_name
                FROM agent_signatures
                WHERE id_agent = $1
                  AND is_active = true
                ORDER BY updated_at DESC NULLS LAST, created_at DESC
                LIMIT 1
            `,
            [agent.id]
        );

        if (rows.length > 0) {
            const signature = rows[0];
            agent.signature_path = signature.signature_path;
            agent.signature_type = signature.signature_type;
            agent.signature_name = signature.signature_name;
            console.log(`✅ [attachActiveSignature] Signature active trouvée pour agent ${agent.id}:`, {
                signature_path: signature.signature_path,
                signature_type: signature.signature_type
            });
        } else {
            // Si aucune signature active n'est trouvée, s'assurer que signature_path est null
            agent.signature_path = null;
            agent.signature_type = null;
            agent.signature_name = null;
            console.warn(`⚠️ [attachActiveSignature] Aucune signature active trouvée pour agent ${agent.id}`);
        }
    } catch (error) {
        console.error('❌ [attachActiveSignature] Impossible de récupérer la signature active:', error);
    }

    return agent;
}

module.exports = {
    attachActiveSignature,
    fetchDRHForSignature
};

