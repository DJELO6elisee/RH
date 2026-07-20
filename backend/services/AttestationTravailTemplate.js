const { HEADER_CSS, buildHeaderHTML, resolveOfficialHeaderContext } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference } = require('./utils/documentReference');
const { getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel, getAgentDirectionToDisplay } = require('./utils/agentFunction');
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

/**
 * Template pour l'attestation de travail
 */
async function resolveSignature(validateur) {
    if (!validateur) {
        return {
            role: 'Le Directeur',
            name: '',
            signatureImage: null
        };
    }

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

class AttestationTravailTemplate {
    static async generateHTML(demande, agent, validateur, document = null) {
        const dateGeneration = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const documentNumber = document?.id != null && document?.type_document
            ? await getDocumentReference({
                demande,
                document: { id: document.id, type_document: document.type_document },
                agent: { ...agent, id_ministere: agent?.id_ministere },
                validateur
            })
            : formatDocumentReference({ demande, agent, validateur });
        const { ministryName, directionName } = resolveOfficialHeaderContext({ agent, validateur });
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: dateGeneration,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        const nameParts = formatNameParts(agent);
        const validateurNameParts = formatNameParts(validateur);
        const validateurNomComplet = validateurNameParts.fullWithCivilite || 'Le Directeur';
        const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines');
        const validateurGenre = validateur && validateur.sexe === 'F' ? 'e' : '';
        
        const fonctionActuelle = getAgentPosteOuEmploi(agent).toUpperCase().replace(/,\s*$/, '');
        const directionToDisplay = getAgentDirectionToDisplay(agent, agent.service_nom || agent.direction_nom);
        
        let dateDebutValue = null;
        if (agent && agent.date_prise_service_au_ministere) {
            dateDebutValue = agent.date_prise_service_au_ministere;
        } else if (agent && agent.date_prise_service_dans_la_direction) {
            dateDebutValue = agent.date_prise_service_dans_la_direction;
        } else if (agent && agent.date_prise_service) {
            dateDebutValue = agent.date_prise_service;
        } else if (agent && agent.date_embauche) {
            dateDebutValue = agent.date_embauche;
        } else if (demande && demande.date_debut) {
            dateDebutValue = demande.date_debut;
        }
        
        const parsedDateDebut = dateDebutValue ? new Date(dateDebutValue) : null;
        const dateDebut = (parsedDateDebut && !isNaN(parsedDateDebut.getTime())) ? parsedDateDebut.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '......................';

        const signatureInfo = await resolveSignature(validateur);
        const signatureBlock = (signatureInfo.role || signatureInfo.name || signatureInfo.signatureImage)
            ? `
                <div class="signature-section">
                    <div class="signature-block">
                    ${signatureInfo.role ? `<div>${signatureInfo.role}</div>` : ''}
                    ${signatureInfo.signatureImage ? `<div class="signature-image"><img src="${signatureInfo.signatureImage}" alt="Signature" /></div>` : ''}
                    ${signatureInfo.name ? `<div class="director-name">${signatureInfo.name}</div>` : ''}
                    </div>
                </div>`
            : '';

        let bodyTemplate = "Le Directeur soussigné{validateurGenre}, atteste que <strong>{fullWithCivilite}</strong>, matricule {matricule}, <strong>{fonctionActuelle}</strong>, à la <strong>{directionToDisplay}</strong>, est en service dans ledit Ministère depuis le <strong>{dateDebut}</strong> jusqu'à ce jour.";
        let footerTemplate = "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.";

        try {
            const configResult = await pool.query("SELECT value FROM configurations WHERE key = 'template_attestation_travail'");
            if (configResult.rows.length > 0) {
                const config = configResult.rows[0].value;
                if (config.body) bodyTemplate = config.body;
                if (config.footer) footerTemplate = config.footer;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du template attestation_travail:', error);
        }

        const replacePlaceholders = (text) => {
            return text
                .replace(/\{\s*validateurGenre\s*\}/gi, validateurGenre || '')
                .replace(/\{\s*validateurNomComplet\s*\}/gi, validateurNomComplet || '')
                .replace(/\{\s*validateurFonction\s*\}/gi, validateurFonction || '')
                .replace(/\{\s*fullWithCivilite\s*\}/gi, nameParts.fullWithCivilite || '')
                .replace(/\{\s*civilite\s*\}/gi, nameParts.civilite || '')
                .replace(/\{\s*prenoms\s*\}/gi, nameParts.prenoms || '')
                .replace(/\{\s*nom\s*\}/gi, nameParts.nom || '')
                .replace(/\{\s*matricule\s*\}/gi, agent.matricule || '')
                .replace(/\{\s*fonctionActuelle\s*\}/gi, fonctionActuelle || '')
                .replace(/\{\s*poste\s*\}/gi, fonctionActuelle || '')
                .replace(/\{\s*emploi\s*\}/gi, fonctionActuelle || '')
                .replace(/\{\s*grade\s*\}/gi, agent.grade || '')
                .replace(/\{\s*directionToDisplay\s*\}/gi, directionToDisplay || '')
                .replace(/\{\s*direction\s*\}/gi, directionToDisplay || '')
                .replace(/\{\s*serviceNom\s*\}/gi, directionToDisplay || '')
                .replace(/\{\s*dateDebut\s*\}/gi, dateDebut || '');
        };

        const { correctDocumentPrepositions } = require('./utils/frenchGrammar');
        const resolvedBody = correctDocumentPrepositions(replacePlaceholders(bodyTemplate));
        const resolvedFooter = replacePlaceholders(footerTemplate);

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Attestation de Travail</title>
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
                    max-width: 800px;
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
                .signature-section {
                    margin-top: 100px;
                    display: flex;
                    justify-content: flex-end;
                }
                .signature-block {
                    text-align: right;
                    font-weight: bold;
                    line-height: 1.5;
                }
                .signature-block .director-name {
                    white-space: nowrap;
                }
                .signature-block img {
                    max-height: 100px;
                    width: auto;
                    object-fit: contain;
                    margin: 12px 0;
                }
            </style>
        </head>
        <body>
            <div class="document-container">
                ${headerHTML}
 
                <div class="document-title">ATTESTATION DE TRAVAIL</div>
 
                <div class="content-text">
                    <p>${resolvedBody}</p>
                    <br>
                    <p>${resolvedFooter}</p>
                </div>
 
                ${signatureBlock}
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = AttestationTravailTemplate;
