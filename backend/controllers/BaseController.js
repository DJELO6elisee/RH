const pool = require('../config/database');

// Classe de base pour les opérations CRUD
class BaseController {
    constructor(tableName, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
    }

    // Récupérer tous les enregistrements
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC', is_prefectoral } = req.query;
            const offset = (page - 1) * limit;

            let query = `SELECT * FROM ${this.tableName}`;
            let countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
            const params = [];
            const whereConditions = [];

            // Recherche
            if (search) {
                const searchCondition = `libele ILIKE $${params.length + 1} OR (libele IS NULL AND (nom ILIKE $${params.length + 1} OR prenom ILIKE $${params.length + 1}))`;
                whereConditions.push(`(${searchCondition})`);
                params.push(`%${search}%`);
            }
            
            // Filtre is_prefectoral (pour les grades et échelons préfectoraux)
            if (is_prefectoral !== undefined) {
                const isPrefectoralValue = is_prefectoral === 'true' || is_prefectoral === true || is_prefectoral === '1' || is_prefectoral === 1;
                whereConditions.push(`is_prefectoral = $${params.length + 1}`);
                params.push(isPrefectoralValue);
            }
            
            // Ajouter les conditions WHERE si nécessaire
            if (whereConditions.length > 0) {
                const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
                query += ` ${whereClause}`;
                countQuery += ` ${whereClause}`;
            }

            // Tri
            if (sortBy) {
                query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
            } else {
                // Par défaut, trier par libele (alphabétique) pour les tables de référence
                // Utiliser seulement libele car c'est le nom standard dans la plupart des tables
                // Si la colonne n'existe pas, PostgreSQL générera une erreur, mais la plupart des tables l'ont
                query += ` ORDER BY libele ASC NULLS LAST, created_at DESC`;
            }

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), offset);

            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.filter((_, index) => index < params.length - 2)) // Exclure limit et offset
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

    // Récupérer un enregistrement par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: `${this.tableName} non trouvé` });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${this.tableName}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Créer un nouvel enregistrement
    async create(req, res) {
        try {
            const data = req.body;
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

            if (error.code === '23505') { // Violation de contrainte unique
                res.status(400).json({ error: 'Cette valeur existe déjà' });
            } else if (error.code === '23502') { // Violation de contrainte NOT NULL
                res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
            } else if (error.code === '42703') { // Colonne indéfinie
                res.status(400).json({ error: `Colonne invalide: ${error.message}` });
            } else {
                res.status(500).json({ 
                    error: 'Erreur interne du serveur',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        }
    }

    // Mettre à jour un enregistrement
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;

            // Vérifier si l'enregistrement existe
            const checkQuery = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({ error: `${this.tableName} non trouvé` });
            }

            // Exclure les champs automatiques des données
            const { created_at, updated_at, ...dataToUpdate } = data;
            const columns = Object.keys(dataToUpdate);
            const values = Object.values(dataToUpdate);
            const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');

            const query = `
        UPDATE ${this.tableName} 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE ${this.primaryKey} = $1
        RETURNING *
      `;

            const result = await pool.query(query, [id, ...values]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de ${this.tableName}:`, error);

            if (error.code === '23505') {
                res.status(400).json({ error: 'Cette valeur existe déjà' });
            } else {
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        }
    }

    // Supprimer un enregistrement
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Vérifier si l'enregistrement existe
            const checkQuery = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
            const checkResult = await pool.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({ error: `${this.tableName} non trouvé` });
            }

            const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
            await pool.query(query, [id]);

            res.json({ message: `${this.tableName} supprimé avec succès` });
        } catch (error) {
            console.error(`Erreur lors de la suppression de ${this.tableName}:`, error);

            if (error.code === '23503') { // Violation de contrainte de clé étrangère
                res.status(400).json({ error: 'Impossible de supprimer cet enregistrement car il est référencé ailleurs' });
            } else {
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        }
    }

    // Supprimer plusieurs enregistrements
    async deleteMultiple(req, res) {
        try {
            const { ids } = req.body;

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'Liste d\'IDs invalide' });
            }

            const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
            const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} IN (${placeholders})`;

            const result = await pool.query(query, ids);

            res.json({
                message: `${result.rowCount} enregistrement(s) supprimé(s) avec succès`,
                deletedCount: result.rowCount
            });
        } catch (error) {
            console.error(`Erreur lors de la suppression multiple de ${this.tableName}:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = BaseController;