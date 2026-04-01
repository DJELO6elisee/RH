const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const regionsController = new SimpleController('regions');

// Routes CRUD de base
router.get('/', regionsController.getAll.bind(regionsController));
router.get('/:id', regionsController.getById.bind(regionsController));
router.post('/', regionsController.create.bind(regionsController));
router.put('/:id', regionsController.update.bind(regionsController));
router.delete('/:id', regionsController.delete.bind(regionsController));
router.delete('/', regionsController.deleteMultiple.bind(regionsController));

// Routes spécifiques
router.get('/search/:term', regionsController.searchByTerm.bind(regionsController));
router.get('/select/all', regionsController.getAllForSelect.bind(regionsController));

module.exports = router;