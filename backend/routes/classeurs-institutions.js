const express = require('express');
const router = express.Router();
const classeursInstitutionsController = require('../controllers/ClasseursInstitutionsController');

router.get('/', classeursInstitutionsController.getAll);
router.get('/:id', classeursInstitutionsController.getById);
router.post('/', classeursInstitutionsController.create);
router.put('/:id', classeursInstitutionsController.update);
router.delete('/:id', classeursInstitutionsController.delete);

module.exports = router;