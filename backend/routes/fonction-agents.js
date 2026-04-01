const express = require('express');
const router = express.Router();
const FonctionAgentsController = require('../controllers/FonctionAgentsController');
const { authenticate } = require('../middleware/auth');

// Routes pour la gestion des fonctions des agents
router.get('/agent/:agentId', authenticate, FonctionAgentsController.getByAgent);
router.get('/agents', authenticate, FonctionAgentsController.getAllWithAgentInfo);
router.get('/:id', authenticate, FonctionAgentsController.getById);
router.post('/', authenticate, FonctionAgentsController.create);
router.put('/:id', authenticate, FonctionAgentsController.update);
router.delete('/:id', authenticate, FonctionAgentsController.delete);

module.exports = router;