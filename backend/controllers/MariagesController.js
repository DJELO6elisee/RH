const pool = require('../config/database');

class MariagesController {
    // Mettre à jour les informations de mariage d'un agent
    async update(req, res) {
        try {
            const { id } = req.params;
            const {
                nom_conjoint,
                prenom_conjoint,
                date_mariage,
                lieu_mariage,
                lieu_reception
            } = req.body;

            // Vérifier que l'agent existe
            const agentCheck = await pool.query('SELECT id FROM agents WHERE id = $1', [id]);
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1',
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        const agentQuery = await pool.query(
                            'SELECT id_ministere FROM agents WHERE id = $1',
                            [id]
                        );
                        if (agentQuery.rows.length > 0) {
                            const agentMinistereId = agentQuery.rows[0].id_ministere;
                            if (userMinistereId && userMinistereId !== agentMinistereId) {
                                return res.status(403).json({
                                    success: false,
                                    message: 'Accès refusé: vous ne pouvez pas modifier les informations d\'un agent d\'un autre ministère'
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier si les colonnes lieu_mariage et lieu_reception existent
            let hasLieuMariage = false;
            let hasLieuReception = false;

            try {
                const columnCheck = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'agents' 
                    AND column_name IN ('lieu_mariage', 'lieu_reception')
                `);
                
                const existingColumns = columnCheck.rows.map(row => row.column_name);
                hasLieuMariage = existingColumns.includes('lieu_mariage');
                hasLieuReception = existingColumns.includes('lieu_reception');
            } catch (error) {
                console.error('Erreur lors de la vérification des colonnes:', error);
            }

            // Construire la requête de mise à jour
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            // Champs existants
            if (nom_conjoint !== undefined) {
                updateFields.push(`nom_conjointe = $${paramIndex++}`);
                updateValues.push(nom_conjoint);
            }

            if (prenom_conjoint !== undefined) {
                updateFields.push(`prenom_conjointe = $${paramIndex++}`);
                updateValues.push(prenom_conjoint);
            }

            if (date_mariage !== undefined) {
                updateFields.push(`date_mariage = $${paramIndex++}`);
                updateValues.push(date_mariage);
            }

            // Champs optionnels (si les colonnes existent)
            if (hasLieuMariage && lieu_mariage !== undefined) {
                updateFields.push(`lieu_mariage = $${paramIndex++}`);
                updateValues.push(lieu_mariage);
            }

            if (hasLieuReception && lieu_reception !== undefined) {
                updateFields.push(`lieu_reception = $${paramIndex++}`);
                updateValues.push(lieu_reception);
            }

            // Mettre à jour la situation matrimoniale à "Marié(e)" si ce n'est pas déjà le cas
            // ID 2 correspond généralement à "Marié(e)" dans situation_matrimonials
            updateFields.push(`id_situation_matrimoniale = $${paramIndex++}`);
            updateValues.push(2);

            // Ajouter updated_at
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            if (updateFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucune donnée à mettre à jour'
                });
            }

            updateValues.push(id);

            const query = `
                UPDATE agents 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING id, nom, prenom, nom_conjointe, prenom_conjointe, date_mariage, 
                          ${hasLieuMariage ? 'lieu_mariage, ' : ''}
                          ${hasLieuReception ? 'lieu_reception, ' : ''}
                          id_situation_matrimoniale
            `;

            const result = await pool.query(query, updateValues);

            res.json({
                success: true,
                message: 'Informations de mariage mises à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour des informations de mariage:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour des informations de mariage',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer tous les mariages enregistrés
    async getAll(req, res) {
        try {
            const { page = 1, limit = 50, search = '' } = req.query;
            const offset = (page - 1) * limit;

            // Récupérer le ministère de l'utilisateur connecté
            let userMinistereId = null;
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1',
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        userMinistereId = userAgentQuery.rows[0].id_ministere;
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération du ministère:', error);
                }
            }

            // Vérifier si les colonnes lieu_mariage et lieu_reception existent
            let hasLieuMariage = false;
            let hasLieuReception = false;

            try {
                const columnCheck = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'agents' 
                    AND column_name IN ('lieu_mariage', 'lieu_reception')
                `);
                
                const existingColumns = columnCheck.rows.map(row => row.column_name);
                hasLieuMariage = existingColumns.includes('lieu_mariage');
                hasLieuReception = existingColumns.includes('lieu_reception');
            } catch (error) {
                console.error('Erreur lors de la vérification des colonnes:', error);
            }

            // Construire la clause WHERE
            const whereConditions = [];
            const queryParams = [];

            // Filtrer par situation matrimoniale = Marié(e) (id = 2)
            whereConditions.push(`a.id_situation_matrimoniale = $${queryParams.length + 1}`);
            queryParams.push(2);

            // Filtrer par ministère si l'utilisateur a un ministère
            if (userMinistereId) {
                whereConditions.push(`a.id_ministere = $${queryParams.length + 1}`);
                queryParams.push(userMinistereId);
            }

            // Recherche par nom, prénom ou matricule
            if (search && search.trim() !== '') {
                const searchPattern = `%${search.trim()}%`;
                whereConditions.push(`(a.nom ILIKE $${queryParams.length + 1} OR a.prenom ILIKE $${queryParams.length + 1} OR a.matricule ILIKE $${queryParams.length + 1})`);
                queryParams.push(searchPattern);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Requête pour récupérer les mariages avec l'emploi depuis emploi_agents
            const query = `
                SELECT 
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.nom_conjointe,
                    a.prenom_conjointe,
                    a.date_mariage,
                    a.numero_acte_mariage,
                    ea_actuel.emploi_libele as emploi_actuel_libele
                    ${hasLieuMariage ? ', a.lieu_mariage' : ''}
                    ${hasLieuReception ? ', a.lieu_reception' : ''}
                FROM agents a
                -- Emploi actuel depuis emploi_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                ${whereClause}
                ORDER BY a.date_mariage DESC NULLS LAST, a.nom, a.prenom
                LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
            `;

            queryParams.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(query, queryParams);

            // Compter le total
            const countQuery = `
                SELECT COUNT(*) as total
                FROM agents a
                ${whereClause}
            `;
            const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des mariages:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des mariages',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer les informations de mariage d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;

            // Vérifier si les colonnes lieu_mariage et lieu_reception existent
            let hasLieuMariage = false;
            let hasLieuReception = false;

            try {
                const columnCheck = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'agents' 
                    AND column_name IN ('lieu_mariage', 'lieu_reception')
                `);
                
                const existingColumns = columnCheck.rows.map(row => row.column_name);
                hasLieuMariage = existingColumns.includes('lieu_mariage');
                hasLieuReception = existingColumns.includes('lieu_reception');
            } catch (error) {
                console.error('Erreur lors de la vérification des colonnes:', error);
            }

            const query = `
                SELECT 
                    id,
                    nom,
                    prenom,
                    matricule,
                    nom_conjointe,
                    prenom_conjointe,
                    date_mariage,
                    numero_acte_mariage,
                    id_situation_matrimoniale
                    ${hasLieuMariage ? ', lieu_mariage' : ''}
                    ${hasLieuReception ? ', lieu_reception' : ''}
                FROM agents
                WHERE id = $1
            `;

            const result = await pool.query(query, [agentId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des informations de mariage:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des informations de mariage',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

module.exports = new MariagesController();

