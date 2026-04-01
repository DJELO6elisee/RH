const express = require('express');
const router = express.Router();
const EchelonsAgentsController = require('../controllers/EchelonsAgentsController');
const { authenticate } = require('../middleware/auth');

// Routes pour la gestion des échelons des agents
router.get('/agent/:agentId', authenticate, EchelonsAgentsController.getByAgent);
router.get('/agents', authenticate, EchelonsAgentsController.getAllWithAgentInfo);
router.get('/:id', authenticate, EchelonsAgentsController.getById);
router.post('/', authenticate, EchelonsAgentsController.create);
router.put('/:id', authenticate, EchelonsAgentsController.update);
router.delete('/:id', authenticate, EchelonsAgentsController.delete);

module.exports = router;

