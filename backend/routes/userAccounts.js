const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const userAccountsController = require('../controllers/UserAccountsController');

const requireAuth = authMiddleware.authenticate.bind(authMiddleware);
const manageRoles = ['super_admin', 'DRH', 'drh'];
const requireManageRole = authMiddleware.requireRole(manageRoles);
// Middleware qui autorise les DRH/super_admin OU les agents avec la route assignée
// Le routeId sera détecté automatiquement depuis l'URL (/api/user-accounts -> 'agent-user-accounts')
const requireManageRoleOrAssigned = authMiddleware.requireRoleOrAssignedRoute(manageRoles);

router.use(requireAuth);

router.get('/', requireManageRoleOrAssigned, (req, res) => userAccountsController.list(req, res));
router.get('/roles', requireManageRoleOrAssigned, (req, res) => userAccountsController.getRoles(req, res));
router.get('/available-agents', requireManageRoleOrAssigned, (req, res) => userAccountsController.getAvailableAgents(req, res));
router.post('/', requireManageRoleOrAssigned, (req, res) => userAccountsController.create(req, res));
router.put('/:id', requireManageRoleOrAssigned, (req, res) => userAccountsController.update(req, res));
router.patch('/:id/toggle-active', requireManageRoleOrAssigned, (req, res) => userAccountsController.toggleActive(req, res));
router.post('/:id/reset-password', requireManageRoleOrAssigned, (req, res) => userAccountsController.resetPassword(req, res));

module.exports = router;

