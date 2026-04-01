const express = require('express');
const router = express.Router();
const institutionsController = require('../controllers/InstitutionsController');

// Routes pour les institutions
router.get('/', institutionsController.getAll);
router.get('/:id', institutionsController.getById);
router.post('/', institutionsController.create);
router.put('/:id', institutionsController.update);
router.delete('/:id', institutionsController.delete);

// Route pour récupérer la hiérarchie des entités d'une institution
router.get('/:id/hierarchy', institutionsController.getHierarchy);

module.exports = router;