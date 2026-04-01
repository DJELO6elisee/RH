const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const departementsController = new SimpleController('departements');

// Routes CRUD de base
router.get('/', departementsController.getAll.bind(departementsController));
router.get('/:id', departementsController.getById.bind(departementsController));
router.post('/', departementsController.create.bind(departementsController));
router.put('/:id', departementsController.update.bind(departementsController));
router.delete('/:id', departementsController.delete.bind(departementsController));
router.delete('/', departementsController.deleteMultiple.bind(departementsController));

// Routes spécifiques
router.get('/search/:term', departementsController.searchByTerm.bind(departementsController));
router.get('/select/all', departementsController.getAllForSelect.bind(departementsController));

module.exports = router;