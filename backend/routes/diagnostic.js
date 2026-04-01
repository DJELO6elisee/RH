const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Route de diagnostic pour vérifier les diplômes et documents
router.get('/diplomes/:agentId', async(req, res) => {
    try {
        const { agentId } = req.params;

        console.log(`🔍 DIAGNOSTIC - Vérification des diplômes pour l'agent ${agentId}`);

        // 1. Récupérer les diplômes
        const diplomesQuery = `
            SELECT id, id_agent, diplome, date_diplome, ecole, id_agent_document, created_at
            FROM etude_diplome 
            WHERE id_agent = $1
            ORDER BY created_at DESC
        `;

        const diplomesResult = await pool.query(diplomesQuery, [agentId]);

        // 2. Récupérer les documents de diplômes
        const documentsQuery = `
            SELECT id, id_agent, document_type, document_name, document_url, created_at
            FROM agent_documents 
            WHERE id_agent = $1 AND document_type = 'diplome'
            ORDER BY created_at DESC
        `;

        const documentsResult = await pool.query(documentsQuery, [agentId]);

        // 3. Analyser les liaisons
        const diplomes = diplomesResult.rows;
        const documents = documentsResult.rows;

        const diplomesAvecDocuments = diplomes.filter(d => d.id_agent_document);
        const documentsNonLies = documents.filter(doc =>
            !diplomes.some(diplome => diplome.id_agent_document === doc.id)
        );

        const diagnostic = {
            agentId: parseInt(agentId),
            diplomes: {
                total: diplomes.length,
                avecDocuments: diplomesAvecDocuments.length,
                sansDocuments: diplomes.length - diplomesAvecDocuments.length,
                details: diplomes.map(d => ({
                    id: d.id,
                    diplome: d.diplome,
                    id_agent_document: d.id_agent_document,
                    created_at: d.created_at
                }))
            },
            documents: {
                total: documents.length,
                lies: diplomesAvecDocuments.length,
                nonLies: documentsNonLies.length,
                details: documents.map(d => ({
                    id: d.id,
                    document_name: d.document_name,
                    document_url: d.document_url,
                    created_at: d.created_at
                }))
            },
            problemes: []
        };

        // 4. Identifier les problèmes
        if (diplomesAvecDocuments.length === 0 && documents.length > 0) {
            diagnostic.problemes.push('Des documents existent mais aucun n\'est lié aux diplômes');
        }

        if (documentsNonLies.length > 0) {
            diagnostic.problemes.push(`${documentsNonLies.length} document(s) non lié(s) à des diplômes`);
        }

        console.log(`📊 DIAGNOSTIC - Diplômes: ${diplomes.length}, Documents: ${documents.length}, Liaisons: ${diplomesAvecDocuments.length}`);

        res.json({
            success: true,
            diagnostic
        });

    } catch (error) {
        console.error('❌ Erreur diagnostic:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Route pour tester une liaison manuelle
router.post('/diplomes/:agentId/link', async(req, res) => {
    try {
        const { agentId } = req.params;
        const { diplomeId, documentId } = req.body;

        console.log(`🔧 TEST LIAISON - Liaison manuelle diplôme ${diplomeId} -> document ${documentId}`);

        // Vérifier que le diplôme et le document appartiennent à l'agent
        const diplomeCheck = await pool.query(
            'SELECT id FROM etude_diplome WHERE id = $1 AND id_agent = $2', [diplomeId, agentId]
        );

        const documentCheck = await pool.query(
            'SELECT id FROM agent_documents WHERE id = $1 AND id_agent = $2 AND document_type = $3', [documentId, agentId, 'diplome']
        );

        if (diplomeCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Diplôme non trouvé ou n\'appartient pas à l\'agent'
            });
        }

        if (documentCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Document non trouvé ou n\'appartient pas à l\'agent'
            });
        }

        // Effectuer la liaison
        const updateResult = await pool.query(
            'UPDATE etude_diplome SET id_agent_document = $1 WHERE id = $2', [documentId, diplomeId]
        );

        console.log(`🔗 LIAISON MANUELLE - ${updateResult.rowCount} ligne(s) affectée(s)`);

        // Vérifier la liaison
        const verifyResult = await pool.query(
            'SELECT id, diplome, id_agent_document FROM etude_diplome WHERE id = $1', [diplomeId]
        );

        if (verifyResult.rows.length > 0) {
            const diplome = verifyResult.rows[0];
            console.log(`✅ VÉRIFICATION - Diplôme ${diplome.id} -> Document ${diplome.id_agent_document}`);

            res.json({
                success: true,
                message: 'Liaison effectuée avec succès',
                diplome: {
                    id: diplome.id,
                    diplome: diplome.diplome,
                    id_agent_document: diplome.id_agent_document
                }
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la vérification de la liaison'
            });
        }

    } catch (error) {
        console.error('❌ Erreur liaison manuelle:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
