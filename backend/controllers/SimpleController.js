const BaseController = require('./BaseController');
const pool = require('../config/database');

class SimpleController extends BaseController {
    constructor(tableName, primaryKey = 'id') {
        super(tableName, primaryKey);
    }

    // Surcharger getAll pour trier par défaut par libele (alphabétique)
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC', id_ministere, ministere_id } = req.query;
            const offset = (page - 1) * limit;

            let query = `SELECT * FROM ${this.tableName}`;
            let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
            const params = [];
            let paramIndex = 1;

            // Filtre par ministère (emplois) : accepter id_ministere ou ministere_id
            const ministereId = id_ministere || ministere_id;
            const conditions = [];
            if (this.tableName === 'emplois' && ministereId) {
                const mid = parseInt(ministereId, 10);
                if (!isNaN(mid)) {
                    conditions.push(`(id_ministere = $${paramIndex} OR id_ministere IS NULL)`);
                    params.push(mid);
                    paramIndex++;
                }
            }

            // Recherche
            if (search) {
                conditions.push(`(libele ILIKE $${paramIndex} OR (libele IS NULL AND (nom ILIKE $${paramIndex} OR prenom ILIKE $${paramIndex})))`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (conditions.length > 0) {
                const whereClause = ' WHERE ' + conditions.join(' AND ');
                query += whereClause;
                countQuery += whereClause;
            }

            // Tri - Par défaut, trier par libele (alphabétique) pour les tables de référence
            if (sortBy) {
                query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
            } else {
                query += ` ORDER BY libele ASC NULLS LAST`;
            }

            // Pagination
            query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(parseInt(limit), offset);

            const countParams = params.slice(0, -2);
            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, countParams)
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
            const { is_prefectoral, id_ministere, ministere_id } = req.query;
            let query = `SELECT id, libele FROM ${this.tableName}`;
            const params = [];
            let paramIndex = 1;
            const conditions = [];

            // Filtre par ministère (emplois)
            const ministereId = id_ministere || ministere_id;
            if (this.tableName === 'emplois' && ministereId) {
                const mid = parseInt(ministereId, 10);
                if (!isNaN(mid)) {
                    conditions.push(`(id_ministere = $${paramIndex} OR id_ministere IS NULL)`);
                    params.push(mid);
                    paramIndex++;
                }
            }

            // Filtre is_prefectoral (pour les grades et échelons préfectoraux)
            if (is_prefectoral !== undefined) {
                const isPrefectoralValue = is_prefectoral === 'true' || is_prefectoral === true || is_prefectoral === '1' || is_prefectoral === 1;
                conditions.push(`is_prefectoral = $${paramIndex}`);
                params.push(isPrefectoralValue);
                paramIndex++;
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ` ORDER BY libele ASC`;
            const result = await pool.query(query, params);
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
        WHERE libele ILIKE $1 
        ORDER BY libele ASC
      `;

            const result = await pool.query(query, [`%${term}%`]);
            res.json(result.rows);
        } catch (error) {
            console.error(`Erreur lors de la recherche des ${this.tableName}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = SimpleController;