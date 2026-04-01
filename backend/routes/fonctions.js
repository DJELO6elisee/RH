const express = require('express');
const router = express.Router();
const fonctionsController = require('../controllers/FonctionsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

router.get('/', requireRoleOrAssignedRoute(['drh', 'super_admin']), fonctionsController.getAll);
router.get('/select/all', requireRoleOrAssignedRoute(['drh', 'super_admin']), fonctionsController.getAllForSelect.bind(fonctionsController));
router.get('/:id', requireRoleOrAssignedRoute(['drh', 'super_admin']), fonctionsController.getById);
router.post('/', requireRoleOrAssignedRoute(['drh', 'super_admin']), fonctionsController.create);
router.put('/:id', requireRoleOrAssignedRoute(['drh', 'super_admin']), fonctionsController.update);
router.delete('/:id', requireRoleOrAssignedRoute(['drh', 'super_admin']), fonctionsController.delete);

module.exports = router;