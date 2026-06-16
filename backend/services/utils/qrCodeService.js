const QRCode = require('qrcode');

/**
 * Génère et place un code QR en bas à droite sur la page actuelle du document PDFKit.
 * 
 * @param {PDFDocument} doc - L'instance du document PDFKit
 * @param {Object} options - Les données du document
 * @param {string} options.titre - Le titre du document
 * @param {Date|string} options.generatedAt - La date de génération
 * @param {string} options.proprietaire - Le nom du propriétaire (ou agent concerné)
 * @param {string} options.generateur - Le nom du validateur/générateur
 * @param {string} options.numeroDocument - Le numéro séquentiel unique du document
 */




async function drawQRCode(doc, { titre, generatedAt, proprietaire, generateur, numeroDocument, ministere }) {
    try {
        const dateStr = generatedAt instanceof Date 
            ? generatedAt.toLocaleString('fr-FR') 
            : new Date(generatedAt || Date.now()).toLocaleString('fr-FR');

        const payload = {
            t: titre || 'Document Officiel',
            d: dateStr,
            p: proprietaire || 'N/A',
            g: generateur || 'Système',
            n: numeroDocument || 'N/A',
            m: ministere || 'N/A'
        };


        // Encodage en base64 (url-safe)
        const base64Data = encodeURIComponent(Buffer.from(JSON.stringify(payload)).toString('base64'));
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const qrData = `${baseUrl.replace(/\/$/, '')}/verify?data=${base64Data}`;

        // Génération du QR Code sous forme de Data URL avec une haute résolution
        const qrDataUri = await QRCode.toDataURL(qrData, {
            margin: 1,
            width: 300, // Augmenter la résolution pour éviter le flou (aliasing)
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // Calcul des coordonnées pour le placer juste au-dessus de la barre noire du footer
        const qrSize = 75; // Légèrement plus grand pour faciliter le scan
        
        const pageHeight = doc.page.height;
        
        // Marge de sécurité par rapport au bord de la page
        const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
        
        const xPos = leftMargin - 15; // Un peu en retrait sur la gauche
        
        // La ligne noire du footer se trouve à "pageHeight - 80"
        // On place le bas du QR code juste au-dessus, à "pageHeight - 85"
        const yPos = pageHeight - 85 - qrSize; 

        // Insertion dans le PDF
        doc.image(qrDataUri, xPos, yPos, {
            fit: [qrSize, qrSize],
            align: 'center',
            valign: 'center'
        });

        console.log('✅ [drawQRCode] QR Code inséré avec succès à la position:', { x: xPos, y: yPos });
    } catch (error) {
        console.error('❌ [drawQRCode] Erreur lors de la génération ou insertion du QR Code:', error);
    }
}

module.exports = {
    drawQRCode
};
