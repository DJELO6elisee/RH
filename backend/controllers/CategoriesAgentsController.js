const pool = require('../config/database');

class CategoriesAgentsController {
    // Récupérer toutes les catégories des agents avec informations complètes
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

            // Requête pour récupérer tous les agents du ministère avec leurs catégories
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
                    COALESCE(categories_counts.nb_categories, 0) as nb_categories,
                    categories_counts.derniere_categorie_date,
                    categories_counts.derniere_categorie_nom,
                    categories_counts.derniere_categorie_libele as categorie_actuelle,
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
                        ca.id_agent,
                        COUNT(ca.id) as nb_categories,
                        MAX(COALESCE(ca.date_entree, ca.created_at)) as derniere_categorie_date,
                        -- Dernière catégorie (la plus récente par date)
                        (
                            SELECT c2.libele
                            FROM categories_agents ca2
                            LEFT JOIN categories c2 ON ca2.id_categorie = c2.id
                            WHERE ca2.id_agent = ca.id_agent
                            ORDER BY COALESCE(ca2.date_entree, ca2.created_at) DESC
                            LIMIT 1
                        ) as derniere_categorie_nom,
                        (
                            SELECT c2.libele
                            FROM categories_agents ca2
                            LEFT JOIN categories c2 ON ca2.id_categorie = c2.id
                            WHERE ca2.id_agent = ca.id_agent
                            ORDER BY COALESCE(ca2.date_entree, ca2.created_at) DESC
                            LIMIT 1
                        ) as derniere_categorie_libele
                    FROM categories_agents ca
                    GROUP BY ca.id_agent
                ) categories_counts ON a.id = categories_counts.id_agent
                ${whereClause}
                ORDER BY a.nom, a.prenom
                LIMIT $${limitParam} OFFSET $${offsetParam}
            `;

            // Requête pour compter le total
            const countQuery = `
                SELECT COUNT(DISTINCT a.id) as total
                FROM agents a
                ${whereClause}
            `;

            const [result, countResult] = await Promise.all([
                pool.query(query, [...queryParams, limit, offset]),
                pool.query(countQuery, queryParams)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des catégories des agents:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer les catégories d'un agent spécifique
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
                                message: 'Accès refusé: vous n\'avez pas accès aux catégories de cet agent'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            const query = `
                SELECT 
                    ca.*,
                    c.libele as categorie_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM categories_agents ca
                LEFT JOIN categories c ON ca.id_categorie = c.id
                LEFT JOIN nominations n ON ca.id_nomination = n.id
                WHERE ca.id_agent = $1
                ORDER BY COALESCE(ca.date_entree, ca.created_at) DESC
            `;

            const result = await pool.query(query, [agentId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des catégories de l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des catégories de l\'agent',
                error: error.message
            });
        }
    }

    // Créer une nouvelle catégorie pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_categorie, date_entree, nature, numero, date_signature } = req.body;

            // Validation : seulement id_categorie est obligatoire
            if (!id_categorie) {
                return res.status(400).json({
                    success: false,
                    message: 'La catégorie est obligatoire'
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
                                message: 'Accès refusé: vous ne pouvez pas créer une catégorie pour un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier que la catégorie existe
            const categorieQuery = await pool.query('SELECT id FROM categories WHERE id = $1', [id_categorie]);
            if (categorieQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Catégorie non trouvée'
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

            // Récupérer l'ancienne catégorie active (sans date_sortie) pour mettre à jour sa date_sortie
            const ancienneCategorieQuery = `
                SELECT id, created_at
                FROM categories_agents
                WHERE id_agent = $1 
                    AND date_sortie IS NULL
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const ancienneCategorie = await pool.query(ancienneCategorieQuery, [id_agent]);
            
            // Date de création de la nouvelle catégorie (sera utilisée comme date_sortie de l'ancienne)
            const dateCreationNouveau = new Date();

            // Créer l'entrée dans categories_agents (sans date_sortie)
            const categorieAgentQuery = `
                INSERT INTO categories_agents (id_agent, id_nomination, id_categorie, date_entree)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await pool.query(categorieAgentQuery, [id_agent, id_nomination, id_categorie, date_entree || null]);

            // Mettre à jour la date_sortie de l'ancienne catégorie avec la date de création de la nouvelle
            if (ancienneCategorie.rows.length > 0 && ancienneCategorie.rows[0].id !== result.rows[0].id) {
                await pool.query(
                    'UPDATE categories_agents SET date_sortie = $1 WHERE id = $2',
                    [dateCreationNouveau, ancienneCategorie.rows[0].id]
                );
                console.log(`✅ Date de sortie mise à jour pour l'ancienne catégorie ID: ${ancienneCategorie.rows[0].id}`);
            }

            // Mettre à jour la catégorie actuelle de l'agent
            const latestCategorieQuery = `
                SELECT id_categorie, date_entree
                FROM categories_agents
                WHERE id_agent = $1
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const latestCategorie = await pool.query(latestCategorieQuery, [id_agent]);
            if (latestCategorie.rows.length > 0 && latestCategorie.rows[0].id_categorie) {
                await pool.query(
                    'UPDATE agents SET id_categorie = $1 WHERE id = $2',
                    [latestCategorie.rows[0].id_categorie, id_agent]
                );
            }

            res.status(201).json({
                success: true,
                message: 'Catégorie attribuée avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de l\'attribution de la catégorie:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'attribution de la catégorie',
                error: error.message
            });
        }
    }

    // Récupérer une catégorie spécifique
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    ca.*,
                    c.libele as categorie_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM categories_agents ca
                LEFT JOIN categories c ON ca.id_categorie = c.id
                LEFT JOIN nominations n ON ca.id_nomination = n.id
                WHERE ca.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Catégorie non trouvée'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la catégorie:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la catégorie',
                error: error.message
            });
        }
    }

    // Mettre à jour une catégorie
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_categorie, date_entree, nature, numero, date_signature } = req.body;
            // Note: date_sortie n'est pas modifiable via update, elle est gérée automatiquement lors de la création d'une nouvelle catégorie

            // Vérifier que la catégorie existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT ca.*, a.id_ministere as agent_ministere_id FROM categories_agents ca JOIN agents a ON ca.id_agent = a.id WHERE ca.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Catégorie non trouvée'
                });
            }

            const categorieAgent = existingQuery.rows[0];
            const agentMinistereId = categorieAgent.agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas modifier une catégorie d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Mettre à jour la nomination si fournie
            if (categorieAgent.id_nomination && (nature || numero || date_signature)) {
                const nominationQuery = `
                    UPDATE nominations 
                    SET nature = COALESCE($1, nature), 
                        numero = COALESCE($2, numero), 
                        date_signature = COALESCE($3, date_signature), 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                `;
                await pool.query(nominationQuery, [nature || null, numero || null, date_signature || null, categorieAgent.id_nomination]);
            } else if (!categorieAgent.id_nomination && nature && numero && date_signature) {
                // Créer une nouvelle nomination
                const nominationQuery = `
                    INSERT INTO nominations (id_agent, type_nomination, nature, numero, date_signature, statut)
                    VALUES ($1, 'fonction', $2, $3, $4, 'active')
                    RETURNING id
                `;
                const nominationResult = await pool.query(nominationQuery, [categorieAgent.id_agent, nature, numero, date_signature]);
                categorieAgent.id_nomination = nominationResult.rows[0].id;
            }

            // Mettre à jour la categorie_agent
            // Note: date_sortie n'est pas modifiable via update, elle est gérée automatiquement lors de la création d'une nouvelle catégorie
            const updateQuery = `
                UPDATE categories_agents 
                SET id_categorie = COALESCE($1, id_categorie), 
                    date_entree = COALESCE($2, date_entree), 
                    id_nomination = COALESCE($3, id_nomination),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [id_categorie || null, date_entree || null, categorieAgent.id_nomination || null, id]);

            // Mettre à jour la catégorie actuelle de l'agent si nécessaire
            if (id_categorie) {
                const latestCategorieQuery = `
                    SELECT id_categorie, date_entree
                    FROM categories_agents
                    WHERE id_agent = $1
                    ORDER BY COALESCE(date_entree, created_at) DESC
                    LIMIT 1
                `;
                const latestCategorie = await pool.query(latestCategorieQuery, [categorieAgent.id_agent]);
                if (latestCategorie.rows.length > 0 && latestCategorie.rows[0].id_categorie) {
                    await pool.query(
                        'UPDATE agents SET id_categorie = $1 WHERE id = $2',
                        [latestCategorie.rows[0].id_categorie, categorieAgent.id_agent]
                    );
                }
            }

            res.json({
                success: true,
                message: 'Catégorie modifiée avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la modification de la catégorie:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la modification de la catégorie',
                error: error.message
            });
        }
    }

    // Supprimer une catégorie
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Vérifier que la catégorie existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT ca.*, a.id_ministere as agent_ministere_id FROM categories_agents ca JOIN agents a ON ca.id_agent = a.id WHERE ca.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Catégorie non trouvée'
                });
            }

            const categorieAgent = existingQuery.rows[0];
            const agentMinistereId = categorieAgent.agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas supprimer une catégorie d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Supprimer la catégorie
            await pool.query('DELETE FROM categories_agents WHERE id = $1', [id]);

            // Mettre à jour la catégorie actuelle de l'agent si nécessaire
            const latestCategorieQuery = `
                SELECT id_categorie, date_entree
                FROM categories_agents
                WHERE id_agent = $1
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const latestCategorie = await pool.query(latestCategorieQuery, [categorieAgent.id_agent]);
            if (latestCategorie.rows.length > 0 && latestCategorie.rows[0].id_categorie) {
                await pool.query(
                    'UPDATE agents SET id_categorie = $1 WHERE id = $2',
                    [latestCategorie.rows[0].id_categorie, categorieAgent.id_agent]
                );
            } else {
                // Si plus de catégorie, mettre à NULL
                await pool.query(
                    'UPDATE agents SET id_categorie = NULL WHERE id = $1',
                    [categorieAgent.id_agent]
                );
            }

            res.json({
                success: true,
                message: 'Catégorie supprimée avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de la catégorie:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de la catégorie',
                error: error.message
            });
        }
    }
}

module.exports = new CategoriesAgentsController();

