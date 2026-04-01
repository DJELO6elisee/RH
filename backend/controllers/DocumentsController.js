const db = require('../config/database');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class DocumentsController {

    /**
     * Transmet un document d'autorisation à l'agent destinataire
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async transmitDocument(req, res) {
        try {
            // L'ID reçu peut être un ID de document OU un ID de demande selon le frontend
            // Nous allons gérer les deux cas de façon robuste
            let { id } = req.params;
            const { commentaire } = req.body;

            console.log(`📤 Transmission du document ${id} par le chef de service...`);
            console.log(`📤 User ID: ${req.user?.id}, Agent ID: ${req.user?.id_agent}`);
            console.log(`📤 Commentaire: ${commentaire}`);

            // Requêtes utilitaires
            const documentByIdQuery = `
                SELECT da.*, d.id as demande_id, d.niveau_evolution_demande, d.phase,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.email as agent_email
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                WHERE da.id = $1
            `;
            const documentByDemandeQuery = `
                SELECT da.*, d.id as demande_id, d.niveau_evolution_demande, d.phase,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.email as agent_email
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                WHERE da.id_demande = $1
                ORDER BY da.date_generation DESC NULLS LAST, da.id DESC
                LIMIT 1
            `;

            // 1) Tenter d'abord comme ID de document
            let documentResult = await db.query(documentByIdQuery, [id]);
            let document;

            // 2) Si non trouvé, traiter l'ID comme un ID de demande
            if (documentResult.rows.length === 0) {
                console.log(`📄 Aucun document avec id=${id}. On tente en tant qu'ID de demande...`);
                const byDemande = await db.query(documentByDemandeQuery, [id]);
                if (byDemande.rows.length > 0) {
                    document = byDemande.rows[0];
                    id = document.id; // normaliser pour la suite
                }
            } else {
                document = documentResult.rows[0];
            }

            // 3) Si toujours pas de document, essayer de le générer automatiquement à partir de la demande
            if (!document) {
                console.log(`📄 Document introuvable pour la demande ${id}, tentative de génération automatique...`);

                // Récupérer les informations de la demande pour générer le document
                const demandeQuery = `
                    SELECT d.*, a.prenom, a.nom, a.matricule, a.email, a.sexe,
                           s.libelle as service_nom, m.nom as ministere_nom, m.sigle as ministere_sigle
                    FROM demandes d
                    LEFT JOIN agents a ON d.id_agent = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    WHERE d.id = $1
                `;

                const demandeResult = await db.query(demandeQuery, [id]);

                if (demandeResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Demande non trouvée pour transmission de document'
                    });
                }

                const demande = demandeResult.rows[0];

                // Générer le document automatiquement
                try {
                    const DocumentGenerationService = require('../services/DocumentGenerationService');

                    // Préparer les données de l'agent correctement
                    const agentData = {
                        id: demande.id_agent,
                        prenom: demande.prenom,
                        nom: demande.nom,
                        matricule: demande.matricule,
                        email: demande.email,
                        sexe: demande.sexe,
                        service_nom: demande.service_nom,
                        ministere_nom: demande.ministere_nom,
                        ministere_sigle: demande.ministere_sigle
                    };

                    const documentGenere = await DocumentGenerationService.generateAutorisationAbsence(
                        demande,
                        agentData, // agent correct
                        { prenom: 'DRH', nom: 'Ministère', email: 'drh@ministere.ci' } // validateur fictif
                    );

                    console.log(`✅ Document généré automatiquement avec l'ID: ${documentGenere.document_id}`);

                    // Récupérer le document généré
                    const newDocumentResult = await db.query(documentByIdQuery, [documentGenere.document_id]);
                    if (newDocumentResult.rows.length === 0) {
                        return res.status(500).json({
                            success: false,
                            error: 'Erreur lors de la génération du document'
                        });
                    }

                    // Utiliser le document généré
                    document = newDocumentResult.rows[0];
                    id = document.id; // normaliser pour la suite
                } catch (genError) {
                    console.error('Erreur lors de la génération automatique:', genError);
                    return res.status(500).json({
                        success: false,
                        error: 'Impossible de générer le document automatiquement. Veuillez contacter le DRH.'
                    });
                }
            }

            // Vérifier que le document est en statut 'generé' et non déjà transmis
            if (document.statut !== 'generé') {
                return res.status(400).json({
                    success: false,
                    error: `Ce document ne peut pas être transmis. Statut actuel: ${document.statut}`
                });
            }

            // Vérifier que la demande est en phase retour et au bon niveau
            if (document.phase !== 'retour' || document.niveau_evolution_demande !== 'retour_drh') {
                return res.status(400).json({
                    success: false,
                    error: 'Ce document n\'est pas prêt à être transmis. Il doit être en phase retour au niveau DRH.'
                });
            }

            // Vérifier que l'utilisateur connecté est le chef de service de l'agent
            const userAgentQuery = `
                SELECT a.id_direction as chef_service_id
                FROM utilisateurs u
                LEFT JOIN agents a ON u.id_agent = a.id
                WHERE u.id = $1
            `;

            const userAgentResult = await db.query(userAgentQuery, [req.user.id]);

            if (userAgentResult.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Utilisateur non trouvé'
                });
            }

            const chefServiceId = userAgentResult.rows[0].chef_service_id;

            // Vérifier que l'agent destinataire appartient au même service
            const agentServiceQuery = `
                SELECT id_direction FROM agents WHERE id = $1
            `;

            let agentServiceResult = await db.query(agentServiceQuery, [document.id_agent_destinataire]);

            // Debug: Afficher les IDs pour comprendre le problème
            console.log(`🔍 Debug transmission:`);
            console.log(`- Chef de service ID: ${req.user.id}`);
            console.log(`- Chef service ID: ${chefServiceId}`);
            console.log(`- Agent destinataire ID: ${document.id_agent_destinataire}`);
            console.log(`- Agent service ID: ${agentServiceResult.rows[0]?.id_direction}`);

            if (agentServiceResult.rows.length === 0 || (agentServiceResult.rows[0] && agentServiceResult.rows[0].id_direction == null)) {
                // Auto-correction: si l'agent destinataire est invalide, corriger depuis la demande
                console.warn('⚠️ id_agent_destinataire invalide ou introuvable. Tentative de correction depuis la demande...');
                const demandeAgentRes = await db.query('SELECT id_agent FROM demandes WHERE id = $1', [document.demande_id]);
                const correctedAgentId = demandeAgentRes.rows[0] ? demandeAgentRes.rows[0].id_agent : null;
                if (correctedAgentId) {
                    await db.query('UPDATE documents_autorisation SET id_agent_destinataire = $1 WHERE id = $2', [correctedAgentId, document.id]);
                    document.id_agent_destinataire = correctedAgentId;
                    agentServiceResult = await db.query(agentServiceQuery, [document.id_agent_destinataire]);
                    console.log(`🔁 Agent destinataire corrigé -> ${document.id_agent_destinataire}, service=${agentServiceResult.rows[0]?.id_direction}`);
                }
            }

            if (agentServiceResult.rows.length === 0 || agentServiceResult.rows[0].id_direction !== chefServiceId) {
                console.log(`❌ Vérification service échouée: ${agentServiceResult.rows[0]?.id_direction} !== ${chefServiceId}`);
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez transmettre des documents qu\'aux agents de votre service'
                });
            }

            console.log(`✅ Vérification service réussie: ${agentServiceResult.rows[0].id_direction} === ${chefServiceId}`);

            // Commencer une transaction
            await db.query('BEGIN');

            try {
                // 1. Mettre à jour le statut du document
                const updateDocumentQuery = `
                    UPDATE documents_autorisation 
                    SET statut = 'transmis', 
                        date_transmission = CURRENT_TIMESTAMP,
                        commentaire_transmission = $1,
                        id_agent_transmetteur = $2
                    WHERE id = $3
                `;

                await db.query(updateDocumentQuery, [commentaire, req.user.id_agent, id]);

                // 2. Finaliser la demande automatiquement après transmission
                const updateDemandeQuery = `
                    UPDATE demandes 
                    SET status = 'approuve', 
                        niveau_actuel = 'finalise', 
                        niveau_evolution_demande = 'finalise',
                        phase = 'retour'
                    WHERE id = $1
                `;

                await db.query(updateDemandeQuery, [document.demande_id]);

                // 3. Enregistrer l'action dans le workflow
                const workflowQuery = `
                    INSERT INTO workflow_demandes (
                        id_demande, niveau_validation, id_validateur, action, commentaire, date_action
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                `;

                await db.query(workflowQuery, [
                    document.demande_id,
                    'chef_service',
                    req.user.id_agent,
                    'approuve',
                    commentaire || 'Document d\'autorisation transmis à l\'agent - Demande finalisée'
                ]);

                // 4. Créer une notification pour l'agent
                const notificationQuery = `
                    INSERT INTO notifications_demandes (
                        id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation
                    ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
                `;

                const notificationTitre = 'Demande finalisée - Document d\'autorisation reçu';
                const notificationMessage = `Votre demande d'absence a été finalisée et votre document d'autorisation a été transmis par votre chef de service. Vous pouvez maintenant le consulter et le télécharger.`;

                await db.query(notificationQuery, [
                    document.demande_id,
                    document.id_agent_destinataire,
                    'demande_approuvee',
                    notificationTitre,
                    notificationMessage
                ]);

                // Valider la transaction
                await db.query('COMMIT');

                console.log(`✅ Document ${id} transmis avec succès à l'agent ${document.agent_prenom} ${document.agent_nom}`);

                res.json({
                    success: true,
                    message: 'Document transmis avec succès à l\'agent',
                    document_id: id,
                    agent_nom: `${document.agent_prenom} ${document.agent_nom}`,
                    date_transmission: new Date().toISOString()
                });

            } catch (error) {
                // Annuler la transaction en cas d'erreur
                await db.query('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('❌ Erreur lors de la transmission du document:', error);
            console.error('❌ Stack trace:', error.stack);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur lors de la transmission',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }

    /**
     * Finalise la réception du document par l'agent
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async finalizeDocumentReception(req, res) {
        try {
            const { id } = req.params;

            console.log(`✅ Finalisation de la réception du document ${id} par l'agent...`);

            // Vérifier que le document existe et appartient à l'agent connecté
            const documentQuery = `
                SELECT da.*, d.id as demande_id
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                WHERE da.id = $1 AND da.id_agent_destinataire = $2
            `;

            const documentResult = await db.query(documentQuery, [id, req.user.id_agent]);

            if (documentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document non trouvé ou vous n\'êtes pas autorisé à le consulter'
                });
            }

            const document = documentResult.rows[0];

            // Vérifier que le document est transmis
            if (document.statut !== 'transmis') {
                return res.status(400).json({
                    success: false,
                    error: 'Ce document n\'a pas encore été transmis'
                });
            }

            // Commencer une transaction
            await db.query('BEGIN');

            try {
                // 1. Mettre à jour le statut du document
                const updateDocumentQuery = `
                    UPDATE documents_autorisation 
                    SET statut = 'finalise', 
                        date_reception = CURRENT_TIMESTAMP
                    WHERE id = $1
                `;

                await db.query(updateDocumentQuery, [id]);

                // 2. Finaliser la demande
                const updateDemandeQuery = `
                    UPDATE demandes 
                    SET niveau_evolution_demande = 'finalise',
                        status = 'approuve'
                    WHERE id = $1
                `;

                await db.query(updateDemandeQuery, [document.demande_id]);

                // 3. Enregistrer l'action dans le workflow
                const workflowQuery = `
                    INSERT INTO workflow_demandes (
                        id_demande, niveau_validation, id_validateur, action, commentaire, date_action
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                `;

                await db.query(workflowQuery, [
                    document.demande_id,
                    'agent',
                    req.user.id_agent,
                    'approuve',
                    'Document d\'autorisation reçu et finalisé par l\'agent'
                ]);

                // Valider la transaction
                await db.query('COMMIT');

                console.log(`✅ Document ${id} finalisé avec succès par l'agent`);

                res.json({
                    success: true,
                    message: 'Document finalisé avec succès',
                    document_id: id,
                    date_reception: new Date().toISOString()
                });

            } catch (error) {
                // Annuler la transaction en cas d'erreur
                await db.query('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('❌ Erreur lors de la finalisation du document:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur lors de la finalisation',
                details: error.message
            });
        }
    }

    
    /**
     * Récupère les documents disponibles pour un agent
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getAgentDocuments(req, res) {
        try {
            const agentId = req.user.id_agent;

            const query = `
                SELECT da.*, d.type_demande, d.date_debut, d.date_fin, d.description, d.annee_non_jouissance_conge,
                       d.date_reprise_service, d.date_fin_conges,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                       s.libelle as service_nom, m.nom as ministere_nom,
                       transmetteur.prenom as transmetteur_prenom, 
                       transmetteur.nom as transmetteur_nom
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents transmetteur ON da.id_agent_transmetteur = transmetteur.id
                WHERE da.id_agent_destinataire = $1 
                AND (
                    -- Pour les autorisations d'absence : générées, transmises ou finalisées (inclut 'generé' pour que le DRH voie ses docs dès génération)
                    (da.type_document = 'autorisation_absence' AND da.statut IN ('generé', 'transmis', 'finalise'))
                    OR
                    -- Pour les autres documents : générés, transmis ou finalisés
                    (da.type_document != 'autorisation_absence' AND da.statut IN ('generé', 'transmis', 'finalise'))
                )
                ORDER BY da.date_generation DESC
            `;

            const result = await db.query(query, [agentId]);

            console.log(`📋 Documents récupérés pour l'agent ${agentId}: ${result.rows.length} documents`);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des documents de l\'agent:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère les documents pour un agent spécifique (avec paramètre dans l'URL)
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getAgentDocumentsById(req, res) {
        try {
            const { agentId } = req.params;

            const query = `
                SELECT da.*, d.type_demande, d.date_debut, d.date_fin, d.description, d.annee_non_jouissance_conge,
                       d.date_reprise_service, d.date_fin_conges,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                       s.libelle as service_nom, m.nom as ministere_nom,
                       transmetteur.prenom as transmetteur_prenom, 
                       transmetteur.nom as transmetteur_nom
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents transmetteur ON da.id_agent_transmetteur = transmetteur.id
                WHERE da.id_agent_destinataire = $1 
                AND (
                    -- Pour les autorisations d'absence : générées, transmises ou finalisées (inclut 'generé' pour que le DRH voie ses docs dès génération)
                    (da.type_document = 'autorisation_absence' AND da.statut IN ('generé', 'transmis', 'finalise'))
                    OR
                    -- Pour les autres documents : générés, transmis ou finalisés
                    (da.type_document != 'autorisation_absence' AND da.statut IN ('generé', 'transmis', 'finalise'))
                )
                ORDER BY da.date_generation DESC
            `;

            const result = await db.query(query, [agentId]);

            console.log(`📋 Documents récupérés pour l'agent ${agentId}: ${result.rows.length} documents`);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des documents de l\'agent:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupérer les documents par ID de demande
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getDocumentsByDemandeId(req, res) {
        try {
            const { demandeId } = req.params;
            const db = require('../config/database');

            const query = `
                SELECT 
                    da.id,
                    da.id_demande,
                    da.id_agent_destinataire,
                    da.id_agent_generateur,
                    da.statut,
                    da.date_generation,
                    da.date_transmission,
                    da.date_reception,
                    da.commentaire_transmission,
                    da.id_agent_transmetteur,
                    a.prenom as agent_prenom,
                    a.nom as agent_nom,
                    a.matricule as agent_matricule,
                    d.description as demande_description,
                    d.type_demande,
                    d.date_debut,
                    d.date_fin
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN demandes d ON da.id_demande = d.id
                WHERE da.id_demande = $1
                ORDER BY da.date_generation DESC
            `;

            const result = await db.query(query, [demandeId]);

            res.json({
                success: true,
                data: result.rows
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des documents par demande:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des documents',
                error: error.message
            });
        }
    }

    /**
     * Récupère les documents générés par un validateur (DRH, chef de service)
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getValidatorDocuments(req, res) {
        try {
            const { validateurId } = req.params;
            const { type_demande, type_document } = req.query;
            const dateOutputTimeZone = process.env.APP_TIMEZONE || 'Africa/Libreville';
            const toLocalDateOnlyStr = (value) => {
                if (!value) return null;
                if (typeof value === 'string') {
                    const raw = value.trim();
                    if (!raw) return null;
                    // Date pure: renvoyer telle quelle.
                    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
                    if (dateOnly) return dateOnly[1];
                    // Date/heure: convertir en date locale pour éviter le décalage timezone.
                    const parsed = new Date(raw);
                    if (Number.isNaN(parsed.getTime())) return null;
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: dateOutputTimeZone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    }).format(parsed);
                }
                const d = value instanceof Date ? value : new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return new Intl.DateTimeFormat('en-CA', {
                    timeZone: dateOutputTimeZone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).format(d);
            };

            // Initialiser params AVANT de l'utiliser dans la requête
            const params = [validateurId];

            // Construire la requête selon le rôle du validateur
            let query = `
                SELECT da.*, d.type_demande, d.date_debut, d.date_fin, d.description,
                       d.agree_motif, d.agree_date_cessation, d.annee_non_jouissance_conge,
                       d.date_reprise_service, d.date_fin_conges,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                       s.libelle as service_nom, m.nom as ministere_nom,
                       transmetteur.prenom as transmetteur_prenom, 
                       transmetteur.nom as transmetteur_nom
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents transmetteur ON da.id_agent_transmetteur = transmetteur.id
                WHERE da.id_agent_generateur = $1
            `;

            // Déterminer le rôle du validateur pour filtrer les documents
            const roleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;

            const roleResult = await db.query(roleQuery, [validateurId]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom && roleResult.rows[0].role_nom.toLowerCase()) || '';


            if (roleNom === 'drh') {
                // DRH : voir les documents de son ministère
                const validateurQuery = `
                    SELECT a.id_ministere FROM agents a WHERE a.id = $1
                `;
                const validateurResult = await db.query(validateurQuery, [validateurId]);

                if (validateurResult.rows.length > 0) {
                    const idMinistere = validateurResult.rows[0].id_ministere;
                    query += ` AND a.id_ministere = $${params.length + 1}`;
                    params.push(idMinistere);
                }

            } else if (roleNom === 'chef_service') {
                // Chef de service : voir les documents de son service
                const validateurQuery = `
                    SELECT a.id_direction FROM agents a WHERE a.id = $1
                `;
                const validateurResult = await db.query(validateurQuery, [validateurId]);

                if (validateurResult.rows.length > 0) {
                    const idService = validateurResult.rows[0].id_direction;
                    query += ` AND a.id_direction = $${params.length + 1}`;
                    params.push(idService);
                }

            } else if (roleNom === 'directeur' || roleNom === 'directeur_central' || roleNom === 'directeur_general' ||
                roleNom === 'chef_cabinet' || roleNom === 'dir_cabinet') {
                // Directeur et rôles similaires : voir les documents qu'ils ont générés pour les agents de leur direction
                // La requête de base filtre déjà par da.id_agent_generateur = $1 (validateurId)
                // Il faut juste ajouter le filtre par direction de l'agent destinataire
                const validateurQuery = `
                    SELECT a.id_direction FROM agents a WHERE a.id = $1
                `;
                const validateurResult = await db.query(validateurQuery, [validateurId]);

                if (validateurResult.rows.length > 0) {
                    const idDirection = validateurResult.rows[0].id_direction;
                    // Filtrer par direction de l'agent destinataire (la requête de base filtre déjà par générateur)
                    query += ` AND a.id_direction = $${params.length + 1}`;
                    params.push(idDirection);
                }
                // Si on ne trouve pas la direction, pas de filtre supplémentaire (la requête de base suffit)

            } else if (roleNom === 'super_admin') {
                // Super admin : voir tous les documents
                // Pas de filtre supplémentaire
            } else {
                // Autres rôles : voir seulement leurs propres documents
                query += ` AND da.id_agent_destinataire = $${params.length + 1}`;
                params.push(validateurId);
            }

            // Filtrer par type_document si spécifié directement (priorité sur type_demande)
            if (type_document) {
                query += ` AND da.type_document = $${params.length + 1}`;
                params.push(type_document);
            }
            // Sinon, filtrer par type de demande si spécifié
            else if (type_demande) {
                // Pour les attestations de présence, filtrer par type_document
                if (type_demande === 'attestation_presence') {
                    query += ` AND da.type_document = $${params.length + 1}`;
                    params.push('attestation_presence');
                } else {
                    // Pour les autres types, filtrer par type_demande ET type_document
                    // Inclure aussi les documents sans demande (id_demande IS NULL)
                    let typeDocument = '';
                    if (type_demande === 'absence') {
                        typeDocument = 'autorisation_absence';
                    } else if (type_demande === 'sortie_territoire') {
                        typeDocument = 'autorisation_sortie_territoire';
                    } else if (type_demande === 'attestation_travail') {
                        typeDocument = 'attestation_travail';
                    } else if (type_demande === 'certificat_cessation') {
                        typeDocument = 'certificat_cessation';
                    } else if (type_demande === 'certificat_non_jouissance_conge') {
                        typeDocument = 'certificat_non_jouissance_conge';
                    } else {
                        typeDocument = type_demande;
                    }

                    // Inclure les documents avec demande ET les documents sans demande (générés directement)
                    query += ` AND (
                        (da.id_demande IS NOT NULL AND d.type_demande = $${params.length + 1} AND da.type_document = $${params.length + 2})
                        OR 
                        (da.id_demande IS NULL AND da.type_document = $${params.length + 2})
                    )`;
                    params.push(type_demande);
                    params.push(typeDocument);

                }
            }

            query += ` ORDER BY da.date_generation DESC`;


            const result = await db.query(query, params);
            const data = (result.rows || []).map((row) => ({
                ...row,
                // Normaliser les dates "métier" pour éviter les valeurs ISO décalées.
                date_debut: toLocalDateOnlyStr(row.date_debut),
                date_fin: toLocalDateOnlyStr(row.date_fin),
                agree_date_cessation: toLocalDateOnlyStr(row.agree_date_cessation),
                date_reprise_service: toLocalDateOnlyStr(row.date_reprise_service),
                date_fin_conges: toLocalDateOnlyStr(row.date_fin_conges)
            }));

            res.json({
                success: true,
                data
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des documents du validateur:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère les détails d'un document spécifique par son ID
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getDocumentById(req, res) {
        try {
            const { documentId } = req.params;

            console.log(`📄 Récupération des détails du document ${documentId}...`);

            const query = `
                SELECT 
                    da.*,
                    d.type_demande, d.date_debut, d.date_fin, d.description, d.motif, d.date_cessation, d.agree_motif, d.agree_date_cessation, d.date_reprise_service, d.date_fin_conges,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.email, a.sexe,
                    a.fonction_actuelle, a.date_naissance, a.lieu_naissance,
                    c.libele as civilite,
                    s.libelle as service_nom, s.description as service_description,
                    m.nom as ministere_nom, m.description as ministere_description,
                    generateur.prenom as generateur_prenom, generateur.nom as generateur_nom,
                    generateur.fonction_actuelle as generateur_fonction,
                    transmetteur.prenom as transmetteur_prenom, transmetteur.nom as transmetteur_nom,
                    transmetteur.fonction_actuelle as transmetteur_fonction
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents generateur ON da.id_agent_generateur = generateur.id
                LEFT JOIN agents transmetteur ON da.id_agent_transmetteur = transmetteur.id
                WHERE da.id = $1
            `;

            const result = await db.query(query, [documentId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document non trouvé'
                });
            }

            const document = result.rows[0];

            // Vérifier si le fichier PDF existe
            const fs = require('fs');
            const path = require('path');
            let pdfExists = false;
            let pdfPath = null;

            if (document.chemin_fichier) {
                const fullPath = path.join(__dirname, '../', document.chemin_fichier);
                pdfExists = fs.existsSync(fullPath);
                pdfPath = pdfExists ? document.chemin_fichier : null;
            }

            // Préparer la réponse
            const documentDateFields = ['date_generation', 'date_transmission', 'date_reception'];
            const demandeDateFields = ['date_debut', 'date_fin', 'date_cessation', 'agree_date_cessation'];
            const agentDateFields = ['date_naissance'];

            const response = {
                success: true,
                data: {
                    document: formatDatesInObject({
                        id: document.id,
                        type_document: document.type_document,
                        statut: document.statut,
                        date_generation: document.date_generation,
                        date_transmission: document.date_transmission,
                        date_reception: document.date_reception,
                        commentaire_transmission: document.commentaire_transmission,
                        chemin_fichier: document.chemin_fichier,
                        pdf_available: pdfExists,
                        pdf_path: pdfPath
                    }, documentDateFields),
                    demande: formatDatesInObject({
                        id: document.id_demande,
                        type_demande: document.type_demande,
                        description: document.description,
                        date_debut: document.date_debut,
                        date_fin: document.date_fin,
                        motif: document.motif,
                        date_cessation: document.date_cessation,
                        agree_motif: document.agree_motif,
                        agree_date_cessation: document.agree_date_cessation
                    }, demandeDateFields),
                    agent: formatDatesInObject({
                        id: document.id_agent_destinataire,
                        prenom: document.agent_prenom,
                        nom: document.agent_nom,
                        matricule: document.matricule,
                        email: document.email,
                        sexe: document.sexe,
                        fonction_actuelle: document.fonction_actuelle,
                        date_naissance: document.date_naissance,
                        lieu_naissance: document.lieu_naissance,
                        civilite: document.civilite
                    }, agentDateFields),
                    service: {
                        nom: document.service_nom,
                        description: document.service_description
                    },
                    ministere: {
                        nom: document.ministere_nom,
                        description: document.ministere_description
                    },
                    generateur: document.generateur_prenom && document.generateur_nom ? {
                        prenom: document.generateur_prenom,
                        nom: document.generateur_nom,
                        fonction: document.generateur_fonction
                    } : null,
                    transmetteur: document.transmetteur_prenom && document.transmetteur_nom ? {
                        prenom: document.transmetteur_prenom,
                        nom: document.transmetteur_nom,
                        fonction: document.transmetteur_fonction
                    } : null
                }
            };

            console.log(`✅ Détails du document ${documentId} récupérés avec succès`);

            res.json(response);

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des détails du document:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère le contenu HTML d'un document spécifique
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getDocumentHTML(req, res) {
        try {
            const { documentId } = req.params;

            console.log(`📄 Récupération du contenu HTML du document ${documentId}...`);

            // Récupérer les données du document avec toutes les informations nécessaires
            const query = `
                SELECT 
                    da.*,
                    d.type_demande, d.date_debut, d.date_fin, d.description, d.lieu,
                    d.motif, d.motif_conge, d.nombre_jours, d.date_cessation, d.agree_motif, d.agree_date_cessation, d.annee_au_titre_conge,
                    d.date_reprise_service, d.date_fin_conges,
                    a.id as agent_id,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.email, a.sexe,
                    a.fonction_actuelle, a.date_de_naissance, a.lieu_de_naissance,
                    a.id_direction, a.id_sous_direction,
                    a.id_ministere as id_ministere,
                    s.libelle as service_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    generateur.id as generateur_id,
                    generateur.prenom as generateur_prenom, generateur.nom as generateur_nom
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents generateur ON da.id_agent_generateur = generateur.id
                WHERE da.id = $1
            `;

            const result = await db.query(query, [documentId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document non trouvé'
                });
            }

            const document = result.rows[0];

            // Préparer les données pour le template
            // Pour les certificats de cessation, prioriser les données du document, puis celles de la demande
            let motifFinal = null;
            let dateCessationFinal = null;

            if (document.type_document === 'certificat_cessation') {
                // Prioriser: motif_cessation du document > motif de la demande > agree_motif
                motifFinal = document.motif_cessation || document.motif || document.agree_motif;
                // Prioriser: date_cessation du document > date_cessation de la demande > agree_date_cessation
                dateCessationFinal = document.date_cessation || document.agree_date_cessation;

                // Log pour déboguer
                console.log('🔍 DEBUG - Motif récupéré pour certificat de cessation (HTML):', {
                    motif_cessation: document.motif_cessation,
                    motif_demande: document.motif,
                    agree_motif: document.agree_motif,
                    motif_final: motifFinal,
                    date_cessation_doc: document.date_cessation,
                    date_cessation_demande: document.date_cessation,
                    agree_date_cessation: document.agree_date_cessation,
                    date_final: dateCessationFinal,
                    id_demande: document.id_demande
                });
            } else {
                motifFinal = document.motif || document.agree_motif;
                dateCessationFinal = document.date_cessation || document.agree_date_cessation;
            }

            const demande = {
                id: document.id_demande,
                date_debut: document.date_debut,
                date_fin: document.date_fin,
                description: document.description,
                lieu: document.lieu,
                motif: motifFinal,
                motif_conge: document.motif_conge,
                date_cessation: dateCessationFinal,
                agree_motif: document.agree_motif,
                agree_date_cessation: document.agree_date_cessation,
                annee_au_titre_conge: document.annee_au_titre_conge || null,
                date_reprise_service: document.date_reprise_service || null,
                date_fin_conges: document.date_fin_conges || null,
                nombre_jours: document.nombre_jours != null ? document.nombre_jours : null
            };

            const agent = {
                id: document.agent_id,
                prenom: document.agent_prenom,
                nom: document.agent_nom,
                matricule: document.matricule,
                sexe: document.sexe,
                fonction_actuelle: document.fonction_actuelle || 'Agent',
                service_nom: document.service_nom,
                ministere_nom: document.ministere_nom,
                ministere_sigle: document.ministere_sigle,
                date_prise_service_au_ministere: document.date_prise_service_au_ministere,
                date_prise_service_dans_la_direction: document.date_prise_service_dans_la_direction,
                id_direction: document.id_direction,
                id_sous_direction: document.id_sous_direction,
                id_ministere: document.id_ministere
            };

            const validateur = {
                id: document.generateur_id,
                prenom: document.generateur_prenom,
                nom: document.generateur_nom
            };

            // Attacher la signature active au validateur avant de générer le HTML
            const { attachActiveSignature } = require('../services/utils/signatureUtils');
            const { hydrateAgentWithLatestFunction } = require('../services/utils/agentFunction');
            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le HTML selon le type de document
            let htmlContent = '';

            if (document.type_document === 'autorisation_sortie_territoire') {
                const AutorisationSortieTerritoireTemplate = require('../services/AutorisationSortieTerritoireTemplate');
                htmlContent = await AutorisationSortieTerritoireTemplate.generateHTML(demande, agent, validateur, document);
            } else if (document.type_document === 'certificat_cessation') {
                const CertificatCessationTemplate = require('../services/CertificatCessationTemplate');
                htmlContent = await CertificatCessationTemplate.generateHTML(demande, agent, validateur, document);
            } else if (document.type_document === 'certificat_reprise_service') {
                const CertificatRepriseServiceTemplate = require('../services/CertificatRepriseServiceTemplate');
                htmlContent = await CertificatRepriseServiceTemplate.generateHTML(demande, agent, validateur, document);
            } else if (document.type_document === 'certificat_non_jouissance_conge') {
                const CertificatNonJouissanceCongeTemplate = require('../services/CertificatNonJouissanceCongeTemplate');
                htmlContent = await CertificatNonJouissanceCongeTemplate.generateHTML(demande, agent, validateur, document);
            } else if (document.type_document === 'autorisation_absence') {
                const AutorisationAbsenceTemplate = require('../services/AutorisationAbsenceTemplate');
                htmlContent = await AutorisationAbsenceTemplate.generateHTML(demande, agent, validateur, document);
            } else if (document.type_document === 'attestation_presence') {
                const AttestationPresenceTemplate = require('../services/AttestationPresenceTemplate');
                htmlContent = await AttestationPresenceTemplate.generateHTML(demande, agent, validateur, document);
            } else if (document.type_document === 'note_de_service') {
                const DocumentGenerationService = require('../services/DocumentGenerationService');
                htmlContent = DocumentGenerationService.generateNoteDeServiceHTML(agent, validateur, {
                    date_generation: document.date_generation,
                    date_effet: document.date_generation
                });
            } else {
                // Par défaut, utiliser le template d'autorisation d'absence
                const AutorisationAbsenceTemplate = require('../services/AutorisationAbsenceTemplate');
                htmlContent = await AutorisationAbsenceTemplate.generateHTML(demande, agent, validateur, document);
            }

            console.log(`✅ Contenu HTML du document ${documentId} généré avec succès`);

            res.json({
                success: true,
                data: {
                    html: htmlContent,
                    document: {
                        id: document.id,
                        titre: document.titre,
                        type_document: document.type_document,
                        statut: document.statut
                    }
                }
            });

        } catch (error) {
            console.error('❌ Erreur lors de la génération du contenu HTML du document:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Génère et télécharge un PDF du document
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getDocumentPDF(req, res) {
        try {
            const { documentId } = req.params;

            console.log(`📄 Génération du PDF du document ${documentId}...`);

            // Récupérer les données du document
            const query = `
                SELECT 
                    da.*,
                    da.motif_cessation, da.date_cessation,
                    d.type_demande, d.date_debut, d.date_fin, d.description, d.lieu,
                    d.agree_motif, d.agree_date_cessation,
                    d.motif_conge, d.motif, d.annee_au_titre_conge,
                    a.id as agent_id,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.email, a.sexe,
                    a.fonction_actuelle, a.date_de_naissance, a.lieu_de_naissance,
                    a.date_prise_service_au_ministere, a.date_prise_service_dans_la_direction,
                    a.id_direction, a.id_sous_direction, a.id_ministere,
                    c.libele as civilite,
                    s.libelle as service_nom, s.libelle as direction_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    cat.libele as classe_libelle,
                    COALESCE(a.date_embauche, a.date_prise_service_au_ministere) as grade_date_entree,
                    generateur.id as generateur_id,
                    generateur.prenom as generateur_prenom, 
                    generateur.nom as generateur_nom,
                    ga_actuelle.grade_libele as grade_libele,
                    ech_actuelle.echelon_libelle as echelon_libelle,
                    ta.libele as type_agent_libele,
                    ea_actuel.emploi_libele as emploi_libele,
                    ea_actuel.designation_poste as emploi_designation_poste,
                    fa_actuelle.fonction_libele as fonction_actuelle_libele
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.designation_poste as designation_poste
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent)
                        fa.id_agent,
                        f.libele as fonction_libele
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                LEFT JOIN agents generateur ON da.id_agent_generateur = generateur.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele AS echelon_libelle
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE da.id = $1
            `;

            const result = await db.query(query, [documentId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Document non trouvé'
                });
            }

            const document = result.rows[0];

            // Déterminer si l'agent est directeur ou sous-directeur pour récupérer la bonne décision
            const fonctionActuelle = (document.fonction_actuelle_libele || document.fonction_actuelle || '').toLowerCase();
            const isDirecteurOuSousDirecteur = fonctionActuelle.includes('directeur') ||
                fonctionActuelle.includes('sous-directeur') ||
                fonctionActuelle.includes('directrice') ||
                fonctionActuelle.includes('sous-directrice');

            const dateCessationDoc = document.agree_date_cessation || document.date_cessation;
            const anneeFiltre = document.annee_au_titre_conge ?
                parseInt(document.annee_au_titre_conge, 10) :
                (dateCessationDoc ? new Date(dateCessationDoc).getFullYear() : new Date().getFullYear());

            // Récupérer la décision selon l'année au titre du congé et le périmètre
            let numeroActeDecision = null;
            try {
                const agentIdDoc = document.agent_id;
                const idDirection = document.id_direction != null ? parseInt(document.id_direction, 10) : null;
                const idSousDirection = document.id_sous_direction != null ? parseInt(document.id_sous_direction, 10) : null;
                let decisionResult;
                if (isDirecteurOuSousDirecteur && agentIdDoc) {
                    decisionResult = await db.query(`
                        SELECT numero_acte FROM decisions
                        WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [agentIdDoc, anneeFiltre]);
                    if ((!decisionResult || decisionResult.rows.length === 0) && idDirection != null && !isNaN(idDirection)) {
                        decisionResult = await db.query(`
                            SELECT numero_acte FROM decisions
                            WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                            ORDER BY date_decision DESC, created_at DESC LIMIT 1
                        `, [idDirection, anneeFiltre]);
                    }
                } else if (idSousDirection != null && !isNaN(idSousDirection)) {
                    decisionResult = await db.query(`
                        SELECT numero_acte FROM decisions
                        WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [idSousDirection, anneeFiltre]);
                } else if (idDirection != null && !isNaN(idDirection)) {
                    decisionResult = await db.query(`
                        SELECT numero_acte FROM decisions
                        WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [idDirection, anneeFiltre]);
                } else {
                    decisionResult = await db.query(`
                        SELECT numero_acte FROM decisions
                        WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [anneeFiltre]);
                }
                if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                    numeroActeDecision = decisionResult.rows[0].numero_acte;
                }
            } catch (decisionError) {
                console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
            }

            // Numéro de décision utilisé uniquement sur le document de congé annuel
            const motifDoc = (document.motif_conge || document.motif || document.agree_motif || '').toString().toLowerCase();
            const isCongeAnnuelDoc = motifDoc.includes('congé annuel') || motifDoc.includes('conge annuel') || (motifDoc.includes('congé') && motifDoc.includes('annuel'));
            // Préparer les données pour la génération PDF
            // Pour les documents sans demande, utiliser les colonnes de documents_autorisation
            const demande = {
                id: document.id_demande,
                date_debut: document.date_debut,
                date_fin: document.date_fin,
                description: document.description,
                lieu: document.lieu,
                motif_conge: document.motif_conge || null,
                motif: document.motif_conge || document.motif || null,
                agree_motif: document.id_demande ? document.agree_motif : (document.motif_cessation || document.agree_motif || null),
                agree_date_cessation: document.id_demande ? document.agree_date_cessation : (document.date_cessation || null),
                date_cessation: document.date_cessation || document.agree_date_cessation || null,
                annee_au_titre_conge: document.annee_au_titre_conge || null,
                numero_acte_decision: isCongeAnnuelDoc ? numeroActeDecision : null
            };

            console.log('🔍 DEBUG - Données de la demande préparées pour getDocumentPDF:', {
                id: demande.id,
                motif_conge: demande.motif_conge,
                motif: demande.motif,
                agree_motif: demande.agree_motif,
                agree_date_cessation: demande.agree_date_cessation,
                document_motif_conge: document.motif_conge,
                document_motif: document.motif
            });

            const agent = {
                id: document.agent_id,
                prenom: document.agent_prenom,
                nom: document.agent_nom,
                matricule: document.matricule,
                sexe: document.sexe,
                civilite: document.civilite,
                fonction_actuelle: document.fonction_actuelle_libele || document.fonction_actuelle || 'Agent',
                date_de_naissance: document.date_de_naissance,
                lieu_de_naissance: document.lieu_de_naissance,
                service_nom: document.service_nom,
                direction_nom: document.direction_nom || document.service_nom,
                ministere_nom: document.ministere_nom,
                ministere_sigle: document.ministere_sigle,
                grade_libele: document.grade_libele,
                echelon_libelle: document.echelon_libelle,
                classe_libelle: document.classe_libelle,
                date_prise_service_au_ministere: document.date_prise_service_au_ministere,
                date_prise_service_dans_la_direction: document.date_prise_service_dans_la_direction,
                id_direction: document.id_direction,
                id_ministere: document.id_ministere,
                type_agent_libele: document.type_agent_libele,
                emploi_libele: document.emploi_libele,
                emploi_designation_poste: document.emploi_designation_poste
            };

            const validateur = {
                id: document.generateur_id || document.id_agent_generateur,
                prenom: document.generateur_prenom,
                nom: document.generateur_nom
            };

            // Pour note de service, mutation, attestation travail : utiliser DRH comme signataire (sauf certificat_prise_service)
            const { fetchDRHForSignature, attachActiveSignature } = require('../services/utils/signatureUtils');
            const { hydrateAgentWithLatestFunction } = require('../services/utils/agentFunction');
            if (['note_de_service', 'note_de_service_mutation', 'attestation_travail'].includes(document.type_document)) {
                const drh = await fetchDRHForSignature(agent.id_direction, agent.id_ministere);
                if (drh) {
                    Object.assign(validateur, drh);
                    validateur.signatureRoleOverride = 'Le Directeur';
                    await hydrateAgentWithLatestFunction(validateur);
                    await attachActiveSignature(validateur);
                }
            }

            // S'assurer que le validateur a un ID
            if (!validateur.id) {
                console.error('❌ [getDocumentPDF] Le validateur n\'a pas d\'ID:', {
                    generateur_id: document.generateur_id,
                    id_agent_generateur: document.id_agent_generateur,
                    validateur: validateur
                });
                // Essayer de récupérer l'ID depuis id_agent_generateur si présent
                if (document.id_agent_generateur) {
                    validateur.id = document.id_agent_generateur;
                } else {
                    throw new Error('Le validateur doit avoir un ID pour récupérer la signature');
                }
            }

            console.log('🔍 [getDocumentPDF] Validateur récupéré:', {
                id: validateur.id,
                nom: validateur.nom,
                prenom: validateur.prenom
            });

            // Générer le PDF selon le type de document
            let pdfBuffer;

            const PDFKitGenerationService = require('../services/PDFKitGenerationService');
            const fs = require('fs').promises;
            const path = require('path');

            if (document.type_document === 'autorisation_sortie_territoire') {
                // Utiliser la méthode générique pour l'autorisation de sortie de territoire
                const pdfPath = await PDFKitGenerationService.generatePDFForDocument({ id: documentId });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            } else if (document.type_document === 'certificat_cessation') {
                // Utiliser la méthode générique pour le certificat de cessation
                const pdfPath = await PDFKitGenerationService.generatePDFForDocument({ id: documentId });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            } else if (document.type_document === 'certificat_reprise_service') {
                // Utiliser la méthode générique pour le certificat de reprise de service
                const pdfPath = await PDFKitGenerationService.generatePDFForDocument({ id: documentId });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            } else if (document.type_document === 'certificat_non_jouissance_conge') {
                // Utiliser la méthode générique pour le certificat de non jouissance de congé
                const pdfPath = await PDFKitGenerationService.generatePDFForDocument({ id: documentId });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            } else if (document.type_document === 'attestation_presence') {
                // Utiliser la méthode générique pour l'attestation de présence
                const pdfPath = await PDFKitGenerationService.generatePDFForDocument({ id: documentId });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            } else if (document.type_document === 'certificat_prise_service') {
                // Utiliser la méthode générique pour le certificat de prise de service
                console.log('📄 Génération du PDF pour certificat_prise_service, document ID:', documentId);
                const pdfPath = await PDFKitGenerationService.generatePDFForDocument({ id: documentId });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
                console.log('✅ PDF généré avec succès pour certificat_prise_service');
            } else if (document.type_document === 'attestation_travail') {
                // Utiliser le nouveau service MemoryPDFService pour l'attestation de travail
                const MemoryPDFService = require('../services/MemoryPDFService');
                pdfBuffer = await MemoryPDFService.generateAttestationTravailPDFBuffer(demande, agent, validateur);
            } else if (document.type_document === 'note_de_service') {
                // Utiliser le service MemoryPDFService pour la note de service
                const MemoryPDFService = require('../services/MemoryPDFService');
                // Extraire cert_reference depuis les commentaires si présent
                let certReference = null;
                let certDate = null;
                if (document.commentaires) {
                    const certMatch = document.commentaires.match(/CERT[.\s]*DE[.\s]*1ERE[.\s]*P[.\s]*DE[.\s]*SERVICE[:\s]*([^\s]+)/i);
                    if (certMatch && certMatch[1]) {
                        certReference = certMatch[1];
                    }
                }
                pdfBuffer = await MemoryPDFService.generateNoteDeServicePDFBuffer(agent, validateur, {
                    date_generation: document.date_generation,
                    date_effet: document.date_generation,
                    document_id: document.id,
                    numero_document: document.numero_document,
                    date_echelon: document.grade_date_entree,
                    cert_reference: certReference,
                    cert_date: certDate
                });
            } else if (document.type_document === 'note_de_service_mutation') {
                // Utiliser le service MemoryPDFService pour la note de service de mutation
                const MemoryPDFService = require('../services/MemoryPDFService');

                // Extraire les informations de mutation depuis les commentaires ou la description
                let mutationOptions = {
                    direction_destination: null,
                    date_effet: document.date_debut,
                    motif: null
                };

                // Parser les données de mutation depuis les commentaires ou description
                try {
                    if (document.commentaires) {
                        const directionMatch = document.commentaires.match(/Direction destination:\s*([^\n]+)/i);
                        if (directionMatch) {
                            mutationOptions.direction_destination = directionMatch[1].trim();
                        }
                    }

                    // Essayer aussi depuis la description de la demande si disponible
                    if (document.description && document.description.startsWith('MUTATION_DATA:')) {
                        const jsonStr = document.description.replace('MUTATION_DATA:', '');
                        const mutationData = JSON.parse(jsonStr);
                        mutationOptions.direction_destination = mutationData.direction_destination;
                        mutationOptions.date_effet = mutationData.date_effet;
                        mutationOptions.motif = mutationData.motif;
                    }
                } catch (e) {
                    console.warn('⚠️ Erreur lors de l\'extraction des infos de mutation:', e);
                }

                pdfBuffer = await MemoryPDFService.generateNoteDeServiceMutationPDFBuffer(demande || {}, agent, validateur, {
                    date_generation: document.date_generation,
                    document_id: document.id,
                    numero_document: document.numero_document,
                    ...mutationOptions
                });

            } else if (document.type_document === 'autorisation_absence') {
                // Utiliser la méthode spécifique pour l'autorisation d'absence (avec documentId/typeDocument pour le numéro séquentiel)
                const pdfPath = await PDFKitGenerationService.generateAutorisationAbsencePDFAuto(demande, agent, validateur, req.user, null, { documentId: document.id, typeDocument: document.type_document });
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            } else {
                // Par défaut, utiliser le service de génération PDF existant pour l'autorisation d'absence (avec document pour le numéro séquentiel)
                const pdfPath = await PDFKitGenerationService.generateAutorisationAbsencePDFAuto(demande, agent, validateur, req.user, null, document.type_document === 'autorisation_absence' ? { documentId: document.id, typeDocument: document.type_document } : null);
                // Vérifier si le chemin est absolu ou relatif
                const fullPath = path.isAbsolute(pdfPath) ? pdfPath : path.join(__dirname, '..', pdfPath);
                // Attendre que le fichier soit complètement écrit
                await new Promise(resolve => setTimeout(resolve, 100));
                pdfBuffer = await fs.readFile(fullPath);
            }

            console.log(`✅ PDF du document ${documentId} généré avec succès`);

            // Nettoyer le nom de fichier pour éviter les caractères invalides dans les headers
            const cleanFileName = (document.titre || 'document')
                .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
                .replace(/\s+/g, '_') // Remplacer les espaces par des underscores
                .substring(0, 100); // Limiter la longueur

            // Configurer les headers pour le téléchargement
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.send(pdfBuffer);

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF du document:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Génère un certificat de cessation de service directement
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async genererCertificatCessation(req, res) {
        try {
            const { id_agent, motif, date_cessation } = req.body;

            // Validation
            if (!id_agent) {
                return res.status(400).json({
                    success: false,
                    error: 'L\'ID de l\'agent est requis'
                });
            }

            if (!motif || !motif.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Le motif de cessation est requis'
                });
            }

            if (!date_cessation) {
                return res.status(400).json({
                    success: false,
                    error: 'La date de cessation est requise'
                });
            }

            // Récupérer les informations de l'agent
            const agentQuery = `
                SELECT a.*, 
                       c.libele as civilite,
                       s.libelle as service_nom,
                       s.libelle as direction_nom,
                       m.nom as ministere_nom,
                       m.sigle as ministere_sigle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
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

            // Déterminer si l'agent est directeur ou sous-directeur
            const fonctionActuelle = (agent.fonction_actuelle || '').toLowerCase();
            const isDirecteurOuSousDirecteur = fonctionActuelle.includes('directeur') ||
                fonctionActuelle.includes('sous-directeur') ||
                fonctionActuelle.includes('directrice') ||
                fonctionActuelle.includes('sous-directrice');

            const anneeFiltreGen = date_cessation ? new Date(date_cessation).getFullYear() : new Date().getFullYear();
            let numeroActeDecision = null;
            try {
                const agentIdGen = agent.id;
                const idDirGen = agent.id_direction != null ? parseInt(agent.id_direction, 10) : null;
                const idSousGen = agent.id_sous_direction != null ? parseInt(agent.id_sous_direction, 10) : null;
                let decisionResult;
                if (isDirecteurOuSousDirecteur && agentIdGen) {
                    decisionResult = await db.query(`SELECT numero_acte, chemin_document FROM decisions WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [agentIdGen, anneeFiltreGen]);
                    if ((!decisionResult || decisionResult.rows.length === 0) && idDirGen != null && !isNaN(idDirGen)) {
                        decisionResult = await db.query(`SELECT numero_acte, chemin_document FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirGen, anneeFiltreGen]);
                    }
                } else if (idSousGen != null && !isNaN(idSousGen)) {
                    decisionResult = await db.query(`SELECT numero_acte, chemin_document FROM decisions WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idSousGen, anneeFiltreGen]);
                } else if (idDirGen != null && !isNaN(idDirGen)) {
                    decisionResult = await db.query(`SELECT numero_acte, chemin_document FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirGen, anneeFiltreGen]);
                } else {
                    decisionResult = await db.query(`SELECT numero_acte, chemin_document FROM decisions WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [anneeFiltreGen]);
                }
                if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                    numeroActeDecision = decisionResult.rows[0].numero_acte;
                }
            } catch (decisionError) {
                console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
            }

            // Récupérer les informations du validateur (DRH connecté)
            const validateurQuery = `
                SELECT a.*, 
                       c.libele as civilite,
                       s.libelle as direction_nom,
                       m.nom as ministere_nom,
                       m.sigle as ministere_sigle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id = $1
            `;

            const validateurResult = await db.query(validateurQuery, [req.user.id_agent]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const validateur = validateurResult.rows[0];

            // Numéro de décision utilisé uniquement sur le document de congé annuel
            const motifLowerGen = (motif || '').toString().toLowerCase();
            const isCongeAnnuelGen = motifLowerGen.includes('congé annuel') || motifLowerGen.includes('conge annuel') || (motifLowerGen.includes('congé') && motifLowerGen.includes('annuel'));
            // Préparer les données de la demande
            const demande = {
                id: null, // Pas de demande existante
                agree_motif: motif.trim(),
                agree_date_cessation: date_cessation,
                motif: motif.trim(), // Ajouter aussi motif pour compatibilité
                date_debut: date_cessation,
                date_fin: null,
                numero_acte_decision: isCongeAnnuelGen ? numeroActeDecision : null
            };

            // Log pour déboguer
            console.log('📋 Données de la demande préparées:', {
                agree_motif: demande.agree_motif,
                agree_date_cessation: demande.agree_date_cessation,
                motif: demande.motif,
                date_debut: demande.date_debut
            });

            // Préparer les données de l'agent
            const agentData = {
                id: agent.id,
                prenom: agent.prenom,
                nom: agent.nom,
                matricule: agent.matricule,
                sexe: agent.sexe,
                civilite: agent.civilite,
                fonction_actuelle: agent.fonction_actuelle,
                service_nom: agent.service_nom,
                direction_nom: agent.direction_nom,
                ministere_nom: agent.ministere_nom,
                ministere_sigle: agent.ministere_sigle
            };

            // Préparer les données du validateur
            const validateurData = {
                id: validateur.id,
                prenom: validateur.prenom,
                nom: validateur.nom,
                sexe: validateur.sexe,
                civilite: validateur.civilite,
                direction_nom: validateur.direction_nom,
                ministere_nom: validateur.ministere_nom,
                ministere_sigle: validateur.ministere_sigle
            };

            // Générer le PDF du certificat de cessation
            const PDFKitGenerationService = require('../services/PDFKitGenerationService');
            const MemoryPDFService = require('../services/MemoryPDFService');
            const { hydrateAgentWithLatestFunction } = require('../services/utils/agentFunction');
            const { attachActiveSignature } = require('../services/utils/signatureUtils');

            // Hydrater les fonctions et signatures
            await hydrateAgentWithLatestFunction(validateurData);
            await attachActiveSignature(validateurData);

            // Générer le PDF en mémoire
            const pdfBuffer = await MemoryPDFService.generateCertificatCessationPDFBuffer(
                demande,
                agentData,
                validateurData,
                req.user
            );

            // Créer un document dans la base de données (sans id_demande car génération directe)
            const documentInsertQuery = `
                INSERT INTO documents_autorisation (
                    type_document,
                    id_agent_destinataire,
                    id_agent_generateur,
                    titre,
                    date_generation,
                    chemin_fichier,
                    statut,
                    contenu,
                    motif_cessation,
                    date_cessation,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            const timestamp = Date.now();
            const fileName = `certificat_cessation_${agent.id}_${timestamp}.pdf`;
            const relativePath = `uploads/documents/${fileName}`;
            const fullPath = path.join(__dirname, '..', relativePath);

            // Créer le répertoire s'il n'existe pas
            const dir = path.dirname(fullPath);
            if (!fsSync.existsSync(dir)) {
                fsSync.mkdirSync(dir, { recursive: true });
            }

            // Sauvegarder le PDF
            await fs.writeFile(fullPath, pdfBuffer);

            // Générer le contenu HTML complet du document avec le template
            const CertificatCessationTemplate = require('../services/CertificatCessationTemplate');
            const contenuHTML = await CertificatCessationTemplate.generateHTML(demande, agentData, validateurData);

            const documentResult = await db.query(documentInsertQuery, [
                'certificat_cessation',
                agent.id,
                validateur.id,
                `Certificat de cessation de service - ${agent.prenom} ${agent.nom}`,
                new Date(),
                relativePath,
                'generé',
                contenuHTML,
                motif.trim(), // motif_cessation
                date_cessation // date_cessation
            ]);

            const documentId = documentResult.rows[0].id;

            console.log(`✅ Certificat de cessation généré avec succès pour l'agent ${agent.id}`);

            // Retourner la réponse avec l'URL du PDF
            const baseUrl = req.protocol + '://' + req.get('host');
            const pdfUrl = `${baseUrl}/api/documents/${documentId}/pdf`;

            res.json({
                success: true,
                message: 'Certificat de cessation généré avec succès',
                document_id: documentId,
                pdf_url: pdfUrl
            });

        } catch (error) {
            console.error('❌ Erreur lors de la génération du certificat de cessation:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère toutes les notes de service pour le DRH (tous les agents de son ministère)
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getAllNotesDeService(req, res) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;

            console.log(`📄 Récupération de toutes les notes de service pour le DRH ${userId}...`);

            // Vérifier que l'utilisateur est DRH
            if (!userRole || (userRole.toLowerCase() !== 'drh' && userRole.toLowerCase() !== 'super_admin')) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès refusé. Seuls les DRH peuvent accéder à cette ressource.'
                });
            }

            // Accepter id_ministere (frontend) ou ministere_id (alternatif) en query, sinon depuis l'agent DRH
            const rawQuery = req.query.id_ministere ? req.query.id_ministere : req.query.ministere_id ? req.query.ministere_id : req.query.idMinistere;
            const idMinistereQuery = rawQuery != null ? String(rawQuery).trim() : '';
            let idMinistere = idMinistereQuery !== '' && !isNaN(Number(idMinistereQuery)) ? parseInt(idMinistereQuery, 10) : null;

            if (idMinistere == null || isNaN(idMinistere)) {
                idMinistere = null;
            }

            if (idMinistere == null) {
                // Récupérer le ministère du DRH depuis son agent
                const validateurQuery = `
                    SELECT a.id_ministere 
                    FROM agents a 
                    WHERE a.id = $1
                `;
                const validateurResult = await db.query(validateurQuery, [req.user.id_agent]);

                if (validateurResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'DRH non trouvé'
                    });
                }

                idMinistere = parseInt(validateurResult.rows[0].id_ministere, 10);
            }

            // Pour les non super_admin, vérifier que le ministère demandé est celui de l'utilisateur
            if (userRole.toLowerCase() !== 'super_admin' && req.user.id_agent) {
                const checkMinistere = await db.query(
                    'SELECT id_ministere FROM agents WHERE id = $1', [req.user.id_agent]
                );
                if (checkMinistere.rows.length > 0 && idMinistere !== parseInt(checkMinistere.rows[0].id_ministere, 10)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Accès refusé. Vous ne pouvez consulter que les notes de service de votre ministère.'
                    });
                }
            }

            // Pagination : 10 par page par défaut
            const limitParam = req.query.limit != null ? parseInt(req.query.limit, 10) : 10;
            const pageParam = req.query.page != null ? Math.max(1, parseInt(req.query.page, 10)) : 1;
            const limit = (limitParam != null && !isNaN(limitParam) && limitParam > 0) ?
                Math.min(parseInt(limitParam, 10), 10000) :
                10;
            const offset = (pageParam - 1) * limit;

            const search = typeof req.query.search === 'string' ? req.query.search.trim() : null;
            const searchPattern = search && search.length > 0 ? `%${search}%` : null;

            console.log(`📄 Filtre notes de service: id_ministere = ${idMinistere} (limit=${limit}, page=${pageParam}, search=${search || 'non'})`);

            const whereBase = `da.type_document = 'note_de_service' AND a.id_ministere = $1`;
            const whereSearch = searchPattern ?
                ` AND (a.prenom ILIKE $2 OR a.nom ILIKE $2 OR a.matricule ILIKE $2 OR s.libelle ILIKE $2 OR CONCAT(a.prenom, ' ', a.nom) ILIKE $2)` :
                '';
            const limitParamIndex = searchPattern ? 3 : 2;

            let query = `
                SELECT da.*, 
                       a.id as agent_id,
                       a.prenom as agent_prenom, 
                       a.nom as agent_nom,
                       a.matricule,
                       a.date_de_naissance, 
                       a.lieu_de_naissance, 
                       a.sexe,
                       fa_actuelle.fonction_libele as fonction_actuelle,
                       c.libele as civilite,
                       s.libelle as service_nom, 
                       s.libelle as direction_nom,
                       COALESCE(dg_agent.libelle, dg_dir.libelle) as direction_generale_nom,
                       m.nom as ministere_nom, 
                       m.sigle as ministere_sigle,
                       generateur.prenom as generateur_prenom, 
                       generateur.nom as generateur_nom,
                       ga_actuelle.grade_libele as grade_libele,
                       ech_actuelle.echelon_libele as echelon_libele
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN direction_generale dg_agent ON a.id_direction_generale = dg_agent.id
                LEFT JOIN direction_generale dg_dir ON s.id_direction_generale = dg_dir.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents generateur ON da.id_agent_generateur = generateur.id
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent)
                        fa.id_agent,
                        f.libele AS fonction_libele
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, COALESCE(fa.date_entree, fa.created_at) DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele AS echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE ${whereBase}${whereSearch}
                ORDER BY da.date_generation DESC
                LIMIT $${limitParamIndex} OFFSET $${limitParamIndex + 1}
            `;
            const queryParams = [idMinistere];
            if (searchPattern) queryParams.push(searchPattern);
            queryParams.push(limit, offset);

            const result = await db.query(query, queryParams);

            const countQuery = `
                SELECT COUNT(*) as total FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                WHERE ${whereBase}${whereSearch}
            `;
            const countParams = [idMinistere];
            if (searchPattern) countParams.push(searchPattern);
            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0] ? countResult.rows[0].total : 0, 10);

            console.log(`✅ ${result.rows.length} notes de service récupérées pour le ministère ${idMinistere} (total: ${total})`);

            // Éviter le cache navigateur pour que le filtre par ministère soit toujours respecté
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');

            // Formater les données
            const notesDeService = result.rows.map(row => ({
                document: {
                    id: row.id,
                    type_document: row.type_document,
                    titre: row.titre,
                    statut: row.statut,
                    date_generation: row.date_generation,
                    chemin_fichier: row.chemin_fichier,
                    numero_document: row.numero_document
                },
                agent: {
                    id: row.agent_id,
                    prenom: row.agent_prenom,
                    nom: row.agent_nom,
                    matricule: row.matricule,
                    date_de_naissance: row.date_de_naissance,
                    lieu_de_naissance: row.lieu_de_naissance,
                    sexe: row.sexe,
                    fonction_actuelle: row.fonction_actuelle,
                    civilite: row.civilite,
                    grade_libele: row.grade_libele,
                    echelon_libele: row.echelon_libele
                },
                service: {
                    nom: row.service_nom,
                    direction_nom: row.direction_nom,
                    direction_generale_nom: row.direction_generale_nom || null
                },
                ministere: {
                    nom: row.ministere_nom,
                    sigle: row.ministere_sigle
                },
                generateur: row.generateur_prenom && row.generateur_nom ? {
                    prenom: row.generateur_prenom,
                    nom: row.generateur_nom
                } : null
            }));

            res.json({
                success: true,
                data: notesDeService,
                count: notesDeService.length,
                pagination: {
                    page: pageParam,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération de toutes les notes de service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère la note de service d'un agent spécifique
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getNoteDeServiceByAgent(req, res) {
        try {
            const { agentId } = req.params;

            console.log(`📄 Récupération de la note de service pour l'agent ${agentId}...`);

            const query = `
                SELECT da.*, 
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                       a.date_de_naissance, a.lieu_de_naissance, a.sexe,
                       a.fonction_actuelle,
                       c.libele as civilite,
                       s.libelle as service_nom, s.libelle as direction_nom,
                       m.nom as ministere_nom, m.sigle as ministere_sigle,
                       generateur.prenom as generateur_prenom, 
                       generateur.nom as generateur_nom,
                       ga_actuelle.grade_libele as grade_libele,
                       ech_actuelle.echelon_libele as echelon_libele
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents generateur ON da.id_agent_generateur = generateur.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele AS echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE da.id_agent_destinataire = $1 
                AND da.type_document = 'note_de_service'
                ORDER BY da.date_generation DESC
                LIMIT 1
            `;

            const result = await db.query(query, [agentId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Note de service non trouvée pour cet agent'
                });
            }

            const document = result.rows[0];

            // Vérifier si le fichier PDF existe
            const fs = require('fs');
            const path = require('path');
            let pdfExists = false;
            let pdfPath = null;

            if (document.chemin_fichier) {
                const fullPath = path.join(__dirname, '../', document.chemin_fichier);
                pdfExists = fs.existsSync(fullPath);
                pdfPath = pdfExists ? document.chemin_fichier : null;
            }

            console.log(`✅ Note de service récupérée pour l'agent ${agentId}`);

            res.json({
                success: true,
                data: {
                    document: {
                        id: document.id,
                        type_document: document.type_document,
                        titre: document.titre,
                        statut: document.statut,
                        date_generation: document.date_generation,
                        chemin_fichier: document.chemin_fichier,
                        pdf_available: pdfExists,
                        pdf_path: pdfPath,
                        numero_document: document.numero_document
                    },
                    agent: {
                        id: document.id_agent_destinataire,
                        prenom: document.agent_prenom,
                        nom: document.agent_nom,
                        matricule: document.matricule,
                        date_de_naissance: document.date_de_naissance,
                        lieu_de_naissance: document.lieu_de_naissance,
                        sexe: document.sexe,
                        fonction_actuelle: document.fonction_actuelle,
                        civilite: document.civilite,
                        grade_libele: document.grade_libele,
                        echelon_libele: document.echelon_libele
                    },
                    service: {
                        nom: document.service_nom,
                        direction_nom: document.direction_nom
                    },
                    ministere: {
                        nom: document.ministere_nom,
                        sigle: document.ministere_sigle
                    },
                    generateur: document.generateur_prenom && document.generateur_nom ? {
                        prenom: document.generateur_prenom,
                        nom: document.generateur_nom
                    } : null
                }
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la note de service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Génère une note de service pour un agent
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async genererNoteDeService(req, res) {
        try {
            const { id_agent, date_effet, numero_document, cert_reference } = req.body;

            // Validation
            if (!id_agent) {
                return res.status(400).json({
                    success: false,
                    error: 'L\'ID de l\'agent est requis'
                });
            }

            // Récupérer les informations complètes de l'agent
            const agentQuery = `
                SELECT a.*, 
                       c.libele as civilite,
                       s.libelle as service_nom,
                       s.libelle as direction_nom,
                       d.libelle as direction_libelle,
                       m.nom as ministere_nom,
                       m.sigle as ministere_sigle,
                       cat.libele as classe_libelle,
                       COALESCE(a.date_embauche, a.date_prise_service_au_ministere) as grade_date_entree,
                       ga_actuelle.grade_libele as grade_libele,
                       ech_actuelle.echelon_libele as echelon_libele
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele AS echelon_libele
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
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

            // Récupérer les informations du validateur (DRH connecté)
            const validateurQuery = `
                SELECT a.*, 
                       c.libele as civilite,
                       s.libelle as direction_nom,
                       m.nom as ministere_nom,
                       m.sigle as ministere_sigle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id = $1
            `;

            const validateurResult = await db.query(validateurQuery, [req.user.id_agent]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            const validateur = validateurResult.rows[0];

            // S'assurer que le validateur a un ID (a.* devrait inclure id, mais vérifions)
            if (!validateur.id && !validateur.ID) {
                // Essayer avec ID en majuscules au cas où PostgreSQL retourne les colonnes différemment
                const idValue = validateur.id || validateur.ID || validateur.Id;
                if (!idValue) {
                    console.error('❌ [genererNoteDeService] Le validateur récupéré n\'a pas d\'ID:', {
                        keys: Object.keys(validateur),
                        validateur: validateur
                    });
                    return res.status(500).json({
                        success: false,
                        error: 'Erreur: le validateur n\'a pas d\'ID'
                    });
                }
                validateur.id = idValue;
            }

            console.log('🔍 [genererNoteDeService] Validateur récupéré:', {
                id: validateur.id,
                nom: validateur.nom,
                prenom: validateur.prenom,
                allKeys: Object.keys(validateur).slice(0, 10) // Premières 10 clés pour debug
            });

            // Utiliser la DRH comme signataire (signature, nom, "Le Directeur")
            const { fetchDRHForSignature, attachActiveSignature } = require('../services/utils/signatureUtils');
            const { hydrateAgentWithLatestFunction } = require('../services/utils/agentFunction');
            const drh = await fetchDRHForSignature(agent.id_direction, agent.id_ministere);
            if (drh) {
                Object.assign(validateur, drh);
                validateur.signatureRoleOverride = 'Le Directeur';
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);
            }

            // Préparer les options
            const options = {
                date_effet: date_effet || new Date(),
                date_generation: new Date(),
                numero_document: numero_document,
                cert_reference: cert_reference,
                date_echelon: agent.grade_date_entree
            };

            // Générer le PDF
            const PDFKitGenerationService = require('../services/PDFKitGenerationService');
            const pdfPath = await PDFKitGenerationService.generateNoteDeServicePDFAuto(agent, validateur, options);

            // Générer le contenu HTML
            const DocumentGenerationService = require('../services/DocumentGenerationService');
            const contenuHTML = DocumentGenerationService.generateNoteDeServiceHTML(agent, validateur, options);

            // Créer un document dans la base de données
            const documentInsertQuery = `
                INSERT INTO documents_autorisation (
                    type_document,
                    id_agent_destinataire,
                    id_agent_generateur,
                    titre,
                    date_generation,
                    chemin_fichier,
                    statut,
                    contenu,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            `;

            const documentResult = await db.query(documentInsertQuery, [
                'note_de_service',
                agent.id,
                validateur.id,
                `Note de Service - ${agent.prenom} ${agent.nom}`,
                new Date(),
                pdfPath,
                'generé',
                contenuHTML
            ]);

            const documentId = documentResult.rows[0].id;

            console.log(`✅ Note de service générée avec succès pour l'agent ${agent.id}`);

            // Retourner la réponse avec l'URL du PDF
            const baseUrl = req.protocol + '://' + req.get('host');
            const pdfUrl = `${baseUrl}/api/documents/${documentId}/pdf`;

            res.json({
                success: true,
                message: 'Note de service générée avec succès',
                document_id: documentId,
                pdf_url: pdfUrl
            });

        } catch (error) {
            console.error('❌ Erreur lors de la génération de la note de service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Récupère tous les certificats de prise de service avec pagination et recherche
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getAllCertificatsPriseService(req, res) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role ? req.user.role.toLowerCase() : '';
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const offset = (page - 1) * limit;

            console.log(`📄 Récupération des certificats de prise de service (page ${page}, limit ${limit}, search: "${search}")...`);

            // Récupérer le ministère du DRH pour filtrer
            let idMinistere = null;
            if (userRole === 'drh' && req.user.id_agent) {
                const agentQuery = `SELECT id_ministere FROM agents WHERE id = $1`;
                const agentResult = await db.query(agentQuery, [req.user.id_agent]);
                if (agentResult.rows.length > 0) {
                    idMinistere = agentResult.rows[0].id_ministere;
                }
            }

            // Construire la requête avec recherche et pagination
            let query = `
                SELECT 
                    da.*,
                    a.id as agent_id,
                    a.prenom as agent_prenom,
                    a.nom as agent_nom,
                    a.matricule as agent_matricule,
                    a.date_de_naissance,
                    a.lieu_de_naissance,
                    a.sexe,
                    a.fonction_actuelle,
                    c.libele as civilite,
                    s.libelle as service_nom,
                    s.libelle as direction_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    generateur.prenom as generateur_prenom,
                    generateur.nom as generateur_nom
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents generateur ON da.id_agent_generateur = generateur.id
                WHERE da.type_document = 'certificat_prise_service'
            `;

            const params = [];
            let paramIndex = 1;

            // Filtrer par ministère si DRH
            if (idMinistere) {
                query += ` AND a.id_ministere = $${paramIndex}`;
                params.push(idMinistere);
                paramIndex++;
            }

            // Recherche par nom, prénom ou matricule de l'agent
            if (search && search.trim()) {
                query += ` AND (
                    LOWER(a.prenom) LIKE $${paramIndex} OR
                    LOWER(a.nom) LIKE $${paramIndex} OR
                    LOWER(a.matricule) LIKE $${paramIndex} OR
                    LOWER(CONCAT(a.prenom, ' ', a.nom)) LIKE $${paramIndex}
                )`;
                params.push(`%${search.toLowerCase()}%`);
                paramIndex++;
            }

            // Compter le total avant pagination (mêmes conditions WHERE)
            let countQuery = `
                SELECT COUNT(*) as total
                FROM documents_autorisation da
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                WHERE da.type_document = 'certificat_prise_service'
            `;
            const countParams = [];
            let countParamIndex = 1;

            if (idMinistere) {
                countQuery += ` AND a.id_ministere = $${countParamIndex}`;
                countParams.push(idMinistere);
                countParamIndex++;
            }

            if (search && search.trim()) {
                countQuery += ` AND (
                    LOWER(a.prenom) LIKE $${countParamIndex} OR
                    LOWER(a.nom) LIKE $${countParamIndex} OR
                    LOWER(a.matricule) LIKE $${countParamIndex} OR
                    LOWER(CONCAT(a.prenom, ' ', a.nom)) LIKE $${countParamIndex}
                )`;
                countParams.push(`%${search.toLowerCase()}%`);
            }

            const countResult = await db.query(countQuery, countParams);
            const total = parseInt(countResult.rows[0].total);

            // Ajouter pagination et tri
            query += ` ORDER BY da.date_generation DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            // Formater les données
            const certificats = result.rows.map(row => ({
                id: row.id,
                type_document: row.type_document,
                titre: row.titre,
                statut: row.statut,
                date_generation: row.date_generation,
                chemin_fichier: row.chemin_fichier,
                numero_document: row.numero_document || null,
                agent: {
                    id: row.agent_id,
                    prenom: row.agent_prenom,
                    nom: row.agent_nom,
                    matricule: row.agent_matricule,
                    fonction_actuelle: row.fonction_actuelle
                },
                service: {
                    nom: row.service_nom,
                    direction_nom: row.direction_nom
                },
                ministere: {
                    nom: row.ministere_nom,
                    sigle: row.ministere_sigle
                },
                generateur: row.generateur_prenom && row.generateur_nom ? {
                    prenom: row.generateur_prenom,
                    nom: row.generateur_nom
                } : null
            }));

            res.json({
                success: true,
                data: certificats,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des certificats de prise de service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Génère un certificat de prise de service pour un agent
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async genererCertificatPriseService(req, res) {
        try {
            const { id_agent, date_prise_service } = req.body;

            console.log('📥 Requête de génération de certificat de prise de service:', {
                id_agent,
                date_prise_service,
                type_date: typeof date_prise_service
            });

            // Validation
            if (!id_agent) {
                return res.status(400).json({
                    success: false,
                    error: 'L\'ID de l\'agent est requis'
                });
            }

            if (!date_prise_service || (typeof date_prise_service === 'string' && !date_prise_service.trim())) {
                return res.status(400).json({
                    success: false,
                    error: 'La date de prise de service est obligatoire'
                });
            }

            // Vérifier que l'utilisateur est directeur ou DRH
            const userRole = req.user ? req.user.role ? req.user.role.toLowerCase() : '' : '';
            if (!['directeur', 'drh', 'super_admin'].includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Seuls les directeurs et DRH peuvent générer un certificat de prise de service'
                });
            }

            // Récupérer les informations complètes de l'agent
            const agentQuery = `
                SELECT a.*, 
                       c.libele as civilite,
                       s.libelle as service_nom,
                       s.libelle as direction_nom,
                       d.libelle as direction_libelle,
                       m.nom as ministere_nom,
                       m.sigle as ministere_sigle,
                       cat.libele as classe_libelle,
                       COALESCE(a.date_embauche, a.date_prise_service_au_ministere) as grade_date_entree,
                       ga_actuelle.grade_libele as grade_libele,
                       ech_actuelle.echelon_libelle as echelon_libelle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN directions d ON a.id_direction = d.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele AS grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele AS echelon_libelle
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                WHERE a.id = $1
            `;

            const agentResult = await db.query(agentQuery, [id_agent]);

            if (agentResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            let agent = agentResult.rows[0];

            // Vérifier que l'agent appartient à la direction du directeur connecté
            if (userRole === 'directeur' && req.user.id_agent) {
                const directeurQuery = `
                    SELECT id_direction FROM agents WHERE id = $1
                `;
                const directeurResult = await db.query(directeurQuery, [req.user.id_agent]);
                if (directeurResult.rows.length > 0) {
                    const directeurDirectionId = directeurResult.rows[0].id_direction;
                    if (agent.id_direction !== directeurDirectionId) {
                        return res.status(403).json({
                            success: false,
                            error: 'Vous ne pouvez générer un certificat de prise de service que pour les agents de votre direction'
                        });
                    }
                }
            }

            // Récupérer les informations du validateur (Directeur/DRH connecté)
            const validateurQuery = `
                SELECT a.*, 
                       c.libele as civilite,
                       s.libelle as direction_nom,
                       m.nom as ministere_nom,
                       m.sigle as ministere_sigle
                FROM agents a
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id = $1
            `;

            const validateurResult = await db.query(validateurQuery, [req.user.id_agent]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur non trouvé'
                });
            }

            let validateur = validateurResult.rows[0];

            // Pour le certificat de prise de service : utiliser la signature du directeur qui génère
            // (pas la DRH comme pour les autres documents)
            // Si c'est un directeur, utiliser sa propre signature
            // Si c'est la DRH, utiliser la signature de la DRH
            const { attachActiveSignature } = require('../services/utils/signatureUtils');
            const { hydrateAgentWithLatestFunction } = require('../services/utils/agentFunction');

            // Attacher la signature active du validateur (directeur ou DRH)
            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Pour le certificat de prise de service, on utilise directement le validateur (directeur ou DRH)
            // avec sa propre signature, pas besoin de remplacer par la DRH

            // Si une date de prise de service est fournie, mettre à jour la date_prise_service_dans_la_direction dans la base de données
            let datePriseServiceFinale = null;
            if (date_prise_service) {
                try {
                    console.log('📅 Traitement de la date fournie:', {
                        date_brute: date_prise_service,
                        type: typeof date_prise_service
                    });

                    // Convertir la date en format Date si c'est une chaîne
                    // Les dates HTML sont au format YYYY-MM-DD
                    let dateValue;
                    if (date_prise_service instanceof Date) {
                        dateValue = date_prise_service;
                    } else if (typeof date_prise_service === 'string') {
                        // Pour PostgreSQL, on peut utiliser directement la chaîne au format YYYY-MM-DD
                        // Mais on convertit quand même pour valider
                        dateValue = new Date(date_prise_service);
                    } else {
                        dateValue = new Date(date_prise_service);
                    }

                    // Vérifier que la date est valide
                    if (isNaN(dateValue.getTime())) {
                        console.error('❌ Date de prise de service invalide:', date_prise_service);
                    } else {
                        // Utiliser la chaîne originale pour PostgreSQL (format YYYY-MM-DD)
                        // ou formater la date correctement
                        const dateForDB = typeof date_prise_service === 'string' ?
                            date_prise_service :
                            dateValue.toISOString().split('T')[0];

                        console.log('💾 Mise à jour de la base de données avec la date:', dateForDB);

                        const updateDateQuery = `
                            UPDATE agents 
                            SET date_prise_service_dans_la_direction = $1::DATE, updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                            RETURNING date_prise_service_dans_la_direction
                        `;
                        const updateResult = await db.query(updateDateQuery, [dateForDB, id_agent]);

                        const dateEnregistree = updateResult.rows[0] ? updateResult.rows[0].date_prise_service_dans_la_direction : undefined;
                        console.log('✅ Date de prise de service dans la direction mise à jour:', {
                            agent_id: id_agent,
                            date_enregistree: dateEnregistree,
                            date_originale: date_prise_service,
                            date_for_db: dateForDB
                        });

                        // Stocker la date finale pour l'utiliser dans les options
                        // Utiliser la date convertie (dateValue) qui est un objet Date valide
                        datePriseServiceFinale = dateValue;

                        // Récupérer à nouveau l'agent pour avoir la date mise à jour
                        const updatedAgentResult = await db.query(agentQuery, [id_agent]);
                        if (updatedAgentResult.rows.length > 0) {
                            agent = updatedAgentResult.rows[0];
                            console.log('🔄 Agent récupéré après mise à jour:', {
                                date_prise_service_dans_la_direction: agent.date_prise_service_dans_la_direction,
                                type_date: typeof agent.date_prise_service_dans_la_direction
                            });

                            // S'assurer que la date récupérée est bien utilisée
                            // Si la date récupérée existe, l'utiliser pour datePriseServiceFinale
                            if (agent.date_prise_service_dans_la_direction) {
                                const dateFromDB = new Date(agent.date_prise_service_dans_la_direction);
                                if (!isNaN(dateFromDB.getTime())) {
                                    datePriseServiceFinale = dateFromDB;
                                    console.log('✅ Date finale mise à jour depuis la base de données:', datePriseServiceFinale);
                                }
                            }
                        }
                    }
                } catch (updateError) {
                    console.error('❌ Erreur lors de la mise à jour de la date de prise de service dans la direction:', updateError);
                    console.error('Détails de l\'erreur:', updateError.stack);
                    // Continuer quand même la génération du document même si la mise à jour échoue
                }
            } else {
                console.log('⚠️ Aucune date de prise de service fournie dans la requête');
            }

            // Préparer les options
            // Priorité ABSOLUE: date_prise_service fournie (convertie) > date_prise_service_dans_la_direction (mise à jour) > date_embauche > date_prise_service > date actuelle
            // IMPORTANT: Si une date a été fournie, elle DOIT être utilisée en priorité absolue
            // PRIORITÉ ABSOLUE: Si une date a été fournie, elle DOIT être utilisée
            // Vérifier d'abord datePriseServiceFinale (date fournie et convertie)
            // Puis vérifier agent.date_prise_service_dans_la_direction (date récupérée de la BD après mise à jour)
            // Puis vérifier date_prise_service (date fournie dans la requête)
            let dateFinale = null;

            // 1. Priorité absolue: datePriseServiceFinale (date fournie et convertie)
            if (datePriseServiceFinale) {
                dateFinale = datePriseServiceFinale;
                console.log('✅ [PRIORITÉ 1] Utilisation de la date fournie (datePriseServiceFinale):', dateFinale, dateFinale.toISOString());
            }
            // 2. Si datePriseServiceFinale n'existe pas mais qu'une date a été fournie, utiliser agent.date_prise_service_dans_la_direction (récupérée après mise à jour)
            else if (date_prise_service && agent.date_prise_service_dans_la_direction) {
                // La date a été fournie et mise à jour dans la BD, utiliser celle de la BD
                dateFinale = agent.date_prise_service_dans_la_direction instanceof Date ?
                    agent.date_prise_service_dans_la_direction :
                    new Date(agent.date_prise_service_dans_la_direction);
                if (!isNaN(dateFinale.getTime())) {
                    console.log('✅ [PRIORITÉ 2] Utilisation de date_prise_service_dans_la_direction récupérée de la BD:', dateFinale, dateFinale.toISOString());
                } else {
                    dateFinale = null;
                }
            }
            // 3. Si date_prise_service existe mais n'a pas été convertie, la convertir maintenant
            else if (date_prise_service) {
                dateFinale = date_prise_service instanceof Date ?
                    date_prise_service :
                    new Date(date_prise_service);
                // Vérifier que la date est valide
                if (isNaN(dateFinale.getTime())) {
                    console.error('❌ Date fournie invalide après conversion:', date_prise_service);
                    dateFinale = null;
                } else {
                    console.log('✅ [PRIORITÉ 3] Date fournie convertie:', dateFinale, dateFinale.toISOString());
                }
            }

            // Si aucune date fournie, utiliser les valeurs de l'agent
            if (!dateFinale) {
                if (agent.date_prise_service_dans_la_direction) {
                    dateFinale = agent.date_prise_service_dans_la_direction instanceof Date ?
                        agent.date_prise_service_dans_la_direction :
                        new Date(agent.date_prise_service_dans_la_direction);
                    if (!isNaN(dateFinale.getTime())) {
                        console.log('✅ [PRIORITÉ 4] Utilisation de date_prise_service_dans_la_direction de l\'agent:', dateFinale, dateFinale.toISOString());
                    } else {
                        dateFinale = null;
                    }
                }

                if (!dateFinale && agent.date_embauche) {
                    dateFinale = agent.date_embauche instanceof Date ?
                        agent.date_embauche :
                        new Date(agent.date_embauche);
                    if (!isNaN(dateFinale.getTime())) {
                        console.log('✅ [PRIORITÉ 5] Utilisation de date_embauche de l\'agent:', dateFinale, dateFinale.toISOString());
                    } else {
                        dateFinale = null;
                    }
                }

                if (!dateFinale && agent.date_prise_service) {
                    dateFinale = agent.date_prise_service instanceof Date ?
                        agent.date_prise_service :
                        new Date(agent.date_prise_service);
                    if (!isNaN(dateFinale.getTime())) {
                        console.log('✅ [PRIORITÉ 6] Utilisation de date_prise_service de l\'agent:', dateFinale, dateFinale.toISOString());
                    } else {
                        dateFinale = null;
                    }
                }

                if (!dateFinale) {
                    dateFinale = new Date();
                    console.log('⚠️ [DERNIER RECOURS] Aucune date disponible, utilisation de la date actuelle:', dateFinale, dateFinale.toISOString());
                }
            }

            // S'assurer que dateFinale est un objet Date valide
            if (!(dateFinale instanceof Date) || isNaN(dateFinale.getTime())) {
                console.error('❌ Date finale invalide, utilisation de la date actuelle');
                dateFinale = new Date();
            }

            const options = {
                date_prise_service: dateFinale
            };

            console.log('📅 ===== DATE DE PRISE DE SERVICE FINALE POUR GÉNÉRATION =====');
            console.log('📅 Date fournie brute:', date_prise_service);
            console.log('📅 Date fournie convertie (datePriseServiceFinale):', datePriseServiceFinale);
            console.log('📅 Date dans la direction (agent):', agent.date_prise_service_dans_la_direction);
            console.log('📅 Date embauche (agent):', agent.date_embauche);
            console.log('📅 Date prise service (agent):', agent.date_prise_service);
            console.log('📅 DATE FINALE UTILISÉE:', options.date_prise_service);
            console.log('📅 DATE FINALE ISO:', options.date_prise_service.toISOString());
            console.log('📅 DATE FINALE FORMATÉE:', options.date_prise_service.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
            console.log('📅 ============================================================');

            // Générer le document
            const DocumentGenerationService = require('../services/DocumentGenerationService');
            const result = await DocumentGenerationService.generateCertificatPriseService(agent, validateur, options);

            console.log(`✅ Certificat de prise de service généré avec succès pour l'agent ${agent.id}`);

            // Retourner la réponse avec l'URL du PDF
            const baseUrl = req.protocol + '://' + req.get('host');
            const pdfUrl = `${baseUrl}/api/documents/${result.id}/pdf`;

            res.json({
                success: true,
                message: 'Certificat de prise de service généré avec succès',
                document_id: result.id,
                pdf_url: pdfUrl
            });

        } catch (error) {
            console.error('❌ Erreur lors de la génération du certificat de prise de service:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }

    /**
     * Créer directement une mutation par la DRH (sans passer par le workflow de demande)
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async creerMutationDirecte(req, res) {
        try {
            const { id_agent, id_direction_generale, id_direction_destination, id_sous_direction, date_effet, motif, type_mutation, retirer_service } = req.body;
            const validateurId = req.user.id_agent;

            // Vérifications
            if (!id_agent) {
                return res.status(400).json({
                    success: false,
                    error: 'ID agent est requis'
                });
            }

            if (!date_effet) {
                return res.status(400).json({
                    success: false,
                    error: 'Date d\'effet est requise'
                });
            }

            // Déterminer le type de mutation (par défaut: mutation complète)
            const mutationType = type_mutation || 'complete';

            // Vérifier que l'utilisateur est DRH
            const userRoleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id = $1
            `;
            const userRoleResult = await db.query(userRoleQuery, [req.user.id]);
            const userRole = (userRoleResult.rows[0] && userRoleResult.rows[0].role_nom) || '';

            if (userRole.toLowerCase() !== 'drh') {
                return res.status(403).json({
                    success: false,
                    error: 'Seul le DRH peut créer directement une mutation'
                });
            }

            // Récupérer les informations de l'agent avec grade et échelon
            const agentQuery = `
                SELECT 
                    a.*,
                    s.libelle as service_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    cat.libele as categorie_libele,
                    -- Fonction actuelle depuis fonction_agents
                    fa_actuelle.fonction_libele as fonction_actuelle_libele,
                    fa_actuelle.fonction_libele as fonction_libele,
                    -- Emploi actuel depuis emploi_agents
                    ea_actuel.emploi_libele as emploi_actuel_libele,
                    ea_actuel.emploi_libele as emploi_libele,
                    -- Grade actuel depuis grades_agents
                    ga_actuelle.grade_libele as grade_libele,
                    -- Échelon actuel depuis echelons_agents
                    ech_actuelle.echelon_libelle as echelon_libelle
                FROM agents a
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                -- Fonction actuelle depuis fonction_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) 
                        fa.id_agent,
                        f.libele as fonction_libele,
                        fa.date_entree
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuelle ON a.id = fa_actuelle.id_agent
                -- Emploi actuel depuis emploi_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) 
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.date_entree
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                -- Grade actuel depuis grades_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                -- Échelon actuel depuis echelons_agents
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libelle
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
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
            let directionDestination = null;
            let id_direction_finale = null;

            // Gérer selon le type de mutation
            if (mutationType === 'retirer_service') {
                // Retirer du service : garder la direction actuelle
                id_direction_finale = agent.id_direction;
                if (id_direction_finale) {
                    const directionQuery = `SELECT id, libelle FROM directions WHERE id = $1`;
                    const directionResult = await db.query(directionQuery, [id_direction_finale]);
                    if (directionResult.rows.length > 0) {
                        directionDestination = directionResult.rows[0];
                    }
                }
            } else if (mutationType === 'sous_direction') {
                // Mutation de sous-direction uniquement : garder la direction actuelle
                if (!agent.id_direction) {
                    return res.status(400).json({
                        success: false,
                        error: 'L\'agent n\'a pas de direction actuelle pour effectuer une mutation de sous-direction'
                    });
                }
                if (!id_sous_direction) {
                    return res.status(400).json({
                        success: false,
                        error: 'Sous-direction de destination est requise pour une mutation de sous-direction'
                    });
                }
                id_direction_finale = agent.id_direction;
                const directionQuery = `SELECT id, libelle FROM directions WHERE id = $1`;
                const directionResult = await db.query(directionQuery, [id_direction_finale]);
                if (directionResult.rows.length > 0) {
                    directionDestination = directionResult.rows[0];
                } else {
                    return res.status(404).json({
                        success: false,
                        error: 'Direction actuelle de l\'agent non trouvée'
                    });
                }
            } else {
                // Mutation complète : changer de direction
                if (!id_direction_destination) {
                    return res.status(400).json({
                        success: false,
                        error: 'Direction de destination est requise pour une mutation complète'
                    });
                }
                const directionQuery = `SELECT id, libelle FROM directions WHERE id = $1`;
                const directionResult = await db.query(directionQuery, [id_direction_destination]);

                if (directionResult.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Direction de destination non trouvée'
                    });
                }

                directionDestination = directionResult.rows[0];
                id_direction_finale = parseInt(id_direction_destination);

                // Vérifier que l'agent n'est pas déjà dans cette direction
                if (agent.id_direction === id_direction_finale) {
                    return res.status(400).json({
                        success: false,
                        error: 'L\'agent est déjà dans cette direction'
                    });
                }
            }

            // Récupérer les informations du validateur (DRH)
            const validateurQuery = `
                SELECT 
                    a.*,
                    s.libelle as service_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle
                FROM agents a
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                WHERE a.id = $1
            `;
            const validateurResult = await db.query(validateurQuery, [validateurId]);

            if (validateurResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Validateur (DRH) non trouvé'
                });
            }

            const validateur = validateurResult.rows[0];

            // Créer une demande de mutation avec statut directement finalisé (pour bypass workflow)
            const demandeQuery = `
                INSERT INTO demandes (
                    id_agent, type_demande, description, date_debut, priorite, 
                    status, niveau_evolution_demande, niveau_actuel, phase,
                    created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `;

            // Récupérer les informations de direction générale et sous-direction si fournies
            let directionGeneraleLibelle = null;
            if (id_direction_generale) {
                const dgQuery = `SELECT libelle FROM direction_generale WHERE id = $1`;
                const dgResult = await db.query(dgQuery, [id_direction_generale]);
                if (dgResult.rows.length > 0) {
                    directionGeneraleLibelle = dgResult.rows[0].libelle;
                }
            }

            let sousDirectionLibelle = null;
            if (id_sous_direction) {
                const sdQuery = `SELECT libelle FROM sous_directions WHERE id = $1`;
                const sdResult = await db.query(sdQuery, [id_sous_direction]);
                if (sdResult.rows.length > 0) {
                    sousDirectionLibelle = sdResult.rows[0].libelle;
                }
            }

            const mutationData = {
                type_mutation: mutationType,
                id_direction_generale: id_direction_generale ? parseInt(id_direction_generale) : null,
                direction_generale: directionGeneraleLibelle,
                id_direction_destination: id_direction_finale,
                direction_destination: directionDestination ? directionDestination.libelle : null,
                id_sous_direction: id_sous_direction ? parseInt(id_sous_direction) : null,
                sous_direction: sousDirectionLibelle,
                date_effet: date_effet,
                motif: motif || 'Mutation faite par DRH',
                retirer_service: mutationType === 'retirer_service'
            };
            const descriptionFinale = `MUTATION_DATA:${JSON.stringify(mutationData)}`;

            const demandeResult = await db.query(demandeQuery, [
                id_agent,
                'mutation',
                descriptionFinale,
                date_effet,
                'normale',
                'approuve', // Statut directement approuvé
                'valide_par_drh', // Niveau directement validé par DRH
                'finalise',
                'retour',
                req.user.id
            ]);

            const demandeId = demandeResult.rows[0].id;

            // Générer le document de mutation UNIQUEMENT pour les mutations complètes
            let documentGenerated = null;
            if (mutationType === 'complete') {
                const DocumentGenerationService = require('../services/DocumentGenerationService');
                documentGenerated = await DocumentGenerationService.generateMutation({ id: demandeId, description: descriptionFinale, date_debut: date_effet },
                    agent,
                    validateur, {
                        type_mutation: mutationType,
                        id_direction_generale: id_direction_generale ? parseInt(id_direction_generale) : null,
                        direction_generale: directionGeneraleLibelle,
                        id_direction_destination: id_direction_finale,
                        direction_destination: directionDestination ? directionDestination.libelle : null,
                        id_sous_direction: id_sous_direction ? parseInt(id_sous_direction) : null,
                        sous_direction: sousDirectionLibelle,
                        date_effet: date_effet,
                        motif: motif || null,
                        retirer_service: false
                    }
                );
            }

            // Mettre à jour l'agent selon le type de mutation
            const updateFields = ['updated_at = CURRENT_TIMESTAMP'];
            const updateValues = [];
            let paramIndex = 1;

            if (mutationType === 'retirer_service') {
                // Retirer du service : mettre id_service à NULL, garder direction et sous-direction
                updateFields.push(`id_service = $${paramIndex}`);
                updateValues.push(null);
                paramIndex++;
            } else if (mutationType === 'sous_direction') {
                // Mutation de sous-direction : garder la direction, changer seulement la sous-direction
                if (id_sous_direction) {
                    updateFields.push(`id_sous_direction = $${paramIndex}`);
                    updateValues.push(parseInt(id_sous_direction));
                    paramIndex++;
                } else {
                    updateFields.push('id_sous_direction = NULL');
                }
            } else {
                // Mutation complète : changer la direction et optionnellement la sous-direction
                updateFields.push(`id_direction = $${paramIndex}`);
                updateValues.push(id_direction_finale);
                paramIndex++;

                if (id_sous_direction) {
                    updateFields.push(`id_sous_direction = $${paramIndex}`);
                    updateValues.push(parseInt(id_sous_direction));
                    paramIndex++;
                } else {
                    updateFields.push('id_sous_direction = NULL');
                }

                // Si la table agents a un champ id_direction_generale, l'inclure aussi
                if (id_direction_generale) {
                    updateFields.push(`id_direction_generale = $${paramIndex}`);
                    updateValues.push(parseInt(id_direction_generale));
                    paramIndex++;
                }
            }

            updateValues.push(id_agent);
            const updateQuery = `UPDATE agents SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;
            await db.query(updateQuery, updateValues);

            // Créer une notification pour l'agent
            const notificationQuery = `
                INSERT INTO notifications_demandes (
                    id_demande, id_agent_destinataire, type_notification, titre, message, lu, date_creation
                ) VALUES ($1, $2, $3, $4, $5, FALSE, CURRENT_TIMESTAMP)
            `;

            // Message de notification selon le type de mutation
            let notificationMessage = '';
            if (mutationType === 'retirer_service') {
                notificationMessage = `Vous avez été retiré(e) de votre service avec effet au ${new Date(date_effet).toLocaleDateString('fr-FR')}.`;
            } else if (mutationType === 'sous_direction') {
                const sousDirText = sousDirectionLibelle || 'nouvelle sous-direction';
                notificationMessage = `Vous avez été muté(e) vers la ${sousDirText} (direction: ${directionDestination ? directionDestination.libelle : 'Non spécifiée'}) avec effet au ${new Date(date_effet).toLocaleDateString('fr-FR')}.`;
            } else {
                notificationMessage = `Vous avez été muté(e) vers la ${directionDestination ? directionDestination.libelle : 'nouvelle direction'} avec effet au ${new Date(date_effet).toLocaleDateString('fr-FR')}. Une note de service a été générée et est disponible dans vos documents.`;
            }

            await db.query(notificationQuery, [
                demandeId,
                id_agent,
                'demande_finalisee',
                'Mutation effectuée par le DRH',
                notificationMessage
            ]);

            const logMessage = mutationType === 'retirer_service' ?
                `✅ Agent ${id_agent} retiré du service avec succès` :
                mutationType === 'sous_direction' ?
                `✅ Mutation de sous-direction créée avec succès pour l'agent ${id_agent} vers ${sousDirectionLibelle || 'nouvelle sous-direction'}` :
                `✅ Mutation directe créée avec succès pour l'agent ${id_agent} vers ${directionDestination ? directionDestination.libelle : 'nouvelle direction'}`;
            console.log(logMessage);

            const successMessage = mutationType === 'retirer_service' ?
                'Agent retiré du service avec succès' :
                mutationType === 'sous_direction' ?
                'Mutation de sous-direction créée avec succès' :
                'Mutation créée avec succès et note de service générée';

            const responseData = {
                demande_id: demandeId,
                agent: {
                    id: agent.id,
                    nom: agent.nom,
                    prenom: agent.prenom,
                    matricule: agent.matricule
                },
                type_mutation: mutationType,
                direction_destination: directionDestination ? directionDestination.libelle : null,
                sous_direction: sousDirectionLibelle || null,
                date_effet: date_effet
            };

            // Ajouter document_id uniquement si un document a été généré
            if (documentGenerated) {
                responseData.document_id = documentGenerated.id;
            }

            res.json({
                success: true,
                message: successMessage,
                data: responseData
            });

        } catch (error) {
            console.error('❌ Erreur lors de la création de la mutation directe:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur',
                details: error.message
            });
        }
    }
}

module.exports = DocumentsController;