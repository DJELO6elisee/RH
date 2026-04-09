const db = require('../config/database');
const pool = require('../config/database');

class AgentsInstitutionsController {
    constructor() {
        this.tableName = 'agents_institutions_main';
        this.organizationField = 'id_institution';
        this.organizationTable = 'institutions';
        this.entitiesTable = 'entites_institutions';
    }

    // Méthode helper pour obtenir l'ID de l'institution de l'utilisateur
    async getUserInstitutionId(req) {
        if (req.user && req.user.id_agent) {
            try {
                const result = await pool.query(
                    `SELECT ${this.organizationField} FROM ${this.tableName} WHERE id = $1`,
                    [req.user.id_agent]
                );
                if (result.rows.length > 0) {
                    return result.rows[0][this.organizationField];
                }
            } catch (error) {
                console.error('Erreur lors de la récupération de l\'institution de l\'utilisateur:', error);
            }
        }
        return null;
    }

    // Condition SQL pour exclure les agents retirés et à la retraite
    getActiveAgentsExclusionCondition(agentAlias = 'a', gradeAlias = 'g') {
        return `
            (
                (${agentAlias}.retire IS NULL OR ${agentAlias}.retire = false)
                AND NOT (
                    ${agentAlias}.id_type_d_agent = 1
                    AND ${agentAlias}.date_de_naissance IS NOT NULL
                    AND ${gradeAlias}.libele IS NOT NULL
                    AND MAKE_DATE(
                        EXTRACT(YEAR FROM ${agentAlias}.date_de_naissance)::INTEGER + 
                        CASE 
                            WHEN UPPER(REPLACE(${gradeAlias}.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                            ELSE 60
                        END,
                        12,
                        31
                    )::DATE < CURRENT_DATE::DATE
                )
            )
        `;
    }

    // Récupérer tous les agents avec pagination et recherche
    async getAll(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                sortBy = 'created_at',
                sortOrder = 'DESC',
                id_institution,
                id_entite,
                type_agent,
                sexe,
                statut_emploi,
                for_select = false
            } = req.query;

            // Récupérer l'institution de l'utilisateur
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let query = `
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    sm.libele as situation_matrimoniale_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    i.nom as institution_nom,
                    ei.nom as entite_nom,
                    g.libele as grade_libele
                FROM ${this.tableName} a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN ${this.organizationTable} i ON a.${this.organizationField} = i.id
                LEFT JOIN ${this.entitiesTable} ei ON a.id_entite_principale = ei.id
                LEFT JOIN grades g ON a.id_grade = g.id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filtrage par institution
            if (institutionId) {
                query += ` AND a.${this.organizationField} = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            // Filtrage par entité
            if (id_entite) {
                query += ` AND a.id_entite_principale = $${paramIndex}`;
                params.push(id_entite);
                paramIndex++;
            }

            // Filtrage par type d'agent
            if (type_agent) {
                query += ` AND a.id_type_d_agent = $${paramIndex}`;
                params.push(type_agent);
                paramIndex++;
            }

            // Filtrage par sexe
            if (sexe) {
                query += ` AND a.sexe = $${paramIndex}`;
                params.push(sexe);
                paramIndex++;
            }

            // Filtrage par statut emploi
            if (statut_emploi) {
                query += ` AND a.statut_emploi = $${paramIndex}`;
                params.push(statut_emploi);
                paramIndex++;
            }

            // Recherche globale
            if (search) {
                query += ` AND (
                    a.nom ILIKE $${paramIndex} OR 
                    a.prenom ILIKE $${paramIndex} OR 
                    a.matricule ILIKE $${paramIndex} OR
                    a.email ILIKE $${paramIndex}
                )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Exclure les agents retirés et à la retraite si ce n'est pas pour une sélection
            if (!for_select) {
                query += ` AND ${this.getActiveAgentsExclusionCondition('a', 'g')}`;
            }

            // Comptage total
            const countQuery = query.replace(/SELECT .*FROM/, 'SELECT COUNT(*) FROM');
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);

            // Tri et pagination
            query += ` ORDER BY a.${sortBy} ${sortOrder}`;
            
            if (!for_select) {
                const offset = (page - 1) * limit;
                query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
                params.push(limit, offset);
            }

            const result = await pool.query(query, params);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer un agent par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(`
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    sm.libele as situation_matrimoniale_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    i.nom as institution_nom,
                    ei.nom as entite_nom,
                    cat.libele as categorie_libele,
                    ga_actuelle.grade_libele as grade_libele,
                    ech_actuelle.echelon_libele as echelon_libele
                FROM ${this.tableName} a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN situation_matrimonials sm ON a.id_situation_matrimoniale = sm.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN ${this.organizationTable} i ON a.${this.organizationField} = i.id
                LEFT JOIN ${this.entitiesTable} ei ON a.id_entite_principale = ei.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE a.id = $1
            `, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Agent non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Créer un nouvel agent
    async create(req, res) {
        try {
            const agentData = req.body;

            // Validation
            if (!agentData.nom || !agentData.prenom || !agentData.matricule || !agentData[this.organizationField]) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nom, prénom, matricule et institution sont obligatoires'
                });
            }

            // Vérifier l'unicité du matricule
            const existingMatricule = await pool.query(
                `SELECT id FROM ${this.tableName} WHERE matricule = $1`,
                [agentData.matricule]
            );

            if (existingMatricule.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Un agent avec ce matricule existe déjà'
                });
            }

            // Construire la requête d'insertion dynamiquement
            const fields = Object.keys(agentData);
            const values = Object.values(agentData);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
            
            const query = `
                INSERT INTO ${this.tableName} (${fields.join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;

            const result = await pool.query(query, values);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Mettre à jour un agent
    async update(req, res) {
        try {
            const { id } = req.params;
            const agentData = req.body;

            // Vérifier l'unicité du matricule si modifié
            if (agentData.matricule) {
                const existingMatricule = await pool.query(
                    `SELECT id FROM ${this.tableName} WHERE matricule = $1 AND id != $2`,
                    [agentData.matricule, id]
                );

                if (existingMatricule.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Un agent avec ce matricule existe déjà'
                    });
                }
            }

            // Construire la requête de mise à jour dynamiquement
            const fields = Object.keys(agentData);
            const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
            
            const query = `
                UPDATE ${this.tableName} 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${fields.length + 1}
                RETURNING *
            `;

            const values = [...Object.values(agentData), id];
            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Agent non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Supprimer un agent
    async delete(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Agent non trouvé' });
            }

            res.json({ success: true, message: 'Agent supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Recherche avancée
    async searchAdvanced(req, res) {
        try {
            const {
                nom, prenom, matricule, civilite, nationalite, type_agent,
                sexe, age_min, age_max, date_naissance_debut, date_naissance_fin,
                id_institution
            } = req.query;

            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let query = `
                SELECT 
                    a.*,
                    c.libele as civilite_libele,
                    n.libele as nationalite_libele,
                    ta.libele as type_agent_libele,
                    i.nom as institution_nom
                FROM ${this.tableName} a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN nationalites n ON a.id_nationalite = n.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN ${this.organizationTable} i ON a.${this.organizationField} = i.id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (institutionId) {
                query += ` AND a.${this.organizationField} = $${paramIndex}`;
                params.push(institutionId);
                paramIndex++;
            }

            if (nom) {
                query += ` AND a.nom ILIKE $${paramIndex}`;
                params.push(`%${nom}%`);
                paramIndex++;
            }

            if (prenom) {
                query += ` AND a.prenom ILIKE $${paramIndex}`;
                params.push(`%${prenom}%`);
                paramIndex++;
            }

            if (matricule) {
                query += ` AND a.matricule ILIKE $${paramIndex}`;
                params.push(`%${matricule}%`);
                paramIndex++;
            }

            if (civilite) {
                query += ` AND a.id_civilite = $${paramIndex}`;
                params.push(civilite);
                paramIndex++;
            }

            if (nationalite) {
                query += ` AND a.id_nationalite = $${paramIndex}`;
                params.push(nationalite);
                paramIndex++;
            }

            if (type_agent) {
                query += ` AND a.id_type_d_agent = $${paramIndex}`;
                params.push(type_agent);
                paramIndex++;
            }

            if (sexe) {
                query += ` AND a.sexe = $${paramIndex}`;
                params.push(sexe);
                paramIndex++;
            }

            if (age_min) {
                query += ` AND a.age >= $${paramIndex}`;
                params.push(parseInt(age_min));
                paramIndex++;
            }

            if (age_max) {
                query += ` AND a.age <= $${paramIndex}`;
                params.push(parseInt(age_max));
                paramIndex++;
            }

            if (date_naissance_debut) {
                query += ` AND a.date_de_naissance >= $${paramIndex}`;
                params.push(date_naissance_debut);
                paramIndex++;
            }

            if (date_naissance_fin) {
                query += ` AND a.date_de_naissance <= $${paramIndex}`;
                params.push(date_naissance_fin);
                paramIndex++;
            }

            query += ` ORDER BY a.nom, a.prenom`;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la recherche avancée:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Statistiques des agents
    async getStats(req, res) {
        try {
            const { id_institution } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            const stats = {};
            const exclusionCondition = this.getActiveAgentsExclusionCondition('a', 'g');

            let whereClause = `WHERE ${exclusionCondition}`;
            const params = [];
            
            if (institutionId) {
                whereClause += ` AND a.${this.organizationField} = $1`;
                params.push(institutionId);
            }

            // Total des agents
            const totalResult = await pool.query(`
                SELECT COUNT(*) 
                FROM ${this.tableName} a
                LEFT JOIN grades g ON a.id_grade = g.id
                ${whereClause}
            `, params);
            stats.total = parseInt(totalResult.rows[0].count);

            // Par sexe
            const sexeResult = await pool.query(`
                SELECT a.sexe, COUNT(*) 
                FROM ${this.tableName} a
                LEFT JOIN grades g ON a.id_grade = g.id
                ${whereClause}
                GROUP BY a.sexe
            `, params);
            stats.par_sexe = sexeResult.rows;

            // Par type d'agent
            const typeResult = await pool.query(`
                SELECT ta.libele, COUNT(*) 
                FROM ${this.tableName} a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                ${whereClause}
                GROUP BY ta.libele
            `, params);
            stats.par_type = typeResult.rows;

            // Par statut emploi
            const statutResult = await pool.query(`
                SELECT a.statut_emploi, COUNT(*) 
                FROM ${this.tableName} a
                LEFT JOIN grades g ON a.id_grade = g.id
                ${whereClause}
                GROUP BY a.statut_emploi
            `, params);
            stats.par_statut = statutResult.rows;

            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Statistiques par type d'agent
    async getStatsByType(req, res) {
        try {
            const { id_institution } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            const exclusionCondition = this.getActiveAgentsExclusionCondition('a', 'g');
            
            let whereClause = `WHERE ${exclusionCondition}`;
            const params = [];
            
            if (institutionId) {
                whereClause += ` AND a.${this.organizationField} = $1`;
                params.push(institutionId);
            }

            const result = await pool.query(`
                SELECT 
                    ta.libele as type_agent,
                    COUNT(*) as count,
                    COUNT(CASE WHEN a.sexe = 'M' THEN 1 END) as hommes,
                    COUNT(CASE WHEN a.sexe = 'F' THEN 1 END) as femmes
                FROM ${this.tableName} a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                ${whereClause}
                GROUP BY ta.libele
                ORDER BY count DESC
            `, params);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques par type:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Rapport hiérarchique
    async getHierarchicalReport(req, res) {
        try {
            let { id_institution } = req.query;
            
            // Si id_institution est un tableau (plusieurs paramètres du même nom), prendre le dernier
            if (Array.isArray(id_institution)) {
                id_institution = id_institution[id_institution.length - 1];
                console.log(`⚠️ Plusieurs id_institution reçus, utilisation du dernier: ${id_institution}`);
            }
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            const exclusionCondition = this.getActiveAgentsExclusionCondition('a', 'g');
            
            let whereClause = `WHERE ${exclusionCondition}`;
            const params = [];
            
            if (institutionId) {
                whereClause += ` AND a.${this.organizationField} = $1`;
                params.push(institutionId);
            }

            const result = await pool.query(`
                SELECT 
                    a.*,
                    i.nom as institution_nom,
                    ei.nom as entite_nom,
                    ta.libele as type_agent_libele,
                    g.libele as grade_libele
                FROM ${this.tableName} a
                LEFT JOIN ${this.organizationTable} i ON a.${this.organizationField} = i.id
                LEFT JOIN ${this.entitiesTable} ei ON a.id_entite_principale = ei.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN grades g ON a.id_grade = g.id
                ${whereClause}
                ORDER BY ei.nom, a.nom, a.prenom
            `, params);

            res.set('Cache-Control', 'private, no-store, no-cache, must-revalidate');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la génération du rapport hiérarchique:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Anniversaires à venir
    async getUpcomingBirthdays(req, res) {
        try {
            const { days = 30, id_institution } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            const exclusionCondition = this.getActiveAgentsExclusionCondition('a', 'g');
            
            let whereClause = `WHERE ${exclusionCondition}`;
            const params = [days];
            
            if (institutionId) {
                whereClause += ` AND a.${this.organizationField} = $2`;
                params.push(institutionId);
            }

            const result = await pool.query(`
                SELECT 
                    a.*,
                    i.nom as institution_nom,
                    EXTRACT(DAY FROM a.date_de_naissance) as jour,
                    EXTRACT(MONTH FROM a.date_de_naissance) as mois,
                    DATE_PART('year', AGE(CURRENT_DATE, a.date_de_naissance)) as age_actuel
                FROM ${this.tableName} a
                LEFT JOIN ${this.organizationTable} i ON a.${this.organizationField} = i.id
                LEFT JOIN grades g ON a.id_grade = g.id
                ${whereClause}
                AND a.date_de_naissance IS NOT NULL
                AND (
                    (EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM a.date_de_naissance)
                     AND EXTRACT(DAY FROM a.date_de_naissance) >= EXTRACT(DAY FROM CURRENT_DATE))
                    OR
                    (EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1' * $1 * INTERVAL '1 day') >= EXTRACT(MONTH FROM a.date_de_naissance)
                     AND EXTRACT(MONTH FROM CURRENT_DATE) < EXTRACT(MONTH FROM a.date_de_naissance))
                )
                ORDER BY 
                    EXTRACT(MONTH FROM a.date_de_naissance),
                    EXTRACT(DAY FROM a.date_de_naissance)
            `, params);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des anniversaires:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Statistiques des retraites
    async getRetirementStats(req, res) {
        try {
            const { id_institution } = req.query;
            const userInstitutionId = await this.getUserInstitutionId(req);
            const institutionId = id_institution || userInstitutionId;

            let whereClause = 'WHERE a.date_de_naissance IS NOT NULL';
            const params = [];
            
            if (institutionId) {
                whereClause += ` AND a.${this.organizationField} = $1`;
                params.push(institutionId);
            }

            const result = await pool.query(`
                SELECT 
                    COUNT(*) FILTER (
                        WHERE MAKE_DATE(
                            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 60,
                            12, 31
                        ) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 year'
                    ) as retraites_1_an,
                    COUNT(*) FILTER (
                        WHERE MAKE_DATE(
                            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 60,
                            12, 31
                        ) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 years'
                    ) as retraites_2_ans,
                    COUNT(*) FILTER (
                        WHERE MAKE_DATE(
                            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 60,
                            12, 31
                        ) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '5 years'
                    ) as retraites_5_ans
                FROM ${this.tableName} a
                LEFT JOIN grades g ON a.id_grade = g.id
                ${whereClause}
                AND ${this.getActiveAgentsExclusionCondition('a', 'g')}
            `, params);

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques de retraite:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer les enfants d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            const result = await pool.query(`
                SELECT 
                    e.*,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule
                FROM enfants_institutions e
                LEFT JOIN ${this.tableName} a ON e.id_agent = a.id
                WHERE e.id_agent = $1 
                ORDER BY e.date_naissance DESC
            `, [agentId]);

            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des enfants de l\'agent:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }
}

module.exports = new AgentsInstitutionsController();
