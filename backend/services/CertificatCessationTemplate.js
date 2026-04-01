/**
 * Template pour le certificat de cessation de service
 * Format officiel conforme au document de référence
 * Version mise à jour - Cache buster
 */

const { HEADER_CSS, buildHeaderHTML, resolveOfficialHeaderContext } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference } = require('./utils/documentReference');
const { getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel } = require('./utils/agentFunction');
const { attachActiveSignature } = require('./utils/signatureUtils');
const path = require('path');
const fs = require('fs');

function toTitleCase(value = '') {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function formatNameParts(agent = {}) {
    const { normalizeCivilite } = require('./utils/agentFunction');
    const civilite = normalizeCivilite(agent.civilite, agent.sexe);
    const prenoms = (agent.prenom || '').toUpperCase().trim();
    const nom = (agent.nom || '').toUpperCase();
    return {
        civilite,
        prenoms,
        nom,
        fullWithCivilite: [civilite, prenoms, nom].filter(Boolean).join(' ').trim()
    };
}

async function resolveSignature(validateur) {
    if (!validateur) {
        return {
            role: 'Le Directeur',
            name: '',
            signatureImage: null
        };
    }

    // Récupérer la signature active depuis la base de données
    if (validateur && validateur.id) {
        await attachActiveSignature(validateur);
    }

    const nameParts = formatNameParts(validateur);
    const role = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Le Directeur');
    let signatureImage = null;

    if (validateur.signature_path) {
        const sanitized = validateur.signature_path
            .replace(/^\/?uploads[\\/]/, '')
            .replace(/\\/g, '/');
        const filePath = path.join(__dirname, '..', 'uploads', sanitized);

        if (fs.existsSync(filePath)) {
            try {
                const buffer = fs.readFileSync(filePath);
                const mimeType = validateur.signature_type || 'image/png';
                signatureImage = `data:${mimeType};base64,${buffer.toString('base64')}`;
            } catch (error) {
                console.error('❌ Erreur lors du chargement de la signature:', error);
            }
        } else {
            console.warn(`⚠️ Fichier de signature introuvable: ${filePath}`);
        }
    }

    return {
        role,
        name: nameParts.fullWithCivilite,
        signatureImage
    };
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
        { month: 1, day: 1 },   // Jour de l'An
        { month: 5, day: 1 },   // Fête du Travail
        { month: 8, day: 7 },   // Fête Nationale
        { month: 8, day: 15 },  // Assomption
        { month: 11, day: 1 },  // Toussaint
        { month: 12, day: 7 },  // Fête de l'Indépendance
        { month: 12, day: 25 }  // Noël
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

class CertificatCessationTemplate {

    static async generateHTML(demande, agent, validateur, document = null) {
        const dateGeneration = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Utiliser agree_date_cessation ou date_cessation selon la disponibilité
        const dateCessationValue = demande.agree_date_cessation || demande.date_cessation;
        const dateCessation = dateCessationValue ? new Date(dateCessationValue).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Date non spécifiée';
        
        // Récupérer la décision (collective ou individuelle) selon l'année au titre du congé et le périmètre
        let numeroActeDecision = null;
        let dateDecision = null;
        try {
            const db = require('../config/database');
            const anneeFiltre = demande.annee_au_titre_conge
                ? parseInt(demande.annee_au_titre_conge, 10)
                : (dateCessationValue ? new Date(dateCessationValue).getFullYear() : new Date().getFullYear());

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
            let decisionResult;

            if (hasSpecificPoste && agent.id) {
                decisionResult = await db.query(`
                    SELECT numero_acte, date_decision
                    FROM decisions
                    WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2
                    ORDER BY date_decision DESC, created_at DESC
                    LIMIT 1
                `, [agent.id, anneeFiltre]);
                if (decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                    numeroActeDecision = decisionResult.rows[0].numero_acte;
                    dateDecision = decisionResult.rows[0].date_decision;
                    console.log(`✅ Décision individuelle trouvée (année ${anneeFiltre}) pour l'agent ${agent.id}: ${numeroActeDecision}`);
                }
                // Si pas de décision individuelle, utiliser la décision collective de la direction du directeur
                if (!numeroActeDecision && agent.id_direction) {
                    const idDir = parseInt(agent.id_direction, 10);
                    if (!isNaN(idDir)) {
                        const collectiveResult = await db.query(`
                            SELECT numero_acte, date_decision
                            FROM decisions
                            WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                            ORDER BY date_decision DESC, created_at DESC
                            LIMIT 1
                        `, [idDir, anneeFiltre]);
                        if (collectiveResult.rows.length > 0 && collectiveResult.rows[0].numero_acte) {
                            numeroActeDecision = collectiveResult.rows[0].numero_acte;
                            dateDecision = collectiveResult.rows[0].date_decision;
                            console.log(`✅ Décision collective (fallback directeur) trouvée (année ${anneeFiltre}): ${numeroActeDecision}`);
                        }
                    }
                }
            } else {
                const idDirection = agent.id_direction != null ? parseInt(agent.id_direction, 10) : null;
                const idSousDirection = agent.id_sous_direction != null ? parseInt(agent.id_sous_direction, 10) : null;
                if (idSousDirection != null && !isNaN(idSousDirection)) {
                    decisionResult = await db.query(`
                        SELECT numero_acte, date_decision
                        FROM decisions
                        WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC
                        LIMIT 1
                    `, [idSousDirection, anneeFiltre]);
                    if ((!decisionResult || decisionResult.rows.length === 0) && idDirection != null && !isNaN(idDirection)) {
                        decisionResult = await db.query(`
                            SELECT numero_acte, date_decision
                            FROM decisions
                            WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                            ORDER BY date_decision DESC, created_at DESC
                            LIMIT 1
                        `, [idDirection, anneeFiltre]);
                    }
                }
                if ((!decisionResult || decisionResult.rows.length === 0) && idDirection != null && !isNaN(idDirection)) {
                    decisionResult = await db.query(`
                        SELECT numero_acte, date_decision
                        FROM decisions
                        WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC
                        LIMIT 1
                    `, [idDirection, anneeFiltre]);
                }
                if (!decisionResult || decisionResult.rows.length === 0) {
                    decisionResult = await db.query(`
                        SELECT numero_acte, date_decision
                        FROM decisions
                        WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1
                        ORDER BY date_decision DESC, created_at DESC
                        LIMIT 1
                    `, [anneeFiltre]);
                }
                if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                    numeroActeDecision = decisionResult.rows[0].numero_acte;
                    dateDecision = decisionResult.rows[0].date_decision;
                    console.log(`✅ Décision collective trouvée (année ${anneeFiltre}): ${numeroActeDecision}`);
                }
            }
        } catch (decisionError) {
            console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
        }
        
        // Enrichir le motif selon le type de congé (motif_conge = champ formulaire prioritaire)
        let motif = demande.agree_motif || demande.motif_conge || demande.motif || 'Motif non spécifié';
        
        if (motif && motif !== 'Motif non spécifié') {
            const motifLower = motif.toLowerCase();
            let texteSupplementaire = '';
            
            // Récupérer le numéro de décision et l'année
            let numeroDecisionCessation = numeroActeDecision; // Utiliser le numéro déjà récupéré
            let anneeConge = null;
            
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
            
            if (demande.id && dateCessationValue) {
                // Extraire l'année de la date de cessation
                const dateCessationObj = new Date(dateCessationValue);
                if (!isNaN(dateCessationObj.getTime())) {
                    anneeConge = dateCessationObj.getFullYear();
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
            else if (motifLower.includes('congé annuel') || motifLower.includes('conge annuel') || (motifLower.includes('congé') && motifLower.includes('annuel'))) {
                if (numeroDecisionCessation && anneeConge && dateDecisionFormatee && demande.date_debut && demande.date_fin) {
                    // Calculer le nombre de jours
                    const dateDebut = new Date(demande.date_debut);
                    const dateFin = new Date(demande.date_fin);
                    const differenceMs = dateFin.getTime() - dateDebut.getTime();
                    const nombreJours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1;
                    
                    texteSupplementaire = `Bénéficiaire d'un congé annuel de ${nombreJours} jours consécutifs au titre de l'année ${anneeConge} conformement à la cessation de congé ${numeroDecisionCessation} du ${dateDecisionFormatee}.`;
                }
            }
            
            if (texteSupplementaire) {
                motif = texteSupplementaire.trim();
            }
        }

        const documentNumber = document?.id != null && document?.type_document
            ? await getDocumentReference({
                demande,
                document: { id: document.id, type_document: document.type_document },
                agent: { ...agent, id_ministere: agent?.id_ministere },
                validateur
            })
            : formatDocumentReference({ demande, agent, validateur });
        const { ministryName, directionName } = resolveOfficialHeaderContext({ agent, validateur });
        // Numéro de décision dans l'en-tête uniquement pour le congé annuel
        const numeroActePourHeader = (() => {
            const motifStr = (demande.agree_motif || demande.motif_conge || demande.motif || '').toString();
            return isCongeAnnuelMotif(motifStr) ? numeroActeDecision : null;
        })();
        
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: dateGeneration,
            city: 'Abidjan',
            ministryName,
            directionName,
            numeroActeDecision: numeroActePourHeader
        });

        const civilite = agent.sexe === 'F' ? 'Mlle' : 'M.';
        const nameParts = formatNameParts(agent);
        const signatureInfo = await resolveSignature(validateur);
        const fonctionActuelle = getAgentPosteOuEmploi(agent);
        const designationPoste = agent.emploi_designation_poste || fonctionActuelle;
        const serviceNom = agent.service_nom || 'Service non renseigné';
        
        // Formatage du nom du validateur avec épouse si applicable
        const validateurNameParts = validateur ? formatNameParts(validateur) : { fullWithCivilite: '' };
        const validateurNomComplet = validateurNameParts.fullWithCivilite || 'Le Directeur';
        const validateurFonction = validateur ? normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines') : 'Directeur des Ressources Humaines';
        
        // Déterminer le genre du validateur pour "Je soussignée" ou "Je soussigné"
        const validateurGenre = validateur && validateur.sexe === 'F' ? 'e' : '';
        
        // Date de reprise (utiliser date_fin de la demande ou calculer à partir de date_debut et date_fin)
        let dateReprise = null;
        
        // Vérifier si c'est un congé de maternité, paternité ou un congé annuel
        const motifForReprise = demande.agree_motif || demande.motif || '';
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
            // Ajouter 1 jour pour obtenir la date de reprise (le jour suivant la fin du congé)
            dateReprise.setDate(dateReprise.getDate() + 1);
        } else if (demande.date_debut && demande.agree_date_cessation) {
            // Utiliser date_debut comme date de fin du congé, la reprise sera le jour suivant
            const dateDebut = new Date(demande.date_debut);
            dateReprise = new Date(dateDebut);
            dateReprise.setDate(dateReprise.getDate() + 1);
        } else if (demande.agree_date_cessation) {
            // Par défaut, ajouter 30 jours à la date de cessation
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
        
        // Déterminer "l'intéressé" ou "l'intéressée" selon le genre de l'agent
        const interesseGenre = agent.sexe === 'F' ? 'e' : '';
        
        const signatureBlockHTML = `
                <div class="signature-section">
                    <div class="signature-block">
                        ${signatureInfo.role ? `<div>${signatureInfo.role}</div>` : ''}
                        ${signatureInfo.signatureImage ? `<div class="signature-image"><img src="${signatureInfo.signatureImage}" alt="Signature" /></div>` : ''}
                        ${signatureInfo.name ? `<div class="signature-name">${signatureInfo.name}</div>` : ''}
                    </div>
                </div>`;

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificat de cessation de service</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.5;
                    color: #000;
                    background-color: #fff;
                    font-size: 16px;
                }
                .document-container {
                    max-width: 820px;
                    margin: 0 auto;
                }
                .document-title {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 14px;
                    margin: 60px auto 30px auto;
                    width: 82%;
                    letter-spacing: 1px;
                }
                .content-text {
                    margin: 20px 0;
                    text-align: justify;
                }
                .content-text p {
                    margin: 8px 0;
                }
                .motif-section {
                    margin-top: 25px;
                }
                .motif-title {
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                    text-align: center;
                    border-bottom: 2px solid #000;
                    display: inline-block;
                    width: 100%;
                    padding-bottom: 2px;
                }
                .signature-section {
                    margin-top: 55px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding-right: 15%;
                }
                .signature-block {
                    text-align: center;
                    font-weight: bold;
                    line-height: 1.5;
                    width: 52%;
                }
                .signature-name {
                    white-space: nowrap;
                    font-size: 15px;
                }
                .signature-block img {
                    max-height: 80px;
                    width: auto;
                    object-fit: contain;
                    margin: 12px 0;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 12px;
                }
            </style>
        </head>
        <body>
            <div class="document-container">
                ${headerHTML}

                <div class="document-title">CERTIFICAT DE CESSATION DE SERVICE</div>

                <div class="content-text">
                    <p>Je soussigné${validateurGenre}, <strong>${validateurNomComplet}</strong>, <strong>${validateurFonction}</strong>, certifie que ${civilite} <strong>${nameParts.prenoms} ${nameParts.nom}</strong>, matricule <strong>${agent.matricule}</strong>, <strong>${designationPoste}</strong>, a cessé le service à la <strong>${serviceNom}</strong> le <strong>${dateCessation}</strong>.</p>
                </div>

                <div class="motif-section">
                    <div class="motif-title">MOTIF DE LA CESSATION</div>
                    <p>${motif}</p>
                    ${dateRepriseFormatee && demande.id ? `<p>A l'issue de son congé, l'intéressé${interesseGenre} reprendra le service à son poste le <strong>${dateRepriseFormatee}</strong>.</p>` : ''}
                </div>

                ${signatureBlockHTML}

                <div class="footer">
                    <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = CertificatCessationTemplate;