const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const echelonsController = new SimpleController('echelons');

// Routes CRUD de base
router.get('/', echelonsController.getAll.bind(echelonsController));
router.get('/:id', echelonsController.getById.bind(echelonsController));
router.post('/', echelonsController.create.bind(echelonsController));
router.put('/:id', echelonsController.update.bind(echelonsController));
router.delete('/:id', echelonsController.delete.bind(echelonsController));
router.delete('/', echelonsController.deleteMultiple.bind(echelonsController));

// Routes spécifiques
router.get('/search/:term', echelonsController.searchByTerm.bind(echelonsController));
router.get('/select/all', echelonsController.getAllForSelect.bind(echelonsController));

module.exports = router;