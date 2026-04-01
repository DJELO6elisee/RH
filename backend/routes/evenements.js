const express = require('express');
const router = express.Router();
const EvenementsController = require('../controllers/EvenementsController');
const { authenticate } = require('../middleware/auth');

// Routes pour les événements
router.get('/', authenticate, EvenementsController.getAll);
router.get('/:id', authenticate, EvenementsController.getById);
router.post('/', authenticate, EvenementsController.create);
router.put('/:id', authenticate, EvenementsController.update);
router.delete('/:id', authenticate, EvenementsController.delete);

module.exports = router;

