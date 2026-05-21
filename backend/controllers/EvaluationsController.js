const BaseController = require('./BaseController');
const pool = require('../config/database');

class EvaluationsController extends BaseController {
    constructor() {
        super('module_evaluation');
    }

    getRetirementExclusionCondition(agentAlias = 'a', gradeAlias = 'g') {
        return `
            (
                (
                    ${agentAlias}.date_retraite IS NULL
                    AND (
                        ${agentAlias}.date_de_naissance IS NULL
                        OR DATE_PART('year', AGE(CURRENT_DATE, ${agentAlias}.date_de_naissance)) <
                            CASE
                                WHEN ${gradeAlias}.libele IS NOT NULL AND UPPER(${gradeAlias}.libele) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                                ELSE 60
                            END
                    )
                )
                OR (${agentAlias}.date_retraite IS NOT NULL AND ${agentAlias}.date_retraite > CURRENT_DATE)
            )
        `;
    }

    // Récupérer toutes les évaluations (ou agents non notés) avec les détails des agents
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search, annee, sortBy, sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            const selectedAnnee = annee ? parseInt(annee, 10) : new Date().getFullYear();
            const params = [selectedAnnee];
            const whereConditions = [];

            let query = `
                SELECT 
                    a.id AS id_agent,
                    a.nom AS agent_nom,
                    a.prenom AS agent_prenom,
                    a.matricule AS agent_matricule,
                    e.id,
                    COALESCE(e.annee, $1)::integer AS annee,
                    COALESCE(e.note_assiduite, 0.0) AS note_assiduite,
                    e.comment_assiduite,
                    COALESCE(e.note_initiative, 0.0) AS note_initiative,
                    e.comment_initiative,
                    COALESCE(e.note_equipe, 0.0) AS note_equipe,
                    e.comment_equipe,
                    COALESCE(e.note_rendement, 0.0) AS note_rendement,
                    e.comment_rendement,
                    COALESCE(e.note_discipline, 0.0) AS note_discipline,
                    e.comment_discipline,
                    COALESCE(e.note_finale, 0.0) AS note_finale,
                    e.comment_general,
                    e.created_at,
                    e.updated_at
                FROM agents a
                LEFT JOIN module_evaluation e ON e.id_agent = a.id AND e.annee = $1
                LEFT JOIN grades g ON a.id_grade = g.id
            `;

            let countQuery = `
                SELECT COUNT(*) 
                FROM agents a
                LEFT JOIN module_evaluation e ON e.id_agent = a.id AND e.annee = $1
                LEFT JOIN grades g ON a.id_grade = g.id
            `;

            // Recherche sur le nom, prénom ou matricule de l'agent
            if (search) {
                const searchCondition = `(
                    a.nom ILIKE $${params.length + 1} OR 
                    a.prenom ILIKE $${params.length + 1} OR 
                    a.matricule ILIKE $${params.length + 1}
                )`;
                whereConditions.push(searchCondition);
                params.push(`%${search}%`);
            }

            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = null;
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

            if (!userMinistereId && req.user && req.user.id_ministere) {
                userMinistereId = req.user.id_ministere;
            }

            // Filtrer par ministère - priorité au paramètre de la requête, sinon ministère de l'utilisateur
            let reqMinistereId = req.query.id_ministere;
            if (Array.isArray(reqMinistereId)) {
                reqMinistereId = reqMinistereId[reqMinistereId.length - 1];
            }
            let ministereId = reqMinistereId || userMinistereId;

            if (req.user && req.user.role && req.user.role.toLowerCase() === 'drh') {
                ministereId = userMinistereId;
            }

            if (ministereId) {
                whereConditions.push(`a.id_ministere = $${params.length + 1}`);
                params.push(ministereId);
            }

            // Toujours exclure les agents ayant atteint l'âge de la retraite
            whereConditions.push(this.getRetirementExclusionCondition('a', 'g'));

            // Exclure les retraités (statut_emploi)
            whereConditions.push(`(a.statut_emploi IS NULL OR LOWER(TRIM(COALESCE(a.statut_emploi, ''))) <> 'retraite')`);

            // Vérifier si la colonne "retire" existe pour exclure les agents retirés manuellement
            const columnExists = async (tableName, columnName) => {
                try {
                    const result = await pool.query(
                        `SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = $1 
                            AND column_name = $2
                        )`, [tableName, columnName]
                    );
                    return result.rows[0].exists;
                } catch (error) {
                    return false;
                }
            };

            const retireColumnExists = await columnExists('agents', 'retire');
            if (retireColumnExists) {
                whereConditions.push('COALESCE(a.retire, false) = false');
            }

            // Ajouter les conditions WHERE si nécessaire
            if (whereConditions.length > 0) {
                const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
                query += ` ${whereClause}`;
                countQuery += ` ${whereClause}`;
            }

            // Tri
            if (sortBy) {
                let sortCol = sortBy;
                if (['nom', 'prenom', 'matricule'].includes(sortBy)) {
                    sortCol = `a.${sortBy}`;
                } else if (['id', 'annee', 'note_finale', 'created_at', 'updated_at'].includes(sortBy)) {
                    sortCol = `e.${sortBy}`;
                }
                query += ` ORDER BY ${sortCol} ${sortOrder.toUpperCase()}`;
            } else {
                query += ` ORDER BY a.nom ASC, a.prenom ASC`;
            }

            // Pagination
            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit, 10), offset);

            const [result, countResult] = await Promise.all([
                pool.query(query, params),
                pool.query(countQuery, params.slice(0, -2))
            ]);

            const totalCount = parseInt(countResult.rows[0].count, 10);
            const totalPages = Math.ceil(totalCount / limit);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages,
                    totalCount,
                    limit: parseInt(limit, 10)
                }
            });
        } catch (error) {
            console.error(`Erreur lors de la récupération des évaluations:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Récupérer une évaluation spécifique par ID avec les détails de l'agent joint
    async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `
                SELECT 
                    e.*,
                    a.nom AS agent_nom,
                    a.prenom AS agent_prenom,
                    a.matricule AS agent_matricule
                FROM module_evaluation e
                LEFT JOIN agents a ON e.id_agent = a.id
                WHERE e.id = $1
            `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Évaluation non trouvée' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error(`Erreur lors de la récupération de l'évaluation:`, error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Valider et forcer le calcul de note_finale avant création
    async create(req, res) {
        try {
            const data = req.body;
            
            // Validation des champs obligatoires
            if (!data.id_agent || !data.annee) {
                return res.status(400).json({ error: 'L\'agent et l\'année sont obligatoires.' });
            }

            // Validation des notes
            const valRes = this.validateNotes(data);
            if (!valRes.valid) {
                return res.status(400).json({ error: valRes.message });
            }

            // Calcul de la note finale
            data.note_finale = valRes.note_finale;

            // Appel de la méthode de base
            return await super.create(req, res);
        } catch (error) {
            console.error(`Erreur lors de la création de l'évaluation:`, error);
            if (error.code === '23505') { // Violation de contrainte unique
                return res.status(400).json({ error: 'Cet agent a déjà été évalué pour cette année.' });
            }
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Valider et forcer le calcul de note_finale avant mise à jour
    async update(req, res) {
        try {
            const data = req.body;

            // Validation des notes
            const valRes = this.validateNotes(data);
            if (!valRes.valid) {
                return res.status(400).json({ error: valRes.message });
            }

            // Calcul de la note finale
            data.note_finale = valRes.note_finale;

            // Appel de la méthode de base
            return await super.update(req, res);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de l'évaluation:`, error);
            if (error.code === '23505') { // Violation de contrainte unique
                return res.status(400).json({ error: 'Cet agent a déjà été évalué pour cette année.' });
            }
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Helper pour valider les notes individuelles et calculer la note finale
    validateNotes(data) {
        const assiduite = parseFloat(data.note_assiduite || 0);
        const initiative = parseFloat(data.note_initiative || 0);
        const equipe = parseFloat(data.note_equipe || 0);
        const rendement = parseFloat(data.note_rendement || 0);
        const discipline = parseFloat(data.note_discipline || 0);

        if (isNaN(assiduite) || assiduite < 0 || assiduite > 5) {
            return { valid: false, message: "La note d'assiduité doit être un nombre compris entre 0 et 5." };
        }
        if (isNaN(initiative) || initiative < 0 || initiative > 3) {
            return { valid: false, message: "La note d'esprit d'initiative doit être un nombre compris entre 0 et 3." };
        }
        if (isNaN(equipe) || equipe < 0 || equipe > 3) {
            return { valid: false, message: "La note d'esprit d'équipe doit être un nombre compris entre 0 et 3." };
        }
        if (isNaN(rendement) || rendement < 0 || rendement > 5) {
            return { valid: false, message: "La note de rendement doit être un nombre compris entre 0 et 5." };
        }
        if (isNaN(discipline) || discipline < 0 || discipline > 4) {
            return { valid: false, message: "La note de discipline doit être un nombre compris entre 0 et 4." };
        }

        const note_finale = assiduite + initiative + equipe + rendement + discipline;
        return { valid: true, note_finale };
    }
}

module.exports = EvaluationsController;
