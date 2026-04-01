const express = require('express');
const router = express.Router();
const SimpleController = require('../controllers/SimpleController');

const autre_absencesController = new SimpleController('autre_absences');

// Routes CRUD de base
router.get('/', autre_absencesController.getAll.bind(autre_absencesController));
router.get('/:id', autre_absencesController.getById.bind(autre_absencesController));
router.post('/', autre_absencesController.create.bind(autre_absencesController));
router.put('/:id', autre_absencesController.update.bind(autre_absencesController));
router.delete('/:id', autre_absencesController.delete.bind(autre_absencesController));
router.delete('/', autre_absencesController.deleteMultiple.bind(autre_absencesController));

// Routes spécifiques
router.get('/search/:term', autre_absencesController.searchByTerm.bind(autre_absencesController));
router.get('/select/all', autre_absencesController.getAllForSelect.bind(autre_absencesController));

module.exports = router;
