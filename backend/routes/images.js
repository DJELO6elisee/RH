const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const router = express.Router();

// Middleware pour gérer les requêtes OPTIONS (preflight CORS)
router.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

// Middleware d'authentification (optionnel pour les images publiques)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token d\'accès requis' });
    }

    // Ici vous pouvez ajouter la vérification du token JWT si nécessaire
    // Pour l'instant, on autorise l'accès si un token est présent
    next();
};

// Route pour servir les images depuis la base de données
router.get('/agent/:agentId/:photoId', authenticateToken, async(req, res) => {
    try {
        const { agentId, photoId } = req.params;

        console.log(`🔍 Récupération de la photo ID ${photoId} pour l'agent ID ${agentId}`);

        // Récupérer les informations de la photo depuis la base de données
        const photoQuery = `
            SELECT id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo
            FROM agent_photos 
            WHERE id = $1 AND id_agent = $2
        `;

        const photoResult = await pool.query(photoQuery, [photoId, agentId]);

        if (photoResult.rows.length === 0) {
            console.log(`❌ Photo non trouvée: ID ${photoId} pour agent ${agentId}`);
            return res.status(404).json({
                success: false,
                message: 'Photo non trouvée'
            });
        }

        const photo = photoResult.rows[0];
        console.log(`✅ Photo trouvée: ${photo.photo_name}`);

        // Construire le chemin du fichier
        const filename = photo.photo_url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/photos', filename);

        // Vérifier que le fichier existe
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Fichier physique non trouvé: ${filePath}`);
            return res.status(404).json({
                success: false,
                message: 'Fichier physique non trouvé'
            });
        }

        // Déterminer le type MIME
        const mimeType = photo.photo_type || 'image/jpeg';

        // Définir les en-têtes
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache pour 1 an
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        // Servir le fichier
        console.log(`✅ Servir le fichier depuis la DB: ${filePath}`);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Erreur lors du service du fichier depuis la DB:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du chargement du fichier'
        });
    }
});

// Route publique pour récupérer les photos de profil depuis la base de données
router.get('/public/profile/:agentId', async(req, res) => {
    try {
        const { agentId } = req.params;

        console.log(`🔍 Récupération de la photo de profil pour l'agent ID ${agentId}`);

        // Récupérer la photo de profil depuis la base de données
        const profilePhotoQuery = `
            SELECT id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo
            FROM agent_photos 
            WHERE id_agent = $1 AND is_profile_photo = true
            ORDER BY uploaded_at DESC
            LIMIT 1
        `;

        const profilePhotoResult = await pool.query(profilePhotoQuery, [agentId]);

        if (profilePhotoResult.rows.length === 0) {
            console.log(`❌ Aucune photo de profil trouvée pour l'agent ID ${agentId}`);
            return res.status(404).json({
                success: false,
                message: 'Aucune photo de profil trouvée'
            });
        }

        const photo = profilePhotoResult.rows[0];
        console.log(`✅ Photo de profil trouvée: ${photo.photo_name}`);

        // Construire le chemin du fichier
        const filename = photo.photo_url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/photos', filename);

        // Vérifier que le fichier existe
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Fichier physique non trouvé: ${filePath}`);
            return res.status(404).json({
                success: false,
                message: 'Fichier physique non trouvé'
            });
        }

        // Déterminer le type MIME
        const mimeType = photo.photo_type || 'image/jpeg';

        // Définir les en-têtes CORS explicites
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Content-Type', mimeType);
        res.header('Cache-Control', 'public, max-age=31536000'); // Cache pour 1 an

        // Servir le fichier
        console.log(`✅ Servir la photo de profil depuis la DB: ${filePath}`);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Erreur lors du service de la photo de profil:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du chargement de la photo de profil'
        });
    }
});

// Route publique pour récupérer une photo spécifique par son ID depuis la base de données
router.get('/public/photo/:photoId', async(req, res) => {
    try {
        const { photoId } = req.params;

        console.log(`🔍 Récupération de la photo ID ${photoId}`);

        // Récupérer la photo depuis la base de données
        const photoQuery = `
            SELECT id, id_agent, photo_url, photo_name, photo_size, photo_type, is_profile_photo
            FROM agent_photos 
            WHERE id = $1
        `;

        const photoResult = await pool.query(photoQuery, [photoId]);

        if (photoResult.rows.length === 0) {
            console.log(`❌ Photo non trouvée: ID ${photoId}`);
            return res.status(404).json({
                success: false,
                message: 'Photo non trouvée'
            });
        }

        const photo = photoResult.rows[0];
        console.log(`✅ Photo trouvée: ${photo.photo_name}`);

        // Construire le chemin du fichier
        const filename = photo.photo_url.split('/').pop();
        const filePath = path.join(__dirname, '../uploads/photos', filename);

        // Vérifier que le fichier existe
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Fichier physique non trouvé: ${filePath}`);
            return res.status(404).json({
                success: false,
                message: 'Fichier physique non trouvé'
            });
        }

        // Déterminer le type MIME
        const mimeType = photo.photo_type || 'image/jpeg';

        // Définir les en-têtes CORS explicites
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Content-Type', mimeType);
        res.header('Cache-Control', 'public, max-age=31536000'); // Cache pour 1 an

        // Servir le fichier
        console.log(`✅ Servir la photo depuis la DB: ${filePath}`);
        res.sendFile(filePath);

    } catch (error) {
        console.error('Erreur lors du service de la photo:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du chargement de la photo'
        });
    }
});

module.exports = router;