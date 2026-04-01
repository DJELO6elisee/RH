const express = require('express');
const router = express.Router();
const EmploiAgentsController = require('../controllers/EmploiAgentsController');
const { authenticate } = require('../middleware/auth');

// Routes pour la gestion des emplois des agents
router.get('/agent/:agentId', authenticate, EmploiAgentsController.getByAgent);
router.get('/agents', authenticate, EmploiAgentsController.getAllWithAgentInfo);
router.get('/:id', authenticate, EmploiAgentsController.getById);
router.post('/', authenticate, EmploiAgentsController.create);
router.put('/:id', authenticate, EmploiAgentsController.update);
router.delete('/:id', authenticate, EmploiAgentsController.delete);

module.exports = router;
