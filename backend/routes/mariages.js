const express = require('express');
const router = express.Router();
const MariagesController = require('../controllers/MariagesController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
const requireRoleOrAssigned = requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour la gestion des mariages
router.get('/', requireRoleOrAssigned, MariagesController.getAll);
router.put('/:id', requireRoleOrAssigned, MariagesController.update);
router.get('/agent/:agentId', requireRoleOrAssigned, MariagesController.getByAgent);

// Route pour tester manuellement l'envoi des notifications (DRH uniquement)
router.post('/test-notifications', requireRoleOrAssigned, async (req, res) => {
    try {
        // Vérifier que l'utilisateur est DRH
        if (req.user && req.user.role && req.user.role.toLowerCase() !== 'drh') {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Cette fonctionnalité est réservée au DRH.'
            });
        }

        const MariageNotificationService = require('../services/MariageNotificationService');
        const result = await MariageNotificationService.verifierEtEnvoyerNotifications();
        
        res.json({
            success: true,
            message: 'Notifications de mariage vérifiées et envoyées',
            result
        });
    } catch (error) {
        console.error('Erreur lors du test des notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi des notifications',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

