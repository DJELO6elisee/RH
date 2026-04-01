const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_de_materielsController = new SimpleController('type_de_materiels');

// Routes CRUD de base
router.get('/', type_de_materielsController.getAll.bind(type_de_materielsController));
router.get('/:id', type_de_materielsController.getById.bind(type_de_materielsController));
router.post('/', type_de_materielsController.create.bind(type_de_materielsController));
router.put('/:id', type_de_materielsController.update.bind(type_de_materielsController));
router.delete('/:id', type_de_materielsController.delete.bind(type_de_materielsController));
router.delete('/', type_de_materielsController.deleteMultiple.bind(type_de_materielsController));

// Routes spécifiques
router.get('/search/:term', type_de_materielsController.searchByTerm.bind(type_de_materielsController));
router.get('/select/all', type_de_materielsController.getAllForSelect.bind(type_de_materielsController));

module.exports = router;
