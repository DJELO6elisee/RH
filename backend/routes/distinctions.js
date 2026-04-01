const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const distinctionsController = new SimpleController('distinctions');

// Routes CRUD de base
router.get('/', distinctionsController.getAll.bind(distinctionsController));
router.get('/:id', distinctionsController.getById.bind(distinctionsController));
router.post('/', distinctionsController.create.bind(distinctionsController));
router.put('/:id', distinctionsController.update.bind(distinctionsController));
router.delete('/:id', distinctionsController.delete.bind(distinctionsController));
router.delete('/', distinctionsController.deleteMultiple.bind(distinctionsController));

// Routes spécifiques
router.get('/search/:term', distinctionsController.searchByTerm.bind(distinctionsController));
router.get('/select/all', distinctionsController.getAllForSelect.bind(distinctionsController));

module.exports = router;
