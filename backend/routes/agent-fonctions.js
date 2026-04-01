const express = require('express');
const router = express.Router();
const AgentFonctionsController = require('../controllers/AgentFonctionsController');
const { authenticate } = require('../middleware/auth');

// Routes pour la gestion des fonctions des agents
router.get('/agent/:agentId', authenticate, AgentFonctionsController.getByAgent);
router.get('/agents', authenticate, AgentFonctionsController.getAllWithAgentInfo);
router.get('/:id', authenticate, AgentFonctionsController.getById);
router.post('/', authenticate, AgentFonctionsController.create);
router.put('/:id', authenticate, AgentFonctionsController.update);
router.delete('/:id', authenticate, AgentFonctionsController.delete);

module.exports = router;