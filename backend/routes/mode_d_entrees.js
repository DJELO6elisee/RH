const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const mode_d_entreesController = new SimpleController('mode_d_entrees');

// Routes CRUD de base
router.get('/', mode_d_entreesController.getAll.bind(mode_d_entreesController));
router.get('/:id', mode_d_entreesController.getById.bind(mode_d_entreesController));
router.post('/', mode_d_entreesController.create.bind(mode_d_entreesController));
router.put('/:id', mode_d_entreesController.update.bind(mode_d_entreesController));
router.delete('/:id', mode_d_entreesController.delete.bind(mode_d_entreesController));
router.delete('/', mode_d_entreesController.deleteMultiple.bind(mode_d_entreesController));

// Routes spécifiques
router.get('/search/:term', mode_d_entreesController.searchByTerm.bind(mode_d_entreesController));
router.get('/select/all', mode_d_entreesController.getAllForSelect.bind(mode_d_entreesController));

module.exports = router;
