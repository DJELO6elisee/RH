const express = require('express');
const router = express.Router();
const entitesInstitutionsController = require('../controllers/EntitesInstitutionsController');

router.get('/', entitesInstitutionsController.getAll);
router.get('/:id', entitesInstitutionsController.getById);
router.post('/', entitesInstitutionsController.create);
router.put('/:id', entitesInstitutionsController.update);
router.delete('/:id', entitesInstitutionsController.delete);
router.get('/institution/:institutionId', entitesInstitutionsController.getByInstitution);
router.get('/institution/:institutionId/hierarchy', entitesInstitutionsController.getHierarchy);

module.exports = router;