const express = require('express');
const router = express.Router();
const tiersInstitutionsController = require('../controllers/TiersInstitutionsController');

router.get('/', tiersInstitutionsController.getAll);
router.get('/:id', tiersInstitutionsController.getById);
router.post('/', tiersInstitutionsController.create);
router.put('/:id', tiersInstitutionsController.update);
router.delete('/:id', tiersInstitutionsController.delete);

module.exports = router;