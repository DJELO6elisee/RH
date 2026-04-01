const pool = require('../config/database');
const BaseController = require('./BaseController');

class DirectionsController extends BaseController {
    constructor() {
            super('directions');
        }
        // Récupérer toutes les directions directes des ministères avec pagination et recherche
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search = '', sortBy = 'libelle', sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND d.libelle ILIKE $${paramIndex}`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Filtrage par ministère si spécifié (pour les DRH)
            if (req.query.id_ministere) {
                whereClause += ` AND d.id_ministere = $${paramIndex}`;
                params.push(req.query.id_ministere);
                paramIndex++;
            }

            // Filtrage par direction générale si spécifié
            if (req.query.id_direction_generale) {
                whereClause += ` AND d.id_direction_generale = $${paramIndex}`;
                params.push(req.query.id_direction_generale);
                paramIndex++;
            }


            const query = `
                SELECT 
                    d.id,
                    d.libelle,
                    d.id_ministere,
                    d.id_direction_generale,
                    d.responsable_id,
                    d.description,
                    d.created_at,
                    d.updated_at,
                    'direction_directe' as type_direction,
                    m.nom as ministere_nom,
                    dg.libelle as direction_generale_nom,
                    dg.libelle as id_direction_generale_nom,
                    CASE 
                        WHEN a.id IS NOT NULL THEN CONCAT(a.nom, ' ', a.prenom)
                        ELSE NULL
                    END as responsable_nom
                FROM directions d
                LEFT JOIN ministeres m ON d.id_ministere = m.id
                LEFT JOIN direction_generale dg ON d.id_direction_generale = dg.id
                LEFT JOIN agents a ON d.responsable_id = a.id
                ${whereClause}
                ORDER BY d.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM directions d
                LEFT JOIN ministeres m ON d.id_ministere = m.id
                LEFT JOIN direction_generale dg ON d.id_direction_generale = dg.id
                LEFT JOIN agents a ON d.responsable_id = a.id
                ${whereClause}
            `;

            const countResult = await pool.query(countQuery, params.slice(0, -2));
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des services:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Obtenir toutes les directions (et directions générales) sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            // Déterminer le ministère à utiliser pour le filtrage
            let ministereId = null;

            if (req.user) {
                let userMinistereId = null;

                // Depuis l'organisation de l'utilisateur (nouvelle structure)
                if (req.user.organization && req.user.organization.type === 'ministere') {
                    userMinistereId = req.user.organization.id;
                }
                // Depuis l'agent lié à l'utilisateur (cas le plus courant)
                else if (req.user.id_agent) {
                    try {
                        const agentResult = await pool.query(
                            'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                        );
                        if (agentResult.rows.length > 0) {
                            userMinistereId = agentResult.rows[0].id_ministere;
                        }
                    } catch (error) {
                        console.error('Erreur lors de la récupération du ministère de l\'agent connecté pour getAllForSelect:', error);
                    }
                }
                // Fallback: id_ministere directement sur l'utilisateur (ancienne structure)
                else if (req.user.id_ministere) {
                    userMinistereId = req.user.id_ministere;
                }

                // Pour les DRH, on force TOUJOURS l'utilisation du ministère de l'utilisateur,
                // même si un id_ministere est passé dans la query
                if (req.user.role && req.user.role.toLowerCase() === 'drh') {
                    ministereId = userMinistereId;
                } else {
                    // Pour les autres rôles, on laisse la possibilité de passer un id_ministere en query
                    ministereId = req.query.id_ministere || userMinistereId;
                }
            } else {
                // Aucun utilisateur (cas exceptionnel) : on ne peut utiliser que le paramètre de requête
                ministereId = req.query.id_ministere || null;
            }

            // Ne pas filtrer automatiquement pour les super_admin si aucun ministère n'est trouvé
            if (req.user && req.user.role === 'super_admin' && !req.query.id_ministere) {
                ministereId = null;
            }

            // Appliquer le filtrage par ministère pour les directions si on a un id
            if (ministereId) {
                whereClause += ` AND d.id_ministere = $${paramIndex}`;
                params.push(ministereId);
                paramIndex++;
            }

            // Filtrage par direction générale si spécifié
            if (req.query.id_direction_generale) {
                whereClause += ` AND d.id_direction_generale = $${paramIndex}`;
                params.push(req.query.id_direction_generale);
                paramIndex++;
            }

            // Récupérer les directions
            const directionsQuery = `
                SELECT 
                    d.id,
                    d.libelle,
                    'direction' AS type
                FROM directions d
                ${whereClause}
                ORDER BY d.libelle ASC
            `;
            const directionsResult = await pool.query(directionsQuery, params);

            // Récupérer également les directions générales pour enrichir les listes
            // (filtrage par ministère si disponible)
            let dgWhereClause = 'WHERE 1=1';
            const dgParams = [];
            if (ministereId) {
                dgWhereClause += ' AND dg.id_ministere = $1';
                dgParams.push(ministereId);
            }
            const directionsGeneralesQuery = `
                SELECT 
                    dg.id,
                    dg.libelle,
                    'direction_generale' AS type
                FROM direction_generale dg
                ${dgWhereClause}
                ORDER BY dg.libelle ASC
            `;
            const directionsGeneralesResult = await pool.query(directionsGeneralesQuery, dgParams);

            // Si on filtre par direction générale, on ne veut probablement QUE les directions de celle-ci (pas les DG elles-mêmes)
            const includeDG = !req.query.id_direction_generale;

            // Fusionner les deux listes et trier par libellé pour un affichage propre
            let combined = [...directionsResult.rows];
            if (includeDG) {
                combined = [...combined, ...directionsGeneralesResult.rows];
            }
            combined.sort(
                (a, b) => String(a.libelle || '').localeCompare(String(b.libelle || ''), 'fr')
            );

            res.json(combined);
        } catch (error) {
            console.error('Erreur lors de la récupération des directions pour select:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Récupérer un service par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `
                SELECT 
                    s.*,
                    m.nom as ministere_nom,
                    dg.libelle as direction_generale_nom,
                    dg.libelle as id_direction_generale_nom,
                    CASE 
                        WHEN a.id IS NOT NULL THEN CONCAT(a.nom, ' ', a.prenom)
                        ELSE NULL
                    END as responsable_nom
                FROM directions s
                LEFT JOIN ministeres m ON s.id_ministere = m.id
                LEFT JOIN direction_generale dg ON s.id_direction_generale = dg.id
                LEFT JOIN agents a ON s.responsable_id = a.id
                WHERE s.id = $1
            `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Service non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer les directeurs et sous-directeurs d'une direction (pour décisions individuelles)
    // Basé sur les rôles dans la table utilisateurs, pas sur responsable_id
    async getDirecteursByDirection(req, res) {
            try {
                const { id } = req.params;

                const directionQuery = 'SELECT id, libelle FROM directions WHERE id = $1';
                const directionResult = await pool.query(directionQuery, [id]);

                if (directionResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Direction non trouvée'
                    });
                }

                const direction = directionResult.rows[0];
                const directeurs = [];

                // Rôles à rechercher pour les décisions individuelles
                const rolesSpecifiques = [
                    'directeur',
                    'drh',
                    'sous_directeur',
                    'chef_cabinet',
                    'dir_cabinet',
                    'directeur_general',
                    'directeur_central'
                ];

                // Récupérer tous les agents de la direction qui ont un rôle spécifique
                // (directeur, DRH, sous-directeur, directeur général, directeur central, etc.)
                const directeursQuery = `
                SELECT DISTINCT
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    LOWER(TRIM(r.nom)) as role_nom,
                    d.libelle as direction_libelle,
                    sd.libelle as sous_direction_libelle
                FROM agents a
                INNER JOIN utilisateurs u ON u.id_agent = a.id
                INNER JOIN roles r ON u.id_role = r.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                WHERE a.id_direction = $1
                  AND (a.retire IS NULL OR a.retire = false)
                  AND (u.is_active IS NULL OR u.is_active = true)
                  AND LOWER(TRIM(r.nom)) = ANY($2::text[])
                ORDER BY 
                    CASE LOWER(TRIM(r.nom))
                        WHEN 'directeur_general' THEN 1
                        WHEN 'directeur_central' THEN 2
                        WHEN 'drh' THEN 3
                        WHEN 'directeur' THEN 4
                        WHEN 'sous_directeur' THEN 5
                        WHEN 'chef_cabinet' THEN 6
                        WHEN 'dir_cabinet' THEN 7
                        ELSE 8
                    END,
                    a.nom, a.prenom
            `;

                const directeursResult = await pool.query(directeursQuery, [id, rolesSpecifiques]);

                for (const row of directeursResult.rows) {
                    let typeLabel = '';
                    let libelle = '';

                    // Déterminer le type et le libellé selon le rôle
                    switch (row.role_nom) {
                        case 'directeur_general':
                            typeLabel = 'Directeur Général';
                            libelle = `${row.nom} ${row.prenom} - Directeur Général`;
                            break;
                        case 'directeur_central':
                            typeLabel = 'Directeur Central';
                            libelle = `${row.nom} ${row.prenom} - Directeur Central`;
                            break;
                        case 'drh':
                            typeLabel = 'DRH';
                            libelle = `${row.nom} ${row.prenom} - DRH`;
                            break;
                        case 'directeur':
                            typeLabel = 'Directeur';
                            libelle = `${row.nom} ${row.prenom} - Directeur de ${row.direction_libelle || direction.libelle}`;
                            break;
                        case 'sous_directeur':
                            typeLabel = 'Sous-directeur';
                            libelle = `${row.nom} ${row.prenom} - Sous-directeur${row.sous_direction_libelle ? ` de ${row.sous_direction_libelle}` : ''}`;
                        break;
                    case 'chef_cabinet':
                        typeLabel = 'Chef de Cabinet';
                        libelle = `${row.nom} ${row.prenom} - Chef de Cabinet`;
                        break;
                    case 'dir_cabinet':
                        typeLabel = 'Directeur de Cabinet';
                        libelle = `${row.nom} ${row.prenom} - Directeur de Cabinet`;
                        break;
                    default:
                        typeLabel = row.role_nom;
                        libelle = `${row.nom} ${row.prenom} - ${row.role_nom}`;
                }

                directeurs.push({
                    id: row.id,
                    nom: row.nom,
                    prenom: row.prenom,
                    matricule: row.matricule,
                    type: row.role_nom,
                    type_label: typeLabel,
                    libelle: libelle
                });
            }

            // Récupérer aussi les agents des sous-directions de cette direction qui ont un rôle spécifique
            // Exclure ceux déjà récupérés dans la première requête
            const existingIds = directeursResult.rows.map(d => d.id);
            let sousDirecteursParams = [id, rolesSpecifiques];
            let sousDirecteursQuery = `
                SELECT DISTINCT
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    LOWER(TRIM(r.nom)) as role_nom,
                    sd.libelle as sous_direction_libelle
                FROM agents a
                INNER JOIN utilisateurs u ON u.id_agent = a.id
                INNER JOIN roles r ON u.id_role = r.id
                INNER JOIN sous_directions sd ON a.id_sous_direction = sd.id
                WHERE sd.direction_id = $1
                  AND (a.retire IS NULL OR a.retire = false)
                  AND (u.is_active IS NULL OR u.is_active = true)
                  AND LOWER(TRIM(r.nom)) = ANY($2::text[])
            `;

            // Exclure les agents déjà récupérés
            if (existingIds.length > 0) {
                sousDirecteursQuery += ` AND a.id NOT IN (${existingIds.map((_, i) => `$${i + 3}`).join(', ')})`;
                sousDirecteursParams = [...sousDirecteursParams, ...existingIds];
            }

            sousDirecteursQuery += `
                ORDER BY 
                    CASE LOWER(TRIM(r.nom))
                        WHEN 'sous_directeur' THEN 1
                        WHEN 'directeur' THEN 2
                        ELSE 3
                    END,
                    a.nom, a.prenom
            `;

            const sousDirecteursResult = await pool.query(sousDirecteursQuery, sousDirecteursParams);

            for (const row of sousDirecteursResult.rows) {
                let typeLabel = '';
                let libelle = '';

                switch (row.role_nom) {
                    case 'sous_directeur':
                        typeLabel = 'Sous-directeur';
                        libelle = `${row.nom} ${row.prenom} - Sous-directeur de ${row.sous_direction_libelle || 'sous-direction'}`;
                        break;
                    case 'directeur':
                        typeLabel = 'Directeur';
                        libelle = `${row.nom} ${row.prenom} - Directeur${row.sous_direction_libelle ? ` de ${row.sous_direction_libelle}` : ''}`;
                        break;
                    default:
                        typeLabel = row.role_nom;
                        libelle = `${row.nom} ${row.prenom} - ${row.role_nom}`;
                }

                directeurs.push({
                    id: row.id,
                    nom: row.nom,
                    prenom: row.prenom,
                    matricule: row.matricule,
                    type: row.role_nom,
                    type_label: typeLabel,
                    libelle: libelle
                });
            }

            return res.json({
                success: true,
                data: directeurs
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des directeurs:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des directeurs',
                error: error.message
            });
        }
    }

    // Récupérer les agents d'une direction
    async getAgentsByDirection(req, res) {
        try {
            const { id } = req.params;

            const directionQuery = 'SELECT * FROM directions WHERE id = $1';
            const directionResult = await pool.query(directionQuery, [id]);

            if (directionResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Direction non trouvée'
                });
            }

            const direction = directionResult.rows[0];

            // Récupérer le ministère de l'utilisateur connecté pour filtrer
            let userMinistereId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                        console.log(`🔍 getAgentsByDirection - Ministère ID: ${userMinistereId}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            }

            // Construire la requête avec filtre par ministère si disponible
            let whereClause = 'WHERE a.id_direction = $1 AND (a.retire IS NULL OR a.retire = false)';
            let queryParams = [id];
            let paramIndex = 2;

            // Ajouter le filtre par ministère si l'utilisateur n'est pas super_admin
            if (userMinistereId && (!req.user || req.user.role !== 'super_admin')) {
                whereClause += ` AND a.id_ministere = $${paramIndex}`;
                queryParams.push(userMinistereId);
                paramIndex++;
            }

            // Ajouter le responsable_id pour le tri (sera le dernier paramètre)
            const responsableParamIndex = paramIndex;
            queryParams.push(direction.responsable_id);

            const agentsQuery = `
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    f.libele as fonction_libele,
                    emp.libele as emploi_libele,
                    g.libele as grade_libele,
                    ech.libele as echelon_libele,
                    cat.libele as categorie_libele,
                    p.libele as position_libele,
                    CASE 
                        WHEN a.sexe = 'M' THEN 'Masculin'
                        WHEN a.sexe = 'F' THEN 'Féminin'
                        ELSE 'Non spécifié'
                    END as sexe_libelle,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        ELSE 'Non spécifié'
                    END as statut_emploi_libelle,
                    CONCAT(a.nom, ' ', a.prenom) as nom_complet
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN fonctions f ON a.id_fonction = f.id
                LEFT JOIN emplois emp ON a.id_emploi = emp.id
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN echelons ech ON a.id_echelon = ech.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN positions p ON a.id_position = p.id
                ${whereClause}
                ORDER BY 
                    CASE WHEN a.id = $${responsableParamIndex} THEN 0 ELSE 1 END, -- Chef de direction en premier
                    a.nom, a.prenom
            `;

            const agentsResult = await pool.query(agentsQuery, queryParams);

            res.json({
                success: true,
                data: {
                    direction: direction,
                    agents: agentsResult.rows
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des agents du service:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents du service',
                error: error.message
            });
        }
    }

    // Créer un nouveau service
    async create(req, res) {
        try {
            const { libelle, description, responsable_id, id_direction_generale } = req.body;

            if (!libelle) {
                return res.status(400).json({ success: false, message: 'Le libellé est requis' });
            }

            // Récupérer l'id_ministere de l'utilisateur connecté
            let userMinistereId = null;

            // Récupérer depuis l'organisation de l'utilisateur (si disponible)
            if (req.user && req.user.organization && req.user.organization.type === 'ministere') {
                userMinistereId = req.user.organization.id;
            }
            // Fallback: récupérer depuis l'agent (cas le plus courant)
            else if (req.user && req.user.id_agent) {
                const agentResult = await pool.query(
                    'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                );
                if (agentResult.rows.length > 0) {
                    userMinistereId = agentResult.rows[0].id_ministere;
                }
            }
            // Fallback: récupérer depuis l'utilisateur directement (ancienne structure)
            else if (req.user && req.user.id_ministere) {
                userMinistereId = req.user.id_ministere;
            }

            if (!userMinistereId) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de déterminer le ministère de l\'utilisateur'
                });
            }

            const result = await pool.query(
                'INSERT INTO directions (libelle, id_ministere, id_direction_generale, description, responsable_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', [libelle, userMinistereId, id_direction_generale || null, description || null, responsable_id || null]
            );

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Mettre à jour un service
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libelle, description, responsable_id, id_direction_generale } = req.body;

            // Récupérer l'id_ministere de l'utilisateur connecté
            let userMinistereId = null;

            // Récupérer depuis l'organisation de l'utilisateur (si disponible)
            if (req.user && req.user.organization && req.user.organization.type === 'ministere') {
                userMinistereId = req.user.organization.id;
            }
            // Fallback: récupérer depuis l'agent (cas le plus courant)
            else if (req.user && req.user.id_agent) {
                const agentResult = await pool.query(
                    'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                );
                if (agentResult.rows.length > 0) {
                    userMinistereId = agentResult.rows[0].id_ministere;
                }
            }
            // Fallback: récupérer depuis l'utilisateur directement (ancienne structure)
            else if (req.user && req.user.id_ministere) {
                userMinistereId = req.user.id_ministere;
            }

            if (!userMinistereId) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de déterminer le ministère de l\'utilisateur'
                });
            }

            const result = await pool.query(
                'UPDATE directions SET libelle = $1, description = $2, id_ministere = $3, id_direction_generale = $4, responsable_id = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *', [libelle, description || null, userMinistereId, id_direction_generale || null, responsable_id || null, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Service non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Supprimer un service
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM directions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Service non trouvé' });
            }

            res.json({ success: true, message: 'Service supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = DirectionsController;