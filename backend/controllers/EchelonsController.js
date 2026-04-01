const BaseController = require('./BaseController');
const pool = require('../config/database');

class EchelonsController extends BaseController {
    constructor() {
        super('echelons');
    }

    // Recherche d'échelons par terme
    async searchByTerm(req, res) {
        try {
            const { term } = req.params;
            const query = `
                SELECT * FROM echelons 
                WHERE libele ILIKE $1 
                ORDER BY libele ASC
            `;

            const result = await pool.query(query, [`%${term}%`]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la recherche des échelons:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Obtenir tous les échelons sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            const query = `SELECT id, libele FROM echelons ORDER BY libele ASC`;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des échelons:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = EchelonsController;