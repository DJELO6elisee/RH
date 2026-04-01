const express = require('express');
const router = express.Router();
const GradesController = require('../controllers/GradesController');

const gradesController = new GradesController();

// Récupérer tous les grades avec informations de catégorie
router.get('/', gradesController.getAll.bind(gradesController));

// Récupérer un grade par ID
router.get('/:id', gradesController.getById.bind(gradesController));

// Créer un nouveau grade
router.post('/', gradesController.create.bind(gradesController));

// Mettre à jour un grade
router.put('/:id', gradesController.update.bind(gradesController));

// Supprimer un grade
router.delete('/:id', gradesController.delete.bind(gradesController));

// Récupérer les grades par catégorie
router.get('/categorie/:categorieId', gradesController.getByCategorie.bind(gradesController));

// Obtenir tous les grades pour les listes déroulantes
router.get('/select/all', gradesController.getAllForSelect.bind(gradesController));

module.exports = router;