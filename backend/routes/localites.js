const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const localitesController = new SimpleController('localites');


// Routes CRUD de base
router.get('/', localitesController.getAll.bind(localitesController));
router.get('/:id', localitesController.getById.bind(localitesController));
router.post('/', localitesController.create.bind(localitesController));
router.put('/:id', localitesController.update.bind(localitesController));
router.delete('/:id', localitesController.delete.bind(localitesController));
router.delete('/', localitesController.deleteMultiple.bind(localitesController));

// Routes spécifiques
router.get('/search/:term', localitesController.searchByTerm.bind(localitesController));
router.get('/select/all', localitesController.getAllForSelect.bind(localitesController));

module.exports = router;