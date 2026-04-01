const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const languesController = new SimpleController('langues');

// Routes CRUD de base
router.get('/', languesController.getAll.bind(languesController));
router.get('/:id', languesController.getById.bind(languesController));
router.post('/', languesController.create.bind(languesController));
router.put('/:id', languesController.update.bind(languesController));
router.delete('/:id', languesController.delete.bind(languesController));
router.delete('/', languesController.deleteMultiple.bind(languesController));

// Routes spécifiques
router.get('/search/:term', languesController.searchByTerm.bind(languesController));
router.get('/select/all', languesController.getAllForSelect.bind(languesController));

module.exports = router;
