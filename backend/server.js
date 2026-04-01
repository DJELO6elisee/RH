const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Configuration pour les proxies (requis pour les serveurs derrière un proxy/load balancer)
// En production, on fait confiance à tous les proxies pour éviter les problèmes de CORS
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    app.set('trust proxy', true); // Faire confiance à tous les proxies en production
    console.log('🔒 Mode production: trust proxy activé pour tous les proxies');
} else {
    app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
    console.log('🔓 Mode développement: trust proxy limité');
}

// Configuration CORS - Définir les origines autorisées AVANT les autres middlewares
const allowedOrigins = [
    'http://localhost:3000', // React frontend principal
    'http://localhost:3001', // Ministère Éducation
    'http://localhost:3002', // Ministère Santé (si créé)
    'http://localhost:3003', // Ministère Finances (si créé)
    'https://tourisme.2ise-groupe.com', // Production - Ministère Tourisme
    'http://tourisme.2ise-groupe.com', // Production - Ministère Tourisme (sans HTTPS)
    'http://sigrh-mtl.ci', // Production - SIGRH MTL
    'https://sigrh-mtl.ci', // Production - SIGRH MTL (HTTPS)
    process.env.CORS_ORIGIN // URL personnalisée depuis .env
].filter(Boolean); // Supprime les valeurs undefined

console.log('🌐 Origines CORS autorisées:', allowedOrigins);

// Fonction helper pour déterminer l'origine autorisée
function getAllowedOrigin(origin) {
    if (!origin) {
        return '*';
    }
    
    const isDevelopment = !isProduction;
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    
    // En développement, toujours autoriser localhost
    if (isDevelopment && isLocalhost) {
        return origin;
    }
    
    // Vérifier si l'origine est dans la liste autorisée
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.replace(/\/$/, '');
        return normalizedOrigin === normalizedAllowed;
    });
    
    if (isAllowed) {
        return origin;
    }
    
    // En développement, être permissif
    if (isDevelopment) {
        return origin;
    }
    
    // En production, retourner null si non autorisé
    return null;
}

// Middleware pour gérer les requêtes OPTIONS (preflight CORS) - DOIT être le PREMIER middleware
app.use((req, res, next) => {
    // Gérer les requêtes OPTIONS IMMÉDIATEMENT, avant tout autre traitement
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        
        console.log('🔍 OPTIONS preflight request:', {
            path: req.path,
            origin: origin,
            'access-control-request-method': req.headers['access-control-request-method'],
            'access-control-request-headers': req.headers['access-control-request-headers'],
            ip: req.ip,
            'x-forwarded-for': req.headers['x-forwarded-for']
        });
        
        // Déterminer l'origine autorisée
        const allowedOrigin = getAllowedOrigin(origin);
        
        if (!allowedOrigin) {
            console.warn('⚠️  OPTIONS: Origin non autorisé:', origin);
            // Même si non autorisé, on répond avec les headers pour éviter les erreurs CORS
            res.header('Access-Control-Allow-Origin', origin || '*');
        } else {
            res.header('Access-Control-Allow-Origin', allowedOrigin);
        }
        
        // TOUJOURS ajouter tous les headers CORS nécessaires
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Forwarded-For, x-motif-retrait');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Max-Age', '86400'); // 24 heures
        
        console.log('✅ OPTIONS: Headers CORS envoyés, origin:', allowedOrigin || origin);
        
        // Répondre immédiatement avec 200 (ou 204)
        return res.status(200).end();
    }
    
    // Logger les requêtes importantes pour debug
    if (req.path.includes('/api/auth') || req.path.includes('/api/ministeres')) {
        console.log('📥 Requête reçue:', {
            method: req.method,
            path: req.path,
            origin: req.headers.origin,
            ip: req.ip
        });
    }
    
    next();
});

// Middleware de sécurité avec configuration pour les images - CSP désactivé pour les routes d'images
app.use((req, res, next) => {
    // Désactiver CSP pour les routes d'images pour éviter les conflits CORS
    if (req.path.startsWith('/api/images/')) {
        return next();
    }

    // Appliquer Helmet pour les autres routes
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:", "http://localhost:5000", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https:"],
                fontSrc: ["'self'", "https:", "data:"],
                connectSrc: ["'self'", "http://localhost:5000", "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                manifestSrc: ["'self'"]
            }
        }
    })(req, res, next);
});

// Middleware CORS avec gestion améliorée
app.use(cors({
    origin: function(origin, callback) {
        // Permettre les requêtes sans origin (ex: applications mobiles, Postman, curl)
        if (!origin) {
            console.log('ℹ️  Requête sans origin (probablement application mobile ou outil de test)');
            return callback(null, true);
        }

        // Utiliser la même logique que getAllowedOrigin
        const allowedOrigin = getAllowedOrigin(origin);
        
        if (allowedOrigin && allowedOrigin !== '*') {
            // Origin autorisé
            callback(null, true);
        } else if (allowedOrigin === '*') {
            // Pas d'origine ou autorisé en wildcard
            callback(null, true);
        } else {
            // Origin non autorisé en production
            console.warn('⚠️  CORS: Origin non autorisé:', origin);
            console.log('📋 Origines autorisées:', allowedOrigins);
            // En production, on peut être strict, mais en dev on est permissif
            if (!isProduction) {
                callback(null, true);
            } else {
                callback(new Error(`Non autorisé par CORS. Origin: ${origin}`));
            }
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Forwarded-For', 'x-motif-retrait'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200, // Pour les anciens navigateurs
    preflightContinue: false // Ne pas continuer après OPTIONS, on l'a déjà géré
}));

// Middleware supplémentaire pour s'assurer que les headers CORS sont toujours présents
// Ce middleware garantit que les headers CORS sont présents même si le middleware cors() ne les a pas ajoutés
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Utiliser la même logique que getAllowedOrigin
    const allowedOrigin = getAllowedOrigin(origin);
    
    // Ajouter les headers CORS si une origine est autorisée ou si on est en développement
    if (allowedOrigin) {
        // Ne pas écraser les headers déjà définis par cors(), mais s'assurer qu'ils sont présents
        if (!res.get('Access-Control-Allow-Origin')) {
            res.header('Access-Control-Allow-Origin', allowedOrigin);
        }
        if (!res.get('Access-Control-Allow-Credentials')) {
            res.header('Access-Control-Allow-Credentials', 'true');
        }
        if (!res.get('Access-Control-Allow-Methods')) {
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        }
        if (!res.get('Access-Control-Allow-Headers')) {
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Forwarded-For, x-motif-retrait');
        }
    }
    
    next();
});

// Configuration Rate Limiting - Plus permissif pour le développement
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX) || 1000, // limite chaque IP à 1000 requêtes par minute
    message: {
        success: false,
        message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Ignorer les requêtes OPTIONS dans le rate limiting
    skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/', limiter);

// Middleware pour parser le JSON
// IMPORTANT: express.json() parse automatiquement les DELETE avec body si Content-Type est application/json
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const path = require('path');

// Servir les fichiers statiques (photos et documents) avec en-têtes CORS
const staticUploadsMiddleware = (req, res, next) => {
    // Ajouter les en-têtes CORS pour les fichiers statiques
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Ajouter des en-têtes pour le cache des images
    res.header('Cache-Control', 'public, max-age=31536000'); // Cache pour 1 an

    next();
};

const uploadsAbsolutePath = path.join(__dirname, 'uploads');

app.use('/uploads', staticUploadsMiddleware, express.static(uploadsAbsolutePath));
app.use('/api/uploads', staticUploadsMiddleware, express.static(uploadsAbsolutePath));

// Logging des requêtes
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes de base
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de Gestion des Ressources Humaines - Multi-Ministères',
        version: '2.0.0',
        endpoints: {
            auth: '/api/auth',
            ministeres: '/api/ministeres',
            entites: '/api/entites',
            agents: '/api/agents',
            grades: '/api/grades',
            civilites: '/api/civilites',
            nationalites: '/api/nationalites',
            fonctions: '/api/fonctions',
            emplois: '/api/emplois',
            echelons: '/api/echelons',
            specialites: '/api/specialites',
            langues: '/api/langues',
            niveau_langues: '/api/niveau_langues',
            motif_de_departs: '/api/motif_de_departs',
            type_de_conges: '/api/type_de_conges',
            autre_absences: '/api/autre_absences',
            distinctions: '/api/distinctions',
            type_etablissements: '/api/type_etablissements',
            unite_administratives: '/api/unite_administratives',
            diplomes: '/api/diplomes',
            type_d_agents: '/api/type_d_agents',
            type_de_materiels: '/api/type_de_materiels',
            type_de_destinations: '/api/type_de_destinations',
            nature_d_accidents: '/api/nature_d_accidents',
            sanctions: '/api/sanctions',
            sindicats: '/api/sindicats',
            type_de_couriers: '/api/type_de_couriers',
            nature_actes: '/api/nature_actes',
            localites: '/api/localites',
            regions: '/api/regions',
            departements: '/api/departements',
            situation_matrimonials: '/api/situation_matrimonials',
            mode_d_entrees: '/api/mode_d_entrees',
            positions: '/api/positions',
            pathologies: '/api/pathologies',
            handicaps: '/api/handicaps',
            niveau_informatiques: '/api/niveau_informatiques',
            logiciels: '/api/logiciels',
            type_de_retraites: '/api/type_de_retraites',
            enfants: '/api/enfants',
            type_de_seminaire_de_formation: '/api/type_de_seminaire_de_formation',
            seminaire_formation: '/api/seminaire-formation',
            seminaire_participants: '/api/seminaire-participants',
            type_de_documents: '/api/type_de_documents',
            tiers: '/api/tiers',
            services: '/api/services',
            sous_directions: '/api/sous-directions',
            dossiers: '/api/dossiers',
            classeurs: '/api/classeurs',
            categories: '/api/categories',
            pays: '/api/pays'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API en ligne',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Import des routes
const authRoutes = require('./routes/auth');
const authEntiteRoutes = require('./routes/auth-entite');
const ministeresRoutes = require('./routes/ministeres');
const institutionsRoutes = require('./routes/institutions');
const agentsInstitutionsRoutes = require('./routes/agents-institutions');
const enfantsInstitutionsRoutes = require('./routes/enfants-institutions');
const entitesInstitutionsRoutes = require('./routes/entites-institutions');
const servicesInstitutionsRoutes = require('./routes/services-institutions');
const typeSeminaireInstitutionsRoutes = require('./routes/type-seminaire-institutions');
const typeDocumentsInstitutionsRoutes = require('./routes/type-documents-institutions');
const tiersInstitutionsRoutes = require('./routes/tiers-institutions');
const dossiersInstitutionsRoutes = require('./routes/dossiers-institutions');
const classeursInstitutionsRoutes = require('./routes/classeurs-institutions');
const agentsEntitesInstitutionsRoutes = require('./routes/agents-entites-institutions');
const affectationsTemporairesInstitutionsRoutes = require('./routes/affectations-temporaires-institutions');
const permissionsEntitesInstitutionsRoutes = require('./routes/permissions-entites-institutions');
const directionsInstitutionsRoutes = require('./routes/directions-institutions');
const sousDirectionsInstitutionsRoutes = require('./routes/sous-directions-institutions');
const congesInstitutionsRoutes = require('./routes/conges-institutions');
const demandesInstitutionsRoutes = require('./routes/demandes-institutions');
const planningPrevisionnelInstitutionsRoutes = require('./routes/planning-previsionnel-institutions');
const signaturesRoutes = require('./routes/signatures');
const entitesRoutes = require('./routes/entites');
const civilitesRoutes = require('./routes/civilites');
const nationalitesRoutes = require('./routes/nationalites');
const fonctionsRoutes = require('./routes/fonctions');
const emploisRoutes = require('./routes/emplois');
const echelonsRoutes = require('./routes/echelons');
const specialitesRoutes = require('./routes/specialites');
const languesRoutes = require('./routes/langues');
const niveau_languesRoutes = require('./routes/niveau_langues');
const motif_de_departsRoutes = require('./routes/motif_de_departs');
const type_de_congesRoutes = require('./routes/type_de_conges');
const autre_absencesRoutes = require('./routes/autre_absences');
const distinctionsRoutes = require('./routes/distinctions');
const type_etablissementsRoutes = require('./routes/type_etablissements');
const unite_administrativesRoutes = require('./routes/unite_administratives');
const diplomesRoutes = require('./routes/diplomes');
const type_d_agentsRoutes = require('./routes/type_d_agents');
const type_de_materielsRoutes = require('./routes/type_de_materiels');
const type_de_destinationsRoutes = require('./routes/type_de_destinations');
const nature_d_accidentsRoutes = require('./routes/nature_d_accidents');
const sanctionsRoutes = require('./routes/sanctions');
const sindicatsRoutes = require('./routes/sindicats');
const type_de_couriersRoutes = require('./routes/type_de_couriers');
const nature_actesRoutes = require('./routes/nature_actes');
const localitesRoutes = require('./routes/localites');
const regionsRoutes = require('./routes/regions');
const departementsRoutes = require('./routes/departements');
const situation_matrimonialsRoutes = require('./routes/situation_matrimonials');
const mode_d_entreesRoutes = require('./routes/mode_d_entrees');
const positionsRoutes = require('./routes/positions');
const pathologiesRoutes = require('./routes/pathologies');
const handicapsRoutes = require('./routes/handicaps');
const niveau_informatiquesRoutes = require('./routes/niveau_informatiques');
const logicielsRoutes = require('./routes/logiciels');
const type_de_retraitesRoutes = require('./routes/type_de_retraites');
const enfantsRoutes = require('./routes/enfants');
const type_de_seminaire_de_formationRoutes = require('./routes/type_de_seminaire_de_formation');
const type_de_documentsRoutes = require('./routes/type_de_documents');
const tiersRoutes = require('./routes/tiers');
const directionsRoutes = require('./routes/directions');
const directionGeneraleRoutes = require('./routes/directionGenerale');
const servicesEntitesRoutes = require('./routes/services-entites');
const servicesEntitesMinistresRoutes = require('./routes/services-entites-ministres');
const dossiersRoutes = require('./routes/dossiers');
const classeursRoutes = require('./routes/classeurs');
const agentsRoutes = require('./routes/agents');
const agentAuthRoutes = require('./routes/agentAuth');
const gradesRoutes = require('./routes/grades');
const categoriesRoutes = require('./routes/categories');
const paysRoutes = require('./routes/pays');
const imagesRoutes = require('./routes/images');
const seminaireFormationRoutes = require('./routes/seminaireFormation');
const seminaireParticipantsRoutes = require('./routes/seminaireParticipants');
const evenementsRoutes = require('./routes/evenements');
const evenementParticipantsRoutes = require('./routes/evenementParticipants');
const agentFonctionsRoutes = require('./routes/agent-fonctions');
const agentEmploisRoutes = require('./routes/agent-emplois');
const fonctionAgentsRoutes = require('./routes/fonction-agents');
const emploiAgentsRoutes = require('./routes/emploi-agents');
const gradesAgentsRoutes = require('./routes/grades-agents');
const echelonsAgentsRoutes = require('./routes/echelons-agents');
const categoriesAgentsRoutes = require('./routes/categories-agents');
const agentAssociationsRoutes = require('./routes/agent-associations');
const agentSindicatsRoutes = require('./routes/agent-sindicats');
const associationsRoutes = require('./routes/associations');
const demandesRoutes = require('./routes/demandes');
const congesRoutes = require('./routes/conges');
const pdfRoutes = require('./routes/pdf');
const servicesRoutes = require('./routes/services');
const sousDirectionsRoutes = require('./routes/sous-directions');
const userAccountsRoutes = require('./routes/userAccounts');
const mariagesRoutes = require('./routes/mariages');
const planningPrevisionnelRoutes = require('./routes/planning-previsionnel');
const agentRouteAssignmentsRoutes = require('./routes/agent-route-assignments');


// Utilisation des routes
app.use('/api/auth', authRoutes);
app.use('/api/auth-entite', authEntiteRoutes);
app.use('/api/ministeres', ministeresRoutes);
app.use('/api/institutions', institutionsRoutes);
app.use('/api/agents-institutions', agentsInstitutionsRoutes);
app.use('/api/enfants-institutions', enfantsInstitutionsRoutes);
app.use('/api/entites-institutions', entitesInstitutionsRoutes);
app.use('/api/services-institutions', servicesInstitutionsRoutes);
app.use('/api/services-entites', servicesEntitesRoutes);
app.use('/api/services-entites-ministres', servicesEntitesMinistresRoutes);
app.use('/api/type-seminaire-institutions', typeSeminaireInstitutionsRoutes);
app.use('/api/type-documents-institutions', typeDocumentsInstitutionsRoutes);
app.use('/api/tiers-institutions', tiersInstitutionsRoutes);
app.use('/api/dossiers-institutions', dossiersInstitutionsRoutes);
app.use('/api/classeurs-institutions', classeursInstitutionsRoutes);
app.use('/api/agents-entites-institutions', agentsEntitesInstitutionsRoutes);
app.use('/api/affectations-temporaires-institutions', affectationsTemporairesInstitutionsRoutes);
app.use('/api/permissions-entites-institutions', permissionsEntitesInstitutionsRoutes);
app.use('/api/directions-institutions', directionsInstitutionsRoutes);
app.use('/api/sous-directions-institutions', sousDirectionsInstitutionsRoutes);
app.use('/api/conges-institutions', congesInstitutionsRoutes);
app.use('/api/demandes-institutions', demandesInstitutionsRoutes);
app.use('/api/planning-previsionnel-institutions', planningPrevisionnelInstitutionsRoutes);
app.use('/api/emargement', signaturesRoutes);
app.use('/api/signatures', signaturesRoutes);
app.use('/api/entites', entitesRoutes);
app.use('/api/entites_administratives', entitesRoutes); // Alias pour compatibilité
app.use('/api/entites-administratives', entitesRoutes); // Alias pour compatibilité frontend
app.use('/api/civilites', civilitesRoutes);
app.use('/api/nationalites', nationalitesRoutes);
app.use('/api/fonctions', fonctionsRoutes);
app.use('/api/emplois', emploisRoutes);
app.use('/api/echelons', echelonsRoutes);
app.use('/api/specialites', specialitesRoutes);
app.use('/api/langues', languesRoutes);
app.use('/api/niveau_langues', niveau_languesRoutes);
app.use('/api/motif_de_departs', motif_de_departsRoutes);
app.use('/api/type_de_conges', type_de_congesRoutes);
app.use('/api/autre_absences', autre_absencesRoutes);
app.use('/api/distinctions', distinctionsRoutes);
app.use('/api/type_etablissements', type_etablissementsRoutes);
app.use('/api/type-etablissements', type_etablissementsRoutes); // Alias pour compatibilité
app.use('/api/unite_administratives', unite_administrativesRoutes);
app.use('/api/unite-administratives', unite_administrativesRoutes); // Alias pour compatibilité
app.use('/api/diplomes', diplomesRoutes);
app.use('/api/type_d_agents', type_d_agentsRoutes);
app.use('/api/type-d-agents', type_d_agentsRoutes); // Alias pour compatibilité frontend
app.use('/api/type_de_materiels', type_de_materielsRoutes);
app.use('/api/type_de_destinations', type_de_destinationsRoutes);
app.use('/api/nature_d_accidents', nature_d_accidentsRoutes);
app.use('/api/sanctions', sanctionsRoutes);
app.use('/api/sindicats', sindicatsRoutes);
app.use('/api/type_de_couriers', type_de_couriersRoutes);
app.use('/api/nature_actes', nature_actesRoutes);
app.use('/api/localites', localitesRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/departements', departementsRoutes);
app.use('/api/situation_matrimonials', situation_matrimonialsRoutes);
app.use('/api/situation-matrimonials', situation_matrimonialsRoutes); // Alias pour compatibilité
app.use('/api/mode_d_entrees', mode_d_entreesRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/pathologies', pathologiesRoutes);
app.use('/api/handicaps', handicapsRoutes);
app.use('/api/niveau_informatiques', niveau_informatiquesRoutes);
app.use('/api/logiciels', logicielsRoutes);
app.use('/api/type_de_retraites', type_de_retraitesRoutes);
app.use('/api/enfants', enfantsRoutes);
app.use('/api/type_de_seminaire_de_formation', type_de_seminaire_de_formationRoutes);
app.use('/api/type-seminaires', type_de_seminaire_de_formationRoutes); // Alias pour compatibilité
app.use('/api/type_de_documents', type_de_documentsRoutes);
app.use('/api/tiers', tiersRoutes);
app.use('/api/directions', directionsRoutes);
app.use('/api/directions-generales', directionGeneraleRoutes);
app.use('/api/dossiers', dossiersRoutes);
app.use('/api/classeurs', classeursRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/agents/stats', agentsRoutes); // Pour les statistiques
app.use('/api/birthdays', agentsRoutes); // Pour les anniversaires (messages)
app.use('/api/agent-auth', agentAuthRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/pays', paysRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/seminaire-formation', seminaireFormationRoutes);
app.use('/api/seminaire-participants', seminaireParticipantsRoutes);
app.use('/api/evenements', evenementsRoutes);
app.use('/api/evenements', evenementParticipantsRoutes);
app.use('/api/agent-fonctions', agentFonctionsRoutes);
app.use('/api/agent-emplois', agentEmploisRoutes);
app.use('/api/fonction-agents', fonctionAgentsRoutes);
app.use('/api/grades-agents', gradesAgentsRoutes);
app.use('/api/agent-associations', agentAssociationsRoutes);
app.use('/api/agent-sindicats', agentSindicatsRoutes);
app.use('/api/associations', associationsRoutes);
app.use('/api/emploi-agents', emploiAgentsRoutes);
app.use('/api/echelons-agents', echelonsAgentsRoutes);
app.use('/api/categories-agents', categoriesAgentsRoutes);
app.use('/api/mariages', mariagesRoutes);
app.use('/api/demandes', demandesRoutes);
app.use('/api/conges', congesRoutes);
app.use('/api/planning-previsionnel', planningPrevisionnelRoutes);
app.use('/api/agent-route-assignments', agentRouteAssignmentsRoutes);
app.use('/api/documents', require('./routes/documents'));
app.use('/api/decisions', require('./routes/decisions'));
app.use('/api/pdf', pdfRoutes);
app.use('/api/diagnostic', require('./routes/diagnostic'));
app.use('/api/services', servicesRoutes);
app.use('/api/sous-directions', sousDirectionsRoutes);
app.use('/api/sous_directions', sousDirectionsRoutes); // Alias pour compatibilité
app.use('/api/user-accounts', userAccountsRoutes);
app.use('/api/test', require('./routes/test-demandes'));
app.use('/api/bypass', require('./routes/bypass-demandes'));
app.use('/api/simple-test', require('./routes/simple-test'));
app.use('/api/working', require('./routes/working-bypass'));

// Route de santé pour vérifier que le serveur répond
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Route de santé API
app.get('/api/health', (req, res) => {
    // Ajouter les headers CORS
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || origin.includes('localhost'))) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    res.status(200).json({
        success: true,
        status: 'OK',
        api: 'available',
        timestamp: new Date().toISOString()
    });
});


// Middleware de gestion des erreurs global - DOIT être le dernier middleware
app.use((err, req, res, next) => {
    // TOUJOURS ajouter les headers CORS même en cas d'erreur
    const origin = req.headers.origin;
    const allowedOrigin = getAllowedOrigin(origin) || origin || '*';
    
    // Ajouter les headers CORS
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Forwarded-For, x-motif-retrait');
    
    // Log de l'erreur
    console.error('❌ Erreur globale interceptée:', {
        message: err.message,
        stack: err.stack?.substring(0, 500), // Limiter la taille du stack trace dans les logs
        url: req.originalUrl,
        method: req.method,
        origin: origin,
        ip: req.ip
    });
    
    // Déterminer le code de statut
    const statusCode = err.statusCode || err.status || 500;
    
    // Répondre avec l'erreur
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Erreur interne du serveur',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            details: err 
        })
    });
});

// Middleware 404 - AVANT le middleware d'erreur global
app.use('*', (req, res) => {
    // Ajouter les headers CORS même pour les 404
    const origin = req.headers.origin;
    const allowedOrigin = getAllowedOrigin(origin) || origin || '*';
    
    // Ajouter les headers CORS
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Forwarded-For, x-motif-retrait');
    
    console.warn('⚠️  404 - Route non trouvée:', req.originalUrl, 'Origin:', origin);
    
    res.status(404).json({
        success: false,
        message: 'Route non trouvée',
        path: req.originalUrl
    });
});


// Démarrage du serveur avec gestion d'erreur
const PORT = process.env.PORT || 5000;
// En production, écouter sur 0.0.0.0 pour être accessible depuis l'extérieur
// En développement, localhost est suffisant
const HOST = isProduction ? '0.0.0.0' : 'localhost';

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Exception non capturée:', error);
    console.error('Stack:', error.stack);
    // Ne pas quitter le processus, mais logger l'erreur
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejection non gérée:', reason);
    console.error('Promise:', promise);
});

let server;
try {
    server = app.listen(PORT, HOST, () => {
        console.log(`🚀 Serveur démarré avec succès`);
        console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 Écoute sur: ${HOST}:${PORT}`);
        if (isProduction) {
            console.log(`🔗 Accessible depuis l'extérieur sur le port ${PORT}`);
        } else {
            console.log(`🔗 Accessible localement sur http://localhost:${PORT}`);
        }
        console.log(`🔐 API d'authentification: http://${HOST}:${PORT}/api/auth`);
        console.log(`🏛️  API des ministères: http://${HOST}:${PORT}/api/ministeres`);
        console.log(`🏢 API des entités: http://${HOST}:${PORT}/api/entites`);
        console.log(`👥 API des agents: http://${HOST}:${PORT}/api/agents`);
        console.log(`✅ Serveur prêt à recevoir des requêtes`);
        
        // Démarrer la tâche planifiée pour les notifications de mariage
        try {
            const { startMariageNotificationsJob } = require('./jobs/mariageNotificationsJob');
            startMariageNotificationsJob();
        } catch (error) {
            console.warn('⚠️ Impossible de démarrer la tâche planifiée des notifications de mariage:', error.message);
            console.warn('   Assurez-vous que node-cron est installé: npm install node-cron');
        }
    });
    
    // Gestion des erreurs du serveur
    server.on('error', (error) => {
        console.error('❌ Erreur du serveur:', error);
        if (error.code === 'EADDRINUSE') {
            console.error(`❌ Le port ${PORT} est déjà utilisé`);
            process.exit(1);
        } else {
            console.error('❌ Erreur serveur inattendue:', error);
        }
    });
} catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Signal SIGTERM reçu, arrêt gracieux du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté avec succès');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Signal SIGINT reçu, arrêt gracieux du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté avec succès');
        process.exit(0);
    });
});

// Job périodique pour vérifier et créer des notifications de congés prévisionnels
// S'exécute toutes les heures pour vérifier les agents dont la date de départ est exactement dans 30 jours
setInterval(async () => {
    try {
        const pool = require('./config/database');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculer la date exactement dans 30 jours (1 mois)
        const dateDans30Jours = new Date(today);
        dateDans30Jours.setDate(dateDans30Jours.getDate() + 30);
        dateDans30Jours.setHours(23, 59, 59, 999);
        
        // Période de vérification : ±1 jour de tolérance autour de 30 jours
        const dateMin = new Date(dateDans30Jours);
        dateMin.setDate(dateMin.getDate() - 1);
        dateMin.setHours(0, 0, 0, 0);
        
        const dateMax = new Date(dateDans30Jours);
        dateMax.setDate(dateMax.getDate() + 1);
        dateMax.setHours(23, 59, 59, 999);
        
        // Récupérer tous les agents avec une date de départ en congés dans la période (29-31 jours)
        const query = `
            SELECT 
                ac.id_agent,
                ac.annee,
                ac.date_depart_conges,
                a.nom,
                a.prenom,
                a.matricule
            FROM agent_conges ac
            JOIN agents a ON ac.id_agent = a.id
            WHERE ac.date_depart_conges IS NOT NULL
                AND ac.date_depart_conges >= $1
                AND ac.date_depart_conges <= $2
                AND ac.date_depart_conges >= CURRENT_DATE
        `;
        
        const result = await pool.query(query, [
            dateMin.toISOString().split('T')[0],
            dateMax.toISOString().split('T')[0]
        ]);
        
        for (const agent of result.rows) {
            try {
                // Calculer le nombre exact de jours restants
                const dateDepart = new Date(agent.date_depart_conges);
                dateDepart.setHours(0, 0, 0, 0);
                const joursRestants = Math.ceil((dateDepart - today) / (1000 * 60 * 60 * 24));
                
                // Créer la notification seulement si on est exactement à 30 jours (±1 jour de tolérance)
                if (joursRestants < 29 || joursRestants > 31) {
                    continue;
                }
                
                // Vérifier si une notification existe déjà
                const checkNotification = await pool.query(
                    `SELECT id FROM notifications_demandes 
                     WHERE id_agent_destinataire = $1 
                       AND type_notification = 'conges_previsionnel'
                       AND message LIKE $2
                       AND date_creation >= CURRENT_DATE - INTERVAL '7 days'`,
                    [
                        agent.id_agent,
                        `%${agent.date_depart_conges.toISOString().split('T')[0]}%`
                    ]
                );
                
                if (checkNotification.rows.length === 0) {
                    const dateFormatee = dateDepart.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    const titre = 'Rappel : Départ en congés prévu dans 1 mois';
                    const message = `Votre départ en congés est prévu le ${dateFormatee} (dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}). Veuillez vous préparer en conséquence.`;
                    
                    await pool.query(
                        `INSERT INTO notifications_demandes (
                            id_demande,
                            id_agent_destinataire,
                            type_notification,
                            titre,
                            message,
                            lu,
                            date_creation
                        ) VALUES (NULL, $1, 'conges_previsionnel', $2, $3, false, CURRENT_TIMESTAMP)`,
                        [agent.id_agent, titre, message]
                    );
                    
                    console.log(`✅ Notification de congés créée pour ${agent.nom} ${agent.prenom} (${agent.matricule}) - Départ le ${agent.date_depart_conges.toISOString().split('T')[0]} - Dans ${joursRestants} jours`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors de la création de la notification pour l'agent ${agent.id_agent}:`, error);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification périodique des notifications de congés:', error);
    }
}, 3600000); // Exécuter toutes les heures (3600000 ms)

console.log('✅ Job périodique de vérification des notifications de congés prévisionnels démarré (toutes les heures)');

module.exports = app;
















