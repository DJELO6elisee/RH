const BaseController = require('./BaseController');
const pool = require('../config/database');

class ServicesEntitesController extends BaseController {
    constructor() {
        super('services_entites');
    }

    // Surcharger getAll pour gérer le filtrage par entité
    async getAll(req, res) {
        try {
            const { page = 1, limit = 20, search = '', is_active = 'true', id_entite } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            // Filtre par entité si spécifié
            if (id_entite) {
                whereClause += ` AND se.id_entite = $${paramIndex}`;
                queryParams.push(id_entite);
                paramIndex++;
            }

            // Filtre par statut actif
            if (is_active !== 'all') {
                whereClause += ` AND se.is_active = $${paramIndex}`;
                queryParams.push(is_active === 'true');
                paramIndex++;
            }

            // Recherche textuelle
            if (search) {
                whereClause += ` AND (se.libelle ILIKE $${paramIndex} OR se.description ILIKE $${paramIndex} OR CONCAT(a.nom, ' ', a.prenom) ILIKE $${paramIndex})`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_entites se
                LEFT JOIN entites_administratives ea ON se.id_entite = ea.id
                LEFT JOIN agents a ON se.responsable_id = a.id
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    se.*,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    ea.type_entite,
                    CONCAT(a.nom, ' ', a.prenom) as responsable_nom
                FROM services_entites se
                LEFT JOIN entites_administratives ea ON se.id_entite = ea.id
                LEFT JOIN agents a ON se.responsable_id = a.id
                ${whereClause}
                ORDER BY se.created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                pool.query(countQuery, queryParams.slice(0, -2)),
                pool.query(dataQuery, queryParams)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: dataResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des services:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des services',
                error: error.message
            });
        }
    }

    // Récupérer tous les services d'une entité
    async getByEntite(req, res) {
        try {
            const { id_entite } = req.params;
            const { page = 1, limit = 20, search = '', is_active = true } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE se.id_entite = $1';
            const queryParams = [id_entite];
            let paramIndex = 2;

            // Filtre par statut actif
            if (is_active !== 'all') {
                whereClause += ` AND se.is_active = $${paramIndex}`;
                queryParams.push(is_active === 'true');
                paramIndex++;
            }

            // Recherche textuelle
            if (search) {
                whereClause += ` AND (se.libelle ILIKE $${paramIndex} OR se.description ILIKE $${paramIndex})`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_entites se
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    se.*,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    ea.type_entite,
                    m.nom as nom_ministere,
                    m.sigle as sigle_ministere
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                ${whereClause}
                ORDER BY se.libelle
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                pool.query(countQuery, queryParams.slice(0, -2)),
                pool.query(dataQuery, queryParams)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: dataResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des services par entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des services',
                error: error.message
            });
        }
    }

    // Récupérer tous les services d'un ministère
    async getByMinistere(req, res) {
        try {
            const { id_ministere } = req.params;
            const { page = 1, limit = 20, search = '', is_active = true } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE ea.id_ministere = $1';
            const queryParams = [id_ministere];
            let paramIndex = 2;

            // Filtre par statut actif
            if (is_active !== 'all') {
                whereClause += ` AND se.is_active = $${paramIndex}`;
                queryParams.push(is_active === 'true');
                paramIndex++;
            }

            // Recherche textuelle
            if (search) {
                whereClause += ` AND (se.libelle ILIKE $${paramIndex} OR se.description ILIKE $${paramIndex} OR ea.nom ILIKE $${paramIndex})`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    se.*,
                    ea.id as id_entite,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    ea.type_entite,
                    ea.niveau_hierarchique,
                    m.nom as nom_ministere,
                    m.sigle as sigle_ministere
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                ${whereClause}
                ORDER BY ea.niveau_hierarchique, ea.nom, se.libelle
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                pool.query(countQuery, queryParams.slice(0, -2)),
                pool.query(dataQuery, queryParams)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: dataResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des services par ministère:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des services',
                error: error.message
            });
        }
    }

    // Récupérer un service avec ses détails complets
    async getByIdWithDetails(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    se.*,
                    ea.id as id_entite,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    ea.type_entite,
                    ea.niveau_hierarchique,
                    ea.adresse as adresse_entite,
                    ea.telephone as telephone_entite,
                    ea.email as email_entite,
                    m.id as id_ministere,
                    m.nom as nom_ministere,
                    m.sigle as sigle_ministere,
                    m.adresse as adresse_ministere,
                    m.telephone as telephone_ministere,
                    m.email as email_ministere,
                    COUNT(DISTINCT td.id) as nombre_types_documents
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                LEFT JOIN type_de_documents td ON td.id_service_entite = se.id
                WHERE se.id = $1
                GROUP BY se.id, ea.id, m.id
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Service non trouvé'
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
                message: 'Erreur lors de la récupération du service',
                error: error.message
            });
        }
    }

    // Créer un nouveau service
    async create(req, res) {
        try {
            const { libelle, description, responsable_id, is_active = true } = req.body;
            const userId = req.user ? req.user.id : null;

            // Validation des données
            if (!libelle) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom du service est obligatoire'
                });
            }

            // Récupérer l'entité de l'utilisateur connecté
            let id_entite;
            if (req.user && req.user.role === 'super_admin') {
                // Pour le super admin, on peut spécifier l'entité dans le body
                id_entite = req.body.id_entite;
                if (!id_entite) {
                    return res.status(400).json({
                        success: false,
                        message: 'L\'entité doit être spécifiée pour le super admin'
                    });
                }
            } else {
                // Pour les autres utilisateurs, récupérer l'entité depuis leur profil
                const userEntiteQuery = `
                    SELECT a.id_entite_principale 
                    FROM utilisateurs u 
                    JOIN agents a ON u.id_agent = a.id 
                    WHERE u.id = $1
                `;
                const userEntiteResult = await pool.query(userEntiteQuery, [userId]);

                if (userEntiteResult.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Aucune entité associée à cet utilisateur'
                    });
                }

                id_entite = userEntiteResult.rows[0].id_entite_principale;
            }

            // Vérifier que l'entité existe
            const entiteCheck = await pool.query(
                'SELECT id FROM entites_administratives WHERE id = $1 AND is_active = true', [id_entite]
            );

            if (entiteCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'entité spécifiée n\'existe pas ou est inactive'
                });
            }

            // Vérifier l'unicité du libellé dans l'entité
            const existingService = await pool.query(
                'SELECT id FROM services_entites WHERE id_entite = $1 AND libelle = $2', [id_entite, libelle]
            );

            if (existingService.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Un service avec ce nom existe déjà dans cette entité'
                });
            }

            // Générer un code unique automatiquement
            const generateUniqueCode = async(baseCode, entiteId) => {
                let counter = 1;
                let newCode = baseCode;

                while (true) {
                    const existingCode = await pool.query(
                        'SELECT id FROM services_entites WHERE code = $1', [newCode]
                    );

                    if (existingCode.rows.length === 0) {
                        return newCode;
                    }

                    newCode = `${baseCode}_${counter}`;
                    counter++;
                }
            };

            // Créer un code de base à partir du libellé
            const baseCode = libelle
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .substring(0, 10) || 'SERV';

            const uniqueCode = await generateUniqueCode(baseCode, id_entite);

            // Créer le service
            const newService = await pool.query(
                `INSERT INTO services_entites 
                (id_entite, libelle, description, code, responsable_id, is_active, created_at, updated_at) 
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                RETURNING *`, [id_entite, libelle, description || null, uniqueCode, responsable_id || null, is_active]
            );

            res.status(201).json({
                success: true,
                message: 'Service créé avec succès',
                data: newService.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création du service:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création du service',
                error: error.message
            });
        }
    }

    // Mettre à jour un service
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libelle, description, responsable_id, is_active } = req.body;

            // Vérifier que le service existe
            const existingService = await pool.query(
                'SELECT * FROM services_entites WHERE id = $1', [id]
            );

            if (existingService.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Service non trouvé'
                });
            }

            const service = existingService.rows[0];

            // Vérifier l'unicité du libellé si modifié
            if (libelle && libelle !== service.libelle) {
                const duplicateCheck = await pool.query(
                    'SELECT id FROM services_entites WHERE id_entite = $1 AND libelle = $2 AND id != $3', [service.id_entite, libelle, id]
                );

                if (duplicateCheck.rows.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Un service avec ce nom existe déjà dans cette entité'
                    });
                }
            }

            // Mettre à jour le service
            const updatedService = await pool.query(
                `UPDATE services_entites 
                SET libelle = COALESCE($1, libelle),
                    description = COALESCE($2, description),
                    responsable_id = COALESCE($3, responsable_id),
                    is_active = COALESCE($4, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5 
                RETURNING *`, [libelle, description, responsable_id, is_active, id]
            );

            res.json({
                success: true,
                message: 'Service mis à jour avec succès',
                data: updatedService.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour du service:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du service',
                error: error.message
            });
        }
    }

    // Obtenir les statistiques des services
    async getStats(req, res) {
        try {
            const { id_ministere } = req.params;

            const statsQuery = `
                SELECT 
                    COUNT(*) as total_services,
                    COUNT(CASE WHEN se.is_active = true THEN 1 END) as services_actifs,
                    COUNT(CASE WHEN se.is_active = false THEN 1 END) as services_inactifs,
                    COUNT(DISTINCT se.id_entite) as entites_avec_services,
                    COUNT(DISTINCT ea.type_entite) as types_entites_concernes
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                WHERE ea.id_ministere = $1
            `;

            const result = await pool.query(statsQuery, [id_ministere]);

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des statistiques',
                error: error.message
            });
        }
    }

    // Rechercher des services par terme
    async searchByTerm(req, res) {
        try {
            const { term } = req.params;
            const { limit = 20 } = req.query;

            if (!term || term.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Le terme de recherche doit contenir au moins 2 caractères'
                });
            }

            const searchQuery = `
                SELECT 
                    se.*,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    ea.type_entite,
                    m.nom as nom_ministere,
                    m.sigle as sigle_ministere
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                WHERE se.is_active = true 
                AND (
                    se.libelle ILIKE $1 
                    OR se.description ILIKE $1 
                    OR ea.nom ILIKE $1 
                    OR ea.sigle ILIKE $1
                    OR m.nom ILIKE $1
                    OR m.sigle ILIKE $1
                )
                ORDER BY se.libelle
                LIMIT $2
            `;

            const result = await pool.query(searchQuery, [`%${term}%`, parseInt(limit)]);

            res.json({
                success: true,
                data: result.rows,
                total: result.rows.length
            });

        } catch (error) {
            console.error('Erreur lors de la recherche des services:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la recherche des services',
                error: error.message
            });
        }
    }

    // Récupérer tous les services pour les listes de sélection
    async getAllForSelect(req, res) {
        try {
            const { id_ministere, id_entite } = req.query;

            let whereClause = 'WHERE se.is_active = true';
            const queryParams = [];
            let paramIndex = 1;

            if (id_ministere) {
                whereClause += ` AND ea.id_ministere = $${paramIndex}`;
                queryParams.push(id_ministere);
                paramIndex++;
            }

            if (id_entite) {
                whereClause += ` AND se.id_entite = $${paramIndex}`;
                queryParams.push(id_entite);
                paramIndex++;
            }

            const selectQuery = `
                SELECT 
                    se.id,
                    se.libelle,
                    se.code,
                    se.id_entite,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    m.nom as nom_ministere,
                    m.sigle as sigle_ministere
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                ${whereClause}
                ORDER BY ea.nom, se.libelle
            `;

            const result = await pool.query(selectQuery, queryParams);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des services pour sélection:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des services',
                error: error.message
            });
        }
    }

    // Recherche avancée de services
    async searchAdvanced(req, res) {
        try {
            const {
                search = '',
                    id_ministere,
                    id_entite,
                    type_entite,
                    is_active = 'true',
                    page = 1,
                    limit = 20
            } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const queryParams = [];
            let paramIndex = 1;

            // Filtre par ministère
            if (id_ministere) {
                whereClause += ` AND ea.id_ministere = $${paramIndex}`;
                queryParams.push(id_ministere);
                paramIndex++;
            }

            // Filtre par entité
            if (id_entite) {
                whereClause += ` AND se.id_entite = $${paramIndex}`;
                queryParams.push(id_entite);
                paramIndex++;
            }

            // Filtre par type d'entité
            if (type_entite) {
                whereClause += ` AND ea.type_entite = $${paramIndex}`;
                queryParams.push(type_entite);
                paramIndex++;
            }

            // Filtre par statut actif
            if (is_active !== 'all') {
                whereClause += ` AND se.is_active = $${paramIndex}`;
                queryParams.push(is_active === 'true');
                paramIndex++;
            }

            // Recherche textuelle
            if (search) {
                whereClause += ` AND (
                    se.libelle ILIKE $${paramIndex} OR 
                    se.description ILIKE $${paramIndex} OR 
                    ea.nom ILIKE $${paramIndex} OR 
                    m.nom ILIKE $${paramIndex}
                )`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    se.*,
                    ea.id as id_entite,
                    ea.nom as nom_entite,
                    ea.sigle as sigle_entite,
                    ea.type_entite,
                    ea.niveau_hierarchique,
                    m.id as id_ministere,
                    m.nom as nom_ministere,
                    m.sigle as sigle_ministere
                FROM services_entites se
                JOIN entites_administratives ea ON se.id_entite = ea.id
                JOIN ministeres m ON ea.id_ministere = m.id
                ${whereClause}
                ORDER BY ea.niveau_hierarchique, ea.nom, se.libelle
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                pool.query(countQuery, queryParams.slice(0, -2)),
                pool.query(dataQuery, queryParams)
            ]);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: dataResult.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                },
                filters: {
                    search,
                    id_ministere,
                    id_entite,
                    type_entite,
                    is_active
                }
            });

        } catch (error) {
            console.error('Erreur lors de la recherche avancée:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la recherche avancée',
                error: error.message
            });
        }
    }

    // Supprimer un service
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Vérifier que le service existe
            const existingService = await pool.query(
                'SELECT * FROM services_entites WHERE id = $1', [id]
            );

            if (existingService.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Service non trouvé'
                });
            }

            // Supprimer le service
            const result = await pool.query(
                'DELETE FROM services_entites WHERE id = $1 RETURNING *', [id]
            );

            res.json({
                success: true,
                message: 'Service supprimé avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du service:', error);

            if (error.code === '23503') { // Violation de contrainte de clé étrangère
                res.status(400).json({
                    success: false,
                    message: 'Impossible de supprimer ce service car il est référencé ailleurs'
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la suppression du service',
                    error: error.message
                });
            }
        }
    }

    // Supprimer plusieurs services
    async deleteMultiple(req, res) {
        try {
            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Liste d\'IDs invalide'
                });
            }

            const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
            const query = `DELETE FROM services_entites WHERE id IN (${placeholders}) RETURNING *`;

            const result = await pool.query(query, ids);

            res.json({
                success: true,
                message: `${result.rows.length} service(s) supprimé(s) avec succès`,
                deletedCount: result.rows.length,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la suppression multiple des services:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression multiple des services',
                error: error.message
            });
        }
    }
}

module.exports = new ServicesEntitesController();