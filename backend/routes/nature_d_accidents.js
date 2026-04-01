const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const nature_d_accidentsController = new SimpleController('nature_d_accidents');

// Routes CRUD de base
router.get('/', nature_d_accidentsController.getAll.bind(nature_d_accidentsController));
router.get('/:id', nature_d_accidentsController.getById.bind(nature_d_accidentsController));
router.post('/', nature_d_accidentsController.create.bind(nature_d_accidentsController));
router.put('/:id', nature_d_accidentsController.update.bind(nature_d_accidentsController));
router.delete('/:id', nature_d_accidentsController.delete.bind(nature_d_accidentsController));
router.delete('/', nature_d_accidentsController.deleteMultiple.bind(nature_d_accidentsController));

// Routes spécifiques
router.get('/search/:term', nature_d_accidentsController.searchByTerm.bind(nature_d_accidentsController));
router.get('/select/all', nature_d_accidentsController.getAllForSelect.bind(nature_d_accidentsController));

module.exports = router;
