const BaseController = require('./BaseController');
const pool = require('../config/database');

class PaysController extends BaseController {
    constructor() {
        super('pays');
    }

    // Recherche de pays par terme
    async searchByTerm(req, res) {
        try {
            const { term } = req.params;
            const query = `
        SELECT * FROM pays 
        WHERE libele ILIKE $1
        ORDER BY libele ASC
      `;

            const result = await pool.query(query, [`%${term}%`]);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la recherche des pays:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Obtenir tous les pays sans pagination (pour les listes déroulantes)
    async getAllForSelect(req, res) {
        try {
            const query = `SELECT id, libele FROM pays ORDER BY libele ASC`;
            const result = await pool.query(query);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur lors de la récupération des pays:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        }
    }

    // Créer un pays avec sa nationalité liée
    async createWithNationality(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { nom, libele, nationalite_libele } = req.body;
            const paysName = nom || libele; // Accepter les deux noms de champs

            console.log('🔍 DEBUG PAYS - Données reçues:', req.body);
            console.log('🔍 DEBUG PAYS - nom:', nom);
            console.log('🔍 DEBUG PAYS - libele:', libele);
            console.log('🔍 DEBUG PAYS - paysName final:', paysName);
            console.log('🔍 DEBUG PAYS - nationalite_libele:', nationalite_libele);

            // Vérifier si le pays existe déjà
            const existingPays = await client.query('SELECT id FROM pays WHERE libele = $1', [paysName]);
            if (existingPays.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Ce pays existe déjà' });
            }

            // Créer le pays (champs simplifiés)
            const paysResult = await client.query(
                'INSERT INTO pays (libele) VALUES ($1) RETURNING id', [paysName]
            );
            const paysId = paysResult.rows[0].id;

            // Vérifier si la nationalité existe déjà (insensible à la casse et aux espaces)
            const trimmedNationalite = nationalite_libele.trim();
            const existingNationalite = await client.query(
                'SELECT id FROM nationalites WHERE LOWER(TRIM(libele)) = LOWER($1)', [trimmedNationalite]
            );
            let nationaliteId;

            if (existingNationalite.rows.length > 0) {
                nationaliteId = existingNationalite.rows[0].id;
            } else {
                try {
                    // Créer la nationalité
                    const nationaliteResult = await client.query(
                        'INSERT INTO nationalites (libele) VALUES ($1) RETURNING id', [trimmedNationalite]
                    );
                    nationaliteId = nationaliteResult.rows[0].id;
                } catch (insertError) {
                    // Si l'insertion échoue à cause d'une contrainte unique, récupérer l'ID existant
                    if (insertError.code === '23505') {
                        const existingResult = await client.query(
                            'SELECT id FROM nationalites WHERE libele = $1', [trimmedNationalite]
                        );
                        nationaliteId = existingResult.rows[0].id;
                    } else {
                        throw insertError;
                    }
                }
            }

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Pays et nationalité créés avec succès',
                data: {
                    pays: { id: paysId, libele: paysName },
                    nationalite: { id: nationaliteId, libele: nationalite_libele }
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de la création du pays avec nationalité:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        } finally {
            client.release();
        }
    }

    // Mettre à jour un pays avec sa nationalité
    async updateWithNationality(req, res) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { id } = req.params;
            const { nom, libele, nationalite_libele } = req.body;
            const paysName = nom || libele; // Accepter les deux noms de champs

            // Mettre à jour le pays (champs simplifiés)
            await client.query(
                'UPDATE pays SET libele = $1 WHERE id = $2', [paysName, id]
            );

            // Récupérer l'ancienne nationalité liée au pays
            const oldNationaliteResult = await client.query(
                'SELECT n.id FROM nationalites n JOIN pays p ON n.libele = p.libele WHERE p.id = $1', [id]
            );

            if (oldNationaliteResult.rows.length > 0) {
                const oldNationaliteId = oldNationaliteResult.rows[0].id;

                // Vérifier si la nouvelle nationalité existe (insensible à la casse et aux espaces)
                const trimmedNationalite = nationalite_libele.trim();
                const existingNationalite = await client.query(
                    'SELECT id FROM nationalites WHERE LOWER(TRIM(libele)) = LOWER($1)', [trimmedNationalite]
                );
                let nationaliteId;

                if (existingNationalite.rows.length > 0) {
                    nationaliteId = existingNationalite.rows[0].id;
                } else {
                    try {
                        // Créer la nouvelle nationalité
                        const nationaliteResult = await client.query(
                            'INSERT INTO nationalites (libele) VALUES ($1) RETURNING id', [trimmedNationalite]
                        );
                        nationaliteId = nationaliteResult.rows[0].id;
                    } catch (insertError) {
                        // Si l'insertion échoue à cause d'une contrainte unique, récupérer l'ID existant
                        if (insertError.code === '23505') {
                            const existingResult = await client.query(
                                'SELECT id FROM nationalites WHERE libele = $1', [trimmedNationalite]
                            );
                            nationaliteId = existingResult.rows[0].id;
                        } else {
                            throw insertError;
                        }
                    }
                }

                // Mettre à jour la nationalité
                await client.query(
                    'UPDATE nationalites SET libele = $1 WHERE id = $2', [trimmedNationalite, nationaliteId]
                );
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Pays et nationalité mis à jour avec succès'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erreur lors de la mise à jour du pays avec nationalité:', error);
            res.status(500).json({ error: 'Erreur interne du serveur' });
        } finally {
            client.release();
        }
    }
}

module.exports = PaysController;