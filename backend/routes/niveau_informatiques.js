const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const niveau_informatiquesController = new SimpleController('niveau_informatiques');

// Routes CRUD de base
router.get('/', niveau_informatiquesController.getAll.bind(niveau_informatiquesController));
router.get('/:id', niveau_informatiquesController.getById.bind(niveau_informatiquesController));
router.post('/', niveau_informatiquesController.create.bind(niveau_informatiquesController));
router.put('/:id', niveau_informatiquesController.update.bind(niveau_informatiquesController));
router.delete('/:id', niveau_informatiquesController.delete.bind(niveau_informatiquesController));
router.delete('/', niveau_informatiquesController.deleteMultiple.bind(niveau_informatiquesController));

// Routes spécifiques
router.get('/search/:term', niveau_informatiquesController.searchByTerm.bind(niveau_informatiquesController));
router.get('/select/all', niveau_informatiquesController.getAllForSelect.bind(niveau_informatiquesController));

module.exports = router;
