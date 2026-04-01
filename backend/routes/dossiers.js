const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const dossiersController = new SimpleController('dossiers');

// Routes CRUD de base
router.get('/', dossiersController.getAll.bind(dossiersController));
router.get('/:id', dossiersController.getById.bind(dossiersController));
router.post('/', dossiersController.create.bind(dossiersController));
router.put('/:id', dossiersController.update.bind(dossiersController));
router.delete('/:id', dossiersController.delete.bind(dossiersController));
router.delete('/', dossiersController.deleteMultiple.bind(dossiersController));

// Routes spécifiques
router.get('/search/:term', dossiersController.searchByTerm.bind(dossiersController));
router.get('/select/all', dossiersController.getAllForSelect.bind(dossiersController));

module.exports = router;
