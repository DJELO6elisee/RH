const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_de_documentsController = new SimpleController('type_de_documents');

// Routes CRUD de base
router.get('/', type_de_documentsController.getAll.bind(type_de_documentsController));
router.get('/:id', type_de_documentsController.getById.bind(type_de_documentsController));
router.post('/', type_de_documentsController.create.bind(type_de_documentsController));
router.put('/:id', type_de_documentsController.update.bind(type_de_documentsController));
router.delete('/:id', type_de_documentsController.delete.bind(type_de_documentsController));
router.delete('/', type_de_documentsController.deleteMultiple.bind(type_de_documentsController));

// Routes spécifiques
router.get('/search/:term', type_de_documentsController.searchByTerm.bind(type_de_documentsController));
router.get('/select/all', type_de_documentsController.getAllForSelect.bind(type_de_documentsController));

module.exports = router;
