const db = require('../config/database');
const { validationResult } = require('express-validator');

class DemandesController {
    // Créer une nouvelle demande
    static async createDemande(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: errors.array()
                });
            }

            const {
                id_agent,
                type_demande,
                description,
                date_debut,
                date_fin,
                lieu,
                priorite = 'normale',
                documents_joints
            } = req.body;

            // Vérifier que l'agent existe et récupérer ses informations
            const agentQuery = `
                SELECT a.*, d.libelle as direction_libelle, d.code as direction_code,
                       m.nom as ministere_nom
                FROM agents a
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id = $1
            `;
            const agentResult = await db.query(agentQuery, [id_agent]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            const agent = agentResult.rows[0];

            // Récupérer le rôle de l'agent
            const roleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_agent]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom) || 'agent';
            const roleLower = roleNom.toLowerCase();

            // Déterminer si l'agent est dans le cabinet
            const isAgentCabinet = agent.direction_code === '47 05 00 00 00 00' || 
                                   (agent.direction_libelle && agent.direction_libelle.toUpperCase().includes('CABINET'));

            // Déterminer le workflow initial selon le type d'agent
            let niveauInitial = 'soumis'; // Par défaut pour agents simples
            let id_sous_directeur = null;
            let id_directeur = null;
            let id_drh = null;
            let id_dir_cabinet = null;
            let id_chef_cabinet = null;
            let id_ministre = null;

            // 1. DICAB et Chef de cabinet → Ministre directement
            if (roleLower === 'dir_cabinet' || roleLower === 'chef_cabinet') {
                niveauInitial = 'ministre';
                // Récupérer l'ID du ministre
                const ministreQuery = `
                    SELECT a.id
                    FROM agents a
                    LEFT JOIN utilisateurs u ON a.id = u.id_agent
                    LEFT JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'ministre' AND a.id_ministere = $1
                    LIMIT 1
                `;
                const ministreResult = await db.query(ministreQuery, [agent.id_ministere]);
                if (ministreResult.rows.length > 0) {
                    id_ministre = ministreResult.rows[0].id;
                }
            }
            // 2. Directeurs → DICAB (directeur de cabinet)
            else if (roleLower === 'directeur') {
                niveauInitial = 'dir_cabinet';
                // Récupérer l'ID du directeur de cabinet
                const dicabQuery = `
                    SELECT a.id
                    FROM agents a
                    LEFT JOIN utilisateurs u ON a.id = u.id_agent
                    LEFT JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'dir_cabinet' AND a.id_ministere = $1
                    LIMIT 1
                `;
                const dicabResult = await db.query(dicabQuery, [agent.id_ministere]);
                if (dicabResult.rows.length > 0) {
                    id_dir_cabinet = dicabResult.rows[0].id;
                }
            }
            // 3. Agents du cabinet → Chef de cabinet directement
            else if (isAgentCabinet) {
                niveauInitial = 'chef_cabinet';
                // Récupérer l'ID du chef de cabinet
                const chefCabinetQuery = `
                    SELECT a.id
                    FROM agents a
                    LEFT JOIN utilisateurs u ON a.id = u.id_agent
                    LEFT JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'chef_cabinet' AND a.id_ministere = $1
                    LIMIT 1
                `;
                const chefCabinetResult = await db.query(chefCabinetQuery, [agent.id_ministere]);
                if (chefCabinetResult.rows.length > 0) {
                    id_chef_cabinet = chefCabinetResult.rows[0].id;
                }
            }
            // 4. Sous-directeurs → Directeur → DICAB
            else if (roleLower === 'sous_directeur') {
                niveauInitial = 'directeur';
                // Récupérer l'ID du directeur (via la sous-direction)
                const directeurQuery = `
                    SELECT sd.directeur_id
                    FROM sous_directions sd
                    WHERE sd.sous_directeur_id = $1
                    LIMIT 1
                `;
                const directeurResult = await db.query(directeurQuery, [id_agent]);
                if (directeurResult.rows.length > 0 && directeurResult.rows[0].directeur_id) {
                    id_directeur = directeurResult.rows[0].directeur_id;
                }
                
                // Récupérer l'ID du DICAB (directeur de cabinet)
                const dicabQuery = `
                    SELECT a.id
                    FROM agents a
                    LEFT JOIN utilisateurs u ON a.id = u.id_agent
                    LEFT JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'dir_cabinet' AND a.id_ministere = $1
                    LIMIT 1
                `;
                const dicabResult = await db.query(dicabQuery, [agent.id_ministere]);
                if (dicabResult.rows.length > 0) {
                    id_dir_cabinet = dicabResult.rows[0].id;
                }
            }
            // 5. Agents simples → Sous-directeur → Directeur → DRH
            else {
                niveauInitial = 'sous_directeur';
                // Récupérer l'ID du sous-directeur (via la sous-direction de l'agent)
                const sousDirecteurQuery = `
                    SELECT sd.sous_directeur_id
                    FROM sous_directions sd
                    WHERE sd.id = (SELECT id_sous_direction FROM agents WHERE id = $1)
                    LIMIT 1
                `;
                const sousDirecteurResult = await db.query(sousDirecteurQuery, [id_agent]);
                if (sousDirecteurResult.rows.length > 0 && sousDirecteurResult.rows[0].sous_directeur_id) {
                    id_sous_directeur = sousDirecteurResult.rows[0].sous_directeur_id;
                }
                
                // Récupérer l'ID du directeur (via la direction de l'agent)
                const directeurQuery = `
                    SELECT d.directeur_id
                    FROM directions d
                    WHERE d.id = (SELECT id_direction FROM agents WHERE id = $1)
                    LIMIT 1
                `;
                const directeurResult = await db.query(directeurQuery, [id_agent]);
                if (directeurResult.rows.length > 0 && directeurResult.rows[0].directeur_id) {
                    id_directeur = directeurResult.rows[0].directeur_id;
                }
                
                // Récupérer l'ID du DRH
                const drhQuery = `
                    SELECT a.id
                    FROM agents a
                    LEFT JOIN utilisateurs u ON a.id = u.id_agent
                    LEFT JOIN roles r ON u.id_role = r.id
                    WHERE LOWER(r.nom) = 'drh' AND a.id_ministere = $1
                    LIMIT 1
                `;
                const drhResult = await db.query(drhQuery, [agent.id_ministere]);
                if (drhResult.rows.length > 0) {
                    id_drh = drhResult.rows[0].id;
                }
            }

            // Insérer la demande avec les IDs des validateurs
            const insertQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, date_debut, date_fin, 
                    lieu, priorite, documents_joints, created_by, niveau_actuel,
                    id_sous_directeur, id_directeur, id_drh, id_dir_cabinet, id_chef_cabinet, id_ministre
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING id
            `;

            const result = await db.query(insertQuery, [
                id_agent, type_demande, description, date_debut, date_fin,
                lieu, priorite, JSON.stringify(documents_joints || []), req.user.id, niveauInitial,
                id_sous_directeur, id_directeur, id_drh, id_dir_cabinet, id_chef_cabinet, id_ministre
            ]);

            // Récupérer la demande créée avec les informations de l'agent
            const demandeQuery = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       a.ministere_nom, a.service, a.direction
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE d.id = $1
            `;

            const demandeResult = await db.query(demandeQuery, [result.rows[0].id]);

            res.status(201).json({
                success: true,
                message: 'Demande créée avec succès',
                data: demandeResult.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la création de la demande:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer les demandes d'un agent
    static async getDemandesByAgent(req, res) {
        try {
            const { id_agent } = req.params;
            const { status, type_demande, page = 1, limit = 10 } = req.query;

            let query = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       a.ministere_nom, a.service, a.direction,
                       cs.prenom as chef_service_prenom, cs.nom as chef_service_nom,
                       drh.prenom as drh_prenom, drh.nom as drh_nom,
                       dir.prenom as directeur_prenom, dir.nom as directeur_nom,
                       min.prenom as ministre_prenom, min.nom as ministre_nom,
                       sd.prenom as sous_directeur_prenom, sd.nom as sous_directeur_nom,
                       dicab.prenom as dir_cabinet_prenom, dicab.nom as dir_cabinet_nom,
                       chef_cab.prenom as chef_cabinet_prenom, chef_cab.nom as chef_cabinet_nom
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN agents cs ON d.id_chef_service = cs.id
                LEFT JOIN agents drh ON d.id_drh = drh.id
                LEFT JOIN agents dir ON d.id_directeur = dir.id
                LEFT JOIN agents min ON d.id_ministre = min.id
                LEFT JOIN agents sd ON d.id_sous_directeur = sd.id
                LEFT JOIN agents dicab ON d.id_dir_cabinet = dicab.id
                LEFT JOIN agents chef_cab ON d.id_chef_cabinet = chef_cab.id
                WHERE d.id_agent = $1
            `;

            const params = [id_agent];
            let paramCount = 1;

            if (status) {
                paramCount++;
                query += ` AND d.status = $${paramCount}`;
                params.push(status);
            }

            if (type_demande) {
                paramCount++;
                query += ` AND d.type_demande = $${paramCount}`;
                params.push(type_demande);
            }

            query += ' ORDER BY d.date_creation DESC';

            // Pagination
            const offset = (page - 1) * limit;
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(parseInt(limit));
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);

            const result = await db.query(query, params);

            // Compter le total pour la pagination
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM demandes d 
                WHERE d.id_agent = $1
            `;
            const countParams = [id_agent];
            let countParamCount = 1;

            if (status) {
                countParamCount++;
                countQuery += ` AND d.status = $${countParamCount}`;
                countParams.push(status);
            }

            if (type_demande) {
                countParamCount++;
                countQuery += ` AND d.type_demande = $${countParamCount}`;
                countParams.push(type_demande);
            }

            const countResult = await db.query(countQuery, countParams);
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
            console.error('Erreur lors de la récupération des demandes:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer les demandes en attente de validation pour un supérieur
    static async getDemandesEnAttente(req, res) {
        try {
            const { id_validateur } = req.params;
            const { niveau_actuel, priorite, page = 1, limit = 10 } = req.query;

            // Récupérer le rôle du validateur
            const roleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [id_validateur]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom) || '';
            const roleLower = roleNom.toLowerCase();

            let query = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.email,
                       a.ministere_nom, a.service, a.direction, a.fonction_libele
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                WHERE d.status = 'en_attente' 
                AND d.niveau_actuel != 'finalise'
            `;

            const params = [];
            let paramCount = 0;

            // Filtrer selon le niveau et le validateur selon son rôle
            if (niveau_actuel) {
                paramCount++;
                query += ` AND d.niveau_actuel = $${paramCount}`;
                params.push(niveau_actuel);
            }

            // Vérifier que le validateur est bien assigné à ce niveau selon son rôle
            paramCount++;
            if (roleLower === 'sous_directeur') {
                query += ` AND d.niveau_actuel = 'sous_directeur' AND d.id_sous_directeur = $${paramCount}`;
            } else if (roleLower === 'directeur') {
                query += ` AND d.niveau_actuel = 'directeur' AND d.id_directeur = $${paramCount}`;
            } else if (roleLower === 'drh') {
                query += ` AND d.niveau_actuel = 'drh' AND d.id_drh = $${paramCount}`;
            } else if (roleLower === 'dir_cabinet') {
                query += ` AND d.niveau_actuel = 'dir_cabinet' AND d.id_dir_cabinet = $${paramCount}`;
            } else if (roleLower === 'chef_cabinet') {
                query += ` AND d.niveau_actuel = 'chef_cabinet' AND d.id_chef_cabinet = $${paramCount}`;
            } else if (roleLower === 'ministre') {
                query += ` AND d.niveau_actuel = 'ministre' AND d.id_ministre = $${paramCount}`;
            } else {
                // Par défaut, chercher dans tous les niveaux possibles
                query += ` AND (
                    (d.niveau_actuel = 'sous_directeur' AND d.id_sous_directeur = $${paramCount}) OR
                    (d.niveau_actuel = 'directeur' AND d.id_directeur = $${paramCount}) OR
                    (d.niveau_actuel = 'drh' AND d.id_drh = $${paramCount}) OR
                    (d.niveau_actuel = 'dir_cabinet' AND d.id_dir_cabinet = $${paramCount}) OR
                    (d.niveau_actuel = 'chef_cabinet' AND d.id_chef_cabinet = $${paramCount}) OR
                    (d.niveau_actuel = 'ministre' AND d.id_ministre = $${paramCount})
                )`;
            }
            params.push(id_validateur);

            if (priorite) {
                paramCount++;
                query += ` AND d.priorite = $${paramCount}`;
                params.push(priorite);
            }

            query += ' ORDER BY d.priorite DESC, d.date_creation ASC';

            // Pagination
            const offset = (page - 1) * limit;
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(parseInt(limit));
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            params.push(offset);

            const result = await db.query(query, params);

            // Compter le total
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM demandes d 
                WHERE d.status = 'en_attente' 
                AND d.niveau_actuel != 'finalise'
            `;
            const countParams = [];
            let countParamCount = 0;

            if (niveau_actuel) {
                countParamCount++;
                countQuery += ` AND d.niveau_actuel = $${countParamCount}`;
                countParams.push(niveau_actuel);
            }

            countParamCount++;
            if (roleLower === 'sous_directeur') {
                countQuery += ` AND d.niveau_actuel = 'sous_directeur' AND d.id_sous_directeur = $${countParamCount}`;
            } else if (roleLower === 'directeur') {
                countQuery += ` AND d.niveau_actuel = 'directeur' AND d.id_directeur = $${countParamCount}`;
            } else if (roleLower === 'drh') {
                countQuery += ` AND d.niveau_actuel = 'drh' AND d.id_drh = $${countParamCount}`;
            } else if (roleLower === 'dir_cabinet') {
                countQuery += ` AND d.niveau_actuel = 'dir_cabinet' AND d.id_dir_cabinet = $${countParamCount}`;
            } else if (roleLower === 'chef_cabinet') {
                countQuery += ` AND d.niveau_actuel = 'chef_cabinet' AND d.id_chef_cabinet = $${countParamCount}`;
            } else if (roleLower === 'ministre') {
                countQuery += ` AND d.niveau_actuel = 'ministre' AND d.id_ministre = $${countParamCount}`;
            } else {
                countQuery += ` AND (
                    (d.niveau_actuel = 'sous_directeur' AND d.id_sous_directeur = $${countParamCount}) OR
                    (d.niveau_actuel = 'directeur' AND d.id_directeur = $${countParamCount}) OR
                    (d.niveau_actuel = 'drh' AND d.id_drh = $${countParamCount}) OR
                    (d.niveau_actuel = 'dir_cabinet' AND d.id_dir_cabinet = $${countParamCount}) OR
                    (d.niveau_actuel = 'chef_cabinet' AND d.id_chef_cabinet = $${countParamCount}) OR
                    (d.niveau_actuel = 'ministre' AND d.id_ministre = $${countParamCount})
                )`;
            }
            countParams.push(id_validateur);

            if (priorite) {
                countParamCount++;
                countQuery += ` AND d.priorite = $${countParamCount}`;
                countParams.push(priorite);
            }

            const countResult = await db.query(countQuery, countParams);
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
            console.error('Erreur lors de la récupération des demandes en attente:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Valider ou rejeter une demande
    static async validerDemande(req, res) {
        try {
            const { id_demande } = req.params;
            const { action, commentaire } = req.body; // action: 'approuve' ou 'rejete'
            const id_validateur = req.user.id_agent;

            // Vérifier que la demande existe et est en attente
            const demandeQuery = 'SELECT * FROM demandes WHERE id = $1';
            const demandeResult = await db.query(demandeQuery, [id_demande]);

            if (demandeResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Demande non trouvée'
                });
            }

            const demande = demandeResult.rows[0];

            if (demande.status !== 'en_attente') {
                return res.status(400).json({
                    success: false,
                    error: 'Cette demande a déjà été traitée'
                });
            }

            // Vérifier que le validateur est autorisé à traiter cette demande
            const validateurAutorise = (
                (demande.niveau_actuel === 'sous_directeur' && demande.id_sous_directeur === id_validateur) ||
                (demande.niveau_actuel === 'directeur' && demande.id_directeur === id_validateur) ||
                (demande.niveau_actuel === 'drh' && demande.id_drh === id_validateur) ||
                (demande.niveau_actuel === 'dir_cabinet' && demande.id_dir_cabinet === id_validateur) ||
                (demande.niveau_actuel === 'chef_cabinet' && demande.id_chef_cabinet === id_validateur) ||
                (demande.niveau_actuel === 'ministre' && demande.id_ministre === id_validateur)
            );

            if (!validateurAutorise) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous n\'êtes pas autorisé à traiter cette demande'
                });
            }

            // Déterminer le prochain niveau ou finaliser selon les nouvelles règles
            let nouveauNiveau = demande.niveau_actuel;
            let nouveauStatus = demande.status;
            let statutNiveau = 'en_attente';
            let statutField = '';
            let dateField = '';
            let commentaireField = '';

            if (action === 'approuve') {
                statutNiveau = 'approuve';

                // Déterminer le prochain niveau selon les nouvelles règles
                switch (demande.niveau_actuel) {
                    case 'sous_directeur':
                        // Sous-directeur approuve → va chez le directeur
                        nouveauNiveau = demande.id_directeur ? 'directeur' : 'finalise';
                        statutField = 'statut_sous_directeur';
                        dateField = 'date_validation_sous_directeur';
                        commentaireField = 'commentaire_sous_directeur';
                        break;
                    case 'directeur':
                        // Directeur approuve → va chez le DRH (pour agents simples) ou DICAB (pour sous-directeurs)
                        // On vérifie si c'est une demande d'un sous-directeur ou d'un agent simple
                        const agentDemandeurQuery = `
                            SELECT a.id, u.id as user_id, r.nom as role_nom
                            FROM agents a
                            LEFT JOIN utilisateurs u ON a.id = u.id_agent
                            LEFT JOIN roles r ON u.id_role = r.id
                            WHERE a.id = $1
                        `;
                        const agentDemandeurResult = await db.query(agentDemandeurQuery, [demande.id_agent]);
                        const roleDemandeur = agentDemandeurResult.rows[0] ? (agentDemandeurResult.rows[0].role_nom || '').toLowerCase() : '';
                        const isSousDirecteurDemandeur = roleDemandeur === 'sous_directeur';
                        
                        if (isSousDirecteurDemandeur && demande.id_dir_cabinet) {
                            // Demande d'un sous-directeur → va chez DICAB
                            nouveauNiveau = 'dir_cabinet';
                        } else if (demande.id_drh) {
                            // Demande d'un agent simple → va chez DRH
                            nouveauNiveau = 'drh';
                        } else {
                            nouveauNiveau = 'finalise';
                        }
                        statutField = 'statut_directeur';
                        dateField = 'date_validation_directeur';
                        commentaireField = 'commentaire_directeur';
                        break;
                    case 'drh':
                        // DRH approuve → finalise (document automatique pour agent simple)
                        nouveauNiveau = 'finalise';
                        nouveauStatus = 'approuve';
                        statutField = 'statut_drh';
                        dateField = 'date_validation_drh';
                        commentaireField = 'commentaire_drh';
                        break;
                    case 'dir_cabinet':
                        // DICAB approuve → finalise (document automatique pour directeur ou sous-directeur)
                        nouveauNiveau = 'finalise';
                        nouveauStatus = 'approuve';
                        statutField = 'statut_dir_cabinet';
                        dateField = 'date_validation_dir_cabinet';
                        commentaireField = 'commentaire_dir_cabinet';
                        break;
                    case 'chef_cabinet':
                        // Chef de cabinet approuve → finalise (document automatique pour agent du cabinet)
                        nouveauNiveau = 'finalise';
                        nouveauStatus = 'approuve';
                        statutField = 'statut_chef_cabinet';
                        dateField = 'date_validation_chef_cabinet';
                        commentaireField = 'commentaire_chef_cabinet';
                        break;
                    case 'ministre':
                        // Ministre approuve → finalise (document automatique pour DICAB et Chef de cabinet)
                        nouveauNiveau = 'finalise';
                        nouveauStatus = 'approuve';
                        statutField = 'statut_ministre';
                        dateField = 'date_validation_ministre';
                        commentaireField = 'commentaire_ministre';
                        break;
                }
            } else if (action === 'rejete') {
                statutNiveau = 'rejete';
                nouveauStatus = 'rejete';
                nouveauNiveau = 'finalise';
                
                // Déterminer le champ selon le niveau actuel
                switch (demande.niveau_actuel) {
                    case 'sous_directeur':
                        statutField = 'statut_sous_directeur';
                        dateField = 'date_validation_sous_directeur';
                        commentaireField = 'commentaire_sous_directeur';
                        break;
                    case 'directeur':
                        statutField = 'statut_directeur';
                        dateField = 'date_validation_directeur';
                        commentaireField = 'commentaire_directeur';
                        break;
                    case 'drh':
                        statutField = 'statut_drh';
                        dateField = 'date_validation_drh';
                        commentaireField = 'commentaire_drh';
                        break;
                    case 'dir_cabinet':
                        statutField = 'statut_dir_cabinet';
                        dateField = 'date_validation_dir_cabinet';
                        commentaireField = 'commentaire_dir_cabinet';
                        break;
                    case 'chef_cabinet':
                        statutField = 'statut_chef_cabinet';
                        dateField = 'date_validation_chef_cabinet';
                        commentaireField = 'commentaire_chef_cabinet';
                        break;
                    case 'ministre':
                        statutField = 'statut_ministre';
                        dateField = 'date_validation_ministre';
                        commentaireField = 'commentaire_ministre';
                        break;
                }
            }

            // Mettre à jour la demande
            const updateQuery = `
                UPDATE demandes SET
                    niveau_actuel = $1,
                    status = $2,
                    ${statutField} = $3,
                    ${dateField} = CURRENT_TIMESTAMP,
                    ${commentaireField} = $4,
                    updated_by = $5
                WHERE id = $6
            `;

            await db.query(updateQuery, [
                nouveauNiveau, 
                nouveauStatus, 
                statutNiveau, 
                commentaire || null, 
                req.user.id, 
                id_demande
            ]);

            // Enregistrer dans l'historique du workflow
            const workflowQuery = `
                INSERT INTO workflow_demandes (id_demande, niveau_validation, id_validateur, action, commentaire)
                VALUES ($1, $2, $3, $4, $5)
            `;

            await db.query(workflowQuery, [
                id_demande, demande.niveau_actuel, id_validateur, action, commentaire || null
            ]);

            res.json({
                success: true,
                message: `Demande ${action === 'approuve' ? 'approuvée' : 'rejetée'} avec succès`
            });

        } catch (error) {
            console.error('Erreur lors de la validation de la demande:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer l'historique d'une demande
    static async getHistoriqueDemande(req, res) {
        try {
            const { id_demande } = req.params;

            const query = `
                SELECT w.*, a.prenom, a.nom, a.matricule
                FROM workflow_demandes w
                LEFT JOIN agents a ON w.id_validateur = a.id
                WHERE w.id_demande = $1
                ORDER BY w.date_action ASC
            `;

            const result = await db.query(query, [id_demande]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    // Récupérer les statistiques des demandes
    static async getStatistiquesDemandes(req, res) {
        try {
            const { id_agent } = req.params;
            const { periode = '30' } = req.query; // jours

            const periodeInt = parseInt(periode) || 30;
            const query = `
                SELECT 
                    COUNT(*) as total_demandes,
                    SUM(CASE WHEN status = 'en_attente' THEN 1 ELSE 0 END) as en_attente,
                    SUM(CASE WHEN status = 'approuve' THEN 1 ELSE 0 END) as approuvees,
                    SUM(CASE WHEN status = 'rejete' THEN 1 ELSE 0 END) as rejetees,
                    SUM(CASE WHEN type_demande = 'absence' THEN 1 ELSE 0 END) as absences,
                    SUM(CASE WHEN type_demande = 'sortie_territoire' THEN 1 ELSE 0 END) as sorties,
                    SUM(CASE WHEN type_demande = 'attestation_travail' THEN 1 ELSE 0 END) as attestations_travail,
                    SUM(CASE WHEN type_demande = 'attestation_presence' THEN 1 ELSE 0 END) as attestations_presence,
                    SUM(CASE WHEN type_demande = 'note_service' THEN 1 ELSE 0 END) as notes_service,
                    SUM(CASE WHEN type_demande = 'certificat_cessation' THEN 1 ELSE 0 END) as certificats
                FROM demandes 
                WHERE id_agent = $1 
                AND date_creation >= CURRENT_DATE - INTERVAL '${periodeInt} days'
            `;

            const result = await db.query(query, [id_agent]);

            res.json({
                success: true,
                data: result.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }
}

module.exports = DemandesController;