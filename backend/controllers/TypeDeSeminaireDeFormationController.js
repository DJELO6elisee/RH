const BaseController = require('./BaseController');
const pool = require('../config/database');

class TypeDeSeminaireDeFormationController extends BaseController {
    constructor() {
        super('type_de_seminaire_de_formation', 'id');
    }

    // Récupérer tous les enregistrements avec recherche sur libelle
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let query = `SELECT * FROM ${this.tableName}`;
            let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
            const params = [];

            // Recherche sur libelle au lieu de libele
            if (search) {
                const searchCondition = `WHERE libelle ILIKE $1`;
                query += ` ${searchCondition}`;
                countQuery += ` ${searchCondition}`;
                params.push(`%${search}%`);
            }

            // Tri
            if (sortBy) {
                query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
            } else {
                query += ` ORDER BY created_at DESC`;
            }

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), offset);

            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, search ? [params[0]] : [])
            ]);

            const totalCount = parseInt(countResult.rows[0].count);
            const totalPages = Math.ceil(totalCount / limit);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit)
                }
            });
        } catch (error) {
            console.error(`Erreur lors de la récupération des ${this.tableName}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Obtenir toutes les valeurs sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            const query = `SELECT id, libelle FROM ${this.tableName} ORDER BY libelle ASC`;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error(`Erreur lors de la récupération des ${this.tableName}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Recherche par terme
    async searchByTerm(req, res) {
        try {
            const { term } = req.params;
            const query = `
                SELECT * FROM ${this.tableName} 
                WHERE libelle ILIKE $1 
                ORDER BY libelle ASC
            `;

            const result = await pool.query(query, [`%${term}%`]);
            res.json(result.rows);
        } catch (error) {
            console.error(`Erreur lors de la recherche des ${this.tableName}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Créer un nouvel enregistrement
    async create(req, res) {
        try {
            const data = req.body;
            
            // S'assurer que l'année est présente (année actuelle par défaut)
            if (!data.annee) {
                data.annee = new Date().getFullYear();
            }
            
            const columns = Object.keys(data);
            const values = Object.values(data);
            const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

            const query = `
                INSERT INTO ${this.tableName} (${columns.join(', ')}, created_at, updated_at)
                VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const result = await pool.query(query, values);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error(`Erreur lors de la création de ${this.tableName}:`, error);
            console.error(`Détails de l'erreur:`, {
                message: error.message,
                code: error.code,
                detail: error.detail,
                constraint: error.constraint,
                table: error.table,
                column: error.column
            });

            if (error.code === '23505') {
                res.status(400).json({ error: 'Cette valeur existe déjà' });
            } else if (error.code === '23502') {
                res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
            } else if (error.code === '42703') {
                res.status(400).json({ error: `Colonne invalide: ${error.message}` });
            } else {
                res.status(500).json({ 
                    error: 'Erreur interne du serveur',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        }
    }

    // Mettre à jour un enregistrement (hérite de BaseController mais peut être surchargé si nécessaire)
    // La méthode update de BaseController devrait fonctionner correctement
}

module.exports = TypeDeSeminaireDeFormationController;

