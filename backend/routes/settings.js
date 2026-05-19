const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/SettingsController');
const { authenticate, requireRole } = require('../middleware/auth');

// Récupérer les couleurs du thème (Public pour la page de login)
router.get('/colors', SettingsController.getColors);

// Récupérer toutes les configurations (accessible à tous les utilisateurs connectés pour appliquer le thème)
router.get('/', authenticate, SettingsController.getSettings);

// Mettre à jour une configuration (réservé aux informaticiens et super_admin)
router.post('/', authenticate, requireRole(['informaticien', 'super_admin']), SettingsController.updateSettings);

// Mettre à jour plusieurs configurations (réservé aux informaticiens et super_admin)
router.post('/multiple', authenticate, requireRole(['informaticien', 'super_admin']), SettingsController.updateMultipleSettings);

module.exports = router;
