const pool = require('../config/database');

class FonctionsController {
    // Récupérer toutes les fonctions avec pagination et recherche
    async getAll(req, res) {
        try {
            const { page = 1, limit = 10, search = '', sortBy = 'libele', sortOrder = 'ASC' } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE 1=1';
            let params = [];
            let paramIndex = 1;

            if (search) {
                whereClause += ` AND f.libele ILIKE $${paramIndex}`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Filtre par ministère (id_ministere ou ministere_id) : afficher les fonctions du ministère + communes (id_ministere IS NULL)
            const idMinistere = req.query.id_ministere || req.query.ministere_id;
            if (idMinistere) {
                const mid = parseInt(idMinistere, 10);
                if (!isNaN(mid)) {
                    whereClause += ` AND (f.id_ministere = $${paramIndex} OR f.id_ministere IS NULL)`;
                    params.push(mid);
                    paramIndex++;
                }
            }

            const query = `
                SELECT f.*
                FROM fonctions f
                ${whereClause}
                ORDER BY f.${sortBy} ${sortOrder}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(parseInt(limit), offset);

            console.log('🔍 DEBUG - Requête SQL:', query);
            console.log('🔍 DEBUG - Paramètres:', params);

            const result = await pool.query(query, params);
            console.log('🔍 DEBUG - Résultat de la requête:', result.rows);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(*) as total
                FROM fonctions f
                ${whereClause}
            `;

            const countResult = await pool.query(countQuery, params.slice(0, -2));
            const total = parseInt(countResult.rows[0].total);

            console.log('🔍 DEBUG - Total des fonctions:', total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des fonctions:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer toutes les fonctions pour listes déroulantes (sans pagination)
    async getAllForSelect(req, res) {
        try {
            const { id_ministere, ministere_id } = req.query;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            const idMinistere = id_ministere || ministere_id;
            if (idMinistere) {
                const mid = parseInt(idMinistere, 10);
                if (!isNaN(mid)) {
                    whereClause += ` AND (f.id_ministere = $${paramIndex} OR f.id_ministere IS NULL)`;
                    params.push(mid);
                    paramIndex++;
                }
            }

            const query = `
                SELECT f.id, f.libele
                FROM fonctions f
                ${whereClause}
                ORDER BY f.libele ASC
            `;
            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (error) {
            console.error('Erreur getAllForSelect fonctions:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Récupérer une fonction par ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('SELECT * FROM fonctions WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Fonction non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('Erreur lors de la récupération de la fonction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }

    // Créer une nouvelle fonction
    async create(req, res) {
        try {
            console.log('🔍 DEBUG - Requête reçue:', req.body);

            // Accepter libelle ou libele (pour compatibilité)
            const libelle = req.body.libelle || req.body.libele;
            const { id_ministere, description, desc, is_active } = req.body;

            if (!libelle || libelle.trim() === '') {
                return res.status(400).json({ success: false, message: 'Le libellé est requis' });
            }

            // Construire la requête dynamiquement selon les colonnes disponibles
            const structureQuery = `
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'fonctions' 
                ORDER BY ordinal_position
            `;

            const structureResult = await pool.query(structureQuery);
            const availableColumns = structureResult.rows.map(row => row.column_name);

            let columns = ['libele'];
            let values = [libelle.trim()];
            let placeholders = ['$1'];
            let paramIndex = 2;

            // Ajouter id_ministere si la colonne existe et la valeur est fournie
            if (availableColumns.includes('id_ministere') && id_ministere !== undefined) {
                columns.push('id_ministere');
                values.push(id_ministere);
                placeholders.push(`$${paramIndex}`);
                paramIndex++;
            }

            // Ajouter description ou desc si disponible
            if (availableColumns.includes('description') && description !== undefined) {
                columns.push('description');
                values.push(description || null);
                placeholders.push(`$${paramIndex}`);
                paramIndex++;
            } else if (availableColumns.includes('desc') && desc !== undefined) {
                columns.push('desc');
                values.push(desc || null);
                placeholders.push(`$${paramIndex}`);
                paramIndex++;
            }

            // Ajouter is_active si disponible
            if (availableColumns.includes('is_active') && is_active !== undefined) {
                columns.push('is_active');
                values.push(is_active !== false);
                placeholders.push(`$${paramIndex}`);
                paramIndex++;
            }

            const query = `
                INSERT INTO fonctions (${columns.join(', ')}) 
                VALUES (${placeholders.join(', ')}) 
                RETURNING *
            `;

            console.log('🔍 DEBUG - Requête SQL:', query);
            console.log('🔍 DEBUG - Paramètres:', values);

            const result = await pool.query(query, values);

            console.log('🔍 DEBUG - Insertion réussie:', result.rows[0]);

            res.status(201).json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('❌ Erreur lors de la création de la fonction:', error);
            console.error('❌ Stack trace:', error.stack);
            res.status(500).json({ success: false, message: 'Erreur serveur: ' + error.message });
        }
    }

    // Mettre à jour une fonction
    async update(req, res) {
        try {
            const { id } = req.params;
            
            // Accepter libelle ou libele (pour compatibilité)
            const libelle = req.body.libelle || req.body.libele;
            const { id_ministere, is_active, description, desc } = req.body;

            // Validation : libelle est requis pour la mise à jour
            if (libelle !== undefined && (!libelle || libelle.trim() === '')) {
                return res.status(400).json({ success: false, message: 'Le libellé ne peut pas être vide' });
            }

            // Vérifier que la fonction existe
            const existingResult = await pool.query('SELECT * FROM fonctions WHERE id = $1', [id]);
            if (existingResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Fonction non trouvée' });
            }

            // Vérifier la structure de la table pour construire la requête dynamiquement
            const structureQuery = `
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'fonctions' 
                ORDER BY ordinal_position
            `;

            const structureResult = await pool.query(structureQuery);
            const availableColumns = structureResult.rows.map(row => row.column_name);

            // Construire la requête de mise à jour dynamiquement avec seulement les champs fournis
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            // Fonction helper pour convertir les chaînes vides en null
            const toNullIfEmpty = (value) => {
                if (value === '' || value === undefined) {
                    return null;
                }
                return value;
            };

            if (libelle !== undefined) {
                updateFields.push(`libele = $${paramIndex}`);
                updateValues.push(libelle.trim());
                paramIndex++;
            }

            if (id_ministere !== undefined && availableColumns.includes('id_ministere')) {
                updateFields.push(`id_ministere = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(id_ministere));
                paramIndex++;
            }

            if (description !== undefined && availableColumns.includes('description')) {
                updateFields.push(`description = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(description));
                paramIndex++;
            } else if (desc !== undefined && availableColumns.includes('desc')) {
                updateFields.push(`"desc" = $${paramIndex}`);
                updateValues.push(toNullIfEmpty(desc));
                paramIndex++;
            }

            if (is_active !== undefined && availableColumns.includes('is_active')) {
                updateFields.push(`is_active = $${paramIndex}`);
                updateValues.push(is_active !== false);
                paramIndex++;
            }

            // Si aucun champ à mettre à jour
            if (updateFields.length === 0) {
                return res.status(400).json({ success: false, message: 'Aucun champ à mettre à jour' });
            }

            // Ajouter l'ID à la fin pour la clause WHERE
            updateValues.push(id);
            const whereClause = `$${paramIndex}`;

            const updateQuery = `
                UPDATE fonctions 
                SET ${updateFields.join(', ')} 
                WHERE id = ${whereClause} 
                RETURNING *
            `;

            console.log('🔍 DEBUG - Requête de mise à jour:', updateQuery);
            console.log('🔍 DEBUG - Paramètres:', updateValues);

            const result = await pool.query(updateQuery, updateValues);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Fonction non trouvée' });
            }

            res.json({ success: true, data: result.rows[0] });
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de la fonction:', error);
            console.error('❌ Stack trace:', error.stack);
            res.status(500).json({ success: false, message: 'Erreur serveur: ' + error.message });
        }
    }

    // Supprimer une fonction
    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM fonctions WHERE id = $1 RETURNING *', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Fonction non trouvée' });
            }

            res.json({ success: true, message: 'Fonction supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la fonction:', error);
            res.status(500).json({ success: false, message: 'Erreur serveur' });
        }
    }
}

module.exports = new FonctionsController();