const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const situation_matrimonialsController = new SimpleController('situation_matrimonials');

// Routes CRUD de base
router.get('/', situation_matrimonialsController.getAll.bind(situation_matrimonialsController));
router.get('/:id', situation_matrimonialsController.getById.bind(situation_matrimonialsController));
router.post('/', situation_matrimonialsController.create.bind(situation_matrimonialsController));
router.put('/:id', situation_matrimonialsController.update.bind(situation_matrimonialsController));
router.delete('/:id', situation_matrimonialsController.delete.bind(situation_matrimonialsController));
router.delete('/', situation_matrimonialsController.deleteMultiple.bind(situation_matrimonialsController));

// Routes spécifiques
router.get('/search/:term', situation_matrimonialsController.searchByTerm.bind(situation_matrimonialsController));
router.get('/select/all', situation_matrimonialsController.getAllForSelect.bind(situation_matrimonialsController));

module.exports = router;
