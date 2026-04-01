const express = require('express');
const router = express.Router();
const dossiersInstitutionsController = require('../controllers/DossiersInstitutionsController');

router.get('/', dossiersInstitutionsController.getAll);
router.get('/:id', dossiersInstitutionsController.getById);
router.post('/', dossiersInstitutionsController.create);
router.put('/:id', dossiersInstitutionsController.update);
router.delete('/:id', dossiersInstitutionsController.delete);

module.exports = router;