const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const type_d_agentsController = new SimpleController('type_d_agents');

// Routes CRUD de base
router.get('/', type_d_agentsController.getAll.bind(type_d_agentsController));
router.get('/:id', type_d_agentsController.getById.bind(type_d_agentsController));
router.post('/', type_d_agentsController.create.bind(type_d_agentsController));
router.put('/:id', type_d_agentsController.update.bind(type_d_agentsController));
router.delete('/:id', type_d_agentsController.delete.bind(type_d_agentsController));
router.delete('/', type_d_agentsController.deleteMultiple.bind(type_d_agentsController));

// Routes spécifiques
router.get('/search/:term', type_d_agentsController.searchByTerm.bind(type_d_agentsController));
router.get('/select/all', type_d_agentsController.getAllForSelect.bind(type_d_agentsController));

module.exports = router;
