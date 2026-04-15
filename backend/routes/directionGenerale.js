/**
 * Routes pour la gestion des Directions Générales
 * 
 * Routes disponibles:
 * - GET    /api/directions-generales                    - Toutes les directions générales
 * - GET    /api/directions-generales/:id                - Une direction générale par ID
 * - POST   /api/directions-generales                    - Créer une direction générale
 * - PUT    /api/directions-generales/:id                - Modifier une direction générale
 * - DELETE /api/directions-generales/:id                - Supprimer une direction générale
 * - GET    /api/directions-generales/:id/directions     - Directions d'une DG
 * - GET    /api/directions-generales/:id/agents         - Agents d'une DG
 * - GET    /api/directions-generales/statistiques/overview - Statistiques globales
 */

const express = require('express');
const router = express.Router();
const directionGeneraleController = require('../controllers/directionGeneraleController');
const { authenticate } = require('../middleware/auth');

// ============================================================================
// Routes publiques (si nécessaire - à adapter selon vos besoins)
// ============================================================================

// Si vous voulez que certaines routes soient accessibles sans authentification
// Décommentez les lignes ci-dessous
// router.get('/', directionGeneraleController.getAllDirectionsGenerales);
// router.get('/:id', directionGeneraleController.getDirectionGeneraleById);

// ============================================================================
// Routes protégées (authentification requise)
// ============================================================================

// Statistiques - Doit être avant /:id pour éviter les conflits de routing
router.get(
    '/statistiques/overview',
    authenticate,
    directionGeneraleController.getStatistiques
);

// CRUD de base
router.get(
    '/select/all',
    authenticate,
    directionGeneraleController.getAllForSelect
);

router.get(
    '/',
    authenticate,
    directionGeneraleController.getAllDirectionsGenerales
);

router.get(
    '/:id',
    authenticate,
    directionGeneraleController.getDirectionGeneraleById
);

router.post(
    '/',
    authenticate,
    directionGeneraleController.createDirectionGenerale
);

router.put(
    '/:id',
    authenticate,
    directionGeneraleController.updateDirectionGenerale
);

router.delete(
    '/:id',
    authenticate,
    directionGeneraleController.deleteDirectionGenerale
);

// Relations
router.get(
    '/:id/directions',
    authenticate,
    directionGeneraleController.getDirectionsByDirectionGenerale
);

router.get(
    '/:id/agents',
    authenticate,
    directionGeneraleController.getAgentsByDirectionGenerale
);

// ============================================================================
// Routes avec permissions spécifiques (à adapter selon votre système)
// ============================================================================

/*
// Exemple avec middleware de vérification de rôle
const checkRole = require('../middleware/checkRole');

// Seulement les admins peuvent créer
router.post(
  '/', 
  auth, 
  checkRole(['admin', 'super_admin']),
  directionGeneraleController.createDirectionGenerale
);

// Seulement les admins peuvent modifier
router.put(
  '/:id', 
  auth, 
  checkRole(['admin', 'super_admin']),
  directionGeneraleController.updateDirectionGenerale
);

// Seulement les super admins peuvent supprimer
router.delete(
  '/:id', 
  auth, 
  checkRole(['super_admin']),
  directionGeneraleController.deleteDirectionGenerale
);
*/

module.exports = router;