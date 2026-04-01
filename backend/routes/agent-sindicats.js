const express = require('express');
const router = express.Router();
const AgentSindicatsController = require('../controllers/AgentSindicatsController');
const { authenticate } = require('../middleware/auth');
const { uploadSindicatAttestation } = require('../middleware/upload');

// Routes pour la gestion des syndicats des agents
router.get('/agent/:agentId', authenticate, AgentSindicatsController.getByAgent);
router.get('/agents', authenticate, AgentSindicatsController.getAllWithAgentInfo);
router.get('/:id/attestation', authenticate, AgentSindicatsController.serveAttestationFile);
router.get('/:id', authenticate, AgentSindicatsController.getById);
router.post('/', authenticate, uploadSindicatAttestation, AgentSindicatsController.create);
router.put('/:id', authenticate, uploadSindicatAttestation, AgentSindicatsController.update);
router.delete('/:id', authenticate, AgentSindicatsController.delete);

module.exports = router;
