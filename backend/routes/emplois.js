const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const emploisController = new SimpleController('emplois');

// Routes CRUD de base
router.get('/', emploisController.getAll.bind(emploisController));
router.get('/:id', emploisController.getById.bind(emploisController));
router.post('/', emploisController.create.bind(emploisController));
router.put('/:id', emploisController.update.bind(emploisController));
router.delete('/:id', emploisController.delete.bind(emploisController));
router.delete('/', emploisController.deleteMultiple.bind(emploisController));

// Routes spécifiques
router.get('/search/:term', emploisController.searchByTerm.bind(emploisController));
router.get('/select/all', emploisController.getAllForSelect.bind(emploisController));

module.exports = router;