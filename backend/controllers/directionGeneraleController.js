/**
 * Controller pour la gestion des Directions Générales
 * 
 * Ce controller gère toutes les opérations CRUD pour les directions générales
 * ainsi que leurs relations avec les ministères, directions et agents
 */

const pool = require('../config/database');

/**
 * GET /api/directions-generales
 * Récupérer toutes les directions générales
 */
exports.getAllDirectionsGenerales = async(req, res) => {
    try {
        // Accepter id_ministere (frontend) ou ministere_id (alternatif)
        const id_ministere = req.query.id_ministere || req.query.ministere_id;
        const { active_only } = req.query;

        let query = `
      SELECT 
        dg.id,
        dg.libelle,
        dg.is_active,
        dg.created_at,
        dg.updated_at,
        COUNT(DISTINCT d.id) as nombre_directions
      FROM direction_generale dg
      LEFT JOIN directions d ON d.id_direction_generale = dg.id
    `;

        const conditions = [];
        const params = [];
        let paramCount = 1;

        if (id_ministere) {
            conditions.push(`dg.id_ministere = $${paramCount}`);
            params.push(id_ministere);
            paramCount++;
        }

        if (active_only === 'true') {
            conditions.push(`dg.is_active = true`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += `
      GROUP BY 
        dg.id, dg.libelle, dg.is_active, 
        dg.created_at, dg.updated_at
      ORDER BY dg.libelle
    `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des directions générales:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des directions générales',
            message: error.message
        });
    }
};

/**
 * GET /api/directions-generales/select/all
 * Récupérer toutes les directions générales sans pagination (pour les listes déroulantes)
 */
exports.getAllForSelect = async (req, res) => {
    try {
        const id_ministere = req.query.id_ministere || req.query.ministere_id;
        
        let query = `
            SELECT 
                id,
                libelle
            FROM direction_generale
            WHERE is_active = true
        `;

        const params = [];
        let paramCount = 1;

        if (id_ministere) {
            query += ` AND id_ministere = $${paramCount}`;
            params.push(id_ministere);
            paramCount++;
        }

        query += ` ORDER BY libelle ASC`;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des directions générales pour select:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des directions générales pour select',
            message: error.message
        });
    }
};

/**
 * GET /api/directions-generales/:id
 * Récupérer une direction générale par son ID
 */
exports.getDirectionGeneraleById = async(req, res) => {
    try {
        const { id } = req.params;

        const query = `
      SELECT 
        dg.id,
        dg.id_ministere,
        dg.libelle,
        dg.is_active,
        dg.created_at,
        dg.updated_at,
        COUNT(DISTINCT d.id) as nombre_directions
      FROM direction_generale dg
      LEFT JOIN directions d ON d.id_direction_generale = dg.id
      WHERE dg.id = $1
      GROUP BY 
        dg.id, dg.id_ministere, dg.libelle, dg.is_active, 
        dg.created_at, dg.updated_at
    `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Direction générale non trouvée'
            });
        }

        // Récupérer les directions rattachées
        const directionsQuery = `
      SELECT 
        d.id,
        d.libelle,
        d.responsable_id,
        a.nom || ' ' || a.prenom as responsable_nom
      FROM directions d
      LEFT JOIN agents a ON d.responsable_id = a.id
      WHERE d.id_direction_generale = $1
      ORDER BY d.libelle
    `;
        const directions = await pool.query(directionsQuery, [id]);

        res.json({
            success: true,
            data: {
                ...result.rows[0],
                directions: directions.rows
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de la direction générale:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la direction générale',
            message: error.message
        });
    }
};

/**
 * POST /api/directions-generales
 * Créer une nouvelle direction générale
 */
exports.createDirectionGenerale = async(req, res) => {
    try {
        const {
            libelle,
            is_active = true
        } = req.body;

        // Récupérer automatiquement id_ministere depuis l'utilisateur connecté
        let id_ministere = req.body.id_ministere;
        
        // Si id_ministere n'est pas fourni, le récupérer depuis l'utilisateur connecté
        if (!id_ministere && req.user) {
            // Essayer d'abord depuis req.user.id_ministere (défini par le middleware auth)
            if (req.user.id_ministere) {
                id_ministere = req.user.id_ministere;
                console.log(`✅ id_ministere récupéré depuis req.user.id_ministere: ${id_ministere}`);
            }
            // Sinon, récupérer depuis l'agent associé à l'utilisateur
            else if (req.user.id_agent) {
                const userAgentQuery = await pool.query(
                    'SELECT id_ministere FROM agents WHERE id = $1',
                    [req.user.id_agent]
                );
                if (userAgentQuery.rows.length > 0 && userAgentQuery.rows[0].id_ministere) {
                    id_ministere = userAgentQuery.rows[0].id_ministere;
                    console.log(`✅ id_ministere récupéré depuis l'agent: ${id_ministere}`);
                }
            }
            // Fallback: essayer depuis req.user.organization.id (si disponible)
            else if (req.user.organization && req.user.organization.id) {
                id_ministere = req.user.organization.id;
                console.log(`✅ id_ministere récupéré depuis req.user.organization.id: ${id_ministere}`);
            }
        }

        // Validation
        if (!id_ministere || !libelle) {
            console.error('❌ Erreur de validation - id_ministere:', id_ministere, 'libelle:', libelle);
            console.error('❌ req.user:', req.user ? {
                id: req.user.id,
                id_agent: req.user.id_agent,
                organization: req.user.organization,
                id_ministere: req.user.id_ministere
            } : 'null');
            return res.status(400).json({
                success: false,
                error: 'Le ministère et le libellé sont obligatoires'
            });
        }

        // Vérifier que le ministère existe
        const ministereCheck = await pool.query(
            'SELECT id FROM ministeres WHERE id = $1', [id_ministere]
        );

        if (ministereCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Le ministère spécifié n\'existe pas'
            });
        }

        const query = `
      INSERT INTO direction_generale 
      (id_ministere, libelle, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

        const result = await pool.query(query, [
            id_ministere,
            libelle,
            is_active
        ]);

        res.status(201).json({
            success: true,
            message: 'Direction générale créée avec succès',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la création de la direction générale:', error);

        if (error.code === '23505') { // Violation de contrainte unique
            return res.status(400).json({
                success: false,
                error: 'Une direction générale avec ce libellé existe déjà'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la direction générale',
            message: error.message
        });
    }
};

/**
 * PUT /api/directions-generales/:id
 * Mettre à jour une direction générale
 */
exports.updateDirectionGenerale = async(req, res) => {
    try {
        const { id } = req.params;
        const {
            id_ministere,
            libelle,
            is_active
        } = req.body;

        // Vérifier que la direction générale existe
        const checkQuery = 'SELECT id FROM direction_generale WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Direction générale non trouvée'
            });
        }

        // Construire la requête de mise à jour dynamiquement
        const updates = [];
        const params = [];
        let paramCount = 1;

        if (id_ministere !== undefined) {
            updates.push(`id_ministere = $${paramCount}`);
            params.push(id_ministere);
            paramCount++;
        }

        if (libelle !== undefined) {
            updates.push(`libelle = $${paramCount}`);
            params.push(libelle);
            paramCount++;
        }

        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount}`);
            params.push(is_active);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucune donnée à mettre à jour'
            });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        const query = `
      UPDATE direction_generale 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

        const result = await pool.query(query, params);

        res.json({
            success: true,
            message: 'Direction générale mise à jour avec succès',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la direction générale:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la direction générale',
            message: error.message
        });
    }
};

/**
 * DELETE /api/directions-generales/:id
 * Supprimer une direction générale
 */
exports.deleteDirectionGenerale = async(req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query('BEGIN');

        // Vérifier que la direction générale existe
        const checkQuery = 'SELECT id, libelle FROM direction_generale WHERE id = $1';
        const checkResult = await client.query(checkQuery, [id]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Direction générale non trouvée'
            });
        }

        // Retirer les références dans les directions
        await client.query(
            'UPDATE directions SET id_direction_generale = NULL WHERE id_direction_generale = $1', [id]
        );

        // Retirer les références dans les agents
        await client.query(
            'UPDATE agents SET id_direction_generale = NULL WHERE id_direction_generale = $1', [id]
        );

        // Supprimer la direction générale
        await client.query('DELETE FROM direction_generale WHERE id = $1', [id]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Direction générale "${checkResult.rows[0].libelle}" supprimée avec succès`
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur lors de la suppression de la direction générale:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la direction générale',
            message: error.message
        });
    } finally {
        client.release();
    }
};

/**
 * GET /api/directions-generales/:id/directions
 * Récupérer toutes les directions d'une direction générale
 */
exports.getDirectionsByDirectionGenerale = async(req, res) => {
    try {
        const { id } = req.params;

        const query = `
      SELECT 
        d.id,
        d.libelle,
        d.description,
        d.responsable_id,
        a.matricule as responsable_matricule,
        a.nom || ' ' || a.prenom as responsable_nom,
        COUNT(DISTINCT sd.id) as nombre_sous_directions
      FROM directions d
      LEFT JOIN agents a ON d.responsable_id = a.id
      LEFT JOIN sous_directions sd ON sd.direction_id = d.id
      WHERE d.id_direction_generale = $1
      GROUP BY d.id, d.libelle, d.description, d.responsable_id, 
               a.matricule, a.nom, a.prenom
      ORDER BY d.libelle
    `;

        const result = await pool.query(query, [id]);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des directions:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des directions',
            message: error.message
        });
    }
};


/**
 * GET /api/directions-generales/:id/agents
 * Récupérer uniquement les agents propres de la direction générale : rattachés directement à la DG
 * (id_direction_generale = id ET id_direction IS NULL). Exclut les agents des directions rattachées à cette DG.
 */
exports.getAgentsByDirectionGenerale = async(req, res) => {
    try {
        const { id } = req.params;
        const idDirectionGenerale = parseInt(id, 10);
        if (isNaN(idDirectionGenerale) || idDirectionGenerale <= 0) {
            return res.status(400).json({
                success: false,
                error: 'ID de direction générale invalide'
            });
        }

        const query = `
      SELECT 
        a.id,
        a.matricule,
        a.nom,
        a.prenom,
        a.email,
        a.telephone1,
        a.sexe,
        ta.libele as type_agent
      FROM agents a
      LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
      LEFT JOIN grades g ON a.id_grade = g.id
      WHERE a.id_direction_generale = $1::integer
        AND a.id_direction IS NULL
        AND a.id_sous_direction IS NULL
        AND (a.retire IS NULL OR a.retire = false)
        AND (
          (a.date_retraite IS NULL AND (a.date_de_naissance IS NULL OR DATE_PART('year', AGE(CURRENT_DATE, a.date_de_naissance)) < CASE WHEN g.libele IS NOT NULL AND UPPER(g.libele) IN ('A4', 'A5', 'A6', 'A7') THEN 65 ELSE 60 END))
          OR (a.date_retraite IS NOT NULL AND a.date_retraite > CURRENT_DATE)
        )
        AND NOT (
          a.id_type_d_agent = 1
          AND a.date_de_naissance IS NOT NULL
          AND g.libele IS NOT NULL
          AND MAKE_DATE(EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + CASE WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65 ELSE 60 END, 12, 31)::DATE < CURRENT_DATE::DATE
        )
      ORDER BY a.nom, a.prenom
    `;

        const result = await pool.query(query, [idDirectionGenerale]);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des agents:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des agents',
            message: error.message
        });
    }
};

/**
 * GET /api/directions-generales/statistiques/overview
 * Récupérer les statistiques globales des directions générales
 */
exports.getStatistiques = async(req, res) => {
    try {
        const query = `
      SELECT 
        COUNT(DISTINCT dg.id) as total_directions_generales,
        COUNT(DISTINCT CASE WHEN dg.is_active THEN dg.id END) as actives,
        COUNT(DISTINCT dg.id_ministere) as nombre_ministeres,
        COUNT(DISTINCT d.id) as total_directions
      FROM direction_generale dg
      LEFT JOIN directions d ON d.id_direction_generale = dg.id
    `;

        const result = await pool.query(query);

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques',
            message: error.message
        });
    }
};

module.exports = exports;