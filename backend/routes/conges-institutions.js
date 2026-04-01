const express = require('express');
const router = express.Router();
const congesInstitutionsController = require('../controllers/CongesInstitutionsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour récupérer les congés
router.get('/agent/:agentId/year', requireRoleOrAssigned, congesInstitutionsController.getByAgentAndYear.bind(congesInstitutionsController));
router.get('/agent/:agentId/all', requireRoleOrAssigned, congesInstitutionsController.getAllByAgent.bind(congesInstitutionsController));
router.get('/agent/:agentId/years', requireRoleOrAssigned, congesInstitutionsController.getByAgentAndYears.bind(congesInstitutionsController));

// Routes pour mettre à jour les congés
router.put('/agent/:agentId', requireRoleOrAssigned, congesInstitutionsController.update.bind(congesInstitutionsController));
router.post('/agent/:agentId/deduire', requireRoleOrAssigned, congesInstitutionsController.deduireJours.bind(congesInstitutionsController));

// Routes pour initialisation et statistiques
router.post('/initialize-institution', requireRoleOrAssigned, congesInstitutionsController.initializeForInstitution.bind(congesInstitutionsController));
router.get('/summary-institution', requireRoleOrAssigned, congesInstitutionsController.getSummaryByInstitution.bind(congesInstitutionsController));

module.exports = router;

