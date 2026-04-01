const pool = require('../config/database');

class CongesInstitutionsController {
    constructor() {
        this.tableName = 'agent_conges_institutions';
        this.agentsTable = 'agents_institutions_main';
    }

    // Récupérer les congés d'un agent pour une année donnée
    async getByAgentAndYear(req, res) {
        try {
            const { agentId } = req.params;
            const { annee = new Date().getFullYear() } = req.query;

            const query = `
                SELECT 
                    id,
                    id_agent,
                    annee,
                    jours_pris,
                    jours_alloues,
                    jours_restants,
                    jours_reportes,
                    dette_annee_suivante,
                    commentaires,
                    created_at,
                    updated_at
                FROM ${this.tableName}
                WHERE id_agent = $1 AND annee = $2
            `;

            const result = await pool.query(query, [agentId, parseInt(annee)]);

            if (result.rows.length === 0) {
                // Créer une entrée par défaut si elle n'existe pas
                const congesDefault = await this.createOrUpdateConges(agentId, parseInt(annee));
                return res.json({ success: true, data: congesDefault });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération des congés:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer tous les congés d'un agent
    async getAllByAgent(req, res) {
        try {
            const { agentId } = req.params;

            const query = `
                SELECT 
                    id,
                    id_agent,
                    annee,
                    jours_pris,
                    jours_alloues,
                    jours_restants,
                    jours_reportes,
                    dette_annee_suivante,
                    commentaires,
                    created_at,
                    updated_at
                FROM ${this.tableName}
                WHERE id_agent = $1
                ORDER BY annee DESC
            `;

            const result = await pool.query(query, [agentId]);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des congés:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Récupérer les congés d'un agent pour des années spécifiques
    async getByAgentAndYears(req, res) {
        try {
            const { agentId } = req.params;
            const { years } = req.query;

            if (!years) {
                return res.status(400).json({
                    success: false,
                    message: 'Les années sont requises'
                });
            }

            const yearsArray = years.split(',').map(y => parseInt(y.trim()));

            const query = `
                SELECT 
                    id,
                    id_agent,
                    annee,
                    jours_pris,
                    jours_alloues,
                    jours_restants,
                    jours_reportes,
                    dette_annee_suivante,
                    commentaires,
                    created_at,
                    updated_at
                FROM ${this.tableName}
                WHERE id_agent = $1 AND annee = ANY($2::int[])
                ORDER BY annee DESC
            `;

            const result = await pool.query(query, [agentId, yearsArray]);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            console.error('Erreur lors de la récupération des congés:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Créer ou mettre à jour les congés d'un agent
    async createOrUpdateConges(agentId, annee, data = {}) {
        try {
            const {
                jours_alloues = 30,
                jours_pris = 0,
                jours_restants = 30,
                jours_reportes = 0,
                dette_annee_suivante = 0,
                commentaires = null
            } = data;

            const query = `
                INSERT INTO ${this.tableName} (
                    id_agent, annee, jours_alloues, jours_pris, 
                    jours_restants, jours_reportes, dette_annee_suivante, commentaires
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id_agent, annee) 
                DO UPDATE SET
                    jours_alloues = EXCLUDED.jours_alloues,
                    jours_pris = EXCLUDED.jours_pris,
                    jours_restants = EXCLUDED.jours_restants,
                    jours_reportes = EXCLUDED.jours_reportes,
                    dette_annee_suivante = EXCLUDED.dette_annee_suivante,
                    commentaires = EXCLUDED.commentaires,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;

            const result = await pool.query(query, [
                agentId, annee, jours_alloues, jours_pris, 
                jours_restants, jours_reportes, dette_annee_suivante, commentaires
            ]);

            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la création/mise à jour des congés:', error);
            throw error;
        }
    }

    // Mettre à jour les congés (endpoint API)
    async update(req, res) {
        try {
            const { agentId } = req.params;
            const { annee, ...updateData } = req.body;

            if (!annee) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'année est requise'
                });
            }

            const conges = await this.createOrUpdateConges(agentId, annee, updateData);
            res.json({ success: true, data: conges });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des congés:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Déduire des jours de congés
    async deduireJours(req, res) {
        try {
            const { agentId } = req.params;
            const { annee, jours } = req.body;

            if (!annee || !jours) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'année et le nombre de jours sont requis'
                });
            }

            const congesQuery = `
                SELECT * FROM ${this.tableName}
                WHERE id_agent = $1 AND annee = $2
            `;
            const congesResult = await pool.query(congesQuery, [agentId, annee]);

            let conges;
            if (congesResult.rows.length === 0) {
                conges = await this.createOrUpdateConges(agentId, annee);
            } else {
                conges = congesResult.rows[0];
            }

            const nouveauxJoursPris = (conges.jours_pris || 0) + parseInt(jours);
            const nouveauxJoursRestants = (conges.jours_alloues || 30) - nouveauxJoursPris;

            const result = await this.createOrUpdateConges(agentId, annee, {
                jours_alloues: conges.jours_alloues,
                jours_pris: nouveauxJoursPris,
                jours_restants: Math.max(0, nouveauxJoursRestants),
                jours_reportes: conges.jours_reportes,
                dette_annee_suivante: nouveauxJoursRestants < 0 ? Math.abs(nouveauxJoursRestants) : 0
            });

            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Erreur lors de la déduction de jours:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Initialiser les congés pour tous les agents d'une institution
    async initializeForInstitution(req, res) {
        try {
            const { id_institution, annee = new Date().getFullYear() } = req.query;

            if (!id_institution) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'ID de l\'institution est requis'
                });
            }

            // Récupérer tous les agents de l'institution
            const agentsQuery = `
                SELECT id FROM ${this.agentsTable}
                WHERE id_institution = $1 AND (retire IS NULL OR retire = false)
            `;
            const agentsResult = await pool.query(agentsQuery, [id_institution]);

            // Initialiser les congés pour chaque agent
            const promises = agentsResult.rows.map(agent => 
                this.createOrUpdateConges(agent.id, annee)
            );

            await Promise.all(promises);

            res.json({
                success: true,
                message: `Congés initialisés pour ${agentsResult.rows.length} agents`,
                data: {
                    annee: annee,
                    nombre_agents: agentsResult.rows.length
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des congés:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }

    // Obtenir un résumé des congés pour une institution
    async getSummaryByInstitution(req, res) {
        try {
            const { id_institution, annee = new Date().getFullYear() } = req.query;

            if (!id_institution) {
                return res.status(400).json({
                    success: false,
                    message: 'L\'ID de l\'institution est requis'
                });
            }

            const query = `
                SELECT 
                    COUNT(DISTINCT ac.id_agent) as total_agents,
                    SUM(ac.jours_alloues) as total_jours_alloues,
                    SUM(ac.jours_pris) as total_jours_pris,
                    SUM(ac.jours_restants) as total_jours_restants,
                    SUM(ac.jours_reportes) as total_jours_reportes,
                    AVG(ac.jours_restants) as moyenne_jours_restants
                FROM ${this.tableName} ac
                JOIN ${this.agentsTable} a ON ac.id_agent = a.id
                WHERE a.id_institution = $1 AND ac.annee = $2
            `;

            const result = await pool.query(query, [id_institution, annee]);
            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération du résumé des congés:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
        }
    }
}

module.exports = new CongesInstitutionsController();

