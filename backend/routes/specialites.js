const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const specialitesController = new SimpleController('specialites');

// Routes CRUD de base
router.get('/', specialitesController.getAll.bind(specialitesController));
router.get('/:id', specialitesController.getById.bind(specialitesController));
router.post('/', specialitesController.create.bind(specialitesController));
router.put('/:id', specialitesController.update.bind(specialitesController));
router.delete('/:id', specialitesController.delete.bind(specialitesController));
router.delete('/', specialitesController.deleteMultiple.bind(specialitesController));

// Routes spécifiques
router.get('/search/:term', specialitesController.searchByTerm.bind(specialitesController));
router.get('/select/all', specialitesController.getAllForSelect.bind(specialitesController));

module.exports = router;