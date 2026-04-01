const express = require('express');
const router = express.Router();
const EvenementParticipantsController = require('../controllers/EvenementParticipantsController');
const { authenticate } = require('../middleware/auth');

// Routes pour les participants aux événements
router.get('/:id/participants', authenticate, EvenementParticipantsController.getByEvenement);
router.post('/:id/participants', authenticate, EvenementParticipantsController.saveParticipants);
router.delete('/participants/:id', authenticate, EvenementParticipantsController.removeParticipant);

module.exports = router;

