const express = require('express');
const router = express.Router();
const SeminaireFormationController = require('../controllers/SeminaireFormationController');
const { authenticate } = require('../middleware/auth');

// Routes pour les séminaires de formation
router.get('/', authenticate, SeminaireFormationController.getAll);
router.get('/statistics', authenticate, SeminaireFormationController.getStatistics);
router.get('/search', authenticate, SeminaireFormationController.search);
router.get('/agent/:agentId', authenticate, SeminaireFormationController.getByAgent);
router.get('/:id', authenticate, SeminaireFormationController.getById);
router.post('/', authenticate, SeminaireFormationController.create);
router.put('/:id', authenticate, SeminaireFormationController.update);
router.delete('/:id', authenticate, SeminaireFormationController.delete);

module.exports = router;