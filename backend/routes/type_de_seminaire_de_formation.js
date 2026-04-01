const express = require('express');
const router = express.Router();
const BaseController = require('../controllers/BaseController');
const pool = require('../config/database');

// Essayer de charger le contrôleur spécifique, sinon créer un contrôleur inline comme fallback
let type_de_seminaire_de_formationController;

try {
    const TypeDeSeminaireDeFormationController = require('../controllers/TypeDeSeminaireDeFormationController');
    type_de_seminaire_de_formationController = new TypeDeSeminaireDeFormationController();
} catch (error) {
    console.warn('⚠️  TypeDeSeminaireDeFormationController non trouvé, création d\'un contrôleur inline comme fallback');
    
    // Créer un contrôleur inline qui utilise 'libelle' au lieu de 'libele'
    class TypeDeSeminaireDeFormationControllerFallback extends BaseController {
        constructor() {
            super('type_de_seminaire_de_formation', 'id');
        }

        async getAll(req, res) {
            try {
                const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC' } = req.query;
                const offset = (page - 1) * limit;

                let query = `SELECT * FROM ${this.tableName}`;
                let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
                const params = [];

                // Recherche sur libelle
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
    }
    
    type_de_seminaire_de_formationController = new TypeDeSeminaireDeFormationControllerFallback();
}

// Routes CRUD de base
router.get('/', type_de_seminaire_de_formationController.getAll.bind(type_de_seminaire_de_formationController));
router.get('/:id', type_de_seminaire_de_formationController.getById.bind(type_de_seminaire_de_formationController));
router.post('/', type_de_seminaire_de_formationController.create.bind(type_de_seminaire_de_formationController));
router.put('/:id', type_de_seminaire_de_formationController.update.bind(type_de_seminaire_de_formationController));
router.delete('/:id', type_de_seminaire_de_formationController.delete.bind(type_de_seminaire_de_formationController));
router.delete('/', type_de_seminaire_de_formationController.deleteMultiple.bind(type_de_seminaire_de_formationController));

// Routes spécifiques
router.get('/search/:term', type_de_seminaire_de_formationController.searchByTerm.bind(type_de_seminaire_de_formationController));
router.get('/select/all', type_de_seminaire_de_formationController.getAllForSelect.bind(type_de_seminaire_de_formationController));

module.exports = router;
