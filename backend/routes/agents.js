const express = require('express');
const router = express.Router();
const AgentsController = require('../controllers/AgentsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');
const { uploadAgentFiles, upload, uploadAgentDocuments } = require('../middleware/upload');

const agentsController = new AgentsController();

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
// directeur_service_exterieur = directeur d'une direction (ex. services extérieurs), même niveau qu'un directeur
// Le rôle "ministre" doit pouvoir accéder aux statistiques globales et aux rapports sur les agents.
const requireRoleOrAssigned = requireRoleOrAssignedRoute([
    'super_admin',
    'DRH',
    'drh',
    'directeur',
    'directeur_service_exterieur',
    'directeur_central',
    'directeur_general',
    'chef_cabinet',
    'dir_cabinet',
    'sous_directeur',
    'sous-directeur',
    'inspecteur_general',
    'ministre',
    'gestionnaire_du_patrimoine',
    'president_du_fond',
    'responsble_cellule_de_passation'
]);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ========================================
// ROUTES SANS PARAMÈTRES (doivent être EN PREMIER)
// ========================================

// Récupérer tous les agents avec pagination et recherche
router.get('/', requireRoleOrAssigned, agentsController.getAll.bind(agentsController));

// Créer un nouvel agent
router.post('/', requireRoleOrAssigned, uploadAgentFiles, agentsController.create.bind(agentsController));

// ========================================
// ROUTES SPÉCIFIQUES (avant /:id)
// ========================================

// Recherche avancée d'agents
router.get('/search/advanced', requireRoleOrAssigned, agentsController.searchAdvanced.bind(agentsController));

// Statistiques des agents
router.get('/stats/overview', requireRoleOrAssigned, agentsController.getStats.bind(agentsController));
router.get('/stats/by-type', requireRoleOrAssigned, agentsController.getStatsByType.bind(agentsController));
router.get('/stats/by-direction', requireRoleOrAssigned, agentsController.getStatsByDirection.bind(agentsController));
router.get('/stats/by-service', requireRoleOrAssigned, agentsController.getStatsByService.bind(agentsController));
router.get('/stats/by-organization', requireRoleOrAssigned, agentsController.getStatsByOrganization.bind(agentsController));

// Rapport hiérarchique
router.get('/hierarchical-report', requireRoleOrAssigned, agentsController.getHierarchicalReport.bind(agentsController));

// Anniversaires à venir
router.get('/upcoming-birthdays', requireRoleOrAssigned, agentsController.getUpcomingBirthdays.bind(agentsController));

// Envoyer un message aux agents concernés par les anniversaires
router.post('/birthdays/send-message', requireRoleOrAssigned, agentsController.sendBirthdayMessage.bind(agentsController));

// Statistiques des retraites
router.get('/retirement-stats', requireRoleOrAssigned, agentsController.getRetirementStats.bind(agentsController));

// Projection/Estimation des retraites sur une période
router.get('/retirement-projection', requireRoleOrAssigned, agentsController.getRetirementProjection.bind(agentsController));

// Calcul en masse des dates de retraite
router.post('/batch-calculate-retirement', requireRoleOrAssigned, agentsController.batchCalculateRetirement.bind(agentsController));

// Récupérer les agents retirés (pour l'historique) - DOIT être avant /:id
router.get('/retired', requireRoleOrAssigned, agentsController.getRetiredAgents.bind(agentsController));

// Récupérer les agents à la retraite (date de retraite atteinte) - DOIT être avant /:id
router.get('/retired-by-retirement', requireRoleOrAssigned, agentsController.getRetiredByRetirement.bind(agentsController));

// Vérifier les agents déjà à la retraite selon les conditions (grade + date de naissance)
router.get('/check-already-retired', requireRoleOrAssigned, agentsController.checkAgentsAlreadyRetired.bind(agentsController));

// Récupérer l'historique des retraits et restaurations d'un agent - DOIT être avant /:id
router.get('/:id/historique-retrait-restauration', requireRoleOrAssigned, agentsController.getHistoriqueRetraitRestauration.bind(agentsController));

// Diagnostic : Comprendre pourquoi des agents apparaissent dans la liste "Agents à la Retraite"
router.get('/diagnose-retired', requireRoleOrAssigned, agentsController.diagnoseRetiredAgents.bind(agentsController));

// ========================================
// ROUTES AVEC PARAMÈTRE :id (doivent être EN DERNIER)
// ========================================

// Fiche signalétique - PDF (AVANT /:id car plus spécifique)
router.get('/:id/fiche-signaletique/pdf', requireRoleOrAssigned, agentsController.generateFicheSignaletiquePDF.bind(agentsController));

// Route de test sans authentification pour diagnostiquer
router.get('/:id/fiche-signaletique/pdf-test', agentsController.generateFicheSignaletiquePDF.bind(agentsController));

// Calculer la date de retraite d'un agent spécifique
router.get('/:id/calculate-retirement', requireRoleOrAssigned, agentsController.calculateAgentRetirement.bind(agentsController));

// Prolonger la date de retraite d'un agent spécifique
// Utiliser upload.single('file') pour gérer l'upload de fichier optionnel
router.patch('/:id/extend-retirement', requireRoleOrAssigned, upload.single('file'), agentsController.extendRetirement.bind(agentsController));

// Récupérer les informations de prolongement de retraite d'un agent
router.get('/:id/prolongement-retraite', requireRoleOrAssigned, agentsController.getProlongementRetraite.bind(agentsController));

// Télécharger le fichier d'un prolongement de retraite
router.get('/:id/prolongement-retraite/file', requireRoleOrAssigned, agentsController.downloadProlongementFile.bind(agentsController));

// Servir un document de diplôme (route publique pour éviter les problèmes CORS)
router.get('/diplome-document/:documentPath', agentsController.serveDiplomeDocument.bind(agentsController));
// Gérer les requêtes OPTIONS pour CORS
router.options('/diplome-document/:documentPath', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
    res.sendStatus(200);
});

// Documents de l'agent (table agent_documents) - l'agent peut lister/ajouter/supprimer ses documents
router.get('/:id/documents', requireRoleOrAssigned, agentsController.listDocuments.bind(agentsController));
// Gérer les requêtes OPTIONS pour CORS preflight (avant la route GET pour les documents)
router.options('/:id/documents/:docId/file', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Content-Disposition');
    res.sendStatus(200);
});
router.get('/:id/documents/:docId/file', requireRoleOrAssigned, agentsController.serveAgentDocumentFile.bind(agentsController));
router.post('/:id/documents', requireRoleOrAssigned, uploadAgentDocuments, agentsController.uploadDocuments.bind(agentsController));
router.delete('/:id/documents/:docId', requireRoleOrAssigned, agentsController.deleteDocument.bind(agentsController));

// Récupérer un agent par ID avec ses enfants
router.get('/:id', requireRoleOrAssigned, agentsController.getById.bind(agentsController));

// Mettre à jour un agent
router.put('/:id', requireRoleOrAssigned, uploadAgentFiles, agentsController.update.bind(agentsController));

// Désactiver un agent (alternative à la suppression)
router.patch('/:id/deactivate', requireRoleOrAssigned, agentsController.deactivate.bind(agentsController));

// Restaurer un agent retiré
router.post('/:id/restore', requireRoleOrAssigned, agentsController.restore.bind(agentsController));

// Retirer un agent (route PATCH pour envoyer le motif dans le body - plus robuste)
router.patch('/:id/retirer', requireRoleOrAssigned, agentsController.delete.bind(agentsController));

// Retirer un agent (route DELETE - remplace la suppression)
router.delete('/:id', requireRoleOrAssigned, agentsController.delete.bind(agentsController));

module.exports = router;