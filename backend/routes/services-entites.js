const express = require('express');
const router = express.Router();
const servicesEntitesController = require('../controllers/ServicesEntitesController');
const { authenticate, requireRole, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'drh', 'admin_entite']);

// Routes publiques (si nécessaire)
router.get('/stats/:id_ministere', servicesEntitesController.getStats);

// Routes protégées par authentification
router.use(authenticate);

// CRUD de base
router.get('/', requireRoleOrAssigned, servicesEntitesController.getAll);
router.get('/search/advanced', requireRoleOrAssigned, servicesEntitesController.searchAdvanced);
router.get('/:id', requireRoleOrAssigned, servicesEntitesController.getById);
router.get('/:id/details', requireRoleOrAssigned, servicesEntitesController.getByIdWithDetails);
router.post('/', requireRoleOrAssigned, servicesEntitesController.create);
router.put('/:id', requireRoleOrAssigned, servicesEntitesController.update);
router.delete('/:id', requireRoleOrAssigned, servicesEntitesController.delete);
router.delete('/', requireRoleOrAssigned, servicesEntitesController.deleteMultiple);

// Routes spécifiques par entité
router.get('/entite/:id_entite', requireRoleOrAssigned, servicesEntitesController.getByEntite);
router.get('/ministere/:id_ministere', requireRoleOrAssigned, servicesEntitesController.getByMinistere);

// Routes de recherche
router.get('/search/:term', requireRoleOrAssigned, servicesEntitesController.searchByTerm);
router.get('/select/all', requireRoleOrAssigned, servicesEntitesController.getAllForSelect);

module.exports = router;