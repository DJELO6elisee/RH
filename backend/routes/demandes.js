const express = require('express');
const router = express.Router();
const DemandesController = require('../controllers/DemandesController');
const NotificationsController = require('../controllers/NotificationsController');
const { authenticate, requireRoleOrAssignedRoute } = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Middleware qui autorise les rôles privilégiés OU les agents avec la route assignée
// Inclut les rôles hiérarchiques pour la validation des demandes (directeur_service_exterieur = directeur d'une direction)
// Le rôle "ministre" doit aussi avoir accès à ces routes pour valider et consulter les demandes.
const requireRoleOrAssigned = requireRoleOrAssignedRoute([
    'super_admin',
    'DRH',
    'drh',
    'directeur_general',
    'directeur_central',
    'directeur',
    'directeur_service_exterieur',
    'sous_directeur',
    'chef_service',
    'dir_cabinet',
    'chef_cabinet',
    'inspecteur_general',
    'ministre'
]);

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Middleware de validation pour la création de demande
const validateCreateDemande = [
    body('type_demande').isIn(['absence', 'sortie_territoire', 'attestation_travail', 'attestation_presence', 'note_service', 'certificat_cessation', 'certificat_reprise_service', 'certificat_non_jouissance_conge', 'mutation', 'besoin_personnel']).withMessage('Type de demande invalide'),
    // Description optionnelle - validation plus permissive
    body('description').optional({ nullable: true, checkFalsy: false }).custom((value) => {
        if (value !== null && value !== undefined && typeof value !== 'string') {
            throw new Error('Description doit être une chaîne de caractères');
        }
        if (value && value.length > 1000) {
            throw new Error('Description trop longue (max 1000 caractères)');
        }
        return true;
    }),
    body('date_debut').optional().custom((value) => {
        if (value && value.trim() !== '') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Date de début invalide');
            }
        }
        return true;
    }),
    body('date_fin').optional().custom((value) => {
        if (value && value.trim() !== '') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Date de fin invalide');
            }
        }
        return true;
    }),
    body('lieu').optional().isString().isLength({ max: 255 }).withMessage('Lieu trop long'),
    body('priorite').optional().isIn(['normale', 'urgente', 'critique']).withMessage('Priorité invalide'),
    body('documents_joints').optional().isArray().withMessage('Documents joints doivent être un tableau'),
    // Validation optionnelle pour les champs de certificat de cessation
    body('agree_motif').optional().isString().isLength({ max: 500 }).withMessage('Motif de cessation trop long (max 500 caractères)'),
    body('agree_date_cessation').optional().custom((value) => {
        if (value && value.trim() !== '') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Date de cessation invalide');
            }
        }
        return true;
    }),
    // Validation optionnelle pour les champs de certificat de reprise de service
    body('date_reprise_service').optional().custom((value) => {
        if (value && value.trim() !== '') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Date de reprise de service invalide');
            }
        }
        return true;
    }),
    body('date_fin_conges').optional().custom((value) => {
        if (value && value.trim() !== '') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error('Date de fin de congés invalide');
            }
        }
        return true;
    }),
    // Validation optionnelle pour le champ année de non jouissance de congé
    body('annee_non_jouissance_conge').optional().custom((value) => {
        if (value !== null && value !== undefined && value !== '') {
            // Gérer à la fois les nombres et les chaînes
            const valueStr = typeof value === 'string' ? value.trim() : String(value);
            if (valueStr !== '') {
                const annee = parseInt(valueStr, 10);
                const anneeActuelle = new Date().getFullYear();
                if (isNaN(annee) || annee < 2000 || annee > anneeActuelle) {
                    throw new Error(`L'année doit être entre 2000 et ${anneeActuelle}`);
                }
            }
        }
        return true;
    }),
    // Année au titre de laquelle le congé est demandé (congé annuel - pour le numéro de décision sur le document)
    body('annee_au_titre_conge').optional().custom((value) => {
        if (value !== null && value !== undefined && value !== '') {
            const valueStr = typeof value === 'string' ? value.trim() : String(value);
            if (valueStr !== '') {
                const annee = parseInt(valueStr, 10);
                const anneeActuelle = new Date().getFullYear();
                if (isNaN(annee) || annee < anneeActuelle - 2 || annee > anneeActuelle) {
                    throw new Error(`L'année au titre du congé doit être entre ${anneeActuelle - 2} et ${anneeActuelle}`);
                }
            }
        }
        return true;
    })
];

// Middleware de validation pour la validation de demande
const validateValiderDemande = [
    body('action').optional().isIn(['approuve', 'rejete', 'valider']).withMessage('Action invalide'),
    body('commentaire').optional().isString().isLength({ max: 500 }).withMessage('Commentaire trop long')
];

// Routes pour les demandes (le préfixe '/api/demandes' est déjà monté dans server.js)
router.post('/', requireRoleOrAssigned, validateCreateDemande, (req, res) => {
    console.log('🔍 Route POST /api/demandes appelée');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user ? JSON.stringify(req.user, null, 2) : 'Non authentifié');

    // Vérifier les erreurs de validation
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Erreurs de validation détectées dans les routes:');
        errors.array().forEach((error, index) => {
            console.log(`${index + 1}. ${error.msg} (${error.param})`);
        });
        return res.status(400).json({
            success: false,
            error: 'Données invalides',
            details: errors.array()
        });
    }

    console.log('✅ Validation des routes réussie, appel du contrôleur...');
    DemandesController.createDemande(req, res);
});
router.get('/agent/:id_agent', requireRoleOrAssigned, (req, res) => DemandesController.getDemandesByAgent(req, res));
router.get('/en-attente/:id_validateur', requireRoleOrAssigned, (req, res) => DemandesController.getDemandesEnAttente(req, res));
router.get('/historique/:id_validateur', requireRoleOrAssigned, (req, res) => DemandesController.getHistoriqueDemandes(req, res));
router.get('/historiques-global', requireRoleOrAssigned, (req, res) => DemandesController.getDemandesHistoriqueGlobal(req, res));
router.get('/debug/:id_validateur', requireRoleOrAssigned, (req, res) => DemandesController.debugValidateur(req, res));
router.put('/:id_demande/valider', requireRoleOrAssigned, validateValiderDemande, (req, res) => DemandesController.validerDemande(req, res));
router.put('/:id_demande/satisfaire', requireRoleOrAssigned, (req, res) => DemandesController.satisfaireBesoin(req, res));
router.get('/:id_demande/historique', requireRoleOrAssigned, (req, res) => DemandesController.getHistoriqueDemande(req, res));
router.get('/statistiques/:id_agent', requireRoleOrAssigned, (req, res) => DemandesController.getStatistiquesDemandes(req, res));
router.get('/suivi/:id_agent', requireRoleOrAssigned, (req, res) => DemandesController.getDemandesSuivi(req, res));

// Route pour récupérer les détails d'une demande spécifique
router.get('/:id_demande', requireRoleOrAssigned, (req, res) => DemandesController.getDemandeById(req, res));

// Routes pour les filtres DRH
router.get('/agents/:id_validateur', requireRoleOrAssigned, (req, res) => DemandesController.getAgentsForFilter(req, res));
router.get('/services/:id_validateur', requireRoleOrAssigned, (req, res) => DemandesController.getServicesForFilter(req, res));

// Routes pour les notifications
router.get('/notifications/agent/:id_agent', requireRoleOrAssigned, (req, res) => NotificationsController.getNotificationsByAgent(req, res));
router.get('/notifications/:id_notification', requireRoleOrAssigned, (req, res) => NotificationsController.getNotificationById(req, res));
router.put('/notifications/:id_notification/lire', requireRoleOrAssigned, (req, res) => NotificationsController.marquerCommeLue(req, res));
router.put('/notifications/agent/:id_agent/toutes-lues', requireRoleOrAssigned, (req, res) => NotificationsController.marquerToutesCommeLues(req, res));
router.delete('/notifications/:id_notification', requireRoleOrAssigned, (req, res) => NotificationsController.supprimerNotification(req, res));
router.get('/notifications/agent/:id_agent/nombre-non-lues', requireRoleOrAssigned, (req, res) => NotificationsController.getNombreNotificationsNonLues(req, res));
router.get('/notifications/statistiques/:id_agent', requireRoleOrAssigned, (req, res) => NotificationsController.getStatistiquesNotifications(req, res));
router.post('/notifications', requireRoleOrAssigned, (req, res) => NotificationsController.creerNotification(req, res));
router.post('/notifications/note-service', requireRoleOrAssigned, (req, res) => NotificationsController.envoyerNoteService(req, res));

module.exports = router;