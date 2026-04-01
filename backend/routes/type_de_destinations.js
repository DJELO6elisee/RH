const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_de_destinationsController = new SimpleController('type_de_destinations');

// Routes CRUD de base
router.get('/', type_de_destinationsController.getAll.bind(type_de_destinationsController));
router.get('/:id', type_de_destinationsController.getById.bind(type_de_destinationsController));
router.post('/', type_de_destinationsController.create.bind(type_de_destinationsController));
router.put('/:id', type_de_destinationsController.update.bind(type_de_destinationsController));
router.delete('/:id', type_de_destinationsController.delete.bind(type_de_destinationsController));
router.delete('/', type_de_destinationsController.deleteMultiple.bind(type_de_destinationsController));

// Routes spécifiques
router.get('/search/:term', type_de_destinationsController.searchByTerm.bind(type_de_destinationsController));
router.get('/select/all', type_de_destinationsController.getAllForSelect.bind(type_de_destinationsController));

module.exports = router;
