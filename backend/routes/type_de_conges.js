const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_de_congesController = new SimpleController('type_de_conges');

// Routes CRUD de base
router.get('/', type_de_congesController.getAll.bind(type_de_congesController));
router.get('/:id', type_de_congesController.getById.bind(type_de_congesController));
router.post('/', type_de_congesController.create.bind(type_de_congesController));
router.put('/:id', type_de_congesController.update.bind(type_de_congesController));
router.delete('/:id', type_de_congesController.delete.bind(type_de_congesController));
router.delete('/', type_de_congesController.deleteMultiple.bind(type_de_congesController));

// Routes spécifiques
router.get('/search/:term', type_de_congesController.searchByTerm.bind(type_de_congesController));
router.get('/select/all', type_de_congesController.getAllForSelect.bind(type_de_congesController));

module.exports = router;
