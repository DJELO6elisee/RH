const fs = require('fs');
const path = require('path');

const files = [
    path.join(__dirname, '../services/PDFKitGenerationService.js'),
    path.join(__dirname, '../services/MemoryPDFService.js')
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');

        // We want to replace the qrMinistere block:
        // let qrMinistere = "N/A";
        // if (typeof row !== 'undefined' && row.ministere_nom) qrMinistere = row.ministere_nom;
        // else if (typeof agent !== 'undefined' && agent && agent.ministere) {
        //     qrMinistere = typeof agent.ministere === 'object' ? (agent.ministere.nom || agent.ministere.libelle) : agent.ministere;
        // } else if (typeof ministereName !== 'undefined') {
        //     qrMinistere = ministereName;
        // } else if (typeof documentData !== 'undefined' && documentData.ministere_nom) {
        //     qrMinistere = documentData.ministere_nom;
        // }
        //
        // with a better logic.

        const regex = /let qrMinistere = "N\/A";[\s\S]*?qrMinistere = documentData\.ministere_nom;\s*\}/g;

        content = content.replace(regex, `let qrMinistere = "N/A";
                if (typeof row !== 'undefined' && row.ministere_nom) qrMinistere = row.ministere_nom;
                else if (typeof agent !== 'undefined' && agent && agent.ministere_nom) qrMinistere = agent.ministere_nom;
                else if (typeof agent !== 'undefined' && agent && agent.ministere) {
                    qrMinistere = typeof agent.ministere === 'object' ? (agent.ministere.nom || agent.ministere.libelle) : agent.ministere;
                } else if (typeof userInfo !== 'undefined' && userInfo && userInfo.ministere_nom) {
                    qrMinistere = userInfo.ministere_nom;
                } else if (typeof ministereName !== 'undefined') {
                    qrMinistere = ministereName;
                } else if (typeof documentData !== 'undefined' && documentData.ministere_nom) {
                    qrMinistere = documentData.ministere_nom;
                }`);

        fs.writeFileSync(file, content);
        console.log(`Fixed qrMinistere in ${file}`);
    }
}
