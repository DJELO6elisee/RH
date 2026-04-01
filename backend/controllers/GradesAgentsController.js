const pool = require('../config/database');

class GradesAgentsController {
    // Récupérer tous les grades des agents avec informations complètes
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

            // Requête pour récupérer tous les agents du ministère avec leurs grades
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
                    COALESCE(grades_counts.nb_grades, 0) as nb_grades,
                    grades_counts.dernier_grade_date,
                    grades_counts.dernier_grade_nom,
                    grades_counts.dernier_grade_libele as grade_actuel,
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
                        ga.id_agent,
                        COUNT(ga.id) as nb_grades,
                        MAX(COALESCE(ga.date_entree, ga.created_at)) as dernier_grade_date,
                        -- Dernier grade (le plus récent par date)
                        (
                            SELECT g2.libele
                            FROM grades_agents ga2
                            LEFT JOIN grades g2 ON ga2.id_grade = g2.id
                            WHERE ga2.id_agent = ga.id_agent
                            ORDER BY COALESCE(ga2.date_entree, ga2.created_at) DESC
                            LIMIT 1
                        ) as dernier_grade_nom,
                        (
                            SELECT g2.libele
                            FROM grades_agents ga2
                            LEFT JOIN grades g2 ON ga2.id_grade = g2.id
                            WHERE ga2.id_agent = ga.id_agent
                            ORDER BY COALESCE(ga2.date_entree, ga2.created_at) DESC
                            LIMIT 1
                        ) as dernier_grade_libele
                    FROM grades_agents ga
                    GROUP BY ga.id_agent
                ) grades_counts ON a.id = grades_counts.id_agent
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
                LEFT JOIN grades_agents ga ON a.id = ga.id_agent
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

    // Récupérer les grades d'un agent spécifique
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
                                message: 'Accès refusé: vous n\'avez pas accès aux grades de cet agent'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            const query = `
                SELECT 
                    ga.*,
                    g.libele as grade_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM grades_agents ga
                LEFT JOIN grades g ON ga.id_grade = g.id
                LEFT JOIN nominations n ON ga.id_nomination = n.id
                WHERE ga.id_agent = $1
                ORDER BY COALESCE(ga.date_entree, ga.created_at) DESC
            `;

            const result = await pool.query(query, [agentId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des grades de l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des grades de l\'agent',
                error: error.message
            });
        }
    }

    // Créer un nouveau grade pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_grade, date_entree, nature, numero, date_signature } = req.body;

            // Validation : seulement id_grade est obligatoire
            if (!id_grade) {
                return res.status(400).json({
                    success: false,
                    message: 'Le grade est obligatoire'
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
                                message: 'Accès refusé: vous ne pouvez pas créer un grade pour un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier que le grade existe
            const gradeQuery = await pool.query('SELECT id FROM grades WHERE id = $1', [id_grade]);
            if (gradeQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Grade non trouvé'
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

            // Récupérer l'ancien grade actif (sans date_sortie) pour mettre à jour sa date_sortie
            const ancienGradeQuery = `
                SELECT id, created_at
                FROM grades_agents
                WHERE id_agent = $1 
                    AND date_sortie IS NULL
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const ancienGrade = await pool.query(ancienGradeQuery, [id_agent]);
            
            // Date de création du nouveau grade (sera utilisée comme date_sortie de l'ancien)
            const dateCreationNouveau = new Date();

            // Créer l'entrée dans grades_agents (sans date_sortie)
            const gradeAgentQuery = `
                INSERT INTO grades_agents (id_agent, id_nomination, id_grade, date_entree)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const result = await pool.query(gradeAgentQuery, [id_agent, id_nomination, id_grade, date_entree || null]);

            // Mettre à jour la date_sortie de l'ancien grade avec la date de création du nouveau
            if (ancienGrade.rows.length > 0 && ancienGrade.rows[0].id !== result.rows[0].id) {
                await pool.query(
                    'UPDATE grades_agents SET date_sortie = $1 WHERE id = $2',
                    [dateCreationNouveau, ancienGrade.rows[0].id]
                );
                console.log(`✅ Date de sortie mise à jour pour l'ancien grade ID: ${ancienGrade.rows[0].id}`);
            }

            // Mettre à jour le grade actuel de l'agent
            const latestGradeQuery = `
                SELECT id_grade, date_entree
                FROM grades_agents
                WHERE id_agent = $1
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const latestGrade = await pool.query(latestGradeQuery, [id_agent]);
            if (latestGrade.rows.length > 0 && latestGrade.rows[0].id_grade) {
                await pool.query(
                    'UPDATE agents SET id_grade = $1 WHERE id = $2',
                    [latestGrade.rows[0].id_grade, id_agent]
                );
            }

            // Vérifier si le grade a une catégorie associée et mettre à jour automatiquement la catégorie de l'agent
            try {
                // Récupérer la catégorie du grade (vérifier si la colonne id_categorie existe)
                // Note: Si la colonne n'existe pas, la requête échouera silencieusement et on continuera
                let nouvelleCategorieId = null;
                
                try {
                    const gradeCategorieQuery = `
                        SELECT g.id_categorie, c.id as categorie_id
                        FROM grades g
                        LEFT JOIN categories c ON g.id_categorie = c.id
                        WHERE g.id = $1
                    `;
                    const gradeCategorieResult = await pool.query(gradeCategorieQuery, [id_grade]);
                    
                    if (gradeCategorieResult.rows.length > 0 && gradeCategorieResult.rows[0].categorie_id) {
                        nouvelleCategorieId = gradeCategorieResult.rows[0].categorie_id;
                    }
                } catch (columnError) {
                    // La colonne id_categorie n'existe peut-être pas dans la table grades
                    // Dans ce cas, on ne peut pas déterminer automatiquement la catégorie depuis le grade
                    console.log('ℹ️ La colonne id_categorie n\'existe pas dans la table grades, mise à jour automatique de catégorie ignorée');
                }
                
                if (nouvelleCategorieId) {
                    
                    // Récupérer la catégorie actuelle de l'agent
                    const agentCategorieQuery = await pool.query(
                        'SELECT id_categorie FROM agents WHERE id = $1',
                        [id_agent]
                    );
                    const categorieActuelleId = agentCategorieQuery.rows[0]?.id_categorie;
                    
                    // Si la catégorie a changé, créer une nouvelle entrée dans categories_agents
                    if (categorieActuelleId !== nouvelleCategorieId) {
                        console.log(`🔄 Changement de catégorie détecté pour l'agent ${id_agent}: ${categorieActuelleId} -> ${nouvelleCategorieId}`);
                        
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
                        
                        // Créer l'entrée dans categories_agents avec la même nomination si disponible
                        const categorieAgentQuery = `
                            INSERT INTO categories_agents (id_agent, id_nomination, id_categorie, date_entree)
                            VALUES ($1, $2, $3, $4)
                            RETURNING *
                        `;
                        const categorieResult = await pool.query(
                            categorieAgentQuery,
                            [id_agent, id_nomination, nouvelleCategorieId, date_entree || null]
                        );
                        
                        // Mettre à jour la date_sortie de l'ancienne catégorie avec la date de création de la nouvelle
                        if (ancienneCategorie.rows.length > 0 && ancienneCategorie.rows[0].id !== categorieResult.rows[0].id) {
                            await pool.query(
                                'UPDATE categories_agents SET date_sortie = $1 WHERE id = $2',
                                [dateCreationNouveau, ancienneCategorie.rows[0].id]
                            );
                            console.log(`✅ Date de sortie mise à jour pour l'ancienne catégorie ID: ${ancienneCategorie.rows[0].id}`);
                        }
                        
                        // Mettre à jour la catégorie actuelle de l'agent
                        await pool.query(
                            'UPDATE agents SET id_categorie = $1 WHERE id = $2',
                            [nouvelleCategorieId, id_agent]
                        );
                        
                        console.log(`✅ Catégorie automatiquement mise à jour pour l'agent ${id_agent}: ${nouvelleCategorieId}`);
                    }
                }
            } catch (error) {
                // Ne pas faire échouer la création du grade si la mise à jour de la catégorie échoue
                console.error('⚠️ Erreur lors de la mise à jour automatique de la catégorie:', error);
            }

            res.status(201).json({
                success: true,
                message: 'Grade attribué avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de l\'attribution du grade:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'attribution du grade',
                error: error.message
            });
        }
    }

    // Récupérer un grade spécifique
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    ga.*,
                    g.libele as grade_libele,
                    n.nature,
                    n.numero,
                    n.date_signature,
                    n.type_nomination,
                    n.statut
                FROM grades_agents ga
                LEFT JOIN grades g ON ga.id_grade = g.id
                LEFT JOIN nominations n ON ga.id_nomination = n.id
                WHERE ga.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Grade non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du grade:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du grade',
                error: error.message
            });
        }
    }

    // Mettre à jour un grade
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_grade, date_entree, nature, numero, date_signature } = req.body;
            // Note: date_sortie n'est pas modifiable via update, elle est gérée automatiquement lors de la création d'un nouveau grade

            // Vérifier que le grade existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT ga.*, a.id_ministere as agent_ministere_id FROM grades_agents ga JOIN agents a ON ga.id_agent = a.id WHERE ga.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Grade non trouvé'
                });
            }

            const gradeAgent = existingQuery.rows[0];
            const agentMinistereId = gradeAgent.agent_ministere_id;

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
                                message: 'Accès refusé: vous ne pouvez pas modifier un grade d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Mettre à jour la nomination si fournie
            if (gradeAgent.id_nomination && (nature || numero || date_signature)) {
                const nominationQuery = `
                    UPDATE nominations 
                    SET nature = COALESCE($1, nature), 
                        numero = COALESCE($2, numero), 
                        date_signature = COALESCE($3, date_signature), 
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $4
                `;
                await pool.query(nominationQuery, [nature || null, numero || null, date_signature || null, gradeAgent.id_nomination]);
            }

            // Mettre à jour le grade_agent
            // Note: date_sortie n'est pas modifiable via update, elle est gérée automatiquement lors de la création d'un nouveau grade
            const updateQuery = `
                UPDATE grades_agents 
                SET id_grade = COALESCE($1, id_grade), 
                    date_entree = COALESCE($2, date_entree), 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;
            const result = await pool.query(updateQuery, [id_grade || null, date_entree || null, id]);

            // Mettre à jour le grade actuel de l'agent si nécessaire
            if (date_entree || id_grade) {
                const latestGradeQuery = `
                    SELECT id_grade, date_entree
                    FROM grades_agents
                    WHERE id_agent = $1
                    ORDER BY COALESCE(date_entree, created_at) DESC
                    LIMIT 1
                `;
                const latestGrade = await pool.query(latestGradeQuery, [gradeAgent.id_agent]);
                if (latestGrade.rows.length > 0 && latestGrade.rows[0].id_grade) {
                    await pool.query(
                        'UPDATE agents SET id_grade = $1 WHERE id = $2',
                        [latestGrade.rows[0].id_grade, gradeAgent.id_agent]
                    );
                }
            }

            res.json({
                success: true,
                message: 'Grade mis à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour du grade:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du grade',
                error: error.message
            });
        }
    }

    // Supprimer un grade
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'ID de la nomination et le ministère de l'agent
            const gradeQuery = await pool.query(
                'SELECT ga.id_nomination, ga.id_agent, a.id_ministere as agent_ministere_id FROM grades_agents ga JOIN agents a ON ga.id_agent = a.id WHERE ga.id = $1', 
                [id]
            );
            if (gradeQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Grade non trouvé'
                });
            }

            const id_nomination = gradeQuery.rows[0].id_nomination;
            const agentMinistereId = gradeQuery.rows[0].agent_ministere_id;
            const id_agent = gradeQuery.rows[0].id_agent;

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
                                message: 'Accès refusé: vous ne pouvez pas supprimer un grade d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Supprimer le grade_agent
            await pool.query('DELETE FROM grades_agents WHERE id = $1', [id]);

            // Mettre à jour le grade actuel de l'agent avec le grade le plus récent restant
            const latestGradeQuery = `
                SELECT id_grade, date_entree
                FROM grades_agents
                WHERE id_agent = $1
                ORDER BY COALESCE(date_entree, created_at) DESC
                LIMIT 1
            `;
            const latestGrade = await pool.query(latestGradeQuery, [id_agent]);
            if (latestGrade.rows.length > 0 && latestGrade.rows[0].id_grade) {
                await pool.query(
                    'UPDATE agents SET id_grade = $1 WHERE id = $2',
                    [latestGrade.rows[0].id_grade, id_agent]
                );
            } else {
                // Si aucun grade restant, mettre à null
                await pool.query('UPDATE agents SET id_grade = NULL WHERE id = $1', [id_agent]);
            }

            res.json({
                success: true,
                message: 'Grade supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du grade:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression du grade',
                error: error.message
            });
        }
    }
}

module.exports = new GradesAgentsController();

