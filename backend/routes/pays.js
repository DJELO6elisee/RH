const express = require('express');
const router = express.Router();
const PaysController = require('../controllers/PaysController');

const paysController = new PaysController();

// Routes CRUD de base
router.get('/', paysController.getAll.bind(paysController));
router.get('/:id', paysController.getById.bind(paysController));
router.post('/', paysController.createWithNationality.bind(paysController)); // Utiliser la nouvelle méthode liée
router.put('/:id', paysController.updateWithNationality.bind(paysController)); // Utiliser la nouvelle méthode liée
router.delete('/:id', paysController.delete.bind(paysController));
router.delete('/', paysController.deleteMultiple.bind(paysController));

// Routes spécifiques aux pays
router.get('/search/:term', paysController.searchByTerm.bind(paysController));
router.get('/select/all', paysController.getAllForSelect.bind(paysController));

module.exports = router;