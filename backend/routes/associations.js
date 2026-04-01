const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');
const { authenticate } = require('../middleware/auth');

const associationsController = new SimpleController('associations');

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Routes CRUD de base
router.get('/', associationsController.getAll.bind(associationsController));
router.get('/:id', associationsController.getById.bind(associationsController));
router.post('/', associationsController.create.bind(associationsController));
router.put('/:id', associationsController.update.bind(associationsController));
router.delete('/:id', associationsController.delete.bind(associationsController));
router.delete('/', associationsController.deleteMultiple.bind(associationsController));

// Routes spécifiques
router.get('/search/:term', associationsController.searchByTerm.bind(associationsController));
router.get('/select/all', associationsController.getAllForSelect.bind(associationsController));

module.exports = router;
