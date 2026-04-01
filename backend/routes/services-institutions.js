const express = require('express');
const router = express.Router();
const servicesInstitutionsController = require('../controllers/ServicesInstitutionsController');
const { authenticate, requireRole, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Routes protégées par authentification
router.use(authenticate);

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'drh', 'admin_entite']);

// CRUD de base
router.get('/', requireRoleOrAssigned, servicesInstitutionsController.getAll);
router.get('/:id', requireRoleOrAssigned, servicesInstitutionsController.getById);
router.post('/', requireRoleOrAssigned, servicesInstitutionsController.create);
router.put('/:id', requireRoleOrAssigned, servicesInstitutionsController.update);
router.delete('/:id', requireRoleOrAssigned, servicesInstitutionsController.delete);
router.delete('/', requireRoleOrAssigned, servicesInstitutionsController.deleteMultiple);

// Routes spécifiques par entité et institution
router.get('/entite/:id_entite', requireRoleOrAssigned, servicesInstitutionsController.getByEntite);
router.get('/institution/:id_institution', requireRoleOrAssigned, servicesInstitutionsController.getByInstitution);

// Routes de recherche
router.get('/search/:term', requireRoleOrAssigned, servicesInstitutionsController.searchByTerm);
router.get('/select/all', requireRoleOrAssigned, servicesInstitutionsController.getAllForSelect);

// Routes de statistiques
router.get('/stats/:id_institution', requireRoleOrAssigned, servicesInstitutionsController.getStats);

module.exports = router;