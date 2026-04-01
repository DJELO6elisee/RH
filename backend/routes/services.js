const express = require('express');
const router = express.Router();
const ServicesController = require('../controllers/ServicesController');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Validation pour la création d'un service
const createServiceValidation = [
    body('id_ministere')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID du ministère doit être un entier positif'),
    body('id_entite')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID de l\'entité doit être un entier positif'),
    body('libelle')
    .trim()
    .notEmpty()
    .withMessage('Le libellé est requis')
    .isLength({ min: 2, max: 255 })
    .withMessage('Le libellé doit contenir entre 2 et 255 caractères'),
    body('type_service')
    .optional({ checkFalsy: true })
    .isIn(['direction', 'sous_direction'])
    .withMessage('Le type de service doit être "direction" ou "sous_direction"'),
    body('direction_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID de la direction doit être un entier positif'),
    body('sous_direction_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID de la sous-direction doit être un entier positif'),
    body('responsable_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID du responsable doit être un entier positif'),
    body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La description ne peut pas dépasser 1000 caractères'),
    body('is_active')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('Le statut actif doit être un booléen')
];

// Validation pour la mise à jour d'un service
const updateServiceValidation = [
    param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID du service doit être un entier positif'),
    body('id_ministere')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID du ministère doit être un entier positif'),
    body('id_entite')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID de l\'entité doit être un entier positif'),
    body('libelle')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Le libellé doit contenir entre 2 et 255 caractères'),
    body('type_service')
    .optional({ checkFalsy: true })
    .isIn(['direction', 'sous_direction'])
    .withMessage('Le type de service doit être "direction" ou "sous_direction"'),
    body('direction_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID de la direction doit être un entier positif'),
    body('sous_direction_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID de la sous-direction doit être un entier positif'),
    body('responsable_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('L\'ID du responsable doit être un entier positif'),
    body('description')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La description ne peut pas dépasser 1000 caractères'),
    body('is_active')
    .optional({ checkFalsy: true })
    .isBoolean()
    .withMessage('Le statut actif doit être un booléen')
];

// Validation pour les paramètres de requête
const queryValidation = [
    query('id_ministere')
    .optional()
    .isInt({ min: 1 })
    .withMessage('L\'ID du ministère doit être un entier positif'),
    query('id_entite')
    .optional()
    .isInt({ min: 1 })
    .withMessage('L\'ID de l\'entité doit être un entier positif'),
    query('direction_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('L\'ID de la direction doit être un entier positif'),
    query('sous_direction_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('L\'ID de la sous-direction doit être un entier positif'),
    query('type_service')
    .optional()
    .isIn(['direction', 'sous_direction'])
    .withMessage('Le type de service doit être "direction" ou "sous_direction"'),
    query('is_active')
    .optional()
    .isBoolean()
    .withMessage('Le statut actif doit être un booléen'),
    query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le numéro de page doit être un entier positif'),
    query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être un entier entre 1 et 100')
];

// Validation pour les paramètres d'ID
const idValidation = [
    param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID doit être un entier positif')
];

// Routes pour les services

// GET /api/services - Récupérer tous les services
router.get('/', queryValidation, ServicesController.getAllServices);

// GET /api/services/select/all - Récupérer tous les services pour les listes déroulantes
router.get('/select/all', queryValidation, ServicesController.getAllForSelect);

// GET /api/services/stats - Statistiques des services
router.get('/stats', queryValidation, ServicesController.getServicesStats);

// GET /api/services/:id - Récupérer un service par ID
router.get('/:id', idValidation, ServicesController.getServiceById);

// GET /api/services/:id/agents - Récupérer les agents d'un service
router.get('/:id/agents', [
    ...idValidation,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], ServicesController.getServiceAgents);

// POST /api/services - Créer un nouveau service
router.post('/', createServiceValidation, ServicesController.createService);

// PUT /api/services/:id - Mettre à jour un service
router.put('/:id', updateServiceValidation, ServicesController.updateService);

// DELETE /api/services/:id - Supprimer un service
router.delete('/:id', idValidation, ServicesController.deleteService);

module.exports = router;