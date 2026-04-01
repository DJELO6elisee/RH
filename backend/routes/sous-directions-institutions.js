const express = require('express');
const router = express.Router();
const sousDirectionsInstitutionsController = require('../controllers/SousDirectionsInstitutionsController');
const { authenticate } = require('../middleware/auth');

// Routes sans paramètres (en premier)
router.get('/', authenticate, sousDirectionsInstitutionsController.getAll.bind(sousDirectionsInstitutionsController));
router.post('/', authenticate, sousDirectionsInstitutionsController.create.bind(sousDirectionsInstitutionsController));

// Route pour sélection (sans pagination)
router.get('/select/all', authenticate, sousDirectionsInstitutionsController.getAllForSelect.bind(sousDirectionsInstitutionsController));

// Routes avec paramètres (en dernier)
router.get('/:id', authenticate, sousDirectionsInstitutionsController.getById.bind(sousDirectionsInstitutionsController));
router.put('/:id', authenticate, sousDirectionsInstitutionsController.update.bind(sousDirectionsInstitutionsController));
router.delete('/:id', authenticate, sousDirectionsInstitutionsController.delete.bind(sousDirectionsInstitutionsController));

module.exports = router;

