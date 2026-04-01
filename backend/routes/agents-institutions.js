const express = require('express');
const router = express.Router();
const agentsInstitutionsController = require('../controllers/AgentsInstitutionsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh', 'directeur', 'sous_directeur', 'sous-directeur']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ========================================
// ROUTES SANS PARAMÈTRES (doivent être EN PREMIER)
// ========================================

// Récupérer tous les agents avec pagination et recherche
router.get('/', requireRoleOrAssigned, agentsInstitutionsController.getAll.bind(agentsInstitutionsController));

// Créer un nouvel agent
router.post('/', requireRoleOrAssigned, agentsInstitutionsController.create.bind(agentsInstitutionsController));

// ========================================
// ROUTES SPÉCIFIQUES (avant /:id)
// ========================================

// Recherche avancée d'agents
router.get('/search/advanced', requireRoleOrAssigned, agentsInstitutionsController.searchAdvanced.bind(agentsInstitutionsController));

// Statistiques des agents
router.get('/stats/overview', requireRoleOrAssigned, agentsInstitutionsController.getStats.bind(agentsInstitutionsController));
router.get('/stats/by-type', requireRoleOrAssigned, agentsInstitutionsController.getStatsByType.bind(agentsInstitutionsController));

// Rapport hiérarchique
router.get('/hierarchical-report', requireRoleOrAssigned, agentsInstitutionsController.getHierarchicalReport.bind(agentsInstitutionsController));

// Anniversaires à venir
router.get('/upcoming-birthdays', requireRoleOrAssigned, agentsInstitutionsController.getUpcomingBirthdays.bind(agentsInstitutionsController));

// Statistiques des retraites
router.get('/retirement-stats', requireRoleOrAssigned, agentsInstitutionsController.getRetirementStats.bind(agentsInstitutionsController));

// ========================================
// ROUTES AVEC PARAMÈTRES (doivent être EN DERNIER)
// ========================================

// Récupérer un agent par ID
router.get('/:id', requireRoleOrAssigned, agentsInstitutionsController.getById.bind(agentsInstitutionsController));

// Mettre à jour un agent
router.put('/:id', requireRoleOrAssigned, agentsInstitutionsController.update.bind(agentsInstitutionsController));

// Supprimer un agent
router.delete('/:id', requireRoleOrAssigned, agentsInstitutionsController.delete.bind(agentsInstitutionsController));

// Récupérer les enfants d'un agent
router.get('/agent/:agentId', requireRoleOrAssigned, agentsInstitutionsController.getByAgent.bind(agentsInstitutionsController));

module.exports = router;
