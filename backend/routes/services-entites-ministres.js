const express = require('express');
const router = express.Router();
const ServicesEntitesMinistresController = require('../controllers/ServicesEntitesMinistresController');

// Routes CRUD de base
router.get('/', ServicesEntitesMinistresController.getAll);
router.get('/:id', ServicesEntitesMinistresController.getById);
router.post('/', ServicesEntitesMinistresController.create);
router.put('/:id', ServicesEntitesMinistresController.update);
router.delete('/:id', ServicesEntitesMinistresController.delete);

module.exports = router;