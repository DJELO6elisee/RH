const express = require('express');
const router = express.Router();
const categoriesAgentsController = require('../controllers/CategoriesAgentsController');
const { authenticate } = require('../middleware/auth');

// Routes pour les catégories des agents
router.get('/agents', authenticate, categoriesAgentsController.getAllWithAgentInfo);
router.get('/agent/:agentId', authenticate, categoriesAgentsController.getByAgent);
router.post('/', authenticate, categoriesAgentsController.create);
router.get('/:id', authenticate, categoriesAgentsController.getById);
router.put('/:id', authenticate, categoriesAgentsController.update);
router.delete('/:id', authenticate, categoriesAgentsController.delete);

module.exports = router;

