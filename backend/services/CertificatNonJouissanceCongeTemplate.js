/**
 * Template pour le certificat de non jouissance de congé
 * Format officiel conforme au document de référence
 */

const { HEADER_CSS, buildHeaderHTML, resolveOfficialHeaderContext, pickFirstNonEmptyString } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference, generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
const { getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel } = require('./utils/agentFunction');
const { attachActiveSignature } = require('./utils/signatureUtils');
const db = require('../config/database');
const path = require('path');
const fs = require('fs');

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

class CertificatNonJouissanceCongeTemplate {

    static async generateHTML(demande, agent, validateur, document = null) {
        const dateGeneration = new Date();
        const dateGenerationStr = dateGeneration.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Récupérer le contexte de l'en-tête officiel
        const headerContext = resolveOfficialHeaderContext({ agent, validateur });
        
        // Préparer les informations pour le header
        const resolvedSigle = pickFirstNonEmptyString([
            demande?.ministere_sigle,
            agent?.ministere_sigle,
            validateur?.ministere_sigle
        ]);
        
        let documentNumber;
        if (document?.id != null && document?.type_document) {
            documentNumber = await getDocumentReference({
                demande,
                document: { id: document.id, type_document: document.type_document },
                agent: { ...agent, id_ministere: agent?.id_ministere },
                validateur,
                sigle: resolvedSigle || null
            });
        } else {
            // Générer un numéro séquentiel par ministère (nouveau document)
            const excludeId = demande?.document_id || null;
            const idMinistere = agent?.id_ministere ?? null;
            const sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('certificat_non_jouissance_conge', excludeId, idMinistere);
            const sigle = resolvedSigle || '';
            const ministereNom = headerContext.ministryName || agent.ministere_nom || validateur.ministere_nom || '';
            const isMinTourismeEtLoisirs = ministereNom && ministereNom.toUpperCase().includes('TOURISME') && ministereNom.toUpperCase().includes('LOISIRS');
            if (sigle) {
                documentNumber = isMinTourismeEtLoisirs ? `${sequentialNumber}/${sigle}/DRH/SDGP` : `${sequentialNumber}/${sigle}`;
            } else {
                documentNumber = sequentialNumber;
            }
        }
        
        const generatedAt = demande.date_generation ? new Date(demande.date_generation) : new Date();
        
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: generatedAt,
            generatedAt,
            city: 'Abidjan',
            ministryName: headerContext.ministryName || agent.ministere_nom || validateur.ministere_nom || '',
            directionName: headerContext.directionName || agent.direction_nom || agent.service_nom || validateur.direction_nom || ''
        });

        // Formater les informations de l'agent
        const nameParts = formatNameParts(agent);
        const civilite = nameParts.civilite;
        const matricule = agent.matricule || 'Non spécifié';
        
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
        
        // Si pas d'emploi récent trouvé, utiliser emploi/fonction selon type d'agent (emploi_agents / fonction_agents)
        if (!emploiRecent) {
            emploiRecent = getAgentPosteOuEmploi(agent);
        }
        
        const designationPoste = emploiRecent;

        // Service/Direction
        const serviceNom = agent.direction_nom || agent.service_nom || agent.sous_direction_nom || 'Service non spécifié';

        // Informations du validateur
        const validateurNameParts = formatNameParts(validateur);
        const validateurNomComplet = validateurNameParts.fullWithCivilite;
        const validateurFonction = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Directeur des Ressources Humaines');
        const validateurGenre = validateur.sexe === 'F' ? 'e' : '';

        // Résoudre la signature
        const signatureInfo = await resolveSignature(validateur);

        // Déterminer "l'intéressé" ou "l'intéressée" selon le genre de l'agent
        const interesseGenre = agent.sexe === 'F' ? 'e' : '';

        // Récupérer l'année pour laquelle l'agent n'a pas joui de ses congés
        let anneeTexte = 'l\'année concernée';
        if (demande.annee_non_jouissance_conge) {
            anneeTexte = `l'année ${demande.annee_non_jouissance_conge}`;
        } else if (demande.description) {
            // Essayer d'extraire l'année depuis la description si elle contient "année XXXX"
            const anneeMatch = demande.description.match(/année\s+(\d{4})/i);
            if (anneeMatch) {
                anneeTexte = `l'année ${anneeMatch[1]}`;
            } else {
                anneeTexte = demande.description;
            }
        }

        const signatureBlockHTML = `
                <div class="signature-section">
                    <div class="signature-block">
                        ${signatureInfo.role ? `<div>${signatureInfo.role}</div>` : ''}
                        ${signatureInfo.signatureImage ? `<div class="signature-image"><img src="${signatureInfo.signatureImage}" alt="Signature" /></div>` : ''}
                        ${signatureInfo.name ? `<div>${signatureInfo.name}</div>` : ''}
                    </div>
                </div>`;

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificat de non jouissance de congé</title>
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
                    font-size: 16px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 14px;
                    margin: 60px auto 30px auto;
                    width: 95%;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
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
                    align-items: center;
                    padding-right: 10%;
                }
                .signature-block {
                    text-align: right;
                    font-weight: bold;
                    line-height: 1.5;
                    width: 40%;
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

                <div class="document-title">CERTIFICAT DE NON JOUISSANCE DE CONGÉ</div>

                <div class="content-text">
                    <p>Je soussigné${validateurGenre}, <strong>${validateurNomComplet}</strong>, <strong>${validateurFonction}</strong>, certifie que ${civilite} <strong>${nameParts.prenoms} ${nameParts.nom}</strong>, Matricule <strong>${matricule}</strong>, <strong>${designationPoste}</strong>, n'a pas jouie de ses congés annuels au titre de ${anneeTexte}.</p>
                    <p>En foi de quoi, le présent Certificat lui est délivré pour servir et valoir ce que de droit.</p>
                </div>

                ${signatureBlockHTML}
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = CertificatNonJouissanceCongeTemplate;
