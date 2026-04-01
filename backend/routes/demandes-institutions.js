const express = require('express');
const router = express.Router();
const demandesInstitutionsController = require('../controllers/DemandesInstitutionsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes sans paramètres (en premier)
router.get('/', requireRoleOrAssigned, demandesInstitutionsController.getAll.bind(demandesInstitutionsController));
router.post('/', requireRoleOrAssigned, demandesInstitutionsController.create.bind(demandesInstitutionsController));

// Routes spécifiques
router.get('/stats', requireRoleOrAssigned, demandesInstitutionsController.getStats.bind(demandesInstitutionsController));
router.get('/en-attente', requireRoleOrAssigned, demandesInstitutionsController.getEnAttenteByValidateur.bind(demandesInstitutionsController));
router.get('/agent/:agentId', requireRoleOrAssigned, demandesInstitutionsController.getByAgent.bind(demandesInstitutionsController));

// Routes avec paramètres (en dernier)
router.get('/:id', requireRoleOrAssigned, demandesInstitutionsController.getById.bind(demandesInstitutionsController));
router.put('/:id', requireRoleOrAssigned, demandesInstitutionsController.update.bind(demandesInstitutionsController));
router.delete('/:id', requireRoleOrAssigned, demandesInstitutionsController.delete.bind(demandesInstitutionsController));

// Routes d'action
router.post('/:id/valider', requireRoleOrAssigned, demandesInstitutionsController.valider.bind(demandesInstitutionsController));
router.post('/:id/annuler', requireRoleOrAssigned, demandesInstitutionsController.annuler.bind(demandesInstitutionsController));

module.exports = router;

