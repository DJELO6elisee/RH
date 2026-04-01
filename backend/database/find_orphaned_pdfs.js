/**
 * Script pour trouver les fichiers PDF orphelins (fichiers PDF qui existent 
 * mais qui ne sont plus référencés dans la base de données)
 * et aider à récupérer les documents supprimés
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function findOrphanedPDFs() {
    try {
        console.log('🔍 Recherche des fichiers PDF orphelins...\n');

        // Chemin vers le dossier des documents
        const documentsDir = path.join(__dirname, '..', 'uploads', 'documents');
        
        if (!fs.existsSync(documentsDir)) {
            console.error('❌ Le dossier uploads/documents n\'existe pas');
            return;
        }

        // Lister tous les fichiers PDF
        const files = fs.readdirSync(documentsDir).filter(file => file.endsWith('.pdf'));
        console.log(`📄 ${files.length} fichiers PDF trouvés dans uploads/documents/\n`);

        // Récupérer tous les chemins de fichiers référencés dans la base de données
        const result = await db.query(`
            SELECT id, type_document, titre, chemin_fichier, date_generation, 
                   id_agent_destinataire, id_agent_generateur
            FROM documents_autorisation
            WHERE chemin_fichier IS NOT NULL AND chemin_fichier != ''
            ORDER BY date_generation DESC
        `);

        const referencedPaths = new Set();
        result.rows.forEach(row => {
            if (row.chemin_fichier) {
                // Normaliser le chemin (enlever le préfixe uploads/ si présent)
                const normalized = row.chemin_fichier.replace(/^uploads[\\/]/, '');
                const fileName = path.basename(normalized);
                referencedPaths.add(fileName);
            }
        });

        console.log(`📊 ${referencedPaths.size} fichiers PDF référencés dans la base de données\n`);

        // Trouver les fichiers orphelins (fichiers qui existent mais ne sont pas référencés)
        const orphanedFiles = [];
        const noteDeServiceFiles = [];

        files.forEach(file => {
            if (!referencedPaths.has(file)) {
                orphanedFiles.push(file);
                
                // Vérifier si c'est un fichier de note de service
                if (file.includes('note_de_service')) {
                    noteDeServiceFiles.push(file);
                }
            }
        });

        console.log('═══════════════════════════════════════════════════════════');
        console.log('📋 FICHIERS PDF ORPHELINS (non référencés dans la base)');
        console.log('═══════════════════════════════════════════════════════════\n');

        if (orphanedFiles.length === 0) {
            console.log('✅ Aucun fichier PDF orphelin trouvé\n');
        } else {
            console.log(`⚠️ ${orphanedFiles.length} fichiers PDF orphelins trouvés:\n`);
            orphanedFiles.forEach((file, index) => {
                const filePath = path.join(documentsDir, file);
                const stats = fs.statSync(filePath);
                console.log(`${index + 1}. ${file}`);
                console.log(`   Taille: ${(stats.size / 1024).toFixed(2)} KB`);
                console.log(`   Date de création: ${stats.birthtime.toLocaleString('fr-FR')}`);
                console.log(`   Date de modification: ${stats.mtime.toLocaleString('fr-FR')}`);
                console.log('');
            });
        }

        // Fichiers de notes de service spécifiquement
        if (noteDeServiceFiles.length > 0) {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📝 FICHIERS DE NOTES DE SERVICE ORPHELINS');
            console.log('═══════════════════════════════════════════════════════════\n');
            
            noteDeServiceFiles.forEach((file, index) => {
                console.log(`${index + 1}. ${file}`);
                
                // Extraire l'ID de l'agent depuis le nom du fichier
                const match = file.match(/note_de_service_(\d+)_(\d+)\.pdf/);
                if (match) {
                    const agentId = match[1];
                    const timestamp = match[2];
                    console.log(`   ID Agent: ${agentId}`);
                    console.log(`   Timestamp: ${timestamp}`);
                    console.log(`   Date estimée: ${new Date(parseInt(timestamp)).toLocaleString('fr-FR')}`);
                }
                console.log('');
            });
        }

        // Vérifier les documents récemment supprimés
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 DOCUMENTS DE NOTES DE SERVICE ACTUELLEMENT EN BASE');
        console.log('═══════════════════════════════════════════════════════════\n');

        const currentNotes = await db.query(`
            SELECT id, type_document, titre, date_generation, chemin_fichier,
                   id_agent_destinataire, id_agent_generateur, commentaires
            FROM documents_autorisation
            WHERE type_document IN ('note_de_service', 'note_de_service_mutation')
            ORDER BY date_generation DESC
            LIMIT 20
        `);

        if (currentNotes.rows.length === 0) {
            console.log('⚠️ Aucun document de note de service dans la base de données\n');
        } else {
            console.log(`✅ ${currentNotes.rows.length} documents de notes de service trouvés:\n`);
            currentNotes.rows.forEach((doc, index) => {
                console.log(`${index + 1}. Document ID: ${doc.id}`);
                console.log(`   Type: ${doc.type_document}`);
                console.log(`   Titre: ${doc.titre}`);
                console.log(`   Date: ${doc.date_generation ? new Date(doc.date_generation).toLocaleString('fr-FR') : 'N/A'}`);
                console.log(`   Fichier PDF: ${doc.chemin_fichier || 'Non généré'}`);
                console.log(`   Agent destinataire: ${doc.id_agent_destinataire}`);
                console.log('');
            });
        }

        // Suggestions pour récupérer le document
        console.log('═══════════════════════════════════════════════════════════');
        console.log('💡 SUGGESTIONS POUR RÉCUPÉRER LE DOCUMENT');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        if (noteDeServiceFiles.length > 0) {
            console.log('1. Si vous trouvez le fichier PDF dans la liste ci-dessus:');
            console.log('   - Vous pouvez le télécharger et le consulter');
            console.log('   - Vous pouvez recréer le document en base avec les informations du PDF\n');
            
            console.log('2. Pour recréer le document dans la base de données:');
            console.log('   - Utilisez le script recreate_document_from_pdf.js (à créer)');
            console.log('   - Ou recréez-le manuellement via l\'interface\n');
        }

        console.log('3. Vérifier les logs de l\'application:');
        console.log('   - Cherchez dans les logs Node.js les IDs de documents créés\n');
        
        console.log('4. Vérifier les sauvegardes PostgreSQL:');
        console.log('   - Si vous avez des sauvegardes récentes, vous pouvez restaurer\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur lors de la recherche:', error);
        process.exit(1);
    }
}

// Exécuter le script
findOrphanedPDFs();
