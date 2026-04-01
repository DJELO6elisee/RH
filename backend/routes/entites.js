const express = require('express');
const router = express.Router();
const EntitesController = require('../controllers/EntitesController');

const entitesController = new EntitesController();

// Routes CRUD de base
router.get('/', entitesController.getAllWithMinistere.bind(entitesController));
router.get('/:id', entitesController.getById.bind(entitesController));
router.get('/:id/details', entitesController.getByIdWithDetails.bind(entitesController));
router.post('/', entitesController.create.bind(entitesController));
router.put('/:id', entitesController.update.bind(entitesController));
router.delete('/:id', entitesController.delete.bind(entitesController));

// Routes spécifiques
router.get('/types/list', entitesController.getTypesEntites.bind(entitesController));
router.get('/ministere/:id_ministere', entitesController.getAllWithMinistere.bind(entitesController));
router.get('/stats/total', entitesController.getTotalCount.bind(entitesController));

module.exports = router;