const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_de_retraitesController = new SimpleController('type_de_retraites');

// Routes CRUD de base
router.get('/', type_de_retraitesController.getAll.bind(type_de_retraitesController));
router.get('/:id', type_de_retraitesController.getById.bind(type_de_retraitesController));
router.post('/', type_de_retraitesController.create.bind(type_de_retraitesController));
router.put('/:id', type_de_retraitesController.update.bind(type_de_retraitesController));
router.delete('/:id', type_de_retraitesController.delete.bind(type_de_retraitesController));
router.delete('/', type_de_retraitesController.deleteMultiple.bind(type_de_retraitesController));

// Routes spécifiques
router.get('/search/:term', type_de_retraitesController.searchByTerm.bind(type_de_retraitesController));
router.get('/select/all', type_de_retraitesController.getAllForSelect.bind(type_de_retraitesController));

module.exports = router;
