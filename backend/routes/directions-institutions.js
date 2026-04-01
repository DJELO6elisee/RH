const express = require('express');
const router = express.Router();
const directionsInstitutionsController = require('../controllers/DirectionsInstitutionsController');
const { authenticate } = require('../middleware/auth');

// Routes sans paramètres (en premier)
router.get('/', authenticate, directionsInstitutionsController.getAll.bind(directionsInstitutionsController));
router.post('/', authenticate, directionsInstitutionsController.create.bind(directionsInstitutionsController));

// Route pour sélection (sans pagination)
router.get('/select/all', authenticate, directionsInstitutionsController.getAllForSelect.bind(directionsInstitutionsController));

// Routes avec paramètres (en dernier)
router.get('/:id', authenticate, directionsInstitutionsController.getById.bind(directionsInstitutionsController));
router.put('/:id', authenticate, directionsInstitutionsController.update.bind(directionsInstitutionsController));
router.delete('/:id', authenticate, directionsInstitutionsController.delete.bind(directionsInstitutionsController));

// Route pour les agents d'une direction
router.get('/:id/agents', authenticate, directionsInstitutionsController.getAgentsByDirection.bind(directionsInstitutionsController));

module.exports = router;

