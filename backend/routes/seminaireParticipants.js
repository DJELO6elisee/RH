const express = require('express');
const router = express.Router();
const SeminaireParticipantsController = require('../controllers/SeminaireParticipantsController');
const { authenticate } = require('../middleware/auth');

// Routes pour les participants aux séminaires
// IMPORTANT: Les routes spécifiques doivent être définies AVANT les routes avec paramètres génériques
// pour éviter les conflits de routage

// Route pour récupérer les séminaires d'un agent - DOIT être avant les autres routes avec paramètres
// Utiliser une fonction wrapper pour s'assurer que la méthode statique est bien appelée
router.get('/agent/:agentId', authenticate, (req, res) => {
    SeminaireParticipantsController.getByAgent(req, res).catch(error => {
        console.error('Erreur dans getByAgent:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des séminaires de l\'agent',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    });
});

// Autres routes
router.get('/seminaire/:seminaireId', authenticate, SeminaireParticipantsController.getBySeminaire);
router.get('/seminaire/:seminaireId/statistics', authenticate, SeminaireParticipantsController.getStatistics);
router.get('/available-agents/:seminaireId', authenticate, SeminaireParticipantsController.getAvailableAgents);
router.post('/seminaire/:seminaireId', authenticate, SeminaireParticipantsController.addParticipant);
router.put('/:participantId', authenticate, SeminaireParticipantsController.updateParticipant);
router.delete('/:participantId', authenticate, SeminaireParticipantsController.removeParticipant);

module.exports = router;