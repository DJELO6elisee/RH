const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Créer le dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Créer les sous-dossiers
const photosDir = path.join(uploadDir, 'photos');
const documentsDir = path.join(uploadDir, 'documents');
const diplomesDir = path.join(uploadDir, 'diplomes');
const signaturesDir = path.join(uploadDir, 'signatures');
const decisionsDir = path.join(uploadDir, 'decisions');
const associationsDir = path.join(uploadDir, 'associations');
const sindicatsDir = path.join(uploadDir, 'sindicats');

if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
}

if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
}

if (!fs.existsSync(diplomesDir)) {
    fs.mkdirSync(diplomesDir, { recursive: true });
}

if (!fs.existsSync(signaturesDir)) {
    fs.mkdirSync(signaturesDir, { recursive: true });
}

if (!fs.existsSync(decisionsDir)) {
    fs.mkdirSync(decisionsDir, { recursive: true });
}

if (!fs.existsSync(associationsDir)) {
    fs.mkdirSync(associationsDir, { recursive: true });
}

if (!fs.existsSync(sindicatsDir)) {
    fs.mkdirSync(sindicatsDir, { recursive: true });
}

// Configuration de stockage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        if (file.fieldname === 'photo_profil') {
            cb(null, photosDir);
        } else if (file.fieldname === 'diplome_documents' || file.fieldname === 'diplomes') {
            cb(null, diplomesDir);
        } else if (file.fieldname === 'dynamic_documents') {
            cb(null, documentsDir);
        } else if (file.fieldname === 'signature') {
            cb(null, signaturesDir);
        } else if (file.fieldname === 'document' && req.body && req.body.type) {
            // Documents de décision
            cb(null, decisionsDir);
        } else if (file.fieldname === 'fichier_attestation') {
            // Déterminer si c'est pour une association ou un syndicat
            // Vérifier l'URL de la requête pour déterminer le type
            const url = req.originalUrl || req.url || '';
            if (url.includes('/agent-sindicats') || url.includes('/agent-sindicat')) {
                cb(null, sindicatsDir);
            } else {
                // Par défaut, utiliser associationsDir pour les associations
                cb(null, associationsDir);
            }
        } else {
            cb(null, documentsDir);
        }
    },
    filename: function(req, file, cb) {
        // Générer un nom de fichier unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// Filtre pour les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        // Images
        'image/jpeg': true,
        'image/jpg': true,
        'image/png': true,
        'image/gif': true,
        'image/webp': true,
        // Documents PDF
        'application/pdf': true,
        // Documents Word
        'application/msword': true,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
        // Documents Excel
        'application/vnd.ms-excel': true,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
        // Documents PowerPoint
        'application/vnd.ms-powerpoint': true,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
        // Fichiers texte
        'text/plain': true,
        'text/rtf': true
    };

    console.log(`🔍 Vérification du type de fichier: ${file.mimetype} pour ${file.fieldname}`);

    if (allowedTypes[file.mimetype]) {
        console.log(`✅ Type de fichier autorisé: ${file.mimetype}`);
        cb(null, true);
    } else {
        console.log(`❌ Type de fichier non autorisé: ${file.mimetype}`);
        cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`), false);
    }
};

// Configuration multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max
    }
});

// Middleware pour gérer les uploads d'agents
const uploadAgentFiles = upload.fields([
    { name: 'photo_profil', maxCount: 1 },
    { name: 'diplomes', maxCount: 10 }, // Ancienne clé pour compatibilité
    { name: 'diplome_documents', maxCount: 10 }, // Nouvelle clé pour les fichiers de diplômes
    { name: 'dynamic_documents', maxCount: 20 }, // Nouveaux documents dynamiques
    { name: 'acte_mariage', maxCount: 1 }, // Acte de mariage
    { name: 'certificat_travail', maxCount: 1 }, // Certificat de travail
    { name: 'attestation_formation', maxCount: 1 }, // Attestation de formation
    { name: 'autres_documents', maxCount: 10 } // Autres documents
]);

// Middleware pour gérer les uploads de diplômes
const uploadDiplomeFiles = upload.array('diplome_documents', 10);

// Middleware pour gérer l'upload de documents de décision
const uploadDecisionFile = upload.single('document');

// Middleware pour gérer l'upload de fichier d'attestation d'association
const uploadAssociationAttestation = upload.single('fichier_attestation');

// Middleware pour gérer l'upload de fichier d'attestation de syndicat
const uploadSindicatAttestation = upload.single('fichier_attestation');

// Middleware pour l'upload de documents par l'agent depuis son dashboard (table agent_documents)
// Permet autant de fichiers qu'il veut (limite 50 par requête pour éviter les abus)
const uploadAgentDocuments = upload.array('documents', 50);

module.exports = {
    uploadAgentFiles,
    uploadDiplomeFiles,
    upload,
    uploadSignatureFile: upload.single('signature'),
    uploadDecisionFile,
    uploadAssociationAttestation,
    uploadSindicatAttestation,
    uploadAgentDocuments
};