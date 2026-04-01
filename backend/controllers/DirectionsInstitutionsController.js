const pool = require('../config/database');
const BaseController = require('./BaseController');

class DirectionsInstitutionsController extends BaseController {
    constructor() {
        super('directions_institutions');
        this.tableName = 'directions_institutions';
        this.organizationField = 'id_institution';
    }

    // Récupérer l'ID de l'institution de l'utilisateur
    async getUserInstitutionId(req) {
        if (req.user && req.user.organization && req.user.organization.type === 'institution') {
            return req.user.organization.id;
        }
        if (req.user && req.user.id_agent) {
            const result = await pool.query(
                'SELECT id_institution FROM agents_institutions_main WHERE id = $1',
                [req.user.id_agent]
            );
            if (result.rows.length > 0) {
                return result.rows[0].id_institution;
            }
        }
        return null;
    }

    // Récupérer toutes les directions avec pagination et recherche
    async getAll(req, res) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                sortBy = 'libelle', 
                sortOrder = 'ASC',
                id_institution 
            } = req.query;
            const offset = (page - 1) * limit;

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE 1=1';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND d.libelle ILIKE $${paramIndex}`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (institutionId) {
                whereClause += ` AND d.${this.organizationField} = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            const query = `
                SELECT 
                    d.id,
                    d.libelle,
                    d.code,
                    d.${this.organizationField},
                    d.responsable_id,
                    d.description,
                    d.is_active,
                    d.created_at,
                    d.updated_at,
                    i.nom as institution_nom,
                    CASE 
                        WHEN a.id IS NOT NULL THEN CONCAT(a.nom, ' ', a.prenom)
                        ELSE NULL
                    END as responsable_nom
                FROM ${this.tableName} d
                LEFT JOIN institutions i ON d.${this.organizationField} = i.id
                LEFT JOIN agents_institutions_main a ON d.responsable_id = a.id
                ${whereClause}
                ORDER BY d.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);
            const result = await pool.query(query, params);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM ${this.tableName} d
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
            console.error('Erreur lors de la récupération des directions:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Obtenir toutes les directions sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            const { id_institution } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE d.is_active = true';
            const params = [];
            let paramIndex = 1;

            if (institutionId) {
                whereClause += ` AND d.${this.organizationField} = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            const query = `
                SELECT 
                    d.id,
                    d.libelle,
                    d.code
                FROM ${this.tableName} d
                ${whereClause}
                ORDER BY d.libelle ASC
            `;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des directions pour select:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer une direction par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `
                SELECT 
                    d.*,
                    i.nom as institution_nom,
                    CASE 
                        WHEN a.id IS NOT NULL THEN CONCAT(a.nom, ' ', a.prenom)
                        ELSE NULL
                    END as responsable_nom
                FROM ${this.tableName} d
                LEFT JOIN institutions i ON d.${this.organizationField} = i.id
                LEFT JOIN agents_institutions_main a ON d.responsable_id = a.id
                WHERE d.id = $1
            `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Direction non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de la direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Créer une nouvelle direction
    async create(req, res) {
        try {
            const { libelle, code, description, responsable_id } = req.body;

            if (!libelle) {
                return res.status(400).json({ success: false, message: 'Le libellé est requis' });
            }

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = req.body.id_institution || userInstitutionId;

            if (!institutionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Impossible de déterminer l\'institution'
                });
            }

            const result = await pool.query(
                `INSERT INTO ${this.tableName} (libelle, code, ${this.organizationField}, description, responsable_id) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [libelle, code || null, institutionId, description || null, responsable_id || null]
            );

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de la direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Mettre à jour une direction
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libelle, code, description, responsable_id, is_active } = req.body;

            const result = await pool.query(
                `UPDATE ${this.tableName} 
                 SET libelle = COALESCE($1, libelle),
                     code = COALESCE($2, code),
                     description = COALESCE($3, description),
                     responsable_id = COALESCE($4, responsable_id),
                     is_active = COALESCE($5, is_active),
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $6 
                 RETURNING *`,
                [libelle, code, description, responsable_id, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Direction non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Supprimer une direction
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Direction non trouvée' });
            }

            res.json({ success: true, message: 'Direction supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer les agents d'une direction
    async getAgentsByDirection(req, res) {
        try {
            const { id } = req.params;

            const directionQuery = `SELECT * FROM ${this.tableName} WHERE id = $1`;
            const directionResult = await pool.query(directionQuery, [id]);

            if (directionResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Direction non trouvée' });
            }

            const direction = directionResult.rows[0];

            const agentsQuery = `
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    sm.libele as situation_matrimoniale_libele,
                    g.libele as grade_libele
                FROM agents_institutions_main a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE a.id_direction = $1
                ORDER BY 
                    CASE WHEN a.id = $2 THEN 0 ELSE 1 END,
                    a.nom, a.prenom
            `;

            const agentsResult = await pool.query(agentsQuery, [id, direction.responsable_id]);

            res.json({
                success: true,
                data: {
                    direction: direction,
                    agents: agentsResult.rows
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents de la direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }
}

module.exports = new DirectionsInstitutionsController();

