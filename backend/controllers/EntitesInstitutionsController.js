const db = require('../config/database');

class EntitesInstitutionsController {
    // Récupérer toutes les entités des institutions
    async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    e.*,
                    i.nom as institution_nom,
                    pe.nom as parent_nom
                FROM entites_institutions e
                LEFT JOIN institutions i ON e.id_institution = i.id
                LEFT JOIN entites_institutions pe ON e.id_entite_parent = pe.id
                ORDER BY e.id
            `);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des entités:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer une entité par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT 
                    e.*,
                    i.nom as institution_nom,
                    pe.nom as parent_nom
                FROM entites_institutions e
                LEFT JOIN institutions i ON e.id_institution = i.id
                LEFT JOIN entites_institutions pe ON e.id_entite_parent = pe.id
                WHERE e.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Entité non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'entité:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Créer une nouvelle entité
    async create(req, res) {
        try {
            const { id_institution, id_entite_parent, nom, type_entite, niveau_hierarchique, adresse, telephone, email } = req.body;

            // Validation des données obligatoires
            if (!id_institution || !nom) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'institution et le nom sont obligatoires'
                });
            }

            const result = await db.query(`
                INSERT INTO entites_institutions (id_institution, id_entite_parent, nom, type_entite, niveau_hierarchique, adresse, telephone, email)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [id_institution, id_entite_parent, nom, type_entite, niveau_hierarchique, adresse, telephone, email]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'entité:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Mettre à jour une entité
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_institution, id_entite_parent, nom, type_entite, niveau_hierarchique, adresse, telephone, email } = req.body;

            const result = await db.query(`
                UPDATE entites_institutions SET
                    id_institution = COALESCE($1, id_institution),
                    id_entite_parent = COALESCE($2, id_entite_parent),
                    nom = COALESCE($3, nom),
                    type_entite = COALESCE($4, type_entite),
                    niveau_hierarchique = COALESCE($5, niveau_hierarchique),
                    adresse = COALESCE($6, adresse),
                    telephone = COALESCE($7, telephone),
                    email = COALESCE($8, email),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $9
                RETURNING *
            `, [id_institution, id_entite_parent, nom, type_entite, niveau_hierarchique, adresse, telephone, email, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Entité non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'entité:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Supprimer une entité
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await db.query('DELETE FROM entites_institutions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Entité non trouvée' });
            }

            res.json({ success: true, message: 'Entité supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'entité:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer les entités d'une institution
    async getByInstitution(req, res) {
        try {
            const { institutionId } = req.params;
            const result = await db.query(`
                SELECT 
                    e.*,
                    pe.nom as parent_nom
                FROM entites_institutions e
                LEFT JOIN entites_institutions pe ON e.id_entite_parent = pe.id
                WHERE e.id_institution = $1 
                ORDER BY e.niveau_hierarchique, e.nom
            `, [institutionId]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des entités de l\'institution:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer la hiérarchie des entités d'une institution
    async getHierarchy(req, res) {
        try {
            const { institutionId } = req.params;

            const hierarchyQuery = `
                WITH RECURSIVE entite_hierarchy AS (
                    -- Entités de niveau 1 (racines)
                    SELECT 
                        e.*,
                        1 as level,
                        ARRAY[e.id] as path,
                        e.nom as full_path
                    FROM entites_institutions e
                    WHERE e.id_institution = $1 
                        AND e.id_entite_parent IS NULL
                    
                    UNION ALL
                    
                    -- Entités enfants
                    SELECT 
                        e.*,
                        eh.level + 1 as level,
                        eh.path || e.id as path,
                        eh.full_path || ' > ' || e.nom as full_path
                    FROM entites_institutions e
                    INNER JOIN entite_hierarchy eh ON e.id_entite_parent = eh.id
                )
                SELECT 
                    eh.*,
                    COUNT(a.id) as nombre_agents
                FROM entite_hierarchy eh
                LEFT JOIN agents_institutions_main a ON eh.id = a.id_entite_principale
                GROUP BY eh.id, eh.nom, eh.type_entite, eh.niveau_hierarchique, eh.level, eh.path, eh.full_path, eh.created_at, eh.updated_at, eh.id_institution, eh.id_entite_parent, eh.adresse, eh.telephone, eh.email
                ORDER BY eh.level, eh.niveau_hierarchique, eh.nom
            `;

            const result = await db.query(hierarchyQuery, [institutionId]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération de la hiérarchie:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new EntitesInstitutionsController();