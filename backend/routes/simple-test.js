// Endpoint de test très simple
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Test 1: Vérifier la connexion à la base
router.get('/test-connection', async(req, res) => {
    try {
        console.log('🧪 Test de connexion à la base de données');
        const result = await db.query('SELECT NOW() as current_time');
        res.json({
            success: true,
            message: 'Connexion OK',
            time: result.rows[0].current_time
        });
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur de connexion',
            error: error.message
        });
    }
});

// Test 2: Vérifier la table demandes
router.get('/test-demandes-table', async(req, res) => {
    try {
        console.log('🧪 Test de la table demandes');
        const result = await db.query('SELECT COUNT(*) as total FROM demandes');
        res.json({
            success: true,
            message: 'Table demandes accessible',
            total: result.rows[0].total
        });
    } catch (error) {
        console.error('❌ Erreur table demandes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur table demandes',
            error: error.message
        });
    }
});

// Test 3: Requête simple des demandes
router.get('/test-simple-demandes', async(req, res) => {
    try {
        console.log('🧪 Test requête simple des demandes');
        const result = await db.query(`
            SELECT d.id, d.type_demande, d.status, d.niveau_evolution_demande
            FROM demandes d
            WHERE d.niveau_evolution_demande = 'soumis'
            LIMIT 5
        `);

        res.json({
            success: true,
            message: 'Requête simple OK',
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('❌ Erreur requête simple:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur requête simple',
            error: error.message
        });
    }
});

// Test 4: Requête avec JOIN agents
router.get('/test-join-agents', async(req, res) => {
    try {
        console.log('🧪 Test requête avec JOIN agents');
        const result = await db.query(`
            SELECT d.id, d.type_demande, d.status, 
                   a.prenom, a.nom, a.matricule
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            WHERE d.niveau_evolution_demande = 'soumis'
            LIMIT 5
        `);

        res.json({
            success: true,
            message: 'Requête avec JOIN agents OK',
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('❌ Erreur requête avec JOIN agents:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur requête avec JOIN agents',
            error: error.message
        });
    }
});

// Test 5: Requête avec JOIN directions
router.get('/test-join-directions', async(req, res) => {
    try {
        console.log('🧪 Test requête avec JOIN directions');
        const result = await db.query(`
            SELECT d.id, d.type_demande, d.status, 
                   a.prenom, a.nom, a.matricule,
                   dir.nom as direction_nom
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            LEFT JOIN directions dir ON a.id_direction = dir.id
            WHERE d.niveau_evolution_demande = 'soumis'
            LIMIT 5
        `);

        res.json({
            success: true,
            message: 'Requête avec JOIN directions OK',
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('❌ Erreur requête avec JOIN directions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur requête avec JOIN directions',
            error: error.message
        });
    }
});

module.exports = router;