const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const nature_actesController = new SimpleController('nature_actes');

// Routes CRUD de base
router.get('/', nature_actesController.getAll.bind(nature_actesController));
router.get('/:id', nature_actesController.getById.bind(nature_actesController));
router.post('/', nature_actesController.create.bind(nature_actesController));
router.put('/:id', nature_actesController.update.bind(nature_actesController));
router.delete('/:id', nature_actesController.delete.bind(nature_actesController));
router.delete('/', nature_actesController.deleteMultiple.bind(nature_actesController));

// Routes spécifiques
router.get('/search/:term', nature_actesController.searchByTerm.bind(nature_actesController));
router.get('/select/all', nature_actesController.getAllForSelect.bind(nature_actesController));

module.exports = router;
