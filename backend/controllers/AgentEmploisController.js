const BaseController = require('./BaseController');
const pool = require('../config/database');

class AgentEmploisController extends BaseController {
    constructor() {
        super('agent_emplois');
    }

    // Récupérer tous les emplois d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;

            console.log(`📥 Récupération des emplois pour l'agent ${agentId}`);

            // Vérifier d'abord si l'agent existe
            const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [agentId]);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            // Utiliser LEFT JOIN pour éviter les erreurs si les tables n'existent pas ou sont vides
            // Essayer d'abord agent_emplois, puis emploi_agents si la première n'existe pas
            let query = `
                SELECT 
                    ae.*,
                    COALESCE(e.libele, ae.designation_poste, 'N/A') as emploi_nom,
                    e.libele as emploi_libele,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule
                FROM agent_emplois ae
                LEFT JOIN emplois e ON ae.id_emploi = e.id
                LEFT JOIN agents a ON ae.id_agent = a.id
                WHERE ae.id_agent = $1
                ORDER BY COALESCE(ae.date_nomination_emploi, ae.date_entree, ae.created_at) DESC
            `;
            
            let result;
            try {
                result = await pool.query(query, [agentId]);
            } catch (error) {
                // Si agent_emplois n'existe pas, essayer emploi_agents
                if (error.message && error.message.includes('does not exist')) {
                    console.log(`⚠️ Table agent_emplois n'existe pas, essai avec emploi_agents`);
                    query = `
                        SELECT 
                            ea.*,
                            COALESCE(e.libele, ea.designation_poste, 'N/A') as emploi_nom,
                            e.libele as emploi_libele,
                            a.nom as agent_nom,
                            a.prenom as agent_prenom,
                            a.matricule
                        FROM emploi_agents ea
                        LEFT JOIN emplois e ON ea.id_emploi = e.id
                        LEFT JOIN agents a ON ea.id_agent = a.id
                        WHERE ea.id_agent = $1
                        ORDER BY COALESCE(ea.date_entree, ea.created_at) DESC
                    `;
                    result = await pool.query(query, [agentId]);
                } else {
                    throw error;
                }
            }

            console.log(`✅ ${result.rows.length} emploi(s) trouvé(s) pour l'agent ${agentId}`);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des emplois de l\'agent:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des emplois de l\'agent',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer tous les agents avec leurs emplois (pour la liste)
    async getAllWithAgentInfo(req, res) {
        try {
            const {
                page = 1,
                    limit = 10,
                    search,
                    ministere_id
            } = req.query;

            const offset = (page - 1) * limit;

            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = ministere_id;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                }
            }

            let whereConditions = [];
            let queryParams = [];

            // Exclure les agents à la retraite et les agents retirés
            whereConditions.push(`(a.statut_emploi IS NULL OR LOWER(a.statut_emploi) != 'retraite')`);
            whereConditions.push(`(a.retire IS NULL OR a.retire = false)`);

            if (userMinistereId) {
                whereConditions.push(`a.id_ministere = $${queryParams.length + 1}`);
                queryParams.push(userMinistereId);
            }

            if (search) {
                whereConditions.push(`(a.nom ILIKE $${queryParams.length + 1} OR a.prenom ILIKE $${queryParams.length + 2} OR a.matricule ILIKE $${queryParams.length + 3})`);
                queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Requête pour récupérer tous les agents du ministère avec leurs emplois
            // Utiliser une sous-requête pour récupérer tous les noms d'emplois de chaque agent
            const query = `
                SELECT 
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.email,
                    a.telephone1,
                    f.libele as fonction_actuelle,
                    emp.libele as emploi_actuel,
                    g.libele as grade_actuel,
                    COALESCE(emplois_counts.nb_emplois, 0) as nb_emplois,
                    emplois_counts.dernier_emploi_date,
                    emplois_counts.dernier_emploi_nom,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        ELSE a.statut_emploi
                    END as statut_emploi_libelle
                FROM agents a
                LEFT JOIN fonctions f ON a.id_fonction = f.id
                LEFT JOIN emplois emp ON a.id_emploi = emp.id
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN (
                    SELECT 
                        ea.id_agent,
                        COUNT(ea.id) as nb_emplois,
                        MAX(COALESCE(ea.date_entree, ea.created_at)) as dernier_emploi_date,
                        -- Dernier emploi (le plus récent par date)
                        (
                            SELECT COALESCE(e2.libele, ea2.designation_poste, 'N/A')
                            FROM emploi_agents ea2
                            LEFT JOIN emplois e2 ON ea2.id_emploi = e2.id
                            WHERE ea2.id_agent = ea.id_agent
                            ORDER BY COALESCE(ea2.date_entree, ea2.created_at) DESC
                            LIMIT 1
                        ) as dernier_emploi_nom
                    FROM emploi_agents ea
                    GROUP BY ea.id_agent
                ) emplois_counts ON a.id = emplois_counts.id_agent
                ${whereClause}
                ORDER BY a.nom, a.prenom
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
            `;

            queryParams.push(limit, offset);

            let result;
            try {
                result = await pool.query(query, queryParams);
            } catch (error) {
                // Si emploi_agents n'existe pas, essayer avec agent_emplois
                if (error.message && error.message.includes('does not exist')) {
                    console.log(`⚠️ Table emploi_agents n'existe pas, essai avec agent_emplois`);
                    const fallbackQuery = `
                        SELECT 
                            a.id,
                            a.nom,
                            a.prenom,
                            a.matricule,
                            a.email,
                            a.telephone1,
                            f.libele as fonction_actuelle,
                            emp.libele as emploi_actuel,
                            g.libele as grade_actuel,
                            COALESCE(emplois_counts.nb_emplois, 0) as nb_emplois,
                            emplois_counts.dernier_emploi_date,
                            emplois_counts.dernier_emploi_nom,
                            CASE 
                                WHEN a.statut_emploi = 'actif' THEN 'Actif'
                                WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                                WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                                WHEN a.statut_emploi = 'demission' THEN 'Démission'
                                WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                                ELSE a.statut_emploi
                            END as statut_emploi_libelle
                        FROM agents a
                        LEFT JOIN fonctions f ON a.id_fonction = f.id
                        LEFT JOIN emplois emp ON a.id_emploi = emp.id
                        LEFT JOIN grades g ON a.id_grade = g.id
                        LEFT JOIN (
                            SELECT 
                                ae.id_agent,
                                COUNT(ae.id) as nb_emplois,
                                MAX(COALESCE(ae.date_nomination_emploi, ae.date_entree, ae.created_at)) as dernier_emploi_date,
                                -- Dernier emploi (le plus récent par date)
                                (
                                    SELECT COALESCE(e2.libele, ae2.designation_poste, 'N/A')
                                    FROM agent_emplois ae2
                                    LEFT JOIN emplois e2 ON ae2.id_emploi = e2.id
                                    WHERE ae2.id_agent = ae.id_agent
                                    ORDER BY COALESCE(ae2.date_nomination_emploi, ae2.date_entree, ae2.created_at) DESC
                                    LIMIT 1
                                ) as dernier_emploi_nom
                            FROM agent_emplois ae
                            GROUP BY ae.id_agent
                        ) emplois_counts ON a.id = emplois_counts.id_agent
                        ${whereClause}
                        ORDER BY a.nom, a.prenom
                        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
                    `;
                    result = await pool.query(fallbackQuery, queryParams);
                } else {
                    throw error;
                }
            }

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM agents a
                ${whereClause}
            `;

            const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(countResult.rows[0].total / limit),
                    totalItems: parseInt(countResult.rows[0].total),
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des agents'
            });
        }
    }

    // Créer un nouvel emploi pour un agent
    async create(req, res) {
        try {
            const {
                id_agent,
                id_emploi,
                date_nomination_emploi,
                nature_emploi,
                numero_acte_nomination,
                date_premiere_prise_service
            } = req.body;

            // Validation des données obligatoires
            if (!id_agent || !id_emploi || !date_nomination_emploi || !nature_emploi || !date_premiere_prise_service) {
                return res.status(400).json({
                    success: false,
                    error: 'Tous les champs sont obligatoires'
                });
            }

            const query = `
                INSERT INTO agent_emplois (
                    id_agent, 
                    id_emploi, 
                    date_nomination_emploi, 
                    nature_emploi, 
                    numero_acte_nomination, 
                    date_premiere_prise_service,
                    created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const result = await pool.query(query, [
                id_agent,
                id_emploi,
                date_nomination_emploi,
                nature_emploi,
                numero_acte_nomination || null,
                date_premiere_prise_service,
                req.user ? req.user.id_agent : null
            ]);

            res.status(201).json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la création de l\'emploi:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de l\'emploi'
            });
        }
    }

    // Mettre à jour un emploi
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                id_emploi,
                date_nomination_emploi,
                nature_emploi,
                numero_acte_nomination,
                date_premiere_prise_service
            } = req.body;

            const query = `
                UPDATE agent_emplois 
                SET 
                    id_emploi = $1, 
                    date_nomination_emploi = $2, 
                    nature_emploi = $3, 
                    numero_acte_nomination = $4, 
                    date_premiere_prise_service = $5,
                    updated_by = $6
                WHERE id = $7
                RETURNING *
            `;

            const result = await pool.query(query, [
                id_emploi,
                date_nomination_emploi,
                nature_emploi,
                numero_acte_nomination || null,
                date_premiere_prise_service,
                req.user ? req.user.id_agent : null,
                id
            ]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Emploi non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'emploi:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la mise à jour de l\'emploi'
            });
        }
    }

    // Supprimer un emploi
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query('DELETE FROM agent_emplois WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Emploi non trouvé'
                });
            }

            res.json({
                success: true,
                message: 'Emploi supprimé avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'emploi:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression de l\'emploi'
            });
        }
    }
}

module.exports = new AgentEmploisController();