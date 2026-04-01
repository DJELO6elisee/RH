
// Endpoint de test temporaire pour les demandes
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Route de test pour récupérer les demandes sans authentification
router.get('/test/demandes/:idAgent', async (req, res) => {
    try {
        const { idAgent } = req.params;
        
        console.log('🧪 Test endpoint - Agent ID:', idAgent);
        
        // Récupérer les demandes directement
        const demandesQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, 
                   d.niveau_evolution_demande, d.date_creation,
                   d.agree_motif, d.agree_date_cessation,
                   a.prenom, a.nom, a.matricule, a.email
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            WHERE d.niveau_evolution_demande = 'soumis'
            ORDER BY d.date_creation DESC
        `;
        
        const demandes = await db.query(demandesQuery);
        
        res.json({
            success: true,
            message: 'Test endpoint - Demandes récupérées',
            data: demandes.rows,
            count: demandes.rows.length
        });
        
    } catch (error) {
        console.error('❌ Erreur test endpoint:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur test endpoint',
            error: error.message
        });
    }
});

module.exports = router;
        