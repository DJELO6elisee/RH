const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const niveau_languesController = new SimpleController('niveau_langues');

// Routes CRUD de base
router.get('/', niveau_languesController.getAll.bind(niveau_languesController));
router.get('/:id', niveau_languesController.getById.bind(niveau_languesController));
router.post('/', niveau_languesController.create.bind(niveau_languesController));
router.put('/:id', niveau_languesController.update.bind(niveau_languesController));
router.delete('/:id', niveau_languesController.delete.bind(niveau_languesController));
router.delete('/', niveau_languesController.deleteMultiple.bind(niveau_languesController));

// Routes spécifiques
router.get('/search/:term', niveau_languesController.searchByTerm.bind(niveau_languesController));
router.get('/select/all', niveau_languesController.getAllForSelect.bind(niveau_languesController));

module.exports = router;
