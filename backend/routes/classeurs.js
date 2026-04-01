const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const classeursController = new SimpleController('classeurs');

// Routes CRUD de base
router.get('/', classeursController.getAll.bind(classeursController));
router.get('/:id', classeursController.getById.bind(classeursController));
router.post('/', classeursController.create.bind(classeursController));
router.put('/:id', classeursController.update.bind(classeursController));
router.delete('/:id', classeursController.delete.bind(classeursController));
router.delete('/', classeursController.deleteMultiple.bind(classeursController));

// Routes spécifiques
router.get('/search/:term', classeursController.searchByTerm.bind(classeursController));
router.get('/select/all', classeursController.getAllForSelect.bind(classeursController));

module.exports = router;
