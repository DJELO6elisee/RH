const BaseController = require('./BaseController');
const pool = require('../config/database');

class MinisteresController extends BaseController {
    constructor() {
        super('ministeres');
    }

    // Récupérer tous les ministères avec leurs entités
    async getAllWithEntites(req, res) {
        try {
            const { page = 1, limit = 10, search, sortBy = 'nom', sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE m.is_active = true';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND (m.nom ILIKE $${paramIndex} OR m.code ILIKE $${paramIndex} OR m.sigle ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Filtrage par ministère si spécifié (pour les DRH)
            if (req.query.id_ministere) {
                whereClause += ` AND m.id = $${paramIndex}`;
                params.push(req.query.id_ministere);
                paramIndex++;
            }

            // Requête principale avec comptage des entités (tous les agents du ministère - actifs et inactifs)
            const query = `
                SELECT 
                    m.*,
                    COUNT(DISTINCT ea.id) as nombre_entites,
                    COUNT(DISTINCT a.id) as nombre_agents
                FROM ministeres m
                LEFT JOIN entites_administratives ea ON m.id = ea.id_ministere AND ea.is_active = true
                LEFT JOIN agents a ON m.id = a.id_ministere
                ${whereClause}
                GROUP BY m.id
                ORDER BY m.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);

            const result = await pool.query(query, params);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(DISTINCT m.id) as total
                FROM ministeres m
                ${whereClause}
            `;
            // Utiliser tous les paramètres sauf limit et offset pour le comptage
            const countParams = params.slice(0, -2);
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
            console.error('Erreur lors de la récupération des ministères:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Récupérer un ministère avec toutes ses entités et agents
    async getByIdWithDetails(req, res) {
        try {
            console.log('=== getByIdWithDetails appelé ===');
            const { id } = req.params;
            console.log('ID ministère demandé:', id);

            // Valider que l'ID est un nombre
            const ministereId = parseInt(id, 10);
            if (isNaN(ministereId)) {
                console.log('ID invalide:', id);
                return res.status(400).json({
                    success: false,
                    message: 'ID de ministère invalide'
                });
            }

            // Récupérer le ministère
            console.log('Recherche du ministère avec ID:', ministereId);
            const ministereQuery = 'SELECT * FROM ministeres WHERE id = $1 AND is_active = true';
            const ministereResult = await pool.query(ministereQuery, [ministereId]);

            if (ministereResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ministère non trouvé'
                });
            }

            const ministere = ministereResult.rows[0];

            // Récupérer les entités du ministère
            const entitesQuery = `
                SELECT 
                    ea.*,
                    COUNT(a.id) as nombre_agents,
                    m.nom as ministere_nom
                FROM entites_administratives ea
                LEFT JOIN agents a ON ea.id = a.id_entite_principale AND a.statut_emploi = 'actif'
                LEFT JOIN ministeres m ON ea.id_ministere = m.id
                WHERE ea.id_ministere = $1 AND ea.is_active = true
                GROUP BY ea.id, m.nom
                ORDER BY ea.niveau_hierarchique, ea.nom
            `;
            console.log('Ministère trouvé:', ministereResult.rows.length > 0 ? 'Oui' : 'Non');
            const entitesResult = await pool.query(entitesQuery, [ministereId]);
            console.log('Nombre d\'entités trouvées:', entitesResult.rows.length);

            // Récupérer les agents du ministère (exclure retirés et à la retraite)
            const agentsQuery = `
                SELECT 
                    a.*,
                    c.libele as civilite,
                    n.libele as nationalite,
                    ta.libele as type_agent,
                    ea.nom as entite_nom,
                    ea.type_entite
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN entites_administratives ea ON a.id_entite_principale = ea.id
                WHERE a.id_ministere = $1 
                AND (a.statut_emploi = 'actif' OR a.statut_emploi IS NULL)
                AND (a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite')
                AND (a.retire IS NULL OR a.retire = false)
                AND (
                    (a.date_retraite IS NULL AND (a.date_de_naissance IS NULL OR DATE_PART('year', AGE(CURRENT_DATE, a.date_de_naissance)) < CASE WHEN g.libele IS NOT NULL AND UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65 ELSE 60 END))
                    OR (a.date_retraite IS NOT NULL AND a.date_retraite > CURRENT_DATE)
                )
                AND NOT (
                    a.id_type_d_agent = 1
                    AND a.date_de_naissance IS NOT NULL
                    AND g.libele IS NOT NULL
                    AND MAKE_DATE(
                        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                        CASE WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65 ELSE 60 END,
                        12,
                        31
                    )::DATE < CURRENT_DATE::DATE
                )
                ORDER BY a.nom, a.prenom
            `;
            const agentsResult = await pool.query(agentsQuery, [ministereId]);
            console.log('Nombre d\'agents trouvés:', agentsResult.rows.length);

            // Condition unique : exclure agents retirés, statut retraite, et agents à la retraite (date/âge)
            const agentActifCondition = `
                (a.retire IS NULL OR a.retire = false)
                AND (a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite')
                AND (
                    (a.date_retraite IS NULL AND (a.date_de_naissance IS NULL OR DATE_PART('year', AGE(CURRENT_DATE, a.date_de_naissance)) < CASE WHEN g.libele IS NOT NULL AND UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65 ELSE 60 END))
                    OR (a.date_retraite IS NOT NULL AND a.date_retraite > CURRENT_DATE)
                )
                AND NOT (
                    a.id_type_d_agent = 1
                    AND a.date_de_naissance IS NOT NULL
                    AND g.libele IS NOT NULL
                    AND MAKE_DATE(
                        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER +
                        CASE WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65 ELSE 60 END,
                        12,
                        31
                    )::DATE < CURRENT_DATE::DATE
                )
            `;

            // Statistiques du ministère (agents actifs uniquement, excluant retirés et à la retraite)
            const statsQuery = `
                SELECT 
                    COUNT(DISTINCT a.id) FILTER (WHERE ${agentActifCondition}) as total_agents,
                    COUNT(DISTINCT CASE WHEN a.sexe = 'M' AND ${agentActifCondition} THEN a.id END) as hommes,
                    COUNT(DISTINCT CASE WHEN a.sexe = 'F' AND ${agentActifCondition} THEN a.id END) as femmes,
                    COUNT(DISTINCT ea.id) as total_entites,
                    AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.date_de_naissance))) FILTER (WHERE ${agentActifCondition}) as age_moyen,
                    (SELECT COUNT(*) FROM directions d WHERE d.id_ministere = $1) as nombre_directions,
                    (SELECT COUNT(*) FROM services s 
                     JOIN directions d ON s.id_direction = d.id 
                     WHERE d.id_ministere = $1) as nombre_services,
                    COUNT(DISTINCT CASE WHEN ta.id = 1 AND ${agentActifCondition} THEN a.id END) as fonctionnaires,
                    COUNT(DISTINCT CASE WHEN ta.id = 17 AND ${agentActifCondition} THEN a.id END) as articles_18,
                    COUNT(DISTINCT CASE WHEN ta.id = 16 AND ${agentActifCondition} THEN a.id END) as bnetd,
                    COUNT(DISTINCT CASE WHEN ta.id = 2 AND ${agentActifCondition} THEN a.id END) as contractuels,
                    COUNT(DISTINCT CASE WHEN ta.id = 1 AND a.sexe = 'M' AND ${agentActifCondition} THEN a.id END) as fonctionnaires_hommes,
                    COUNT(DISTINCT CASE WHEN ta.id = 1 AND a.sexe = 'F' AND ${agentActifCondition} THEN a.id END) as fonctionnaires_femmes,
                    COUNT(DISTINCT CASE WHEN ta.id = 17 AND a.sexe = 'M' AND ${agentActifCondition} THEN a.id END) as articles_18_hommes,
                    COUNT(DISTINCT CASE WHEN ta.id = 17 AND a.sexe = 'F' AND ${agentActifCondition} THEN a.id END) as articles_18_femmes,
                    COUNT(DISTINCT CASE WHEN ta.id = 16 AND a.sexe = 'M' AND ${agentActifCondition} THEN a.id END) as bnetd_hommes,
                    COUNT(DISTINCT CASE WHEN ta.id = 16 AND a.sexe = 'F' AND ${agentActifCondition} THEN a.id END) as bnetd_femmes,
                    COUNT(DISTINCT CASE WHEN ta.id = 2 AND a.sexe = 'M' AND ${agentActifCondition} THEN a.id END) as contractuels_hommes,
                    COUNT(DISTINCT CASE WHEN ta.id = 2 AND a.sexe = 'F' AND ${agentActifCondition} THEN a.id END) as contractuels_femmes
                FROM ministeres m
                LEFT JOIN agents a ON m.id = a.id_ministere
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN entites_administratives ea ON m.id = ea.id_ministere AND ea.is_active = true
                WHERE m.id = $1
            `;
            console.log('Calcul des statistiques...');
            const statsResult = await pool.query(statsQuery, [ministereId]);
            console.log('Statistiques calculées avec succès');

            // Convertir toutes les valeurs de statistiques en nombres pour éviter les problèmes de type
            const stats = statsResult.rows[0];
            const formattedStats = {
                total_agents: parseInt(stats.total_agents) || 0,
                hommes: parseInt(stats.hommes) || 0,
                femmes: parseInt(stats.femmes) || 0,
                total_entites: parseInt(stats.total_entites) || 0,
                age_moyen: parseFloat(stats.age_moyen) || 0,
                nombre_directions: parseInt(stats.nombre_directions) || 0,
                nombre_services: parseInt(stats.nombre_services) || 0,
                // Statistiques par type d'agent
                fonctionnaires: parseInt(stats.fonctionnaires) || 0,
                articles_18: parseInt(stats.articles_18) || 0,
                bnetd: parseInt(stats.bnetd) || 0,
                contractuels: parseInt(stats.contractuels) || 0,
                // Répartition par sexe pour chaque type
                fonctionnaires_hommes: parseInt(stats.fonctionnaires_hommes) || 0,
                fonctionnaires_femmes: parseInt(stats.fonctionnaires_femmes) || 0,
                articles_18_hommes: parseInt(stats.articles_18_hommes) || 0,
                articles_18_femmes: parseInt(stats.articles_18_femmes) || 0,
                bnetd_hommes: parseInt(stats.bnetd_hommes) || 0,
                bnetd_femmes: parseInt(stats.bnetd_femmes) || 0,
                contractuels_hommes: parseInt(stats.contractuels_hommes) || 0,
                contractuels_femmes: parseInt(stats.contractuels_femmes) || 0
            };
          
            res.json({
                success: true,
                data: {
                    ministere,
                    entites: entitesResult.rows,
                    agents: agentsResult.rows,
                    statistiques: formattedStats
                }
            });

        } catch (error) {
            console.error('=== ERREUR dans getByIdWithDetails ===');
            console.error('Type d\'erreur:', error.constructor.name);
            console.error('Message:', error.message);
            console.error('Stack trace:', error.stack);
            console.error('Code d\'erreur:', error.code);
            console.error('Détails:', error);
            
            // Vérifier si c'est une erreur de connexion à la base de données
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('connect')) {
                console.error('❌ Erreur de connexion à la base de données');
                return res.status(500).json({
                    success: false,
                    message: 'Erreur de connexion à la base de données',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            // Vérifier si c'est une erreur SQL
            if (error.code && (error.code.startsWith('2') || error.code.startsWith('3') || error.code.startsWith('4'))) {
                console.error('❌ Erreur SQL:', error.message);
                return res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la requête à la base de données',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Créer un nouveau ministère
    async create(req, res) {
        try {
            // Vérifier que seul un super_admin peut créer un ministère
            if (!req.user || req.user.role_nom !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Seuls les super administrateurs peuvent créer des ministères'
                });
            }

            const { nom, sigle, description, adresse, telephone, email, website, id_region, id_departement, id_localite, responsable_id } = req.body;

            // Validation des données
            if (!nom) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom est obligatoire'
                });
            }

            // Générer automatiquement le code
            const lastCodeResult = await pool.query(
                'SELECT code FROM ministeres WHERE code LIKE $1 ORDER BY code DESC LIMIT 1', ['MIN%']
            );

            let nextCode = 'MIN001';
            if (lastCodeResult.rows.length > 0) {
                const lastCode = lastCodeResult.rows[0].code;
                const lastNumber = parseInt(lastCode.replace('MIN', ''));
                nextCode = `MIN${String(lastNumber + 1).padStart(3, '0')}`;
            }

            // Vérifier que le responsable existe si spécifié
            if (responsable_id) {
                const responsableExists = await pool.query(
                    'SELECT id FROM agents WHERE id = $1 AND statut_emploi = \'actif\'', [responsable_id]
                );

                if (responsableExists.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le responsable spécifié n\'existe pas ou n\'est pas actif'
                    });
                }
            }

            // Créer le ministère
            const newMinistere = await pool.query(
                `INSERT INTO ministeres (code, nom, sigle, description, adresse, telephone, email, website, id_region, id_departement, id_localite, responsable_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                 RETURNING *`, [nextCode, nom, sigle, description, adresse, telephone, email, website, id_region, id_departement, id_localite, responsable_id]
            );

            res.status(201).json({
                success: true,
                message: 'Ministère créé avec succès',
                data: newMinistere.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création du ministère:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Mettre à jour un ministère
    async update(req, res) {
        try {
            const { id } = req.params;
            const { code, nom, sigle, description, adresse, telephone, email, website, is_active, id_region, id_departement, id_localite, responsable_id } = req.body;

            // Vérifier si le ministère existe
            const existingMinistere = await pool.query(
                'SELECT id FROM ministeres WHERE id = $1', [id]
            );

            if (existingMinistere.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ministère non trouvé'
                });
            }

            // Vérifier l'unicité du code si modifié
            if (code) {
                const existingCode = await pool.query(
                    'SELECT id FROM ministeres WHERE code = $1 AND id != $2', [code, id]
                );

                if (existingCode.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Un ministère avec ce code existe déjà'
                    });
                }
            }

            // Vérifier que le responsable existe si spécifié
            if (responsable_id) {
                const responsableExists = await pool.query(
                    'SELECT id FROM agents WHERE id = $1 AND statut_emploi = \'actif\'', [responsable_id]
                );

                if (responsableExists.rows.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Le responsable spécifié n\'existe pas ou n\'est pas actif'
                    });
                }
            }

            // Mettre à jour le ministère
            const updateQuery = `
                UPDATE ministeres 
                SET code = COALESCE($1, code),
                    nom = COALESCE($2, nom),
                    sigle = COALESCE($3, sigle),
                    description = COALESCE($4, description),
                    adresse = COALESCE($5, adresse),
                    telephone = COALESCE($6, telephone),
                    email = COALESCE($7, email),
                    website = COALESCE($8, website),
                    is_active = COALESCE($9, is_active),
                    id_region = COALESCE($10, id_region),
                    id_departement = COALESCE($11, id_departement),
                    id_localite = COALESCE($12, id_localite),
                    responsable_id = COALESCE($13, responsable_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $14
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [
                code, nom, sigle, description, adresse, telephone, email, website, is_active,
                id_region, id_departement, id_localite, responsable_id, id
            ]);

            res.json({
                success: true,
                message: 'Ministère mis à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour du ministère:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Supprimer un ministère (désactivation logique)
    async delete(req, res) {
        try {
            // Vérifier que seul un super_admin peut supprimer un ministère
            if (!req.user || req.user.role_nom !== 'super_admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Seuls les super administrateurs peuvent supprimer des ministères'
                });
            }

            const { id } = req.params;

            // Vérifier si le ministère a des entités ou des agents
            const hasDependencies = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM entites_administratives WHERE id_ministere = $1 AND is_active = true) as entites_count,
                    (SELECT COUNT(*) FROM agents WHERE id_ministere = $1 AND statut_emploi = 'actif') as agents_count
            `, [id]);

            const { entites_count, agents_count } = hasDependencies.rows[0];

            if (entites_count > 0 || agents_count > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Impossible de supprimer ce ministère. Il contient ${entites_count} entité(s) et ${agents_count} agent(s) actif(s).`,
                    data: { entites_count, agents_count }
                });
            }

            // Désactiver le ministère
            await pool.query(
                'UPDATE ministeres SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]
            );

            res.json({
                success: true,
                message: 'Ministère supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du ministère:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Obtenir les statistiques globales des ministères
    async getGlobalStats(req, res) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_ministeres,
                    COUNT(CASE WHEN is_active = true THEN 1 END) as ministeres_actifs,
                    COUNT(CASE WHEN is_active = false THEN 1 END) as ministeres_inactifs,
                    (SELECT COUNT(*) FROM entites_administratives WHERE is_active = true) as total_entites,
                    (SELECT COUNT(*) FROM agents WHERE statut_emploi = 'actif') as total_agents,
                    (SELECT COUNT(*) FROM directions) as nombre_directions,
                    (SELECT COUNT(*) FROM services) as nombre_services
                FROM ministeres
            `;

            const result = await pool.query(statsQuery);

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Obtenir la hiérarchie d'un ministère
    async getHierarchy(req, res) {
        try {
            const { id } = req.params;

            // Vérifier si le ministère existe
            const ministereQuery = 'SELECT * FROM ministeres WHERE id = $1 AND is_active = true';
            const ministereResult = await pool.query(ministereQuery, [id]);

            if (ministereResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Ministère non trouvé'
                });
            }

            const ministere = ministereResult.rows[0];

            // Récupérer la hiérarchie des entités
            const hierarchyQuery = `
                WITH RECURSIVE entite_hierarchy AS (
                    -- Entités de niveau 1 (racines)
                    SELECT 
                        ea.*,
                        1 as level,
                        ARRAY[ea.id] as path,
                        ea.nom as full_path
                    FROM entites_administratives ea
                    WHERE ea.id_ministere = $1 
                        AND ea.is_active = true 
                        AND ea.id_entite_parent IS NULL
                    
                    UNION ALL
                    
                    -- Entités enfants
                    SELECT 
                        ea.*,
                        eh.level + 1 as level,
                        eh.path || ea.id as path,
                        eh.full_path || ' > ' || ea.nom as full_path
                    FROM entites_administratives ea
                    INNER JOIN entite_hierarchy eh ON ea.id_entite_parent = eh.id
                    WHERE ea.is_active = true
                )
                SELECT 
                    eh.*,
                    COUNT(a.id) as nombre_agents
                FROM entite_hierarchy eh
                LEFT JOIN agents a ON eh.id = a.id_entite_principale AND a.statut_emploi != 'licencie' AND a.statut_emploi != 'demission'
                GROUP BY eh.id, eh.nom, eh.type_entite, eh.niveau_hierarchique, eh.level, eh.path, eh.full_path, eh.created_at, eh.updated_at, eh.is_active, eh.id_ministere, eh.id_entite_parent, eh.adresse, eh.telephone, eh.email
                ORDER BY eh.level, eh.niveau_hierarchique, eh.nom
            `;

            const hierarchyResult = await pool.query(hierarchyQuery, [id]);

            res.json({
                success: true,
                data: {
                    ministere,
                    hierarchy: hierarchyResult.rows
                }
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
}

module.exports = MinisteresController;