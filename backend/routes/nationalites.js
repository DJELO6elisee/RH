const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const nationalitesController = new SimpleController('nationalites');

// Routes CRUD de base
router.get('/', nationalitesController.getAll.bind(nationalitesController));
router.get('/:id', nationalitesController.getById.bind(nationalitesController));
router.post('/', nationalitesController.create.bind(nationalitesController));
router.put('/:id', nationalitesController.update.bind(nationalitesController));
router.delete('/:id', nationalitesController.delete.bind(nationalitesController));
router.delete('/', nationalitesController.deleteMultiple.bind(nationalitesController));

// Routes spécifiques
router.get('/search/:term', nationalitesController.searchByTerm.bind(nationalitesController));
router.get('/select/all', nationalitesController.getAllForSelect.bind(nationalitesController));

module.exports = router;