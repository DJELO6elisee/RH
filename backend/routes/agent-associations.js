const express = require('express');
const router = express.Router();
const AgentAssociationsController = require('../controllers/AgentAssociationsController');
const { authenticate } = require('../middleware/auth');
const { uploadAssociationAttestation } = require('../middleware/upload');

// Routes pour la gestion des associations des agents
router.get('/agent/:agentId', authenticate, AgentAssociationsController.getByAgent);
router.get('/agents', authenticate, AgentAssociationsController.getAllWithAgentInfo);
router.get('/:id/attestation', authenticate, AgentAssociationsController.serveAttestationFile);
router.get('/:id', authenticate, AgentAssociationsController.getById);
router.post('/', authenticate, uploadAssociationAttestation, AgentAssociationsController.create);
router.put('/:id', authenticate, uploadAssociationAttestation, AgentAssociationsController.update);
router.delete('/:id', authenticate, AgentAssociationsController.delete);

module.exports = router;
