const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const diplomesController = new SimpleController('diplomes');

// Routes CRUD de base
router.get('/', diplomesController.getAll.bind(diplomesController));
router.get('/:id', diplomesController.getById.bind(diplomesController));
router.post('/', diplomesController.create.bind(diplomesController));
router.put('/:id', diplomesController.update.bind(diplomesController));
router.delete('/:id', diplomesController.delete.bind(diplomesController));
router.delete('/', diplomesController.deleteMultiple.bind(diplomesController));

// Routes spécifiques
router.get('/search/:term', diplomesController.searchByTerm.bind(diplomesController));
router.get('/select/all', diplomesController.getAllForSelect.bind(diplomesController));

module.exports = router;
