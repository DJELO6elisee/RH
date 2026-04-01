const express = require('express');
const router = express.Router();
const permissionsEntitesInstitutionsController = require('../controllers/PermissionsEntitesInstitutionsController');

router.get('/', permissionsEntitesInstitutionsController.getAll);
router.get('/:id', permissionsEntitesInstitutionsController.getById);
router.post('/', permissionsEntitesInstitutionsController.create);
router.put('/:id', permissionsEntitesInstitutionsController.update);
router.delete('/:id', permissionsEntitesInstitutionsController.delete);

module.exports = router;