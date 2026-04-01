const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const logicielsController = new SimpleController('logiciels');

// Routes CRUD de base
router.get('/', logicielsController.getAll.bind(logicielsController));
router.get('/:id', logicielsController.getById.bind(logicielsController));
router.post('/', logicielsController.create.bind(logicielsController));
router.put('/:id', logicielsController.update.bind(logicielsController));
router.delete('/:id', logicielsController.delete.bind(logicielsController));
router.delete('/', logicielsController.deleteMultiple.bind(logicielsController));

// Routes spécifiques
router.get('/search/:term', logicielsController.searchByTerm.bind(logicielsController));
router.get('/select/all', logicielsController.getAllForSelect.bind(logicielsController));

module.exports = router;
