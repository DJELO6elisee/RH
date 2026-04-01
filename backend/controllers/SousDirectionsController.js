const db = require('../config/database');
const { validationResult } = require('express-validator');

class SousDirectionsController {
    // Helper pour récupérer le ministère de l'utilisateur
    static async getUserMinistereId(req) {
        try {
            // Si l'utilisateur est super_admin, retourner null (pas de filtrage)
            if (req.user && req.user.role && req.user.role.toLowerCase() === 'super_admin') {
                return null;
            }

            // Récupérer le ministère depuis l'agent de l'utilisateur
            if (req.user && req.user.id_agent) {
                const userQuery = await db.query(
                    'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                );
                if (userQuery.rows.length > 0 && userQuery.rows[0].id_ministere) {
                    return userQuery.rows[0].id_ministere;
                }
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
            return null;
        }
    }

    // Récupérer toutes les sous-directions
    static async getAllSousDirections(req, res) {
        try {
            const { id_ministere, id_entite, direction_id, is_active, page = 1, limit = 10 } = req.query;

            // Récupérer le ministère de l'utilisateur si non spécifié et si l'utilisateur n'est pas super_admin
            let finalMinistereId = id_ministere;
            if (!finalMinistereId) {
                finalMinistereId = await SousDirectionsController.getUserMinistereId(req);
                if (finalMinistereId) {
                    console.log(`🔍 SousDirectionsController - Filtrage automatique par ministère ${finalMinistereId} pour utilisateur non-super_admin`);
                }
            }

            let query = `
                SELECT 
                    sd.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    e.nom as entite_nom,
                    d.libelle as direction_nom,
                    a.prenom as sous_directeur_prenom,
                    a.nom as sous_directeur_nom,
                    a.matricule as sous_directeur_matricule
                FROM sous_directions sd
                LEFT JOIN ministeres m ON sd.id_ministere = m.id
                LEFT JOIN entites_administratives e ON sd.id_entite = e.id
                LEFT JOIN directions d ON sd.id_direction = d.id
                LEFT JOIN agents a ON sd.sous_directeur_id = a.id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (finalMinistereId) {
                query += ` AND sd.id_ministere = $${paramIndex}`;
                params.push(finalMinistereId);
                paramIndex++;
            }

            if (id_entite) {
                query += ` AND sd.id_entite = $${paramIndex}`;
                params.push(id_entite);
                paramIndex++;
            }

            if (direction_id) {
                query += ` AND sd.id_direction = $${paramIndex}`;
                params.push(direction_id);
                paramIndex++;
            }

            if (is_active !== undefined) {
                query += ` AND sd.is_active = $${paramIndex}`;
                params.push(is_active === 'true');
                paramIndex++;
            }

            query += ` ORDER BY sd.libelle ASC`;

            // Pagination
            const offset = (page - 1) * limit;
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            // Compter le total pour la pagination
            let countQuery = `
                SELECT COUNT(*) as total
                FROM sous_directions sd
                WHERE 1=1
            `;
            const countParams = [];
            let countParamIndex = 1;

            if (finalMinistereId) {
                countQuery += ` AND sd.id_ministere = $${countParamIndex}`;
                countParams.push(finalMinistereId);
                countParamIndex++;
            }

            if (id_entite) {
                countQuery += ` AND sd.id_entite = $${countParamIndex}`;
                countParams.push(id_entite);
                countParamIndex++;
            }

            if (is_active !== undefined) {
                countQuery += ` AND sd.is_active = $${countParamIndex}`;
                countParams.push(is_active === 'true');
                countParamIndex++;
            }

            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des sous-directions:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer une sous-direction par ID
    static async getSousDirectionById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    sd.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    e.nom as entite_nom,
                    d.libelle as direction_nom,
                    a.prenom as sous_directeur_prenom,
                    a.nom as sous_directeur_nom,
                    a.matricule as sous_directeur_matricule
                FROM sous_directions sd
                LEFT JOIN ministeres m ON sd.id_ministere = m.id
                LEFT JOIN entites_administratives e ON sd.id_entite = e.id
                LEFT JOIN directions d ON sd.id_direction = d.id
                LEFT JOIN agents a ON sd.sous_directeur_id = a.id
                WHERE sd.id = $1
            `;

            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Sous-direction non trouvée'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la sous-direction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Créer une nouvelle sous-direction
    static async createSousDirection(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const {
                id_ministere,
                id_entite,
                direction_id: directionIdBody,
                libelle,
                sous_directeur_id,
                description
            } = req.body;
            // Accepter direction_id ou id_direction (frontend)
            const direction_id = directionIdBody ? directionIdBody : req.body.id_direction;

            // Vérifier que le ministère existe
            const ministereQuery = 'SELECT id FROM ministeres WHERE id = $1';
            const ministereResult = await db.query(ministereQuery, [id_ministere]);

            if (ministereResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Ministère non trouvé'
                });
            }

            // Vérifier que l'entité existe si fournie
            if (id_entite) {
                const entiteQuery = 'SELECT id FROM entites_administratives WHERE id = $1';
                const entiteResult = await db.query(entiteQuery, [id_entite]);

                if (entiteResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Entité administrative non trouvée'
                    });
                }
            }

            // Vérifier que la direction existe si fournie
            if (direction_id) {
                const directionQuery = 'SELECT id FROM directions WHERE id = $1';
                const directionResult = await db.query(directionQuery, [direction_id]);

                if (directionResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Direction non trouvée'
                    });
                }
            }

            // Vérifier que le sous-directeur existe si fourni
            if (sous_directeur_id) {
                const sousDirecteurQuery = 'SELECT id FROM agents WHERE id = $1';
                const sousDirecteurResult = await db.query(sousDirecteurQuery, [sous_directeur_id]);

                if (sousDirecteurResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Sous-directeur non trouvé'
                    });
                }
            }

            // Vérifier l'unicité du libellé dans le ministère
            const uniqueQuery = `
                SELECT id FROM sous_directions 
                WHERE libelle = $1 AND id_ministere = $2
            `;
            const uniqueResult = await db.query(uniqueQuery, [libelle, id_ministere]);

            if (uniqueResult.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Une sous-direction avec ce libellé existe déjà dans ce ministère'
                });
            }

            // Insérer la sous-direction (is_active = true par défaut)
            const insertQuery = `
                INSERT INTO sous_directions (
                    id_ministere, id_entite, id_direction, libelle, sous_directeur_id, description, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, true)
                RETURNING *
            `;

            const result = await db.query(insertQuery, [
                id_ministere, id_entite, direction_id, libelle, sous_directeur_id, description
            ]);

            res.status(201).json({
                success: true,
                message: 'Sous-direction créée avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création de la sous-direction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Mettre à jour une sous-direction
    static async updateSousDirection(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const { id } = req.params;
            const {
                id_ministere,
                id_entite,
                direction_id: directionIdBody,
                libelle,
                sous_directeur_id,
                description,
                is_active
            } = req.body;
            // Accepter direction_id ou id_direction (frontend)
            const direction_id = directionIdBody ? directionIdBody : req.body.id_direction;

            // Vérifier que la sous-direction existe
            const sousDirectionQuery = 'SELECT id FROM sous_directions WHERE id = $1';
            const sousDirectionResult = await db.query(sousDirectionQuery, [id]);

            if (sousDirectionResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Sous-direction non trouvée'
                });
            }

            // Vérifier que le ministère existe si fourni
            if (id_ministere) {
                const ministereQuery = 'SELECT id FROM ministeres WHERE id = $1';
                const ministereResult = await db.query(ministereQuery, [id_ministere]);

                if (ministereResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Ministère non trouvé'
                    });
                }
            }

            // Vérifier que l'entité existe si fournie
            if (id_entite) {
                const entiteQuery = 'SELECT id FROM entites_administratives WHERE id = $1';
                const entiteResult = await db.query(entiteQuery, [id_entite]);

                if (entiteResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Entité administrative non trouvée'
                    });
                }
            }

            // Vérifier que la direction existe si fournie
            if (direction_id) {
                const directionQuery = 'SELECT id FROM directions WHERE id = $1';
                const directionResult = await db.query(directionQuery, [direction_id]);

                if (directionResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Direction non trouvée'
                    });
                }
            }

            // Vérifier que le sous-directeur existe si fourni
            if (sous_directeur_id) {
                const sousDirecteurQuery = 'SELECT id FROM agents WHERE id = $1';
                const sousDirecteurResult = await db.query(sousDirecteurQuery, [sous_directeur_id]);

                if (sousDirecteurResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Sous-directeur non trouvé'
                    });
                }
            }

            // Vérifier l'unicité du libellé dans le ministère (sauf pour la sous-direction actuelle)
            if (libelle) {
                const uniqueQuery = `
                    SELECT id FROM sous_directions 
                    WHERE libelle = $1 AND id_ministere = $2 AND id != $3
                `;
                const uniqueResult = await db.query(uniqueQuery, [libelle, id_ministere, id]);

                if (uniqueResult.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Une sous-direction avec ce libellé existe déjà dans ce ministère'
                    });
                }
            }

            // Construire la requête de mise à jour dynamiquement
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            if (id_ministere !== undefined) {
                updateFields.push(`id_ministere = $${paramIndex}`);
                updateValues.push(id_ministere);
                paramIndex++;
            }

            if (id_entite !== undefined) {
                updateFields.push(`id_entite = $${paramIndex}`);
                updateValues.push(id_entite);
                paramIndex++;
            }

            if (direction_id !== undefined) {
                updateFields.push(`id_direction = $${paramIndex}`);
                updateValues.push(direction_id);
                paramIndex++;
            }

            if (libelle !== undefined) {
                updateFields.push(`libelle = $${paramIndex}`);
                updateValues.push(libelle);
                paramIndex++;
            }

            if (sous_directeur_id !== undefined) {
                updateFields.push(`sous_directeur_id = $${paramIndex}`);
                updateValues.push(sous_directeur_id);
                paramIndex++;
            }

            if (description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                updateValues.push(description);
                paramIndex++;
            }

            if (is_active !== undefined) {
                updateFields.push(`is_active = $${paramIndex}`);
                updateValues.push(is_active);
                paramIndex++;
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(id);

            const updateQuery = `
                UPDATE sous_directions 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await db.query(updateQuery, updateValues);

            res.json({
                success: true,
                message: 'Sous-direction mise à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de la sous-direction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Supprimer une sous-direction
    static async deleteSousDirection(req, res) {
        try {
            const { id } = req.params;

            // Vérifier que la sous-direction existe
            const sousDirectionQuery = 'SELECT id FROM sous_directions WHERE id = $1';
            const sousDirectionResult = await db.query(sousDirectionQuery, [id]);

            if (sousDirectionResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Sous-direction non trouvée'
                });
            }

            // Vérifier s'il y a des agents associés à cette sous-direction
            const agentsQuery = 'SELECT COUNT(*) as count FROM agents WHERE id_sous_direction = $1';
            const agentsResult = await db.query(agentsQuery, [id]);

            if (parseInt(agentsResult.rows[0].count) > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossible de supprimer cette sous-direction car elle est associée à des agents'
                });
            }

            // Supprimer la sous-direction
            const deleteQuery = 'DELETE FROM sous_directions WHERE id = $1';
            await db.query(deleteQuery, [id]);

            res.json({
                success: true,
                message: 'Sous-direction supprimée avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de la sous-direction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les agents d'une sous-direction
    static async getSousDirectionAgents(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            // Récupérer le ministère de l'utilisateur (sauf si super_admin)
            const userMinistereId = await SousDirectionsController.getUserMinistereId(req);
            const isSuperAdmin = req.user && req.user.role && req.user.role.toLowerCase() === 'super_admin';

            // Vérifier que la sous-direction existe et récupérer son ministère
            const sousDirectionQuery = 'SELECT id, libelle, id_ministere FROM sous_directions WHERE id = $1';
            const sousDirectionResult = await db.query(sousDirectionQuery, [id]);

            if (sousDirectionResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Sous-direction non trouvée'
                });
            }

            const sousDirection = sousDirectionResult.rows[0];

            // Vérifier que l'utilisateur a accès à cette sous-direction (même ministère, sauf super_admin)
            if (!isSuperAdmin && userMinistereId && sousDirection.id_ministere !== userMinistereId) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette sous-direction'
                });
            }

            // Construire la requête avec filtrage par ministère si nécessaire
            let agentsQuery = `
                SELECT 
                    a.id,
                    a.prenom,
                    a.nom,
                    a.matricule,
                    a.email,
                    a.telephone1,
                    a.statut_emploi,
                    a.date_embauche,
                    d.libelle as direction_nom,
                    s.libelle as service_nom,
                    m.nom as ministere_nom
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN services s ON a.id_service = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id_sous_direction = $1
            `;

            let countQuery = 'SELECT COUNT(*) as total FROM agents WHERE id_sous_direction = $1';
            const queryParams = [id];
            let paramIndex = 2;

            // Ajouter le filtre par ministère si nécessaire
            if (!isSuperAdmin && userMinistereId) {
                agentsQuery += ` AND a.id_ministere = $${paramIndex}`;
                countQuery += ` AND id_ministere = $${paramIndex}`;
                queryParams.push(userMinistereId);
                paramIndex++;
            }

            agentsQuery += ` ORDER BY a.prenom, a.nom LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            const offset = (page - 1) * limit;
            queryParams.push(limit, offset);

            const agentsResult = await db.query(agentsQuery, queryParams);

            // Compter le total avec le même filtre
            const countParams = queryParams.slice(0, paramIndex - 1); // Exclure limit et offset
            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: {
                    sous_direction: sousDirection,
                    agents: agentsResult.rows
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des agents de la sous-direction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Statistiques des sous-directions
    static async getSousDirectionsStats(req, res) {
        try {
            const { id_ministere } = req.query;

            let whereClause = '';
            const params = [];

            if (id_ministere) {
                whereClause = 'WHERE sd.id_ministere = $1';
                params.push(id_ministere);
            }

            const statsQuery = `
                SELECT 
                    COUNT(*) as total_sous_directions,
                    COUNT(CASE WHEN sd.is_active = true THEN 1 END) as sous_directions_actives,
                    COUNT(CASE WHEN sd.is_active = false THEN 1 END) as sous_directions_inactives,
                    COUNT(CASE WHEN sd.sous_directeur_id IS NOT NULL THEN 1 END) as sous_directions_avec_directeur,
                    COUNT(CASE WHEN sd.id_entite IS NOT NULL THEN 1 END) as sous_directions_avec_entite,
                    AVG(agent_counts.agent_count) as moyenne_agents_par_sous_direction
                FROM sous_directions sd
                LEFT JOIN (
                    SELECT id_sous_direction, COUNT(*) as agent_count
                    FROM agents
                    WHERE id_sous_direction IS NOT NULL
                    GROUP BY id_sous_direction
                ) agent_counts ON sd.id = agent_counts.id_sous_direction
                ${whereClause}
            `;

            const result = await db.query(statsQuery, params);

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Obtenir toutes les sous-directions sans pagination (pour les listes déroulantes)
    static async getAllForSelect(req, res) {
        try {
            const { id_ministere, id_entite, direction_id, is_active } = req.query;

            // Récupérer le ministère de l'utilisateur si non spécifié et si l'utilisateur n'est pas super_admin
            let finalMinistereId = id_ministere;
            if (!finalMinistereId) {
                finalMinistereId = await SousDirectionsController.getUserMinistereId(req);
                if (finalMinistereId) {
                    console.log(`🔍 SousDirectionsController.getAllForSelect - Filtrage automatique par ministère ${finalMinistereId} pour utilisateur non-super_admin`);
                }
            }

            let query = `
                SELECT 
                    sd.id,
                    sd.libelle
                FROM sous_directions sd
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (finalMinistereId) {
                query += ` AND sd.id_ministere = $${paramIndex}`;
                params.push(finalMinistereId);
                paramIndex++;
            }

            if (id_entite) {
                query += ` AND sd.id_entite = $${paramIndex}`;
                params.push(id_entite);
                paramIndex++;
            }

            if (direction_id) {
                query += ` AND sd.id_direction = $${paramIndex}`;
                params.push(direction_id);
                paramIndex++;
            }

            if (is_active !== undefined) {
                query += ` AND sd.is_active = $${paramIndex}`;
                params.push(is_active === 'true');
                paramIndex++;
            }

            query += ` ORDER BY sd.libelle ASC`;

            const result = await db.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des sous-directions pour select:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = SousDirectionsController;