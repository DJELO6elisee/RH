const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const positionsController = new SimpleController('positions');

// Routes CRUD de base
router.get('/', positionsController.getAll.bind(positionsController));
router.get('/:id', positionsController.getById.bind(positionsController));
router.post('/', positionsController.create.bind(positionsController));
router.put('/:id', positionsController.update.bind(positionsController));
router.delete('/:id', positionsController.delete.bind(positionsController));
router.delete('/', positionsController.deleteMultiple.bind(positionsController));

// Routes spécifiques
router.get('/search/:term', positionsController.searchByTerm.bind(positionsController));
router.get('/select/all', positionsController.getAllForSelect.bind(positionsController));

module.exports = router;
