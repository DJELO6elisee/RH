const express = require('express');
const router = express.Router();
const AgentEmploisController = require('../controllers/AgentEmploisController');
const { authenticate } = require('../middleware/auth');

// Routes pour la gestion des emplois des agents
router.get('/agent/:agentId', authenticate, AgentEmploisController.getByAgent);
router.get('/agents', authenticate, AgentEmploisController.getAllWithAgentInfo);
router.get('/:id', authenticate, AgentEmploisController.getById);
router.post('/', authenticate, AgentEmploisController.create);
router.put('/:id', authenticate, AgentEmploisController.update);
router.delete('/:id', authenticate, AgentEmploisController.delete);

module.exports = router;