const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const motif_de_departsController = new SimpleController('motif_de_departs');

// Routes CRUD de base
router.get('/', motif_de_departsController.getAll.bind(motif_de_departsController));
router.get('/:id', motif_de_departsController.getById.bind(motif_de_departsController));
router.post('/', motif_de_departsController.create.bind(motif_de_departsController));
router.put('/:id', motif_de_departsController.update.bind(motif_de_departsController));
router.delete('/:id', motif_de_departsController.delete.bind(motif_de_departsController));
router.delete('/', motif_de_departsController.deleteMultiple.bind(motif_de_departsController));

// Routes spécifiques
router.get('/search/:term', motif_de_departsController.searchByTerm.bind(motif_de_departsController));
router.get('/select/all', motif_de_departsController.getAllForSelect.bind(motif_de_departsController));

module.exports = router;
