// Endpoint de contournement pour les demandes du sous-directeur
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { formatDatesInArray } = require('../utils/dateFormatter');

// Route de contournement - pas d'authentification requise
router.get('/demandes-sous-directeur', async(req, res) => {
    try {
        console.log('🚀 Endpoint de contournement appelé');

        // Récupérer directement les demandes pour le sous-directeur
        const demandesQuery = `
            SELECT d.id, d.type_demande, d.description, d.status, 
                   d.niveau_evolution_demande, d.date_creation,
                   d.agree_motif, d.agree_date_cessation,
                   a.prenom, a.nom, a.matricule, a.email,
                   COALESCE(dir.libelle, '') as direction_nom,
                   COALESCE(min.libelle, '') as ministere_nom
            FROM demandes d
            JOIN agents a ON d.id_agent = a.id
            LEFT JOIN directions dir ON a.id_direction = dir.id
            LEFT JOIN ministeres min ON a.id_ministere = min.id
            WHERE d.niveau_evolution_demande = 'soumis'
            ORDER BY d.date_creation DESC
        `;

        const demandes = await db.query(demandesQuery);

        console.log(`📊 ${demandes.rows.length} demande(s) récupérée(s)`);

        // Formater les données comme l'attend le frontend
        const demandeDateFields = [
            'date_creation',
            'date_debut',
            'date_fin',
            'agree_date_cessation'
        ];
        
        let formattedData = demandes.rows.map(demande => ({
            id: demande.id,
            type_demande: demande.type_demande,
            description: demande.description,
            status: demande.status,
            niveau_evolution_demande: demande.niveau_evolution_demande,
            date_creation: demande.date_creation,
            date_debut: demande.date_debut,
            date_fin: demande.date_fin,
            lieu: demande.lieu,
            priorite: demande.priorite,
            agree_motif: demande.agree_motif,
            agree_date_cessation: demande.agree_date_cessation,
            agent: {
                id: demande.id_agent,
                prenom: demande.prenom,
                nom: demande.nom,
                matricule: demande.matricule,
                email: demande.email,
                direction_nom: demande.direction_nom,
                ministere_nom: demande.ministere_nom
            }
        }));
        
        // Formater les dates pour éviter les décalages de fuseau horaire
        formattedData = formatDatesInArray(formattedData, demandeDateFields);

        res.json({
            success: true,
            message: 'Demandes récupérées avec succès (contournement)',
            data: formattedData,
            count: formattedData.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erreur endpoint de contournement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des demandes',
            error: error.message
        });
    }
});

module.exports = router;