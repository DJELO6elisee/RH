const express = require('express');
const router = express.Router();
const CivilitesController = require('../controllers/CivilitesController');
const { authenticate } = require('../middleware/auth');

const civilitesController = new CivilitesController();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Routes CRUD de base
router.get('/', civilitesController.getAll.bind(civilitesController));
router.get('/:id', civilitesController.getById.bind(civilitesController));
router.post('/', civilitesController.create.bind(civilitesController));
router.put('/:id', civilitesController.update.bind(civilitesController));
router.delete('/:id', civilitesController.delete.bind(civilitesController));
router.delete('/', civilitesController.deleteMultiple.bind(civilitesController));

// Routes spécifiques aux civilités
router.get('/search/:term', civilitesController.searchByTerm.bind(civilitesController));
router.get('/select/all', civilitesController.getAllForSelect.bind(civilitesController));

module.exports = router;