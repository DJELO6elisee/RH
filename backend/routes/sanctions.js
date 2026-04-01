const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const sanctionsController = new SimpleController('sanctions');

// Routes CRUD de base
router.get('/', sanctionsController.getAll.bind(sanctionsController));
router.get('/:id', sanctionsController.getById.bind(sanctionsController));
router.post('/', sanctionsController.create.bind(sanctionsController));
router.put('/:id', sanctionsController.update.bind(sanctionsController));
router.delete('/:id', sanctionsController.delete.bind(sanctionsController));
router.delete('/', sanctionsController.deleteMultiple.bind(sanctionsController));

// Routes spécifiques
router.get('/search/:term', sanctionsController.searchByTerm.bind(sanctionsController));
router.get('/select/all', sanctionsController.getAllForSelect.bind(sanctionsController));

module.exports = router;
