const BaseController = require('./BaseController');
const pool = require('../config/database');

class CategoriesController extends BaseController {
    constructor() {
        super('categories');
    }

    // Recherche de catégories par terme
    async searchByTerm(req, res) {
        try {
            const { term } = req.params;
            const query = `
        SELECT * FROM categories 
        WHERE libele ILIKE $1 
        ORDER BY libele ASC
      `;

            const result = await pool.query(query, [`%${term}%`]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la recherche des catégories:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Obtenir toutes les catégories sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            const query = `SELECT id, libele FROM categories ORDER BY libele ASC`;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des catégories:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = CategoriesController;
