const pool = require('../config/database');

class FonctionAgentsController {
    // Récupérer toutes les fonctions des agents avec informations complètes
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

            // Requête pour récupérer tous les agents du ministère avec leurs fonctions
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
                    g.libele as grade_actuel,
                    COALESCE(fonctions_counts.nb_fonctions, 0) as nb_fonctions,
                    fonctions_counts.derniere_fonction_date,
                    fonctions_counts.derniere_fonction_nom,
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
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN (
                    SELECT 
                        fa.id_agent,
                        COUNT(fa.id) as nb_fonctions,
                        MAX(COALESCE(fa.date_entree, fa.created_at)) as derniere_fonction_date,
                        -- Dernière fonction (la plus récente par date)
                        (
                            SELECT COALESCE(f2.libele, fa2.designation_poste, 'N/A')
                            FROM fonction_agents fa2
                            LEFT JOIN fonctions f2 ON fa2.id_fonction = f2.id
                            WHERE fa2.id_agent = fa.id_agent
                            ORDER BY COALESCE(fa2.date_entree, fa2.created_at) DESC
                            LIMIT 1
                        ) as derniere_fonction_nom
                    FROM fonction_agents fa
                    GROUP BY fa.id_agent
                ) fonctions_counts ON a.id = fonctions_counts.id_agent
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
                LEFT JOIN fonction_agents fa ON a.id = fa.id_agent
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

    // Récupérer les fonctions d'un agent spécifique
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
                                message: 'Accès refusé: vous n\'avez pas accès aux fonctions de cet agent'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            const query = `
                SELECT 
                    fa.*,
                    COALESCE(f.libele, fa.designation_poste, 'N/A') as fonction_libele,
                    f.libele as fonction_nom,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM fonction_agents fa
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                LEFT JOIN nominations n ON fa.id_nomination = n.id
                WHERE fa.id_agent = $1
                ORDER BY COALESCE(fa.date_entree, fa.created_at) DESC
            `;

            const result = await pool.query(query, [agentId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des fonctions de l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des fonctions de l\'agent',
                error: error.message
            });
        }
    }

    // Créer une nouvelle fonction pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_fonction, date_entree, designation_poste, nature, numero, date_signature } = req.body;

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
                                message: 'Accès refusé: vous ne pouvez pas créer une fonction pour un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier que la fonction existe
            if (id_fonction) {
                const fonctionQuery = await pool.query('SELECT id FROM fonctions WHERE id = $1', [id_fonction]);
                if (fonctionQuery.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Fonction non trouvée'
                    });
                }
            }

            // Vérifier si le numéro existe déjà
            const existingNominationQuery = `
                SELECT id FROM nominations WHERE numero = $1
            `;
            const existingNomination = await pool.query(existingNominationQuery, [numero]);

            let id_nomination;

            if (existingNomination.rows.length > 0) {
                // Utiliser la nomination existante
                id_nomination = existingNomination.rows[0].id;
                console.log(`📋 Utilisation de la nomination existante avec ID: ${id_nomination}`);
            } else {
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

            // Créer l'entrée dans fonction_agents
            const fonctionAgentQuery = `
                INSERT INTO fonction_agents (id_agent, id_nomination, id_fonction, date_entree, designation_poste)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const result = await pool.query(fonctionAgentQuery, [id_agent, id_nomination, id_fonction, date_entree, designation_poste]);

            res.status(201).json({
                success: true,
                message: 'Fonction attribuée avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de l\'attribution de la fonction:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'attribution de la fonction',
                error: error.message
            });
        }
    }

    // Récupérer une fonction spécifique
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    fa.*,
                    f.libele as fonction_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM fonction_agents fa
                LEFT JOIN fonctions f ON fa.id_fonction = f.id
                LEFT JOIN nominations n ON fa.id_nomination = n.id
                WHERE fa.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fonction non trouvée'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la fonction:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la fonction',
                error: error.message
            });
        }
    }

    // Mettre à jour une fonction
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_fonction, date_entree, designation_poste, nature, numero, date_signature } = req.body;

            // Vérifier que la fonction existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT fa.*, a.id_ministere as agent_ministere_id FROM fonction_agents fa JOIN agents a ON fa.id_agent = a.id WHERE fa.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fonction non trouvée'
                });
            }

            const fonctionAgent = existingQuery.rows[0];
            const agentMinistereId = fonctionAgent.agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas modifier une fonction d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Mettre à jour la nomination
            const nominationQuery = `
                UPDATE nominations 
                SET nature = $1, numero = $2, date_signature = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
            `;
            await pool.query(nominationQuery, [nature, numero, date_signature, fonctionAgent.id_nomination]);

            // Mettre à jour la fonction_agent
            const updateQuery = `
                UPDATE fonction_agents 
                SET id_fonction = $1, date_entree = $2, designation_poste = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [id_fonction, date_entree, designation_poste, id]);

            res.json({
                success: true,
                message: 'Fonction mise à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de la fonction:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de la fonction',
                error: error.message
            });
        }
    }

    // Supprimer une fonction
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'ID de la nomination et le ministère de l'agent
            const fonctionQuery = await pool.query(
                'SELECT fa.id_nomination, a.id_ministere as agent_ministere_id FROM fonction_agents fa JOIN agents a ON fa.id_agent = a.id WHERE fa.id = $1', 
                [id]
            );
            if (fonctionQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Fonction non trouvée'
                });
            }

            const id_nomination = fonctionQuery.rows[0].id_nomination;
            const agentMinistereId = fonctionQuery.rows[0].agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas supprimer une fonction d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Supprimer la fonction_agent (cascade supprimera aussi la nomination)
            await pool.query('DELETE FROM fonction_agents WHERE id = $1', [id]);

            res.json({
                success: true,
                message: 'Fonction supprimée avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de la fonction:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de la fonction',
                error: error.message
            });
        }
    }
}

module.exports = new FonctionAgentsController();