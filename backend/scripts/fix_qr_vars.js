const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, '../services/PDFKitGenerationService.js'),
    path.join(__dirname, '../services/MemoryPDFService.js')
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // On va remplacer la logique de qrGen pour inclure qrTitle et qrMinistere
        // juste avant l'appel à drawQRCode
        content = content.replace(/let qrGen = 'Système';([\s\S]*?)await drawQRCode\(doc, \{[\s\S]*?numeroDocument: qrDocNum\s*\}\);/g, (match) => {

            // Heuristique pour déterminer le titre
            return `
                let qrGen = 'Système';
                if (typeof signatureInfoAbsence !== 'undefined' && signatureInfoAbsence && signatureInfoAbsence.name) qrGen = signatureInfoAbsence.name;
                else if (typeof signatureInfo !== 'undefined' && signatureInfo && signatureInfo.name) qrGen = signatureInfo.name;
                else if (typeof validateur !== 'undefined' && validateur) qrGen = ((validateur.nom || '') + ' ' + (validateur.prenom || '')).trim();

                let qrTitle = "Document Officiel";
                if (typeof documentTitle !== 'undefined' && documentTitle) qrTitle = documentTitle;
                else if (typeof title !== 'undefined' && title) qrTitle = title;
                else if (typeof template !== 'undefined' && template && (template.nom || template.type)) qrTitle = (template.nom || template.type);
                // Inférence basée sur le nom de la variable de numéro ou de données
                else if (typeof row !== 'undefined' && row.type_document) qrTitle = row.type_document.replace(/_/g, ' ').toUpperCase();
                else if (typeof row !== 'undefined' && row.type_demande) qrTitle = row.type_demande.replace(/_/g, ' ').toUpperCase();
                else if (typeof document !== 'undefined' && document.type_document) qrTitle = document.type_document.replace(/_/g, ' ').toUpperCase();
                else if (typeof documentData !== 'undefined' && documentData.type_document) qrTitle = documentData.type_document.replace(/_/g, ' ').toUpperCase();
                else if (typeof demande !== 'undefined' && demande.type_demande) qrTitle = demande.type_demande.replace(/_/g, ' ').toUpperCase();
                else if (match.includes('Cessation')) qrTitle = "CERTIFICAT DE CESSATION DE SERVICE";
                else if (match.includes('Presence')) qrTitle = "ATTESTATION DE PRESENCE";
                else if (match.includes('Travail')) qrTitle = "ATTESTATION DE TRAVAIL";
                else if (match.includes('Sortie')) qrTitle = "AUTORISATION DE SORTIE DU TERRITOIRE";
                else if (match.includes('Absence')) qrTitle = "AUTORISATION D'ABSENCE";
                else if (match.includes('Reprise')) qrTitle = "CERTIFICAT DE REPRISE DE SERVICE";

                let qrMinistere = "N/A";
                if (typeof row !== 'undefined' && row.ministere_nom) qrMinistere = row.ministere_nom;
                else if (typeof agent !== 'undefined' && agent && agent.ministere) {
                    qrMinistere = typeof agent.ministere === 'object' ? (agent.ministere.nom || agent.ministere.libelle) : agent.ministere;
                } else if (typeof ministereName !== 'undefined') {
                    qrMinistere = ministereName;
                } else if (typeof documentData !== 'undefined' && documentData.ministere_nom) {
                    qrMinistere = documentData.ministere_nom;
                }

                await drawQRCode(doc, {
                    titre: qrTitle,
                    ministere: qrMinistere,
                    generatedAt: typeof generatedAt !== 'undefined' ? generatedAt : new Date(),
                    proprietaire: qrProp,
                    generateur: qrGen,
                    numeroDocument: qrDocNum
                });
            `;
        });

        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}



