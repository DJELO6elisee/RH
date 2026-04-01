const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

class AgentSindicatsController {
    // Récupérer tous les syndicats des agents avec informations complètes
    async getAllWithAgentInfo(req, res) {
        try {
            const { page = 1, limit = 10, search = '', ministere_id, sindicat_id } = req.query;
            const offset = (page - 1) * limit;

            // Déterminer le ministère à utiliser pour le filtrage
            let ministereId = null;
            
            // Priorité 1: Paramètre ministere_id dans la requête
            if (ministere_id) {
                ministereId = parseInt(ministere_id);
            } else {
                // Priorité 2: Ministère de l'utilisateur connecté
                if (req.user && req.user.id_agent) {
                    try {
                        const userAgentQuery = await pool.query(
                            'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                        );
                        if (userAgentQuery.rows.length > 0) {
                            ministereId = userAgentQuery.rows[0].id_ministere;
                        }
                    } catch (error) {
                        console.error('Erreur lors de la récupération du ministère de l\'utilisateur:', error);
                    }
                }
            }

            // Construire la clause WHERE et les paramètres
            const whereConditions = [];
            const queryParams = [];

            // Exclure les agents à la retraite et les agents retirés
            whereConditions.push(`(a.statut_emploi IS NULL OR LOWER(a.statut_emploi) != 'retraite')`);
            whereConditions.push(`(a.retire IS NULL OR a.retire = false)`);

            // Filtrer par ministère (obligatoire)
            if (ministereId) {
                whereConditions.push(`a.id_ministere = $${queryParams.length + 1}`);
                queryParams.push(ministereId);
            } else {
                // Si aucun ministère n'est spécifié, retourner une erreur
                return res.status(400).json({
                    success: false,
                    message: 'Le filtrage par ministère est obligatoire'
                });
            }

            // Filtrer par syndicat si fourni
            let sindicatFilter = '';
            if (sindicat_id && sindicat_id !== '' && sindicat_id !== 'all') {
                const sindParam = queryParams.length + 1;
                sindicatFilter = `AND asind_filter.id_sindicat = $${sindParam}`;
                queryParams.push(parseInt(sindicat_id));
            }

            // Ajouter la recherche si fournie
            if (search && search.trim() !== '') {
                const searchPattern = `%${search.trim()}%`;
                const param1 = queryParams.length + 1;
                const param2 = queryParams.length + 2;
                const param3 = queryParams.length + 3;
                whereConditions.push(`(a.nom ILIKE $${param1} OR a.prenom ILIKE $${param2} OR a.matricule ILIKE $${param3})`);
                queryParams.push(searchPattern, searchPattern, searchPattern);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Requête pour récupérer tous les agents du ministère avec leurs syndicats
            const limitParam = queryParams.length + 1;
            const offsetParam = queryParams.length + 2;
            
            // Si on filtre par syndicat, on doit joindre agents_sindicats pour filtrer
            const sindicatJoin = (sindicat_id && sindicat_id !== '' && sindicat_id !== 'all') 
                ? `INNER JOIN agents_sindicats asind_filter ON a.id = asind_filter.id_agent ${sindicatFilter}`
                : '';
            
            const query = `
                SELECT DISTINCT
                    a.id,
                    a.nom,
                    a.prenom,
                    a.matricule,
                    a.email,
                    a.telephone1,
                    COALESCE(sindicats_counts.nb_sindicats, 0) as nb_sindicats,
                    sindicats_counts.dernier_sindicat_date,
                    sindicats_counts.dernier_sindicat_nom,
                    CASE 
                        WHEN a.statut_emploi = 'actif' THEN 'Actif'
                        WHEN a.statut_emploi = 'inactif' THEN 'Inactif'
                        WHEN a.statut_emploi = 'retraite' THEN 'Retraité'
                        WHEN a.statut_emploi = 'demission' THEN 'Démission'
                        WHEN a.statut_emploi = 'licencie' THEN 'Licencié'
                        ELSE a.statut_emploi
                    END as statut_emploi_libelle
                FROM agents a
                ${sindicatJoin}
                LEFT JOIN (
                    SELECT 
                        asind.id_agent,
                        COUNT(asind.id) as nb_sindicats,
                        MAX(COALESCE(asind.date_adhesion, asind.created_at)) as dernier_sindicat_date,
                        -- Dernier syndicat (le plus récent par date)
                        (
                            SELECT COALESCE(s.libele, 'N/A')
                            FROM agents_sindicats asind2
                            LEFT JOIN sindicats s ON asind2.id_sindicat = s.id
                            WHERE asind2.id_agent = asind.id_agent
                            ORDER BY COALESCE(asind2.date_adhesion, asind2.created_at) DESC
                            LIMIT 1
                        ) as dernier_sindicat_nom
                    FROM agents_sindicats asind
                    WHERE asind.statut = 'actif'
                    GROUP BY asind.id_agent
                ) sindicats_counts ON a.id = sindicats_counts.id_agent
                ${whereClause}
                ORDER BY a.nom, a.prenom
                LIMIT $${limitParam} OFFSET $${offsetParam}
            `;

            queryParams.push(parseInt(limit), parseInt(offset));

            const result = await pool.query(query, queryParams);

            // Compter le total pour la pagination
            const countQuery = `
                SELECT COUNT(DISTINCT a.id) as total
                FROM agents a
                ${sindicatJoin}
                LEFT JOIN agents_sindicats asind ON a.id = asind.id_agent
                ${whereClause}
            `;
            const countParams = queryParams.slice(0, -2);
            const countResult = await pool.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            res.json({
                success: true,
                data: result.rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Récupérer les syndicats d'un agent spécifique
    async getByAgent(req, res) {
        try {
            const { agentId } = req.params;

            // Vérifier que l'agent existe et récupérer son ministère
            const agentCheck = await pool.query(
                'SELECT id, id_ministere FROM agents WHERE id = $1', 
                [agentId]
            );
            
            if (agentCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const agentMinistereId = agentCheck.rows[0].id_ministere;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        // Si l'utilisateur a un ministère, vérifier qu'il correspond à celui de l'agent
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous n\'avez pas accès aux syndicats de cet agent'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            const query = `
                SELECT 
                    asind.*,
                    s.libele as sindicat_nom,
                    s.id as sindicat_id
                FROM agents_sindicats asind
                LEFT JOIN sindicats s ON asind.id_sindicat = s.id
                WHERE asind.id_agent = $1
                ORDER BY COALESCE(asind.date_adhesion, asind.created_at) DESC
            `;

            const result = await pool.query(query, [agentId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des syndicats de l\'agent:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des syndicats de l\'agent',
                error: error.message
            });
        }
    }

    // Créer un nouveau syndicat pour un agent
    async create(req, res) {
        try {
            const { id_agent, id_sindicat, date_adhesion, date_fin, role, statut } = req.body;

            // Gérer le fichier d'attestation uploadé
            let fichier_attestation_url = null;
            let fichier_attestation_nom = null;
            let fichier_attestation_taille = null;
            let fichier_attestation_type = null;

            if (req.file) {
                fichier_attestation_url = `/uploads/sindicats/${req.file.filename}`;
                fichier_attestation_nom = req.file.originalname;
                fichier_attestation_taille = req.file.size;
                fichier_attestation_type = req.file.mimetype;
            } else if (req.body.fichier_attestation_url) {
                // Si les données sont envoyées directement dans le body (pour compatibilité)
                fichier_attestation_url = req.body.fichier_attestation_url;
                fichier_attestation_nom = req.body.fichier_attestation_nom;
                fichier_attestation_taille = req.body.fichier_attestation_taille;
                fichier_attestation_type = req.body.fichier_attestation_type;
            }

            // Vérifier que l'agent existe et récupérer son ministère
            const agentQuery = await pool.query('SELECT id, id_ministere FROM agents WHERE id = $1', [id_agent]);
            if (agentQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent non trouvé'
                });
            }

            const agentMinistereId = agentQuery.rows[0].id_ministere;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous ne pouvez pas créer un syndicat pour un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Vérifier que le syndicat existe
            if (id_sindicat) {
                const sindicatQuery = await pool.query('SELECT id FROM sindicats WHERE id = $1', [id_sindicat]);
                if (sindicatQuery.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Syndicat non trouvé'
                    });
                }
            }

            // Vérifier si un syndicat similaire existe déjà
            const existingQuery = `
                SELECT id FROM agents_sindicats 
                WHERE id_agent = $1 AND id_sindicat = $2 AND date_adhesion = $3
            `;
            const existing = await pool.query(existingQuery, [id_agent, id_sindicat, date_adhesion]);
            if (existing.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Ce syndicat existe déjà pour cet agent avec cette date d\'adhésion'
                });
            }

            // Créer l'entrée dans agents_sindicats
            const insertQuery = `
                INSERT INTO agents_sindicats (
                    id_agent, 
                    id_sindicat, 
                    date_adhesion, 
                    date_fin, 
                    role, 
                    statut,
                    fichier_attestation_url,
                    fichier_attestation_nom,
                    fichier_attestation_taille,
                    fichier_attestation_type
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `;
            const result = await pool.query(insertQuery, [
                id_agent, 
                id_sindicat, 
                date_adhesion, 
                date_fin || null, 
                role || null, 
                statut || 'actif',
                fichier_attestation_url || null,
                fichier_attestation_nom || null,
                fichier_attestation_taille || null,
                fichier_attestation_type || null
            ]);

            res.status(201).json({
                success: true,
                message: 'Syndicat créé avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création du syndicat:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création du syndicat',
                error: error.message
            });
        }
    }

    // Récupérer un syndicat spécifique
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT 
                    asind.*,
                    s.libele as sindicat_nom,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule as agent_matricule
                FROM agents_sindicats asind
                LEFT JOIN sindicats s ON asind.id_sindicat = s.id
                LEFT JOIN agents a ON asind.id_agent = a.id
                WHERE asind.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Syndicat non trouvé'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération du syndicat:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du syndicat',
                error: error.message
            });
        }
    }

    // Mettre à jour un syndicat
    async update(req, res) {
        try {
            const { id } = req.params;
            const { id_sindicat, date_adhesion, date_fin, role, statut } = req.body;

            // Gérer le fichier d'attestation uploadé
            let fichier_attestation_url = undefined;
            let fichier_attestation_nom = undefined;
            let fichier_attestation_taille = undefined;
            let fichier_attestation_type = undefined;

            if (req.file) {
                fichier_attestation_url = `/uploads/sindicats/${req.file.filename}`;
                fichier_attestation_nom = req.file.originalname;
                fichier_attestation_taille = req.file.size;
                fichier_attestation_type = req.file.mimetype;
            } else if (req.body.fichier_attestation_url !== undefined) {
                // Si les données sont envoyées directement dans le body (pour compatibilité)
                fichier_attestation_url = req.body.fichier_attestation_url;
                fichier_attestation_nom = req.body.fichier_attestation_nom;
                fichier_attestation_taille = req.body.fichier_attestation_taille;
                fichier_attestation_type = req.body.fichier_attestation_type;
            }

            // Vérifier que le syndicat existe et récupérer l'agent associé
            const existingQuery = await pool.query(
                'SELECT asind.*, a.id_ministere as agent_ministere_id FROM agents_sindicats asind JOIN agents a ON asind.id_agent = a.id WHERE asind.id = $1', 
                [id]
            );
            if (existingQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Syndicat non trouvé'
                });
            }

            const sindicat = existingQuery.rows[0];
            const agentMinistereId = sindicat.agent_ministere_id;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous ne pouvez pas modifier un syndicat d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Construire dynamiquement la requête UPDATE pour inclure seulement les champs fournis
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;

            if (id_sindicat !== undefined) {
                updateFields.push(`id_sindicat = $${paramIndex++}`);
                updateValues.push(id_sindicat);
            }
            if (date_adhesion !== undefined) {
                updateFields.push(`date_adhesion = $${paramIndex++}`);
                updateValues.push(date_adhesion);
            }
            if (date_fin !== undefined) {
                updateFields.push(`date_fin = $${paramIndex++}`);
                updateValues.push(date_fin);
            }
            if (role !== undefined) {
                updateFields.push(`role = $${paramIndex++}`);
                updateValues.push(role);
            }
            if (statut !== undefined) {
                updateFields.push(`statut = $${paramIndex++}`);
                updateValues.push(statut);
            }
            if (fichier_attestation_url !== undefined) {
                updateFields.push(`fichier_attestation_url = $${paramIndex++}`);
                updateValues.push(fichier_attestation_url);
            }
            if (fichier_attestation_nom !== undefined) {
                updateFields.push(`fichier_attestation_nom = $${paramIndex++}`);
                updateValues.push(fichier_attestation_nom);
            }
            if (fichier_attestation_taille !== undefined) {
                updateFields.push(`fichier_attestation_taille = $${paramIndex++}`);
                updateValues.push(fichier_attestation_taille);
            }
            if (fichier_attestation_type !== undefined) {
                updateFields.push(`fichier_attestation_type = $${paramIndex++}`);
                updateValues.push(fichier_attestation_type);
            }

            // Toujours mettre à jour updated_at
            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

            // Ajouter l'ID pour la clause WHERE
            updateValues.push(id);

            if (updateFields.length === 1) {
                // Seulement updated_at, pas de mise à jour réelle
                return res.status(400).json({
                    success: false,
                    message: 'Aucun champ à mettre à jour'
                });
            }

            const updateQuery = `
                UPDATE agents_sindicats 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;
            const result = await pool.query(updateQuery, updateValues);

            res.json({
                success: true,
                message: 'Syndicat mis à jour avec succès',
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour du syndicat:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du syndicat',
                error: error.message
            });
        }
    }

    // Supprimer un syndicat
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Récupérer le ministère de l'agent
            const sindicatQuery = await pool.query(
                'SELECT asind.*, a.id_ministere as agent_ministere_id FROM agents_sindicats asind JOIN agents a ON asind.id_agent = a.id WHERE asind.id = $1', 
                [id]
            );
            if (sindicatQuery.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Syndicat non trouvé'
                });
            }

            const agentMinistereId = sindicatQuery.rows[0].agent_ministere_id;

            // Vérifier que l'utilisateur a accès au ministère de l'agent
            if (req.user && req.user.id_agent) {
                try {
                    const userAgentQuery = await pool.query(
                        'SELECT id_ministere FROM agents WHERE id = $1', 
                        [req.user.id_agent]
                    );
                    if (userAgentQuery.rows.length > 0) {
                        const userMinistereId = userAgentQuery.rows[0].id_ministere;
                        if (userMinistereId && userMinistereId !== agentMinistereId) {
                            return res.status(403).json({
                                success: false,
                                message: 'Accès refusé: vous ne pouvez pas supprimer un syndicat d\'un agent d\'un autre ministère'
                            });
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la vérification du ministère:', error);
                }
            }

            // Supprimer le syndicat
            await pool.query('DELETE FROM agents_sindicats WHERE id = $1', [id]);

            res.json({
                success: true,
                message: 'Syndicat supprimé avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du syndicat:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression du syndicat',
                error: error.message
            });
        }
    }

    // Servir le fichier d'attestation de syndicat
    async serveAttestationFile(req, res) {
        try {
            const { id } = req.params;

            // Récupérer les informations du syndicat
            const query = `
                SELECT 
                    fichier_attestation_url,
                    fichier_attestation_nom,
                    fichier_attestation_type
                FROM agents_sindicats
                WHERE id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Syndicat non trouvé'
                });
            }

            const sindicat = result.rows[0];

            if (!sindicat.fichier_attestation_url) {
                return res.status(404).json({
                    success: false,
                    message: 'Aucun fichier d\'attestation trouvé pour ce syndicat'
                });
            }

            // Construire le chemin absolu du fichier
            const uploadsRoot = path.join(__dirname, '..', 'uploads');
            let filePath = path.join(uploadsRoot, sindicat.fichier_attestation_url.replace(/^\/uploads\//, ''));

            // Sécurité : s'assurer que le chemin est dans le dossier uploads
            if (!filePath.startsWith(uploadsRoot)) {
                return res.status(400).json({
                    success: false,
                    message: 'Chemin de fichier invalide.'
                });
            }

            // Vérifier que le fichier existe
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Le fichier demandé est introuvable sur le serveur.'
                });
            }

            // Déterminer le type MIME
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png'
            };
            const mimeType = mimeTypes[ext] || sindicat.fichier_attestation_type || 'application/octet-stream';

            // Définir les headers CORS
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(sindicat.fichier_attestation_nom || path.basename(filePath))}"`);
            res.setHeader('Cache-Control', 'public, max-age=3600');

            console.log('📤 Envoi du fichier d\'attestation:', {
                path: filePath,
                mimeType: mimeType,
                exists: fs.existsSync(filePath)
            });

            res.sendFile(filePath);
        } catch (error) {
            console.error('Erreur lors du service du fichier d\'attestation:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors du téléchargement du fichier',
                error: error.message
            });
        }
    }
}

module.exports = new AgentSindicatsController();
