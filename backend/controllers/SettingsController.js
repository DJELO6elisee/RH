const pool = require('../config/database');

class SettingsController {
    // Récupérer toutes les configurations
    async getSettings(req, res) {
        try {
            const result = await pool.query('SELECT key, value FROM configurations');
            
            const parsedData = result.rows.map(row => {
                let parsedValue = row.value;
                if (typeof row.value === 'string') {
                    try {
                        parsedValue = JSON.parse(row.value);
                    } catch (e) {
                        // Garder la chaîne brute si ce n'est pas du JSON valide
                    }
                }
                return { key: row.key, value: parsedValue };
            });

            res.json({
                success: true,
                data: parsedData
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

            let colors = result.rows[0].value;
            if (typeof colors === 'string') {
                try {
                    colors = JSON.parse(colors);
                } catch (e) {
                    // Ignorer
                }
            }

            res.json({
                success: true,
                data: colors
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
                `INSERT INTO configurations (key, value) 
                 VALUES ($2, $1) 
                 ON CONFLICT (key) 
                 DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP 
                 RETURNING *`,
                [JSON.stringify(value), key]
            );

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

            if (Array.isArray(settings)) {
                for (const item of settings) {
                    if (item.key && item.value !== undefined) {
                        await client.query(
                            `INSERT INTO configurations (key, value) 
                             VALUES ($2, $1) 
                             ON CONFLICT (key) 
                             DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
                            [JSON.stringify(item.value), item.key]
                        );
                    }
                }
            } else {
                for (const [key, value] of Object.entries(settings)) {
                    await client.query(
                        `INSERT INTO configurations (key, value) 
                         VALUES ($2, $1) 
                         ON CONFLICT (key) 
                         DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
                        [JSON.stringify(value), key]
                    );
                }
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
