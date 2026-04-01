const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const { authenticate } = require('../middleware/auth');

const categoriesController = new CategoriesController();

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Routes CRUD de base
router.get('/', categoriesController.getAll.bind(categoriesController));
router.get('/:id', categoriesController.getById.bind(categoriesController));
router.post('/', categoriesController.create.bind(categoriesController));
router.put('/:id', categoriesController.update.bind(categoriesController));
router.delete('/:id', categoriesController.delete.bind(categoriesController));
router.delete('/', categoriesController.deleteMultiple.bind(categoriesController));

// Routes spécifiques aux catégories
router.get('/search/:term', categoriesController.searchByTerm.bind(categoriesController));
router.get('/select/all', categoriesController.getAllForSelect.bind(categoriesController));

module.exports = router;