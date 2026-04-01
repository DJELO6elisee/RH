const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_de_couriersController = new SimpleController('type_de_couriers');

// Routes CRUD de base
router.get('/', type_de_couriersController.getAll.bind(type_de_couriersController));
router.get('/:id', type_de_couriersController.getById.bind(type_de_couriersController));
router.post('/', type_de_couriersController.create.bind(type_de_couriersController));
router.put('/:id', type_de_couriersController.update.bind(type_de_couriersController));
router.delete('/:id', type_de_couriersController.delete.bind(type_de_couriersController));
router.delete('/', type_de_couriersController.deleteMultiple.bind(type_de_couriersController));

// Routes spécifiques
router.get('/search/:term', type_de_couriersController.searchByTerm.bind(type_de_couriersController));
router.get('/select/all', type_de_couriersController.getAllForSelect.bind(type_de_couriersController));

module.exports = router;
