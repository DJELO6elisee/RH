const express = require('express');
const router = express.Router();
const SousDirectionsController = require('../controllers/SousDirectionsController');
const { body, param, query } = require('express-validator');
const { authenticate } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(authenticate);

// Validation pour la création d'une sous-direction
// optional({ values: 'null' }) pour accepter null (ex. pas d'entité ou pas de sous-directeur assigné)
const createSousDirectionValidation = [
    body('id_ministere')
    .isInt({ min: 1 })
    .withMessage('L\'ID du ministère doit être un entier positif'),
    body('id_entite')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID de l\'entité doit être un entier positif'),
    body('direction_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID de la direction doit être un entier positif'),
    body('libelle')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Le libellé doit contenir entre 2 et 255 caractères'),
    body('sous_directeur_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID du sous-directeur doit être un entier positif'),
    body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La description ne peut pas dépasser 1000 caractères')
];

// Validation pour la mise à jour d'une sous-direction
// optional({ values: 'null' }) : ne pas valider quand la valeur est null ou undefined (évite 400 si le front envoie null)
const updateSousDirectionValidation = [
    param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID de la sous-direction doit être un entier positif'),
    body('id_ministere')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID du ministère doit être un entier positif'),
    body('id_entite')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID de l\'entité doit être un entier positif'),
    body('direction_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID de la direction doit être un entier positif'),
    body('libelle')
    .optional({ values: 'null' })
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Le libellé doit contenir entre 2 et 255 caractères'),
    body('sous_directeur_id')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('L\'ID du sous-directeur doit être un entier positif'),
    body('description')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La description ne peut pas dépasser 1000 caractères'),
    body('is_active')
    .optional({ values: 'null' })
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

// Routes pour les sous-directions

// GET /api/sous-directions - Récupérer toutes les sous-directions
router.get('/', queryValidation, SousDirectionsController.getAllSousDirections);

// GET /api/sous-directions/select/all - Récupérer toutes les sous-directions pour les listes déroulantes
router.get('/select/all', queryValidation, SousDirectionsController.getAllForSelect);

// GET /api/sous-directions/stats - Statistiques des sous-directions
router.get('/stats', queryValidation, SousDirectionsController.getSousDirectionsStats);

// GET /api/sous-directions/:id - Récupérer une sous-direction par ID
router.get('/:id', idValidation, SousDirectionsController.getSousDirectionById);

// GET /api/sous-directions/:id/agents - Récupérer les agents d'une sous-direction
router.get('/:id/agents', [
    ...idValidation,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], SousDirectionsController.getSousDirectionAgents);

// POST /api/sous-directions - Créer une nouvelle sous-direction
router.post('/', createSousDirectionValidation, SousDirectionsController.createSousDirection);

// PUT /api/sous-directions/:id - Mettre à jour une sous-direction
router.put('/:id', updateSousDirectionValidation, SousDirectionsController.updateSousDirection);

// DELETE /api/sous-directions/:id - Supprimer une sous-direction
router.delete('/:id', idValidation, SousDirectionsController.deleteSousDirection);

module.exports = router;