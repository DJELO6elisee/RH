const express = require('express');
const router = express.Router();
const enfantsInstitutionsController = require('../controllers/EnfantsInstitutionsController');

router.get('/', enfantsInstitutionsController.getAll);
router.get('/:id', enfantsInstitutionsController.getById);
router.post('/', enfantsInstitutionsController.create);
router.put('/:id', enfantsInstitutionsController.update);
router.delete('/:id', enfantsInstitutionsController.delete);
router.get('/agent/:agentId', enfantsInstitutionsController.getByAgent);

module.exports = router;