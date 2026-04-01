const { HEADER_CSS, buildHeaderHTML, resolveOfficialHeaderContext, pickFirstNonEmptyString } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference } = require('./utils/documentReference');
const { getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel } = require('./utils/agentFunction');
const { attachActiveSignature } = require('./utils/signatureUtils');
const path = require('path');
const fs = require('fs');

/**
 * Template pour l'autorisation d'absence
 * Format officiel conforme aux documents de référence du Ministère de l'Économie et des Finances
 */

function toTitleCase(value = '') {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function formatNameParts(person = {}) {
    const { normalizeCivilite } = require('./utils/agentFunction');
    const civilite = normalizeCivilite(person.civilite, person.sexe);
    const prenoms = (person.prenom || '').toUpperCase().trim();
    const nom = (person.nom || '').toUpperCase();
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

class AutorisationAbsenceTemplate {

    static async generateHTML(demande, agent, validateur, document = null) {
        const dateGeneration = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const dateDebut = new Date(demande.date_debut).toLocaleDateString('fr-FR');
        const dateFin = new Date(demande.date_fin).toLocaleDateString('fr-FR');

        // Calculer le nombre de jours
        const date1 = new Date(demande.date_debut);
        const date2 = new Date(demande.date_fin);
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

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

        const numeroDocument = document?.id != null && document?.type_document
            ? await getDocumentReference({
                demande,
                document: { id: document.id, type_document: document.type_document },
                agent: { ...agentWithSigle, id_ministere: agent?.id_ministere },
                validateur: validateurWithSigle,
                sigle: resolvedSigle
            })
            : formatDocumentReference({
                demande,
                agent: agentWithSigle,
                validateur: validateurWithSigle,
                sigle: resolvedSigle
            });

        // Déterminer le titre de civilité
        const civilite = agent.sexe === 'F' ? 'Mlle' : 'M.';
        const nameParts = formatNameParts(agentWithSigle);

        // Emploi (fonctionnaire) ou fonction (autres) depuis emploi_agents / fonction_agents
        const fonctionActuelle = getAgentPosteOuEmploi(agent);

        // Résoudre les informations d'en-tête officielles (ministère / direction)
        const headerContext = resolveOfficialHeaderContext({ agent: agentWithSigle, validateur: validateurWithSigle });
        const ministryName = headerContext.ministryName
            || agent.ministere_nom
            || (validateur && (validateur.ministere_nom || validateur.ministere))
            || '';
        const directionResolved = headerContext.directionName
            || agent.direction_nom
            || agent.service_nom
            || (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom))
            || '';

        const headerHTML = buildHeaderHTML({
            documentNumber: numeroDocument,
            dateString: dateGeneration,
            city: 'Abidjan',
            ministryName,
            directionName: directionResolved
        });

        // Récupérer le service/direction pour le corps
        const serviceNom = directionResolved || agent.service_nom || 'Service non renseigné';

        const signatureInfo = await resolveSignature(validateurWithSigle || validateur);

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

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Autorisation d'Absence</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', serif;
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
                .main-title {
                    text-align: center;
                    font-size: 18px;
                    font-weight: bold;
                    text-decoration: underline;
                    margin: 60px 0 30px 0;
                    text-transform: uppercase;
                    border: 1px solid #000;
                    padding: 14px 10px;
                    background-color: #f0f0f0;
                }
                .content-text {
                    margin: 20px 0;
                    text-align: justify;
                }
                .content-text p {
                    margin: 8px 0;
                }
                .content-text strong {
                    font-weight: bold;
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

                <div class="main-title">Autorisation d'Absence</div>

                <div class="content-text">
                    <p>Une autorisation d'absence de <strong>${diffDays} jour${diffDays > 1 ? 's' : ''}</strong></p>
                    <p>valable du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong> inclus</p>
                    <p>est accordée à <strong>${nameParts.fullWithCivilite}</strong></p>
                    <p>matricule <strong>${agent.matricule}</strong>, <strong>${fonctionActuelle.toUpperCase()}</strong></p>
                    <p>en service à la <strong>${serviceNom.toUpperCase()}</strong></p>
                    <p>pour se rendre à <strong>${demande.lieu || 'DESTINATION'}</strong></p>
                    <p><strong>Motif de l'absence :</strong></p>
                    <p><strong>${demande.description || 'Pour affaires personnelles.'}</strong></p>
                </div>

                ${signatureBlock}
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = AutorisationAbsenceTemplate;