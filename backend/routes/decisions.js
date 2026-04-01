const express = require('express');
const router = express.Router();
const DecisionsController = require('../controllers/DecisionsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');
const { uploadDecisionFile } = require('../middleware/upload');

const decisionsController = new DecisionsController();

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Créer une nouvelle décision (avec upload de fichier optionnel)
router.post('/', requireRoleOrAssigned, uploadDecisionFile, decisionsController.create.bind(decisionsController));

// Récupérer toutes les décisions (avec filtre optionnel par type)
router.get('/', requireRoleOrAssigned, decisionsController.getAll.bind(decisionsController));

// Récupérer la décision active pour un type donné (doit être avant /:id)
router.get('/active/:type', requireRoleOrAssigned, decisionsController.getActiveDecision.bind(decisionsController));

// Télécharger le document d'une décision (doit être avant /:id)
router.get('/:id/document', requireRoleOrAssigned, decisionsController.downloadDocument.bind(decisionsController));

// Activer/Désactiver une décision (doit être avant /:id)
router.patch('/:id/activate', requireRoleOrAssigned, decisionsController.toggleActive.bind(decisionsController));

// Uploader un fichier pour une décision existante (doit être avant /:id)
router.post('/:id/upload', requireRoleOrAssigned, uploadDecisionFile, decisionsController.uploadDocument.bind(decisionsController));

// Récupérer une décision par ID (doit être en dernier)
router.get('/:id', requireRoleOrAssigned, decisionsController.getById.bind(decisionsController));

// Supprimer une décision
router.delete('/:id', requireRoleOrAssigned, decisionsController.delete.bind(decisionsController));

module.exports = router;

