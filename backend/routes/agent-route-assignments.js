const express = require('express');
const router = express.Router();
const agentRouteAssignmentsController = require('../controllers/AgentRouteAssignmentsController');
const { authenticate } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Assigner des routes à un ou plusieurs agents
router.post('/assign', agentRouteAssignmentsController.assignRoutes.bind(agentRouteAssignmentsController));

// Récupérer toutes les assignations (avec filtres optionnels)
router.get('/', agentRouteAssignmentsController.getAllAssignments.bind(agentRouteAssignmentsController));

// Récupérer les routes assignées à un agent spécifique
router.get('/agent/:agentId', agentRouteAssignmentsController.getAgentRoutes.bind(agentRouteAssignmentsController));

// Récupérer les agents assignés à une route spécifique
router.get('/route/:routeId', agentRouteAssignmentsController.getRouteAgents.bind(agentRouteAssignmentsController));

// Récupérer les routes assignées à l'agent connecté
router.get('/my-routes', agentRouteAssignmentsController.getMyRoutes.bind(agentRouteAssignmentsController));

// Récupérer toutes les routes disponibles pour l'assignation
router.get('/available-routes', agentRouteAssignmentsController.getAvailableRoutes.bind(agentRouteAssignmentsController));

// Retirer une route d'un agent
router.delete('/:assignmentId', agentRouteAssignmentsController.unassignRoute.bind(agentRouteAssignmentsController));

// Retirer plusieurs routes
router.post('/unassign', agentRouteAssignmentsController.unassignRoutes.bind(agentRouteAssignmentsController));

module.exports = router;

