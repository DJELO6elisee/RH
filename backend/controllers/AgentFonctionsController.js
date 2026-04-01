const BaseController = require('./BaseController');
const pool = require('../config/database');

class AgentFonctionsController extends BaseController {
    constructor() {
        super('agent_fonctions');
    }

    // Récupérer toutes les fonctions d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;

            console.log(`📥 Récupération des fonctions pour l'agent ${agentId}`);

            // Vérifier d'abord si l'agent existe
            const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [agentId]);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            // Utiliser LEFT JOIN pour éviter les erreurs si les tables n'existent pas ou sont vides
            // Essayer d'abord agent_fonctions, puis fonction_agents si la première n'existe pas
            // IMPORTANT: La table fonctions n'a PAS de colonne libele_court, seulement libele
            let query = `
                SELECT 
                    af.*,
                    COALESCE(f.libele, af.designation, 'N/A') as fonction_nom,
                    f.libele as fonction_libele,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule
                FROM agent_fonctions af
                LEFT JOIN fonctions f ON af.id_fonction = f.id
                LEFT JOIN agents a ON af.id_agent = a.id
                WHERE af.id_agent = $1
                ORDER BY COALESCE(af.date_entree, af.created_at) DESC
            `;
            
            let result;
            try {
                result = await pool.query(query, [agentId]);
            } catch (error) {
                // Si agent_fonctions n'existe pas, essayer fonction_agents
                if (error.message && error.message.includes('does not exist')) {
                    console.log(`⚠️ Table agent_fonctions n'existe pas, essai avec fonction_agents`);
                    query = `
                        SELECT 
                            fa.*,
                            COALESCE(f.libele, fa.designation_poste, 'N/A') as fonction_nom,
                            f.libele as fonction_libele,
                            a.nom as agent_nom,
                            a.prenom as agent_prenom,
                            a.matricule
                        FROM fonction_agents fa
                        LEFT JOIN fonctions f ON fa.id_fonction = f.id
                        LEFT JOIN agents a ON fa.id_agent = a.id
                        WHERE fa.id_agent = $1
                        ORDER BY COALESCE(fa.date_entree, fa.created_at) DESC
                    `;
                    try {
                        result = await pool.query(query, [agentId]);
                    } catch (secondError) {
                        console.error('❌ Erreur avec fonction_agents aussi:', secondError);
                        throw secondError;
                    }
                } else if (error.message && error.message.includes('libele_court')) {
                    // Si l'erreur mentionne libele_court, c'est qu'il y a un problème de cache ou de code obsolète
                    console.error('❌ Erreur: référence à libele_court détectée. Le code doit être mis à jour.');
                    console.error('Détails:', error.message);
                    throw new Error('Erreur de configuration: la colonne libele_court n\'existe pas dans la table fonctions. Veuillez redémarrer le serveur.');
                } else {
                    throw error;
                }
            }

            console.log(`✅ ${result.rows.length} fonction(s) trouvée(s) pour l'agent ${agentId}`);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des fonctions de l\'agent:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des fonctions de l\'agent',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer tous les agents avec leurs fonctions (pour la liste)
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

            // Requête pour récupérer tous les agents du ministère avec leurs fonctions
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
                    COALESCE(fonctions_counts.nb_fonctions, 0) as nb_fonctions,
                    fonctions_counts.derniere_fonction_date,
                    fonctions_counts.derniere_fonction_nom,
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
                        af.id_agent,
                        COUNT(af.id) as nb_fonctions,
                        MAX(COALESCE(af.date_entree, af.created_at)) as derniere_fonction_date,
                        -- Dernière fonction (la plus récente par date)
                        (
                            SELECT COALESCE(f2.libele, af2.designation, 'N/A')
                            FROM agent_fonctions af2
                            LEFT JOIN fonctions f2 ON af2.id_fonction = f2.id
                            WHERE af2.id_agent = af.id_agent
                            ORDER BY COALESCE(af2.date_entree, af2.created_at) DESC
                            LIMIT 1
                        ) as derniere_fonction_nom
                    FROM agent_fonctions af
                    GROUP BY af.id_agent
                ) fonctions_counts ON a.id = fonctions_counts.id_agent
                ${whereClause}
                ORDER BY a.nom, a.prenom
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
            `;

            queryParams.push(limit, offset);

            let result;
            try {
                result = await pool.query(query, queryParams);
            } catch (error) {
                // Si agent_fonctions n'existe pas, essayer avec fonction_agents
                if (error.message && error.message.includes('does not exist')) {
                    console.log(`⚠️ Table agent_fonctions n'existe pas, essai avec fonction_agents`);
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
                            COALESCE(fonctions_counts.nb_fonctions, 0) as nb_fonctions,
                            fonctions_counts.derniere_fonction_date,
                            fonctions_counts.derniere_fonction_nom,
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
                                fa.id_agent,
                                COUNT(fa.id) as nb_fonctions,
                                MAX(COALESCE(fa.date_entree, fa.created_at)) as derniere_fonction_date,
                                -- Dernière fonction (la plus récente par date)
                                (
                                    SELECT COALESCE(f2.libele, fa2.designation_poste, 'N/A')
                                    FROM fonction_agents fa2
                                    LEFT JOIN fonctions f2 ON fa2.id_fonction = f2.id
                                    WHERE fa2.id_agent = fa.id_agent
                                    ORDER BY COALESCE(fa2.date_entree, fa2.created_at) DESC
                                    LIMIT 1
                                ) as derniere_fonction_nom
                            FROM fonction_agents fa
                            GROUP BY fa.id_agent
                        ) fonctions_counts ON a.id = fonctions_counts.id_agent
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

    // Créer une nouvelle fonction pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_fonction, date_entree, designation, acte_nomination } = req.body;

            // Validation des données obligatoires
            if (!id_agent || !id_fonction || !date_entree || !designation) {
                return res.status(400).json({
                    success: false,
                    error: 'Les champs agent, fonction, date d\'entrée et désignation sont obligatoires'
                });
            }

            const query = `
                INSERT INTO agent_fonctions (id_agent, id_fonction, date_entree, designation, acte_nomination, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const result = await pool.query(query, [
                id_agent,
                id_fonction,
                date_entree,
                designation,
                acte_nomination || null,
                req.user ? req.user.id_agent : null
            ]);

            res.status(201).json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la création de la fonction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de la fonction'
            });
        }
    }

    // Mettre à jour une fonction
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_fonction, date_entree, designation, acte_nomination } = req.body;

            const query = `
                UPDATE agent_fonctions 
                SET id_fonction = $1, date_entree = $2, designation = $3, acte_nomination = $4, updated_by = $5
                WHERE id = $6
                RETURNING *
            `;

            const result = await pool.query(query, [
                id_fonction,
                date_entree,
                designation,
                acte_nomination || null,
                req.user ? req.user.id_agent : null,
                id
            ]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Fonction non trouvée'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la fonction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la mise à jour de la fonction'
            });
        }
    }

    // Supprimer une fonction
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query('DELETE FROM agent_fonctions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Fonction non trouvée'
                });
            }

            res.json({
                success: true,
                message: 'Fonction supprimée avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la suppression de la fonction:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression de la fonction'
            });
        }
    }
}

module.exports = new AgentFonctionsController();