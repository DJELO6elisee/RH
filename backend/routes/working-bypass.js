// Endpoint de contournement qui fonctionne à coup sûr
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Endpoint simple qui retourne les données directement
router.get('/demandes-working', async(req, res) => {
    try {
        console.log('🚀 Endpoint working appelé');

        // Récupérer les paramètres de requête
        const {
            page = 1,
                limit = 10,
                sort_by = 'date_creation',
                sort_order = 'DESC',
                agent_search = ''
        } = req.query;
        // Supporter plusieurs paramètres type_demande en requête (?type_demande=a&type_demande=b)
        // ou un seul string
        const rawType = req.query.type_demande;
        const typeDemandeArray = Array.isArray(rawType) ?
            rawType.filter(v => typeof v === 'string' && v.trim() !== '') :
            (typeof rawType === 'string' && rawType.trim() !== '' ? [rawType] : []);

        console.log('📋 Paramètres reçus:', { page, limit, sort_by, sort_order, type_demande: typeDemandeArray, agent_search });

        // Calculer l'offset pour la pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Construire la clause WHERE
        let whereClause = "WHERE d.niveau_evolution_demande = 'soumis'";
        const queryParams = [];
        let paramIndex = 1;

        if (typeDemandeArray.length === 1) {
            whereClause += ` AND d.type_demande = $${paramIndex}`;
            queryParams.push(typeDemandeArray[0]);
            paramIndex++;
        } else if (typeDemandeArray.length > 1) {
            // Utiliser ANY($idx) pour un tableau Postgres
            whereClause += ` AND d.type_demande = ANY($${paramIndex})`;
            queryParams.push(typeDemandeArray);
            paramIndex++;
        }

        // Construire la clause ORDER BY
        const validSortFields = ['date_creation', 'type_demande', 'status', 'niveau_evolution_demande'];
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'date_creation';
        const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Requête pour compter le total
        const countQuery = `
            SELECT COUNT(*) as total
            FROM demandes d
            ${whereClause}
        `;

        const countResult = await db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].total);

        // Requête principale avec pagination et tri
        const demandesQuery = `
            SELECT 
                d.id,
                d.type_demande,
                d.description,
                d.status,
                d.niveau_evolution_demande,
                d.date_creation,
                d.agree_motif,
                d.agree_date_cessation,
                d.id_agent,
                COALESCE(
                    d.phase,
                    CASE WHEN d.niveau_evolution_demande LIKE 'retour_%' THEN 'retour' ELSE 'aller' END
                ) AS phase
            FROM demandes d
            ${whereClause}
            ORDER BY d.${sortField} ${sortDirection}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const demandes = await db.query(demandesQuery, queryParams);
        console.log(`📊 ${demandes.rows.length} demande(s) récupérée(s) sur ${total} total`);

        // Récupérer les informations des agents séparément
        const agentIds = demandes.rows.map(d => d.id_agent).filter(id => id);
        let agents = [];

        if (agentIds.length > 0) {
            const agentsQuery = `
                SELECT a.id, a.prenom, a.nom, a.matricule, a.email
                FROM agents a
                WHERE a.id = ANY($1)
            `;
            const agentsResult = await db.query(agentsQuery, [agentIds]);
            agents = agentsResult.rows;
        }

        // Combiner les données
        const formattedData = demandes.rows.map(demande => {
            const agent = agents.find(a => a.id === demande.id_agent);
            return {
                id: demande.id,
                type_demande: demande.type_demande,
                description: demande.description,
                status: demande.status,
                niveau_evolution_demande: demande.niveau_evolution_demande,
                date_creation: demande.date_creation,
                agree_motif: demande.agree_motif,
                agree_date_cessation: demande.agree_date_cessation,
                phase: demande.phase,
                agent: agent ? {
                    id: agent.id,
                    prenom: agent.prenom,
                    nom: agent.nom,
                    matricule: agent.matricule,
                    email: agent.email
                } : null
            };
        });

        // Calculer les informations de pagination
        const totalPages = Math.ceil(total / parseInt(limit));
        const currentPage = parseInt(page);
        const hasNextPage = currentPage < totalPages;
        const hasPrevPage = currentPage > 1;

        res.json({
            success: true,
            message: 'Demandes récupérées avec succès (working)',
            data: formattedData,
            pagination: {
                current_page: currentPage,
                total_pages: totalPages,
                total_items: total,
                items_per_page: parseInt(limit),
                has_next_page: hasNextPage,
                has_prev_page: hasPrevPage,
                next_page: hasNextPage ? currentPage + 1 : null,
                prev_page: hasPrevPage ? currentPage - 1 : null
            },
            filters: {
                sort_by: sortField,
                sort_order: sortDirection,
                type_demande: typeDemandeArray.length ? typeDemandeArray : null,
                agent_search: agent_search || null
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erreur endpoint working:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des demandes',
            error: error.message
        });
    }
});

module.exports = router;