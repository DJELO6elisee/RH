const pool = require('../config/database');

class EchelonsAgentsController {
    // Récupérer tous les échelons des agents avec informations complètes
    async getAllWithAgentInfo(req, res) {
        try {
            const { page = 1, limit = 10, search = '', ministere_id, id_ministere, id_direction, id_sous_direction } = req.query;
            const offset = (page - 1) * limit;
            const isSuperAdmin = req.user && req.user.role && String(req.user.role).toLowerCase() === 'super_admin';

            let ministereId = id_ministere || ministere_id ? parseInt(id_ministere || ministere_id) : null;

            if (!ministereId && !isSuperAdmin) {
                if (req.user && req.user.id_agent) {
                    try {
                        const userAgentQuery = await pool.query(
                            'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                        );
                        if (userAgentQuery.rows.length > 0) {
                            ministereId = userAgentQuery.rows[0].id_ministere;
                        }
                    } catch (error) {
                        console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                    }
                }
            }

            const whereConditions = [];
            const queryParams = [];

            whereConditions.push(`(a.statut_emploi IS NULL OR LOWER(a.statut_emploi) != 'retraite')`);
            whereConditions.push(`(a.retire IS NULL OR a.retire = false)`);

            if (ministereId) {
                whereConditions.push(`a.id_ministere = $${queryParams.length + 1}`);
                queryParams.push(ministereId);
            } else if (!isSuperAdmin) {
                return res.status(400).json({
                    success: false,
                    message: 'Le filtrage par ministère est obligatoire'
                });
            }

            if (id_direction) {
                whereConditions.push(`a.id_direction = $${queryParams.length + 1}`);
                queryParams.push(parseInt(id_direction));
            }
            if (id_sous_direction) {
                whereConditions.push(`a.id_sous_direction = $${queryParams.length + 1}`);
                queryParams.push(parseInt(id_sous_direction));
            }

            // Ajouter la recherche si fournie
            if (search && search.trim() !== '') {
                const searchPattern = `%${search.trim()}%`;
                const param1 = queryParams.length + 1;
                const param2 = queryParams.length + 2;
                const param3 = queryParams.length + 3;
                whereConditions.push(`(a.nom ILIKE $${param1} OR a.prenom ILIKE $${param2} OR a.matricule ILIKE $${param3})`);
                queryParams.push(searchPattern, searchPattern, searchPattern);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Requête pour récupérer tous les agents du ministère avec leurs échelons
            const limitParam = queryParams.length + 1;
            const offsetParam = queryParams.length + 2;
            const query = `
                SELECT 
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.email,
                    a.telephone1,
                    f.libele as fonction_actuelle,
                    emp.libele as emploi_actuel,
                    COALESCE(echelons_counts.nb_echelons, 0) as nb_echelons,
                    echelons_counts.dernier_echelon_date,
                    echelons_counts.dernier_echelon_nom,
                    echelons_counts.dernier_echelon_libele as echelon_actuel,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        ELSE a.statut_emploi
                    END as statut_emploi_libelle
                FROM agents a
                LEFT JOIN fonctions f ON a.id_fonction = f.id
                LEFT JOIN emplois emp ON a.id_emploi = emp.id
                LEFT JOIN (
                    SELECT 
                        ea.id_agent,
                        COUNT(ea.id) as nb_echelons,
                        MAX(COALESCE(ea.date_entree, ea.created_at)) as dernier_echelon_date,
                        -- Dernier échelon (le plus récent par date)
                        (
                            SELECT e2.libele
                            FROM echelons_agents ea2
                            LEFT JOIN echelons e2 ON ea2.id_echelon = e2.id
                            WHERE ea2.id_agent = ea.id_agent
                            ORDER BY COALESCE(ea2.date_entree, ea2.created_at) DESC
                            LIMIT 1
                        ) as dernier_echelon_nom,
                        (
                            SELECT e2.libele
                            FROM echelons_agents ea2
                            LEFT JOIN echelons e2 ON ea2.id_echelon = e2.id
                            WHERE ea2.id_agent = ea.id_agent
                            ORDER BY COALESCE(ea2.date_entree, ea2.created_at) DESC
                            LIMIT 1
                        ) as dernier_echelon_libele
                    FROM echelons_agents ea
                    GROUP BY ea.id_agent
                ) echelons_counts ON a.id = echelons_counts.id_agent
                ${whereClause}
                ORDER BY a.nom, a.prenom
                LIMIT $${limitParam} OFFSET $${offsetParam}
            `;

            queryParams.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(query, queryParams);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(DISTINCT a.id) as total
                FROM agents a
                LEFT JOIN echelons_agents ea ON a.id = ea.id_agent
                ${whereClause}
            `;
            const countParams = queryParams.slice(0, -2);
            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer les échelons d'un agent spécifique
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;

            // Vérifier que l'agent existe et récupérer son ministère
            const agentCheck = await pool.query(
                'SELECT id, id_ministere FROM agents WHERE id = $1', 
                [agentId]
            );
            
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const agentMinistereId = agentCheck.rows[0].id_ministere;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        // Si l'utilisateur a un ministère, vérifier qu'il correspond à celui de l'agent
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous n\'avez pas accès aux échelons de cet agent'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            const query = `
                SELECT 
                    ea.*,
                    e.libele as echelon_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM echelons_agents ea
                LEFT JOIN echelons e ON ea.id_echelon = e.id
                LEFT JOIN nominations n ON ea.id_nomination = n.id
                WHERE ea.id_agent = $1
                ORDER BY COALESCE(ea.date_entree, ea.created_at) DESC
            `;

            const result = await pool.query(query, [agentId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des échelons de l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des échelons de l\'agent',
                error: error.message
            });
        }
    }

    // Créer un nouvel échelon pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_echelon, date_entree, nature, numero, date_signature } = req.body;

            // Validation : seulement id_echelon est obligatoire
            if (!id_echelon) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'échelon est obligatoire'
                });
            }

            if (!id_agent) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'agent est obligatoire'
                });
            }

            // Vérifier que l'agent existe et récupérer son ministère
            const agentQuery = await pool.query('SELECT id, id_ministere FROM agents WHERE id = $1', [id_agent]);
            if (agentQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const agentMinistereId = agentQuery.rows[0].id_ministere;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous ne pouvez pas créer un échelon pour un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier que l'échelon existe
            const echelonQuery = await pool.query('SELECT id FROM echelons WHERE id = $1', [id_echelon]);
            if (echelonQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Échelon non trouvé'
                });
            }

            // Vérifier si le numéro existe déjà
            let id_nomination = null;
            if (numero) {
                const existingNominationQuery = `
                    SELECT id FROM nominations WHERE numero = $1
                `;
                const existingNomination = await pool.query(existingNominationQuery, [numero]);

                if (existingNomination.rows.length > 0) {
                    // Utiliser la nomination existante
                    id_nomination = existingNomination.rows[0].id;
                    console.log(`📋 Utilisation de la nomination existante avec ID: ${id_nomination}`);
                } else if (nature && numero && date_signature) {
                    // Créer une nouvelle nomination
                    const nominationQuery = `
                        INSERT INTO nominations (id_agent, type_nomination, nature, numero, date_signature, statut)
                        VALUES ($1, 'fonction', $2, $3, $4, 'active')
                        RETURNING id
                    `;
                    const nominationResult = await pool.query(nominationQuery, [id_agent, nature, numero, date_signature]);
                    id_nomination = nominationResult.rows[0].id;
                    console.log(`📋 Nouvelle nomination créée avec ID: ${id_nomination}`);
                }
            }

            // Récupérer l'ancien échelon actif (sans date_sortie) pour mettre à jour sa date_sortie
            const ancienEchelonQuery = `
                SELECT id, created_at
                FROM echelons_agents
                WHERE id_agent = $1 
                    AND date_sortie IS NULL
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const ancienEchelon = await pool.query(ancienEchelonQuery, [id_agent]);
            
            // Date de création du nouvel échelon (sera utilisée comme date_sortie de l'ancien)
            const dateCreationNouveau = new Date();

            // Créer l'entrée dans echelons_agents (sans date_sortie)
            const echelonAgentQuery = `
                INSERT INTO echelons_agents (id_agent, id_nomination, id_echelon, date_entree)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await pool.query(echelonAgentQuery, [id_agent, id_nomination, id_echelon, date_entree || null]);

            // Mettre à jour la date_sortie de l'ancien échelon avec la date de création du nouveau
            if (ancienEchelon.rows.length > 0 && ancienEchelon.rows[0].id !== result.rows[0].id) {
                await pool.query(
                    'UPDATE echelons_agents SET date_sortie = $1 WHERE id = $2',
                    [dateCreationNouveau, ancienEchelon.rows[0].id]
                );
                console.log(`✅ Date de sortie mise à jour pour l'ancien échelon ID: ${ancienEchelon.rows[0].id}`);
            }

            // Mettre à jour l'échelon actuel de l'agent
            const latestEchelonQuery = `
                SELECT id_echelon, date_entree
                FROM echelons_agents
                WHERE id_agent = $1
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const latestEchelon = await pool.query(latestEchelonQuery, [id_agent]);
            if (latestEchelon.rows.length > 0 && latestEchelon.rows[0].id_echelon) {
                await pool.query(
                    'UPDATE agents SET id_echelon = $1 WHERE id = $2',
                    [latestEchelon.rows[0].id_echelon, id_agent]
                );
            }

            res.status(201).json({
                success: true,
                message: 'Échelon attribué avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de l\'attribution de l\'échelon:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'attribution de l\'échelon',
                error: error.message
            });
        }
    }

    // Récupérer un échelon spécifique
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    ea.*,
                    e.libele as echelon_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM echelons_agents ea
                LEFT JOIN echelons e ON ea.id_echelon = e.id
                LEFT JOIN nominations n ON ea.id_nomination = n.id
                WHERE ea.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Échelon non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'échelon:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de l\'échelon',
                error: error.message
            });
        }
    }

    // Mettre à jour un échelon
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_echelon, date_entree, nature, numero, date_signature } = req.body;
            // Note: date_sortie n'est pas modifiable via update, elle est gérée automatiquement lors de la création d'un nouvel échelon

            // Vérifier que l'échelon existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT ea.*, a.id_ministere as agent_ministere_id FROM echelons_agents ea JOIN agents a ON ea.id_agent = a.id WHERE ea.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Échelon non trouvé'
                });
            }

            const echelonAgent = existingQuery.rows[0];
            const agentMinistereId = echelonAgent.agent_ministere_id;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous ne pouvez pas modifier un échelon d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Mettre à jour la nomination si fournie
            if (echelonAgent.id_nomination && (nature || numero || date_signature)) {
                const nominationQuery = `
                    UPDATE nominations 
                    SET nature = COALESCE($1, nature), 
                        numero = COALESCE($2, numero), 
                        date_signature = COALESCE($3, date_signature), 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                `;
                await pool.query(nominationQuery, [nature || null, numero || null, date_signature || null, echelonAgent.id_nomination]);
            }

            // Mettre à jour l'échelon_agent
            // Note: date_sortie n'est pas modifiable via update, elle est gérée automatiquement lors de la création d'un nouvel échelon
            const updateQuery = `
                UPDATE echelons_agents 
                SET id_echelon = COALESCE($1, id_echelon), 
                    date_entree = COALESCE($2, date_entree), 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [id_echelon || null, date_entree || null, id]);

            // Mettre à jour l'échelon actuel de l'agent si nécessaire
            if (date_entree || id_echelon) {
                const latestEchelonQuery = `
                    SELECT id_echelon, date_entree
                    FROM echelons_agents
                    WHERE id_agent = $1
                    ORDER BY COALESCE(date_entree, created_at) DESC
                    LIMIT 1
                `;
                const latestEchelon = await pool.query(latestEchelonQuery, [echelonAgent.id_agent]);
                if (latestEchelon.rows.length > 0 && latestEchelon.rows[0].id_echelon) {
                    await pool.query(
                        'UPDATE agents SET id_echelon = $1 WHERE id = $2',
                        [latestEchelon.rows[0].id_echelon, echelonAgent.id_agent]
                    );
                }
            }

            res.json({
                success: true,
                message: 'Échelon mis à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'échelon:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de l\'échelon',
                error: error.message
            });
        }
    }

    // Supprimer un échelon
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'ID de la nomination et le ministère de l'agent
            const echelonQuery = await pool.query(
                'SELECT ea.id_nomination, ea.id_agent, a.id_ministere as agent_ministere_id FROM echelons_agents ea JOIN agents a ON ea.id_agent = a.id WHERE ea.id = $1', 
                [id]
            );
            if (echelonQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Échelon non trouvé'
                });
            }

            const id_nomination = echelonQuery.rows[0].id_nomination;
            const agentMinistereId = echelonQuery.rows[0].agent_ministere_id;
            const id_agent = echelonQuery.rows[0].id_agent;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous ne pouvez pas supprimer un échelon d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Supprimer l'échelon_agent
            await pool.query('DELETE FROM echelons_agents WHERE id = $1', [id]);

            // Mettre à jour l'échelon actuel de l'agent avec l'échelon le plus récent restant
            const latestEchelonQuery = `
                SELECT id_echelon, date_entree
                FROM echelons_agents
                WHERE id_agent = $1
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const latestEchelon = await pool.query(latestEchelonQuery, [id_agent]);
            if (latestEchelon.rows.length > 0 && latestEchelon.rows[0].id_echelon) {
                await pool.query(
                    'UPDATE agents SET id_echelon = $1 WHERE id = $2',
                    [latestEchelon.rows[0].id_echelon, id_agent]
                );
            } else {
                // Si aucun échelon restant, mettre à null
                await pool.query('UPDATE agents SET id_echelon = NULL WHERE id = $1', [id_agent]);
            }

            res.json({
                success: true,
                message: 'Échelon supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de l\'échelon:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de l\'échelon',
                error: error.message
            });
        }
    }
}

module.exports = new EchelonsAgentsController();

