const express = require('express');
const router = express.Router();
const planningPrevisionnelInstitutionsController = require('../controllers/PlanningPrevisionnelInstitutionsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes sans paramètres (en premier)
router.get('/', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.getAll.bind(planningPrevisionnelInstitutionsController));
router.post('/', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.create.bind(planningPrevisionnelInstitutionsController));

// Routes spécifiques
router.get('/agent/:agentId', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.getByAgent.bind(planningPrevisionnelInstitutionsController));
router.get('/rapport/trimestre', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.getRapportByTrimestre.bind(planningPrevisionnelInstitutionsController));

// Routes avec paramètres (en dernier)
router.put('/:id', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.update.bind(planningPrevisionnelInstitutionsController));
router.delete('/:id', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.delete.bind(planningPrevisionnelInstitutionsController));
router.post('/:id/valider', requireRoleOrAssigned, planningPrevisionnelInstitutionsController.valider.bind(planningPrevisionnelInstitutionsController));

module.exports = router;

