const crypto = require('crypto');
const pool = require('../config/database');

class AuthCodeService {
    constructor() {
        this.codeExpirationTime = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
    }

    // Générer un code de connexion unique
    generateLoginCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    // Sauvegarder un code de connexion pour un agent
    async saveLoginCode(agentId, code) {
        try {
            const expiresAt = new Date(Date.now() + this.codeExpirationTime);

            // Supprimer les anciens codes pour cet agent
            await pool.query(
                'DELETE FROM agent_login_codes WHERE agent_id = $1', [agentId]
            );

            // Insérer le nouveau code
            const result = await pool.query(
                'INSERT INTO agent_login_codes (agent_id, code, expires_at, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING *', [agentId, code, expiresAt]
            );

            return result.rows[0];
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du code de connexion:', error);
            throw error;
        }
    }

    // Vérifier un code de connexion
    async verifyLoginCode(agentId, code) {
        try {
            const result = await pool.query(
                'SELECT * FROM agent_login_codes WHERE agent_id = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP', [agentId, code]
            );

            if (result.rows.length === 0) {
                return { valid: false, reason: 'Code invalide ou expiré' };
            }

            const loginCode = result.rows[0];

            // Marquer le code comme utilisé
            await pool.query(
                'UPDATE agent_login_codes SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [loginCode.id]
            );

            return { valid: true, loginCode };
        } catch (error) {
            console.error('Erreur lors de la vérification du code de connexion:', error);
            return { valid: false, reason: 'Erreur interne' };
        }
    }

    // Récupérer un agent par matricule avec grade et type d'agent
    async getAgentByMatricule(matricule) {
        try {
            const result = await pool.query(
                `SELECT 
                    a.*,
                    g.libele as grade_libele,
                    ta.id as id_type_d_agent,
                    ta.libele as type_agent_libele
                FROM agents a
                LEFT JOIN grades g ON a.id_grade = g.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                WHERE a.matricule = $1`, 
                [matricule]
            );

            const agent = result.rows[0] || null;
            
            // Vérifier si la colonne retire existe (pour compatibilité avec les anciennes bases de données)
            if (agent && agent.retire === undefined) {
                // Si la colonne n'existe pas encore, considérer que l'agent n'est pas retiré
                agent.retire = false;
            }
            
            return agent;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'agent par matricule:', error);
            throw error;
        }
    }

    // Nettoyer les codes expirés
    async cleanupExpiredCodes() {
        try {
            const result = await pool.query(
                'DELETE FROM agent_login_codes WHERE expires_at < CURRENT_TIMESTAMP'
            );

            console.log(`🧹 ${result.rowCount} codes de connexion expirés supprimés`);
            return result.rowCount;
        } catch (error) {
            console.error('Erreur lors du nettoyage des codes expirés:', error);
            throw error;
        }
    }

    // Récupérer les statistiques des codes
    async getCodeStats() {
        try {
            const stats = {};

            // Total des codes actifs
            const activeResult = await pool.query(
                'SELECT COUNT(*) FROM agent_login_codes WHERE expires_at > CURRENT_TIMESTAMP'
            );
            stats.activeCodes = parseInt(activeResult.rows[0].count);

            // Codes utilisés aujourd'hui
            const usedTodayResult = await pool.query(
                'SELECT COUNT(*) FROM agent_login_codes WHERE used_at::date = CURRENT_DATE'
            );
            stats.usedToday = parseInt(usedTodayResult.rows[0].count);

            // Codes expirés
            const expiredResult = await pool.query(
                'SELECT COUNT(*) FROM agent_login_codes WHERE expires_at < CURRENT_TIMESTAMP'
            );
            stats.expiredCodes = parseInt(expiredResult.rows[0].count);

            return stats;
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques des codes:', error);
            throw error;
        }
    }
}

module.exports = new AuthCodeService();