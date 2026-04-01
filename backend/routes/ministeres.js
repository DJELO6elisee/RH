const express = require('express');
const router = express.Router();
const MinisteresController = require('../controllers/MinisteresController');
const { authenticate, requireRole } = require('../middleware/auth');

const ministeresController = new MinisteresController();

// Middleware pour restreindre la création et suppression aux super_admin uniquement
const requireSuperAdmin = requireRole(['super_admin']);

// Routes CRUD de base
router.get('/', ministeresController.getAllWithEntites.bind(ministeresController));
router.get('/:id', ministeresController.getByIdWithDetails.bind(ministeresController));
router.post('/', authenticate, requireSuperAdmin, ministeresController.create.bind(ministeresController));
router.put('/:id', authenticate, ministeresController.update.bind(ministeresController));
router.delete('/:id', authenticate, requireSuperAdmin, ministeresController.delete.bind(ministeresController));

// Routes spécifiques
router.get('/stats/global', ministeresController.getGlobalStats.bind(ministeresController));

// Routes pour les entités d'un ministère
router.get('/:id/entites', ministeresController.getAllWithEntites.bind(ministeresController));
router.get('/:id/hierarchy', ministeresController.getHierarchy.bind(ministeresController));

module.exports = router;