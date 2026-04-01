const express = require('express');
const router = express.Router();
const agentAuthController = require('../controllers/AgentAuthController');

// Authentification d'un agent avec code de connexion
router.post('/login', agentAuthController.loginWithCode.bind(agentAuthController));

// Générer un nouveau code de connexion
router.post('/generate-code', agentAuthController.generateNewCode.bind(agentAuthController));

// Vérifier le statut d'un agent
router.get('/status/:matricule', agentAuthController.getAgentStatus.bind(agentAuthController));

// Nettoyer les codes expirés (admin)
router.post('/cleanup-codes', agentAuthController.cleanupExpiredCodes.bind(agentAuthController));

// Récupérer les statistiques des codes (admin)
router.get('/stats', agentAuthController.getCodeStats.bind(agentAuthController));

module.exports = router;