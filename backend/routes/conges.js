const express = require('express');
const router = express.Router();
const CongesController = require('../controllers/CongesController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Récupérer les congés de l'année en cours pour l'agent connecté
router.get('/current-year', requireRoleOrAssigned, CongesController.getCurrentYear);

// Récupérer les congés d'un agent pour une année donnée
router.get('/agent/:agentId', requireRoleOrAssigned, CongesController.getByAgentAndYear);

// Récupérer tous les congés d'un agent
router.get('/agent/:agentId/all', requireRoleOrAssigned, CongesController.getAllByAgent);

// Récupérer les congés d'un agent pour des années spécifiques
router.get('/agent/:agentId/years', requireRoleOrAssigned, CongesController.getByAgentAndYears);

// Mettre à jour les jours de congés pris
router.put('/agent/:agentId/jours-pris', requireRoleOrAssigned, CongesController.updateJoursPris);

// Calculer le nombre de jours ouvrés entre deux dates
router.get('/calculer-jours-ouvres', requireRoleOrAssigned, CongesController.calculerJoursOuvresEndpoint);

// Récupérer tous les agents avec leurs jours de congés
router.get('/all-agents', requireRoleOrAssigned, CongesController.getAllAgentsWithConges);

// Mettre à jour les jours de congés pour plusieurs agents/années
router.post('/update-multiple', requireRoleOrAssigned, CongesController.updateMultipleConges);

module.exports = router;

