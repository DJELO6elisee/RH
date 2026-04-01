const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const tiersController = new SimpleController('tiers');

// Routes CRUD de base
router.get('/', tiersController.getAll.bind(tiersController));
router.get('/:id', tiersController.getById.bind(tiersController));
router.post('/', tiersController.create.bind(tiersController));
router.put('/:id', tiersController.update.bind(tiersController));
router.delete('/:id', tiersController.delete.bind(tiersController));
router.delete('/', tiersController.deleteMultiple.bind(tiersController));

// Routes spécifiques
router.get('/search/:term', tiersController.searchByTerm.bind(tiersController));
router.get('/select/all', tiersController.getAllForSelect.bind(tiersController));

module.exports = router;
