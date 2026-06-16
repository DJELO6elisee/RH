const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    path.join(__dirname, 'services', 'PDFKitGenerationService.js'),
    path.join(__dirname, 'services', 'MemoryPDFService.js')
];

const replacementCode = `
                try {
                    const qrDocNum = typeof documentNumber !== 'undefined' ? documentNumber : (typeof numeroDocument !== 'undefined' ? numeroDocument : (typeof noteServiceNumber !== 'undefined' ? noteServiceNumber : 'N/A'));
                    const qrProp = typeof agentNameParts !== 'undefined' && agentNameParts ? agentNameParts.fullWithCivilite : (typeof agent !== 'undefined' && agent ? ((agent.nom || '') + ' ' + (agent.prenom || '')).trim() : 'N/A');
                    let qrGen = 'Système';
                    if (typeof signatureInfoAbsence !== 'undefined' && signatureInfoAbsence && signatureInfoAbsence.name) qrGen = signatureInfoAbsence.name;
                    else if (typeof signatureInfo !== 'undefined' && signatureInfo && signatureInfo.name) qrGen = signatureInfo.name;
                    else if (typeof validateur !== 'undefined' && validateur) qrGen = ((validateur.nom || '') + ' ' + (validateur.prenom || '')).trim();
                    
                    await drawQRCode(doc, {
                        titre: "Document Officiel",
                        generatedAt: typeof generatedAt !== 'undefined' ? generatedAt : new Date(),
                        proprietaire: qrProp,
                        generateur: qrGen,
                        numeroDocument: qrDocNum
                    });
                } catch (qrErr) {
                    console.error('Erreur insertion QR:', qrErr);
                }
                doc.end();`;

for (const filePath of filesToUpdate) {
    if (!fs.existsSync(filePath)) {
        console.error('Fichier introuvable:', filePath);
        continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ajouter l'import si pas présent
    if (!content.includes("const { drawQRCode }")) {
        content = content.replace(/(const .* = require\(['"].*['"]\);)/, "$1\nconst { drawQRCode } = require('./utils/qrCodeService');");
    }
    
    // Remplacer doc.end(); par notre bloc
    // On utilise une regex pour trouver "doc.end();" avec ses espaces d'indentation
    content = content.replace(/([ \t]+)doc\.end\(\);/g, (match, indent) => {
        // Remplacer les espaces initiaux du replacementCode par l'indentation correcte
        const indentedReplacement = replacementCode.replace(/\n                /g, '\n' + indent);
        return indentedReplacement;
    });
    
    fs.writeFileSync(filePath, content);
    console.log('✅ Mis à jour:', filePath);
}
