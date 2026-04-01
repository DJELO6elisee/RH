const pool = require('../config/database');

class ServicesEntitesMinistresController {
    // Récupérer tous les services des entités d'un ministère avec pagination et recherche
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search = '', sortBy = 'libelle', sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE se.is_active = true';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND (se.libelle ILIKE $${paramIndex} OR se.description ILIKE $${paramIndex} OR ea.nom ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Filtrage par ministère si spécifié (pour les DRH)
            if (req.query.id_ministere) {
                whereClause += ` AND ea.id_ministere = $${paramIndex}`;
                params.push(req.query.id_ministere);
                paramIndex++;
            }

            const query = `
                SELECT 
                    se.id,
                    se.libelle,
                    se.description,
                    se.code,
                    se.responsable_id,
                    se.is_active,
                    se.created_at,
                    se.updated_at,
                    se.id_entite,
                    ea.nom as entite_nom,
                    ea.type_entite,
                    ea.id_ministere,
                    m.nom as ministere_nom,
                    CONCAT(a.nom, ' ', a.prenom) as responsable_nom
                FROM services_entites se
                LEFT JOIN entites_administratives ea ON se.id_entite = ea.id
                LEFT JOIN ministeres m ON ea.id_ministere = m.id
                LEFT JOIN agents a ON se.responsable_id = a.id
                ${whereClause}
                ORDER BY ea.nom, se.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM services_entites se
                LEFT JOIN entites_administratives ea ON se.id_entite = ea.id
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
            console.error('Erreur lors de la récupération des services des entités:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer un service d'entité par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(`
                SELECT 
                    se.*,
                    ea.nom as entite_nom,
                    ea.type_entite,
                    ea.id_ministere,
                    m.nom as ministere_nom,
                    CONCAT(a.nom, ' ', a.prenom) as responsable_nom
                FROM services_entites se
                LEFT JOIN entites_administratives ea ON se.id_entite = ea.id
                LEFT JOIN ministeres m ON ea.id_ministere = m.id
                LEFT JOIN agents a ON se.responsable_id = a.id
                WHERE se.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Service non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Créer un nouveau service d'entité
    async create(req, res) {
        try {
            const { libelle, description, code, id_entite, responsable_id, is_active = true } = req.body;

            if (!libelle || !id_entite) {
                return res.status(400).json({ success: false, message: 'Le libellé et l\'entité sont requis' });
            }

            const result = await pool.query(
                'INSERT INTO services_entites (libelle, description, code, id_entite, responsable_id, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [libelle, description, code, id_entite, responsable_id, is_active]
            );

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Mettre à jour un service d'entité
    async update(req, res) {
        try {
            const { id } = req.params;
            const { libelle, description, code, id_entite, responsable_id, is_active } = req.body;

            const result = await pool.query(
                'UPDATE services_entites SET libelle = $1, description = $2, code = $3, id_entite = $4, responsable_id = $5, is_active = $6 WHERE id = $7 RETURNING *', [libelle, description, code, id_entite, responsable_id, is_active, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Service non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Supprimer un service d'entité
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM services_entites WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Service non trouvé' });
            }

            res.json({ success: true, message: 'Service supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du service:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new ServicesEntitesMinistresController();