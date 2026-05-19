const pool = require('../config/database');

class SettingsController {
    // Récupérer toutes les configurations
    async getSettings(req, res) {
        try {
            const result = await pool.query('SELECT key, value FROM configurations');
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des paramètres:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Récupérer uniquement les couleurs du thème
    async getColors(req, res) {
        try {
            const result = await pool.query("SELECT value FROM configurations WHERE key = 'theme_colors'");
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Couleurs du thème non trouvées'
                });
            }

            res.json({
                success: true,
                data: result.rows[0].value
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des couleurs:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Mettre à jour une configuration
    async updateSettings(req, res) {
        try {
            const { key, value } = req.body;

            if (!key || value === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'Clé et valeur requises'
                });
            }

            const result = await pool.query(
                'UPDATE configurations SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 RETURNING *',
                [JSON.stringify(value), key]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `Configuration avec la clé '${key}' non trouvée`
                });
            }

            res.json({
                success: true,
                message: 'Configuration mise à jour avec succès',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des paramètres:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Mettre à jour plusieurs configurations à la fois
    async updateMultipleSettings(req, res) {
        const client = await pool.connect();
        try {
            const { settings } = req.body; // Objet clé-valeur

            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Objet settings requis'
                });
            }

            await client.query('BEGIN');

            for (const [key, value] of Object.entries(settings)) {
                await client.query(
                    'UPDATE configurations SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
                    [JSON.stringify(value), key]
                );
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Configurations mises à jour avec succès'
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de la mise à jour multiple des paramètres:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        } finally {
            client.release();
        }
    }
}

module.exports = new SettingsController();
