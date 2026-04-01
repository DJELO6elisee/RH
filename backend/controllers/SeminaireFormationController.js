const pool = require('../config/database');

class SeminaireFormationController {
    // Obtenir tous les séminaires de formation
    static async getAll(req, res) {
        try {
            let query = `
                SELECT 
                    sf.*,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN e.nom
                        WHEN sf.type_organisme = 'ministere' THEN m.nom
                        ELSE NULL
                    END as organisme_nom,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN e.type_entite
                        ELSE NULL
                    END as organisme_type,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN me.nom
                        ELSE NULL
                    END as ministere_nom
                FROM seminaire_formation sf
                LEFT JOIN entites_administratives e ON sf.id_entite = e.id AND sf.type_organisme = 'entite'
                LEFT JOIN ministeres m ON sf.id_entite = m.id AND sf.type_organisme = 'ministere'
                LEFT JOIN ministeres me ON e.id_ministere = me.id
            `;

            const values = [];
            let paramCount = 0;

            // Filtrer par organisme si l'utilisateur connecté n'est pas un super admin
            if (req.user && req.user.id_agent) {
                try {
                    // Récupérer l'organisme de l'utilisateur connecté
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);

                    if (userQuery.rows.length > 0) {
                        const userData = userQuery.rows[0];

                        // Priorité à l'entité principale si disponible
                        if (userData.id_entite_principale) {
                            paramCount++;
                            query += ` WHERE sf.id_entite = $${paramCount} AND sf.type_organisme = 'entite'`;
                            values.push(userData.id_entite_principale);
                            console.log(`🔍 Filtrage des séminaires par entité: ${userData.id_entite_principale}`);
                        } else if (userData.id_ministere) {
                            paramCount++;
                            query += ` WHERE sf.id_entite = $${paramCount} AND sf.type_organisme = 'ministere'`;
                            values.push(userData.id_ministere);
                            console.log(`🔍 Filtrage des séminaires par ministère: ${userData.id_ministere}`);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }

            query += ` ORDER BY sf.date_debut DESC`;

            const result = await pool.query(query, values);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des séminaires:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des séminaires' });
        }
    }

    // Obtenir un séminaire par ID
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const query = `
                SELECT 
                    sf.*,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN e.nom
                        WHEN sf.type_organisme = 'ministere' THEN m.nom
                        ELSE NULL
                    END as organisme_nom,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN e.type_entite
                        ELSE NULL
                    END as organisme_type,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN me.nom
                        ELSE NULL
                    END as ministere_nom
                FROM seminaire_formation sf
                LEFT JOIN entites_administratives e ON sf.id_entite = e.id AND sf.type_organisme = 'entite'
                LEFT JOIN ministeres m ON sf.id_entite = m.id AND sf.type_organisme = 'ministere'
                LEFT JOIN ministeres me ON e.id_ministere = me.id
                WHERE sf.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Séminaire non trouvé' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération du séminaire:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération du séminaire' });
        }
    }

    // Obtenir les séminaires par critères de recherche
    static async getByAgent(req, res) {
        try {
            // Cette méthode n'est plus applicable car les séminaires ne sont plus liés aux agents
            // Rediriger vers la méthode de recherche générale
            res.status(400).json({
                error: 'Les séminaires ne sont plus liés aux agents. Utilisez la recherche générale.'
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des séminaires:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des séminaires' });
        }
    }

    // Créer un nouveau séminaire
    static async create(req, res) {
        try {
            const {
                theme_seminaire,
                date_debut,
                date_fin,
                lieu
            } = req.body;

            // Validation des données
            if (!theme_seminaire || !date_debut || !date_fin || !lieu) {
                return res.status(400).json({
                    error: 'Les champs theme_seminaire, date_debut, date_fin et lieu sont obligatoires'
                });
            }

            // Vérifier que la date de fin est après la date de début
            if (new Date(date_fin) < new Date(date_debut)) {
                return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' });
            }

            // Récupérer automatiquement l'ID et le type de l'organisme du DRH connecté
            let id_entite = null;
            let type_organisme = null;

            if (req.user && req.user.id_agent) {
                try {
                    // Récupérer les informations de l'utilisateur connecté
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);

                    if (userQuery.rows.length > 0) {
                        const userData = userQuery.rows[0];

                        // Priorité à l'entité principale si disponible
                        if (userData.id_entite_principale) {
                            id_entite = userData.id_entite_principale;
                            type_organisme = 'entite';
                            console.log(`🔍 DRH connecté - Entité principale: ${userData.id_entite_principale}`);
                        } else if (userData.id_ministere) {
                            id_entite = userData.id_ministere;
                            type_organisme = 'ministere';
                            console.log(`🔍 DRH connecté - Ministère: ${userData.id_ministere}`);
                        }

                        console.log(`✅ Organisme assigné automatiquement au séminaire: ID ${id_entite}, Type ${type_organisme}`);
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }

            // Validation: Le séminaire doit être lié à un organisme
            if (!id_entite || !type_organisme) {
                return res.status(400).json({
                    error: 'Impossible de déterminer l\'organisme. Vérifiez que l\'utilisateur connecté a une entité ou ministère assigné.'
                });
            }

            const query = `
                INSERT INTO seminaire_formation 
                (theme_seminaire, date_debut, date_fin, lieu, id_entite, type_organisme)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [theme_seminaire, date_debut, date_fin, lieu, id_entite, type_organisme];
            const result = await pool.query(query, values);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création du séminaire:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la création du séminaire' });
        }
    }

    // Mettre à jour un séminaire
    static async update(req, res) {
        try {
            const { id } = req.params;
            const {
                theme_seminaire,
                date_debut,
                date_fin,
                lieu
            } = req.body;

            // Vérifier que le séminaire existe
            const existingSeminaire = await pool.query('SELECT id FROM seminaire_formation WHERE id = $1', [id]);
            if (existingSeminaire.rows.length === 0) {
                return res.status(404).json({ error: 'Séminaire non trouvé' });
            }

            // Vérifier les dates si elles sont fournies
            if (date_debut && date_fin && new Date(date_fin) < new Date(date_debut)) {
                return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' });
            }

            const query = `
                UPDATE seminaire_formation 
                SET 
                    theme_seminaire = COALESCE($2, theme_seminaire),
                    date_debut = COALESCE($3, date_debut),
                    date_fin = COALESCE($4, date_fin),
                    lieu = COALESCE($5, lieu),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const values = [id, theme_seminaire, date_debut, date_fin, lieu];
            const result = await pool.query(query, values);

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du séminaire:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du séminaire' });
        }
    }

    // Supprimer un séminaire
    static async delete(req, res) {
        try {
            const { id } = req.params;

            // Vérifier que le séminaire existe
            const existingSeminaire = await pool.query('SELECT id FROM seminaire_formation WHERE id = $1', [id]);
            if (existingSeminaire.rows.length === 0) {
                return res.status(404).json({ error: 'Séminaire non trouvé' });
            }

            const query = 'DELETE FROM seminaire_formation WHERE id = $1';
            await pool.query(query, [id]);

            res.json({ message: 'Séminaire supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression du séminaire:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la suppression du séminaire' });
        }
    }

    // Obtenir les statistiques des séminaires
    static async getStatistics(req, res) {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_seminaires,
                    COUNT(CASE WHEN date_debut >= CURRENT_DATE THEN 1 END) as seminaires_a_venir,
                    COUNT(CASE WHEN date_fin < CURRENT_DATE THEN 1 END) as seminaires_termines,
                    COUNT(CASE WHEN date_debut <= CURRENT_DATE AND date_fin >= CURRENT_DATE THEN 1 END) as seminaires_en_cours
                FROM seminaire_formation
            `;

            const result = await pool.query(statsQuery);
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
        }
    }

    // Rechercher des séminaires par critères
    static async search(req, res) {
        try {
            const {
                theme,
                date_debut_from,
                date_debut_to,
                lieu
            } = req.query;

            let query = `
                SELECT 
                    sf.*,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN e.nom
                        WHEN sf.type_organisme = 'ministere' THEN m.nom
                        ELSE NULL
                    END as organisme_nom,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN e.type_entite
                        ELSE NULL
                    END as organisme_type,
                    CASE 
                        WHEN sf.type_organisme = 'entite' THEN me.nom
                        ELSE NULL
                    END as ministere_nom
                FROM seminaire_formation sf
                LEFT JOIN entites_administratives e ON sf.id_entite = e.id AND sf.type_organisme = 'entite'
                LEFT JOIN ministeres m ON sf.id_entite = m.id AND sf.type_organisme = 'ministere'
                LEFT JOIN ministeres me ON e.id_ministere = me.id
                WHERE 1=1
            `;

            const values = [];
            let paramCount = 0;

            // Filtrer par organisme si l'utilisateur connecté n'est pas un super admin
            if (req.user && req.user.id_agent) {
                try {
                    // Récupérer l'organisme de l'utilisateur connecté
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);

                    if (userQuery.rows.length > 0) {
                        const userData = userQuery.rows[0];

                        // Priorité à l'entité principale si disponible
                        if (userData.id_entite_principale) {
                            paramCount++;
                            query += ` AND sf.id_entite = $${paramCount} AND sf.type_organisme = 'entite'`;
                            values.push(userData.id_entite_principale);
                        } else if (userData.id_ministere) {
                            paramCount++;
                            query += ` AND sf.id_entite = $${paramCount} AND sf.type_organisme = 'ministere'`;
                            values.push(userData.id_ministere);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }

            if (theme) {
                paramCount++;
                query += ` AND sf.theme_seminaire ILIKE $${paramCount}`;
                values.push(`%${theme}%`);
            }

            if (date_debut_from) {
                paramCount++;
                query += ` AND sf.date_debut >= $${paramCount}`;
                values.push(date_debut_from);
            }

            if (date_debut_to) {
                paramCount++;
                query += ` AND sf.date_debut <= $${paramCount}`;
                values.push(date_debut_to);
            }

            if (lieu) {
                paramCount++;
                query += ` AND sf.lieu ILIKE $${paramCount}`;
                values.push(`%${lieu}%`);
            }

            query += ` ORDER BY sf.date_debut DESC`;

            const result = await pool.query(query, values);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la recherche des séminaires:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la recherche des séminaires' });
        }
    }
}

module.exports = SeminaireFormationController;