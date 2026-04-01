const BaseController = require('./BaseController');
const pool = require('../config/database');

class GradesController extends BaseController {
    constructor() {
        super('grades');
    }

    
    // Récupérer tous les grades
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy = 'libele', sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let query = `SELECT * FROM grades`;
            let countQuery = `SELECT COUNT(*) FROM grades`;
            const params = [];

            // Recherche
            if (search) {
                const searchCondition = `WHERE libele ILIKE $1`;
                query += ` ${searchCondition}`;
                countQuery += ` ${searchCondition}`;
                params.push(`%${search}%`);
            }

            // Tri
            query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

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
            console.error('Erreur lors de la récupération des grades:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Obtenir tous les grades sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            const { is_prefectoral } = req.query;
            let query = `SELECT id, libele FROM grades`;
            const params = [];
            
            // Filtre is_prefectoral (pour les grades préfectoraux)
            if (is_prefectoral !== undefined) {
                const isPrefectoralValue = is_prefectoral === 'true' || is_prefectoral === true || is_prefectoral === '1' || is_prefectoral === 1;
                query += ` WHERE is_prefectoral = $1`;
                params.push(isPrefectoralValue);
            }
            
            query += ` ORDER BY libele ASC`;
            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des grades:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Récupérer un grade par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `SELECT * FROM grades WHERE id = $1`;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Grade non trouvé' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération du grade:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Créer un nouveau grade
    async create(req, res) {
        try {
            const { libele } = req.body;

            // Validation
            if (!libele) {
                return res.status(400).json({
                    error: 'Le champ libele est obligatoire'
                });
            }

            // Vérifier si le grade existe déjà
            const checkGrade = await pool.query('SELECT id FROM grades WHERE libele = $1', [libele]);
            if (checkGrade.rows.length > 0) {
                return res.status(400).json({ error: 'Ce grade existe déjà' });
            }

            const query = `
        INSERT INTO grades (libele, created_at, updated_at)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

            const result = await pool.query(query, [libele]);
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création du grade:', error);

            if (error.code === '23505') {
                res.status(400).json({ error: 'Cette valeur existe déjà' });
            } else if (error.code === '23502') {
                res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
            } else {
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        }
    }

    // Mettre à jour un grade
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libele, id_categorie, numero_ordre, age_de_retraite } = req.body;

            // Vérifier si le grade existe
            const checkGrade = await pool.query('SELECT * FROM grades WHERE id = $1', [id]);
            if (checkGrade.rows.length === 0) {
                return res.status(404).json({ error: 'Grade non trouvé' });
            }

            // Vérifier si la catégorie existe
            if (id_categorie) {
                const checkCategorie = await pool.query('SELECT id FROM categories WHERE id = $1', [id_categorie]);
                if (checkCategorie.rows.length === 0) {
                    return res.status(400).json({ error: 'Catégorie non trouvée' });
                }
            }

            // Vérifier si le numéro d'ordre existe déjà dans cette catégorie (sauf pour ce grade)
            if (id_categorie && numero_ordre) {
                const checkOrdre = await pool.query(
                    'SELECT id FROM grades WHERE id_categorie = $1 AND numero_ordre = $2 AND id != $3', [id_categorie, numero_ordre, id]
                );
                if (checkOrdre.rows.length > 0) {
                    return res.status(400).json({ error: 'Ce numéro d\'ordre existe déjà dans cette catégorie' });
                }
            }

            const updateFields = [];
            const values = [];
            let paramIndex = 1;

            if (libele !== undefined) {
                updateFields.push(`libele = $${paramIndex}`);
                values.push(libele);
                paramIndex++;
            }

            if (id_categorie !== undefined) {
                updateFields.push(`id_categorie = $${paramIndex}`);
                values.push(id_categorie);
                paramIndex++;
            }

            if (numero_ordre !== undefined) {
                updateFields.push(`numero_ordre = $${paramIndex}`);
                values.push(numero_ordre);
                paramIndex++;
            }

            if (age_de_retraite !== undefined) {
                updateFields.push(`age_de_retraite = $${paramIndex}`);
                values.push(age_de_retraite);
                paramIndex++;
            }

            if (updateFields.length === 0) {
                return res.status(400).json({ error: 'Aucun champ à mettre à jour' });
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            const query = `
        UPDATE grades 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

            const result = await pool.query(query, [...values, id]);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du grade:', error);

            if (error.code === '23505') {
                res.status(400).json({ error: 'Cette valeur existe déjà' });
            } else {
                res.status(500).json({ error: 'Erreur interne du serveur' });
            }
        }
    }

    // Supprimer un grade
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Vérifier si le grade existe
            const checkGrade = await pool.query('SELECT * FROM grades WHERE id = $1', [id]);
            if (checkGrade.rows.length === 0) {
                return res.status(404).json({ error: 'Grade non trouvé' });
            }

            // Vérifier s'il y a des agents qui utilisent ce grade
            const checkAgents = await pool.query('SELECT id FROM agents WHERE id_grade = $1 LIMIT 1', [id]);
            if (checkAgents.rows.length > 0) {
                return res.status(400).json({
                    error: 'Impossible de supprimer ce grade car il est utilisé par des agents'
                });
            }

            await pool.query('DELETE FROM grades WHERE id = $1', [id]);
            res.json({ message: 'Grade supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du grade:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Récupérer les grades par catégorie
    async getByCategorie(req, res) {
        try {
            const { categorieId } = req.params;

            const query = `
        SELECT 
          g.*,
          c.libele as categorie_libele
        FROM grades g
        LEFT JOIN categories c ON g.id_categorie = c.id
        WHERE g.id_categorie = $1
        ORDER BY g.numero_ordre ASC
      `;

            const result = await pool.query(query, [categorieId]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des grades par catégorie:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }
}

module.exports = GradesController;