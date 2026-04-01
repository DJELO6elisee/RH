const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_etablissementsController = new SimpleController('type_etablissements');

// Routes CRUD de base
router.get('/', type_etablissementsController.getAll.bind(type_etablissementsController));
router.get('/:id', type_etablissementsController.getById.bind(type_etablissementsController));
router.post('/', type_etablissementsController.create.bind(type_etablissementsController));
router.put('/:id', type_etablissementsController.update.bind(type_etablissementsController));
router.delete('/:id', type_etablissementsController.delete.bind(type_etablissementsController));
router.delete('/', type_etablissementsController.deleteMultiple.bind(type_etablissementsController));

// Routes spécifiques
router.get('/search/:term', type_etablissementsController.searchByTerm.bind(type_etablissementsController));
router.get('/select/all', type_etablissementsController.getAllForSelect.bind(type_etablissementsController));

module.exports = router;
