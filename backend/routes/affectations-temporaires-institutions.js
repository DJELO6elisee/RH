const express = require('express');
const router = express.Router();
const affectationsTemporairesInstitutionsController = require('../controllers/AffectationsTemporairesInstitutionsController');

router.get('/', affectationsTemporairesInstitutionsController.getAll);
router.get('/:id', affectationsTemporairesInstitutionsController.getById);
router.post('/', affectationsTemporairesInstitutionsController.create);
router.put('/:id', affectationsTemporairesInstitutionsController.update);
router.delete('/:id', affectationsTemporairesInstitutionsController.delete);

module.exports = router;