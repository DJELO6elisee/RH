const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { drawOfficialHeaderPDF, resolveOfficialHeaderContext, pickFirstNonEmptyString } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference, generateNoteDeServiceNumber, generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
const { hydrateAgentWithLatestFunction, getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel, formatAgentDisplayName } = require('./utils/agentFunction');
const { attachActiveSignature, fetchDRHForSignature } = require('./utils/signatureUtils');
const { formatAffectationPhrase } = require('./utils/frenchGrammar');

const BASE_FONT = 'Times-Roman';
const BOLD_FONT = 'Times-Bold';
const TITLE_FONT_SIZE = 18;
const SUBTITLE_FONT_SIZE = 16;
const BODY_FONT_SIZE = 16;
const FOOTER_FONT_SIZE = 8;

function drawStandardSignature(doc, startY = 0, signatureInfo = {}, options = {}) {
    const { role, name, imagePath } = signatureInfo || {};
    // Afficher la signature si on a au moins un rôle, un nom ou une image
    if (!role && !name && !imagePath) {
        return startY;
    }

    const pageWidth = doc.page.width;
    const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
    const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
    const usableWidth = pageWidth - leftMargin - rightMargin;
    const targetY = Math.max(startY, (doc.page.height / 2) + 20);
    const spacing = options.spacing || 18;

    let currentY = targetY;
    const hasImage = imagePath && fsSync.existsSync(imagePath);

    if (role) {
        doc.font(BOLD_FONT)
            .fontSize(SUBTITLE_FONT_SIZE)
            .text(role, leftMargin, currentY, {
                align: 'center',
                width: usableWidth
            });
        currentY = doc.y + spacing;
    }

    if (hasImage) {
        const imageWidth = options.imageWidth || Math.min(usableWidth * 0.5, 200);
        const imageHeight = options.imageHeight || 80;
        const imageX = leftMargin + (usableWidth - imageWidth) / 2;
        try {
            doc.image(imagePath, imageX, currentY, {
                fit: [imageWidth, imageHeight],
                align: 'center',
                valign: 'center'
            });
            currentY += imageHeight + 10;
        } catch (error) {
            console.error('❌ Erreur lors de l\'insertion de la signature dans le PDF:', error);
        }
    }

    if (name) {
        doc.font(BOLD_FONT)
            .fontSize(BODY_FONT_SIZE)
            .text(name, leftMargin, currentY, {
                align: 'center',
                width: usableWidth
            });
        currentY = doc.y;
    }

    return currentY;
}

function drawStandardSignatureRight(doc, startY = 0, signatureInfo = {}, options = {}) {
    const { role, name, imagePath } = signatureInfo || {};
    // Afficher la signature si on a au moins un rôle, un nom ou une image
    if (!role && !name && !imagePath) {
        return startY;
    }

    const pageWidth = doc.page.width;
    const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
    const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
    const usableWidth = pageWidth - leftMargin - rightMargin;
    const signatureWidth = options.signatureWidth || 200;
    const spacing = options.spacing || 18;
    const limitNameToSignature = !!options.limitNameToSignature;
    const respectStartY = options.respectStartY === true;

    let currentY = respectStartY ? startY : Math.max(startY, doc.page.height - 150);
    const signatureX = pageWidth - rightMargin - signatureWidth;
    const hasImage = imagePath && fsSync.existsSync(imagePath);

    console.log(`🎨 [drawStandardSignatureRight] Affichage signature:`, {
        hasRole: !!role,
        hasName: !!name,
        hasImage: hasImage,
        imagePath: imagePath,
        currentY: currentY,
        signatureX: signatureX
    });

    if (role) {
        // Augmenter la taille du rôle pour la signature
        const roleFontSize = options.roleFontSize || SUBTITLE_FONT_SIZE + 1; // 17 au lieu de 16
        doc.font(BOLD_FONT)
            .fontSize(roleFontSize)
            .text(role, signatureX, currentY, {
                align: 'right',
                width: signatureWidth
            });
        currentY = doc.y + spacing;
        console.log(`✅ [drawStandardSignatureRight] Rôle affiché à Y=${currentY - spacing}`);
    }

    if (hasImage) {
        const imageWidth = options.imageWidth || 120;
        const imageHeight = options.imageHeight || 60;
        const imageX = pageWidth - rightMargin - imageWidth;
        try {
            console.log(`🖼️ [drawStandardSignatureRight] Tentative d'insertion image à (${imageX}, ${currentY})`);
            doc.image(imagePath, imageX, currentY, {
                fit: [imageWidth, imageHeight]
            });
            currentY += imageHeight + 10;
            console.log(`✅ [drawStandardSignatureRight] Image insérée avec succès à (${imageX}, ${currentY - imageHeight - 10})`);
        } catch (error) {
            console.error('❌ [drawStandardSignatureRight] Erreur lors de l\'insertion de la signature dans le PDF:', error);
        }
    } else if (imagePath) {
        console.warn(`⚠️ [drawStandardSignatureRight] Fichier de signature introuvable: ${imagePath}`);
    }

    if (name) {
        // Forcer le nom sur une seule ligne (réduction auto de la police si nécessaire)
        let nameFontSize = options.nameFontSize || BODY_FONT_SIZE + 2;
        // Optionnel: garder le nom strictement dans le bloc signature à droite
        const nameWidth = limitNameToSignature ? signatureWidth : Math.max(480, usableWidth * 0.98);
        const nameX = limitNameToSignature ? signatureX : leftMargin;
        const rawName = String(name).trim();
        const minNameFontSize = options.minNameFontSize || 9;

        doc.font(BOLD_FONT).fontSize(nameFontSize);
        let textWidth = doc.widthOfString(rawName);
        while (textWidth > nameWidth && nameFontSize > minNameFontSize) {
            nameFontSize -= 1;
            doc.font(BOLD_FONT).fontSize(nameFontSize);
            textWidth = doc.widthOfString(rawName);
        }

        doc.font(BOLD_FONT)
            .fontSize(nameFontSize)
            .text(rawName, nameX, currentY, {
                align: 'right',
                width: nameWidth,
                lineBreak: false
            });
        currentY += Math.max(nameFontSize + 4, BODY_FONT_SIZE);
        console.log(`✅ [drawStandardSignatureRight] Nom affiché à Y=${currentY} avec taille ${nameFontSize}px et largeur ${nameWidth}px`);
    }

    return currentY;
}
const FOOTER_SMALL_FONT_SIZE = 7;

async function resolveSignatureInfo(validateur, fallbackRole = 'Le Directeur') {
    // Récupérer la signature active depuis la base de données
    if (validateur && validateur.id) {
        await attachActiveSignature(validateur);
        console.log(`🔍 [resolveSignatureInfo] Signature attachée pour validateur ${validateur.id}:`, {
            hasSignaturePath: !!validateur.signature_path,
            signaturePath: validateur.signature_path,
            signatureType: validateur.signature_type
        });
    }

    const name = formatAgentDisplayName(validateur);
    const role = (validateur && validateur.signatureRoleOverride) || normalizeFunctionLabel(getResolvedFunctionLabel(validateur), fallbackRole);
    let imagePath = null;

    if (validateur && validateur.signature_path) {
        const sanitized = validateur.signature_path
            .replace(/^\/?uploads[\\/]/, '')
            .replace(/\\/g, '/');
        imagePath = path.join(__dirname, '..', 'uploads', sanitized);

        if (!fsSync.existsSync(imagePath)) {
            console.warn(`⚠️ Fichier de signature introuvable: ${imagePath}`);
            imagePath = null;
        } else {
            console.log(`✅ [resolveSignatureInfo] Fichier de signature trouvé: ${imagePath}`);
        }
    } else {
        console.warn(`⚠️ [resolveSignatureInfo] Aucun signature_path pour validateur:`, {
            id: validateur && validateur.id,
            nom: validateur && validateur.nom,
            prenom: validateur && validateur.prenom
        });
    }

    const result = {
        role,
        name,
        imagePath: imagePath && fsSync.existsSync(imagePath) ? imagePath : null
    };

    console.log(`📝 [resolveSignatureInfo] Résultat:`, {
        hasRole: !!result.role,
        hasName: !!result.name,
        hasImagePath: !!result.imagePath,
        role: result.role,
        name: result.name
    });

    return result;
}

const DEFAULT_TEXT_OPTIONS = {
    align: 'left'
};

function normalizeTitleCase(value = '') {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function formatAgentName(agent = {}) {
    const { normalizeCivilite } = require('./utils/agentFunction');
    const civilite = normalizeCivilite(agent.civilite, agent.sexe);
    const prenoms = (agent.prenom || '').toUpperCase().trim();
    const nom = (agent.nom || '').toUpperCase();
    const fullWithCivilite = [civilite, prenoms, nom].filter(Boolean).join(' ').trim();
    const full = [prenoms, nom].filter(Boolean).join(' ').trim();

    return {
        civilite,
        prenoms,
        nom,
        fullWithCivilite,
        full
    };
}

function writePrefixedBoldName(doc, prefix, nameParts, x, y, options = {}) {
    const baseOptions = {...DEFAULT_TEXT_OPTIONS, ...options, continued: true };
    const boldOptions = {...DEFAULT_TEXT_OPTIONS, ...options, continued: false };

    doc.font(BASE_FONT)
        .fontSize(BODY_FONT_SIZE)
        .text(prefix, x, y, baseOptions);
    doc.font(BOLD_FONT)
        .fontSize(BODY_FONT_SIZE)
        .text(nameParts.fullWithCivilite, boldOptions);
}

function writeBoldName(doc, nameParts, x, y, options = {}) {
    const boldOptions = {...DEFAULT_TEXT_OPTIONS, ...options };
    doc.font(BOLD_FONT)
        .fontSize(BODY_FONT_SIZE)
        .text(nameParts.fullWithCivilite, x, y, boldOptions);
}

function ensureMinistereSigle({ demande, agent, validateur, userInfo } = {}) {
    const resolvedSigle = pickFirstNonEmptyString([
        demande && demande.ministere_sigle,
        agent && agent.ministere_sigle,
        validateur && validateur.ministere_sigle,
        userInfo && userInfo.ministere_sigle
    ]);

    if (resolvedSigle) {
        if (agent && !agent.ministere_sigle) {
            agent.ministere_sigle = resolvedSigle;
        }
        if (validateur && !validateur.ministere_sigle) {
            validateur.ministere_sigle = resolvedSigle;
        }
    }

    return resolvedSigle;
}

function hasGenerationSource(demande = {}, options = {}) {
    return Boolean(
        options.generatedAt ||
        demande.date_generation ||
        demande.date_validation ||
        demande.date_approbation ||
        demande.date_decision ||
        demande.date_valide ||
        demande.validated_at ||
        demande.approved_at ||
        demande.updated_at ||
        demande.created_at
    );
}

function resolveGenerationDate(demande = {}, options = {}) {
    const candidates = [
        options.generatedAt,
        demande.date_generation,
        demande.date_validation,
        demande.date_approbation,
        demande.date_decision,
        demande.date_valide,
        demande.validated_at,
        demande.approved_at,
        demande.updated_at,
        demande.created_at
    ];

    for (const value of candidates) {
        if (!value) {
            continue;
        }
        const date = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }

    return new Date();
}

function isAgentWithSpecificPoste(roleNom = '') {
    if (!roleNom || typeof roleNom !== 'string') {
        return false;
    }

    const roleLower = roleNom.toLowerCase();
    const rolesSpecifiques = [
        'directeur',
        'drh',
        'sous_directeur',
        'chef_cabinet',
        'dir_cabinet',
        'directeur_general',
        'directeur_central'
    ];

    return rolesSpecifiques.includes(roleLower);
}

/** Détecte si le motif correspond au congé annuel (toutes variantes : avec/sans accent, underscore, pluriel). */
function isCongeAnnuelMotif(motif = '') {
    if (!motif || typeof motif !== 'string') return false;
    const normalized = motif.toLowerCase().replace(/_/g, ' ').trim();
    if (normalized.includes('congé annuel') || normalized.includes('conge annuel')) return true;
    if (normalized.includes('congés annuels') || normalized.includes('conges annuels')) return true;
    return (normalized.includes('congé') || normalized.includes('conge')) && (normalized.includes('annuel') || normalized.includes('annuels'));
}

/**
 * Vérifie si une date est un jour férié officiel en Côte d'Ivoire (jours fixes)
 * @param {Date} date - La date à vérifier
 * @returns {boolean} - true si c'est un jour férié
 */
function isJourFerie(date) {
    const month = date.getMonth() + 1; // Les mois sont 0-indexés, donc +1 pour obtenir le mois réel
    const day = date.getDate();

    // Jours fériés fixes en Côte d'Ivoire
    const joursFeries = [
        { month: 1, day: 1 }, // Jour de l'An
        { month: 5, day: 1 }, // Fête du Travail
        { month: 8, day: 7 }, // Fête Nationale
        { month: 8, day: 15 }, // Assomption
        { month: 11, day: 1 }, // Toussaint
        { month: 12, day: 7 }, // Fête de l'Indépendance
        { month: 12, day: 25 } // Noël
    ];

    return joursFeries.some(ferie => ferie.month === month && ferie.day === day);
}

/**
 * Ajuste la date de reprise pour éviter les weekends et jours fériés
 * @param {Date} date - La date de reprise initiale
 * @returns {Date} - La date ajustée
 */
function ajusterDateReprise(date) {
    if (!date || isNaN(date.getTime())) {
        return date;
    }

    let dateAjustee = new Date(date);
    let iterations = 0;
    const maxIterations = 10; // Éviter les boucles infinies

    // Ajuster la date jusqu'à ce qu'elle tombe un jour ouvrable non férié
    while (iterations < maxIterations) {
        const jourSemaine = dateAjustee.getDay(); // 0 = dimanche, 6 = samedi

        // Si c'est un samedi (6) ou dimanche (0), passer au lundi suivant
        if (jourSemaine === 0) { // Dimanche
            dateAjustee.setDate(dateAjustee.getDate() + 1); // Passer au lundi
        } else if (jourSemaine === 6) { // Samedi
            dateAjustee.setDate(dateAjustee.getDate() + 2); // Passer au lundi
        } else if (isJourFerie(dateAjustee)) {
            // Si c'est un jour férié, passer au lendemain
            dateAjustee.setDate(dateAjustee.getDate() + 1);
        } else {
            // Date valide (jour ouvrable non férié)
            break;
        }

        iterations++;
    }

    return dateAjustee;
}

class PDFKitGenerationService {

    /**
     * Génère un PDF d'autorisation d'absence conforme au modèle officiel
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {string} outputPath - Chemin de sortie pour le PDF
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin du fichier PDF généré
     */
    static async generateAutorisationAbsencePDF(demande, agent, validateur, outputPath, userInfo = null, options = {}) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'autorisation avec PDFKit pour la demande ${demande.id}...`);

                // Créer le répertoire de sortie s'il n'existe pas
                const outputDir = path.dirname(outputPath);
                await fs.mkdir(outputDir, { recursive: true });

                // Créer le document PDF
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Créer le stream de fichier
                const stream = require('fs').createWriteStream(outputPath);
                doc.pipe(stream);

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const hasExistingGeneration = hasGenerationSource(demande, options);
                let generatedAt = resolveGenerationDate(demande, options);
                if (!hasExistingGeneration && demande && demande.id) {
                    try {
                        const db = require('../config/database');
                        const result = await db.query(`
                            SELECT date_generation
                            FROM documents_autorisation
                            WHERE id_demande = $1 AND type_document = 'autorisation_absence'
                            ORDER BY date_generation DESC
                            LIMIT 1
                        `, [demande.id]);
                        if (result.rows.length > 0 && result.rows[0].date_generation) {
                            generatedAt = new Date(result.rows[0].date_generation);
                        }
                    } catch (lookupError) {
                        console.error('❌ Impossible de récupérer la date de génération depuis documents_autorisation:', lookupError);
                    }
                }
                if (!generatedAt || Number.isNaN(generatedAt.getTime())) {
                    generatedAt = new Date();
                }
                const documentNumber = (options && options.documentId != null && options && options.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: options.documentId, type_document: options.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({
                        demande,
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    });

                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.direction_nom = userInfo.direction_nom || agent.direction_nom || userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                    agent.ministere_sigle = userInfo.ministere_sigle || agent.ministere_sigle;

                    if (validateur) {
                        validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                        validateur.ministere_sigle = userInfo.ministere_sigle || validateur.ministere_sigle;
                        validateur.direction_nom = userInfo.direction_nom || userInfo.service_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });

                const agentMinistryName = agent.ministere_nom ||
                    (userInfo && userInfo.ministere_nom) ||
                    headerContext.ministryName ||
                    (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    '';
                const agentDirectionName = agent.direction_nom ||
                    agent.service_nom ||
                    agent.direction_generale_nom ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    headerContext.directionName ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    '';
                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    headerContext.ministryName ||
                    agentMinistryName;
                const validatorDirectionName = (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    headerContext.directionName ||
                    agentDirectionName;

                const displayDirectionName = agentDirectionName ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    validatorDirectionName ||
                    'DIRECTION DES RESSOURCES HUMAINES';

                if (!agent.ministere_nom && agentMinistryName) {
                    agent.ministere_nom = agentMinistryName;
                }
                if (!agent.direction_nom && agentDirectionName) {
                    agent.direction_nom = agentDirectionName;
                }
                if (!agent.service_nom && displayDirectionName) {
                    agent.service_nom = displayDirectionName;
                }

                const agentNameParts = formatAgentName(agent);
                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName: displayDirectionName,
                    validatorMinistryName,
                    validatorDirectionName
                });

                const primaryColor = '#000000';
                const secondaryColor = '#666666';
                const borderColor = '#000000';

                const titleY = headerBottom + 35;
                doc.rect(120, titleY - 12, 360, 34)
                    .lineWidth(2)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('AUTORISATION D\'ABSENCE', 120, titleY - 2, {
                        align: 'center',
                        width: 360
                    });

                // === CORPS DU DOCUMENT === (texte en paragraphes fluides, pas empilé)
                let yPosition = headerBottom + 100;

                const dateDebut = new Date(demande.date_debut);
                const dateFin = new Date(demande.date_fin);
                const differenceMs = dateFin.getTime() - dateDebut.getTime();
                const jours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1;

                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR');
                const dateFinStr = dateFin.toLocaleDateString('fr-FR');
                const nomComplet = agentNameParts.fullWithCivilite || `${agent.prenom || ''} ${agent.nom || ''}`.trim();
                const poste = getAgentPosteOuEmploi(agent);

                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor)
                    .text(
                        `Une autorisation d'absence de ${jours} jour${jours > 1 ? 's' : ''} valable du ${dateDebutStr} au ${dateFinStr} inclus est accordée à ${nomComplet}, matricule ${agent.matricule}, ${poste}, en service à la ${displayDirectionName}.`,
                        50,
                        yPosition, { align: 'justify', width: 500 }
                    );

                yPosition = doc.y + 18;

                doc.font(BOLD_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text('Motif de l\'absence : ', 50, yPosition, { align: 'left', width: 500, continued: true });
                doc.font(BASE_FONT)
                    .text(`${demande.description || 'affaires personnelles'}.`, { align: 'justify', width: 500 });

                yPosition = doc.y + 30;

                // === SIGNATURE === (même logique que attestation : position fixe remontée, à droite)
                const pageHeight = doc.page.height;
                const signatureBlockHeight = 115;
                const gapSignatureFooter = 14;
                const signatureStartY = (pageHeight - 115) - signatureBlockHeight - gapSignatureFooter;
                const bottomMargin = 55;
                const footerY = pageHeight - bottomMargin - 30;

                await attachActiveSignature(validateur);
                const signatureInfoAbsence = await resolveSignatureInfo(validateur);
                drawStandardSignatureRight(
                    doc,
                    signatureStartY,
                    signatureInfoAbsence, { signatureWidth: 320, imageWidth: 130, imageHeight: 72, spacing: 8, respectStartY: true }
                );

                // === FOOTER === (bien au-dessus de la marge pour que les 2 lignes restent sur la 1re page)
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(secondaryColor)
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 5, {
                            align: 'center',
                            width: 495
                        });

                const generatedAtString = generatedAt.toLocaleString('fr-FR');

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAtString} - Document N° ${documentNumber}`,
                        50, footerY + 14, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

                stream.on('finish', () => {
                    console.log(`✅ PDF d'autorisation généré avec succès: ${outputPath}`);
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    console.error('❌ Erreur lors de l\'écriture du PDF:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF d'autorisation d'absence avec nom de fichier automatique
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generateAutorisationAbsencePDFAuto(demande, agent, validateur, userInfo = null, generatedAt = null, documentOptions = null) {
        try {
            // Créer un nom de fichier unique
            const timestamp = Date.now();
            const fileName = `autorisation_absence_${documentOptions?.documentId ?? demande.id}_${timestamp}.pdf`;

            // Chemin complet vers le fichier PDF
            const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);

            // Générer le PDF
            const options = {...(generatedAt && { generatedAt }), ...(documentOptions && { documentId: documentOptions.documentId, typeDocument: documentOptions.typeDocument }) };
            await this.generateAutorisationAbsencePDF(demande, agent, validateur, outputPath, userInfo, options);

            // Retourner le chemin relatif pour la base de données
            const relativePath = `uploads/documents/${fileName}`;

            return relativePath;

        } catch (error) {
            console.error('❌ Erreur lors de la génération automatique du PDF:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF pour un document existant
     * @param {Object} document - Le document de la base de données
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generatePDFForDocument(document, userInfo = null) {
        try {
            // Récupérer les données nécessaires depuis la base de données
            const db = require('../config/database');

            const query = `
                SELECT d.*, 
                       doc.motif_cessation, doc.date_cessation,
                       doc.id_agent_generateur,
                       d.motif_conge, d.motif,
                       a.id as agent_id,
                       a.prenom, a.nom, a.matricule, a.sexe,
                       fa_actuel.fonction_libele as fonction_actuelle_libele,
                       a.fonction_actuelle as poste,
                       a.fonction_actuelle,
                       a.date_de_naissance, a.lieu_de_naissance,
                       a.date_prise_service_dans_la_direction, a.date_prise_service_au_ministere,
                       a.date_embauche, a.id_direction, a.id_ministere,
                       c.libele as civilite,
                       s.libelle as service_nom, s.libelle as direction_nom,
                       COALESCE(dg.libelle, dg_via_dir.libelle) AS direction_generale_nom,
                       m.nom as ministere_nom, m.sigle as ministere_sigle,
                       cat.libele as classe_libelle,
                       COALESCE(a.date_embauche, a.date_prise_service_au_ministere) as grade_date_entree,
                       COALESCE(val.id, doc.id_agent_generateur) as validateur_id,
                       val.prenom as validateur_prenom, val.nom as validateur_nom,
                       val.fonction_actuelle as validateur_fonction,
                       fa.designation_poste as validateur_fonction_designation,
                       val_dir.libelle as validateur_direction_nom,
                       m_val.nom as validateur_ministere_nom,
                       m_val.sigle as validateur_ministere_sigle,
                       val_civ.libele as validateur_civilite,
                       doc.type_document, doc.id_demande, doc.date_generation,
                       ga_actuelle.grade_libele as grade_libele,
                       ech_actuelle.echelon_libelle as echelon_libelle,
                       ta.libele as type_agent_libele,
                       ea_actuel.emploi_libele as emploi_libele,
                       ea_actuel.designation_poste as emploi_designation_poste
                FROM documents_autorisation doc
                LEFT JOIN demandes d ON doc.id_demande = d.id
                LEFT JOIN agents a ON doc.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
                LEFT JOIN direction_generale dg_via_dir ON s.id_direction_generale = dg_via_dir.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN categories cat ON a.id_categorie = cat.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as emploi_libele,
                        ea.designation_poste as designation_poste
                    FROM emploi_agents ea
                    LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent)
                        fa.id_agent,
                        f.libele as fonction_libele
                    FROM fonction_agents fa
                    LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuel ON a.id = fa_actuel.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ga.id_agent)
                        ga.id_agent,
                        g.libele as grade_libele
                    FROM grades_agents ga
                    LEFT JOIN grades g ON ga.id_grade = g.id
                    ORDER BY ga.id_agent, COALESCE(ga.date_entree, ga.created_at) DESC, ga.id DESC
                ) ga_actuelle ON a.id = ga_actuelle.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent)
                        ea.id_agent,
                        e.libele as echelon_libelle
                    FROM echelons_agents ea
                    LEFT JOIN echelons e ON ea.id_echelon = e.id
                    ORDER BY ea.id_agent, COALESCE(ea.date_entree, ea.created_at) DESC, ea.id DESC
                ) ech_actuelle ON a.id = ech_actuelle.id_agent
                LEFT JOIN agents val ON doc.id_agent_generateur = val.id
                LEFT JOIN directions val_dir ON val.id_direction = val_dir.id
                LEFT JOIN ministeres m_val ON val.id_ministere = m_val.id
                LEFT JOIN civilites val_civ ON val.id_civilite = val_civ.id
                LEFT JOIN fonction_agents fa ON val.id = fa.id_agent AND fa.date_entree = (
                    SELECT MAX(fa2.date_entree) 
                    FROM fonction_agents fa2 
                    WHERE fa2.id_agent = val.id
                )
                WHERE doc.id = $1
            `;

            const result = await db.query(query, [document.id]);

            if (result.rows.length === 0) {
                throw new Error('Document non trouvé');
            }

            const row = result.rows[0];

            // Préparer les données
            const generatedAt = row.date_generation || row.updated_at || row.created_at;

            // Pour les documents sans demande (comme certificat_prise_service), créer un objet demande vide
            const demande = {
                id: (row.id_demande || row.id) || null,
                date_debut: row.date_debut || null,
                date_fin: row.date_fin || null,
                description: row.description || null,
                commentaire_drh: row.commentaire_drh || null,
                date_generation: generatedAt,
                motif_conge: row.motif_conge || null,
                motif: row.motif_conge || row.motif || null,
                agree_motif: row.id_demande ? row.agree_motif : (row.motif_cessation || row.agree_motif),
                agree_date_cessation: row.id_demande ? row.agree_date_cessation : (row.date_cessation || row.agree_date_cessation),
                date_reprise_service: row.date_reprise_service || null,
                date_fin_conges: row.date_fin_conges || null,
                annee_au_titre_conge: row.annee_au_titre_conge || null,
                updated_at: row.updated_at || null
            };

            console.log('🔍 DEBUG - Données de la demande préparées pour generatePDFForDocument:', {
                id: demande.id,
                motif_conge: demande.motif_conge,
                motif: demande.motif,
                agree_motif: demande.agree_motif,
                row_motif_conge: row.motif_conge,
                row_motif: row.motif
            });

            const agent = {
                id: row.agent_id,
                prenom: row.prenom,
                nom: row.nom,
                matricule: row.matricule,
                civilite: row.civilite,
                sexe: row.sexe,
                poste: row.poste,
                fonction_actuelle: row.fonction_actuelle_libele || row.fonction_actuelle || row.poste,
                date_de_naissance: row.date_de_naissance,
                lieu_de_naissance: row.lieu_de_naissance,
                date_prise_service_dans_la_direction: row.date_prise_service_dans_la_direction,
                date_prise_service_au_ministere: row.date_prise_service_au_ministere,
                date_embauche: row.date_embauche,
                id_direction: row.id_direction,
                id_ministere: row.id_ministere,
                service_nom: row.service_nom,
                direction_nom: row.direction_nom || row.service_nom,
                direction_generale_nom: row.direction_generale_nom,
                ministere_nom: row.ministere_nom,
                ministere_sigle: row.ministere_sigle,
                grade_libele: row.grade_libele,
                echelon_libelle: row.echelon_libelle,
                classe_libelle: row.classe_libelle,
                type_agent_libele: row.type_agent_libele,
                emploi_libele: row.emploi_libele,
                emploi_designation_poste: row.emploi_designation_poste
            };

            // Si validateur_id n'est pas disponible, essayer id_agent_generateur
            const validateurId = row.validateur_id || row.id_agent_generateur;

            console.log('🔍 [generatePDFForDocument] Données validateur:', {
                validateur_id: row.validateur_id,
                id_agent_generateur: row.id_agent_generateur,
                validateurId_utilise: validateurId,
                validateur_nom: row.validateur_nom,
                validateur_prenom: row.validateur_prenom
            });

            const validateur = {
                id: validateurId,
                prenom: row.validateur_prenom,
                nom: row.validateur_nom,
                fonction: row.validateur_fonction_designation || row.validateur_fonction,
                ministere_nom: row.validateur_ministere_nom,
                ministere_sigle: row.validateur_ministere_sigle,
                direction_nom: row.validateur_direction_nom,
                service_nom: row.validateur_direction_nom,
                structure_nom: row.validateur_direction_nom,
                civilite: row.validateur_civilite
            };

            // Utiliser les informations de l'utilisateur connecté pour le ministère et service
            if (userInfo) {
                agent.service_nom = userInfo.service_nom || agent.service_nom;
                agent.direction_nom = userInfo.service_nom || agent.direction_nom;
                agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                agent.ministere_sigle = userInfo.ministere_sigle || agent.ministere_sigle;
                validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                validateur.ministere_sigle = userInfo.ministere_sigle || validateur.ministere_sigle;
                validateur.direction_nom = userInfo.service_nom || userInfo.direction_nom || validateur.direction_nom;
                validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
            }

            const typeDocument = row.type_document;
            // Sur tous les documents sauf le certificat de prise de service : utiliser la signature de la DRH
            if (typeDocument !== 'certificat_prise_service') {
                const drh = await fetchDRHForSignature(agent.id_direction, agent.id_ministere);
                if (drh) {
                    Object.assign(validateur, drh);
                    validateur.signatureRoleOverride = 'Le Directeur';
                    if (userInfo) {
                        validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                        validateur.ministere_sigle = userInfo.ministere_sigle || validateur.ministere_sigle;
                        validateur.direction_nom = userInfo.service_nom || userInfo.direction_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }
            }

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le PDF selon le type de document
            if (typeDocument === 'attestation_presence') {
                return await this.generateAttestationPresencePDFAuto(demande, agent, validateur, userInfo, { documentId: document.id, typeDocument });
            } else if (typeDocument === 'certificat_cessation') {
                return await this.generateCertificatCessationPDF(document, userInfo);
            } else if (typeDocument === 'certificat_reprise_service') {
                // Utiliser MemoryPDFService pour le certificat de reprise de service (options = numéro séquentiel dans l'en-tête)
                const MemoryPDFService = require('./MemoryPDFService');
                const docOptions = { documentId: document.id, typeDocument };
                const pdfBuffer = await MemoryPDFService.generateCertificatRepriseServicePDFBuffer(demande, agent, validateur, userInfo, docOptions);
                const timestamp = Date.now();
                const fileName = `certificat_reprise_service_${document.id}_${timestamp}.pdf`;
                const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);
                await fs.writeFile(outputPath, pdfBuffer);
                return `uploads/documents/${fileName}`;
            } else if (typeDocument === 'certificat_non_jouissance_conge') {
                // Utiliser MemoryPDFService pour le certificat de non jouissance de congé
                const MemoryPDFService = require('./MemoryPDFService');
                // Passer l'ID du document pour l'exclure du comptage lors de la génération du numéro
                demande.document_id = document.id;
                const pdfBuffer = await MemoryPDFService.generateCertificatNonJouissanceCongePDFBuffer(demande, agent, validateur, userInfo);
                const timestamp = Date.now();
                const fileName = `certificat_non_jouissance_conge_${document.id}_${timestamp}.pdf`;
                const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);
                await fs.writeFile(outputPath, pdfBuffer);
                return `uploads/documents/${fileName}`;
            } else if (typeDocument === 'certificat_prise_service') {
                // Utiliser MemoryPDFService pour le certificat de prise de service
                const MemoryPDFService = require('./MemoryPDFService');
                // La date affichée ("le XX janvier 2026") doit être la date de prise de service dans la direction de l'agent
                const datePriseService = agent.date_prise_service_dans_la_direction ||
                    agent.date_embauche ||
                    agent.date_prise_service_au_ministere ||
                    new Date();
                const options = {
                    date_prise_service: datePriseService,
                    documentId: document.id,
                    document_id: document.id,
                    date_generation: document.date_generation || generatedAt
                };
                const pdfBuffer = await MemoryPDFService.generateCertificatPriseServicePDFBuffer(agent, validateur, userInfo, options);
                const timestamp = Date.now();
                const fileName = `certificat_prise_service_${document.id}_${timestamp}.pdf`;
                const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);
                await fs.writeFile(outputPath, pdfBuffer);
                return `uploads/documents/${fileName}`;
            } else if (typeDocument === 'autorisation_sortie_territoire') {
                return await this.generateAutorisationSortieTerritoirePDFAuto(demande, agent, validateur, userInfo, { documentId: document.id, typeDocument });
            } else if (typeDocument === 'attestation_travail') {
                return await this.generateAttestationTravailPDFAuto(demande, agent, validateur, userInfo, { documentId: document.id, typeDocument });
            } else if (typeDocument === 'note_de_service') {
                // Extraire cert_reference et cert_date depuis les commentaires si présent
                let certReference = null;
                let certDate = null;
                if (document.commentaires) {
                    // Chercher la référence du certificat dans les commentaires
                    const certMatch = document.commentaires.match(/CERT[.\s]*DE[.\s]*1ERE[.\s]*P[.\s]*DE[.\s]*SERVICE[:\s]*([^\s]+)/i);
                    if (certMatch && certMatch[1]) {
                        certReference = certMatch[1];
                    }
                }
                return await this.generateNoteDeServicePDFAuto(agent, validateur, {
                    date_generation: generatedAt,
                    date_effet: generatedAt,
                    date_echelon: row.grade_date_entree,
                    cert_reference: certReference,
                    cert_date: certDate
                });
            } else {
                // Par défaut, générer une autorisation d'absence
                return await this.generateAutorisationAbsencePDFAuto(demande, agent, validateur, userInfo, generatedAt, { documentId: document.id, typeDocument });
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF pour le document:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF d'attestation de présence conforme au modèle officiel
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {string} outputPath - Chemin de sortie pour le PDF
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin du fichier PDF généré
     */
    static async generateAttestationPresencePDF(demande, agent, validateur, outputPath, userInfo = null, documentOptions = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'attestation de présence avec PDFKit pour la demande ${demande.id}...`);

                // Créer le répertoire de sortie s'il n'existe pas
                const outputDir = path.dirname(outputPath);
                await fs.mkdir(outputDir, { recursive: true });

                // Créer le document PDF - Optimisé pour une seule page A4
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 30,
                        bottom: 30,
                        left: 40,
                        right: 40
                    }
                });

                // Créer le stream de fichier
                const stream = require('fs').createWriteStream(outputPath);
                doc.pipe(stream);

                const primaryColor = '#000000';
                const borderColor = '#000000';
                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const documentNumber = (documentOptions && documentOptions.documentId != null && documentOptions && documentOptions.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: documentOptions.documentId, type_document: documentOptions.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({
                        demande,
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    });

                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.direction_nom = userInfo.direction_nom || agent.direction_nom || userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                    agent.ministere_sigle = userInfo.ministere_sigle || agent.ministere_sigle;

                    if (validateur) {
                        validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                        validateur.ministere_sigle = userInfo.ministere_sigle || validateur.ministere_sigle;
                        validateur.direction_nom = userInfo.direction_nom || userInfo.service_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });
                const dateGeneration = generatedAt.toLocaleDateString('fr-FR');
                const agentMinistryName = agent.ministere_nom || '';
                const agentDirectionName = agent.direction_nom || agent.service_nom || '';
                const { ministryName: validatorMinistryName, directionName: validatorDirectionName } =
                resolveOfficialHeaderContext({ agent, validateur, userInfo });
                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName,
                    validatorMinistryName,
                    validatorDirectionName
                });

                const titleYPresence = headerBottom + 55;
                doc.rect(130, titleYPresence - 12, 340, 34)
                    .lineWidth(2)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .fillColor(primaryColor)
                    .text('ATTESTATION DE PRÉSENCE', 130, titleYPresence - 2, {
                        align: 'center',
                        width: 340
                    });

                let yPosition = headerBottom + 120;

                // Formatage des noms
                const agentNamePartsPresence = formatAgentName(agent);
                const validateurNamePartsPresence = formatAgentName(validateur);
                const validateurNomComplet = validateurNamePartsPresence.fullWithCivilite || 'Le Directeur';
                const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines');
                const validateurGenre = validateur && validateur.sexe === 'F' ? 'e' : '';

                const civilite = agentNamePartsPresence.civilite;
                const fonctionActuelle = getAgentPosteOuEmploi(agent);
                const serviceNom = agent.service_nom || agent.direction_nom || agentDirectionName || 'Service non renseigné';
                const fonctionAvecService = serviceNom ? `${fonctionActuelle} à ${serviceNom}` : fonctionActuelle;

                const dateDebut = demande.date_debut ? new Date(demande.date_debut) : new Date();
                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Texte principal selon le modèle de l'image
                const textePrincipal = `Je soussigné${validateurGenre}, ${validateurNomComplet}, ${validateurFonction}, atteste que ${civilite} ${agentNamePartsPresence.prenoms} ${agentNamePartsPresence.nom}, ${fonctionAvecService}, est en service dans ledit Ministère, depuis le ${dateDebutStr}.`;

                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor)
                    .text(textePrincipal, 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                yPosition = doc.y + 22;

                // Phrase de clôture
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text('En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.', 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                // === SIGNATURE === (position fixe, remontée pour réduire l'espace avec le texte)
                const pageHeight = doc.page.height;
                const signatureBlockHeight = 115;
                const gapSignatureFooter = 14;
                const signatureStartY = (pageHeight - 115) - signatureBlockHeight - gapSignatureFooter;
                const bottomMargin = 40;
                const footerY = pageHeight - bottomMargin - 28;

                await attachActiveSignature(validateur);
                const signatureInfoPresence = await resolveSignatureInfo(validateur);
                drawStandardSignatureRight(
                    doc,
                    signatureStartY,
                    signatureInfoPresence, { signatureWidth: 320, imageWidth: 130, imageHeight: 72, spacing: 8, respectStartY: true }
                );

                // === FOOTER === (rester sur la première page : ligne + 2 lignes de texte au-dessus de la marge)
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor('#666666')
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 6, {
                            align: 'center',
                            width: 495
                        });

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                        50, footerY + 16, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

                stream.on('finish', () => {
                    console.log(`✅ PDF d'attestation de présence généré avec succès: ${outputPath}`);
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    console.error('❌ Erreur lors de l\'écriture du PDF:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF d\'attestation de présence:', error);
                reject(error);
            }
        });
    }

    static async generateAttestationTravailPDF(demande, agent, validateur, outputPath, userInfo = null, documentOptions = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'attestation de travail avec PDFKit pour la demande ${demande.id}...`);

                const outputDir = path.dirname(outputPath);
                await fs.mkdir(outputDir, { recursive: true });

                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                const stream = require('fs').createWriteStream(outputPath);
                doc.pipe(stream);

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const documentNumber = (documentOptions && documentOptions.documentId != null && documentOptions && documentOptions.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: documentOptions.documentId, type_document: documentOptions.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({
                        demande,
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    });

                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.direction_nom = userInfo.direction_nom || agent.direction_nom || userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                    agent.ministere_sigle = userInfo.ministere_sigle || agent.ministere_sigle;

                    if (validateur) {
                        validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                        validateur.ministere_sigle = userInfo.ministere_sigle || validateur.ministere_sigle;
                        validateur.direction_nom = userInfo.direction_nom || userInfo.service_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });
                const dateGeneration = generatedAt.toLocaleDateString('fr-FR');
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });

                const agentMinistryName = agent.ministere_nom ||
                    (userInfo && userInfo.ministere_nom) ||
                    headerContext.ministryName ||
                    (validateur && validateur.ministere_nom) ||
                    '';

                const resolvedDirectionName = headerContext.directionName ||
                    agent.direction_nom ||
                    agent.service_nom ||
                    (userInfo && userInfo.direction_nom) ||
                    (userInfo && userInfo.service_nom) ||
                    (userInfo && userInfo.structure_nom) ||
                    (validateur && validateur.direction_nom) ||
                    (validateur && validateur.service_nom) ||
                    (validateur && validateur.structure_nom) ||
                    '';

                const headerDirectionName = resolvedDirectionName ||
                    agent.direction_nom ||
                    agent.service_nom ||
                    (userInfo && userInfo.direction_nom) ||
                    (userInfo && userInfo.service_nom) ||
                    (userInfo && userInfo.structure_nom) ||
                    (validateur && validateur.direction_nom) ||
                    (validateur && validateur.service_nom) ||
                    (validateur && validateur.structure_nom) ||
                    'DIRECTION DES RESSOURCES HUMAINES';

                if (!agent.direction_nom && headerDirectionName) {
                    agent.direction_nom = headerDirectionName;
                }
                if (!agent.service_nom && headerDirectionName) {
                    agent.service_nom = headerDirectionName;
                }

                const agentDirectionName = headerDirectionName;

                const validatorMinistryName = (validateur && validateur.ministere_nom) ||
                    headerContext.ministryName ||
                    agentMinistryName;
                const validatorDirectionName = headerContext.directionName ||
                    (validateur && validateur.direction_nom) ||
                    (validateur && validateur.service_nom) ||
                    (validateur && validateur.structure_nom) ||
                    (userInfo && userInfo.direction_nom) ||
                    (userInfo && userInfo.service_nom) ||
                    (userInfo && userInfo.structure_nom) ||
                    headerDirectionName;

                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName,
                    validatorMinistryName,
                    validatorDirectionName
                });

                const titleY = headerBottom + 45;
                doc.rect(140, titleY - 12, 320, 34)
                    .lineWidth(2)
                    .strokeColor('#000000')
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .fillColor('#000000')
                    .text('ATTESTATION DE TRAVAIL', 140, titleY - 2, {
                        align: 'center',
                        width: 320
                    });

                let yPosition = headerBottom + 120;

                const agentNamePartsTravail = formatAgentName(agent);
                const displayDirectionName = agentDirectionName ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    validatorDirectionName ||
                    agent.service_nom ||
                    '';

                if (!agent.direction_nom && displayDirectionName) {
                    agent.direction_nom = displayDirectionName;
                }
                if (!agent.service_nom && displayDirectionName) {
                    agent.service_nom = displayDirectionName;
                }

                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor('#000000')
                    .text('Le Directeur soussigné(e), atteste que ', 50, yPosition, { continued: true });
                doc.font(BOLD_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`${agentNamePartsTravail.fullWithCivilite},`);

                yPosition = doc.y;
                yPosition += 20;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`matricule ${agent.matricule}, ${getAgentPosteOuEmploi(agent).toUpperCase()}, grade,`, 50, yPosition, { align: 'left' });

                yPosition += 20;
                if (displayDirectionName) {
                    doc.font(BASE_FONT)
                        .fontSize(BODY_FONT_SIZE)
                        .text(`à la ${displayDirectionName}`, 50, yPosition, { align: 'left' });
                    yPosition += 20;
                }
                const dateDebut = new Date(demande.date_debut);
                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`travaille dans ledit Ministère depuis le ${dateDebutStr} jusqu'à ce jour.`, 50, yPosition, { align: 'left' });

                yPosition += 30;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text('En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.', 50, yPosition, { align: 'left' });

                yPosition += 70;
                // Signature descendue et décalée à droite
                await attachActiveSignature(validateur);
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 80;
                const signatureBlockHeight = 155;
                const minGapAboveFooter = 20;
                const maxSignatureY = footerY - signatureBlockHeight - minGapAboveFooter;
                const signatureY = Math.min(Math.max(yPosition + 35, 560), maxSignatureY);
                const signatureInfoTravail = await resolveSignatureInfo(validateur);
                yPosition = drawStandardSignatureRight(
                    doc,
                    signatureY,
                    signatureInfoTravail,
                    {
                        signatureWidth: 320,
                        imageWidth: 150,
                        imageHeight: 95,
                        spacing: 10,
                        roleFontSize: SUBTITLE_FONT_SIZE + 1,
                        nameFontSize: BODY_FONT_SIZE + 1,
                        minNameFontSize: BODY_FONT_SIZE - 1,
                        limitNameToSignature: true
                    }
                );

                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor('#34495e')
                    .stroke();

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor('#666666')
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 10, {
                            align: 'center',
                            width: 495
                        });

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                        50, footerY + 25, {
                            align: 'center',
                            width: 495
                        });

                doc.end();

                stream.on('finish', () => {
                    console.log(`✅ PDF d'attestation de travail généré avec succès: ${outputPath}`);
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    console.error('❌ Erreur lors de l\'écriture du PDF d\'attestation de travail:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF d\'attestation de travail:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF d'autorisation de sortie du territoire conforme au modèle officiel
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {string} outputPath - Chemin de sortie pour le PDF
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin du fichier PDF généré
     */
    static async generateAutorisationSortieTerritoirePDF(demande, agent, validateur, outputPath, userInfo = null, documentOptions = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'autorisation de sortie du territoire avec PDFKit pour la demande ${demande.id}...`);

                // Créer le répertoire de sortie s'il n'existe pas
                const outputDir = path.dirname(outputPath);
                await fs.mkdir(outputDir, { recursive: true });

                // Créer le document PDF
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Créer le stream de fichier
                const stream = require('fs').createWriteStream(outputPath);
                doc.pipe(stream);

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const primaryColor = '#000000';
                const secondaryColor = '#666666';
                const borderColor = '#000000';
                const documentNumber = (documentOptions && documentOptions.documentId != null && documentOptions && documentOptions.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: documentOptions.documentId, type_document: documentOptions.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({
                        demande,
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    });

                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.direction_nom = userInfo.direction_nom || agent.direction_nom || userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                    agent.ministere_sigle = userInfo.ministere_sigle || agent.ministere_sigle;

                    if (validateur) {
                        validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                        validateur.ministere_sigle = userInfo.ministere_sigle || validateur.ministere_sigle;
                        validateur.direction_nom = userInfo.direction_nom || userInfo.service_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });
                const dateGeneration = generatedAt.toLocaleDateString('fr-FR');
                const agentMinistryName = agent.ministere_nom || '';
                const agentDirectionName = agent.direction_nom || agent.service_nom || '';
                const { ministryName: validatorMinistryName, directionName: validatorDirectionName } =
                resolveOfficialHeaderContext({ agent, validateur, userInfo });
                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName,
                    validatorMinistryName,
                    validatorDirectionName
                });

                const titleYSortie = headerBottom + 35;
                // Titre avec bordure - UNE SEULE LIGNE (largeur augmentée pour tenir sur une ligne)
                const titleWidth = 450;
                const titleX = (doc.page.width - titleWidth) / 2; // Centrer le titre
                doc.rect(titleX, titleYSortie - 12, titleWidth, 34)
                    .lineWidth(2)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .fillColor(primaryColor)
                    .text('AUTORISATION DE SORTIE DU TERRITOIRE', titleX, titleYSortie - 2, {
                        align: 'center',
                        width: titleWidth
                    });

                let yPosition = headerBottom + 100;

                // Calculer les dates
                const dateDebut = new Date(demande.date_debut);
                const dateFin = new Date(demande.date_fin);
                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR');
                const dateFinStr = dateFin.toLocaleDateString('fr-FR');

                // Texte principal selon l'image
                const agentNamePartsSortie = formatAgentName(agent);

                // "Le Directeur" en premier
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor)
                    .text('Le Directeur', 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 15;

                // Texte principal justifié comme dans l'image
                const textePrincipal = `autorise ${agentNamePartsSortie.fullWithCivilite}, matricule ${agent.matricule}, ${getAgentPosteOuEmploi(agent).toUpperCase()}, en service à la ${agent.service_nom || 'DIRECTION'}, à se rendre ${demande.lieu || 'en France'} du ${dateDebutStr} au ${dateFinStr}, ${demande.description || 'pour ses vacances'}.`;

                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(textePrincipal, 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                // Utiliser doc.y pour obtenir la position réelle après le texte (qui peut faire plusieurs lignes)
                yPosition = doc.y + 15; // Espacement réduit après le texte principal

                // Phrase de clôture
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text('En foi de quoi, la présente autorisation lui est délivrée pour servir et valoir ce que de droit.', 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                // === SIGNATURE ===
                // Positionner la signature un peu plus à droite, nom sur une ligne, image agrandie
                yPosition = doc.y + 50;
                await attachActiveSignature(validateur);
                const signatureInfo = await resolveSignatureInfo(validateur);

                const pageWidth = doc.page.width;
                const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
                const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
                const usableWidth = pageWidth - leftMargin - rightMargin;
                // Décaler à droite : bloc à partir de 40 % de la largeur (au lieu de 20 %)
                const signatureStartX = leftMargin + (usableWidth * 0.4);
                const signatureWidth = usableWidth * 0.6;
                const signatureImageW = 150;
                const signatureImageH = 90;

                if (signatureInfo.role || signatureInfo.name || signatureInfo.imagePath) {
                    let sigY = yPosition;
                    if (signatureInfo.role) {
                        doc.font(BOLD_FONT)
                            .fontSize(SUBTITLE_FONT_SIZE)
                            .text(signatureInfo.role, signatureStartX, sigY, {
                                align: 'right',
                                width: signatureWidth
                            });
                        sigY = doc.y + 12;
                    }

                    if (signatureInfo.imagePath && fsSync.existsSync(signatureInfo.imagePath)) {
                        try {
                            const imageX = pageWidth - rightMargin - signatureImageW;
                            doc.image(signatureInfo.imagePath, imageX, sigY, {
                                fit: [signatureImageW, signatureImageH],
                                align: 'right'
                            });
                            sigY += signatureImageH + 10;
                        } catch (error) {
                            console.error('❌ Erreur lors de l\'insertion de la signature:', error);
                        }
                    }

                    if (signatureInfo.name) {
                        const oneLineName = String(signatureInfo.name || '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        const nameWidth = pageWidth - rightMargin - signatureStartX;
                        let nameFontSize = BODY_FONT_SIZE;
                        const minNameFontSize = BODY_FONT_SIZE - 1;
                        doc.font(BOLD_FONT).fontSize(nameFontSize);
                        let textWidth = doc.widthOfString(oneLineName);
                        while (textWidth > nameWidth && nameFontSize > minNameFontSize) {
                            nameFontSize -= 1;
                            doc.font(BOLD_FONT).fontSize(nameFontSize);
                            textWidth = doc.widthOfString(oneLineName);
                        }
                        const nameX = pageWidth - rightMargin - textWidth;
                        doc.font(BOLD_FONT)
                            .fontSize(nameFontSize)
                            .text(oneLineName, nameX, sigY, { lineBreak: false });
                    }
                }

                // === FOOTER ===
                // Positionner le footer juste après la signature avec un espacement optimal
                const pageHeight = doc.page.height;
                const minFooterY = pageHeight - 50; // Marge minimale en bas
                // Utiliser la position après la signature, mais ne pas dépasser la limite de la page
                let footerY = Math.max(doc.y + 20, minFooterY - 35); // Espacement augmenté entre signature et footer

                // Ligne de séparation du footer
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(secondaryColor)
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 5, {
                            align: 'center',
                            width: 495
                        });

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                        50, footerY + 15, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

                stream.on('finish', () => {
                    console.log(`✅ PDF d'autorisation de sortie du territoire généré avec succès: ${outputPath}`);
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    console.error('❌ Erreur lors de l\'écriture du PDF:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF d\'autorisation de sortie du territoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF d'attestation de présence avec nom de fichier automatique
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generateAttestationPresencePDFAuto(demande, agent, validateur, userInfo = null, documentOptions = null) {
        try {
            // Créer un nom de fichier unique
            const timestamp = Date.now();
            const fileName = `attestation_presence_${documentOptions?.documentId ?? demande.id}_${timestamp}.pdf`;

            // Chemin complet vers le fichier PDF
            const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);

            // Générer le PDF
            await this.generateAttestationPresencePDF(demande, agent, validateur, outputPath, userInfo, documentOptions);

            // Retourner le chemin relatif pour la base de données
            const relativePath = `uploads/documents/${fileName}`;

            return relativePath;

        } catch (error) {
            console.error('❌ Erreur lors de la génération automatique du PDF d\'attestation de présence:', error);
            throw error;
        }
    }

    static async generateAttestationTravailPDFAuto(demande, agent, validateur, userInfo = null, documentOptions = null) {
        try {
            const timestamp = Date.now();
            const fileName = `attestation_travail_${documentOptions?.documentId ?? demande.id}_${timestamp}.pdf`;
            const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);

            await this.generateAttestationTravailPDF(demande, agent, validateur, outputPath, userInfo, documentOptions);

            return `uploads/documents/${fileName}`;

        } catch (error) {
            console.error('❌ Erreur lors de la génération automatique du PDF d\'attestation de travail:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF d'autorisation de sortie du territoire avec nom de fichier automatique
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generateAutorisationSortieTerritoirePDFAuto(demande, agent, validateur, userInfo = null, documentOptions = null) {
        try {
            // Créer un nom de fichier unique
            const timestamp = Date.now();
            const fileName = `autorisation_sortie_territoire_${documentOptions?.documentId ?? demande.id}_${timestamp}.pdf`;

            // Chemin complet vers le fichier PDF
            const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);

            // Générer le PDF
            await this.generateAutorisationSortieTerritoirePDF(demande, agent, validateur, outputPath, userInfo, documentOptions);

            // Retourner le chemin relatif pour la base de données
            const relativePath = `uploads/documents/${fileName}`;

            return relativePath;

        } catch (error) {
            console.error('❌ Erreur lors de la génération automatique du PDF d\'autorisation de sortie du territoire:', error);
            throw error;
        }
    }

    /**
     * Génère tous les PDFs manquants avec PDFKit
     * @returns {Promise<Array>} - Liste des documents mis à jour
     */
    /**
     * Génère un PDF pour un certificat de cessation
     * @param {Object} document - Le document de certificat de cessation
     * @param {Object} userInfo - Informations utilisateur
     * @returns {string} - Chemin du fichier PDF généré
     */
    static async generateCertificatCessationPDF(document, userInfo = null) {
        try {
            console.log(`📄 Génération PDF (PDFKit) pour certificat de cessation ${document.id}...`);

            const PDFDocument = require('pdfkit');
            const fs = require('fs');
            const path = require('path');
            const db = require('../config/database');


            // Récupérer toutes les données nécessaires depuis la base de données
            const query = `
                SELECT 
                    doc.*,
                    doc.motif_cessation, doc.date_cessation,
                    d.agree_motif, d.agree_date_cessation, d.date_creation, d.date_debut, d.date_fin,
                    d.motif_conge, d.motif, d.annee_au_titre_conge,
                    a.id as agent_id,
                    a.prenom, a.nom, a.matricule, a.sexe, a.fonction_actuelle,
                    a.id_direction, a.id_sous_direction,
                    COALESCE(a.id_ministere, s.id_ministere) AS id_ministere,
                    c.libele as civilite,
                    s.libelle as service_nom,
                    s.libelle as direction_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    val.id as validateur_id,
                    val.prenom as validateur_prenom, val.nom as validateur_nom,
                    val.sexe as validateur_sexe,
                    val.fonction_actuelle as validateur_fonction,
                    fa.designation_poste as validateur_fonction_designation,
                    val_dir.libelle as validateur_direction_nom,
                    m_val.nom as validateur_ministere_nom,
                    m_val.sigle as validateur_ministere_sigle,
                    val_civ.libele as validateur_civilite,
                    (SELECT r2.nom FROM utilisateurs u2 JOIN roles r2 ON u2.id_role = r2.id WHERE u2.id_agent = a.id LIMIT 1) as agent_role_nom
                FROM documents_autorisation doc
                LEFT JOIN demandes d ON doc.id_demande = d.id
                LEFT JOIN agents a ON doc.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents val ON doc.id_agent_generateur = val.id
                LEFT JOIN directions val_dir ON val.id_direction = val_dir.id
                LEFT JOIN ministeres m_val ON val.id_ministere = m_val.id
                LEFT JOIN civilites val_civ ON val.id_civilite = val_civ.id
                LEFT JOIN fonction_agents fa ON val.id = fa.id_agent AND fa.date_entree = (
                    SELECT MAX(fa2.date_entree) 
                    FROM fonction_agents fa2 
                    WHERE fa2.id_agent = val.id
                )
                WHERE doc.id = $1
            `;

            const result = await db.query(query, [document.id]);

            if (result.rows.length === 0) {
                throw new Error('Document non trouvé');
            }

            const row = result.rows[0];

            // Créer le répertoire de sortie s'il n'existe pas
            const outputDir = path.join(__dirname, '../uploads/documents');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Nom du fichier PDF
            const fileName = `certificat_cessation_${document.id}_${Date.now()}.pdf`;
            const outputPath = path.join(outputDir, fileName);

            // Créer le document PDF
            const doc = new PDFDocument({
                size: 'A4',
                margins: {
                    top: 50,
                    bottom: 50,
                    left: 50,
                    right: 50
                }
            });

            // Pipe vers le fichier
            doc.pipe(fs.createWriteStream(outputPath));

            const ministryName = row.ministere_nom || '';
            const directionName = row.direction_nom || row.service_nom || '';
            const civilite = row.sexe === 'F' ? 'Mlle' : 'M.';
            const nomComplet = `${civilite} ${row.nom} ${row.prenom}`;
            const fonctionActuelle = row.fonction_actuelle || 'Agent';
            const designationPoste = row.validateur_fonction_designation || row.fonction_actuelle || 'Agent';
            const echelon = row.echelon_libelle || '1er échelon';
            const classe = row.classe || 'deuxième classe';
            const serviceNom = row.direction_nom || row.service_nom || 'Service non renseigné';
            const dateEntreeFonction = row.date_entree ? new Date(row.date_entree).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '05 mai 2022';
            // Utiliser les valeurs de documents_autorisation si id_demande est NULL
            const dateCessationValue = row.id_demande ? row.agree_date_cessation : (row.date_cessation || row.agree_date_cessation);
            // Utiliser motif_conge (choisi par l'agent dans la liste déroulante) en priorité
            let motifCessationValue = row.motif_conge || row.motif || (row.id_demande ? row.agree_motif : (row.motif_cessation || row.agree_motif));

            console.log('🔍 DEBUG - Motif récupéré pour le certificat (PDFKit):', {
                motif_conge: row.motif_conge,
                motif: row.motif,
                agree_motif: row.agree_motif,
                motif_cessation: row.motif_cessation,
                motifCessationValue: motifCessationValue,
                id_demande: row.id_demande
            });

            const dateCessation = dateCessationValue ? new Date(dateCessationValue).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'Date non spécifiée';

            // Enrichir le motif selon le type de congé
            if (motifCessationValue) {
                const motifLower = motifCessationValue.toLowerCase();
                let texteSupplementaire = '';

                // Récupérer le numéro de décision et l'année
                let numeroDecisionCessation = null;
                let dateDecision = null;
                let anneeConge = null;

                if (row.id_demande && dateCessationValue) {
                    // Vérifier si l'agent a un rôle spécifique nécessitant une décision individuelle
                    const dateCessationObj = new Date(dateCessationValue);
                    if (!isNaN(dateCessationObj.getTime())) {
                        anneeConge = dateCessationObj.getFullYear();
                    }
                    const anneeFiltre = row.annee_au_titre_conge ? parseInt(row.annee_au_titre_conge, 10) : (anneeConge || new Date().getFullYear());
                    const agentRoleNom = row.agent_role_nom || '';
                    const hasSpecificPoste = isAgentWithSpecificPoste(agentRoleNom);
                    try {
                        let decisionResult;
                        if (hasSpecificPoste && row.agent_id) {
                            decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [row.agent_id, anneeFiltre]);
                            if ((!decisionResult || decisionResult.rows.length === 0) && row.id_direction) {
                                const idDirPk = parseInt(row.id_direction, 10);
                                if (!isNaN(idDirPk)) {
                                    decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirPk, anneeFiltre]);
                                }
                            }
                        } else {
                            const idDir = row.id_direction != null ? parseInt(row.id_direction, 10) : null;
                            const idSous = row.id_sous_direction != null ? parseInt(row.id_sous_direction, 10) : null;
                            // Essayer d'abord la décision collective au niveau direction (id_sous_direction IS NULL)
                            if (idDir != null && !isNaN(idDir)) {
                                decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltre]);
                            }
                            if ((!decisionResult || decisionResult.rows.length === 0) && idSous != null && !isNaN(idSous)) {
                                decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idSous, anneeFiltre]);
                            }
                            if (!decisionResult || decisionResult.rows.length === 0) {
                                decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [anneeFiltre]);
                            }
                        }
                        if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                            numeroDecisionCessation = decisionResult.rows[0].numero_acte;
                            dateDecision = decisionResult.rows[0].date_decision;
                        } else if (isCongeAnnuelMotif(motifCessationValue)) {
                            console.warn('📋 Certificat cessation (PDFKit) – décision non trouvée (corps). Paramètres:', {
                                anneeFiltre,
                                agent_id: row.agent_id,
                                id_direction: row.id_direction,
                                id_sous_direction: row.id_sous_direction,
                                hasSpecificPoste: !!hasSpecificPoste,
                                agent_role_nom: row.agent_role_nom || '(vide)'
                            });
                        }
                    } catch (error) {
                        console.error('⚠️ Erreur lors de la récupération de la décision:', error);
                    }
                }

                // Formater la date de décision (en évitant les problèmes de fuseau horaire)
                let dateDecisionFormatee = null;
                if (dateDecision) {
                    try {
                        // Parser la date en utilisant les composants directement pour éviter les décalages de fuseau horaire
                        let dateDecisionObj;
                        if (typeof dateDecision === 'string') {
                            // Si c'est une chaîne au format 'YYYY-MM-DD', parser directement
                            const parts = dateDecision.split('T')[0].split('-');
                            if (parts.length === 3) {
                                const year = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés en JS
                                const day = parseInt(parts[2], 10);
                                dateDecisionObj = new Date(year, month, day);
                            } else {
                                dateDecisionObj = new Date(dateDecision);
                            }
                        } else if (dateDecision instanceof Date) {
                            // Si c'est déjà un objet Date, extraire les composants pour créer une nouvelle date locale
                            dateDecisionObj = new Date(dateDecision.getFullYear(), dateDecision.getMonth(), dateDecision.getDate());
                        } else {
                            dateDecisionObj = new Date(dateDecision);
                        }

                        if (!isNaN(dateDecisionObj.getTime())) {
                            const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
                            const day = dateDecisionObj.getDate();
                            const month = months[dateDecisionObj.getMonth()];
                            const year = dateDecisionObj.getFullYear();
                            dateDecisionFormatee = `${day} ${month} ${year}`;
                        }
                    } catch (error) {
                        console.error('⚠️ Erreur lors du formatage de la date de décision:', error);
                    }
                }

                // Le numéro de décision est utilisé uniquement sur le document de congé annuel
                // Congé de maternité (sans numéro de décision)
                if (motifLower.includes('maternité') || motifLower.includes('maternite')) {
                    if (anneeConge) {
                        texteSupplementaire = `Bénéficiaire d'un congé de maternité de 6 mois consécutifs au titre de l'année ${anneeConge}.`;
                    }
                }
                // Congé de paternité (sans numéro de décision)
                else if (motifLower.includes('paternité') || motifLower.includes('paternite')) {
                    if (anneeConge) {
                        texteSupplementaire = `Bénéficiaire d'un congé de paternité de 1 mois consécutif au titre de l'année ${anneeConge}.`;
                    }
                }
                // Congé annuel (seul type avec numéro de décision)
                else if (isCongeAnnuelMotif(motifCessationValue)) {
                    if (numeroDecisionCessation && anneeConge && dateDecisionFormatee && row.date_debut && row.date_fin) {
                        const dateDebut = new Date(row.date_debut);
                        const dateFin = new Date(row.date_fin);
                        const differenceMs = dateFin.getTime() - dateDebut.getTime();
                        const nombreJours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1;

                        texteSupplementaire = `Bénéficiaire d'un congé annuel de ${nombreJours} jours consécutifs au titre de l'année ${anneeConge} conformement à la cessation de congé ${numeroDecisionCessation} du ${dateDecisionFormatee}.`;
                    }
                }

                if (texteSupplementaire) {
                    motifCessationValue = texteSupplementaire.trim();
                }
            }

            const motifCessation = motifCessationValue || 'Motif non spécifié';
            const documentNumber = await getDocumentReference({
                demande: row,
                document: { id: document.id, type_document: row.type_document },
                agent: {
                    ministere_sigle: row.ministere_sigle,
                    ministere_nom: row.ministere_nom,
                    id_ministere: row.id_ministere
                },
                validateur: {
                    ministere_sigle: row.validateur_ministere_sigle,
                    ministere_nom: row.validateur_ministere_nom
                },
                userInfo
            });
            const generatedAt = resolveGenerationDate(row, { generatedAt: row.date_generation });
            const currentDate = generatedAt.toLocaleDateString('fr-FR');

            const validateurInfo = {
                id: row.validateur_id,
                ministere_nom: row.validateur_ministere_nom,
                direction_nom: row.validateur_direction_nom,
                service_nom: row.validateur_direction_nom,
                fonction: row.validateur_fonction_designation || row.validateur_fonction,
                prenom: row.validateur_prenom,
                nom: row.validateur_nom,
                sexe: row.validateur_sexe,
                civilite: row.validateur_civilite
            };

            await hydrateAgentWithLatestFunction(validateurInfo);
            await attachActiveSignature(validateurInfo);

            const { ministryName: validatorMinistryName, directionName: validatorDirectionName } =
            resolveOfficialHeaderContext({ agent: { ministere_nom: ministryName, direction_nom: directionName }, validateur: validateurInfo, userInfo });

            // Récupérer la décision active (collective ou individuelle selon le rôle de l'agent)
            // Uniquement si le document est lié à une demande
            let numeroActeDecision = null;
            if (row.id_demande) {
                const anneeFiltreHeader = row.annee_au_titre_conge ? parseInt(row.annee_au_titre_conge, 10) : (row.agree_date_cessation ? new Date(row.agree_date_cessation).getFullYear() : new Date().getFullYear());
                try {
                    const agentRoleNom = row.agent_role_nom || '';
                    const hasSpecificPoste = isAgentWithSpecificPoste(agentRoleNom);
                    let decisionResult;
                    if (hasSpecificPoste && row.agent_id) {
                        decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [row.agent_id, anneeFiltreHeader]);
                        if ((!decisionResult || decisionResult.rows.length === 0) && row.id_direction) {
                            const idDirPkH = parseInt(row.id_direction, 10);
                            if (!isNaN(idDirPkH)) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirPkH, anneeFiltreHeader]);
                            }
                        }
                    } else {
                        const idDir = row.id_direction != null ? parseInt(row.id_direction, 10) : null;
                        const idSous = row.id_sous_direction != null ? parseInt(row.id_sous_direction, 10) : null;
                        // Essayer d'abord la décision collective au niveau direction (id_sous_direction IS NULL)
                        if (idDir != null && !isNaN(idDir)) {
                            decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltreHeader]);
                        }
                        if ((!decisionResult || decisionResult.rows.length === 0) && idSous != null && !isNaN(idSous)) {
                            decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idSous, anneeFiltreHeader]);
                        }
                        if (!decisionResult || decisionResult.rows.length === 0) {
                            decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [anneeFiltreHeader]);
                        }
                    }
                    if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                        numeroActeDecision = decisionResult.rows[0].numero_acte;
                    } else if (isCongeAnnuelMotif(row.motif_conge || row.agree_motif || row.motif || '')) {
                        console.warn('📋 Certificat cessation (PDFKit) – décision non trouvée (en-tête). Paramètres:', {
                            anneeFiltreHeader: anneeFiltreHeader,
                            agent_id: row.agent_id,
                            id_direction: row.id_direction,
                            id_sous_direction: row.id_sous_direction,
                            agent_role_nom: row.agent_role_nom || '(vide)'
                        });
                    }
                } catch (decisionError) {
                    console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
                }
            }

            // Numéro de décision dans l'en-tête uniquement pour le congé annuel
            const motifHeader = row.motif_conge || row.agree_motif || row.motif || '';
            const isCongeAnnuelHeader = isCongeAnnuelMotif(motifHeader);
            const headerBottom = await drawOfficialHeaderPDF(doc, {
                documentNumber,
                dateString: generatedAt,
                generatedAt,
                city: 'Abidjan',
                agentMinistryName: ministryName,
                agentDirectionName: directionName,
                validatorMinistryName,
                validatorDirectionName,
                numeroActeDecision: isCongeAnnuelHeader ? numeroActeDecision : null
            });

            const titleYCessation = headerBottom + 60;
            doc.rect(80, titleYCessation - 12, 430, 34)
                .lineWidth(2)
                .strokeColor('#000000')
                .stroke();

            doc.fontSize(TITLE_FONT_SIZE)
                .font(BOLD_FONT)
                .text('CERTIFICAT DE CESSATION DE SERVICE', 80, titleYCessation - 2, { align: 'center', width: 430 });

            let yPosition = titleYCessation + 60;

            // Formatage des noms
            const agentNameParts = formatAgentName({
                prenom: row.prenom,
                nom: row.nom,
                sexe: row.sexe,
                civilite: row.civilite
            });
            const validateurNameParts = formatAgentName({
                prenom: row.validateur_prenom,
                nom: row.validateur_nom,
                sexe: validateurInfo.sexe,
                civilite: row.validateur_civilite
            });

            // Formatage du nom du validateur
            const validateurNomComplet = validateurNameParts.fullWithCivilite || 'Le Directeur';
            const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateurInfo), 'Directeur des Ressources Humaines');
            const validateurGenre = validateurInfo.sexe === 'F' ? 'e' : '';

            // Date de reprise - utiliser date_cessation si id_demande est NULL
            const dateCessationForReprise = row.id_demande ? row.agree_date_cessation : (row.date_cessation || row.agree_date_cessation);
            let dateReprise = null;

            // Vérifier si c'est un congé de maternité, paternité ou un congé annuel (utiliser la valeur originale avant enrichissement)
            const motifOriginalForReprise = row.motif_conge || row.motif || (row.id_demande ? row.agree_motif : (row.motif_cessation || row.agree_motif)) || '';
            const motifLowerForReprise = motifOriginalForReprise.toLowerCase();
            const isCongeMaternite = motifLowerForReprise.includes('maternité') || motifLowerForReprise.includes('maternite');
            const isCongePaternite = motifLowerForReprise.includes('paternité') || motifLowerForReprise.includes('paternite');
            const isCongeAnnuel = motifLowerForReprise.includes('congé annuel') || motifLowerForReprise.includes('conge annuel') || (motifLowerForReprise.includes('congé') && motifLowerForReprise.includes('annuel'));

            if (isCongeMaternite && dateCessationForReprise) {
                // Pour un congé de maternité : date de reprise = date de cessation + 6 mois (180 jours)
                dateReprise = new Date(dateCessationForReprise);
                dateReprise.setMonth(dateReprise.getMonth() + 6); // Ajouter 6 mois
            } else if (isCongePaternite && dateCessationForReprise) {
                // Pour un congé de paternité : date de reprise = date de cessation + 1 mois (30 jours)
                dateReprise = new Date(dateCessationForReprise);
                dateReprise.setMonth(dateReprise.getMonth() + 1); // Ajouter 1 mois
            } else if (row.date_fin) {
                // Pour un congé annuel ou autre : date de reprise = date de fin + 1 jour
                dateReprise = new Date(row.date_fin);
                dateReprise.setDate(dateReprise.getDate() + 1);
            } else if (row.date_debut && dateCessationForReprise) {
                const dateDebut = new Date(row.date_debut);
                dateReprise = new Date(dateDebut);
                dateReprise.setDate(dateReprise.getDate() + 1);
            } else if (dateCessationForReprise) {
                dateReprise = new Date(dateCessationForReprise);
                dateReprise.setDate(dateReprise.getDate() + 30);
            }

            // Ajuster la date de reprise pour éviter les weekends et jours fériés
            // (s'applique à tous les types de congés : maternité, annuel, etc.)
            if (dateReprise) {
                dateReprise = ajusterDateReprise(dateReprise);
            }

            const dateRepriseFormatee = dateReprise ? dateReprise.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : '';

            // Déterminer "l'intéressé" ou "l'intéressée"
            const interesseGenre = row.sexe === 'F' ? 'e' : '';

            // Texte principal avec le nouveau format
            const textePrincipal = `Je soussigné${validateurGenre}, ${validateurNomComplet}, ${validateurFonction}, certifie que ${civilite} ${agentNameParts.prenoms} ${agentNameParts.nom}, matricule ${row.matricule}, ${designationPoste}, a cessé le service à la ${serviceNom} le ${dateCessation}.`;

            doc.fontSize(BODY_FONT_SIZE)
                .font(BASE_FONT)
                .text(textePrincipal, 50, yPosition, {
                    align: 'justify',
                    width: 500
                });

            yPosition = doc.y + 30;

            // Motif de cessation - Titre centré et souligné
            doc.fontSize(SUBTITLE_FONT_SIZE)
                .font(BOLD_FONT)
                .text('MOTIF DE LA CESSATION', 50, yPosition, {
                    align: 'center',
                    width: 500
                });

            // Souligner le titre - Positionner sous le texte
            const titleWidth = doc.widthOfString('MOTIF DE LA CESSATION', { font: BOLD_FONT, fontSize: SUBTITLE_FONT_SIZE });
            const titleX = 50 + (500 - titleWidth) / 2;
            // Utiliser doc.y qui donne la position Y après le texte, puis ajouter un petit espacement
            const underlineY = doc.y + 2;
            doc.moveTo(titleX, underlineY)
                .lineTo(titleX + titleWidth, underlineY)
                .lineWidth(1)
                .stroke();

            yPosition = doc.y + 15;
            doc.fontSize(BODY_FONT_SIZE)
                .font(BASE_FONT)
                .text(motifCessation, 50, yPosition, { width: 500 });

            // Afficher la phrase de reprise uniquement si le document est lié à une demande
            if (dateRepriseFormatee && row.id_demande) {
                yPosition = doc.y + 15;
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`A l'issue de son congé, l'intéressé${interesseGenre} reprendra le service à son poste le ${dateRepriseFormatee}.`, 50, yPosition, { width: 500 });
            }

            // Signature + footer fixes (méthode robuste)
            await attachActiveSignature(validateurInfo);
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
            const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
            const usableWidth = pageWidth - leftMargin - rightMargin;
            const footerY = pageHeight - 80;
            const signatureBlockHeight = 140;
            const minGapAboveFooter = 18;
            const maxSignatureY = footerY - signatureBlockHeight - minGapAboveFooter;
            const signatureY = Math.min(Math.max(doc.y + 95, 585), maxSignatureY);
            const signatureStartX = leftMargin + (usableWidth * 0.45);
            const signatureWidth = usableWidth * 0.55;
            const signatureInfo = await resolveSignatureInfo(validateurInfo);

            if (signatureInfo.role || signatureInfo.name || signatureInfo.imagePath) {
                let sigY = signatureY;
                if (signatureInfo.role) {
                    doc.font(BOLD_FONT)
                        .fontSize(SUBTITLE_FONT_SIZE)
                        .text(signatureInfo.role, signatureStartX, sigY, {
                            align: 'center',
                            width: signatureWidth
                        });
                    sigY = doc.y + 10;
                }

                if (signatureInfo.imagePath && fs.existsSync(signatureInfo.imagePath)) {
                    try {
                        // Centrer l'image dans la zone de signature
                        const imageWidth = 145;
                        const imageHeight = 92;
                        const imageX = signatureStartX + (signatureWidth / 2) - (imageWidth / 2);
                        doc.image(signatureInfo.imagePath, imageX, sigY, {
                            fit: [imageWidth, imageHeight],
                            align: 'center'
                        });
                        sigY += imageHeight + 10;
                    } catch (error) {
                        console.error('❌ Erreur lors de l\'insertion de la signature:', error);
                    }
                }

                if (signatureInfo.name) {
                    const fullName = String(signatureInfo.name || '').trim();
                    let nameFontSize = BODY_FONT_SIZE + 1;
                    doc.font(BOLD_FONT).fontSize(nameFontSize);
                    let nameWidth = doc.widthOfString(fullName);
                    const maxNameWidth = signatureWidth;
                    while (nameWidth > maxNameWidth && nameFontSize > 10) {
                        nameFontSize -= 1;
                        doc.font(BOLD_FONT).fontSize(nameFontSize);
                        nameWidth = doc.widthOfString(fullName);
                    }
                    const nameX = signatureStartX + Math.max((signatureWidth - nameWidth) / 2, 0);
                    doc.font(BOLD_FONT)
                        .fontSize(nameFontSize)
                        .text(fullName, nameX, sigY, {
                            lineBreak: false
                        });
                }
            }

            // Footer forcé en bas de page
            doc.moveTo(50, footerY)
                .lineTo(545, footerY)
                .lineWidth(1)
                .strokeColor('#000000')
                .stroke();

            doc.fontSize(FOOTER_SMALL_FONT_SIZE)
                .font(BASE_FONT)
                .fillColor('#666666')
                .text('Document généré automatiquement par le système de gestion des ressources humaines',
                    50, footerY + 5, {
                        align: 'center',
                        width: 495
                    });

            doc.fontSize(FOOTER_SMALL_FONT_SIZE)
                .font(BASE_FONT)
                .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                    50, footerY + 18, {
                        align: 'center',
                        width: 495
                    });

            // Finaliser le document
            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => {
                    console.log(`✅ PDF certificat de cessation généré: ${outputPath}`);
                    resolve(outputPath);
                });

                doc.on('error', (error) => {
                    console.error('❌ Erreur lors de la génération du PDF:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF de certificat de cessation:', error);
            throw error;
        }
    }

    /**
     * Parse une date au format YYYY-MM-DD sans problème de fuseau horaire
     * @param {string} dateString - Date au format YYYY-MM-DD
     * @returns {Date} - Date parsée en local
     */
    static parseDateLocal(dateString) {
        if (!dateString) return null;
        if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Format YYYY-MM-DD : parser manuellement pour éviter les problèmes de fuseau horaire
            const parts = dateString.split('-');
            return new Date(
                parseInt(parts[0]), // année
                parseInt(parts[1]) - 1, // mois (0-indexé)
                parseInt(parts[2]) // jour
            );
        }
        return new Date(dateString);
    }

    /**
     * Génère un PDF de note de service
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires (date_effet, numero_document, etc.)
     * @param {string} outputPath - Chemin de sortie pour le PDF
     * @returns {Promise<string>} - Le chemin du fichier PDF généré
     */
    static async generateNoteDeServicePDF(agent, validateur, options = {}, outputPath) {
            return new Promise(async(resolve, reject) => {
                        try {
                            console.log(`📄 Génération du PDF de note de service pour l'agent ${agent.id}...`);

                            // Créer le répertoire de sortie s'il n'existe pas
                            const outputDir = path.dirname(outputPath);
                            await fs.mkdir(outputDir, { recursive: true });

                            // Créer le document PDF
                            const doc = new PDFDocument({
                                size: 'A4',
                                margins: {
                                    top: 50,
                                    bottom: 50,
                                    left: 50,
                                    right: 50
                                }
                            });

                            // Créer le stream de fichier
                            const stream = require('fs').createWriteStream(outputPath);
                            doc.pipe(stream);

                            const primaryColor = '#000000';
                            const borderColor = '#000000';

                            // Vérifier que le validateur a un ID
                            console.log('🔍 [generateNoteDeServicePDF] Validateur avant attachActiveSignature:', {
                                hasValidateur: !!validateur,
                                validateurId: validateur && validateur.id,
                                validateurNom: validateur && validateur.nom,
                                validateurPrenom: validateur && validateur.prenom,
                                validateurKeys: validateur ? Object.keys(validateur) : []
                            });

                            // S'assurer que le validateur a un ID
                            if (!validateur || !validateur.id) {
                                console.error('❌ [generateNoteDeServicePDF] Le validateur n\'a pas d\'ID:', validateur);
                                throw new Error('Le validateur doit avoir un ID pour récupérer la signature');
                            }

                            // Attacher la signature active au validateur
                            await hydrateAgentWithLatestFunction(validateur);
                            await attachActiveSignature(validateur);

                            console.log('🔍 [generateNoteDeServicePDF] Validateur après attachActiveSignature:', {
                                validateurId: validateur && validateur.id,
                                hasSignaturePath: !!(validateur && validateur.signature_path),
                                signaturePath: validateur && validateur.signature_path
                            });

                            // Date de génération
                            const generationDate = options.date_generation ? new Date(options.date_generation) : new Date();

                            // Numéro de document - Utiliser un numéro séquentiel basé sur le nombre total de notes de service
                            // Si un numéro manuel est fourni, l'utiliser, sinon générer un numéro séquentiel
                            let documentNumber;
                            if (options.numero_document || options.reference) {
                                // Si un numéro manuel est fourni, l'utiliser via formatDocumentReference
                                const documentObject = options.document_id || options.id ? { id: options.document_id || options.id } : null;
                                documentNumber = formatDocumentReference({
                                    document: documentObject,
                                    agent,
                                    validateur,
                                    userInfo: options.userInfo,
                                    manualReference: options.numero_document || options.reference
                                });
                            } else {
                                // Calculer dynamiquement le numéro de la note de service
                                // en comptant les notes existantes, de la même manière que pour les certificats de prise de service
                                let sequentialNumber = '';
                                const documentId = options.document_id || options.id || null;
                                let documentDateGeneration = options.date_generation || generationDate;

                                // Si le document existe mais n'a pas de date_generation, utiliser la date actuelle ou la date de création
                                if (documentId && !documentDateGeneration) {
                                    try {
                                        const db = require('../config/database');
                                        const docQuery = await db.query(
                                            'SELECT date_generation, created_at FROM documents_autorisation WHERE id = $1', [documentId]
                                        );
                                        if (docQuery.rows.length > 0) {
                                            documentDateGeneration = docQuery.rows[0].date_generation || docQuery.rows[0].created_at || generationDate;
                                        } else {
                                            documentDateGeneration = generationDate;
                                        }
                                    } catch (error) {
                                        console.error('⚠️ Erreur lors de la récupération de la date du document:', error);
                                        documentDateGeneration = generationDate;
                                    }
                                } else if (!documentDateGeneration) {
                                    documentDateGeneration = generationDate;
                                }

                                // Convertir en Date si c'est une string
                                if (documentDateGeneration && !(documentDateGeneration instanceof Date)) {
                                    documentDateGeneration = new Date(documentDateGeneration);
                                }

                                try {
                                    const db = require('../config/database');
                                    const idMinistere = (agent && agent.id_ministere) || null;
                                    if (documentId) {
                                        // Si le document existe déjà, calculer sa position en comptant les notes antérieures (par ministère)
                                        // IMPORTANT: utiliser da.id < $2 (pas <=) pour exclure le document lui-même du décompte
                                        const positionQuery = idMinistere != null ? `
                                SELECT COUNT(*) + 1 as position
                                FROM documents_autorisation da
                                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                                WHERE da.type_document = 'note_de_service'
                                AND a.id_ministere = $3
                                AND (
                                    (da.date_generation IS NOT NULL AND (
                                        da.date_generation < $1 
                                        OR (da.date_generation = $1 AND da.id < $2)
                                    ))
                                    OR (da.date_generation IS NULL AND da.id < $2)
                                )
                            ` : `
                                SELECT COUNT(*) + 1 as position
                                FROM documents_autorisation da
                                WHERE da.type_document = 'note_de_service'
                                AND (
                                    (da.date_generation IS NOT NULL AND (
                                        da.date_generation < $1 
                                        OR (da.date_generation = $1 AND da.id < $2)
                                    ))
                                    OR (da.date_generation IS NULL AND da.id < $2)
                                )
                            `;
                                        const positionParams = idMinistere != null ? [documentDateGeneration, documentId, idMinistere] : [documentDateGeneration, documentId];
                                        const positionResult = await db.query(positionQuery, positionParams);

                                        const position = parseInt((positionResult.rows[0] && positionResult.rows[0].position) || 1, 10);
                                        sequentialNumber = String(position).padStart(4, '0');
                                    } else {
                                        // Si le document n'existe pas encore, compter tous les documents existants (par ministère)
                                        const countQuery = idMinistere != null ? `
                                SELECT COUNT(*) as count
                                FROM documents_autorisation da
                                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                                WHERE da.type_document = 'note_de_service'
                                AND a.id_ministere = $1
                            ` : `
                                SELECT COUNT(*) as count
                                FROM documents_autorisation
                                WHERE type_document = 'note_de_service'
                            `;
                                        const countParams = idMinistere != null ? [idMinistere] : [];
                                        const countResult = await db.query(countQuery, countParams);
                                        const count = parseInt((countResult.rows[0] && countResult.rows[0].count) || 0, 10);
                                        const nextNumber = count + 1;
                                        sequentialNumber = String(nextNumber).padStart(4, '0');
                                    }
                                } catch (error) {
                                    console.error('⚠️ Erreur lors du calcul du numéro de note de service:', error);
                                    // Fallback: utiliser generateSequentialNoteDeServiceDocumentNumber
                                    sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('note_de_service', documentId, (agent && agent.id_ministere) || null);
                                }

                                const resolvedSigle = ensureMinistereSigle({ agent, validateur });
                                const sigle = resolvedSigle || '';

                                // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS'
                                const { ministryName: validatorMinistryName } = resolveOfficialHeaderContext({ agent, validateur });
                                const agentMinistryName = agent.ministere_nom || '';
                                const ministereNom = validatorMinistryName || agentMinistryName || (options.userInfo && options.userInfo.ministere_nom) || '';
                                const isMinTourismeEtLoisirs = ministereNom &&
                                    ministereNom.toUpperCase().includes('TOURISME') &&
                                    ministereNom.toUpperCase().includes('LOISIRS');

                                if (sigle) {
                                    if (isMinTourismeEtLoisirs) {
                                        documentNumber = `${sequentialNumber}/${sigle}/DRH/SDGP`;
                                    } else {
                                        documentNumber = `${sequentialNumber}/${sigle}`;
                                    }
                                } else {
                                    documentNumber = sequentialNumber;
                                }
                            }

                            // Préparer les informations pour le header
                            const resolvedSigle = ensureMinistereSigle({ agent, validateur });
                            const agentMinistryName = agent.ministere_nom || '';
                            // Pour les notes de service, la direction dans le header doit toujours être "DIRECTION DES RESSOURCES HUMAINES"
                            const agentDirectionName = 'DIRECTION DES RESSOURCES HUMAINES';
                            const { ministryName: validatorMinistryName } = resolveOfficialHeaderContext({ agent, validateur });
                            // Forcer aussi validatorDirectionName pour les notes de service (drawOfficialHeaderPDF utilise validatorDirectionName en priorité)
                            const validatorDirectionName = 'DIRECTION DES RESSOURCES HUMAINES';

                            // Dessiner le header officiel
                            const headerBottom = await drawOfficialHeaderPDF(doc, {
                                documentNumber,
                                dateString: generationDate,
                                generatedAt: generationDate,
                                city: 'Abidjan',
                                agentMinistryName,
                                agentDirectionName, // Toujours "DIRECTION DES RESSOURCES HUMAINES" pour les notes de service
                                validatorMinistryName,
                                validatorDirectionName // Toujours "DIRECTION DES RESSOURCES HUMAINES" pour les notes de service
                            });

                            // Titre "NOTE DE SERVICE" (centré et souligné)
                            const titleY = headerBottom + 60;
                            doc.fontSize(TITLE_FONT_SIZE)
                                .font(BOLD_FONT)
                                .text('NOTE DE SERVICE', 50, titleY, {
                                    align: 'center',
                                    width: 495
                                });

                            // Souligner le titre
                            const titleWidth = doc.widthOfString('NOTE DE SERVICE', { font: BOLD_FONT, fontSize: TITLE_FONT_SIZE });
                            const titleX = 50 + (495 - titleWidth) / 2;
                            const underlineY = titleY + 20;
                            doc.moveTo(titleX, underlineY)
                                .lineTo(titleX + titleWidth, underlineY)
                                .lineWidth(1)
                                .stroke();

                            // Date d'effet - Utiliser parseDateLocal pour éviter les décalages de fuseau horaire
                            const dateEffet = options.date_effet ? this.parseDateLocal(options.date_effet) : generationDate;
                            const dateEffetStr = dateEffet.toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });

                            // Date de génération formatée pour la phrase d'effet
                            const generationDateStr = generationDate.toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });

                            // Informations de l'agent
                            const nameParts = formatAgentName(agent);
                            const nomComplet = nameParts.fullWithCivilite;

                            // Date de naissance
                            let dateNaissanceStr = '';
                            if (agent.date_de_naissance) {
                                const dateNaissance = new Date(agent.date_de_naissance);
                                dateNaissanceStr = dateNaissance.toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });
                            }
                            const lieuNaissance = agent.lieu_de_naissance || '';

                            // Récupérer l'emploi le plus récent de l'agent
                            let emploiRecent = '';
                            if (agent.id) {
                                try {
                                    const db = require('../config/database');
                                    const emploiQuery = `
                            SELECT e.libele as emploi_libele, ea.designation_poste
                            FROM emploi_agents ea
                            LEFT JOIN emplois e ON ea.id_emploi = e.id
                            WHERE ea.id_agent = $1
                            ORDER BY ea.date_entree DESC, ea.created_at DESC
                            LIMIT 1
                        `;
                                    const emploiResult = await db.query(emploiQuery, [agent.id]);
                                    if (emploiResult.rows.length > 0) {
                                        emploiRecent = emploiResult.rows[0].emploi_libele || emploiResult.rows[0].designation_poste || '';
                                    }
                                } catch (error) {
                                    console.error('⚠️ Erreur lors de la récupération de l\'emploi:', error);
                                }
                            }

                            // Si pas d'emploi récent trouvé, utiliser emploi/fonction selon type d'agent (emploi_agents / fonction_agents)
                            if (!emploiRecent) {
                                emploiRecent = getAgentPosteOuEmploi(agent);
                            }

                            // Récupérer le grade depuis les tables d'historique
                            let grade = '';

                            if (agent.id) {
                                try {
                                    const db = require('../config/database');
                                    // Récupérer le grade le plus récent
                                    const gradeQuery = `
                            SELECT g.libele as grade_libelle
                            FROM grades_agents ga
                            LEFT JOIN grades g ON ga.id_grade = g.id
                            WHERE ga.id_agent = $1
                            ORDER BY COALESCE(ga.date_entree, ga.created_at) DESC, ga.id DESC
                            LIMIT 1
                        `;
                                    const gradeResult = await db.query(gradeQuery, [agent.id]);
                                    if (gradeResult.rows.length > 0) {
                                        grade = gradeResult.rows[0].grade_libelle || '';
                                    }
                                } catch (error) {
                                    console.error('⚠️ Erreur lors de la récupération du grade:', error);
                                }
                            }

                            // Si pas trouvé dans l'historique, utiliser les valeurs de l'objet agent
                            if (!grade) {
                                grade = agent.grade_libele || agent.grade_libelle || agent.grade || '';
                            }

                            // Récupérer la classe depuis les options ou les données de l'agent (sans échelon)
                            const classeLibelle = agent.classe_libelle || agent.classe || options.classe || '';

                            const dateEchelon = options.date_echelon ? new Date(options.date_echelon).toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : '';

                            // Construire la partie classe uniquement (sans échelon) - Format complet en toutes lettres
                            let classeEchelon = '';
                            if (classeLibelle) {
                                // Utiliser uniquement la classe : "de deuxième classe"
                                const classeFormatee = classeLibelle.toLowerCase();
                                classeEchelon = `de ${classeFormatee}`;
                                if (dateEchelon) {
                                    classeEchelon += ` au ${dateEchelon}`;
                                }
                            }

                            // Affectation : Direction en priorité, sinon Direction Générale
                            const resolveAffectation = (a) => {
                                for (const val of [a.direction_nom, a.service_nom, a.direction_generale_nom, a.direction_libelle, a.service_libelle]) {
                                    if (typeof val === 'string' && val.trim() !== '' && val.trim().toLowerCase() !== 'null' && val.trim().toLowerCase() !== 'undefined') {
                                        return val.trim();
                                    }
                                }
                                return '';
                            };
                            const affectation = resolveAffectation(agent);

                            // Référence certificat avec date
                            const certReference = options.cert_reference || options.certificat_reference || '';
                            const certDate = options.cert_date || '';

                            // Corps du document
                            let yPosition = titleY + 60;

                            // Premier paragraphe - Format exact comme dans l'image
                            doc.fontSize(BODY_FONT_SIZE)
                                .font(BASE_FONT)
                                .fillColor(primaryColor);

                            // Construire le texte principal - Format complet selon l'image
                            let texte1Parts = [];

                            // 1. Nom complet
                            texte1Parts.push(nomComplet);

                            // 2. Matricule
                            if (agent.matricule) {
                                texte1Parts.push(`matricule ${agent.matricule}`);
                            }

                            // 3. Date et lieu de naissance
                            if (dateNaissanceStr) {
                                const naissancePart = `née le ${dateNaissanceStr}`;
                                if (lieuNaissance) {
                                    texte1Parts.push(`${naissancePart} à ${lieuNaissance.toUpperCase()}`);
                                } else {
                                    texte1Parts.push(naissancePart);
                                }
                            }

                            // 4. Emploi
                            if (emploiRecent) {
                                texte1Parts.push(emploiRecent);
                            }

                            // 5. Grade
                            if (grade) {
                                texte1Parts.push(`grade ${grade}`);
                            }

                            // 6. Affectation (classe retirée selon demande)
                            // Utiliser la fonction utilitaire pour déterminer la bonne préposition
                            const genre = agent.sexe === 'F' ? 'F' : 'M';
                            const affectationPhrase = formatAffectationPhrase(affectation, genre);
                            if (affectationPhrase) {
                                texte1Parts.push(affectationPhrase);
                            }

                            // 7. Conformément au certificat
                            if (certReference) {
                                let certText = 'conformément au CERT. DE 1ERE P. DE SERVICE';
                                certText += `\nnø ${certReference}`;
                                if (certDate) {
                                    const certDateStr = new Date(certDate).toLocaleDateString('fr-FR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                    certText += ` du ${certDateStr}`;
                                }
                                texte1Parts.push(certText);
                            }

                            const texte1 = texte1Parts.join(' ,\n') + '.';

                            doc.text(texte1, 50, yPosition, {
                                align: 'justify',
                                width: 495
                            });

                            yPosition = doc.y + 25;

                            // Deuxième paragraphe
                            const texte2 = `La présente note de service prend effet à compter du ${generationDateStr}.`;
                            doc.text(texte2, 50, yPosition, {
                                align: 'left',
                                width: 495
                            });

                            yPosition = doc.y + 20;

                            // Note importante (N.B.)
                            doc.font(BOLD_FONT)
                                .fontSize(BODY_FONT_SIZE)
                                .text('N.B.:', 50, yPosition, {
                                    align: 'left'
                                });

                            yPosition = doc.y + 8;

                            doc.font(BASE_FONT)
                                .fontSize(BODY_FONT_SIZE)
                                .text('Le Responsable chargé du Personnel devra adresser à la Direction des Ressources Humaines du Ministère, le certificat de prise de service de l\'intéressé(e) dès sa prise de fonction.', 50, yPosition, {
                                    align: 'justify',
                                    width: 495
                                });

                            // Signature en bas à droite - Positionner après le texte N.B. avec espacement réduit
                            yPosition = doc.y + 25;

                            // Vérifier que la signature tient sur la page
                            const docPageHeight = doc.page.height;
                            const signatureHeight = 100; // Hauteur approximative de la signature (rôle + image + nom)
                            const footerHeight = 80;
                            const minYForSignature = docPageHeight - footerHeight - signatureHeight - 10;

                            // Si la position actuelle est trop basse, la placer plus haut
                            if (yPosition > minYForSignature) {
                                yPosition = minYForSignature;
                            }

                            // S'assurer que la signature active est récupérée juste avant l'affichage
                            await attachActiveSignature(validateur);
                            const signatureInfo = await resolveSignatureInfo(validateur, 'Le Directeur');

                            // Transformer "DIRECTEUR" ou "DRH" en "LE DIRECTEUR"
                            if (signatureInfo.role) {
                                const roleUpper = signatureInfo.role.toUpperCase();
                                if (roleUpper === 'DIRECTEUR' || roleUpper === 'DRH') {
                                    signatureInfo.role = 'LE DIRECTEUR';
                                }
                            }

                            console.log('🔍 [generateNoteDeServicePDF] Signature info:', {
                                hasRole: !!signatureInfo.role,
                                hasName: !!signatureInfo.name,
                                hasImagePath: !!signatureInfo.imagePath,
                                imagePath: signatureInfo.imagePath,
                                role: signatureInfo.role,
                                name: signatureInfo.name,
                                yPosition: yPosition,
                                minYForSignature: minYForSignature
                            });

                            // Utiliser la fonction standardisée pour afficher la signature alignée à droite
                            drawStandardSignatureRight(
                                doc,
                                yPosition,
                                signatureInfo, {
                                    imageWidth: 180,
                                    imageHeight: 90,
                                    signatureWidth: 450,
                                    spacing: 15,
                                    roleFontSize: 15,
                                    nameFontSize: 15
                                }
                            );

                            // Footer
                            const pageHeight = doc.page.height;
                            const footerY = pageHeight - 80;

                            doc.moveTo(50, footerY)
                                .lineTo(545, footerY)
                                .lineWidth(0.5)
                                .strokeColor(borderColor)
                                .stroke();

                            doc.fontSize(FOOTER_FONT_SIZE)
                                .font(BASE_FONT)
                                .fillColor('#666666')
                                .text('Document généré automatiquement par le système de gestion des ressources humaines',
                                    50, footerY + 5, {
                                        align: 'center',
                                        width: 495
                                    });

                            doc.fontSize(FOOTER_FONT_SIZE)
                                .font(BASE_FONT)
                                .text(`Généré le ${generationDate.toLocaleString('fr-FR')}${documentNumber ? ` - Document N° ${documentNumber}` : ''}`,
                        50, footerY + 18, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

                stream.on('finish', () => {
                    console.log(`✅ PDF de note de service généré avec succès: ${outputPath}`);
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    console.error('❌ Erreur lors de l\'écriture du PDF:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de note de service:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de note de service de mutation
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires (id_direction_destination, direction_destination, date_effet, motif)
     * @param {string} outputPath - Chemin de sortie du PDF
     * @returns {Promise<string>} - Le chemin du PDF généré
     */
    static async generateNoteDeServiceMutationPDF(demande, agent, validateur, options = {}, outputPath) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF de note de service de mutation pour l'agent ${agent.id}...`);

                // Créer le répertoire de sortie s'il n'existe pas
                const outputDir = path.dirname(outputPath);
                await fs.mkdir(outputDir, { recursive: true });

                // Créer le document PDF
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Créer le stream de fichier
                const stream = require('fs').createWriteStream(outputPath);
                doc.pipe(stream);

                const primaryColor = '#000000';
                const borderColor = '#000000';

                if (!validateur || !validateur.id) {
                    throw new Error('Le validateur doit avoir un ID pour récupérer la signature');
                }

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                // Date de génération - Utiliser le constructeur local pour éviter les décalages de fuseau horaire
                const dateParts = options.date_effet.split('-'); // ["2026", "01", "28"]

                const generationDate = new Date(
                    parseInt(dateParts[0]),   // année
                    parseInt(dateParts[1]) - 1, // mois (0-indexé)
                    parseInt(dateParts[2])      // jour
                );
                                
                // Numéro de document pour l'en-tête - Utiliser un numéro séquentiel basé sur le nombre total de notes de service de mutation
                const resolvedSigle = ensureMinistereSigle({ agent, validateur });
                let headerDocumentNumber;
                if (options.numero_document || options.reference) {
                    // Si un numéro manuel est fourni, l'utiliser via formatDocumentReference
                    const documentObject = options.document_id || options.id ? { id: options.document_id || options.id } : null;
                    headerDocumentNumber = formatDocumentReference({
                        document: documentObject,
                        demande: demande,
                        agent,
                        validateur,
                        userInfo: options.userInfo,
                        sigle: resolvedSigle,
                        manualReference: options.numero_document || options.reference
                    });
                } else {
                    // Calculer dynamiquement le numéro de la note de service de mutation
                    // en comptant les notes existantes, de la même manière que pour les notes de service
                    let sequentialNumber = '';
                    const documentId = options.document_id || options.id || null;
                    let documentDateGeneration = options.date_debut || generationDate;
                    
                    // Si le document existe mais n'a pas de date_generation, utiliser la date actuelle ou la date de création
                    if (documentId && !documentDateGeneration) {
                        try {
                            const db = require('../config/database');
                            const docQuery = await db.query(
                                'SELECT date_debut FROM demandes WHERE id = $1',
                                [documentId]
                            );
                            if (docQuery.rows.length > 0) {
                                documentDateGeneration = docQuery.rows[0].date_debut || options.date_effet || generationDate;
                            } else {
                                documentDateGeneration = options.date_effet || generationDate;
                            }
                        } catch (error) {
                            console.error('⚠️ Erreur lors de la récupération de la date du document:', error);
                            documentDateGeneration = options.date_effet || generationDate;
                        }
                    } else if (!documentDateGeneration) {
                        documentDateGeneration = options.date_effet || generationDate;
                    }
                    
                    // Convertir en Date si c'est une string
                    if (documentDateGeneration && !(documentDateGeneration instanceof Date)) {
                        documentDateGeneration = new Date(documentDateGeneration);
                    }
                    
                    try {
                        const db = require('../config/database');
                        const idMinistere = agent?.id_ministere ?? null;
                        if (documentId) {
                            // Si le document existe déjà, calculer sa position en comptant les notes antérieures (par ministère)
                            // IMPORTANT: utiliser da.id < $2 (pas <=) pour exclure le document lui-même du décompte
                            const positionQuery = idMinistere != null ? `
                                SELECT COUNT(*) + 1 as position
                                FROM documents_autorisation da
                                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                                WHERE da.type_document = 'note_de_service_mutation'
                                AND a.id_ministere = $3
                                AND (
                                    (da.date_generation IS NOT NULL AND (
                                        da.date_generation < $1 
                                        OR (da.date_generation = $1 AND da.id < $2)
                                    ))
                                    OR (da.date_generation IS NULL AND da.id < $2)
                                )
                            ` : `
                                SELECT COUNT(*) + 1 as position
                                FROM documents_autorisation da
                                WHERE da.type_document = 'note_de_service_mutation'
                                AND (
                                    (da.date_generation IS NOT NULL AND (
                                        da.date_generation < $1 
                                        OR (da.date_generation = $1 AND da.id < $2)
                                    ))
                                    OR (da.date_generation IS NULL AND da.id < $2)
                                )
                            `;
                            const positionParams = idMinistere != null ? [documentDateGeneration, documentId, idMinistere] : [documentDateGeneration, documentId];
                            const positionResult = await db.query(positionQuery, positionParams);
                            
                            const position = parseInt(positionResult.rows[0]?.position || 1, 10);
                            sequentialNumber = String(position).padStart(4, '0');
                        } else {
                            // Si le document n'existe pas encore, compter tous les documents existants (par ministère)
                            const countQuery = idMinistere != null ? `
                                SELECT COUNT(*) as count
                                FROM documents_autorisation da
                                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                                WHERE da.type_document = 'note_de_service_mutation'
                                AND a.id_ministere = $1
                            ` : `
                                SELECT COUNT(*) as count
                                FROM documents_autorisation
                                WHERE type_document = 'note_de_service_mutation'
                            `;
                            const countParams = idMinistere != null ? [idMinistere] : [];
                            const countResult = await db.query(countQuery, countParams);
                            const count = parseInt(countResult.rows[0]?.count || 0, 10);
                            const nextNumber = count + 1;
                            sequentialNumber = String(nextNumber).padStart(4, '0');
                        }
                    } catch (error) {
                        console.error('⚠️ Erreur lors du calcul du numéro de note de service de mutation:', error);
                        // Fallback: utiliser generateSequentialNoteDeServiceDocumentNumber
                        sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('note_de_service_mutation', documentId, agent?.id_ministere ?? null);
                    }
                    
                    const sigle = resolvedSigle || '';
                    
                    // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS'
                    const { ministryName: validatorMinistryName } = resolveOfficialHeaderContext({ agent, validateur });
                    const agentMinistryName = agent.ministere_nom || '';
                    const ministereNom = validatorMinistryName || agentMinistryName || options.userInfo?.ministere_nom || '';
                    const isMinTourismeEtLoisirs = ministereNom && 
                        ministereNom.toUpperCase().includes('TOURISME') && 
                        ministereNom.toUpperCase().includes('LOISIRS');
                    
                    if (sigle) {
                        if (isMinTourismeEtLoisirs) {
                            headerDocumentNumber = `${sequentialNumber}/${sigle}/DRH/SDGP`;
                        } else {
                            headerDocumentNumber = `${sequentialNumber}/${sigle}`;
                        }
                    } else {
                        headerDocumentNumber = sequentialNumber;
                    }
                }
                
                // Numéro de document pour le texte : numéro séquentiel du jour
                const noteServiceNumber = await generateNoteDeServiceNumber(generationDate);
                const sigle = resolvedSigle || 'MINTOUR';
                
                // Préparer les informations pour le header
                const agentMinistryName = agent.ministere_nom || '';
                // Pour les notes de service mutation, la direction dans le header doit toujours être "DIRECTION DES RESSOURCES HUMAINES"
                const agentDirectionName = 'DIRECTION DES RESSOURCES HUMAINES';
                const { ministryName: validatorMinistryName } = resolveOfficialHeaderContext({ agent, validateur });
                // Forcer aussi validatorDirectionName pour les notes de service mutation (drawOfficialHeaderPDF utilise validatorDirectionName en priorité)
                const validatorDirectionName = 'DIRECTION DES RESSOURCES HUMAINES';
                
                // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS' pour ajouter /DRH/SDGP
                const ministereNom = validatorMinistryName || agentMinistryName || options.userInfo?.ministere_nom || '';
                const isMinTourismeEtLoisirs = ministereNom && 
                    ministereNom.toUpperCase().includes('TOURISME') && 
                    ministereNom.toUpperCase().includes('LOISIRS');
                
                const noteServiceNumberText = isMinTourismeEtLoisirs 
                    ? `${noteServiceNumber}/${sigle}/DRH/SDGP`
                    : `${noteServiceNumber}/${sigle}`;

                // Dessiner le header officiel
                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber: headerDocumentNumber,
                    dateString: generationDate,
                    generatedAt: generationDate,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName,
                    validatorMinistryName,
                    validatorDirectionName
                });

                // Titre "NOTE DE SERVICE" (centré et souligné)
                const titleY = headerBottom + 60;
                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('NOTE DE SERVICE', 50, titleY, {
                        align: 'center',
                        width: 495
                    });

                // Souligner le titre
                const titleWidth = doc.widthOfString('NOTE DE SERVICE', { font: BOLD_FONT, fontSize: TITLE_FONT_SIZE });
                const titleX = 50 + (495 - titleWidth) / 2;
                const underlineY = titleY + 20;
                doc.moveTo(titleX, underlineY)
                    .lineTo(titleX + titleWidth, underlineY)
                    .lineWidth(1)
                    .stroke();

                // Date d'effet - Utiliser parseDateLocal pour éviter les décalages de fuseau horaire
                const dateEffet = options.date_effet ? this.parseDateLocal(options.date_effet) : generationDate;
                const dateEffetStr = dateEffet.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Date de génération formatée pour la phrase d'effet
                const generationDateStr = generationDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Informations de l'agent
                const nameParts = formatAgentName(agent);
                const nomComplet = nameParts.fullWithCivilite;

                // Date de naissance
                let dateNaissanceStr = '';
                if (agent.date_de_naissance) {
                    const dateNaissance = new Date(agent.date_de_naissance);
                    dateNaissanceStr = dateNaissance.toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
                const lieuNaissance = agent.lieu_de_naissance || '';

                // Récupérer l'emploi le plus récent de l'agent
                const db = require('../config/database');
                let emploiRecent = '';
                try {
                    const emploiQuery = `
                        SELECT e.libele as emploi_libele, ea.designation_poste
                        FROM emploi_agents ea
                        LEFT JOIN emplois e ON ea.id_emploi = e.id
                        WHERE ea.id_agent = $1
                        ORDER BY ea.date_entree DESC, ea.created_at DESC
                        LIMIT 1
                    `;
                    const emploiResult = await db.query(emploiQuery, [agent.id]);
                    if (emploiResult.rows.length > 0) {
                        emploiRecent = emploiResult.rows[0].emploi_libele || emploiResult.rows[0].designation_poste || '';
                    }
                } catch (error) {
                    console.error('⚠️ Erreur lors de la récupération de l\'emploi:', error);
                }
                
                // Si pas d'emploi récent trouvé, utiliser emploi/fonction selon type d'agent (emploi_agents / fonction_agents)
                if (!emploiRecent) {
                    emploiRecent = getAgentPosteOuEmploi(agent);
                }

                // Récupérer le grade et l'échelon les plus récents depuis grades_agents et echelons_agents
                let grade = '';
                let echelon = '';
                
                if (agent.id) {
                    try {
                        // Récupérer le grade le plus récent
                        const gradeQuery = `
                            SELECT g.libele as grade_libelle
                            FROM grades_agents ga
                            LEFT JOIN grades g ON ga.id_grade = g.id
                            WHERE ga.id_agent = $1
                            ORDER BY COALESCE(ga.date_entree, ga.created_at) DESC, ga.id DESC
                            LIMIT 1
                        `;
                        const gradeResult = await db.query(gradeQuery, [agent.id]);
                        if (gradeResult.rows.length > 0) {
                            grade = gradeResult.rows[0].grade_libelle || '';
                        }
                        
                        // Récupérer l'échelon le plus récent
                        const echelonQuery = `
                            SELECT e.libele as echelon_libelle
                            FROM echelons_agents ea
                            LEFT JOIN echelons e ON ea.id_echelon = e.id
                            WHERE ea.id_agent = $1
                            ORDER BY COALESCE(ea.date_entree, ea.created_at) DESC, ea.id DESC
                            LIMIT 1
                        `;
                        const echelonResult = await db.query(echelonQuery, [agent.id]);
                        if (echelonResult.rows.length > 0) {
                            echelon = echelonResult.rows[0].echelon_libelle || '';
                        }
                        
                        console.log(`✅ [generateNoteDeServiceMutationPDF] Grade et échelon récupérés depuis les tables d'historique:`, {
                            grade: grade,
                            echelon: echelon,
                            agentId: agent.id
                        });
                    } catch (error) {
                        console.error('❌ Erreur lors de la récupération du grade et de l\'échelon:', error);
                    }
                }
                
                // Si pas de grade/échelon trouvé dans l'historique, utiliser les valeurs de l'objet agent
                if (!grade) {
                    grade = agent.grade_libele || agent.grade_libelle || agent.grade || '';
                }
                if (!echelon) {
                    echelon = agent.echelon_libelle || agent.echelon_libele || '';
                }
                
                // Affectation : Direction en priorité, sinon Direction Générale
                const resolveAffectation = (a) => {
                    for (const val of [a.direction_nom, a.service_nom, a.direction_generale_nom, a.direction_libelle, a.service_libelle]) {
                        if (typeof val === 'string' && val.trim() !== '' && val.trim().toLowerCase() !== 'null' && val.trim().toLowerCase() !== 'undefined') {
                            return val.trim();
                        }
                    }
                    return '';
                };
                const affectationOrigine = resolveAffectation(agent);
                
                console.log(`🔍 [generateNoteDeServiceMutationPDF] Grade et échelon finaux:`, {
                    grade: grade,
                    echelon: echelon,
                    agentId: agent.id,
                    willBeIncluded: !!(grade || echelon)
                });

                // Direction de destination
                const directionDestination = options.direction_destination || 'DIRECTION';

                // Corps du document
                let yPosition = titleY + 60;

                // Premier paragraphe - Format pour mutation
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor);

                // Construire le texte principal selon le format de l'image
                let texte1Parts = [];
                texte1Parts.push(nomComplet);
                
                if (agent.matricule) {
                    texte1Parts.push(`matricule ${agent.matricule}`);
                }
                
                if (dateNaissanceStr) {
                    const naissancePart = `née le ${dateNaissanceStr}`;
                    if (lieuNaissance) {
                        texte1Parts.push(`${naissancePart} à ${lieuNaissance.toUpperCase()}`);
                    } else {
                        texte1Parts.push(naissancePart);
                    }
                }
                
                if (emploiRecent) {
                    texte1Parts.push(emploiRecent.toUpperCase());
                }
                
                // Ajouter le grade si disponible
                if (grade) {
                    texte1Parts.push(`grade ${grade}`);
                }
                
                // Ajouter l'échelon si disponible
                if (echelon) {
                    texte1Parts.push(`échelon ${echelon}`);
                }
                
                // Texte de mutation
                const mutationText = `est mutée à la ${directionDestination.toUpperCase()}`;
                texte1Parts.push(mutationText);
                
                const texte1 = texte1Parts.join(', ') + '.';

                doc.text(texte1, 50, yPosition, {
                    align: 'justify',
                    width: 495
                });

                yPosition = doc.y + 25;

                // Ajouter la ligne "Conformément à la note de service nø XX/..."
                const dateGenerationStr = generationDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const motifText = `Conformément à la note de service nø ${noteServiceNumberText} du ${dateGenerationStr}.`;
                doc.text(motifText, 50, yPosition, {
                    align: 'left',
                    width: 495
                });
                yPosition = doc.y + 25;

                // Deuxième paragraphe
                const texte2 = `La présente note de service prend effet à compter du ${generationDateStr}.`;
                doc.text(texte2, 50, yPosition, {
                    align: 'left',
                    width: 495
                });

                yPosition = doc.y + 20;

                // Note importante (N.B.)
                doc.font(BOLD_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text('N.B.:', 50, yPosition, {
                        align: 'left'
                    });

                yPosition = doc.y + 8;

                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text('Le Responsable chargé du Personnel devra adresser à la Direction des Ressources Humaines du Ministère, le certificat de prise de service de l\'intéressé(e) dès sa prise de fonction.', 50, yPosition, {
                        align: 'justify',
                        width: 495
                    });

                // Signature en bas à droite
                yPosition = doc.y + 25;
                
                const docPageHeight = doc.page.height;
                const signatureHeight = 100;
                const footerHeight = 80;
                const minYForSignature = docPageHeight - footerHeight - signatureHeight - 10;
                
                if (yPosition > minYForSignature) {
                    yPosition = minYForSignature;
                }
                
                await attachActiveSignature(validateur);
                const signatureInfo = await resolveSignatureInfo(validateur, 'Le Directeur');
                
                // Transformer "DIRECTEUR" ou "DRH" en "LE DIRECTEUR"
                if (signatureInfo.role) {
                    const roleUpper = signatureInfo.role.toUpperCase();
                    if (roleUpper === 'DIRECTEUR' || roleUpper === 'DRH') {
                        signatureInfo.role = 'LE DIRECTEUR';
                    }
                }
                
                drawStandardSignatureRight(
                    doc,
                    yPosition,
                    signatureInfo,
                    {
                        imageWidth: 180,
                        imageHeight: 90,
                        signatureWidth: 450,
                        spacing: 15,
                        roleFontSize: 15,
                        nameFontSize: 15
                    }
                );

                // Footer
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 80;

                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(0.5)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor('#666666')
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 5, {
                            align: 'center',
                            width: 495
                        });

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generationDate.toLocaleString('fr-FR')}${headerDocumentNumber ? ` - Document N° ${headerDocumentNumber}` : ''}`,
                        50, footerY + 18, {
                            align: 'center',
                            width: 495
                        });

                doc.end();

                stream.on('finish', () => {
                    console.log(`✅ PDF de note de service de mutation généré avec succès: ${outputPath}`);
                    resolve(outputPath);
                });

                stream.on('error', (error) => {
                    console.error('❌ Erreur lors de l\'écriture du PDF:', error);
                    reject(error);
                });

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de note de service de mutation:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de note de service de mutation avec nom de fichier automatique
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generateNoteDeServiceMutationPDFAuto(demande, agent, validateur, options = {}) {
        try {
            const timestamp = Date.now();
            const fileName = `note_de_service_mutation_${agent.id}_${timestamp}.pdf`;
            const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);
            await this.generateNoteDeServiceMutationPDF(demande, agent, validateur, options, outputPath);
            return `uploads/documents/${fileName}`;
        } catch (error) {
            console.error('❌ Erreur lors de la génération automatique du PDF de note de service de mutation:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF de note de service avec nom de fichier automatique
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generateNoteDeServicePDFAuto(agent, validateur, options = {}) {
        try {
            // Créer un nom de fichier unique
            const timestamp = Date.now();
            const fileName = `note_de_service_${agent.id}_${timestamp}.pdf`;

            // Chemin complet vers le fichier PDF
            const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);

            // Générer le PDF
            await this.generateNoteDeServicePDF(agent, validateur, options, outputPath);

            // Retourner le chemin relatif pour la base de données
            const relativePath = `uploads/documents/${fileName}`;

            return relativePath;

        } catch (error) {
            console.error('❌ Erreur lors de la génération automatique du PDF de note de service:', error);
            throw error;
        }
    }

    static async generateMissingPDFsWithPDFKit() {
        try {
            const db = require('../config/database');

            console.log('🔍 Recherche des documents sans PDF (PDFKit)...');

            // Récupérer les documents sans PDF
            const query = `
                SELECT * FROM documents_autorisation 
                WHERE chemin_fichier IS NULL OR chemin_fichier = ''
                ORDER BY date_generation ASC
            `;

            const result = await db.query(query);
            const documents = result.rows;

            console.log(`📋 ${documents.length} documents trouvés sans PDF`);

            const updatedDocuments = [];

            for (const document of documents) {
                try {
                    console.log(`📄 Génération du PDF (PDFKit) pour le document ${document.id}...`);

                    const pdfPath = await this.generatePDFForDocument(document);

                    // Mettre à jour la base de données
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;

                    await db.query(updateQuery, [pdfPath, document.id]);

                    updatedDocuments.push({
                        id: document.id,
                        pdf_path: pdfPath,
                        status: 'success',
                        method: 'pdfkit'
                    });

                    console.log(`✅ PDF (PDFKit) généré pour le document ${document.id}: ${pdfPath}`);

                } catch (error) {
                    console.error(`❌ Erreur pour le document ${document.id}:`, error);
                    updatedDocuments.push({
                        id: document.id,
                        status: 'error',
                        error: error.message,
                        method: 'pdfkit'
                    });
                }
            }

            return updatedDocuments;

        } catch (error) {
            console.error('❌ Erreur lors de la génération des PDFs manquants (PDFKit):', error);
            throw error;
        }
    }
}

module.exports = PDFKitGenerationService;