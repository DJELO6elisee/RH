const BaseController = require('./BaseController');
const pool = require('../config/database');

class EnfantsController extends BaseController {
    constructor() {
        super('enfants', 'id');
    }

    // Colonnes valides pour la table enfants
    getValidColumns() {
        return ['id_agent', 'nom', 'prenom', 'sexe', 'date_de_naissance', 'scolarise', 'ayant_droit'];
    }

    // Créer un nouvel enfant
    async create(req, res) {
        try {
            const data = req.body;
            
            // Filtrer les colonnes pour ne garder que les colonnes valides
            const validColumns = this.getValidColumns();
            const filteredData = {};
            
            Object.keys(data).forEach(key => {
                if (validColumns.includes(key)) {
                    // Gérer les valeurs booléennes
                    if (key === 'scolarise' || key === 'ayant_droit') {
                        filteredData[key] = data[key] !== null && data[key] !== undefined ? Boolean(data[key]) : false;
                    } else {
                        filteredData[key] = data[key];
                    }
                }
            });

            // Validation des champs obligatoires
            if (!filteredData.id_agent || !filteredData.nom || !filteredData.prenom || !filteredData.date_de_naissance) {
                return res.status(400).json({
                    error: 'Les champs id_agent, nom, prenom et date_de_naissance sont obligatoires'
                });
            }

            // Validation du sexe
            if (filteredData.sexe && !['M', 'F'].includes(filteredData.sexe)) {
                return res.status(400).json({
                    error: 'Le sexe doit être "M" ou "F"'
                });
            }

            const columns = Object.keys(filteredData);
            const values = Object.values(filteredData);
            const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

            const query = `
                INSERT INTO enfants (${columns.join(', ')}, created_at, updated_at)
                VALUES (${placeholders}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const result = await pool.query(query, values);
            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la création de l\'enfant:', error);
            
            // Message d'erreur plus explicite
            if (error.code === '42703') {
                return res.status(400).json({
                    error: `Colonne invalide: ${error.message}`
                });
            }
            
            res.status(500).json({ error: 'Erreur serveur', details: error.message });
        }
    }

    // Mettre à jour un enfant
    async update(req, res) {
        try {
            const { id } = req.params;
            const data = req.body;

            // Filtrer les colonnes pour ne garder que les colonnes valides
            const validColumns = this.getValidColumns();
            const filteredData = {};

            Object.keys(data).forEach(key => {
                if (validColumns.includes(key) && key !== 'id') {
                    // Gérer les valeurs booléennes
                    if (key === 'scolarise' || key === 'ayant_droit') {
                        filteredData[key] = data[key] !== null && data[key] !== undefined ? Boolean(data[key]) : false;
                    } else {
                        filteredData[key] = data[key];
                    }
                }
            });

            if (Object.keys(filteredData).length === 0) {
                return res.status(400).json({ error: 'Aucune donnée valide à mettre à jour' });
            }

            // Validation du sexe si présent
            if (filteredData.sexe && !['M', 'F'].includes(filteredData.sexe)) {
                return res.status(400).json({
                    error: 'Le sexe doit être "M" ou "F"'
                });
            }

            const columns = Object.keys(filteredData);
            const values = Object.values(filteredData);
            const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

            const query = `
                UPDATE enfants 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${columns.length + 1}
                RETURNING *
            `;

            const result = await pool.query(query, [...values, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Enfant non trouvé' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'enfant:', error);
            
            // Message d'erreur plus explicite
            if (error.code === '42703') {
                return res.status(400).json({
                    error: `Colonne invalide: ${error.message}`
                });
            }
            
            res.status(500).json({ error: 'Erreur serveur', details: error.message });
        }
    }

    // Récupérer les enfants d'un agent
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;
            console.log(`🔍 getByAgent - Récupération des enfants pour agent ID: ${agentId}`);
            
            // Convertir agentId en entier pour éviter les problèmes de type
            const agentIdInt = parseInt(agentId, 10);
            if (isNaN(agentIdInt)) {
                console.error(`❌ getByAgent - agentId invalide: ${agentId}`);
                return res.status(400).json({ 
                    success: false, 
                    error: 'ID agent invalide' 
                });
            }
            
            console.log(`🔍 getByAgent - agentId converti en entier: ${agentIdInt}`);
            
            // D'abord, vérifier si la table enfants existe et contient des données pour cet agent
            const checkTableQuery = `
                SELECT COUNT(*) as count 
                FROM enfants 
                WHERE id_agent = $1
            `;
            const checkResult = await pool.query(checkTableQuery, [agentIdInt]);
            console.log(`🔍 getByAgent - Nombre total d'enfants pour agent ${agentIdInt}: ${checkResult.rows[0]?.count || 0}`);
            
            // Requête principale avec conversion explicite en entier
            const query = `
                SELECT id, nom, prenom, sexe, date_de_naissance, 
                       COALESCE(scolarise, false) as scolarise, 
                       COALESCE(ayant_droit, false) as ayant_droit,
                       id_agent
                FROM enfants
                WHERE id_agent = $1::integer
                ORDER BY date_de_naissance ASC, id ASC
            `;
            
            console.log(`🔍 getByAgent - Requête SQL: ${query}`);
            console.log(`🔍 getByAgent - Paramètre: ${agentIdInt} (type: integer)`);
            
            const result = await pool.query(query, [agentIdInt]);
            
            console.log(`🔍 getByAgent - Nombre d'enfants trouvés: ${result.rows.length}`);
            console.log(`🔍 getByAgent - Enfants récupérés:`, JSON.stringify(result.rows, null, 2));
            
            // Si toujours aucun résultat, faire des vérifications supplémentaires
            if (result.rows.length === 0) {
                console.log(`⚠️ getByAgent - Aucun enfant trouvé pour agent ${agentIdInt}`);
                console.log(`⚠️ Cela peut signifier que les enfants n'ont pas encore été créés dans la table enfants`);
                console.log(`⚠️ même si nombre_enfant > 0 dans la table agents`);
                
                // Vérifier le nombre_enfant de l'agent pour confirmer
                try {
                    const agentCheckQuery = `SELECT nombre_enfant FROM agents WHERE id = $1`;
                    const agentCheckResult = await pool.query(agentCheckQuery, [agentIdInt]);
                    if (agentCheckResult.rows.length > 0) {
                        const nombreEnfant = agentCheckResult.rows[0].nombre_enfant;
                        console.log(`🔍 getByAgent - nombre_enfant pour agent ${agentIdInt}: ${nombreEnfant}`);
                        if (nombreEnfant > 0) {
                            console.log(`⚠️ L'agent a nombre_enfant = ${nombreEnfant} mais aucun enfant dans la table enfants`);
                            console.log(`⚠️ Les enfants doivent être créés via l'API POST /api/enfants avec id_agent = ${agentIdInt}`);
                        }
                    }
                } catch (agentCheckError) {
                    console.error('❌ Erreur lors de la vérification du nombre_enfant:', agentCheckError);
                }
            }
            
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des enfants de l\'agent:', error);
            console.error('❌ Détails de l\'erreur:', {
                message: error.message,
                stack: error.stack,
                code: error.code,
                agentId: req.params.agentId
            });
            res.status(500).json({ error: 'Erreur serveur', details: error.message });
        }
    }
}

module.exports = EnfantsController;

