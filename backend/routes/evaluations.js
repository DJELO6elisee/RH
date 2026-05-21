const express = require('express');
const router = express.Router();
const EvaluationsController = require('../controllers/EvaluationsController');
const { authenticate } = require('../middleware/auth');

const evaluationsController = new EvaluationsController();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Routes CRUD
router.get('/', evaluationsController.getAll.bind(evaluationsController));
router.get('/:id', evaluationsController.getById.bind(evaluationsController));
router.post('/', evaluationsController.create.bind(evaluationsController));
router.put('/:id', evaluationsController.update.bind(evaluationsController));
router.delete('/:id', evaluationsController.delete.bind(evaluationsController));
router.delete('/', evaluationsController.deleteMultiple.bind(evaluationsController));

module.exports = router;
