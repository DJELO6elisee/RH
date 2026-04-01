const db = require('../config/database');
const { validationResult } = require('express-validator');

class ServicesController {
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

    // Récupérer tous les services
    static async getAllServices(req, res) {
        try {
            let { id_ministere, id_entite, direction_id, sous_direction_id, type_service, is_active, page = 1, limit = 10 } = req.query;

            // Récupérer le ministère de l'utilisateur si non spécifié et si l'utilisateur n'est pas super_admin
            let finalMinistereId = id_ministere;
            if (!finalMinistereId) {
                finalMinistereId = await ServicesController.getUserMinistereId(req);
                if (finalMinistereId) {
                    console.log(`🔍 ServicesController - Filtrage automatique par ministère ${finalMinistereId} pour utilisateur non-super_admin`);
                }
            }

            // Si l'utilisateur a des privilèges de gestion, filtrer automatiquement par sa direction/sous-direction
            if (req.user && req.user.id_agent && !direction_id && !sous_direction_id) {
                const userRole = req.user.role ? req.user.role.toLowerCase() : '';
                const managementRoles = ['directeur', 'sous_directeur', 'sous-directeur', 'directeur_central', 'directeur_general', 'chef_cabinet', 'dir_cabinet'];
                if (managementRoles.includes(userRole)) {
                    const agentQuery = 'SELECT id_direction, id_sous_direction FROM agents WHERE id = $1';
                    const agentResult = await db.query(agentQuery, [req.user.id_agent]);
                    if (agentResult.rows.length > 0) {
                        const agent = agentResult.rows[0];
                        // Pour les directeurs et rôles similaires
                        if ((userRole === 'directeur' || userRole === 'directeur_central' || userRole === 'directeur_general' ||
                                userRole === 'chef_cabinet' || userRole === 'dir_cabinet') && agent.id_direction) {
                            direction_id = agent.id_direction;
                            console.log(`🔍 ServicesController - Filtrage automatique par direction ${direction_id} pour ${userRole}`);
                        } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && agent.id_sous_direction) {
                            sous_direction_id = agent.id_sous_direction;
                            if (agent.id_direction) {
                                direction_id = agent.id_direction;
                            }
                            console.log(`🔍 ServicesController - Filtrage automatique par sous-direction ${sous_direction_id} pour sous-directeur`);
                        }
                    }
                }
            }

            let query = `
                SELECT 
                    s.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    e.nom as entite_nom,
                    d.libelle as direction_nom,
                    sd.libelle as sous_direction_nom,
                    a.prenom as responsable_prenom,
                    a.nom as responsable_nom,
                    a.matricule as responsable_matricule,
                    CONCAT(a.prenom, ' ', a.nom) as responsable_nom_complet
                FROM services s
                LEFT JOIN ministeres m ON s.id_ministere = m.id
                LEFT JOIN entites_administratives e ON s.id_entite = e.id
                LEFT JOIN directions d ON s.id_direction = d.id
                LEFT JOIN sous_directions sd ON s.id_sous_direction = sd.id
                LEFT JOIN agents a ON s.responsable_id = a.id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (finalMinistereId) {
                query += ` AND s.id_ministere = $${paramIndex}`;
                params.push(finalMinistereId);
                paramIndex++;
            }

            if (id_entite) {
                query += ` AND s.id_entite = $${paramIndex}`;
                params.push(id_entite);
                paramIndex++;
            }

            if (direction_id) {
                // Inclure les services spécifiques à cette direction ET les services génériques
                query += ` AND (s.id_direction = $${paramIndex} OR (s.id_direction IS NULL AND s.type_service = 'direction'))`;
                params.push(direction_id);
                paramIndex++;
            }

            if (sous_direction_id) {
                query += ` AND s.id_sous_direction = $${paramIndex}`;
                params.push(sous_direction_id);
                paramIndex++;
            }

            if (type_service) {
                query += ` AND s.type_service = $${paramIndex}`;
                params.push(type_service);
                paramIndex++;
            }

            if (is_active !== undefined) {
                query += ` AND s.is_active = $${paramIndex}`;
                params.push(is_active === 'true');
                paramIndex++;
            }

            query += ` ORDER BY s.libelle ASC`;

            // Pagination
            const offset = (page - 1) * limit;
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            // Compter le total pour la pagination
            let countQuery = `
                SELECT COUNT(*) as total
                FROM services s
                WHERE 1=1
            `;
            const countParams = [];
            let countParamIndex = 1;

            if (finalMinistereId) {
                countQuery += ` AND s.id_ministere = $${countParamIndex}`;
                countParams.push(finalMinistereId);
                countParamIndex++;
            }

            if (id_entite) {
                countQuery += ` AND s.id_entite = $${countParamIndex}`;
                countParams.push(id_entite);
                countParamIndex++;
            }

            if (direction_id) {
                // Inclure les services spécifiques à cette direction ET les services génériques
                countQuery += ` AND (s.id_direction = $${countParamIndex} OR (s.id_direction IS NULL AND s.type_service = 'direction'))`;
                countParams.push(direction_id);
                countParamIndex++;
            }

            if (sous_direction_id) {
                countQuery += ` AND s.id_sous_direction = $${countParamIndex}`;
                countParams.push(sous_direction_id);
                countParamIndex++;
            }

            if (type_service) {
                countQuery += ` AND s.type_service = $${countParamIndex}`;
                countParams.push(type_service);
                countParamIndex++;
            }

            if (is_active !== undefined) {
                countQuery += ` AND s.is_active = $${countParamIndex}`;
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
            console.error('Erreur lors de la récupération des services:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer un service par ID
    static async getServiceById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    s.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    e.nom as entite_nom,
                    d.libelle as direction_nom,
                    sd.libelle as sous_direction_nom,
                    a.prenom as responsable_prenom,
                    a.nom as responsable_nom,
                    a.matricule as responsable_matricule,
                    CONCAT(a.prenom, ' ', a.nom) as responsable_nom_complet
                FROM services s
                LEFT JOIN ministeres m ON s.id_ministere = m.id
                LEFT JOIN entites_administratives e ON s.id_entite = e.id
                LEFT JOIN directions d ON s.id_direction = d.id
                LEFT JOIN sous_directions sd ON s.id_sous_direction = sd.id
                LEFT JOIN agents a ON s.responsable_id = a.id
                WHERE s.id = $1
            `;

            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Service non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Créer un nouveau service
    static async createService(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            let {
                id_ministere,
                id_entite,
                libelle,
                responsable_id,
                description,
                type_service,
                direction_id,
                sous_direction_id,
                id_direction, // Alternative
                id_sous_direction, // Alternative
                is_active
            } = req.body;

            // Gérer les alternatives de noms de champs
            if (!direction_id && id_direction) {
                direction_id = id_direction;
            }
            if (!sous_direction_id && id_sous_direction) {
                sous_direction_id = id_sous_direction;
            }

            // Si id_ministere n'est pas fourni, récupérer le ministère de l'utilisateur connecté
            if (!id_ministere && req.user) {
                console.log('🔍 SERVICE - Récupération du ministère de l\'utilisateur connecté');

                // Essayer d'abord depuis l'organisation de l'utilisateur
                if (req.user.organization && req.user.organization.type === 'ministere') {
                    id_ministere = req.user.organization.id;
                    console.log('✅ SERVICE - Ministère récupéré depuis organisation:', id_ministere);
                } else if (req.user.id_agent) {
                    // Sinon, récupérer depuis l'agent
                    const agentQuery = 'SELECT id_ministere, id_direction, id_sous_direction FROM agents WHERE id = $1';
                    const agentResult = await db.query(agentQuery, [req.user.id_agent]);
                    if (agentResult.rows.length > 0) {
                        id_ministere = agentResult.rows[0].id_ministere;
                        console.log('✅ SERVICE - Ministère récupéré depuis agent:', id_ministere);

                        // Si l'utilisateur a des privilèges de gestion, récupérer automatiquement sa direction/sous-direction
                        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
                        if (!direction_id && !sous_direction_id) {
                            // Pour les directeurs et rôles similaires
                            if ((userRole === 'directeur' || userRole === 'directeur_central' || userRole === 'directeur_general' ||
                                    userRole === 'chef_cabinet' || userRole === 'dir_cabinet') && agentResult.rows[0].id_direction) {
                                direction_id = agentResult.rows[0].id_direction;
                                console.log('✅ SERVICE - Direction automatiquement rattachée:', direction_id);
                            } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && agentResult.rows[0].id_sous_direction) {
                                sous_direction_id = agentResult.rows[0].id_sous_direction;
                                if (agentResult.rows[0].id_direction) {
                                    direction_id = agentResult.rows[0].id_direction;
                                }
                                console.log('✅ SERVICE - Sous-direction automatiquement rattachée:', sous_direction_id);
                            }
                        }
                    }
                }
            }

            // Vérifier que le ministère est fourni
            if (!id_ministere) {
                return res.status(400).json({
                    success: false,
                    error: 'L\'ID du ministère est requis'
                });
            }

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

            // Vérifier que le responsable existe si fourni
            if (responsable_id) {
                const responsableQuery = 'SELECT id FROM agents WHERE id = $1';
                const responsableResult = await db.query(responsableQuery, [responsable_id]);

                if (responsableResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Responsable non trouvé'
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

            // Vérifier que la sous-direction existe si fournie
            if (sous_direction_id) {
                const sousDirectionQuery = 'SELECT id FROM sous_directions WHERE id = $1';
                const sousDirectionResult = await db.query(sousDirectionQuery, [sous_direction_id]);

                if (sousDirectionResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Sous-direction non trouvée'
                    });
                }
            }

            // Validation du type de service
            if (type_service && !['direction', 'sous_direction'].includes(type_service)) {
                return res.status(400).json({
                    success: false,
                    error: 'Type de service invalide. Doit être "direction" ou "sous_direction"'
                });
            }

            // Validation logique : si type_service est "sous_direction", direction_id est requis
            if (type_service === 'sous_direction' && !direction_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Une direction est requise pour un service de sous-direction'
                });
            }

            // Vérifier l'unicité du libellé dans le ministère
            const uniqueQuery = `
                SELECT id FROM services 
                WHERE libelle = $1 AND id_ministere = $2
            `;
            const uniqueResult = await db.query(uniqueQuery, [libelle, id_ministere]);

            if (uniqueResult.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Un service avec ce libellé existe déjà dans ce ministère'
                });
            }

            // Fonction helper pour convertir les chaînes vides en null
            const toNullIfEmpty = (value) => {
                if (value === '' || value === undefined || value === null) {
                    return null;
                }
                return value;
            };

            // Insérer le service
            const insertQuery = `
                INSERT INTO services (
                    id_ministere, id_entite, libelle, responsable_id, description,
                    type_service, id_direction, id_sous_direction, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const result = await db.query(insertQuery, [
                id_ministere,
                toNullIfEmpty(id_entite),
                libelle,
                toNullIfEmpty(responsable_id),
                toNullIfEmpty(description),
                toNullIfEmpty(type_service) || 'direction',
                toNullIfEmpty(direction_id),
                toNullIfEmpty(sous_direction_id),
                is_active !== undefined ? is_active : true
            ]);

            res.status(201).json({
                success: true,
                message: 'Service créé avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création du service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Mettre à jour un service
    static async updateService(req, res) {
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
                libelle,
                responsable_id,
                description,
                type_service,
                direction_id,
                sous_direction_id,
                id_direction, // Alternative
                id_sous_direction, // Alternative
                is_active
            } = req.body;

            // Gérer les alternatives de noms de champs
            if (!direction_id && id_direction) {
                direction_id = id_direction;
            }
            if (!sous_direction_id && id_sous_direction) {
                sous_direction_id = id_sous_direction;
            }

            // Vérifier que le service existe
            const serviceQuery = 'SELECT id FROM services WHERE id = $1';
            const serviceResult = await db.query(serviceQuery, [id]);

            if (serviceResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Service non trouvé'
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

            // Vérifier que le responsable existe si fourni
            if (responsable_id) {
                const responsableQuery = 'SELECT id FROM agents WHERE id = $1';
                const responsableResult = await db.query(responsableQuery, [responsable_id]);

                if (responsableResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Responsable non trouvé'
                    });
                }
            }

            // Vérifier l'unicité du libellé dans le ministère (sauf pour le service actuel)
            if (libelle) {
                const uniqueQuery = `
                    SELECT id FROM services 
                    WHERE libelle = $1 AND id_ministere = $2 AND id != $3
                `;
                const uniqueResult = await db.query(uniqueQuery, [libelle, id_ministere, id]);

                if (uniqueResult.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Un service avec ce libellé existe déjà dans ce ministère'
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

            // Vérifier que la sous-direction existe si fournie
            if (sous_direction_id) {
                const sousDirectionQuery = 'SELECT id FROM sous_directions WHERE id = $1';
                const sousDirectionResult = await db.query(sousDirectionQuery, [sous_direction_id]);

                if (sousDirectionResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Sous-direction non trouvée'
                    });
                }
            }

            // Validation du type de service
            if (type_service && !['direction', 'sous_direction'].includes(type_service)) {
                return res.status(400).json({
                    success: false,
                    error: 'Type de service invalide. Doit être "direction" ou "sous_direction"'
                });
            }

            // Validation logique : si type_service est "sous_direction", direction_id est requis
            if (type_service === 'sous_direction' && !direction_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Une direction est requise pour un service de sous-direction'
                });
            }

            // Fonction helper pour convertir les chaînes vides en null
            const toNullIfEmpty = (value) => {
                if (value === '' || value === undefined || value === null) {
                    return null;
                }
                return value;
            };

            // Construire la requête de mise à jour dynamiquement
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            if (id_ministere !== undefined) {
                updateFields.push(`id_ministere = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(id_ministere));
                paramIndex++;
            }

            if (id_entite !== undefined) {
                updateFields.push(`id_entite = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(id_entite));
                paramIndex++;
            }

            if (libelle !== undefined) {
                updateFields.push(`libelle = $${paramIndex}`);
                updateValues.push(libelle);
                paramIndex++;
            }

            if (responsable_id !== undefined) {
                updateFields.push(`responsable_id = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(responsable_id));
                paramIndex++;
            }

            if (description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(description));
                paramIndex++;
            }

            if (is_active !== undefined) {
                updateFields.push(`is_active = $${paramIndex}`);
                updateValues.push(is_active);
                paramIndex++;
            }

            if (type_service !== undefined) {
                updateFields.push(`type_service = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(type_service));
                paramIndex++;
            }

            if (direction_id !== undefined) {
                updateFields.push(`id_direction = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(direction_id));
                paramIndex++;
            }

            if (sous_direction_id !== undefined) {
                updateFields.push(`id_sous_direction = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(sous_direction_id));
                paramIndex++;
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(id);

            const updateQuery = `
                UPDATE services 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            const result = await db.query(updateQuery, updateValues);

            res.json({
                success: true,
                message: 'Service mis à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour du service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Supprimer un service
    static async deleteService(req, res) {
        try {
            const { id } = req.params;

            // Vérifier que le service existe
            const serviceQuery = 'SELECT id FROM services WHERE id = $1';
            const serviceResult = await db.query(serviceQuery, [id]);

            if (serviceResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Service non trouvé'
                });
            }

            // Vérifier s'il y a des agents associés à ce service
            const agentsQuery = 'SELECT COUNT(*) as count FROM agents WHERE id_service = $1';
            const agentsResult = await db.query(agentsQuery, [id]);

            if (parseInt(agentsResult.rows[0].count) > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Impossible de supprimer ce service car il est associé à des agents'
                });
            }

            // Supprimer le service
            const deleteQuery = 'DELETE FROM services WHERE id = $1';
            await db.query(deleteQuery, [id]);

            res.json({
                success: true,
                message: 'Service supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les agents d'un service
    static async getServiceAgents(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 10 } = req.query;

            // Vérifier que le service existe
            const serviceQuery = 'SELECT id, libelle FROM services WHERE id = $1';
            const serviceResult = await db.query(serviceQuery, [id]);

            if (serviceResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Service non trouvé'
                });
            }

            const service = serviceResult.rows[0];

            // Récupérer les agents du service
            const agentsQuery = `
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
                    sd.libelle as sous_direction_nom,
                    m.nom as ministere_nom
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN sous_directions sd ON a.id_sous_direction = sd.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id_service = $1
                ORDER BY a.prenom, a.nom
                LIMIT $2 OFFSET $3
            `;

            const offset = (page - 1) * limit;
            const agentsResult = await db.query(agentsQuery, [id, limit, offset]);

            // Compter le total
            const countQuery = 'SELECT COUNT(*) as total FROM agents WHERE id_service = $1';
            const countResult = await db.query(countQuery, [id]);
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: {
                    service: service,
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
            console.error('Erreur lors de la récupération des agents du service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Statistiques des services
    static async getServicesStats(req, res) {
        try {
            const { id_ministere } = req.query;

            let whereClause = '';
            const params = [];

            if (id_ministere) {
                whereClause = 'WHERE s.id_ministere = $1';
                params.push(id_ministere);
            }

            const statsQuery = `
                SELECT 
                    COUNT(*) as total_services,
                    COUNT(CASE WHEN s.is_active = true THEN 1 END) as services_actifs,
                    COUNT(CASE WHEN s.is_active = false THEN 1 END) as services_inactifs,
                    COUNT(CASE WHEN s.responsable_id IS NOT NULL THEN 1 END) as services_avec_responsable,
                    COUNT(CASE WHEN s.id_entite IS NOT NULL THEN 1 END) as services_avec_entite,
                    AVG(agent_counts.agent_count) as moyenne_agents_par_service
                FROM services s
                LEFT JOIN (
                    SELECT id_service, COUNT(*) as agent_count
                    FROM agents
                    WHERE id_service IS NOT NULL
                    GROUP BY id_service
                ) agent_counts ON s.id = agent_counts.id_service
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

    // Obtenir tous les services sans pagination (pour les listes déroulantes)
    static async getAllForSelect(req, res) {
        try {
            const { id_ministere, id_entite, direction_id, sous_direction_id, type_service, is_active } = req.query;

            // Récupérer le ministère de l'utilisateur si non spécifié et si l'utilisateur n'est pas super_admin
            let finalMinistereId = id_ministere;
            if (!finalMinistereId) {
                finalMinistereId = await ServicesController.getUserMinistereId(req);
                if (finalMinistereId) {
                    console.log(`🔍 ServicesController.getAllForSelect - Filtrage automatique par ministère ${finalMinistereId} pour utilisateur non-super_admin`);
                }
            }

            let query = `
                SELECT 
                    s.id,
                    s.libelle
                FROM services s
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (finalMinistereId) {
                query += ` AND s.id_ministere = $${paramIndex}`;
                params.push(finalMinistereId);
                paramIndex++;
            }

            if (id_entite) {
                query += ` AND s.id_entite = $${paramIndex}`;
                params.push(id_entite);
                paramIndex++;
            }

            if (direction_id) {
                // Inclure les services spécifiques à cette direction ET les services génériques
                query += ` AND (s.id_direction = $${paramIndex} OR (s.id_direction IS NULL AND s.type_service = 'direction'))`;
                params.push(direction_id);
                paramIndex++;
            }

            if (sous_direction_id) {
                query += ` AND s.id_sous_direction = $${paramIndex}`;
                params.push(sous_direction_id);
                paramIndex++;
            }

            if (type_service) {
                query += ` AND s.type_service = $${paramIndex}`;
                params.push(type_service);
                paramIndex++;
            }

            if (is_active !== undefined) {
                query += ` AND s.is_active = $${paramIndex}`;
                params.push(is_active === 'true');
                paramIndex++;
            }

            query += ` ORDER BY s.libelle ASC`;

            const result = await db.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des services pour select:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = ServicesController;