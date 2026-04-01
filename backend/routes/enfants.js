const express = require('express');
const router = express.Router();
const EnfantsController = require('../controllers/EnfantsController');
const { authenticate } = require('../middleware/auth');

const enfantsController = new EnfantsController();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Routes CRUD de base
router.get('/', enfantsController.getAll.bind(enfantsController));
router.post('/', enfantsController.create.bind(enfantsController));

// Routes spécifiques (doivent être avant les routes avec :id)
router.get('/agent/:agentId', enfantsController.getByAgent.bind(enfantsController));

// Routes avec ID (doivent être après les routes spécifiques)
router.get('/:id', enfantsController.getById.bind(enfantsController));
router.put('/:id', enfantsController.update.bind(enfantsController));
router.delete('/:id', enfantsController.delete.bind(enfantsController));

module.exports = router;
