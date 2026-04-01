const pool = require('../config/database');

class EmploiAgentsController {
    // Récupérer tous les emplois des agents avec informations complètes
    async getAllWithAgentInfo(req, res) {
        try {
            const { page = 1, limit = 10, search = '', ministere_id, id_ministere, id_direction, id_sous_direction } = req.query;
            const offset = (page - 1) * limit;
            const isSuperAdmin = req.user && req.user.role && String(req.user.role).toLowerCase() === 'super_admin';

            // Déterminer le ministère à utiliser pour le filtrage
            let ministereId = id_ministere || ministere_id ? parseInt(id_ministere || ministere_id) : null;

            if (!ministereId && !isSuperAdmin) {
                // Priorité 2: Ministère de l'utilisateur connecté (non super_admin)
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

            // Construire la clause WHERE et les paramètres
            const whereConditions = [];
            const queryParams = [];

            // Exclure les agents à la retraite et les agents retirés
            whereConditions.push(`(a.statut_emploi IS NULL OR LOWER(a.statut_emploi) != 'retraite')`);
            whereConditions.push(`(a.retire IS NULL OR a.retire = false)`);

            // Filtrer par ministère (obligatoire sauf pour super_admin qui peut voir tous les ministères)
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

            // Requête pour récupérer tous les agents du ministère avec leurs emplois
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
                    COALESCE(emplois_counts.nb_emplois, 0) as nb_emplois,
                    emplois_counts.dernier_emploi_date,
                    emplois_counts.dernier_emploi_nom,
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
                        ea.id_agent,
                        COUNT(ea.id) as nb_emplois,
                        MAX(COALESCE(ea.date_entree, ea.created_at)) as dernier_emploi_date,
                        -- Dernier emploi (le plus récent par date)
                        (
                            SELECT COALESCE(e2.libele, ea2.designation_poste, 'N/A')
                            FROM emploi_agents ea2
                            LEFT JOIN emplois e2 ON ea2.id_emploi = e2.id
                            WHERE ea2.id_agent = ea.id_agent
                            ORDER BY COALESCE(ea2.date_entree, ea2.created_at) DESC
                            LIMIT 1
                        ) as dernier_emploi_nom
                    FROM emploi_agents ea
                    GROUP BY ea.id_agent
                ) emplois_counts ON a.id = emplois_counts.id_agent
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
                LEFT JOIN emploi_agents ea ON a.id = ea.id_agent
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

    // Récupérer les emplois d'un agent spécifique
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
                                message: 'Accès refusé: vous n\'avez pas accès aux emplois de cet agent'
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
                    COALESCE(emp.libele, ea.designation_poste, 'N/A') as emploi_libele,
                    emp.libele as emploi_nom,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM emploi_agents ea
                LEFT JOIN emplois emp ON ea.id_emploi = emp.id
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
            console.error('Erreur lors de la récupération des emplois de l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des emplois de l\'agent',
                error: error.message
            });
        }
    }

    // Créer un nouvel emploi pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_emploi, date_entree, designation_poste, nature, numero, date_signature, date_premiere_prise_service } = req.body;

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
                                message: 'Accès refusé: vous ne pouvez pas créer un emploi pour un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier que l'emploi existe
            if (id_emploi) {
                const emploiQuery = await pool.query('SELECT id FROM emplois WHERE id = $1', [id_emploi]);
                if (emploiQuery.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Emploi non trouvé'
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
                    VALUES ($1, 'emploi', $2, $3, $4, 'active')
                    RETURNING id
                `;
                const nominationResult = await pool.query(nominationQuery, [id_agent, nature, numero, date_signature]);
                id_nomination = nominationResult.rows[0].id;
                console.log(`📋 Nouvelle nomination créée avec ID: ${id_nomination}`);
            }

            // Créer l'entrée dans emploi_agents
            const emploiAgentQuery = `
                INSERT INTO emploi_agents (id_agent, id_nomination, id_emploi, date_entree, designation_poste)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const result = await pool.query(emploiAgentQuery, [id_agent, id_nomination, id_emploi, date_entree, designation_poste]);

            res.status(201).json({
                success: true,
                message: 'Emploi ajouté avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de l\'ajout de l\'emploi:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'ajout de l\'emploi',
                error: error.message
            });
        }
    }

    // Récupérer un emploi spécifique
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    ea.*,
                    emp.libele as emploi_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM emploi_agents ea
                LEFT JOIN emplois emp ON ea.id_emploi = emp.id
                LEFT JOIN nominations n ON ea.id_nomination = n.id
                WHERE ea.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Emploi non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'emploi:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de l\'emploi',
                error: error.message
            });
        }
    }

    // Mettre à jour un emploi
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_emploi, date_entree, designation_poste, nature, numero, date_signature } = req.body;

            // Vérifier que l'emploi existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT ea.*, a.id_ministere as agent_ministere_id FROM emploi_agents ea JOIN agents a ON ea.id_agent = a.id WHERE ea.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Emploi non trouvé'
                });
            }

            const emploiAgent = existingQuery.rows[0];
            const agentMinistereId = emploiAgent.agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas modifier un emploi d\'un agent d\'un autre ministère'
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
            await pool.query(nominationQuery, [nature, numero, date_signature, emploiAgent.id_nomination]);

            // Mettre à jour l'emploi_agent
            const updateQuery = `
                UPDATE emploi_agents 
                SET id_emploi = $1, date_entree = $2, designation_poste = $3, updated_at = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [id_emploi, date_entree, designation_poste, id]);

            res.json({
                success: true,
                message: 'Emploi mis à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'emploi:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour de l\'emploi',
                error: error.message
            });
        }
    }

    // Supprimer un emploi
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'ID de la nomination et le ministère de l'agent
            const emploiQuery = await pool.query(
                'SELECT ea.id_nomination, a.id_ministere as agent_ministere_id FROM emploi_agents ea JOIN agents a ON ea.id_agent = a.id WHERE ea.id = $1', 
                [id]
            );
            if (emploiQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Emploi non trouvé'
                });
            }

            const id_nomination = emploiQuery.rows[0].id_nomination;
            const agentMinistereId = emploiQuery.rows[0].agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas supprimer un emploi d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Supprimer l'emploi_agent (cascade supprimera aussi la nomination)
            await pool.query('DELETE FROM emploi_agents WHERE id = $1', [id]);

            res.json({
                success: true,
                message: 'Emploi supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de l\'emploi:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de l\'emploi',
                error: error.message
            });
        }
    }
}

module.exports = new EmploiAgentsController();