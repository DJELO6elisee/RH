/**
 * Script pour recréer un document de note de service dans la base de données
 * à partir d'un fichier PDF existant
 * 
 * Usage: node recreate_document_from_pdf.js <chemin_pdf> <agent_id> <validateur_id>
 * Exemple: node recreate_document_from_pdf.js "uploads/documents/note_de_service_123_1234567890.pdf" 123 1
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function recreateDocumentFromPDF(pdfPath, agentId, validateurId) {
    try {
        console.log('🔄 Recréation du document depuis le PDF...\n');

        // Vérifier que le fichier PDF existe
        const fullPath = path.isAbsolute(pdfPath) 
            ? pdfPath 
            : path.join(__dirname, '..', pdfPath);
        
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Le fichier PDF n'existe pas: ${fullPath}`);
            process.exit(1);
        }

        console.log(`✅ Fichier PDF trouvé: ${fullPath}\n`);

        // Récupérer les informations de l'agent
        const agentResult = await db.query(`
            SELECT id, prenom, nom, matricule, fonction_actuelle, 
                   id_direction, id_ministere
            FROM agents
            WHERE id = $1
        `, [agentId]);

        if (agentResult.rows.length === 0) {
            console.error(`❌ Agent avec l'ID ${agentId} non trouvé`);
            process.exit(1);
        }

        const agent = agentResult.rows[0];
        console.log(`✅ Agent trouvé: ${agent.prenom} ${agent.nom} (${agent.matricule})\n`);

        // Récupérer les informations du validateur
        const validateurResult = await db.query(`
            SELECT id, prenom, nom, fonction_actuelle
            FROM agents
            WHERE id = $1
        `, [validateurId]);

        if (validateurResult.rows.length === 0) {
            console.error(`❌ Validateur avec l'ID ${validateurId} non trouvé`);
            process.exit(1);
        }

        const validateur = validateurResult.rows[0];
        console.log(`✅ Validateur trouvé: ${validateur.prenom} ${validateur.nom}\n`);

        // Générer le contenu HTML (basique)
        const DocumentGenerationService = require('../services/DocumentGenerationService');
        const contenuHTML = await DocumentGenerationService.generateNoteDeServiceHTML(
            agent,
            validateur,
            {
                date_generation: new Date()
            }
        );

        // Créer le titre
        const titre = `Note de Service - ${agent.prenom} ${agent.nom} - ${agent.matricule}`;

        // Insérer le document dans la base de données
        const insertQuery = `
            INSERT INTO documents_autorisation (
                type_document,
                titre,
                contenu,
                statut,
                id_agent_generateur,
                id_agent_destinataire,
                chemin_fichier,
                commentaires,
                date_generation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            RETURNING id, date_generation
        `;

        // Normaliser le chemin du PDF (relatif)
        const relativePath = pdfPath.replace(/^.*uploads[\\/]/, 'uploads/').replace(/\\/g, '/');

        const result = await db.query(insertQuery, [
            'note_de_service',
            titre,
            contenuHTML,
            'generé',
            validateurId,
            agentId,
            relativePath,
            `Document recréé depuis le fichier PDF: ${path.basename(pdfPath)}`
        ]);

        const documentId = result.rows[0].id;
        const dateGeneration = result.rows[0].date_generation;

        console.log('═══════════════════════════════════════════════════════════');
        console.log('✅ DOCUMENT RECRÉÉ AVEC SUCCÈS');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log(`ID du document: ${documentId}`);
        console.log(`Type: note_de_service`);
        console.log(`Titre: ${titre}`);
        console.log(`Date de génération: ${new Date(dateGeneration).toLocaleString('fr-FR')}`);
        console.log(`Chemin PDF: ${relativePath}`);
        console.log(`Agent: ${agent.prenom} ${agent.nom} (ID: ${agentId})`);
        console.log(`Validateur: ${validateur.prenom} ${validateur.nom} (ID: ${validateurId})\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la recréation du document:', error);
        process.exit(1);
    }
}

// Vérifier les arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.log('Usage: node recreate_document_from_pdf.js <chemin_pdf> <agent_id> <validateur_id>');
    console.log('');
    console.log('Exemple:');
    console.log('  node recreate_document_from_pdf.js "uploads/documents/note_de_service_123_1234567890.pdf" 123 1');
    process.exit(1);
}

const [pdfPath, agentId, validateurId] = args;
recreateDocumentFromPDF(pdfPath, parseInt(agentId), parseInt(validateurId));
