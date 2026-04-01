const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const handicapsController = new SimpleController('handicaps');

// Routes CRUD de base
router.get('/', handicapsController.getAll.bind(handicapsController));
router.get('/:id', handicapsController.getById.bind(handicapsController));
router.post('/', handicapsController.create.bind(handicapsController));
router.put('/:id', handicapsController.update.bind(handicapsController));
router.delete('/:id', handicapsController.delete.bind(handicapsController));
router.delete('/', handicapsController.deleteMultiple.bind(handicapsController));

// Routes spécifiques
router.get('/search/:term', handicapsController.searchByTerm.bind(handicapsController));
router.get('/select/all', handicapsController.getAllForSelect.bind(handicapsController));

module.exports = router;
