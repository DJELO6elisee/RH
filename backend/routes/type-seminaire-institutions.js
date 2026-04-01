const express = require('express');
const router = express.Router();
const typeSeminaireInstitutionsController = require('../controllers/TypeSeminaireInstitutionsController');

router.get('/', typeSeminaireInstitutionsController.getAll);
router.get('/:id', typeSeminaireInstitutionsController.getById);
router.post('/', typeSeminaireInstitutionsController.create);
router.put('/:id', typeSeminaireInstitutionsController.update);
router.delete('/:id', typeSeminaireInstitutionsController.delete);

module.exports = router;