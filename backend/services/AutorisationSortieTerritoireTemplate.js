/**
 * Template pour l'autorisation de sortie du territoire
 * Format officiel conforme aux documents de référence
 */

const { HEADER_CSS, buildHeaderHTML, resolveOfficialHeaderContext, pickFirstNonEmptyString } = require('./officialHeader');
const { formatDocumentReference } = require('./utils/documentReference');
const { getResolvedFunctionLabel, getAgentPosteOuEmploi, getAgentEmploi, normalizeFunctionLabel } = require('./utils/agentFunction');
const { attachActiveSignature } = require('./utils/signatureUtils');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

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

class AutorisationSortieTerritoireTemplate {

    static async generateHTML(demande, agent, validateur) {
        const dateGeneration = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const dateDebut = demande.date_debut
            ? new Date(demande.date_debut).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';
        const dateFin = demande.date_fin
            ? new Date(demande.date_fin).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
            : '';

        const resolvedSigle = pickFirstNonEmptyString([
            demande?.ministere_sigle,
            agent?.ministere_sigle,
            validateur?.ministere_sigle
        ]);

        const agentWithSigle = (!agent.ministere_sigle && resolvedSigle)
            ? { ...agent, ministere_sigle: resolvedSigle }
            : agent;
        const validateurWithSigle = (validateur && !validateur.ministere_sigle && resolvedSigle)
            ? { ...validateur, ministere_sigle: resolvedSigle }
            : validateur;

        // document n'est pas passé à generateHTML ; on utilise le numéro formaté sans id de document
        const documentNumber = formatDocumentReference({
            demande,
            agent: agentWithSigle,
            validateur: validateurWithSigle,
            sigle: resolvedSigle
        });
        const { ministryName, directionName } = resolveOfficialHeaderContext({ agent: agentWithSigle, validateur: validateurWithSigle });
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: dateGeneration,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        const civilite = agent.sexe === 'F' ? 'Mlle' : 'M.';
        const nameParts = formatNameParts(agentWithSigle);
        const fonctionActuelle = getAgentPosteOuEmploi(agent);
        const emploiActuel = getAgentEmploi(agent);
        const serviceNom = agent.service_nom || 'Service non renseigné';

        const signatureInfo = await resolveSignature(validateurWithSigle || validateur);
        const signatureBlock = (signatureInfo.role || signatureInfo.name || signatureInfo.signatureImage)
            ? `
                <div class="signature-section">
                    <div class="signature-block">
                    ${signatureInfo.role ? `<div>${signatureInfo.role}</div>` : ''}
                    ${signatureInfo.signatureImage ? `<div class="signature-image"><img src="${signatureInfo.signatureImage}" alt="Signature" /></div>` : ''}
                    ${signatureInfo.name ? `<div>${signatureInfo.name}</div>` : ''}
                    </div>
                </div>`
            : '';

        // Récupération des textes dynamiques depuis la base de données
        let bodyTemplate = "Le Ministre de l'Economie et des Finances autorise <strong>{fullWithCivilite}</strong> matricule <strong>{matricule}</strong>, <strong>{fonctionActuelle}</strong> en service à la <strong>{serviceNom}</strong> à se rendre en <strong>{lieu}</strong> du <strong>{dateDebut}</strong> au <strong>{dateFin}</strong>, {motif}.";
        let footerTemplate = "En foi de quoi, la présente autorisation lui est délivrée pour servir et valoir ce que de droit.";

        try {
            const configResult = await pool.query("SELECT value FROM configurations WHERE key = 'template_autorisation_sortie_territoire'");
            if (configResult.rows.length > 0) {
                const config = configResult.rows[0].value;
                if (config.body) bodyTemplate = config.body;
                if (config.footer) footerTemplate = config.footer;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du template:', error);
        }

        // Remplacer les placeholders
        const replacePlaceholders = (text) => {
            return text
                .replace(/{fullWithCivilite}/g, nameParts.fullWithCivilite || '')
                .replace(/{matricule}/g, agent.matricule || '')
                .replace(/{emploi}/g, emploiActuel ? emploiActuel.toUpperCase() : '')
                .replace(/{fonctionActuelle}/g, fonctionActuelle ? fonctionActuelle.toUpperCase() : '')
                .replace(/{serviceNom}/g, serviceNom ? serviceNom.toUpperCase() : '')
                .replace(/{lieu}/g, demande.lieu || 'PAYS DE DESTINATION')
                .replace(/{dateDebut}/g, dateDebut || '')
                .replace(/{dateFin}/g, dateFin || '')
                .replace(/{motif}/g, demande.motif || demande.description || 'motif non précisé');
        };

        const { correctDocumentPrepositions } = require('./utils/frenchGrammar');
        let bodyToRender = replacePlaceholders(bodyTemplate);
        bodyToRender = bodyToRender.replace(/(?:<br>|\n)*\s*(<strong>)?\s*Motif\s*(<\/strong>)?\s*:/ig, '<br><br>$1Motif$2 :');
        const resolvedBody = correctDocumentPrepositions(bodyToRender);
        const resolvedFooter = replacePlaceholders(footerTemplate);

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Autorisation de Sortie du Territoire</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 0;
                    padding: 15px;
                    line-height: 1.4;
                    color: #000;
                    background-color: #fff;
                    font-size: 16px;
                }
                .document-container {
                    max-width: 800px;
                    margin: 0 auto;
                    min-height: calc(100vh - 30px);
                    display: flex;
                    flex-direction: column;
                }
                .document-title {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 12px;
                    margin: 40px auto 20px auto;
                    min-width: 450px;
                    width: fit-content;
                    max-width: 90%;
                    letter-spacing: 1px;
                }
                .content-text {
                    margin: 15px 0;
                    text-align: justify;
                }
                .content-text p {
                    margin: 5px 0;
                }
                .signature-section {    
                    margin-top: 50px;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: flex-end;
                    padding-right: 10%;
                }
                .signature-block {
                    text-align: right;
                    font-weight: bold;
                    line-height: 1.5;
                    font-size: 18px;
                    width: 80%;
                }
                .signature-block img {
                    max-height: 80px;
                    width: auto;
                    object-fit: contain;
                    margin: 12px 0;
                }
            </style>
        </head>
        <body>
            <div class="document-container">
                ${headerHTML}
 
                <div class="document-title">Autorisation de Sortie du Territoire</div>
 
                <div class="content-text">
                    <p>${resolvedBody}</p>
                    <p style="margin-top: 10px;">${resolvedFooter}</p>
                </div>
 
                ${signatureBlock}
            </div>
        </body>
        </html>
        `;
    }
}


module.exports = AutorisationSortieTerritoireTemplate;