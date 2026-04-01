const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const pathologiesController = new SimpleController('pathologies');

// Routes CRUD de base
router.get('/', pathologiesController.getAll.bind(pathologiesController));
router.get('/:id', pathologiesController.getById.bind(pathologiesController));
router.post('/', pathologiesController.create.bind(pathologiesController));
router.put('/:id', pathologiesController.update.bind(pathologiesController));
router.delete('/:id', pathologiesController.delete.bind(pathologiesController));
router.delete('/', pathologiesController.deleteMultiple.bind(pathologiesController));

// Routes spécifiques
router.get('/search/:term', pathologiesController.searchByTerm.bind(pathologiesController));
router.get('/select/all', pathologiesController.getAllForSelect.bind(pathologiesController));

module.exports = router;
