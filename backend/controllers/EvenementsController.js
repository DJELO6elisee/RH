const pool = require('../config/database');

class EvenementsController {
    // Vérifier et créer les tables si elles n'existent pas
    static async ensureTablesExist() {
        try {
            // Vérifier si la table evenements existe
            const checkEvenements = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'evenements'
                )
            `);

            if (!checkEvenements.rows[0].exists) {
                console.log('📝 Création de la table evenements...');
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS evenements (
                        id SERIAL PRIMARY KEY,
                        titre VARCHAR(255) NOT NULL,
                        description TEXT,
                        date_debut DATE NOT NULL,
                        date_fin DATE NOT NULL,
                        lieu VARCHAR(255) NOT NULL,
                        organisateur VARCHAR(255),
                        id_entite INTEGER,
                        type_organisme VARCHAR(20) CHECK (type_organisme IN ('ministere', 'entite')),
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('✅ Table evenements créée');
            }

            // Vérifier si la table evenement_participants existe
            const checkParticipants = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'evenement_participants'
                )
            `);

            if (!checkParticipants.rows[0].exists) {
                console.log('📝 Création de la table evenement_participants...');
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS evenement_participants (
                        id SERIAL PRIMARY KEY,
                        id_evenement INTEGER NOT NULL REFERENCES evenements(id) ON DELETE CASCADE,
                        id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(id_evenement, id_agent)
                    )
                `);
                await pool.query('CREATE INDEX IF NOT EXISTS idx_evenement_participants_evenement ON evenement_participants(id_evenement)');
                await pool.query('CREATE INDEX IF NOT EXISTS idx_evenement_participants_agent ON evenement_participants(id_agent)');
                console.log('✅ Table evenement_participants créée');
            }
        } catch (error) {
            console.error('Erreur lors de la vérification/création des tables:', error);
        }
    }

    // Obtenir tous les événements
    static async getAll(req, res) {
        try {
            // S'assurer que les tables existent
            await EvenementsController.ensureTablesExist();
            let query = `
                SELECT 
                    e.*,
                    CASE 
                        WHEN e.type_organisme = 'entite' THEN ent.nom
                        WHEN e.type_organisme = 'ministere' THEN m.nom
                        ELSE NULL
                    END as organisme_nom
                FROM evenements e
                LEFT JOIN entites_administratives ent ON e.id_entite = ent.id AND e.type_organisme = 'entite'
                LEFT JOIN ministeres m ON e.id_entite = m.id AND e.type_organisme = 'ministere'
            `;

            const values = [];
            let paramCount = 0;

            // Filtrer par organisme si l'utilisateur connecté n'est pas un super admin
            if (req.user && req.user.id_agent) {
                try {
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);

                    if (userQuery.rows.length > 0) {
                        const userData = userQuery.rows[0];

                        if (userData.id_entite_principale) {
                            paramCount++;
                            query += ` WHERE e.id_entite = $${paramCount} AND e.type_organisme = 'entite'`;
                            values.push(userData.id_entite_principale);
                        } else if (userData.id_ministere) {
                            paramCount++;
                            query += ` WHERE e.id_entite = $${paramCount} AND e.type_organisme = 'ministere'`;
                            values.push(userData.id_ministere);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }

            query += ` ORDER BY e.date_debut DESC`;

            const result = await pool.query(query, values);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des événements:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération des événements' });
        }
    }

    // Obtenir un événement par ID
    static async getById(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { id } = req.params;
            const query = `
                SELECT 
                    e.*,
                    CASE 
                        WHEN e.type_organisme = 'entite' THEN ent.nom
                        WHEN e.type_organisme = 'ministere' THEN m.nom
                        ELSE NULL
                    END as organisme_nom
                FROM evenements e
                LEFT JOIN entites_administratives ent ON e.id_entite = ent.id AND e.type_organisme = 'entite'
                LEFT JOIN ministeres m ON e.id_entite = m.id AND e.type_organisme = 'ministere'
                WHERE e.id = $1
            `;

            const result = await pool.query(query, [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Événement non trouvé' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'événement:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la récupération de l\'événement' });
        }
    }

    // Créer un nouvel événement
    static async create(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { titre, description, date_debut, date_fin, lieu, organisateur } = req.body;

            // Validation des champs obligatoires
            if (!titre || !date_debut || !date_fin || !lieu) {
                return res.status(400).json({ error: 'Les champs titre, date_debut, date_fin et lieu sont obligatoires' });
            }

            // Validation des dates
            if (new Date(date_fin) < new Date(date_debut)) {
                return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' });
            }

            // Déterminer l'organisme de l'utilisateur
            let id_entite = null;
            let type_organisme = null;

            if (req.user && req.user.id_agent) {
                try {
                    const userQuery = await pool.query(`
                        SELECT a.id_ministere, a.id_entite_principale
                        FROM agents a 
                        WHERE a.id = $1
                    `, [req.user.id_agent]);

                    if (userQuery.rows.length > 0) {
                        const userData = userQuery.rows[0];
                        if (userData.id_entite_principale) {
                            id_entite = userData.id_entite_principale;
                            type_organisme = 'entite';
                        } else if (userData.id_ministere) {
                            id_entite = userData.id_ministere;
                            type_organisme = 'ministere';
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des infos utilisateur:', error);
                }
            }

            const query = `
                INSERT INTO evenements 
                (titre, description, date_debut, date_fin, lieu, organisateur, id_entite, type_organisme, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const values = [titre, description || null, date_debut, date_fin, lieu, organisateur || null, id_entite, type_organisme];
            const result = await pool.query(query, values);

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la création de l\'événement:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la création de l\'événement' });
        }
    }

    // Mettre à jour un événement
    static async update(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { id } = req.params;
            const { titre, description, date_debut, date_fin, lieu, organisateur } = req.body;

            // Vérifier que l'événement existe
            const existingEvent = await pool.query('SELECT id FROM evenements WHERE id = $1', [id]);
            if (existingEvent.rows.length === 0) {
                return res.status(404).json({ error: 'Événement non trouvé' });
            }

            // Validation des dates si fournies
            if (date_debut && date_fin && new Date(date_fin) < new Date(date_debut)) {
                return res.status(400).json({ error: 'La date de fin doit être postérieure à la date de début' });
            }

            const query = `
                UPDATE evenements 
                SET 
                    titre = COALESCE($2, titre),
                    description = COALESCE($3, description),
                    date_debut = COALESCE($4, date_debut),
                    date_fin = COALESCE($5, date_fin),
                    lieu = COALESCE($6, lieu),
                    organisateur = COALESCE($7, organisateur),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const values = [id, titre, description, date_debut, date_fin, lieu, organisateur];
            const result = await pool.query(query, values);

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'événement:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la mise à jour de l\'événement' });
        }
    }

    // Supprimer un événement
    static async delete(req, res) {
        try {
            await EvenementsController.ensureTablesExist();
            const { id } = req.params;

            // Vérifier que l'événement existe
            const existingEvent = await pool.query('SELECT id FROM evenements WHERE id = $1', [id]);
            if (existingEvent.rows.length === 0) {
                return res.status(404).json({ error: 'Événement non trouvé' });
            }

            // Supprimer d'abord les participants
            await pool.query('DELETE FROM evenement_participants WHERE id_evenement = $1', [id]);

            // Supprimer l'événement
            await pool.query('DELETE FROM evenements WHERE id = $1', [id]);

            res.json({ message: 'Événement supprimé avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'événement:', error);
            res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'événement' });
        }
    }
}

module.exports = EvenementsController;

