const express = require('express');
const router = express.Router();
const DocumentsController = require('../controllers/DocumentsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');
const db = require('../config/database');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh', 'directeur', 'directeur_central', 'directeur_general', 'chef_cabinet', 'dir_cabinet']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour la gestion des documents

// Transmettre un document à un agent (chef de service)
router.post('/:id/transmit', requireRoleOrAssigned, DocumentsController.transmitDocument);

// Finaliser la réception d'un document (agent)
router.post('/:id/finalize', requireRoleOrAssigned, DocumentsController.finalizeDocumentReception);

// Récupérer les documents d'un agent (utilisateur connecté)
router.get('/agent', requireRoleOrAssigned, DocumentsController.getAgentDocuments);

// Récupérer les documents d'un agent spécifique (avec paramètre dans l'URL)
router.get('/agent/:agentId', requireRoleOrAssigned, DocumentsController.getAgentDocumentsById);

// Récupérer les documents pour un validateur (DRH, chef de service)
router.get('/validateur/:validateurId', requireRoleOrAssigned, DocumentsController.getValidatorDocuments);

// Récupérer les documents par ID de demande
router.get('/demande/:demandeId', requireRoleOrAssigned, DocumentsController.getDocumentsByDemandeId);

// Récupérer toutes les notes de service (pour DRH)
router.get('/notes-de-service', requireRoleOrAssigned, DocumentsController.getAllNotesDeService);

// Récupérer la note de service d'un agent spécifique
router.get('/agent/:agentId/note-de-service', requireRoleOrAssigned, DocumentsController.getNoteDeServiceByAgent);

// Récupérer tous les certificats de prise de service avec pagination et recherche (pour DRH)
router.get('/certificats-prise-service', requireRoleOrAssigned, DocumentsController.getAllCertificatsPriseService);

// Récupérer les détails d'un document spécifique
router.get('/:documentId', requireRoleOrAssigned, DocumentsController.getDocumentById);

// Middleware personnalisé pour permettre aux agents de consulter leurs propres documents
// et aux directeurs de consulter les documents qu'ils ont générés pour les agents de leur direction
const requireRoleOrAssignedOrOwnDocument = async(req, res, next) => {
    // Vérifier d'abord si l'utilisateur a les permissions standard
    const userRole = req.user ? req.user.role ? req.user.role.toLowerCase() : '' : '';
    const allowedRoles = ['super_admin', 'drh', 'directeur', 'directeur_central', 'directeur_general', 'chef_cabinet', 'dir_cabinet'];

    if (userRole && allowedRoles.includes(userRole)) {
        // Pour les directeurs et rôles similaires, vérifier qu'ils ont généré le document ou que l'agent destinataire est de leur direction
        if ((userRole === 'directeur' || userRole === 'directeur_central' || userRole === 'directeur_general' ||
                userRole === 'chef_cabinet' || userRole === 'dir_cabinet') && req.user && req.user.id_agent) {
            try {
                const documentId = req.params.documentId;

                if (documentId) {
                    // Vérifier si le document a été généré par le directeur OU si l'agent destinataire est de sa direction
                    const documentQuery = `
                        SELECT da.id_agent_generateur, da.id_agent_destinataire, a.id_direction as agent_direction
                        FROM documents_autorisation da
                        LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                        WHERE da.id = $1
                    `;
                    const documentResult = await db.query(documentQuery, [documentId]);

                    if (documentResult.rows.length > 0) {
                        const document = documentResult.rows[0];

                        // Si le document a été généré par le directeur/rôle similaire, autoriser
                        if (document.id_agent_generateur === req.user.id_agent) {
                            console.log(`✅ ${userRole} ${req.user.id_agent} accède au document ${documentId} qu'il a généré`);
                            return next();
                        }

                        // Sinon, vérifier si l'agent destinataire est de la direction du directeur/rôle similaire
                        const directeurQuery = `
                            SELECT id_direction FROM agents WHERE id = $1
                        `;
                        const directeurResult = await db.query(directeurQuery, [req.user.id_agent]);

                        if (directeurResult.rows.length > 0 && directeurResult.rows[0].id_direction) {
                            const directeurDirection = directeurResult.rows[0].id_direction;

                            if (document.agent_direction === directeurDirection) {
                                console.log(`✅ ${userRole} ${req.user.id_agent} accède au document ${documentId} d'un agent de sa direction`);
                                return next();
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la vérification d\'accès du directeur au document:', error);
            }
        } else {
            // Pour super_admin et drh, autoriser directement
            return next();
        }
    }

    // Si l'utilisateur n'a pas les permissions standard, vérifier si c'est son propre document
    if (req.user && req.user.id_agent) {
        try {
            const documentId = req.params.documentId;

            if (documentId) {
                // Vérifier si le document appartient à l'agent
                const result = await db.query(
                    'SELECT id_agent_destinataire FROM documents_autorisation WHERE id = $1', [documentId]
                );

                if (result.rows.length > 0 && result.rows[0].id_agent_destinataire === req.user.id_agent) {
                    // L'agent consulte son propre document, autoriser l'accès
                    console.log(`✅ Agent ${req.user.id_agent} accède à son propre document ${documentId}`);
                    return next();
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de propriété du document:', error);
        }
    }

    // Si aucune condition n'est remplie, vérifier la route assignée (comportement par défaut)
    const standardCheck = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh', 'directeur']);
    return standardCheck(req, res, next);
};

// Récupérer le contenu HTML d'un document spécifique
router.get('/:documentId/html', requireRoleOrAssignedOrOwnDocument, DocumentsController.getDocumentHTML);

// Télécharger le PDF d'un document spécifique
router.get('/:documentId/pdf', requireRoleOrAssignedOrOwnDocument, DocumentsController.getDocumentPDF);

// Générer un certificat de cessation de service
router.post('/generer-certificat-cessation', requireRoleOrAssigned, DocumentsController.genererCertificatCessation);

// Générer une note de service
router.post('/generer-note-de-service', requireRoleOrAssigned, DocumentsController.genererNoteDeService);

// Générer un certificat de prise de service
router.post('/generer-certificat-prise-service', requireRoleOrAssigned, DocumentsController.genererCertificatPriseService);

// Créer directement une mutation (DRH uniquement)
router.post('/creer-mutation-directe', requireRoleOrAssigned, DocumentsController.creerMutationDirecte);

module.exports = router;