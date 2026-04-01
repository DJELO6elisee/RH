const express = require('express');
const router = express.Router();
const DirectionsController = require('../controllers/DirectionsController');
const { authenticate } = require('../middleware/auth');

const directionsController = new DirectionsController();

router.get('/', authenticate, directionsController.getAll.bind(directionsController));
router.get('/select/all', authenticate, directionsController.getAllForSelect.bind(directionsController));
router.get('/:id/directeurs', authenticate, directionsController.getDirecteursByDirection.bind(directionsController));
router.get('/:id/agents', authenticate, directionsController.getAgentsByDirection.bind(directionsController));
router.get('/:id', authenticate, directionsController.getById.bind(directionsController));
router.post('/', authenticate, directionsController.create.bind(directionsController));
router.put('/:id', authenticate, directionsController.update.bind(directionsController));
router.delete('/:id', authenticate, directionsController.delete.bind(directionsController));

module.exports = router;