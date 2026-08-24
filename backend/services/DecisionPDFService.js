const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { drawOfficialHeaderPDF } = require('./officialHeader');
const { drawQRCode } = require('./utils/qrCodeService');

// ── Constantes typographiques identiques aux autres documents ──────────────
const BASE_FONT = 'Courier';
const BOLD_FONT = 'Courier-Bold';
const FONT_TITLE = 14;
const FONT_BODY = 12;
const FONT_SMALL = 10;

// ── Contenu des "Vu" ────────────────────────────────────────────────────────
const VUS_COLLECTIF = [
    'la Constitution ;',
    'la loi n°2023-892 du 23 novembre 2023 portant Statut Général de la Fonction Publique ;',
    'le décret n° 2012-928 du 19 septembre 2012 portant nomination du Directeur des Ressources Humaines du Ministère du Tourisme ;',
    'le décret n° 2021-462 du 08 septembre 2021 portant organisation du Ministère du Tourisme et des Loisirs ;',
    "le décret n°2024-139 du 13 mars 2024 modifiant le décret n° 2011-290 du 12 octobre 2011 portant institution du poste de Directeur des Ressources Humaines dans tous les Ministères ;",
    "le décret n°2025-120 du 26 février 2025 portant modalités communes d'application de la loi portant Statut Général de la Fonction Publique ;",
    "le décret n°2025-121 du 26 février 2025 portant modalités particulières d'application de la loi portant Statut Général de la Fonction Publique ;",
    'le décret n°2026-07 du 21 janvier 2026 portant nomination du Premier Ministre, Chef du Gouvernement ;',
    "le décret n°2026-08 du 23 janvier 2026 portant nomination des membres du Gouvernement ;",
    "le décret n°2026-84 du 04 mars 2026 portant attributions des membres du Gouvernement ;",
    "le soit transmis ou les demandes formulées par les intéressé(e)s ;"
];

const VUS_INDIVIDUEL = [
    'la Constitution ;',
    'la loi n°2023-892 du 23 novembre 2023 portant Statut Général de la Fonction Publique ;',
    'le décret n° 2012-928 du 19 septembre 2012 portant nomination du Directeur des Ressources Humaines du Ministère du Tourisme ;',
    'le décret n° 2021-462 du 08 septembre 2021 portant organisation du Ministère du Tourisme et des Loisirs ;',
    "le décret n°2024-139 du 13 mars 2024 modifiant le décret n° 2011-290 du 12 octobre 2011 portant institution du poste de Directeur des Ressources Humaines dans tous les Ministères ;",
    "le décret n°2025-120 du 26 février 2025 portant modalités communes d'application de la loi portant Statut Général de la Fonction Publique ;",
    "le décret n°2025-121 du 26 février 2025 portant modalités particulières d'application de la loi portant Statut Général de la Fonction Publique ;",
    'le décret n°2026-07 du 21 janvier 2026 portant nomination du Premier Ministre, Chef du Gouvernement ;',
    "le décret n°2026-08 du 23 janvier 2026 portant nomination des membres du Gouvernement ;",
    "le décret n°2026-84 du 04 mars 2026 portant attributions des membres du Gouvernement ;",
    "le soit transmis ou la demande formulée par l'intéressé(e) ;"
];

// ── Helper : dessiner les "Vu" correctement alignés ────────────────────────
// "Vu" en gras à gauche, texte à droite - positionnement absolu pour éviter
// le bug PDFKit avec continued:true qui écrase la largeur disponible.
function drawVus(doc, vus, leftX, pageWidth) {
    const vuIndent = 28; // largeur réservée pour le label "Vu"
    const textX = leftX + vuIndent;
    const textW = pageWidth - vuIndent;

    for (const vu of vus) {
        // Pré-calculer la hauteur pour gérer le saut de page manuel
        const height = doc.heightOfString(vu, { width: textW, align: 'justify' });
        if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
        }

        const startY = doc.y;
        // Label "Vu" en gras - pas de x/y forcé si on gère bien le layout, mais
        // puisqu'on positionne en absolu, on s'assure qu'on est sur la bonne page.
        doc.font(BOLD_FONT).fontSize(FONT_BODY)
            .text('Vu', leftX, startY, { lineBreak: false });
        // Texte aligné à droite du label - positionnement absolu
        doc.font(BASE_FONT).fontSize(FONT_BODY)
            .text(vu, textX, startY, { width: textW, align: 'justify' });
        // Petit espace entre les items (doc.y est déjà avancé après le texte)
        doc.y += 2;
    }
}

// ── Helper : dessiner les articles ─────────────────────────────────────────
// Courier est monospace : largeur d'un caractère ≈ fontSize × 0.6 pt
// On utilise cela pour calculer la largeur du préfixe "Article N" et
// positionner le texte restant en absolu (évite le NaN avec lineBreak:false).
function drawArticle(doc, numero, texte, leftX, pageWidth) {
    const prefix = `Article ${numero}`;
    // Largeur estimée du préfixe en police Courier-Bold
    const prefixWidth = prefix.length * FONT_BODY * 0.6 + 2;
    const textX = leftX + prefixWidth;
    const textW = pageWidth - prefixWidth;

    const fullText = ` : ${texte}`;
    const height = doc.heightOfString(fullText, { width: textW, align: 'justify' });
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
    }

    const startY = doc.y;
    doc.font(BOLD_FONT).fontSize(FONT_BODY)
        .text(prefix, leftX, startY, { lineBreak: false });
    doc.font(BASE_FONT).fontSize(FONT_BODY)
        .text(fullText, textX, startY, { width: textW, align: 'justify' });
    doc.y += 4;
}

/**
 * Service de génération PDF pour les décisions de congé
 * Utilise PDFKit (pure Node.js, aucune dépendance système requise)
 * Police : Courier/Courier-Bold — identique aux autres documents
 */
class DecisionPDFService {

    /**
     * Génère un PDF pour une décision collective
     */
    static async generateCollective(decision, agents, validateur, annee) {
        const outputDir = path.join(__dirname, '..', 'uploads', 'decisions');
        await fs.mkdir(outputDir, { recursive: true });

        const timestamp = Date.now();
        const fileName = `decision_collective_${decision.id}_${timestamp}.pdf`;
        const outputPath = path.join(outputDir, fileName);

        await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 45, right: 45 }, autoFirstPage: true });
            const stream = fsSync.createWriteStream(outputPath);
            doc.pipe(stream);

            const leftX = doc.page.margins.left;
            const pageWidth = doc.page.width - leftX - doc.page.margins.right;

            const dateStr = decision.date_decision
                ? new Date(decision.date_decision).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
                : new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

            const directionName = decision.direction_libelle || decision.sous_direction_libelle || 'la Direction des Ressources Humaines';
            const numeroDocument = decision.numero_acte || '_______/MTL/DRH/SDGP';
            const nbAgents = agents ? agents.length : 0;

            // ── EN-TÊTE ──────────────────────────────────────────────────────
            drawOfficialHeaderPDF(doc, {
                documentNumber: numeroDocument,
                dateString: dateStr,
                agentDirectionName: 'DIRECTION DES RESSOURCES HUMAINES',
                validatorDirectionName: undefined
            }).then(async () => {

                // ── TITRE PRINCIPAL ──────────────────────────────────────────────
                doc.moveDown(0.5);
                // "Portant attribution..." placé à gauche sous le numéro
                doc.font(BOLD_FONT).fontSize(FONT_BODY)
                    .text(`Portant attribution d'un congé annuel au titre de l'année ${annee}`, leftX, doc.y, { width: pageWidth / 2, align: 'left' });

                doc.moveDown(1.5);
                // "MINISTRE..." centré sur toute la largeur
                doc.font(BOLD_FONT).fontSize(FONT_BODY)
                    .text('MINISTRE DU TOURISME ET DES LOISIRS,', leftX, doc.y, { width: pageWidth, align: 'center' });

                // ── VU ───────────────────────────────────────────────────────────
                doc.moveDown(0.5);
                drawVus(doc, VUS_COLLECTIF, leftX, pageWidth);

                // ── DECIDE ───────────────────────────────────────────────────────
                doc.moveDown(0.6);
                doc.font(BOLD_FONT).fontSize(FONT_TITLE)
                    .text('D  E  C  I  D  E', { align: 'center', underline: true });

                // ── ARTICLES ─────────────────────────────────────────────────────
                doc.moveDown(0.5);
                drawArticle(doc, 1,
                    `Un congé annuel de 30 jours consécutifs au titre de l'année ${annee} à solde de présence pour en jouir à leur frais, est accordé aux agents ci-dessous désignés en service à ${directionName}.`,
                    leftX, pageWidth);

                // ── TABLEAU DES AGENTS ────────────────────────────────────────────
                if (agents && agents.length > 0) {
                    // Vérifier si on a besoin d'une nouvelle page pour le tableau
                    const estHauteurTableau = 20 + agents.length * 18;
                    if (doc.y + estHauteurTableau > doc.page.height - 120) {
                        doc.addPage();
                    }

                    const colWidths = [28, 42, 175, 75, 175];
                    const rowH = 17;
                    let tableX = leftX;
                    let tableY = doc.y + 4;

                    // En-tête tableau
                    doc.font(BOLD_FONT).fontSize(FONT_SMALL);
                    let cx = tableX;
                    const headerCells = ['N°', 'CIVILITE', 'NOM ET PRENOMS', 'MATRICULE', 'EMPLOI'];
                    let headerMaxHeight = 17;
                    headerCells.forEach((h, i) => {
                        const hHeight = doc.heightOfString(h, { width: colWidths[i] - 4 });
                        if (hHeight + 8 > headerMaxHeight) headerMaxHeight = hHeight + 8;
                    });

                    headerCells.forEach((h, i) => {
                        doc.rect(cx, tableY, colWidths[i], headerMaxHeight).fillAndStroke('#e8e8e8', '#000');
                        // Centrage vertical rudimentaire
                        const yOffset = (headerMaxHeight - doc.heightOfString(h, { width: colWidths[i] - 4 })) / 2;
                        doc.fillColor('#000').text(h, cx + 2, tableY + yOffset, { width: colWidths[i] - 4, align: 'center' });
                        cx += colWidths[i];
                    });
                    tableY += headerMaxHeight;

                    // Lignes agents
                    doc.font(BASE_FONT).fontSize(FONT_SMALL).fillColor('#000');
                    agents.forEach((agent, idx) => {
                        const civilite = agent.sexe === 'F' ? (agent.civilite || 'Mme') : 'M.';
                        const nomComplet = `${(agent.nom || '').toUpperCase()} ${(agent.prenom || '').toUpperCase()}`;
                        const emploi = agent.emploi || agent.fonction_actuelle || '';
                        const cells = [String(idx + 1), civilite, nomComplet, agent.matricule || '', emploi];

                        let maxRowHeight = 17;
                        cells.forEach((cell, i) => {
                            const cellHeight = doc.heightOfString(cell, { width: colWidths[i] - 4 });
                            if (cellHeight + 8 > maxRowHeight) maxRowHeight = cellHeight + 8;
                        });

                        if (tableY + maxRowHeight > doc.page.height - 100) {
                            doc.addPage();
                            tableY = doc.page.margins.top;
                        }

                        cx = tableX;
                        cells.forEach((cell, i) => {
                            doc.rect(cx, tableY, colWidths[i], maxRowHeight).stroke();
                            const yOffset = (maxRowHeight - doc.heightOfString(cell, { width: colWidths[i] - 4 })) / 2;
                            doc.text(cell, cx + 2, tableY + yOffset, { width: colWidths[i] - 4, align: i === 2 ? 'left' : 'center' });
                            cx += colWidths[i];
                        });
                        tableY += maxRowHeight;
                    });
                    doc.y = tableY + 4;
                }

                drawArticle(doc, 2, "A l'issue de leur congé, les intéressé(e)s reprendront service à leur poste.", leftX, pageWidth);
                drawArticle(doc, 3, "La présente décision de congé qui prendra effet pour compter de la date de cessation de service des intéressé(e)s sera enregistrée, communiquée et publiée partout où besoin sera.", leftX, pageWidth);

                // ── PIED DE PAGE ─────────────────────────────────────────────────
                doc.moveDown(0.8);
                const footerY = doc.y;
                const ampX = leftX;
                const sigX = leftX + pageWidth / 2 + 10;
                const sigW = pageWidth / 2 - 10;

                // Ampliations
                doc.font(BOLD_FONT).fontSize(FONT_SMALL)
                    .text('Ampliations :', ampX, footerY, { underline: true });
                doc.font(BASE_FONT).fontSize(FONT_SMALL);
                const ampW = pageWidth / 2 - 20;
                [
                    ['- MTL/CAB', '1'],
                    ['- MFPMA', '1'],
                    ['- DRH', '1'],
                    ['- Contrôle Financier', '1'],
                    [`- Intéressé(e)s`, String(nbAgents)],
                    ['- Archives', '1'],
                    ['---', ''],
                    ['', String(nbAgents + 5)]
                ].forEach(([label, val], i) => {
                    const ly = footerY + 14 + i * 11;
                    doc.text(label, ampX, ly, { width: ampW - 20, lineBreak: false });
                    if (val) doc.text(val, ampX + ampW - 15, ly, { width: 15, align: 'right', lineBreak: false });
                });

                // Signature
                const sigName = validateur && validateur.prenom && validateur.nom
                    ? `${validateur.prenom} ${validateur.nom}`
                    : 'Yawa Florentine ASSARI épse AKPALE';

                doc.font(BASE_FONT).fontSize(FONT_SMALL)
                    .text(`Fait à Abidjan, le ${dateStr}`, sigX, footerY, { width: sigW });
                doc.font(BOLD_FONT).fontSize(FONT_SMALL)
                    .text('P/Le Ministre et P.O.,', sigX, footerY + 16, { width: sigW });
                doc.text('le Directeur des Ressources Humaines', sigX, footerY + 28, { width: sigW });
                doc.font(BASE_FONT).fontSize(FONT_SMALL)
                    .text(sigName, sigX, footerY + 70, { width: sigW });

                try {
                    let qrTitle = 'Décision Collective de Congé';
                    let qrProp = 'Agents listés';
                    let qrDocNum = numeroDocument;
                    let qrGen = 'Système';
                    if (validateur && validateur.prenom && validateur.nom) {
                        qrGen = `${validateur.prenom} ${validateur.nom}`;
                    }
                    let qrMinistere = 'Ministère du Tourisme et des Loisirs';
                    
                    await drawQRCode(doc, {
                        titre: qrTitle,
                        ministere: qrMinistere,
                        generatedAt: new Date(),
                        proprietaire: qrProp,
                        generateur: qrGen,
                        numeroDocument: qrDocNum
                    });
                } catch (qrErr) {
                    console.error('Erreur insertion QR (Collective):', qrErr);
                }

                doc.end();
                stream.on('finish', resolve);
                stream.on('error', reject);
            }).catch(reject);
        });

        return `uploads/decisions/${fileName}`;
    }

    /**
     * Génère un PDF pour une décision individuelle (une seule page A4)
     */
    static async generateIndividuelle(decision, agent, validateur, annee) {
        const outputDir = path.join(__dirname, '..', 'uploads', 'decisions');
        await fs.mkdir(outputDir, { recursive: true });

        const timestamp = Date.now();
        const fileName = `decision_individuelle_${decision.id}_${timestamp}.pdf`;
        const outputPath = path.join(outputDir, fileName);

        await new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 25, bottom: 25, left: 45, right: 45 }, autoFirstPage: true });
            const stream = fsSync.createWriteStream(outputPath);
            doc.pipe(stream);

            const leftX = doc.page.margins.left;
            const pageWidth = doc.page.width - leftX - doc.page.margins.right;

            const dateStr = decision.date_decision
                ? new Date(decision.date_decision).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
                : new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

            const directionName = decision.direction_libelle || (agent && agent.direction_nom) || 'la Direction des Ressources Humaines';
            const numeroDocument = decision.numero_acte || '_______/MTL/DRH/SDGP';

            // Construction du texte désignant l'agent
            let agentText = '';
            if (agent && agent.nom) {
                const civilite = agent.sexe === 'F' ? (agent.civilite || 'Mme') : 'M.';
                const nomComplet = `${(agent.nom || '').toUpperCase()} ${(agent.prenom || '').toUpperCase()}`;
                const emploi = (agent.emploi || agent.fonction_actuelle || '').toUpperCase();
                agentText = `à ${civilite} ${nomComplet}, matricule ${agent.matricule || ''}, ${emploi} à ${directionName}`;
            } else {
                agentText = `à _____________________, matricule ________________, __________________ à ${directionName}`;
            }

            // ── EN-TÊTE ──────────────────────────────────────────────────────
            drawOfficialHeaderPDF(doc, {
                documentNumber: numeroDocument,
                dateString: dateStr,
                agentDirectionName: 'DIRECTION DES RESSOURCES HUMAINES',
                validatorDirectionName: undefined
            }).then(async () => {

                // ── TITRE PRINCIPAL ──────────────────────────────────────────────
                doc.moveDown(0.5);
                // "Portant attribution..." placé à gauche sous le numéro
                doc.font(BOLD_FONT).fontSize(FONT_BODY)
                    .text(`Portant attribution d'un congé annuel au titre de l'année ${annee}`, leftX, doc.y, { width: pageWidth / 2, align: 'left' });

                doc.moveDown(1.5);
                // "MINISTRE..." centré sur toute la largeur
                doc.font(BOLD_FONT).fontSize(FONT_BODY)
                    .text('MINISTRE DU TOURISME ET DES LOISIRS,', leftX, doc.y, { width: pageWidth, align: 'center' });

                // ── VU ───────────────────────────────────────────────────────────
                doc.moveDown(0.5);
                drawVus(doc, VUS_INDIVIDUEL, leftX, pageWidth);

                // ── DECIDE ───────────────────────────────────────────────────────
                doc.moveDown(0.6);
                doc.font(BOLD_FONT).fontSize(FONT_TITLE)
                    .text('D  E  C  I  D  E', { align: 'center', underline: true });

                // ── ARTICLES ─────────────────────────────────────────────────────
                doc.moveDown(0.5);
                drawArticle(doc, 1,
                    `Un congé annuel de 30 jours consécutifs au titre de l'année ${annee} à solde de présence pour en jouir à ses frais, est accordé ${agentText}.`,
                    leftX, pageWidth);

                drawArticle(doc, 2, "A l'issue de leur congé, l'intéressé(e) reprendra service à son poste.", leftX, pageWidth);

                drawArticle(doc, 3, "La présente décision de congé qui prendra effet pour compter de la date de cessation de service de l'intéressé(e) sera enregistrée, communiquée et publiée partout où besoin sera.", leftX, pageWidth);

                // ── PIED DE PAGE ─────────────────────────────────────────────────
                doc.moveDown(0.8);
                const footerY = doc.y;
                const ampX = leftX;
                const sigX = leftX + pageWidth / 2 + 10;
                const sigW = pageWidth / 2 - 10;

                // Ampliations
                doc.font(BOLD_FONT).fontSize(FONT_SMALL)
                    .text('Ampliations :', ampX, footerY, { underline: true });
                doc.font(BASE_FONT).fontSize(FONT_SMALL);
                const ampW = pageWidth / 2 - 20;
                [
                    ['- MTL/CAB', '1'],
                    ['- MFPMA', '1'],
                    ['- DRH', '1'],
                    ['- Contrôle Financier', '1'],
                    ['- Intéressé(e)', '1'],
                    ['- Archives', '1'],
                    ['---', ''],
                    ['', '6']
                ].forEach(([label, val], i) => {
                    const ly = footerY + 14 + i * 11;
                    doc.text(label, ampX, ly, { width: ampW - 20, lineBreak: false });
                    if (val) doc.text(val, ampX + ampW - 15, ly, { width: 15, align: 'right', lineBreak: false });
                });

                // Signature
                const sigName = validateur && validateur.prenom && validateur.nom
                    ? `${validateur.prenom} ${validateur.nom}`
                    : 'Yawa Florentine ASSARI épse AKPALE';

                doc.font(BASE_FONT).fontSize(FONT_SMALL)
                    .text(`Fait à Abidjan, le ${dateStr}`, sigX, footerY, { width: sigW });
                doc.font(BOLD_FONT).fontSize(FONT_SMALL)
                    .text('P/Le Ministre et P.O.,', sigX, footerY + 16, { width: sigW });
                doc.text('le Directeur des Ressources Humaines', sigX, footerY + 28, { width: sigW });
                doc.font(BASE_FONT).fontSize(FONT_SMALL)
                    .text(sigName, sigX, footerY + 70, { width: sigW });

                try {
                    let qrTitle = 'Décision Individuelle de Congé';
                    let qrProp = agent ? `${agent.prenom || ''} ${agent.nom || ''}`.trim() : '';
                    let qrDocNum = numeroDocument;
                    let qrGen = 'Système';
                    if (validateur && validateur.prenom && validateur.nom) {
                        qrGen = `${validateur.prenom} ${validateur.nom}`;
                    }
                    let qrMinistere = 'Ministère du Tourisme et des Loisirs';
                    
                    await drawQRCode(doc, {
                        titre: qrTitle,
                        ministere: qrMinistere,
                        generatedAt: new Date(),
                        proprietaire: qrProp,
                        generateur: qrGen,
                        numeroDocument: qrDocNum
                    });
                } catch (qrErr) {
                    console.error('Erreur insertion QR (Individuelle):', qrErr);
                }

                doc.end();
                stream.on('finish', resolve);
                stream.on('error', reject);
            }).catch(reject);
        });

        return `uploads/decisions/${fileName}`;
    }
}

module.exports = DecisionPDFService;
