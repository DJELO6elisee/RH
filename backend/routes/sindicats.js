const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');
const { authenticate } = require('../middleware/auth');

const sindicatsController = new SimpleController('sindicats');

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Routes CRUD de base
router.get('/', sindicatsController.getAll.bind(sindicatsController));
router.get('/:id', sindicatsController.getById.bind(sindicatsController));
router.post('/', sindicatsController.create.bind(sindicatsController));
router.put('/:id', sindicatsController.update.bind(sindicatsController));
router.delete('/:id', sindicatsController.delete.bind(sindicatsController));
router.delete('/', sindicatsController.deleteMultiple.bind(sindicatsController));

// Routes spécifiques
router.get('/search/:term', sindicatsController.searchByTerm.bind(sindicatsController));
router.get('/select/all', sindicatsController.getAllForSelect.bind(sindicatsController));

module.exports = router;
