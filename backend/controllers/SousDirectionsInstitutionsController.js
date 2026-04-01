const pool = require('../config/database');
const BaseController = require('./BaseController');

class SousDirectionsInstitutionsController extends BaseController {
    constructor() {
        super('sous_directions_institutions');
        this.tableName = 'sous_directions_institutions';
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

    // Récupérer toutes les sous-directions avec pagination et recherche
    async getAll(req, res) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search = '', 
                sortBy = 'libelle', 
                sortOrder = 'ASC',
                id_institution,
                id_direction
            } = req.query;
            const offset = (page - 1) * limit;

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE 1=1';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND sd.libelle ILIKE $${paramIndex}`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (institutionId) {
                whereClause += ` AND sd.${this.organizationField} = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            if (id_direction) {
                whereClause += ` AND sd.id_direction = $${paramIndex}`;
                params.push(id_direction);
                paramIndex++;
            }

            const query = `
                SELECT 
                    sd.id,
                    sd.libelle,
                    sd.code,
                    sd.${this.organizationField},
                    sd.id_direction,
                    sd.responsable_id,
                    sd.description,
                    sd.is_active,
                    sd.created_at,
                    sd.updated_at,
                    i.nom as institution_nom,
                    d.libelle as direction_libelle,
                    CASE 
                        WHEN a.id IS NOT NULL THEN CONCAT(a.nom, ' ', a.prenom)
                        ELSE NULL
                    END as responsable_nom
                FROM ${this.tableName} sd
                LEFT JOIN institutions i ON sd.${this.organizationField} = i.id
                LEFT JOIN directions_institutions d ON sd.id_direction = d.id
                LEFT JOIN agents_institutions_main a ON sd.responsable_id = a.id
                ${whereClause}
                ORDER BY sd.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);
            const result = await pool.query(query, params);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM ${this.tableName} sd
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
            console.error('Erreur lors de la récupération des sous-directions:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Obtenir toutes les sous-directions sans pagination
    async getAllForSelect(req, res) {
        try {
            const { id_institution, id_direction } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE sd.is_active = true';
            const params = [];
            let paramIndex = 1;

            if (institutionId) {
                whereClause += ` AND sd.${this.organizationField} = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            if (id_direction) {
                whereClause += ` AND sd.id_direction = $${paramIndex}`;
                params.push(id_direction);
                paramIndex++;
            }

            const query = `
                SELECT 
                    sd.id,
                    sd.libelle,
                    sd.code,
                    sd.id_direction,
                    d.libelle as direction_libelle
                FROM ${this.tableName} sd
                LEFT JOIN directions_institutions d ON sd.id_direction = d.id
                ${whereClause}
                ORDER BY sd.libelle ASC
            `;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des sous-directions pour select:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer une sous-direction par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `
                SELECT 
                    sd.*,
                    i.nom as institution_nom,
                    d.libelle as direction_libelle,
                    CASE 
                        WHEN a.id IS NOT NULL THEN CONCAT(a.nom, ' ', a.prenom)
                        ELSE NULL
                    END as responsable_nom
                FROM ${this.tableName} sd
                LEFT JOIN institutions i ON sd.${this.organizationField} = i.id
                LEFT JOIN directions_institutions d ON sd.id_direction = d.id
                LEFT JOIN agents_institutions_main a ON sd.responsable_id = a.id
                WHERE sd.id = $1
            `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Sous-direction non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de la sous-direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Créer une nouvelle sous-direction
    async create(req, res) {
        try {
            const { libelle, code, id_direction, description, responsable_id } = req.body;

            if (!libelle || !id_direction) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Le libellé et la direction sont requis' 
                });
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
                `INSERT INTO ${this.tableName} (libelle, code, ${this.organizationField}, id_direction, description, responsable_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [libelle, code || null, institutionId, id_direction, description || null, responsable_id || null]
            );

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de la sous-direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Mettre à jour une sous-direction
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libelle, code, id_direction, description, responsable_id, is_active } = req.body;

            const result = await pool.query(
                `UPDATE ${this.tableName} 
                 SET libelle = COALESCE($1, libelle),
                     code = COALESCE($2, code),
                     id_direction = COALESCE($3, id_direction),
                     description = COALESCE($4, description),
                     responsable_id = COALESCE($5, responsable_id),
                     is_active = COALESCE($6, is_active),
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $7 
                 RETURNING *`,
                [libelle, code, id_direction, description, responsable_id, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Sous-direction non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la sous-direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Supprimer une sous-direction
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Sous-direction non trouvée' });
            }

            res.json({ success: true, message: 'Sous-direction supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la sous-direction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }
}

module.exports = new SousDirectionsInstitutionsController();

