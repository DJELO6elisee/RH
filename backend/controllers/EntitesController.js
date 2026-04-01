const BaseController = require('./BaseController');
const pool = require('../config/database');

class EntitesController extends BaseController {
    constructor() {
        super('entites_administratives');
    }

    // Générer un code unique pour une entité
    async generateUniqueCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let isUnique = false;

        while (!isUnique) {
            // Générer 6 caractères aléatoires
            let randomPart = '';
            for (let i = 0; i < 6; i++) {
                randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            code = 'EN' + randomPart;

            // Vérifier l'unicité du code
            const existingCode = await pool.query(
                'SELECT id FROM entites_administratives WHERE code = $1', [code]
            );

            if (existingCode.rows.length === 0) {
                isUnique = true;
            }
        }

        return code;
    }

    // Récupérer toutes les entités avec leurs informations de ministère
    async getAllWithMinistere(req, res) {
        try {
            const { page = 1, limit = 10, search, id_ministere, type_entite, sortBy = 'nom', sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE ea.is_active = true';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND (ea.nom ILIKE $${paramIndex} OR ea.code ILIKE $${paramIndex} OR ea.sigle ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (id_ministere) {
                whereClause += ` AND ea.id_ministere = $${paramIndex}`;
                params.push(parseInt(id_ministere));
                paramIndex++;
            }

            if (type_entite) {
                whereClause += ` AND ea.type_entite = $${paramIndex}`;
                params.push(type_entite);
                paramIndex++;
            }

            // Requête principale avec informations du ministère et du responsable
            const query = `
                SELECT 
                    ea.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    m.sigle as ministere_sigle,
                    COUNT(a.id) as nombre_agents,
                    ep.nom as entite_parent_nom,
                    r.nom as responsable_nom,
                    r.prenom as responsable_prenom,
                    CONCAT(r.nom, ' ', r.prenom) as responsable_nom_complet
                FROM entites_administratives ea
                LEFT JOIN ministeres m ON ea.id_ministere = m.id
                LEFT JOIN agents a ON ea.id = a.id_entite_principale AND a.statut_emploi = 'actif'
                LEFT JOIN entites_administratives ep ON ea.id_entite_parent = ep.id
                LEFT JOIN agents r ON ea.responsable_id = r.id
                ${whereClause}
                GROUP BY ea.id, m.nom, m.code, m.sigle, ep.nom, r.nom, r.prenom
                ORDER BY ea.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(DISTINCT ea.id) as total
                FROM entites_administratives ea
                ${whereClause}
            `;
            const countParams = params.slice(0, -2); // Exclure limit et offset
            const countResult = await pool.query(countQuery, countParams);

            const total = parseInt(countResult.rows[0].total);
            const totalPages = Math.ceil(total / limit);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des entités:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Récupérer une entité simple (pour le frontend)
    async getById(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'entité avec ses informations de base
            const entiteQuery = `
                SELECT 
                    ea.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code
                FROM entites_administratives ea
                LEFT JOIN ministeres m ON ea.id_ministere = m.id
                WHERE ea.id = $1 AND ea.is_active = true
            `;
            const entiteResult = await pool.query(entiteQuery, [id]);

            if (entiteResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Entité non trouvée'
                });
            }

            res.json({
                success: true,
                data: entiteResult.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Récupérer une entité avec tous ses détails
    async getByIdWithDetails(req, res) {
        try {
            const { id } = req.params;

            // Récupérer l'entité avec ses informations de base
            const entiteQuery = `
                SELECT 
                    ea.*,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    ep.nom as entite_parent_nom,
                    r.nom as responsable_nom,
                    r.prenom as responsable_prenom
                FROM entites_administratives ea
                LEFT JOIN ministeres m ON ea.id_ministere = m.id
                LEFT JOIN entites_administratives ep ON ea.id_entite_parent = ep.id
                LEFT JOIN agents r ON ea.responsable_id = r.id
                WHERE ea.id = $1 AND ea.is_active = true
            `;
            const entiteResult = await pool.query(entiteQuery, [id]);

            if (entiteResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Entité non trouvée'
                });
            }

            const entite = entiteResult.rows[0];

            // Récupérer les sous-entités
            const sousEntitesQuery = `
                SELECT 
                    ea.*,
                    COUNT(a.id) as nombre_agents
                FROM entites_administratives ea
                LEFT JOIN agents a ON ea.id = a.id_entite_principale AND a.statut_emploi = 'actif'
                WHERE ea.id_entite_parent = $1 AND ea.is_active = true
                GROUP BY ea.id
                ORDER BY ea.niveau_hierarchique, ea.nom
            `;
            const sousEntitesResult = await pool.query(sousEntitesQuery, [id]);

            // Récupérer les agents de l'entité
            const agentsQuery = `
                SELECT 
                    a.*,
                    c.libele as civilite,
                    n.libele as nationalite,
                    ta.libele as type_agent
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.id_entite_principale = $1 AND a.statut_emploi = 'actif'
                ORDER BY a.nom, a.prenom
            `;
            const agentsResult = await pool.query(agentsQuery, [id]);

            // Statistiques de l'entité
            const statsQuery = `
                SELECT 
                    COUNT(DISTINCT a.id) as total_agents,
                    COUNT(DISTINCT CASE WHEN a.sexe = 'M' THEN a.id END) as hommes,
                    COUNT(DISTINCT CASE WHEN a.sexe = 'F' THEN a.id END) as femmes,
                    COUNT(DISTINCT ea.id) as total_sous_entites,
                    AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_de_naissance))) as age_moyen
                FROM entites_administratives ea
                LEFT JOIN agents a ON ea.id = a.id_entite_principale AND a.statut_emploi = 'actif'
                WHERE ea.id = $1
            `;
            const statsResult = await pool.query(statsQuery, [id]);

            res.json({
                success: true,
                data: {
                    entite,
                    sous_entites: sousEntitesResult.rows,
                    agents: agentsResult.rows,
                    statistiques: statsResult.rows[0]
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Créer une nouvelle entité
    async create(req, res) {
        try {
            const {
                id_ministere,
                code,
                nom,
                sigle,
                description,
                type_entite,
                adresse,
                telephone,
                email,
                id_region,
                id_departement,
                id_localite
            } = req.body;

            // Validation des données
            if (!id_ministere || !nom || !type_entite) {
                return res.status(400).json({
                    success: false,
                    message: 'Le ministère, le nom et le type d\'entité sont obligatoires'
                });
            }

            // Générer un code unique automatiquement
            const generatedCode = await this.generateUniqueCode();

            // Vérifier que le ministère existe
            const ministereExists = await pool.query(
                'SELECT id FROM ministeres WHERE id = $1 AND is_active = true', [id_ministere]
            );

            if (ministereExists.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Le ministère spécifié n\'existe pas ou est inactif'
                });
            }

            // Créer l'entité
            const newEntite = await pool.query(
                `INSERT INTO entites_administratives 
                 (id_ministere, code, nom, sigle, description, type_entite, adresse, telephone, email, id_region, id_departement, id_localite) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                 RETURNING *`, [id_ministere, generatedCode, nom, sigle, description, type_entite, adresse, telephone, email, id_region, id_departement, id_localite]
            );

            res.status(201).json({
                success: true,
                message: 'Entité créée avec succès',
                data: newEntite.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création de l\'entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Mettre à jour une entité
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                code,
                nom,
                sigle,
                description,
                type_entite,
                niveau_hierarchique,
                adresse,
                telephone,
                email,
                responsable_id,
                is_active,
                id_region,
                id_departement,
                id_localite
            } = req.body;

            // Vérifier si l'entité existe
            const existingEntite = await pool.query(
                'SELECT id, id_ministere FROM entites_administratives WHERE id = $1', [id]
            );

            if (existingEntite.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Entité non trouvée'
                });
            }

            const entite = existingEntite.rows[0];

            // Vérifier l'unicité du code si modifié
            if (code) {
                const existingCode = await pool.query(
                    'SELECT id FROM entites_administratives WHERE id_ministere = $1 AND code = $2 AND id != $3', [entite.id_ministere, code, id]
                );

                if (existingCode.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Une entité avec ce code existe déjà dans ce ministère'
                    });
                }
            }

            // Mettre à jour l'entité
            const updateQuery = `
                UPDATE entites_administratives 
                SET code = COALESCE($1, code),
                    nom = COALESCE($2, nom),
                    sigle = COALESCE($3, sigle),
                    description = COALESCE($4, description),
                    type_entite = COALESCE($5, type_entite),
                    niveau_hierarchique = COALESCE($6, niveau_hierarchique),
                    adresse = COALESCE($7, adresse),
                    telephone = COALESCE($8, telephone),
                    email = COALESCE($9, email),
                    responsable_id = COALESCE($10, responsable_id),
                    is_active = COALESCE($11, is_active),
                    id_region = COALESCE($12, id_region),
                    id_departement = COALESCE($13, id_departement),
                    id_localite = COALESCE($14, id_localite),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $15
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [
                code, nom, sigle, description, type_entite, niveau_hierarchique,
                adresse, telephone, email, responsable_id, is_active,
                id_region, id_departement, id_localite, id
            ]);

            res.json({
                success: true,
                message: 'Entité mise à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Supprimer une entité (désactivation logique)
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Vérifier si l'entité a des sous-entités ou des agents
            const hasDependencies = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM entites_administratives WHERE id_entite_parent = $1 AND is_active = true) as sous_entites_count,
                    (SELECT COUNT(*) FROM agents WHERE id_entite_principale = $1 AND statut_emploi = 'actif') as agents_count
            `, [id]);

            const { sous_entites_count, agents_count } = hasDependencies.rows[0];

            if (sous_entites_count > 0 || agents_count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Impossible de supprimer cette entité. Elle contient ${sous_entites_count} sous-entité(s) et ${agents_count} agent(s) actif(s).`,
                    data: { sous_entites_count, agents_count }
                });
            }

            // Désactiver l'entité
            await pool.query(
                'UPDATE entites_administratives SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]
            );

            res.json({
                success: true,
                message: 'Entité supprimée avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression de l\'entité:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Obtenir l'arborescence des entités d'un ministère
    async getHierarchy(req, res) {
        try {
            const { id_ministere } = req.params;

            // Vérifier que le ministère existe
            const ministereExists = await pool.query(
                'SELECT id FROM ministeres WHERE id = $1 AND is_active = true', [id_ministere]
            );

            if (ministereExists.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ministère non trouvé'
                });
            }

            // Récupérer toutes les entités du ministère
            const entitesQuery = `
                SELECT 
                    ea.*,
                    COUNT(a.id) as nombre_agents,
                    ep.nom as entite_parent_nom
                FROM entites_administratives ea
                LEFT JOIN agents a ON ea.id = a.id_entite_principale AND a.statut_emploi = 'actif'
                LEFT JOIN entites_administratives ep ON ea.id_entite_parent = ep.id
                WHERE ea.id_ministere = $1 AND ea.is_active = true
                GROUP BY ea.id, ep.nom
                ORDER BY ea.niveau_hierarchique, ea.nom
            `;

            const result = await pool.query(entitesQuery, [id_ministere]);

            // Construire l'arborescence
            const buildHierarchy = (entites, parentId = null) => {
                return entites
                    .filter(entite => entite.id_entite_parent === parentId)
                    .map(entite => ({
                        ...entite,
                        enfants: buildHierarchy(entites, entite.id)
                    }));
            };

            const hierarchy = buildHierarchy(result.rows);

            res.json({
                success: true,
                data: hierarchy
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de la hiérarchie:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Obtenir les types d'entités disponibles
    async getTypesEntites(req, res) {
        try {
            const types = [
                { value: 'direction', label: 'Direction' },
                { value: 'departement', label: 'Département' },
                { value: 'service', label: 'Service' },
                { value: 'bureau', label: 'Bureau' },
                { value: 'division', label: 'Division' }
            ];

            res.json({
                success: true,
                data: types
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des types d\'entités:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Récupérer le nombre total d'entités (y compris les inactives) pour le dashboard
    async getTotalCount(req, res) {
        try {
            const query = `
                SELECT COUNT(*) as total
                FROM entites_administratives
            `;

            const result = await pool.query(query);
            const total = parseInt(result.rows[0].total);

            res.json({
                success: true,
                data: {
                    total_entites: total
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du nombre total d\'entités:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }
}

module.exports = EntitesController;