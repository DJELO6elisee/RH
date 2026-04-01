const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const unite_administrativesController = new SimpleController('unite_administratives');

// Routes CRUD de base
router.get('/', unite_administrativesController.getAll.bind(unite_administrativesController));
router.get('/:id', unite_administrativesController.getById.bind(unite_administrativesController));
router.post('/', unite_administrativesController.create.bind(unite_administrativesController));
router.put('/:id', unite_administrativesController.update.bind(unite_administrativesController));
router.delete('/:id', unite_administrativesController.delete.bind(unite_administrativesController));
router.delete('/', unite_administrativesController.deleteMultiple.bind(unite_administrativesController));

// Routes spécifiques
router.get('/search/:term', unite_administrativesController.searchByTerm.bind(unite_administrativesController));
router.get('/select/all', unite_administrativesController.getAllForSelect.bind(unite_administrativesController));

module.exports = router;
