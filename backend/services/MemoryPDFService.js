const PDFDocument = require('pdfkit');
const db = require('../config/database');
const { drawOfficialHeaderPDF, resolveOfficialHeaderContext, pickFirstNonEmptyString } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference, generateNoteDeServiceNumber, generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
const { hydrateAgentWithLatestFunction, getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel, formatAgentDisplayName } = require('./utils/agentFunction');
const { attachActiveSignature, fetchDRHForSignature } = require('./utils/signatureUtils');
const { formatAffectationPhrase, formatDirecteurFromDirection } = require('./utils/frenchGrammar');
const path = require('path');
const fs = require('fs');

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
    const hasImage = imagePath && fs.existsSync(imagePath);

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

    // Utiliser la position Y fournie si elle est valide, sinon utiliser une position par défaut
    let currentY = startY > 0 ? startY : Math.max(startY, doc.page.height - 150);
    const signatureX = pageWidth - rightMargin - signatureWidth;
    const hasImage = imagePath && fs.existsSync(imagePath);

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

        if (!fs.existsSync(imagePath)) {
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
        imagePath: imagePath && fs.existsSync(imagePath) ? imagePath : null
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

/**
 * Affiche un texte avec formatage mixte (gras/normal) en évitant les problèmes de continued: true
 * @param {PDFDocument} doc - Le document PDF
 * @param {Array} segments - Tableau de segments {text: string, bold: boolean}
 * @param {number} x - Position X de départ
 * @param {number} y - Position Y de départ
 * @param {number} width - Largeur disponible
 * @returns {number} - Position Y finale
 */
function writeFormattedText(doc, segments, x, y, width) {
    let currentX = x;
    let currentY = y;
    const lineHeight = BODY_FONT_SIZE * 1.2;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isLast = i === segments.length - 1;

        // Déterminer la font
        doc.font(segment.bold ? BOLD_FONT : BASE_FONT);

        // Calculer la largeur du segment
        const segmentWidth = doc.widthOfString(segment.text, {
            font: segment.bold ? BOLD_FONT : BASE_FONT,
            fontSize: BODY_FONT_SIZE
        });

        // Vérifier si le segment dépasse la largeur disponible
        const availableWidth = width - (currentX - x);
        if (segmentWidth > availableWidth && currentX > x) {
            // Nouvelle ligne
            currentY += lineHeight;
            currentX = x;
        }

        // Afficher le segment
        doc.text(segment.text, currentX, currentY, {
            width: width - (currentX - x),
            continued: !isLast
        });

        // Mettre à jour la position
        currentX = doc.x;
        currentY = doc.y;
    }

    return currentY;
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

class MemoryPDFService {

    /**
     * Génère un PDF d'autorisation d'absence en mémoire (sans sauvegarde)
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateAutorisationAbsencePDFBuffer(demande, agent, validateur, userInfo = null, options = {}) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF en mémoire pour la demande ${demande.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configuration des polices et couleurs
                const primaryColor = '#000000';
                const secondaryColor = '#666666';
                const titleColor = '#000000';
                const borderColor = '#000000';

                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.direction_nom = userInfo.direction_nom || agent.direction_nom || userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = agent.ministere_nom || userInfo.ministere_nom;
                    agent.ministere_sigle = agent.ministere_sigle || userInfo.ministere_sigle;
                    if (validateur) {
                        validateur.ministere_nom = validateur.ministere_nom || userInfo.ministere_nom;
                        validateur.ministere_sigle = validateur.ministere_sigle || userInfo.ministere_sigle;
                        validateur.direction_nom = userInfo.direction_nom || userInfo.service_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }
                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                let generatedAtSource = null;
                const hasExistingGeneratedAt = hasGenerationSource(demande, options);
                let generatedAt = resolveGenerationDate(demande, options);
                if (!hasExistingGeneratedAt && demande && demande.id) {
                    try {
                        const result = await db.query(`
                            SELECT date_generation
                            FROM documents_autorisation
                            WHERE id_demande = $1 AND type_document = 'autorisation_absence'
                            ORDER BY date_generation DESC
                            LIMIT 1
                        `, [demande.id]);
                        if (result.rows.length > 0 && result.rows[0].date_generation) {
                            generatedAtSource = new Date(result.rows[0].date_generation);
                            generatedAt = generatedAtSource;
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
                    formatDocumentReference({ demande, agent, validateur, userInfo, sigle: resolvedSigle });
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });

                const agentMinistryName = agent.ministere_nom ||
                    (userInfo && userInfo.ministere_nom) ||
                    headerContext.ministryName ||
                    (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    '';

                const resolvedDirectionName = headerContext.directionName ||
                    agent.direction_nom ||
                    agent.service_nom ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    agent.service_nom ||
                    '';

                if (!agent.direction_nom && resolvedDirectionName) {
                    agent.direction_nom = resolvedDirectionName;
                }
                if (!agent.service_nom && resolvedDirectionName) {
                    agent.service_nom = resolvedDirectionName;
                }

                const agentDirectionName = resolvedDirectionName;

                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    headerContext.ministryName ||
                    agentMinistryName;
                const validatorDirectionName = headerContext.directionName ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    resolvedDirectionName;

                if (!agent.ministere_nom && agentMinistryName) {
                    agent.ministere_nom = agentMinistryName;
                }
                if (!agent.direction_nom && agentDirectionName) {
                    agent.direction_nom = agentDirectionName;
                }

                const agentNameParts = formatAgentName(agent);

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

                const titleY = headerBottom + 35;
                doc.rect(120, titleY - 12, 360, 34)
                    .lineWidth(2)
                    .strokeColor(titleColor)
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .fillColor(titleColor)
                    .text('AUTORISATION D\'ABSENCE', 120, titleY - 2, {
                        align: 'center',
                        width: 360
                    });

                // === CORPS DU DOCUMENT ===
                let yPosition = headerBottom + 110;

                // Calculer la période d'absence
                const dateDebut = new Date(demande.date_debut);
                const dateFin = new Date(demande.date_fin);
                const differenceMs = dateFin.getTime() - dateDebut.getTime();
                const jours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1;

                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR');
                const dateFinStr = dateFin.toLocaleDateString('fr-FR');

                // Utiliser les informations de l'utilisateur connecté pour le ministère et service
                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                }

                // Texte principal sans bordure
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor)
                    .text(`Une autorisation d'absence de ${jours} jour${jours > 1 ? 's' : ''}`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 25;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`valable du ${dateDebutStr} au ${dateFinStr} inclus`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 25;
                writePrefixedBoldName(doc, 'est accordée à ', agentNameParts, 50, yPosition);

                yPosition += 25;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`matricule ${agent.matricule}`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 25;
                doc.font(BOLD_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`${getAgentPosteOuEmploi(agent).toUpperCase()}`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 25;
                const serviceDisplay = headerContext.directionName ||
                    agent.direction_nom ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    validatorDirectionName ||
                    agent.service_nom ||
                    'DIRECTION';
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`en service à la ${serviceDisplay}`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 30;

                // Motif de l'absence
                doc.font(BOLD_FONT)
                    .fontSize(SUBTITLE_FONT_SIZE)
                    .text('Motif de l\'absence:', 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 20;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`${demande.description || 'affaires personnelles'}`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 30;

                // S'assurer que la signature active est récupérée juste avant l'affichage
                await attachActiveSignature(validateur);
                yPosition = drawStandardSignature(
                    doc,
                    yPosition + 40,
                    await resolveSignatureInfo(validateur)
                );

                // === FOOTER ===
                // Positionner le footer en bas de page avec espacement approprié
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 90; // Position légèrement remontée pour garder le document sur une page

                // Ligne de séparation du footer
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
                    .stroke();

                const generatedAtString = generatedAt.toLocaleString('fr-FR');

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(secondaryColor)
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 5, {
                            align: 'center',
                            width: 500
                        });

                doc.fontSize(FOOTER_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAtString} - Document N° ${documentNumber}`,
                        50, footerY + 18, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF d'autorisation d'absence à partir d'une demande
     * @param {number} demandeId - L'ID de la demande
     * @param {Object} userInfo - Les informations de l'utilisateur connecté
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generatePDFFromDemandeId(demandeId, userInfo) {
        try {
            // Récupérer toutes les données nécessaires
            const query = `
                SELECT 
                    d.*,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.sexe, a.fonction_actuelle as poste,
                    a.date_prise_service_au_ministere, a.date_prise_service_dans_la_direction,
                    c.libele as civilite,
                    s.libelle as service_nom,
                    s.libelle as direction_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    ta.libele as type_agent_libele,
                    ea_actuel.emploi_libele as emploi_libele,
                    ea_actuel.designation_poste as emploi_designation_poste,
                    fa_actuel.fonction_libele as fonction_actuelle_libele,
                    drh.id as validateur_id,
                    drh.prenom as validateur_prenom, drh.nom as validateur_nom,
                    drh.fonction_actuelle as validateur_fonction,
                    fa.designation_poste as validateur_fonction_designation,
                    drh_dir.libelle as validateur_direction_nom,
                    m_drh.nom as validateur_ministere_nom,
                    m_drh.sigle as validateur_ministere_sigle,
                    drh_civ.libele as validateur_civilite
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) ea.id_agent, e.libele as emploi_libele, ea.designation_poste as designation_poste
                    FROM emploi_agents ea LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) fa.id_agent, f.libele as fonction_libele
                    FROM fonction_agents fa LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuel ON a.id = fa_actuel.id_agent
                LEFT JOIN agents drh ON d.id_drh = drh.id
                LEFT JOIN directions drh_dir ON drh.id_direction = drh_dir.id
                LEFT JOIN ministeres m_drh ON drh.id_ministere = m_drh.id
                LEFT JOIN civilites drh_civ ON drh.id_civilite = drh_civ.id
                LEFT JOIN fonction_agents fa ON drh.id = fa.id_agent AND fa.date_entree = (
                    SELECT MAX(fa2.date_entree) 
                    FROM fonction_agents fa2 
                    WHERE fa2.id_agent = drh.id
                )
                WHERE d.id = $1
            `;

            const result = await db.query(query, [demandeId]);

            if (result.rows.length === 0) {
                throw new Error('Demande non trouvée');
            }

            const row = result.rows[0];

            // Préparer les données
            const demande = {
                id: row.id,
                date_debut: row.date_debut,
                date_fin: row.date_fin,
                description: row.description,
                commentaire_drh: row.commentaire_drh,
                date_generation: row.date_generation || row.date_validation || row.date_approbation || row.updated_at || row.created_at
            };

            const agent = {
                prenom: row.agent_prenom,
                nom: row.agent_nom,
                matricule: row.matricule,
                civilite: row.civilite,
                sexe: row.sexe,
                poste: row.poste,
                fonction_actuelle: row.fonction_actuelle_libele || row.poste,
                type_agent_libele: row.type_agent_libele,
                emploi_libele: row.emploi_libele,
                emploi_designation_poste: row.emploi_designation_poste,
                service_nom: row.service_nom,
                direction_nom: row.direction_nom || row.service_nom,
                ministere_nom: row.ministere_nom,
                ministere_sigle: row.ministere_sigle,
                date_prise_service_au_ministere: row.date_prise_service_au_ministere,
                date_prise_service_dans_la_direction: row.date_prise_service_dans_la_direction
            };

            const validateur = {
                id: row.validateur_id,
                prenom: row.validateur_prenom,
                nom: row.validateur_nom,
                fonction: row.validateur_fonction_designation || row.validateur_fonction,
                ministere_sigle: row.validateur_ministere_sigle,
                ministere_nom: row.validateur_ministere_nom,
                direction_nom: row.validateur_direction_nom,
                service_nom: row.validateur_direction_nom,
                structure_nom: row.validateur_direction_nom,
                civilite: row.validateur_civilite
            };

            // Utiliser les informations de l'utilisateur connecté pour le ministère et service
            if (userInfo) {
                agent.service_nom = userInfo.service_nom || row.service_nom;
                agent.direction_nom = userInfo.service_nom || agent.direction_nom;
                agent.ministere_nom = userInfo.ministere_nom || row.ministere_nom;
                validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                validateur.direction_nom = userInfo.service_nom || validateur.direction_nom;
            }

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            return await this.generateAutorisationAbsencePDFBuffer(demande, agent, validateur, userInfo, { generatedAt: demande.date_generation });

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF à partir de la demande:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF d'autorisation d'absence à partir d'un document existant
     * @param {number} documentId - L'ID du document
     * @param {Object} userInfo - Les informations de l'utilisateur connecté
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generatePDFFromDocumentId(documentId, userInfo) {
        try {
            // Récupérer toutes les données nécessaires
            const query = `
                SELECT 
                    doc.*,
                    doc.id_agent_generateur,
                    doc.motif_cessation, doc.date_cessation,
                    d.date_debut, d.date_fin, d.description, d.commentaire_drh,
                    d.agree_motif, d.agree_date_cessation,
                    d.motif_conge, d.motif, d.annee_au_titre_conge,
                    a.id as agent_id,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.sexe, 
                    a.fonction_actuelle, a.fonction_actuelle as poste,
                    a.id_direction, a.id_sous_direction,
                    a.id_ministere as id_ministere,
                    c.libele as civilite,
                    s.libelle as service_nom,
                    s.libelle as direction_nom,
                    m.nom as ministere_nom,
                    m.sigle as ministere_sigle,
                    ta.libele as type_agent_libele,
                    ea_actuel.emploi_libele as emploi_libele,
                    ea_actuel.designation_poste as emploi_designation_poste,
                    fa_actuel.fonction_libele as fonction_actuelle_libele,
                    COALESCE(val.id, doc.id_agent_generateur) as validateur_id,
                    val.prenom as validateur_prenom, val.nom as validateur_nom,
                    val.fonction_actuelle as validateur_fonction,
                    fa.designation_poste as validateur_fonction_designation,
                    val_dir.libelle as validateur_direction_nom,
                    m_val.nom as validateur_ministere_nom,
                    m_val.sigle as validateur_ministere_sigle,
                    val_civ.libele as validateur_civilite,
                    doc.type_document
                FROM documents_autorisation doc
                LEFT JOIN demandes d ON doc.id_demande = d.id
                LEFT JOIN agents a ON doc.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
                LEFT JOIN (
                    SELECT DISTINCT ON (ea.id_agent) ea.id_agent, e.libele as emploi_libele, ea.designation_poste as designation_poste
                    FROM emploi_agents ea LEFT JOIN emplois e ON ea.id_emploi = e.id
                    ORDER BY ea.id_agent, ea.date_entree DESC
                ) ea_actuel ON a.id = ea_actuel.id_agent
                LEFT JOIN (
                    SELECT DISTINCT ON (fa.id_agent) fa.id_agent, f.libele as fonction_libele
                    FROM fonction_agents fa LEFT JOIN fonctions f ON fa.id_fonction = f.id
                    ORDER BY fa.id_agent, fa.date_entree DESC
                ) fa_actuel ON a.id = fa_actuel.id_agent
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

            const result = await db.query(query, [documentId]);

            if (result.rows.length === 0) {
                throw new Error('Document non trouvé');
            }

            const row = result.rows[0];

            // Préparer les données
            // Utiliser les valeurs de documents_autorisation si id_demande est NULL
            const demande = {
                id: row.id_demande,
                date_debut: row.date_debut,
                date_fin: row.date_fin,
                description: row.description,
                commentaire_drh: row.commentaire_drh,
                date_generation: row.date_generation || row.updated_at || row.created_at,
                annee_au_titre_conge: row.annee_au_titre_conge || null,
                // Utiliser motif_conge (choisi par l'agent) en priorité, puis motif_cessation, puis agree_motif
                motif_conge: row.motif_conge || null,
                agree_motif: row.id_demande ? row.agree_motif : (row.motif_cessation || row.agree_motif),
                agree_date_cessation: row.id_demande ? row.agree_date_cessation : (row.date_cessation || row.agree_date_cessation),
                date_cessation: row.date_cessation || row.agree_date_cessation || null,
                motif: row.motif_conge || row.motif || (row.id_demande ? row.agree_motif : (row.motif_cessation || row.agree_motif))
            };

            console.log('🔍 DEBUG - Motif récupéré pour le certificat:', {
                motif_conge: demande.motif_conge,
                agree_motif: demande.agree_motif,
                motif: demande.motif,
                id_demande: demande.id
            });

            const agent = {
                id: row.agent_id,
                prenom: row.agent_prenom,
                nom: row.agent_nom,
                matricule: row.matricule,
                civilite: row.civilite,
                sexe: row.sexe,
                poste: row.poste,
                fonction_actuelle: row.fonction_actuelle_libele || row.fonction_actuelle || row.poste,
                type_agent_libele: row.type_agent_libele,
                emploi_libele: row.emploi_libele,
                emploi_designation_poste: row.emploi_designation_poste,
                service_nom: row.service_nom,
                ministere_nom: row.ministere_nom,
                ministere_sigle: row.ministere_sigle,
                date_prise_service_au_ministere: row.date_prise_service_au_ministere,
                date_prise_service_dans_la_direction: row.date_prise_service_dans_la_direction,
                id_direction: row.id_direction,
                id_sous_direction: row.id_sous_direction,
                id_ministere: row.id_ministere
            };

            // Si validateur_id n'est pas disponible, essayer id_agent_generateur
            const validateurId = row.validateur_id || row.id_agent_generateur;

            console.log('🔍 [generatePDFFromDocumentId] Données validateur:', {
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
                ministere_sigle: row.validateur_ministere_sigle,
                ministere_nom: row.validateur_ministere_nom,
                direction_nom: row.validateur_direction_nom,
                service_nom: row.validateur_direction_nom,
                structure_nom: row.validateur_direction_nom,
                civilite: row.validateur_civilite
            };

            // Utiliser les informations de l'utilisateur connecté pour le ministère et service
            if (userInfo) {
                agent.service_nom = userInfo.service_nom || row.service_nom;
                agent.ministere_nom = userInfo.ministere_nom || row.ministere_nom;
                validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                validateur.direction_nom = userInfo.service_nom || validateur.direction_nom;
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
            const docOptions = { documentId, typeDocument };
            if (typeDocument === 'attestation_presence') {
                return await this.generateAttestationPresencePDFBuffer(demande, agent, validateur, userInfo, docOptions);
            } else if (typeDocument === 'certificat_cessation') {
                return await this.generateCertificatCessationPDFBuffer(demande, agent, validateur, userInfo, docOptions);
            } else if (typeDocument === 'certificat_reprise_service') {
                return await this.generateCertificatRepriseServicePDFBuffer(demande, agent, validateur, userInfo, docOptions);
            } else if (typeDocument === 'certificat_non_jouissance_conge') {
                return await this.generateCertificatNonJouissanceCongePDFBuffer(demande, agent, validateur, userInfo, docOptions);
            } else if (typeDocument === 'certificat_prise_service') {
                return await this.generateCertificatPriseServicePDFBuffer(agent, validateur, userInfo, {
                    documentId: documentId,
                    date_generation: row.date_generation
                });
            } else if (typeDocument === 'autorisation_sortie_territoire') {
                return await this.generateAutorisationSortieTerritoirePDFBuffer(demande, agent, validateur, userInfo, docOptions);
            } else if (typeDocument === 'attestation_travail') {
                return await this.generateAttestationTravailPDFBuffer(demande, agent, validateur, userInfo, docOptions);
            } else {
                return await this.generateAutorisationAbsencePDFBuffer(demande, agent, validateur, userInfo, {...docOptions, generatedAt: demande.date_generation });
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF à partir du document:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF d'attestation de présence en mémoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Optionnel: { documentId, typeDocument } pour numéro séquentiel par type et ministère
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateAttestationPresencePDFBuffer(demande, agent, validateur, userInfo = null, options = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'attestation de présence en mémoire pour la demande ${demande.id}...`);

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                // Créer le document PDF en mémoire - Optimisé pour une seule page A4
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 30,
                        bottom: 30,
                        left: 40,
                        right: 40
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configuration des polices et couleurs
                const primaryColor = '#000000';
                const borderColor = '#000000';

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

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const documentNumber = (options && options.documentId != null && options && options.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: options.documentId, type_document: options.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({ demande, agent, validateur, userInfo, sigle: resolvedSigle });
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });
                const agentMinistryName = agent.ministere_nom || (userInfo && userInfo.ministere_nom) || headerContext.ministryName || '';
                const agentDirectionName = agent.direction_nom || agent.service_nom || (userInfo && (userInfo.direction_nom || userInfo.service_nom)) || headerContext.directionName || '';
                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) || headerContext.ministryName || agentMinistryName;
                const validatorDirectionName = (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) || headerContext.directionName || agentDirectionName;

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

                // === CORPS DU DOCUMENT ===
                let yPosition = headerBottom + 120;

                // Formatage des noms
                const agentNamePartsPresence = formatAgentName(agent);
                const validateurNamePartsPresence = formatAgentName(validateur);
                const validateurNomComplet = validateurNamePartsPresence.fullWithCivilite || 'Le Directeur';
                const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines');
                const validateurGenre = validateur && validateur.sexe === 'F' ? 'e' : '';

                const civilite = agentNamePartsPresence.civilite;
                const fonctionActuelle = getAgentPosteOuEmploi(agent);
                const agentServiceNom = agent.service_nom || agent.direction_nom || agentDirectionName || 'Service non renseigné';
                const fonctionAvecService = agentServiceNom ? `${fonctionActuelle} à ${agentServiceNom}` : fonctionActuelle;

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

                yPosition = doc.y + 30;

                // Phrase de clôture
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text('En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.', 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                // === SIGNATURE ===
                yPosition += 60; // Espacement ajusté pour centrer le contenu

                // Signature du directeur - Utiliser la fonction du validateur
                // S'assurer que la signature active est récupérée juste avant l'affichage
                await attachActiveSignature(validateur);
                yPosition = drawStandardSignature(
                    doc,
                    yPosition + 40,
                    await resolveSignatureInfo(validateur)
                );

                // === FOOTER ===
                const pageHeight = doc.page.height;

                // Ligne de séparation du footer
                doc.moveTo(50, pageHeight - 70)
                    .lineTo(545, pageHeight - 70)
                    .lineWidth(1)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(FOOTER_SMALL_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor('#666666')
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, pageHeight - 60, {
                            align: 'center',
                            width: 495
                        });

                doc.fontSize(FOOTER_SMALL_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                        50, pageHeight - 50, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF d\'attestation de présence en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de certificat de cessation en mémoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Optionnel: { documentId, typeDocument } pour numéro séquentiel par type et ministère
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateCertificatCessationPDFBuffer(demande, agent, validateur, userInfo = null, options = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF de certificat de cessation en mémoire pour la demande ${demande.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configuration des polices et couleurs
                const primaryColor = '#000000';
                const borderColor = '#000000';

                // === DONNÉES DYNAMIQUES ===
                if (userInfo) {
                    agent.ministere_sigle = agent.ministere_sigle || userInfo.ministere_sigle;
                    if (validateur) {
                        validateur.ministere_sigle = validateur.ministere_sigle || userInfo.ministere_sigle;
                    }
                }

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const civilite = agent.sexe === 'F' ? 'Mlle' : 'M.';
                const agentNameParts = formatAgentName(agent);
                const validateurNameParts = formatAgentName(validateur);
                const fonctionActuelle = getAgentPosteOuEmploi(agent);
                const designationPoste = getAgentPosteOuEmploi(agent);
                const serviceNom = agent.service_nom || 'Service non renseigné';

                // Log pour déboguer
                console.log('🔍 Données de demande reçues dans generateCertificatCessationPDFBuffer:', {
                    agree_date_cessation: demande.agree_date_cessation,
                    date_cessation: demande.date_cessation,
                    agree_motif: demande.agree_motif,
                    motif_conge: demande.motif_conge,
                    motif: demande.motif,
                    date_debut: demande.date_debut
                });

                // Vérifier et formater la date de cessation
                let dateCessation = 'Date non spécifiée';
                let dateCessationValue = demande.agree_date_cessation || demande.date_cessation;
                if (dateCessationValue) {
                    try {
                        const dateObj = new Date(dateCessationValue);
                        if (!isNaN(dateObj.getTime())) {
                            dateCessation = dateObj.toLocaleDateString('fr-FR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        } else {
                            console.error('❌ Date invalide:', dateCessationValue);
                        }
                    } catch (error) {
                        console.error('❌ Erreur lors du formatage de la date:', error);
                    }
                }

                // Enrichir le motif selon le type de congé
                // Utiliser motif_conge (choisi par l'agent dans la liste déroulante) en priorité
                let motifCessation = demande.motif_conge || demande.agree_motif || demande.motif || 'Motif non spécifié';

                if (motifCessation && motifCessation !== 'Motif non spécifié') {
                    const motifLower = motifCessation.toLowerCase();
                    let texteSupplementaire = '';

                    // Récupérer le numéro de décision et l'année
                    let numeroDecisionCessation = null;
                    let dateDecision = null;
                    let anneeConge = null;

                    if (demande.id && dateCessationValue) {
                        const dateCessationObj = new Date(dateCessationValue);
                        if (!isNaN(dateCessationObj.getTime())) {
                            anneeConge = dateCessationObj.getFullYear();
                        }
                        const anneeFiltre = demande.annee_au_titre_conge ? parseInt(demande.annee_au_titre_conge, 10) : anneeConge || new Date().getFullYear();
                        let agentRoleNom = '';
                        try {
                            const roleResult = await db.query(`SELECT r.nom FROM utilisateurs u JOIN roles r ON u.id_role = r.id WHERE u.id_agent = $1 LIMIT 1`, [agent.id]);
                            if (roleResult.rows.length > 0 && roleResult.rows[0].nom) agentRoleNom = roleResult.rows[0].nom;
                        } catch (roleError) {
                            console.error('⚠️ Erreur lors de la récupération du rôle de l\'agent:', roleError);
                        }
                        const hasSpecificPoste = isAgentWithSpecificPoste(agentRoleNom);
                        try {
                            let decisionResult;
                            if (hasSpecificPoste && agent.id) {
                                decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [agent.id, anneeFiltre]);
                                if ((!decisionResult || decisionResult.rows.length === 0) && agent.id_direction) {
                                    const idDirFallback = parseInt(agent.id_direction, 10);
                                    if (!isNaN(idDirFallback)) {
                                        decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirFallback, anneeFiltre]);
                                    }
                                }
                            } else {
                                const idDir = agent.id_direction != null ? parseInt(agent.id_direction, 10) : null;
                                const idSous = agent.id_sous_direction != null ? parseInt(agent.id_sous_direction, 10) : null;
                                if (idSous != null && !isNaN(idSous)) {
                                    decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idSous, anneeFiltre]);
                                    if ((!decisionResult || decisionResult.rows.length === 0) && idDir != null && !isNaN(idDir)) {
                                        decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltre]);
                                    }
                                }
                                if ((!decisionResult || decisionResult.rows.length === 0) && idDir != null && !isNaN(idDir)) {
                                    decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltre]);
                                }
                                if (!decisionResult || decisionResult.rows.length === 0) {
                                    decisionResult = await db.query(`SELECT numero_acte, date_decision FROM decisions WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [anneeFiltre]);
                                }
                            }
                            if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                                numeroDecisionCessation = decisionResult.rows[0].numero_acte;
                                dateDecision = decisionResult.rows[0].date_decision;
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
                    else if (isCongeAnnuelMotif(motifCessation)) {
                        if (numeroDecisionCessation && anneeConge && dateDecisionFormatee && demande.date_debut && demande.date_fin) {
                            const dateDebut = new Date(demande.date_debut);
                            const dateFin = new Date(demande.date_fin);
                            const differenceMs = dateFin.getTime() - dateDebut.getTime();
                            const nombreJours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1;

                            texteSupplementaire = `Bénéficiaire d'un congé annuel de ${nombreJours} jours consécutifs au titre de l'année ${anneeConge} conformement à la cessation de congé ${numeroDecisionCessation} du ${dateDecisionFormatee}.`;
                        }
                    }

                    if (texteSupplementaire) {
                        // Utiliser uniquement le texte supplémentaire pour éviter la répétition (ex: "congé de maternité" + "Bénéficiaire d'un congé de maternité...")
                        motifCessation = texteSupplementaire.trim();
                    }
                }

                console.log('✅ Date formatée:', dateCessation);
                console.log('✅ Motif:', motifCessation);

                // Formatage du nom du validateur
                const validateurNomComplet = validateurNameParts.fullWithCivilite || 'Le Directeur';
                const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines');
                const validateurGenre = validateur && validateur.sexe === 'F' ? 'e' : '';

                // Date de reprise
                let dateReprise = null;

                // Vérifier si c'est un congé de maternité, paternité ou un congé annuel
                const motifForReprise = demande.motif_conge || demande.agree_motif || demande.motif || '';
                const motifLowerForReprise = motifForReprise.toLowerCase();
                const isCongeMaternite = motifLowerForReprise.includes('maternité') || motifLowerForReprise.includes('maternite');
                const isCongePaternite = motifLowerForReprise.includes('paternité') || motifLowerForReprise.includes('paternite');
                const isCongeAnnuel = isCongeAnnuelMotif(motifForReprise);

                if (isCongeMaternite && dateCessationValue) {
                    // Pour un congé de maternité : date de reprise = date de cessation + 6 mois (180 jours)
                    dateReprise = new Date(dateCessationValue);
                    dateReprise.setMonth(dateReprise.getMonth() + 6); // Ajouter 6 mois
                } else if (isCongePaternite && dateCessationValue) {
                    // Pour un congé de paternité : date de reprise = date de cessation + 1 mois (30 jours)
                    dateReprise = new Date(dateCessationValue);
                    dateReprise.setMonth(dateReprise.getMonth() + 1); // Ajouter 1 mois
                } else if (demande.date_fin) {
                    // Pour un congé annuel ou autre : date de reprise = date de fin + 1 jour
                    dateReprise = new Date(demande.date_fin);
                    dateReprise.setDate(dateReprise.getDate() + 1);
                } else if (demande.date_debut && demande.agree_date_cessation) {
                    const dateDebut = new Date(demande.date_debut);
                    dateReprise = new Date(dateDebut);
                    dateReprise.setDate(dateReprise.getDate() + 1);
                } else if (demande.agree_date_cessation) {
                    dateReprise = new Date(demande.agree_date_cessation);
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
                const interesseGenre = agent.sexe === 'F' ? 'e' : '';
                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const numeroDocument = (options && options.documentId != null && options && options.typeDocument) ?
                    await getDocumentReference({
                        demande,
                        document: { id: options.documentId, type_document: options.typeDocument },
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    }) :
                    formatDocumentReference({
                        demande,
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    });
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });

                // Utiliser l'en-tête officiel
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });
                const agentMinistryName = agent.ministere_nom || (userInfo && userInfo.ministere_nom) || headerContext.ministryName || '';
                const agentDirectionName = agent.direction_nom || agent.service_nom || (userInfo && (userInfo.direction_nom || userInfo.service_nom)) || headerContext.directionName || '';
                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) || headerContext.ministryName || agentMinistryName;
                const validatorDirectionName = (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) || headerContext.directionName || agentDirectionName;

                // Récupérer la décision active (collective ou individuelle selon le rôle de l'agent)
                // Uniquement si le document est lié à une demande
                let numeroActeDecision = null;
                if (demande.id) {
                    try {
                        // Récupérer le rôle de l'agent depuis la base de données
                        let agentRoleNom = '';
                        try {
                            const roleQuery = `
                                SELECT r.nom
                                FROM utilisateurs u
                                JOIN roles r ON u.id_role = r.id
                                WHERE u.id_agent = $1
                                LIMIT 1
                            `;
                            const roleResult = await db.query(roleQuery, [agent.id]);
                            if (roleResult.rows.length > 0 && roleResult.rows[0].nom) {
                                agentRoleNom = roleResult.rows[0].nom;
                            }
                        } catch (roleError) {
                            console.error('⚠️ Erreur lors de la récupération du rôle de l\'agent:', roleError);
                        }

                        const hasSpecificPoste = isAgentWithSpecificPoste(agentRoleNom);
                        const anneeFiltreHeader = demande.annee_au_titre_conge ? parseInt(demande.annee_au_titre_conge, 10) : (dateCessationValue ? new Date(dateCessationValue).getFullYear() : new Date().getFullYear());
                        let decisionResult;
                        if (hasSpecificPoste && agent.id) {
                            decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [agent.id, anneeFiltreHeader]);
                            if ((!decisionResult || decisionResult.rows.length === 0) && agent.id_direction) {
                                const idDirFb = parseInt(agent.id_direction, 10);
                                if (!isNaN(idDirFb)) {
                                    decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirFb, anneeFiltreHeader]);
                                }
                            }
                        } else {
                            const idDir = agent.id_direction != null ? parseInt(agent.id_direction, 10) : null;
                            const idSous = agent.id_sous_direction != null ? parseInt(agent.id_sous_direction, 10) : null;
                            if (idSous != null && !isNaN(idSous)) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idSous, anneeFiltreHeader]);
                                if ((!decisionResult || decisionResult.rows.length === 0) && idDir != null && !isNaN(idDir)) {
                                    decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltreHeader]);
                                }
                            }
                            if ((!decisionResult || decisionResult.rows.length === 0) && idDir != null && !isNaN(idDir)) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltreHeader]);
                            }
                            if (!decisionResult || decisionResult.rows.length === 0) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [anneeFiltreHeader]);
                            }
                        }
                        if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                            numeroActeDecision = decisionResult.rows[0].numero_acte;
                        }
                    } catch (decisionError) {
                        console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
                    }
                }

                // Numéro de décision dans l'en-tête uniquement pour le congé annuel
                const motifCessationHeader = demande.motif_conge || demande.agree_motif || demande.motif || '';
                const isCongeAnnuelCessation = isCongeAnnuelMotif(motifCessationHeader);
                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber: numeroDocument,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName,
                    validatorMinistryName,
                    validatorDirectionName,
                    numeroActeDecision: isCongeAnnuelCessation ? numeroActeDecision : null
                });

                // Titre principal
                const titleYCessation = headerBottom + 60;
                doc.rect(80, titleYCessation - 12, 430, 34)
                    .lineWidth(2)
                    .strokeColor('#000000')
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('CERTIFICAT DE CESSATION DE SERVICE', 80, titleYCessation - 2, {
                        align: 'center',
                        width: 430
                    });

                // Contenu du document avec données réelles
                let yPosition = titleYCessation + 50;

                // Texte principal avec le nouveau format
                const textePrincipal = `Je soussigné${validateurGenre}, ${validateurNomComplet}, ${validateurFonction}, certifie que ${civilite} ${agentNameParts.prenoms} ${agentNameParts.nom}, matricule ${agent.matricule}, ${designationPoste}, a cessé le service à la ${serviceNom} le ${dateCessation}.`;

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
                if (dateRepriseFormatee && demande.id) {
                    yPosition = doc.y + 15;
                    doc.fontSize(BODY_FONT_SIZE)
                        .font(BASE_FONT)
                        .text(`A l'issue de son congé, l'intéressé${interesseGenre} reprendra le service à son poste le ${dateRepriseFormatee}.`, 50, yPosition, { width: 500 });
                }

                // Signature positionnée entre le centre et la droite
                // S'assurer que la signature active est récupérée juste avant l'affichage
                await attachActiveSignature(validateur);
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
                const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
                const usableWidth = pageWidth - leftMargin - rightMargin;
                // Positionner la signature à 60% de la largeur utilisable (entre centre et droite)
                const signatureStartX = leftMargin + (usableWidth * 0.45);
                const signatureWidth = usableWidth * 0.55;
                const footerY = pageHeight - 80;
                const signatureBlockHeight = 155;
                const minGapAboveFooter = 70;
                const maxSignatureY = footerY - signatureBlockHeight - minGapAboveFooter;
                const signatureY = Math.min(Math.max(doc.y + 40, 520), maxSignatureY);
                const signatureInfo = await resolveSignatureInfo(validateur);

                if (signatureInfo.role || signatureInfo.name) {
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
                            const imageX = signatureStartX + (signatureWidth / 2) - 50;
                            doc.image(signatureInfo.imagePath, imageX, sigY, {
                                fit: [100, 60],
                                align: 'center'
                            });
                            sigY += 70;
                        } catch (error) {
                            console.error('❌ Erreur lors de l\'insertion de la signature:', error);
                        }
                    }

                    if (signatureInfo.name) {
                        const fullName = String(signatureInfo.name || '').trim();
                        // Ajuster dynamiquement la taille pour garder le nom sur UNE seule ligne.
                        let nameFontSize = BODY_FONT_SIZE - 1;
                        doc.font(BOLD_FONT).fontSize(nameFontSize);
                        let nameWidth = doc.widthOfString(fullName);
                        const maxNameWidth = signatureWidth;
                        while (nameWidth > maxNameWidth && nameFontSize > 8) {
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

                // Footer fixe en bas de page
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
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
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${numeroDocument}`,
                        50, footerY + 18, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de certificat de cessation en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF d'autorisation de sortie du territoire en mémoire (sans sauvegarde)
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Optionnel: { documentId, typeDocument } pour numéro séquentiel par type et ministère
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateAutorisationSortieTerritoirePDFBuffer(demande, agent, validateur, userInfo = null, options = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'autorisation de sortie du territoire en mémoire pour la demande ${demande.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Buffer pour stocker le PDF
                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(buffers);
                    console.log(`✅ PDF d'autorisation de sortie du territoire généré avec succès (${pdfBuffer.length} bytes)`);
                    resolve(pdfBuffer);
                });

                // Configuration des polices
                doc.fontSize(12);

                // === EN-TÊTE DU DOCUMENT ===
                if (userInfo) {
                    agent.ministere_sigle = agent.ministere_sigle || userInfo.ministere_sigle;
                    if (validateur) {
                        validateur.ministere_sigle = validateur.ministere_sigle || userInfo.ministere_sigle;
                    }
                }

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const ministereNom = (userInfo && userInfo.ministere_nom) || agent.ministere_nom || 'MINISTERE DU TOURISME';
                const serviceNom = (userInfo && userInfo.service_nom) || agent.service_nom || 'LE DIRECTEUR DES RESSOURCES HUMAINES';

                // Ministère (haut gauche)
                doc.fontSize(12)
                    .font('Helvetica-Bold')
                    .text(ministereNom.toUpperCase(), 50, 35, {
                        align: 'left'
                    });

                // Service (sous le ministère)
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .text(serviceNom.toUpperCase(), 50, 55, {
                        align: 'left'
                    });

                // Ligne de séparation sous le service
                doc.lineWidth(1)
                    .dash(3, { space: 2 })
                    .moveTo(100, 75)
                    .lineTo(250, 75)
                    .stroke();
                doc.undash();

                // Numéro du document
                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const documentNumber = (options && options.documentId != null && options && options.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: options.documentId, type_document: options.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({ demande, agent, validateur, userInfo, sigle: resolvedSigle });
                doc.fontSize(9)
                    .font('Helvetica')
                    .text(`N° ${documentNumber}`, 70, 85, {
                        align: 'left'
                    });

                // République (haut droit)
                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .text('REPUBLIQUE DE COTE', 350, 35, {
                        align: 'center',
                        width: 200
                    });

                doc.fontSize(10)
                    .font('Helvetica-Bold')
                    .text('D\'IVOIRE', 350, 52, {
                        align: 'center',
                        width: 200
                    });

                // Devise nationale
                doc.fontSize(9)
                    .font('Helvetica')
                    .text('Union-Discipline-Travail', 350, 70, {
                        align: 'center',
                        width: 200
                    });

                // Date et lieu
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });
                const dateGeneration = generatedAt.toLocaleDateString('fr-FR');
                doc.fontSize(9)
                    .font('Helvetica')
                    .text(`ABIDJAN, le ${dateGeneration}`, 350, 85, {
                        align: 'left'
                    });

                // === TITRE PRINCIPAL ===
                // Titre avec bordure - UNE SEULE LIGNE (largeur augmentée pour tenir sur une ligne)
                const titleWidth = 450;
                const titleX = (doc.page.width - titleWidth) / 2; // Centrer le titre
                doc.rect(titleX, 170, titleWidth, 34)
                    .lineWidth(2)
                    .strokeColor('#000000')
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('AUTORISATION DE SORTIE DU TERRITOIRE', titleX, 178, {
                        align: 'center',
                        width: titleWidth
                    });

                // === CORPS DU DOCUMENT ===
                let yPosition = 240;

                // Calculer les dates
                const dateDebut = new Date(demande.date_debut);
                const dateFin = new Date(demande.date_fin);
                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR');
                const dateFinStr = dateFin.toLocaleDateString('fr-FR');

                // Texte principal selon l'image
                const agentNamePartsSortieMemory = formatAgentName(agent);

                // "Le Directeur" en premier
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text('Le Directeur', 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 15;

                // Texte principal justifié comme dans l'image
                const textePrincipal = `autorise ${agentNamePartsSortieMemory.fullWithCivilite}, matricule ${agent.matricule}, ${agent.poste || 'AGENT'}, en service à la ${agent.service_nom || 'DIRECTION'}, à se rendre ${demande.lieu || 'en France'} du ${dateDebutStr} au ${dateFinStr}, ${demande.description || 'pour ses vacances'}.`;

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
                // Positionner la signature avec un espacement optimal pour occuper l'espace vertical
                yPosition = doc.y + 50; // Espacement augmenté pour mieux occuper l'espace et descendre la signature

                // S'assurer que la signature active est récupérée juste avant l'affichage
                await attachActiveSignature(validateur);
                const signatureInfo = await resolveSignatureInfo(validateur);

                // Utiliser drawStandardSignatureRight pour aligner à droite (80% de la largeur)
                const pageWidth = doc.page.width;
                const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
                const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
                const usableWidth = pageWidth - leftMargin - rightMargin;
                // Positionner à 80% de la largeur utilisable (donc 20% de marge à gauche)
                const signatureStartX = leftMargin + (usableWidth * 0.2);
                const signatureWidth = usableWidth * 0.8;

                if (signatureInfo.role || signatureInfo.name || signatureInfo.imagePath) {
                    let sigY = yPosition;
                    if (signatureInfo.role) {
                        doc.font(BOLD_FONT)
                            .fontSize(SUBTITLE_FONT_SIZE)
                            .text(signatureInfo.role, signatureStartX, sigY, {
                                align: 'right',
                                width: signatureWidth
                            });
                        sigY = doc.y + 12; // Espacement augmenté entre le rôle et l'image
                    }

                    if (signatureInfo.imagePath && fs.existsSync(signatureInfo.imagePath)) {
                        try {
                            const imageX = pageWidth - rightMargin - 100; // Aligner l'image à droite
                            doc.image(signatureInfo.imagePath, imageX, sigY, {
                                fit: [100, 60],
                                align: 'right'
                            });
                            sigY += 70;
                        } catch (error) {
                            console.error('❌ Erreur lors de l\'insertion de la signature:', error);
                        }
                    }

                    if (signatureInfo.name) {
                        const oneLineName = String(signatureInfo.name || '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        let nameFontSize = BODY_FONT_SIZE;
                        const minNameFontSize = BODY_FONT_SIZE - 1;
                        doc.font(BOLD_FONT).fontSize(nameFontSize);
                        let textWidth = doc.widthOfString(oneLineName);
                        while (textWidth > signatureWidth && nameFontSize > minNameFontSize) {
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
                    .strokeColor('#000000')
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
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                        50, footerY + 15, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF d\'autorisation de sortie du territoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF d'attestation de travail en mémoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Optionnel: { documentId, typeDocument } pour numéro séquentiel par type et ministère
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateAttestationTravailPDFBuffer(demande, agent, validateur, userInfo = null, options = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF d'attestation de travail en mémoire pour la demande ${demande.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 30,
                        bottom: 30,
                        left: 40,
                        right: 40
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                const primaryColor = '#000000';
                const borderColor = '#000000';

                if (userInfo) {
                    agent.service_nom = userInfo.service_nom || agent.service_nom;
                    agent.direction_nom = userInfo.direction_nom || agent.direction_nom || userInfo.service_nom || agent.service_nom;
                    agent.ministere_nom = userInfo.ministere_nom || agent.ministere_nom;
                    if (validateur) {
                        validateur.ministere_nom = userInfo.ministere_nom || validateur.ministere_nom;
                        validateur.direction_nom = userInfo.direction_nom || userInfo.service_nom || validateur.direction_nom;
                        validateur.service_nom = userInfo.service_nom || validateur.service_nom;
                        validateur.structure_nom = userInfo.structure_nom || validateur.structure_nom;
                    }
                }

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const documentNumber = (options && options.documentId != null && options && options.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: options.documentId, type_document: options.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({ demande, agent, validateur, userInfo, sigle: resolvedSigle });
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });
                const dateGeneration = generatedAt.toLocaleDateString('fr-FR');
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });

                const agentMinistryName = agent.ministere_nom ||
                    (userInfo && userInfo.ministere_nom) ||
                    headerContext.ministryName ||
                    (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    '';

                const resolvedDirectionName = headerContext.directionName ||
                    agent.direction_nom ||
                    agent.service_nom ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    '';

                const headerDirectionName = resolvedDirectionName ||
                    agent.direction_nom ||
                    agent.service_nom ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    'DIRECTION DES RESSOURCES HUMAINES';

                if (!agent.direction_nom && headerDirectionName) {
                    agent.direction_nom = headerDirectionName;
                }
                if (!agent.service_nom && headerDirectionName) {
                    agent.service_nom = headerDirectionName;
                }

                const agentDirectionName = headerDirectionName;

                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    headerContext.ministryName ||
                    agentMinistryName;
                const validatorDirectionName = headerContext.directionName ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    headerDirectionName;

                if (!agent.ministere_nom && agentMinistryName) {
                    agent.ministere_nom = agentMinistryName;
                }
                if (!agent.direction_nom && agentDirectionName) {
                    agent.direction_nom = agentDirectionName;
                }

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

                const titleYTravail = headerBottom + 45;
                doc.rect(140, titleYTravail - 12, 320, 34)
                    .lineWidth(2)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .fillColor(primaryColor)
                    .text('ATTESTATION DE TRAVAIL', 140, titleYTravail - 2, {
                        align: 'center',
                        width: 320
                    });

                let yPosition = headerBottom + 120;

                const agentNamePartsTravailMemory = formatAgentName(agent);

                // Texte principal de l'attestation de travail
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor)
                    .text('Le Directeur soussigné(e), atteste que ', 50, yPosition, {
                        continued: true
                    });
                doc.font(BOLD_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`${agentNamePartsTravailMemory.fullWithCivilite},`);

                yPosition = doc.y;
                yPosition += 20;

                // Matricule et fonction
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`matricule ${agent.matricule}, ${getAgentPosteOuEmploi(agent).toUpperCase()}, grade,`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 20;

                // Service
                const servicePresenceDisplay = resolvedDirectionName;

                if (servicePresenceDisplay) {
                    doc.fontSize(BODY_FONT_SIZE)
                        .font(BASE_FONT)
                        .text(`à la ${servicePresenceDisplay}`, 50, yPosition, {
                            align: 'left'
                        });

                    yPosition += 20;
                }

                // Période d'emploi - depuis la date de début jusqu'à aujourd'hui
                const dateDebut = new Date(demande.date_debut);
                const dateDebutStr = dateDebut.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`travaille dans ledit Ministère depuis le ${dateDebutStr} jusqu'à ce jour.`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 30;

                // Phrase de clôture
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text('En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.', 50, yPosition, {
                        align: 'left'
                    });

                // === SIGNATURE ===
                yPosition += 70;
                await attachActiveSignature(validateur);
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 80;
                const signatureBlockHeight = 155;
                const minGapAboveFooter = 20;
                const maxSignatureY = footerY - signatureBlockHeight - minGapAboveFooter;
                const signatureY = Math.min(Math.max(yPosition + 35, 560), maxSignatureY);
                yPosition = drawStandardSignatureRight(
                    doc,
                    signatureY,
                    await resolveSignatureInfo(validateur),
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

                // === FOOTER ===

                // Ligne de séparation du footer
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
                    .stroke();

                doc.fontSize(FOOTER_SMALL_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor('#666666')
                    .text('Document généré automatiquement par le système de gestion des ressources humaines',
                        50, footerY + 10, {
                            align: 'center',
                            width: 495
                        });

                doc.fontSize(FOOTER_SMALL_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${documentNumber}`,
                        50, footerY + 20, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF d\'attestation de travail en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de certificat de reprise de service en mémoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Optionnel: { documentId, typeDocument } pour numéro séquentiel par type et ministère
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateCertificatRepriseServicePDFBuffer(demande, agent, validateur, userInfo = null, options = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF de certificat de reprise de service en mémoire pour la demande ${demande.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configuration des polices et couleurs
                const primaryColor = '#000000';
                const borderColor = '#000000';

                // === DONNÉES DYNAMIQUES ===
                if (userInfo) {
                    agent.ministere_sigle = agent.ministere_sigle || userInfo.ministere_sigle;
                    if (validateur) {
                        validateur.ministere_sigle = validateur.ministere_sigle || userInfo.ministere_sigle;
                    }
                }

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);

                const civilite = agent.sexe === 'F' ? 'Mlle' : 'M.';
                const agentNameParts = formatAgentName(agent);
                const validateurNameParts = formatAgentName(validateur);
                const fonctionActuelle = getAgentPosteOuEmploi(agent);
                const serviceNom = agent.service_nom || agent.direction_nom || 'Service non renseigné';

                const dateRepriseValue = demande.date_reprise_service || demande.date_fin_conges || demande.date_fin || demande.date_debut;
                const dReprise = dateRepriseValue ? new Date(dateRepriseValue) : null;
                let dateReprise = (dReprise && !isNaN(dReprise.getTime())) ? dReprise.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date non spécifiée';

                // Récupérer les informations de classe et échelon de l'agent
                let classeInfo = '';
                try {
                    const db = require('../config/database');
                    // Récupérer le grade le plus récent
                    const gradeQuery = `
                        SELECT g.libele as grade_libelle, ga.date_entree
                        FROM grades_agents ga
                        LEFT JOIN grades g ON ga.id_grade = g.id
                        WHERE ga.id_agent = $1
                        ORDER BY COALESCE(ga.date_entree, ga.created_at) DESC, ga.id DESC
                        LIMIT 1
                    `;
                    const gradeResult = await db.query(gradeQuery, [agent.id]);

                    // Récupérer l'échelon le plus récent
                    const echelonQuery = `
                        SELECT e.libele as echelon_libelle, ea.date_entree
                        FROM echelons_agents ea
                        LEFT JOIN echelons e ON ea.id_echelon = e.id
                        WHERE ea.id_agent = $1
                        ORDER BY COALESCE(ea.date_entree, ea.created_at) DESC, ea.id DESC
                        LIMIT 1
                    `;
                    const echelonResult = await db.query(echelonQuery, [agent.id]);

                    let gradeLibelle = '';
                    let echelonLibelle = '';
                    let dateEntree = null;

                    if (gradeResult.rows.length > 0) {
                        gradeLibelle = gradeResult.rows[0].grade_libelle || '';
                        dateEntree = gradeResult.rows[0].date_entree;
                    }

                    if (echelonResult.rows.length > 0) {
                        echelonLibelle = echelonResult.rows[0].echelon_libelle || '';
                        // Utiliser la date d'entrée de l'échelon si celle du grade n'est pas disponible
                        if (!dateEntree) {
                            dateEntree = echelonResult.rows[0].date_entree;
                        }
                    }

                    if (dateEntree) {
                        const dateEntreeStr = new Date(dateEntree).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        if (gradeLibelle && echelonLibelle) {
                            classeInfo = `de ${gradeLibelle} ${echelonLibelle} au ${dateEntreeStr}`;
                        } else if (gradeLibelle) {
                            classeInfo = `de ${gradeLibelle} au ${dateEntreeStr}`;
                        }
                    } else if (gradeLibelle && echelonLibelle) {
                        classeInfo = `de ${gradeLibelle} ${echelonLibelle}`;
                    }
                } catch (error) {
                    console.error('⚠️ Erreur lors de la récupération du grade et de l\'échelon:', error);
                }

                // Motif de reprise : même logique que le template (cessation par rang + référence document)
                const CertificatRepriseServiceTemplate = require('./CertificatRepriseServiceTemplate');
                const { motif: motifFromTemplate } = await CertificatRepriseServiceTemplate.getMotifReprise(demande, agent, validateur);
                let motifReprise = motifFromTemplate || demande.description || demande.motif || demande.motif_conge || 'Motif non spécifié';

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const numeroDocument = (options && options.documentId != null && options && options.typeDocument) ?
                    await getDocumentReference({ demande, document: { id: options.documentId, type_document: options.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle }) :
                    formatDocumentReference({ demande, agent, validateur, userInfo, sigle: resolvedSigle });
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });

                // Utiliser l'en-tête officiel
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });
                const agentMinistryName = agent.ministere_nom || (userInfo && userInfo.ministere_nom) || headerContext.ministryName || '';
                const agentDirectionName = agent.direction_nom || agent.service_nom || (userInfo && (userInfo.direction_nom || userInfo.service_nom)) || headerContext.directionName || '';
                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) || headerContext.ministryName || agentMinistryName;
                const validatorDirectionName = (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) || headerContext.directionName || agentDirectionName;

                // Récupérer la décision pour l'en-tête reprise (année au titre du congé + périmètre)
                let numeroActeDecision = null;
                const dateRepriseForYear = demande.date_reprise_service || demande.date_fin_conges || demande.date_fin;
                const anneeFiltreRepriseHeader = demande.annee_au_titre_conge ? parseInt(demande.annee_au_titre_conge, 10) : (dateRepriseForYear ? new Date(dateRepriseForYear).getFullYear() : new Date().getFullYear());
                if (demande.id) {
                    try {
                        const db = require('../config/database');
                        let agentRoleNom = '';
                        try {
                            const roleResult = await db.query(`SELECT r.nom FROM utilisateurs u JOIN roles r ON u.id_role = r.id WHERE u.id_agent = $1 LIMIT 1`, [agent.id]);
                            if (roleResult.rows.length > 0 && roleResult.rows[0].nom) agentRoleNom = roleResult.rows[0].nom;
                        } catch (roleError) {
                            console.error('⚠️ Erreur lors de la récupération du rôle de l\'agent:', roleError);
                        }
                        const hasSpecificPoste = isAgentWithSpecificPoste(agentRoleNom);
                        let decisionResult;
                        if (hasSpecificPoste && agent.id) {
                            decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [agent.id, anneeFiltreRepriseHeader]);
                            if ((!decisionResult || decisionResult.rows.length === 0) && agent.id_direction) {
                                const idDirRh = parseInt(agent.id_direction, 10);
                                if (!isNaN(idDirRh)) {
                                    decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDirRh, anneeFiltreRepriseHeader]);
                                }
                            }
                        } else {
                            const idDir = agent.id_direction != null ? parseInt(agent.id_direction, 10) : null;
                            const idSous = agent.id_sous_direction != null ? parseInt(agent.id_sous_direction, 10) : null;
                            if (idSous != null && !isNaN(idSous)) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idSous, anneeFiltreRepriseHeader]);
                                if ((!decisionResult || decisionResult.rows.length === 0) && idDir != null && !isNaN(idDir)) {
                                    decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltreRepriseHeader]);
                                }
                            }
                            if ((!decisionResult || decisionResult.rows.length === 0) && idDir != null && !isNaN(idDir)) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [idDir, anneeFiltreRepriseHeader]);
                            }
                            if (!decisionResult || decisionResult.rows.length === 0) {
                                decisionResult = await db.query(`SELECT numero_acte FROM decisions WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1 ORDER BY date_decision DESC, created_at DESC LIMIT 1`, [anneeFiltreRepriseHeader]);
                            }
                        }
                        if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                            numeroActeDecision = decisionResult.rows[0].numero_acte;
                        }
                    } catch (decisionError) {
                        console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
                    }
                }

                // Numéro de décision dans l'en-tête uniquement pour le congé annuel
                const motifLowerReprise = (motifReprise || '').toString().toLowerCase();
                const isCongeAnnuelReprise = motifLowerReprise.includes('congé annuel') || motifLowerReprise.includes('conge annuel') || (motifLowerReprise.includes('congé') && motifLowerReprise.includes('annuel'));
                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber: numeroDocument,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName,
                    validatorMinistryName,
                    validatorDirectionName,
                    numeroActeDecision: isCongeAnnuelReprise ? numeroActeDecision : null
                });

                // Titre principal
                const titleYReprise = headerBottom + 60;
                doc.rect(80, titleYReprise - 12, 430, 34)
                    .lineWidth(2)
                    .strokeColor('#000000')
                    .stroke();

                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('CERTIFICAT DE REPRISE DE SERVICE', 80, titleYReprise - 2, {
                        align: 'center',
                        width: 430
                    });

                // Contenu du document avec données réelles
                let yPosition = titleYReprise + 50;

                // Texte principal selon le format de l'image
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(agentNameParts.fullWithCivilite, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 25;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`Matricule: ${agent.matricule}`, 50, yPosition, {
                        align: 'left'
                    });

                yPosition += 25;
                doc.font(BOLD_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(fonctionActuelle.toUpperCase(), 50, yPosition, {
                        align: 'left'
                    });

                if (classeInfo) {
                    yPosition += 25;
                    doc.font(BASE_FONT)
                        .fontSize(BODY_FONT_SIZE)
                        .text(classeInfo, 50, yPosition, {
                            align: 'left'
                        });
                }

                yPosition += 25;
                doc.font(BASE_FONT)
                    .fontSize(BODY_FONT_SIZE)
                    .text(`a repris le service à la ${serviceNom.toUpperCase()} le ${dateReprise}.`, 50, yPosition, {
                        align: 'left',
                        width: 500
                    });

                yPosition += 40;

                // Motif de reprise - Titre centré et souligné
                doc.fontSize(SUBTITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('MOTIF DE LA REPRISE DE SERVICE', 50, yPosition, {
                        align: 'center',
                        width: 500
                    });

                // Souligner le titre
                const motifTitleWidth = doc.widthOfString('MOTIF DE LA REPRISE DE SERVICE', { font: BOLD_FONT, fontSize: SUBTITLE_FONT_SIZE });
                const motifTitleX = 50 + (500 - motifTitleWidth) / 2;
                const motifUnderlineY = doc.y + 2;
                doc.moveTo(motifTitleX, motifUnderlineY)
                    .lineTo(motifTitleX + motifTitleWidth, motifUnderlineY)
                    .lineWidth(1)
                    .stroke();

                yPosition = doc.y + 15;
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(motifReprise, 50, yPosition, { width: 500 });

                // Signature positionnée entre le centre et la droite
                // S'assurer que la signature active est récupérée juste avant l'affichage
                await attachActiveSignature(validateur);
                const pageWidth = doc.page.width;
                const leftMargin = (doc.page.margins && doc.page.margins.left) || 50;
                const rightMargin = (doc.page.margins && doc.page.margins.right) || 50;
                const usableWidth = pageWidth - leftMargin - rightMargin;
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 80;
                const signatureBlockHeight = 155;
                const minGapAboveFooter = 45;
                const maxSignatureY = footerY - signatureBlockHeight - minGapAboveFooter;
                const signatureY = Math.min(Math.max(doc.y + 45, 560), maxSignatureY);
                const signatureStartX = leftMargin + (usableWidth * 0.6);
                const signatureWidth = usableWidth * 0.4;
                const signatureInfo = await resolveSignatureInfo(validateur);

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
                            const imageWidth = 130;
                            const imageHeight = 82;
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
                        doc.font(BOLD_FONT)
                            .fontSize(BODY_FONT_SIZE - 1)
                            .text(signatureInfo.name, leftMargin, sigY, {
                                align: 'right',
                                width: usableWidth,
                                lineBreak: false
                            });
                    }
                }

                // Footer
                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(1)
                    .strokeColor(borderColor)
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
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${numeroDocument}`,
                        50, footerY + 18, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de certificat de reprise de service en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de certificat de non jouissance de congé en mémoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Optionnel: { documentId, typeDocument } pour numéro séquentiel par type et ministère
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateCertificatNonJouissanceCongePDFBuffer(demande, agent, validateur, userInfo = null, options = null) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF de certificat de non jouissance de congé en mémoire pour la demande ${demande.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configuration des polices et couleurs
                const primaryColor = '#000000';
                const borderColor = '#000000';

                // === DONNÉES DYNAMIQUES ===
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

                const resolvedSigle = ensureMinistereSigle({ demande, agent, validateur, userInfo });
                const generatedAt = resolveGenerationDate(demande, { generatedAt: demande && demande.date_generation });

                let documentNumber;
                if (options && options.documentId != null && options && options.typeDocument) {
                    documentNumber = await getDocumentReference({ demande, document: { id: options.documentId, type_document: options.typeDocument }, agent, validateur, userInfo, sigle: resolvedSigle || null });
                } else {
                    const excludeId = (demande && demande.document_id) || null;
                    const idMinistere = (agent && agent.id_ministere) || null;
                    const sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('certificat_non_jouissance_conge', excludeId, idMinistere);
                    const sigle = resolvedSigle || '';
                    const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });
                    const agentMinistryName = agent.ministere_nom || (userInfo && userInfo.ministere_nom) || headerContext.ministryName || (validateur && (validateur.ministere_nom || validateur.ministere)) || '';
                    const ministereNom = headerContext.ministryName || agentMinistryName || (userInfo && userInfo.ministere_nom) || '';
                    const isMinTourismeEtLoisirs = ministereNom && ministereNom.toUpperCase().includes('TOURISME') && ministereNom.toUpperCase().includes('LOISIRS');
                    if (sigle) {
                        documentNumber = isMinTourismeEtLoisirs ? `${sequentialNumber}/${sigle}/DRH/SDGP` : `${sequentialNumber}/${sigle}`;
                    } else {
                        documentNumber = sequentialNumber;
                    }
                }

                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });
                const agentMinistryName = agent.ministere_nom ||
                    (userInfo && userInfo.ministere_nom) ||
                    headerContext.ministryName ||
                    (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    '';

                const agentDirectionName = agent.direction_nom ||
                    agent.service_nom ||
                    (userInfo && (userInfo.direction_nom || userInfo.service_nom || userInfo.structure_nom)) ||
                    headerContext.directionName ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    '';
                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) ||
                    headerContext.ministryName ||
                    agentMinistryName;
                const validatorDirectionName = headerContext.directionName ||
                    (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                    agentDirectionName;

                const agentNameParts = formatAgentName(agent);
                const validateurNameParts = formatAgentName(validateur);

                // Récupérer l'emploi le plus récent depuis la table emploi_agents
                let emploiRecent = '';
                if (agent.id) {
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
                }

                // Si pas d'emploi récent trouvé, utiliser les valeurs par défaut
                if (!emploiRecent) {
                    emploiRecent = getAgentPosteOuEmploi(agent);
                }

                // Récupérer l'année pour laquelle l'agent n'a pas joui de ses congés
                let anneeTexte = 'l\'année concernée';
                if (demande.annee_non_jouissance_conge) {
                    anneeTexte = `l'année ${demande.annee_non_jouissance_conge}`;
                } else if (demande.description) {
                    // Essayer d'extraire l'année depuis la description si elle contient "année XXXX"
                    const anneeMatch = demande.description.match(/année\s+(\d{4})/i);
                    if (anneeMatch) {
                        anneeTexte = `l'année ${anneeMatch[1]}`;
                    }
                }

                // Utiliser le header officiel commun
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

                // === TITRE ===
                const titleY = headerBottom + 35;
                // Augmenter la largeur du rectangle pour que le titre tienne sur une seule ligne
                const titleWidth = 450;
                const titleX = (doc.page.width - titleWidth) / 2; // Centrer le rectangle
                doc.rect(titleX, titleY - 12, titleWidth, 34)
                    .lineWidth(2)
                    .strokeColor(borderColor)
                    .stroke();

                // Réduire légèrement la taille de la police pour que le titre tienne sur une ligne
                doc.fontSize(16)
                    .font(BOLD_FONT)
                    .fillColor(primaryColor)
                    .text('CERTIFICAT DE NON JOUISSANCE DE CONGÉ', titleX, titleY - 2, {
                        align: 'center',
                        width: titleWidth
                    });

                // === CONTENU ===
                let yPosition = headerBottom + 120;

                const validateurNomComplet = validateurNameParts.fullWithCivilite || 'Le Directeur';
                const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines');
                const validateurGenre = validateur && validateur.sexe === 'F' ? 'e' : '';
                const civilite = agentNameParts.civilite;

                // Texte principal selon le modèle de l'image
                const textePrincipal = `Je soussigné${validateurGenre}, ${validateurNomComplet}, ${validateurFonction}, certifie que ${civilite} ${agentNameParts.prenoms} ${agentNameParts.nom}, Matricule ${agent.matricule || 'Non spécifié'}, ${emploiRecent}, n'a pas jouie de ses congés annuels au titre de ${anneeTexte}.`;

                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor)
                    .text(textePrincipal, 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                yPosition = doc.y + 30;

                // Phrase de clôture
                const interesseGenre = agent.sexe === 'F' ? 'e' : '';
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text(`En foi de quoi, le présent Certificat lui est délivré pour servir et valoir ce que de droit.`, 50, yPosition, {
                        align: 'justify',
                        width: 500
                    });

                // === SIGNATURE ===
                yPosition = doc.y + 60;

                // S'assurer que la signature active est récupérée juste avant l'affichage
                await attachActiveSignature(validateur);
                yPosition = drawStandardSignatureRight(
                    doc,
                    yPosition,
                    await resolveSignatureInfo(validateur, 'Le Directeur'), {
                        imageWidth: 120,
                        imageHeight: 60,
                        signatureWidth: 200,
                        spacing: 15,
                        roleFontSize: SUBTITLE_FONT_SIZE,
                        nameFontSize: BODY_FONT_SIZE
                    }
                );

                // === FOOTER ===
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 80;

                doc.moveTo(50, footerY)
                    .lineTo(545, footerY)
                    .lineWidth(0.5)
                    .strokeColor(borderColor)
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

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de certificat de non jouissance de congé en mémoire:', error);
                reject(error);
            }
        });
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
     * Génère un PDF de note de service en mémoire
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires (date_effet, numero_document, etc.)
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateNoteDeServicePDFBuffer(agent, validateur, options = {}) {
            return new Promise(async(resolve, reject) => {
                        try {
                            console.log(`📄 Génération du PDF de note de service en mémoire pour l'agent ${agent.id}...`);

                            // Créer le document PDF en mémoire
                            const doc = new PDFDocument({
                                size: 'A4',
                                margins: {
                                    top: 50,
                                    bottom: 50,
                                    left: 50,
                                    right: 50
                                }
                            });

                            // Collecter les données PDF dans un buffer
                            const chunks = [];
                            doc.on('data', chunk => chunks.push(chunk));
                            doc.on('end', () => resolve(Buffer.concat(chunks)));

                            const primaryColor = '#000000';
                            const borderColor = '#000000';

                            // Vérifier que le validateur a un ID
                            console.log('🔍 [generateNoteDeServicePDFBuffer] Validateur avant attachActiveSignature:', {
                                hasValidateur: !!validateur,
                                validateurId: validateur && validateur.id,
                                validateurNom: validateur && validateur.nom,
                                validateurPrenom: validateur && validateur.prenom,
                                validateurKeys: validateur ? Object.keys(validateur) : []
                            });

                            // S'assurer que le validateur a un ID
                            if (!validateur || !validateur.id) {
                                console.error('❌ [generateNoteDeServicePDFBuffer] Le validateur n\'a pas d\'ID:', validateur);
                                throw new Error('Le validateur doit avoir un ID pour récupérer la signature');
                            }

                            // Attacher la signature active au validateur
                            await hydrateAgentWithLatestFunction(validateur);
                            await attachActiveSignature(validateur);

                            console.log('🔍 [generateNoteDeServicePDFBuffer] Validateur après attachActiveSignature:', {
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

                            // Si pas d'emploi récent trouvé, utiliser les valeurs par défaut
                            if (!emploiRecent) {
                                emploiRecent = getAgentPosteOuEmploi(agent);
                            }

                            // Récupérer le grade depuis les tables d'historique
                            let grade = '';

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

                            // Affectation
                            const affectation = agent.direction_nom || agent.service_nom || agent.direction_libelle || agent.service_libelle || '';

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
                            texte1Parts.push(formatAffectationPhrase(affectation, genre));

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

                            console.log('🔍 [generateNoteDeServicePDFBuffer] Signature info:', {
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

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de note de service en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de note de service de mutation en mémoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires (id_direction_destination, direction_destination, date_effet, motif)
     * @returns {Promise<Buffer>} - Le buffer PDF
     */
    static async generateNoteDeServiceMutationPDFBuffer(demande, agent, validateur, options = {}) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF de note de service de mutation en mémoire pour l'agent ${agent.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                const primaryColor = '#000000';
                const borderColor = '#000000';

                // S'assurer que le validateur a un ID
                if (!validateur || !validateur.id) {
                    throw new Error('Le validateur doit avoir un ID pour récupérer la signature');
                }

                // Attacher la signature active au validateur
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
                            const positionParams = idMinistere != null
                                ? [documentDateGeneration, documentId, idMinistere]
                                : [documentDateGeneration, documentId];
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
                // Pour les notes de service mutation, la direction dans le header doit toujours être "DIRECTION DES RESSOURCES HUMAINES"
                const agentDirectionName = 'DIRECTION DES RESSOURCES HUMAINES';
                const { ministryName: validatorMinistryName } = resolveOfficialHeaderContext({ agent, validateur });
                // Forcer aussi validatorDirectionName pour les notes de service mutation (drawOfficialHeaderPDF utilise validatorDirectionName en priorité)
                const validatorDirectionName = 'DIRECTION DES RESSOURCES HUMAINES';
                
                // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS' pour ajouter /DRH/SDGP
                const agentMinistryName = agent.ministere_nom || '';
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
                    agentDirectionName, // Toujours "DIRECTION DES RESSOURCES HUMAINES" pour les notes de service mutation
                    validatorMinistryName,
                    validatorDirectionName // Toujours "DIRECTION DES RESSOURCES HUMAINES" pour les notes de service mutation
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
                
                // Si pas d'emploi récent trouvé, utiliser les valeurs par défaut
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
                        
                        console.log(`✅ [generateNoteDeServiceMutationPDFBuffer] Grade et échelon récupérés depuis les tables d'historique:`, {
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
                
                console.log(`🔍 [generateNoteDeServiceMutationPDFBuffer] Grade et échelon finaux:`, {
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
                // Format: Mlle KONE MADADA, matricule K000158, née le 20 décembre 2003 à ABIDJAN, TECHNICIEN(NE) SUP. EN COMMUNICATION, est mutée à la DIR. SECURITE TOURISTIQUE ET DES LOISIRS.
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

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de note de service de mutation en mémoire:', error);
                reject(error);
            }
        });
    }

    /**
     * Génère un PDF de certificat de prise de service en mémoire
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (Directeur/DRH)
     * @param {Object} userInfo - Les informations de l'utilisateur connecté (optionnel)
     * @param {Object} options - Options supplémentaires (date_prise_service)
     * @returns {Promise<Buffer>} - Le PDF en tant que buffer
     */
    static async generateCertificatPriseServicePDFBuffer(agent, validateur, userInfo = null, options = {}) {
        return new Promise(async(resolve, reject) => {
            try {
                console.log(`📄 Génération du PDF de certificat de prise de service en mémoire pour l'agent ${agent.id}...`);

                // Créer le document PDF en mémoire
                const doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                // Collecter les données PDF dans un buffer
                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));

                // Configuration des polices et couleurs
                const primaryColor = '#000000';
                const borderColor = '#000000';

                // === DONNÉES DYNAMIQUES ===
                if (userInfo) {
                    agent.ministere_sigle = agent.ministere_sigle || userInfo.ministere_sigle;
                    if (validateur) {
                        validateur.ministere_sigle = validateur.ministere_sigle || userInfo.ministere_sigle;
                    }
                }

                await hydrateAgentWithLatestFunction(validateur);
                await attachActiveSignature(validateur);
                
                // Récupérer la direction du validateur si elle n'est pas déjà disponible
                if (validateur && validateur.id && !validateur.direction_nom && !validateur.service_nom) {
                    try {
                        const directionQuery = `
                            SELECT d.libelle as direction_nom, d.libelle as service_nom,
                                   m.nom as ministere_nom, m.sigle as ministere_sigle
                            FROM agents a
                            LEFT JOIN directions d ON a.id_direction = d.id
                            LEFT JOIN ministeres m ON a.id_ministere = m.id
                            WHERE a.id = $1
                        `;
                        const directionResult = await db.query(directionQuery, [validateur.id]);
                        if (directionResult.rows.length > 0) {
                            const dirRow = directionResult.rows[0];
                            if (!validateur.direction_nom) validateur.direction_nom = dirRow.direction_nom;
                            if (!validateur.service_nom) validateur.service_nom = dirRow.service_nom;
                            if (!validateur.ministere_nom) validateur.ministere_nom = dirRow.ministere_nom;
                            if (!validateur.ministere_sigle) validateur.ministere_sigle = dirRow.ministere_sigle;
                        }
                    } catch (error) {
                        console.error('⚠️ Erreur lors de la récupération de la direction du validateur:', error);
                    }
                }

                // Récupérer les informations de l'agent
                const agentNameParts = formatAgentName(agent);
                const civilite = agentNameParts.civilite;
                const agentPrenoms = agentNameParts.prenoms;
                const agentNom = agentNameParts.nom;
                const matricule = agent.matricule || '';
                const fonctionActuelle = getAgentPosteOuEmploi(agent);
                // Direction/Service d'affectation de l'agent (toujours utiliser la direction de l'agent dans le texte)
                const directionAgent = agent.service_nom || agent.direction_nom || agent.direction_libelle || agent.service_libelle || 'Service non renseigné';
                
                // Vérifier si l'agent est à la Direction des Ressources Humaines (pour déterminer le signataire et le soulignement)
                const isDirectionRH = directionAgent && (
                    directionAgent.toUpperCase().includes('RESSOURCES HUMAINES') ||
                    directionAgent.toUpperCase().includes('DRH')
                );
                
                // Déterminer le signataire : si l'agent est à la DRH, utiliser le DRH, sinon le Directeur de la direction
                let signataire = validateur;
                if (isDirectionRH) {
                    // Si l'agent est à la DRH, le signataire est le DRH
                    signataire = validateur;
                }
                
                // Formater le nom du signataire avec "épouse" si applicable
                // Format dans l'image: "Yawa Florentine ASSARI épouse AKPALE" (prénoms + nom + épouse + nom époux)
                const validateurNameParts = formatAgentName(signataire);
                let signataireNomComplet = '';
                // Ajouter "épouse" si le signataire est une femme mariée
                if (signataire.sexe === 'F' && signataire.nom_epoux) {
                    // Format: "PRENOMS NOM épouse NOM_EPOUX"
                    signataireNomComplet = `${validateurNameParts.prenoms} ${validateurNameParts.nom} épouse ${signataire.nom_epoux.toUpperCase()}`;
                } else {
                    // Format standard: "PRENOMS NOM" (sans civilité pour le signataire dans le texte principal)
                    signataireNomComplet = `${validateurNameParts.prenoms} ${validateurNameParts.nom}`;
                }
                
                // Récupérer la fonction du signataire
                await hydrateAgentWithLatestFunction(signataire);
                const signataireFonction = normalizeFunctionLabel(getResolvedFunctionLabel(signataire), 'Le Directeur');
                
                // Déterminer le genre du signataire pour "soussigné(e)"
                const signataireGenre = signataire.sexe === 'F' ? 'e' : '';
                
                // Date de prise de service
                // Priorité ABSOLUE: options.date_prise_service (fournie explicitement) > date_prise_service_dans_la_direction > date_prise_service > date_embauche
                // IMPORTANT: Si options.date_prise_service existe, elle DOIT être utilisée en priorité absolue
                let datePriseServiceValue = null;
                
                if (options.date_prise_service) {
                    // La date a été fournie explicitement dans les options, l'utiliser en priorité absolue
                    datePriseServiceValue = options.date_prise_service;
                    console.log('✅ Utilisation de la date fournie dans options.date_prise_service (PDF):', datePriseServiceValue);
                } else if (agent.date_prise_service_dans_la_direction) {
                    datePriseServiceValue = agent.date_prise_service_dans_la_direction;
                    console.log('✅ Utilisation de agent.date_prise_service_dans_la_direction (PDF):', datePriseServiceValue);
                } else if (agent.date_prise_service) {
                    datePriseServiceValue = agent.date_prise_service;
                    console.log('✅ Utilisation de agent.date_prise_service (PDF):', datePriseServiceValue);
                } else if (agent.date_embauche) {
                    datePriseServiceValue = agent.date_embauche;
                    console.log('✅ Utilisation de agent.date_embauche (PDF):', datePriseServiceValue);
                } else {
                    datePriseServiceValue = new Date();
                    console.log('⚠️ Aucune date disponible, utilisation de la date actuelle (PDF):', datePriseServiceValue);
                }
                
                console.log('📅 Date de prise de service dans generateCertificatPriseServicePDFBuffer:', {
                    options_date_prise_service: options.date_prise_service,
                    agent_date_prise_service_dans_la_direction: agent.date_prise_service_dans_la_direction,
                    agent_date_prise_service: agent.date_prise_service,
                    agent_date_embauche: agent.date_embauche,
                    date_finale_selectionnee: datePriseServiceValue,
                    type_date_finale: typeof datePriseServiceValue,
                    is_date_object: datePriseServiceValue instanceof Date
                });
                
                // Convertir en objet Date si nécessaire
                let datePriseService = datePriseServiceValue instanceof Date 
                    ? datePriseServiceValue 
                    : new Date(datePriseServiceValue);
                
                // Vérifier que la date est valide
                if (isNaN(datePriseService.getTime())) {
                    console.error('❌ Date de prise de service invalide dans PDF, utilisation de la date actuelle');
                    datePriseService = new Date();
                }
                
                const datePriseServiceStr = datePriseService.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                console.log('✅ Date de prise de service formatée pour PDF:', datePriseServiceStr);
                
                // Récupérer la note de service associée pour obtenir son numéro et sa date
                // Rechercher uniquement les 'note_de_service' (pas les mutations)
                let noteServiceReference = '';
                let noteServiceDate = '';
                if (agent.id) {
                    try {
                        // Chercher la note de service la plus récente pour cet agent
                        // Chercher à la fois comme destinataire ET comme générateur
                        // Uniquement les note_de_service (pas les note_de_service_mutation)
                        const noteServiceQuery = `
                            SELECT da.id, da.date_generation, da.id_agent_generateur,
                                   COALESCE(a_dest.prenom, a_gen.prenom) as agent_prenom, 
                                   COALESCE(a_dest.nom, a_gen.nom) as agent_nom, 
                                   COALESCE(a_dest.matricule, a_gen.matricule) as matricule,
                                   COALESCE(m_dest.sigle, m_gen.sigle) as ministere_sigle, 
                                   COALESCE(m_dest.nom, m_gen.nom) as ministere_nom,
                                   val.prenom as validateur_prenom, val.nom as validateur_nom
                            FROM documents_autorisation da
                            LEFT JOIN agents a_dest ON da.id_agent_destinataire = a_dest.id
                            LEFT JOIN agents a_gen ON da.id_agent_generateur = a_gen.id
                            LEFT JOIN ministeres m_dest ON a_dest.id_ministere = m_dest.id
                            LEFT JOIN ministeres m_gen ON a_gen.id_ministere = m_gen.id
                            LEFT JOIN agents val ON da.id_agent_generateur = val.id
                            WHERE (da.id_agent_destinataire = $1 OR da.id_agent_generateur = $1)
                            AND da.type_document = 'note_de_service'
                            ORDER BY da.date_generation DESC
                            LIMIT 1
                        `;
                        const noteServiceResult = await db.query(noteServiceQuery, [agent.id]);
                        
                        if (noteServiceResult.rows.length > 0) {
                            const noteService = noteServiceResult.rows[0];
                            
                            // Trouver la position exacte en comptant uniquement les note_de_service du même ministère
                            // avec la même date ou antérieures, en tenant compte de l'ordre par date_generation
                            // Le numéro n'est pas stocké, il est toujours calculé dynamiquement
                            // IMPORTANT: utiliser da.id < $2 (pas <=) pour exclure la note elle-même du décompte
                            const idMinistereNote = agent?.id_ministere ?? null;
                            const positionQuery = idMinistereNote != null ? `
                                SELECT COUNT(*) + 1 as position
                                FROM documents_autorisation da
                                INNER JOIN agents a ON da.id_agent_destinataire = a.id
                                WHERE da.type_document = 'note_de_service'
                                AND da.date_generation IS NOT NULL
                                AND a.id_ministere = $3
                                AND (
                                    da.date_generation < $1 
                                    OR (da.date_generation = $1 AND da.id < $2)
                                )
                            ` : `
                                SELECT COUNT(*) + 1 as position
                                FROM documents_autorisation da
                                WHERE da.type_document = 'note_de_service'
                                AND da.date_generation IS NOT NULL
                                AND (
                                    da.date_generation < $1 
                                    OR (da.date_generation = $1 AND da.id < $2)
                                )
                            `;
                            const positionParams = idMinistereNote != null
                                ? [noteService.date_generation, noteService.id, idMinistereNote]
                                : [noteService.date_generation, noteService.id];
                            const positionResult = await db.query(positionQuery, positionParams);
                            
                            const position = parseInt(positionResult.rows[0]?.position || 1, 10);
                            const paddedPosition = String(position).padStart(4, '0');
                            
                            // Récupérer le sigle du ministère
                            const sigle = noteService.ministere_sigle || 
                                        agent?.ministere_sigle || 
                                        validateur?.ministere_sigle || 
                                        userInfo?.ministere_sigle || '';
                            
                            // Vérifier si c'est le ministère du tourisme et des loisirs
                            const ministereNom = noteService.ministere_nom || 
                                                agent?.ministere_nom || 
                                                validateur?.ministere_nom || '';
                            const isMinTourismeEtLoisirs = ministereNom && 
                                ministereNom.toUpperCase().includes('TOURISME') && 
                                ministereNom.toUpperCase().includes('LOISIRS');
                            
                            // Générer le numéro de document avec la position
                            if (sigle) {
                                if (isMinTourismeEtLoisirs) {
                                    noteServiceReference = `${paddedPosition}/${sigle}/DRH/SDGP`;
                                } else {
                                    noteServiceReference = `${paddedPosition}/${sigle}`;
                                }
                            } else {
                                noteServiceReference = paddedPosition;
                            }
                            
                            if (noteService.date_generation) {
                                const noteDate = new Date(noteService.date_generation);
                                noteServiceDate = noteDate.toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });
                            }
                            
                            console.log('✅ Note de service trouvée:', {
                                reference: noteServiceReference,
                                date: noteServiceDate,
                                position: position,
                                noteId: noteService.id
                            });
                        } else {
                            console.log('⚠️ Aucune note de service trouvée pour l\'agent ID:', agent.id);
                        }
                    } catch (error) {
                        console.error('⚠️ Erreur lors de la récupération de la note de service:', error);
                    }
                }

                const resolvedSigle = pickFirstNonEmptyString([
                    agent?.ministere_sigle,
                    validateur?.ministere_sigle,
                    userInfo?.ministere_sigle
                ]);
                
                // Calculer dynamiquement le numéro du certificat de prise de service
                // en comptant les certificats existants, de la même manière que pour les notes de service
                let numeroDocument = '';
                const documentId = options.documentId || options.document_id || null;
                let documentDateGeneration = options.date_generation;
                
                // Si le document existe mais n'a pas de date_generation, utiliser la date actuelle ou la date de création
                if (documentId && !documentDateGeneration) {
                    try {
                        const docQuery = await db.query(
                            'SELECT date_generation, created_at FROM documents_autorisation WHERE id = $1',
                            [documentId]
                        );
                        if (docQuery.rows.length > 0) {
                            documentDateGeneration = docQuery.rows[0].date_generation || docQuery.rows[0].created_at || new Date();
                        } else {
                            documentDateGeneration = new Date();
                        }
                    } catch (error) {
                        console.error('⚠️ Erreur lors de la récupération de la date du document:', error);
                        documentDateGeneration = new Date();
                    }
                } else if (!documentDateGeneration) {
                    documentDateGeneration = new Date();
                }
                
                // Convertir en Date si c'est une string
                if (documentDateGeneration && !(documentDateGeneration instanceof Date)) {
                    documentDateGeneration = new Date(documentDateGeneration);
                }
                
                try {
                    const idMinistere = agent?.id_ministere ?? validateur?.id_ministere ?? null;
                    if (documentId) {
                        // Si le document existe déjà, calculer sa position en comptant les certificats antérieurs (par ministère)
                        // IMPORTANT: utiliser da.id < $2 (pas <=) pour exclure le document lui-même du décompte
                        const positionQuery = idMinistere != null ? `
                            SELECT COUNT(*) + 1 as position
                            FROM documents_autorisation da
                            INNER JOIN agents a ON da.id_agent_destinataire = a.id
                            WHERE da.type_document = 'certificat_prise_service'
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
                            WHERE da.type_document = 'certificat_prise_service'
                            AND (
                                (da.date_generation IS NOT NULL AND (
                                    da.date_generation < $1 
                                    OR (da.date_generation = $1 AND da.id < $2)
                                ))
                                OR (da.date_generation IS NULL AND da.id < $2)
                            )
                        `;
                        const positionParams = idMinistere != null
                            ? [documentDateGeneration, documentId, idMinistere]
                            : [documentDateGeneration, documentId];
                        const positionResult = await db.query(positionQuery, positionParams);
                        
                        const position = parseInt(positionResult.rows[0]?.position || 1, 10);
                        const paddedPosition = String(position).padStart(5, '0');
                        
                        console.log('🔍 Calcul position certificat de prise de service:', {
                            documentId: documentId,
                            dateGeneration: documentDateGeneration,
                            position: position,
                            paddedPosition: paddedPosition,
                            idMinistere
                        });
                        
                        // Vérifier si c'est le ministère du tourisme et des loisirs
                        const ministereNom = agent?.ministere_nom || 
                                            validateur?.ministere_nom || 
                                            userInfo?.ministere_nom || '';
                        const isMinTourismeEtLoisirs = ministereNom && 
                            ministereNom.toUpperCase().includes('TOURISME') && 
                            ministereNom.toUpperCase().includes('LOISIRS');
                        
                        // Générer le numéro de document avec la position
                        if (resolvedSigle) {
                            if (isMinTourismeEtLoisirs) {
                                numeroDocument = `${paddedPosition}/${resolvedSigle}/DRH/SDGP`;
                            } else {
                                numeroDocument = `${paddedPosition}/${resolvedSigle}`;
                            }
                        } else {
                            numeroDocument = paddedPosition;
                        }
                    } else {
                        // Si le document n'existe pas encore, compter tous les certificats existants (par ministère)
                        // Le prochain numéro sera count + 1
                        const countQuery = idMinistere != null ? `
                            SELECT COUNT(*) as count
                            FROM documents_autorisation da
                            INNER JOIN agents a ON da.id_agent_destinataire = a.id
                            WHERE da.type_document = 'certificat_prise_service'
                            AND a.id_ministere = $1
                        ` : `
                            SELECT COUNT(*) as count
                            FROM documents_autorisation
                            WHERE type_document = 'certificat_prise_service'
                        `;
                        const countParams = idMinistere != null ? [idMinistere] : [];
                        const countResult = await db.query(countQuery, countParams);
                        const count = parseInt(countResult.rows[0]?.count || 0, 10);
                        // Le prochain numéro est count + 1 (si count = 0, nextNumber = 1)
                        const nextNumber = count + 1;
                        const paddedPosition = String(nextNumber).padStart(5, '0');
                        
                        console.log('🔍 Calcul numéro certificat de prise de service (document non existant):', {
                            count: count,
                            nextNumber: nextNumber,
                            paddedPosition: paddedPosition,
                            idMinistere
                        });
                        
                        // Vérifier si c'est le ministère du tourisme et des loisirs
                        const ministereNom = agent?.ministere_nom || 
                                            validateur?.ministere_nom || 
                                            userInfo?.ministere_nom || '';
                        const isMinTourismeEtLoisirs = ministereNom && 
                            ministereNom.toUpperCase().includes('TOURISME') && 
                            ministereNom.toUpperCase().includes('LOISIRS');
                        
                        // Générer le numéro de document avec la position
                        if (resolvedSigle) {
                            if (isMinTourismeEtLoisirs) {
                                numeroDocument = `${paddedPosition}/${resolvedSigle}/DRH/SDGP`;
                            } else {
                                numeroDocument = `${paddedPosition}/${resolvedSigle}`;
                            }
                        } else {
                            numeroDocument = paddedPosition;
                        }
                    }
                } catch (error) {
                    console.error('⚠️ Erreur lors du calcul du numéro de certificat de prise de service:', error);
                    // En cas d'erreur, utiliser formatDocumentReference comme fallback
                    numeroDocument = formatDocumentReference({
                        agent,
                        validateur,
                        userInfo,
                        sigle: resolvedSigle
                    });
                }
                
                const generatedAt = documentDateGeneration instanceof Date ? documentDateGeneration : new Date(documentDateGeneration);

                // Utiliser l'en-tête officiel
                // Pour le certificat de prise de service, la direction et le ministère dans le header doivent être ceux du validateur
                const headerContext = resolveOfficialHeaderContext({ agent, validateur, userInfo });
                // Utiliser le ministère du validateur pour le header (pas celui de l'agent)
                const validatorMinistryName = (validateur && (validateur.ministere_nom || validateur.ministere)) || 
                                             headerContext.ministryName || 
                                             (userInfo && userInfo.ministere_nom) ||
                                             agent.ministere_nom || '';
                const agentMinistryName = validatorMinistryName; // Utiliser le ministère du validateur
                // Utiliser la direction du validateur pour le header (pas celle de l'agent)
                const validatorDirectionName = (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) || 
                                               headerContext.directionName || 
                                               (userInfo && (userInfo.direction_nom || userInfo.service_nom)) ||
                                               '';
                // Pour le header, utiliser la direction du validateur comme agentDirectionName
                const agentDirectionName = validatorDirectionName || agent.direction_nom || agent.service_nom || '';

                const headerBottom = await drawOfficialHeaderPDF(doc, {
                    documentNumber: numeroDocument,
                    dateString: generatedAt,
                    generatedAt,
                    city: 'Abidjan',
                    agentMinistryName,
                    agentDirectionName, // Direction du validateur dans le header
                    validatorMinistryName,
                    validatorDirectionName
                });

                // Titre principal (centré et souligné)
                const titleY = headerBottom + 60;
                doc.fontSize(TITLE_FONT_SIZE)
                    .font(BOLD_FONT)
                    .text('CERTIFICAT DE PRISE DE SERVICE', 50, titleY, {
                        align: 'center',
                        width: 495
                    });

                // Souligner le titre
                const titleWidth = doc.widthOfString('CERTIFICAT DE PRISE DE SERVICE', { font: BOLD_FONT, fontSize: TITLE_FONT_SIZE });
                const titleX = 50 + (495 - titleWidth) / 2;
                const underlineY = titleY + 20;
                doc.moveTo(titleX, underlineY)
                    .lineTo(titleX + titleWidth, underlineY)
                    .lineWidth(1)
                    .stroke();

                // Contenu du document avec données réelles
                let yPosition = titleY + 60;
                const leftMargin = 50;
                const textWidth = 495;

                // Construire le texte principal selon le format de l'image
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .fillColor(primaryColor);
                
                // APPROCHE ULTIME : Utiliser continued: true mais de manière très simple et contrôlée
                // En s'assurant que chaque segment est écrit correctement et que la direction n'est écrite qu'une fois
                
                // Construire la phrase dynamiquement selon la direction du validateur
                // Récupérer la direction du validateur (signataire)
                const validateurDirectionName = validatorDirectionName || 
                                                (signataire && (signataire.direction_nom || signataire.service_nom || signataire.structure_nom)) ||
                                                (userInfo && (userInfo.direction_nom || userInfo.service_nom)) ||
                                                '';
                
                // Récupérer le nom du ministère
                const ministryNameForText = validatorMinistryName || 
                                          (signataire && (signataire.ministere_nom || signataire.ministere)) || 
                                          agentMinistryName || '';
                
                // Construire la phrase selon la direction (éviter "Directeur de Direction...")
                let fonctionTexte = '';
                if (validateurDirectionName) {
                    fonctionTexte = formatDirecteurFromDirection(validateurDirectionName);
                } else {
                    fonctionTexte = signataireFonction;
                }
                
                console.log('🔍 Construction fonctionTexte pour certificat de prise de service:', {
                    validateurDirectionName: validateurDirectionName,
                    fonctionTexte: fonctionTexte,
                    ministryNameForText: ministryNameForText,
                    signataireId: signataire?.id
                });
                
                // Ajouter le nom du ministère si disponible
                if (ministryNameForText) {
                    fonctionTexte += ` du ${ministryNameForText}`;
                }
                
                // Réinitialiser la font à BASE_FONT avant de commencer
                doc.font(BASE_FONT);
                
                // Segment 1: "Je soussigné(e), "
                doc.text(`Je soussigné${signataireGenre}, `, leftMargin, yPosition, { 
                    width: textWidth,
                    continued: true 
                });
                
                // Segment 2: Nom du signataire en gras
                doc.font(BOLD_FONT)
                    .text(signataireNomComplet, { continued: true });
                
                // Segment 3: Fonction du signataire
                doc.font(BASE_FONT)
                    .text(`, ${fonctionTexte}, certifie que `, { continued: true });
                
                // Segment 4: Nom de l'agent en gras
                doc.font(BOLD_FONT)
                    .text(`${civilite} ${agentNom} ${agentPrenoms}`, { continued: true });
                
                // Segment 5: Matricule et fonction
                doc.font(BASE_FONT)
                    .text(`, matricule ${matricule}, `, { continued: true });
                
                // Segment 6: Fonction en gras
                doc.font(BOLD_FONT)
                    .text(fonctionActuelle, { continued: true });
                
                // Segment 7: "a effectivement pris service à la "
                doc.font(BASE_FONT)
                    .text(', a effectivement pris service à la ', { continued: true });
                
                // Segment 8: Direction (UNE SEULE FOIS, sans soulignement)
                // Écrire la direction UNE SEULE FOIS
                doc.font(BASE_FONT)
                    .text(directionAgent, { continued: true });
                
                // Segment 9: Date
                doc.font(BASE_FONT)
                    .text(` le ${datePriseServiceStr}`, { continued: true });
                
                // Segment 10: Note de service ou point final
                console.log('🔍 Vérification note de service:', {
                    reference: noteServiceReference,
                    date: noteServiceDate,
                    agentId: agent.id,
                    hasReference: !!noteServiceReference,
                    hasDate: !!noteServiceDate
                });
                
                if (noteServiceReference && noteServiceDate) {
                    doc.text(`, conformément à la note de service N° ${noteServiceReference} du ${noteServiceDate}.`, { 
                        width: textWidth,
                        continued: false 
                    });
                } else {
                    doc.text('.', { 
                        width: textWidth,
                        continued: false 
                    });
                }

                yPosition = doc.y + 25;

                // Phrase de clôture
                doc.fontSize(BODY_FONT_SIZE)
                    .font(BASE_FONT)
                    .text('En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.', 50, yPosition, {
                        align: 'left',
                        width: 495
                    });

                // Signature positionnée entre le centre et la droite, remontée pour éviter de coller au pied de page
                await attachActiveSignature(signataire);
                const pageHeight = doc.page.height;
                const footerY = pageHeight - 80;
                const signatureBlockHeight = 160;
                const minGapAboveFooter = 45;
                const maxSignatureY = footerY - signatureBlockHeight - minGapAboveFooter;
                const signatureY = Math.min(Math.max(doc.y + 60, 580), maxSignatureY);
                const pageWidth = doc.page.width;
                const signatureLeftMargin = doc.page.margins?.left || leftMargin;
                const rightMargin = doc.page.margins?.right || 50;
                const usableWidth = pageWidth - signatureLeftMargin - rightMargin;
                const signatureStartX = signatureLeftMargin + (usableWidth * 0.6);
                const signatureWidth = usableWidth * 0.4;
                const signatureInfo = await resolveSignatureInfo(signataire);
                
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
                            const imageWidth = 150;
                            const imageHeight = 90;
                            const imageX = signatureStartX + (signatureWidth / 2) - (imageWidth / 2);
                            doc.image(signatureInfo.imagePath, imageX, sigY, {
                                fit: [imageWidth, imageHeight]
                            });
                            sigY += imageHeight + 15;
                        } catch (error) {
                            console.error('❌ Erreur lors de l\'insertion de la signature:', error);
                        }
                    } else if (signatureInfo.role && signatureInfo.name) {
                        // Si pas d'image mais qu'on a rôle et nom : ajouter un espace pour signature manuelle
                        sigY += 70;
                    }

                    if (signatureInfo.name) {
                        doc.font(BOLD_FONT)
                            .fontSize(BODY_FONT_SIZE);
                        // Largeur pleine page pour garder tout le nom sur une seule ligne, aligné à droite sous la signature
                        doc.text(signatureInfo.name, signatureLeftMargin, sigY, {
                            align: 'right',
                            width: usableWidth
                        });
                    }
                }

                // Footer (pageHeight, footerY déjà définis plus haut)
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
                    .text(`Généré le ${generatedAt.toLocaleString('fr-FR')} - Document N° ${numeroDocument}`,
                        50, footerY + 18, {
                            align: 'center',
                            width: 495
                        });

                // Finaliser le document
                doc.end();

            } catch (error) {
                console.error('❌ Erreur lors de la génération du PDF de certificat de prise de service en mémoire:', error);
                reject(error);
            }
        });
    }
}

module.exports = MemoryPDFService;