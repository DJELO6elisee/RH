const express = require('express');
const router = express.Router();
const PlanningPrevisionnelController = require('../controllers/PlanningPrevisionnelController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée (directeur_service_exterieur = directeur d'une direction)
// Inclut directeur_general / directeur générale, cabinet et directeur_central pour accès au planning prévisionnel
const requireRoleOrAssigned = requireRoleOrAssignedRoute([
    'super_admin', 'DRH', 'drh',
    'directeur', 'directeur_service_exterieur', 'directeur_central', 'directeur_general', 'directeur générale', 'directeur_generale',
    'inspecteur_general', 'directeur_service_exterieur',
    'sous_directeur', 'sous-directeur',
    'chef_cabinet', 'dir_cabinet',
    'gestionnaire_du_patrimoine', 'president_du_fond', 'responsble_cellule_de_passation'
]);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Créer ou mettre à jour la date de départ en congés pour un agent
router.post('/', requireRoleOrAssigned, PlanningPrevisionnelController.createOrUpdate);

// Créer ou mettre à jour la date de départ en congés pour plusieurs agents (congés groupés)
router.post('/grouped', requireRoleOrAssigned, PlanningPrevisionnelController.createOrUpdateGrouped);

// Récupérer la date de départ en congés pour un agent et une année
router.get('/agent/:agentId/annee/:annee', requireRoleOrAssigned, PlanningPrevisionnelController.getByAgentAndYear);

// Récupérer toutes les dates de départ en congés pour une année donnée
router.get('/annee/:annee', requireRoleOrAssigned, PlanningPrevisionnelController.getByYear);

// Supprimer la date de départ en congés pour un agent
router.delete('/agent/:agentId/annee/:annee', requireRoleOrAssigned, PlanningPrevisionnelController.delete);

// Vérifier et créer des notifications pour les agents dont la date de départ est dans 1 mois
router.get('/verifier-notifications', requireRoleOrAssigned, PlanningPrevisionnelController.verifierEtCreerNotifications);

// Récupérer le rapport des agents en congés groupés par organisation
router.get('/rapport-organisation/:annee', requireRoleOrAssigned, PlanningPrevisionnelController.getRapportParOrganisation);

module.exports = router;

