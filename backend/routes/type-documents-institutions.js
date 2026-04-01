const express = require('express');
const router = express.Router();
const typeDocumentsInstitutionsController = require('../controllers/TypeDocumentsInstitutionsController');

router.get('/', typeDocumentsInstitutionsController.getAll);
router.get('/:id', typeDocumentsInstitutionsController.getById);
router.post('/', typeDocumentsInstitutionsController.create);
router.put('/:id', typeDocumentsInstitutionsController.update);
router.delete('/:id', typeDocumentsInstitutionsController.delete);

module.exports = router;