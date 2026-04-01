const db = require('../config/database');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class DecisionsController {
    /**
     * Génère un numéro de décision automatique pour une année donnée et une direction ou sous-direction donnée.
     * Le numéro est séquentiel par (année, direction) ou par (année, sous-direction).
     * Format: DECISION N [numéro séquentiel] MT/DRH/SDP [année] ou avec suffixe DIR/SD pour traçabilité.
     * @param {Object} options - { id_direction?: number, id_sous_direction?: number, year?: number }
     */
    async generateDecisionNumber(options = {}) {
        try {
            const year = options.year != null ? options.year : new Date().getFullYear();
            const idDirection = options.id_direction != null ? parseInt(options.id_direction, 10) : null;
            const idSousDirection = options.id_sous_direction != null ? parseInt(options.id_sous_direction, 10) : null;

            const prefix = `N°`;
            const suffix = `MINTOUR/DRH/SDGP ${year}`;

            // Dernier numéro pour cette année et ce périmètre (direction ou sous-direction)
            // Utiliser annee_decision si la colonne est renseignée, sinon fallback sur numero_acte LIKE
            let result;
            if (idDirection != null && !isNaN(idDirection)) {
                result = await db.query(`
                    SELECT numero_acte 
                    FROM decisions 
                    WHERE (annee_decision = $1 OR (annee_decision IS NULL AND numero_acte LIKE $2))
                      AND id_direction = $3
                      AND (id_sous_direction IS NULL)
                    ORDER BY created_at DESC 
                    LIMIT 1
                `, [year, `%${suffix}%`, idDirection]);
            } else if (idSousDirection != null && !isNaN(idSousDirection)) {
                result = await db.query(`
                    SELECT numero_acte 
                    FROM decisions 
                    WHERE (annee_decision = $1 OR (annee_decision IS NULL AND numero_acte LIKE $2))
                      AND id_sous_direction = $3
                    ORDER BY created_at DESC 
                    LIMIT 1
                `, [year, `%${suffix}%`, idSousDirection]);
            } else {
                result = await db.query(`
                    SELECT numero_acte 
                    FROM decisions 
                    WHERE (annee_decision = $1 OR (annee_decision IS NULL AND numero_acte LIKE $2))
                      AND (id_direction IS NULL AND id_sous_direction IS NULL)
                    ORDER BY created_at DESC 
                    LIMIT 1
                `, [year, `%${suffix}%`]);
            }

            let nextNumber = 1;
            if (result.rows.length > 0 && result.rows[0].numero_acte) {
                const lastNumero = result.rows[0].numero_acte;
                const match = lastNumero.match(/DECISION N\s*(\d+)/i);
                if (match && match[1]) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }

            const numeroFormate = String(nextNumber).padStart(3, '0');
            return `${prefix} ${numeroFormate} ${suffix}`;
        } catch (error) {
            console.error('❌ Erreur lors de la génération du numéro de décision:', error);
            const currentYear = new Date().getFullYear();
            const timestamp = String((Date.now() % 1000) || 1).padStart(3, '0');
            return `DECISION N° ${timestamp} MINTOUR/DRH/SDGP ${currentYear}`;
        }
    }

    /**
     * Créer une nouvelle décision (collective ou individuelle)
     */
    async create(req, res) {
        try {
            const { type, numero_acte, id_direction, id_sous_direction, year: yearBody } = req.body;
            // created_by doit être un id de la table agents (FK), pas l'id utilisateur
            const createdByAgentId = req.user?.id_agent ?? null;
            const currentYear = new Date().getFullYear();
            const allowedYears = [currentYear, currentYear - 1, currentYear - 2];
            const year = (yearBody != null && yearBody !== '') ? parseInt(yearBody, 10) : currentYear;
            if (isNaN(year) || !allowedYears.includes(year)) {
                return res.status(400).json({
                    success: false,
                    error: `L'année doit être l'année en cours ou l'une des deux années précédentes (${allowedYears.join(', ')})`
                });
            }

            // Validation
            if (!type || !['collective', 'individuelle'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Le type de décision doit être "collective" ou "individuelle"'
                });
            }

            // Validation pour les décisions collectives
            if (type === 'collective') {
                if (!id_direction && !id_sous_direction) {
                    return res.status(400).json({
                        success: false,
                        error: 'Pour une décision collective, veuillez spécifier une direction ou une sous-direction'
                    });
                }
                if (id_direction && id_sous_direction) {
                    return res.status(400).json({
                        success: false,
                        error: 'Veuillez spécifier soit une direction, soit une sous-direction, pas les deux'
                    });
                }
            }

            // Le document de décision n'est pas obligatoire ; le numéro d'acte peut être saisi ou généré automatiquement
            let cheminDocument = null;
            if (req.file) {
                // Le fichier a déjà été sauvegardé par multer
                cheminDocument = `uploads/decisions/${req.file.filename}`;
                console.log(`✅ Fichier uploadé: ${req.file.filename}`);
                console.log(`✅ Chemin complet du fichier: ${req.file.path}`);
                console.log(`✅ Chemin stocké en DB: ${cheminDocument}`);
                
                // Vérifier que le fichier existe réellement
                if (fsSync.existsSync(req.file.path)) {
                    console.log(`✅ Fichier confirmé présent sur le disque`);
                } else {
                    console.error(`❌ ERREUR: Fichier uploadé mais non trouvé sur le disque: ${req.file.path}`);
                }
            }
        

            // Générer automatiquement le numéro si non fourni (par année choisie + direction ou sous-direction)
            let finalNumeroActe = numero_acte;
            if (!finalNumeroActe) {
                const genOptions = { year };
                if (type === 'collective') {
                    if (id_direction) genOptions.id_direction = id_direction;
                    if (id_sous_direction) genOptions.id_sous_direction = id_sous_direction;
                } else {
                    if (req.body.id_direction) genOptions.id_direction = req.body.id_direction;
                }
                finalNumeroActe = await this.generateDecisionNumber(genOptions);
                console.log(`✅ Numéro de décision généré (année ${year} + périmètre): ${finalNumeroActe}`);
            }

            // Si c'est une décision collective, créer des décisions pour tous les agents
            if (type === 'collective') {
                let agentsQuery = '';
                let agentsParams = [];
                let responsableId = null;

                if (id_direction) {
                    // Récupérer la direction et son responsable
                    const directionResult = await db.query(
                        'SELECT responsable_id FROM directions WHERE id = $1',
                        [id_direction]
                    );
                    if (directionResult.rows.length === 0) {
                        return res.status(404).json({
                            success: false,
                            error: 'Direction non trouvée'
                        });
                    }
                    responsableId = directionResult.rows[0].responsable_id;

                    // Récupérer tous les agents de la direction SAUF le responsable
                    agentsQuery = `
                        SELECT id 
                        FROM agents 
                        WHERE id_direction = $1 
                          AND (retire IS NULL OR retire = false)
                          AND id != COALESCE($2, -1)
                        ORDER BY nom, prenom
                    `;
                    agentsParams = [id_direction, responsableId];
                } else if (id_sous_direction) {
                    // Récupérer la sous-direction (vérifier si elle existe)
                    // Note: La table utilise sous_directeur_id, pas responsable_id
                    const sousDirectionResult = await db.query(
                        'SELECT id, sous_directeur_id FROM sous_directions WHERE id = $1',
                        [id_sous_direction]
                    );
                    if (sousDirectionResult.rows.length === 0) {
                        return res.status(404).json({
                            success: false,
                            error: 'Sous-direction non trouvée'
                        });
                    }
                    // sous_directeur_id peut être NULL
                    responsableId = sousDirectionResult.rows[0].sous_directeur_id || null;

                    // Récupérer tous les agents de la sous-direction SAUF le sous-directeur (si défini)
                    agentsQuery = `
                        SELECT id 
                        FROM agents 
                        WHERE id_sous_direction = $1 
                          AND (retire IS NULL OR retire = false)
                          ${responsableId ? 'AND id != $2' : ''}
                        ORDER BY nom, prenom
                    `;
                    agentsParams = responsableId ? [id_sous_direction, responsableId] : [id_sous_direction];
                }

                const agentsResult = await db.query(agentsQuery, agentsParams);
                const agents = agentsResult.rows;

                if (agents.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Aucun agent trouvé pour cette direction/sous-direction (hors directeur/sous-directeur)'
                    });
                }

                console.log(`✅ ${agents.length} agents trouvés pour la décision collective`);

                // Créer UNE SEULE décision collective pour tous les agents
                const decisionQuery = `
                    INSERT INTO decisions (
                        type, 
                        numero_acte, 
                        chemin_document, 
                        id_direction, 
                        id_sous_direction,
                        annee_decision,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;

                const decisionResult = await db.query(decisionQuery, [
                    type,
                    finalNumeroActe,
                    cheminDocument,
                    id_direction || null,
                    id_sous_direction || null,
                    year,
                    createdByAgentId
                ]);

                const decision = decisionResult.rows[0];

                console.log(`✅ Décision collective créée avec succès (ID: ${decision.id}) pour ${agents.length} agent(s)`);

                return res.status(201).json({
                    success: true,
                    message: `Décision collective créée avec succès pour ${agents.length} agent(s)`,
                    data: {
                        decision: decision,
                        agents_count: agents.length,
                        agents_ids: agents.map(a => a.id),
                        numero_acte: finalNumeroActe
                    }
                });
            } else {
                // Décision individuelle
                // Si un agent est spécifié, vérifier qu'il existe
                if (id_agent) {
                    const agentResult = await db.query(
                        'SELECT id, nom, prenom, matricule FROM agents WHERE id = $1',
                        [id_agent]
                    );
                    if (agentResult.rows.length === 0) {
                        return res.status(404).json({
                            success: false,
                            error: 'Agent non trouvé'
                        });
                    }
                    const agent = agentResult.rows[0];
                    console.log(`✅ Décision individuelle pour l'agent: ${agent.nom} ${agent.prenom} (${agent.matricule})`);
                }

                const query = `
                    INSERT INTO decisions (
                        type, 
                        numero_acte, 
                        chemin_document, 
                        id_agent,
                        id_direction,
                        annee_decision,
                        created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *
                `;

                const result = await db.query(query, [
                    type,
                    finalNumeroActe || null,
                    cheminDocument,
                    id_agent || null,
                    id_direction || null,
                    year,
                    createdByAgentId
                ]);

                const decision = result.rows[0];

                console.log(`✅ Décision ${type} créée avec succès (ID: ${decision.id})`);

                return res.status(201).json({
                    success: true,
                    message: `Décision individuelle enregistrée avec succès${id_agent ? ' pour le directeur sélectionné' : ''}`,
                    data: decision
                });
            }

        } catch (error) {
            console.error('❌ Erreur lors de la création de la décision:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la création de la décision',
                details: error.message
            });
        }
    }

    /**
     * Récupérer toutes les décisions
     */
    async getAll(req, res) {
        try {
            const { type } = req.query;

            let query = `
                SELECT d.*, 
                       a.prenom as created_by_prenom, 
                       a.nom as created_by_nom
                FROM decisions d
                LEFT JOIN agents a ON d.created_by = a.id
            `;
            const params = [];

            if (type && ['collective', 'individuelle'].includes(type)) {
                query += ` WHERE d.type = $1`;
                params.push(type);
            }

            query += ` ORDER BY d.date_decision DESC, d.created_at DESC`;

            const result = await db.query(query, params);

            return res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des décisions:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération des décisions',
                details: error.message
            });
        }
    }

    /**
     * Récupérer une décision par ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            const query = `
                SELECT d.*, 
                       a.prenom as created_by_prenom, 
                       a.nom as created_by_nom
                FROM decisions d
                LEFT JOIN agents a ON d.created_by = a.id
                WHERE d.id = $1
            `;

            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Décision non trouvée'
                });
            }

            return res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la décision:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération de la décision',
                details: error.message
            });
        }
    }

    /**
     * Récupérer la décision applicable pour un type donné (la plus récente).
     * Une seule numérotation par année et par direction/sous-direction, donc pas de notion d'activation.
     * Pour les décisions individuelles : filtre optionnel par id_agent.
     */
    async getActiveDecision(req, res) {
        try {
            const { type, id_agent } = req.query;

            if (!type || !['collective', 'individuelle'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Le type de décision doit être "collective" ou "individuelle"'
                });
            }

            let query = `
                SELECT d.*
                FROM decisions d
                WHERE d.type = $1
            `;
            const params = [type];

            // Pour les décisions individuelles, on peut filtrer par agent si nécessaire
            if (id_agent && type === 'individuelle') {
                query += ` AND d.id_agent = $2`;
                params.push(id_agent);
            }

            query += ` ORDER BY d.date_decision DESC, d.created_at DESC LIMIT 1`;

            const result = await db.query(query, params);

            if (result.rows.length === 0) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'Aucune décision trouvée'
                });
            }

            return res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la décision active:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la récupération de la décision active',
                details: error.message
            });
        }
    }

    /**
     * Activer/Désactiver une décision
     * Quand on active une décision, on désactive automatiquement les autres du même type
     */
    async toggleActive(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;

            // Récupérer la décision
            const getQuery = `SELECT id, type FROM decisions WHERE id = $1`;
            const getResult = await db.query(getQuery, [id]);

            if (getResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Décision non trouvée'
                });
            }

            const decision = getResult.rows[0];

            // Si on active cette décision, désactiver toutes les autres du même type
            if (is_active === true) {
                const deactivateQuery = `
                    UPDATE decisions 
                    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                    WHERE type = $1 AND id != $2
                `;
                await db.query(deactivateQuery, [decision.type, id]);
            }

            // Mettre à jour la décision
            const updateQuery = `
                UPDATE decisions 
                SET is_active = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            const updateResult = await db.query(updateQuery, [is_active, id]);

            return res.json({
                success: true,
                message: `Décision ${is_active ? 'activée' : 'désactivée'} avec succès`,
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Erreur lors de l\'activation/désactivation de la décision:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'activation/désactivation de la décision',
                details: error.message
            });
        }
    }

    /**
     * Uploader un fichier pour une décision existante
     */
    async uploadDocument(req, res) {
        try {
            const { id } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Aucun fichier fourni'
                });
            }

            // Récupérer la décision existante
            const getQuery = `SELECT id, chemin_document FROM decisions WHERE id = $1`;
            const getResult = await db.query(getQuery, [id]);

            if (getResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Décision non trouvée'
                });
            }

            const decision = getResult.rows[0];

            // Supprimer l'ancien fichier s'il existe
            if (decision.chemin_document) {
                const oldFilePath = path.join(__dirname, '..', decision.chemin_document);
                try {
                    if (fsSync.existsSync(oldFilePath)) {
                        await fs.unlink(oldFilePath);
                        console.log(`✅ Ancien fichier supprimé: ${oldFilePath}`);
                    }
                } catch (fileError) {
                    console.error('⚠️ Erreur lors de la suppression de l\'ancien fichier:', fileError);
                }
            }

            // Mettre à jour le chemin du document
            const newCheminDocument = `uploads/decisions/${req.file.filename}`;
            console.log(`✅ Upload fichier pour décision ${id}: ${req.file.filename}`);
            console.log(`✅ Chemin complet multer: ${req.file.path}`);
            console.log(`✅ Chemin stocké en DB: ${newCheminDocument}`);
            
            // Vérifier que le fichier existe réellement
            if (fsSync.existsSync(req.file.path)) {
                console.log(`✅ Fichier confirmé présent sur le disque`);
            } else {
                console.error(`❌ ERREUR: Fichier uploadé mais non trouvé sur le disque: ${req.file.path}`);
            }
            
            const updateQuery = `
                UPDATE decisions 
                SET chemin_document = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            const updateResult = await db.query(updateQuery, [newCheminDocument, id]);

            return res.json({
                success: true,
                message: 'Document uploadé avec succès',
                data: updateResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Erreur lors de l\'upload du document:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de l\'upload du document',
                details: error.message
            });
        }
    }

    /**
     * Télécharger le document d'une décision
     */
    async downloadDocument(req, res) {
        try {
            const { id } = req.params;

            // Récupérer la décision
            const query = `SELECT chemin_document FROM decisions WHERE id = $1`;
            const result = await db.query(query, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Décision non trouvée'
                });
            }

            const decision = result.rows[0];

            if (!decision.chemin_document) {
                return res.status(404).json({
                    success: false,
                    error: 'Aucun document associé à cette décision'
                });
            }

            // Construire le chemin complet du fichier
            // Le chemin stocké dans la DB est relatif (ex: "uploads/decisions/fichier.pdf")
            // Utiliser le même chemin de base que multer utilise
            // Multer utilise: path.join(__dirname, '../uploads') où __dirname est 'backend/middleware'
            // Donc uploads est à: backend/uploads
            // Dans le contrôleur, __dirname est 'backend/controllers', donc on remonte d'un niveau
            const baseDir = path.join(__dirname, '..');
            let filePath = path.join(baseDir, decision.chemin_document);
            
            // Normaliser le chemin (supprimer les doubles slashes, etc.)
            filePath = path.normalize(filePath);

            console.log(`🔍 Recherche du fichier: ${filePath}`);
            console.log(`🔍 Chemin stocké dans DB: ${decision.chemin_document}`);
            console.log(`🔍 Base directory: ${baseDir}`);
            console.log(`🔍 __dirname: ${__dirname}`);

            // Vérifier que le répertoire decisions existe
            const decisionsDir = path.join(baseDir, 'uploads', 'decisions');
            console.log(`🔍 Répertoire decisions: ${decisionsDir}`);
            console.log(`🔍 Répertoire decisions existe: ${fsSync.existsSync(decisionsDir)}`);
            
            if (fsSync.existsSync(decisionsDir)) {
                // Lister les fichiers dans le répertoire pour déboguer
                try {
                    const files = fsSync.readdirSync(decisionsDir);
                    console.log(`🔍 Fichiers dans decisions/: ${files.join(', ')}`);
                } catch (listError) {
                    console.error(`⚠️ Erreur lors de la lecture du répertoire: ${listError.message}`);
                }
            }

            // Vérifier que le fichier existe
            if (!fsSync.existsSync(filePath)) {
                console.error(`❌ Fichier non trouvé à: ${filePath}`);
                
                // Essayer de trouver le fichier par son nom seulement dans le répertoire decisions
                const fileName = path.basename(decision.chemin_document);
                const alternativePath = path.join(decisionsDir, fileName);
                console.log(`🔍 Essai avec nom de fichier seulement: ${alternativePath}`);
                
                if (fsSync.existsSync(alternativePath)) {
                    filePath = alternativePath;
                    console.log(`✅ Fichier trouvé avec nom seulement: ${filePath}`);
                } else {
                    return res.status(404).json({
                        success: false,
                        error: 'Fichier non trouvé',
                        details: {
                            chemin_recherche: filePath,
                            chemin_alternatif: alternativePath,
                            chemin_db: decision.chemin_document,
                            base_dir: baseDir,
                            decisions_dir: decisionsDir,
                            __dirname: __dirname
                        }
                    });
                }
            } else {
                console.log(`✅ Fichier trouvé: ${filePath}`);
            }

            // Déterminer le type MIME basé sur l'extension
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png'
            };
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            // Définir les en-têtes
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
            res.setHeader('Cache-Control', 'public, max-age=3600');

            // Servir le fichier
            res.sendFile(filePath);

        } catch (error) {
            console.error('❌ Erreur lors du téléchargement du document:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors du téléchargement du document',
                details: error.message
            });
        }
    }

    /**
     * Supprimer une décision
     */
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Récupérer la décision pour supprimer le fichier si présent
            const getQuery = `SELECT chemin_document FROM decisions WHERE id = $1`;
            const getResult = await db.query(getQuery, [id]);

            if (getResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Décision non trouvée'
                });
            }

            const decision = getResult.rows[0];

            // Supprimer le fichier si présent
            if (decision.chemin_document) {
                const filePath = path.join(__dirname, '..', decision.chemin_document);
                try {
                    if (fsSync.existsSync(filePath)) {
                        await fs.unlink(filePath);
                        console.log(`✅ Fichier supprimé: ${filePath}`);
                    }
                } catch (fileError) {
                    console.error('⚠️ Erreur lors de la suppression du fichier:', fileError);
                    // On continue même si la suppression du fichier échoue
                }
            }

            // Supprimer la décision de la base de données
            const deleteQuery = `DELETE FROM decisions WHERE id = $1 RETURNING *`;
            const deleteResult = await db.query(deleteQuery, [id]);

            return res.json({
                success: true,
                message: 'Décision supprimée avec succès',
                data: deleteResult.rows[0]
            });

        } catch (error) {
            console.error('❌ Erreur lors de la suppression de la décision:', error);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression de la décision',
                details: error.message
            });
        }
    }
}

module.exports = DecisionsController;

