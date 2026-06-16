const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, '../services/PDFKitGenerationService.js'),
    path.join(__dirname, '../services/MemoryPDFService.js')
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // Remove the match.includes lines which are causing ReferenceError
        content = content.replace(/else if \(match\.includes\([^)]+\)\) qrTitle = "[^"]+";\s*/g, '');

        // Add a fallback title
        content = content.replace(/else if \(typeof demande !== 'undefined' && demande\.type_demande\) qrTitle = demande\.type_demande\.replace\(\/_\/g, ' '\)\.toUpperCase\(\);/g, 
            "else if (typeof demande !== 'undefined' && demande.type_demande) qrTitle = demande.type_demande.replace(/_/g, ' ').toUpperCase();\n                else if (qrDocNum.includes('CESS')) qrTitle = 'CERTIFICAT DE CESSATION DE SERVICE';\n                else if (qrDocNum.includes('REP')) qrTitle = 'CERTIFICAT DE REPRISE DE SERVICE';\n                else if (qrDocNum.includes('ABS')) qrTitle = 'AUTORISATION D\\'ABSENCE';\n                else if (qrDocNum.includes('PRES')) qrTitle = 'ATTESTATION DE PRESENCE';\n                else if (qrDocNum.includes('TRAV')) qrTitle = 'ATTESTATION DE TRAVAIL';\n                else if (qrDocNum.includes('SORT')) qrTitle = 'AUTORISATION DE SORTIE DU TERRITOIRE';\n                else if (qrDocNum.includes('MUT')) qrTitle = 'NOTE DE MUTATION';");

        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
}
