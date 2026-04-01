const BaseController = require('./BaseController');
const pool = require('../config/database');

class ServicesInstitutionsController extends BaseController {
    constructor() {
        super('services_institutions');
        this.pool = pool;
    }

    // Récupérer tous les services d'une entité d'institution
    async getByEntite(req, res) {
        try {
            const { id_entite } = req.params;
            const { page = 1, limit = 20, search = '', is_active = true } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE si.id_entite = $1';
            const queryParams = [id_entite];
            let paramIndex = 2;

            // Filtre par statut actif
            if (is_active !== 'all') {
                whereClause += ` AND si.is_active = $${paramIndex}`;
                queryParams.push(is_active === 'true');
                paramIndex++;
            }

            // Recherche textuelle
            if (search) {
                whereClause += ` AND (si.libelle ILIKE $${paramIndex} OR si.description ILIKE $${paramIndex})`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_institutions si
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    si.*,
                    ei.nom as nom_entite,
                    ei.sigle as sigle_entite,
                    ei.type_entite,
                    i.nom as nom_institution,
                    i.sigle as sigle_institution
                FROM services_institutions si
                JOIN entites_institutions ei ON si.id_entite = ei.id
                JOIN institutions i ON ei.id_institution = i.id
                ${whereClause}
                ORDER BY si.libelle
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                this.pool.query(countQuery, queryParams.slice(0, -2)),
                this.pool.query(dataQuery, queryParams)
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

    // Récupérer tous les services d'une institution
    async getByInstitution(req, res) {
        try {
            const { id_institution } = req.params;
            const { page = 1, limit = 20, search = '', is_active = true } = req.query;

            const offset = (page - 1) * limit;
            let whereClause = 'WHERE ei.id_institution = $1';
            const queryParams = [id_institution];
            let paramIndex = 2;

            // Filtre par statut actif
            if (is_active !== 'all') {
                whereClause += ` AND si.is_active = $${paramIndex}`;
                queryParams.push(is_active === 'true');
                paramIndex++;
            }

            // Recherche textuelle
            if (search) {
                whereClause += ` AND (si.libelle ILIKE $${paramIndex} OR si.description ILIKE $${paramIndex} OR ei.nom ILIKE $${paramIndex})`;
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_institutions si
                JOIN entites_institutions ei ON si.id_entite = ei.id
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    si.*,
                    ei.id as id_entite,
                    ei.nom as nom_entite,
                    ei.sigle as sigle_entite,
                    ei.type_entite,
                    ei.niveau_hierarchique,
                    i.nom as nom_institution,
                    i.sigle as sigle_institution
                FROM services_institutions si
                JOIN entites_institutions ei ON si.id_entite = ei.id
                JOIN institutions i ON ei.id_institution = i.id
                ${whereClause}
                ORDER BY ei.niveau_hierarchique, ei.nom, si.libelle
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);

            const [countResult, dataResult] = await Promise.all([
                this.pool.query(countQuery, queryParams.slice(0, -2)),
                this.pool.query(dataQuery, queryParams)
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
            console.error('Erreur lors de la récupération des services par institution:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des services',
                error: error.message
            });
        }
    }

    // Créer un nouveau service d'institution
    async create(req, res) {
        try {
            const { id_entite, libelle, description, code, responsable_id } = req.body;

            // Validation des données
            if (!id_entite || !libelle) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'entité et le libellé sont obligatoires'
                });
            }

            // Vérifier que l'entité existe
            const entiteCheck = await this.pool.query(
                'SELECT id FROM entites_institutions WHERE id = $1 AND is_active = true', [id_entite]
            );

            if (entiteCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'entité spécifiée n\'existe pas ou est inactive'
                });
            }

            // Vérifier l'unicité du libellé dans l'entité
            const existingService = await this.pool.query(
                'SELECT id FROM services_institutions WHERE id_entite = $1 AND libelle = $2', [id_entite, libelle]
            );

            if (existingService.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Un service avec ce libellé existe déjà dans cette entité'
                });
            }

            // Créer le service
            const newService = await this.pool.query(
                `INSERT INTO services_institutions 
                (id_entite, libelle, description, code, responsable_id) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING *`, [id_entite, libelle, description, code, responsable_id]
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

    // Mettre à jour un service d'institution
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libelle, description, code, responsable_id, is_active } = req.body;

            // Vérifier que le service existe
            const existingService = await this.pool.query(
                'SELECT * FROM services_institutions WHERE id = $1', [id]
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
                const duplicateCheck = await this.pool.query(
                    'SELECT id FROM services_institutions WHERE id_entite = $1 AND libelle = $2 AND id != $3', [service.id_entite, libelle, id]
                );

                if (duplicateCheck.rows.length > 0) {
                    return res.status(409).json({
                        success: false,
                        message: 'Un service avec ce libellé existe déjà dans cette entité'
                    });
                }
            }

            // Mettre à jour le service
            const updatedService = await this.pool.query(
                `UPDATE services_institutions 
                SET libelle = COALESCE($1, libelle),
                    description = COALESCE($2, description),
                    code = COALESCE($3, code),
                    responsable_id = COALESCE($4, responsable_id),
                    is_active = COALESCE($5, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $6 
                RETURNING *`, [libelle, description, code, responsable_id, is_active, id]
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
                    si.*,
                    ei.nom as nom_entite,
                    ei.sigle as sigle_entite,
                    ei.type_entite,
                    i.nom as nom_institution,
                    i.sigle as sigle_institution
                FROM services_institutions si
                JOIN entites_institutions ei ON si.id_entite = ei.id
                JOIN institutions i ON ei.id_institution = i.id
                WHERE si.is_active = true 
                AND (
                    si.libelle ILIKE $1 
                    OR si.description ILIKE $1 
                    OR ei.nom ILIKE $1 
                    OR ei.sigle ILIKE $1
                    OR i.nom ILIKE $1
                    OR i.sigle ILIKE $1
                )
                ORDER BY si.libelle
                LIMIT $2
            `;

            const result = await this.pool.query(searchQuery, [`%${term}%`, parseInt(limit)]);

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
            const { id_institution, id_entite } = req.query;

            let whereClause = 'WHERE si.is_active = true';
            const queryParams = [];
            let paramIndex = 1;

            if (id_institution) {
                whereClause += ` AND ei.id_institution = $${paramIndex}`;
                queryParams.push(id_institution);
                paramIndex++;
            }

            if (id_entite) {
                whereClause += ` AND si.id_entite = $${paramIndex}`;
                queryParams.push(id_entite);
                paramIndex++;
            }

            const selectQuery = `
                SELECT 
                    si.id,
                    si.libelle,
                    si.code,
                    si.id_entite,
                    ei.nom as nom_entite,
                    ei.sigle as sigle_entite,
                    i.nom as nom_institution,
                    i.sigle as sigle_institution
                FROM services_institutions si
                JOIN entites_institutions ei ON si.id_entite = ei.id
                JOIN institutions i ON ei.id_institution = i.id
                ${whereClause}
                ORDER BY ei.nom, si.libelle
            `;

            const result = await this.pool.query(selectQuery, queryParams);

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

    // Obtenir les statistiques des services d'institutions
    async getStats(req, res) {
        try {
            const { id_institution } = req.params;

            const statsQuery = `
                SELECT 
                    COUNT(*) as total_services,
                    COUNT(CASE WHEN si.is_active = true THEN 1 END) as services_actifs,
                    COUNT(CASE WHEN si.is_active = false THEN 1 END) as services_inactifs,
                    COUNT(DISTINCT si.id_entite) as entites_avec_services,
                    COUNT(DISTINCT ei.type_entite) as types_entites_concernes
                FROM services_institutions si
                JOIN entites_institutions ei ON si.id_entite = ei.id
                WHERE ei.id_institution = $1
            `;

            const result = await this.pool.query(statsQuery, [id_institution]);

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
}

module.exports = new ServicesInstitutionsController();