const express = require('express');
const router = express.Router();
const GradesAgentsController = require('../controllers/GradesAgentsController');
const { authenticate } = require('../middleware/auth');

// Routes pour la gestion des grades des agents
router.get('/agent/:agentId', authenticate, GradesAgentsController.getByAgent);
router.get('/agents', authenticate, GradesAgentsController.getAllWithAgentInfo);
router.get('/:id', authenticate, GradesAgentsController.getById);
router.post('/', authenticate, GradesAgentsController.create);
router.put('/:id', authenticate, GradesAgentsController.update);
router.delete('/:id', authenticate, GradesAgentsController.delete);

module.exports = router;

