const db = require('../config/database');
const PDFGenerationService = require('./PDFGenerationService');
const PDFKitGenerationService = require('./PDFKitGenerationService');
const CertificatCessationTemplate = require('./CertificatCessationTemplate');
const CertificatRepriseServiceTemplate = require('./CertificatRepriseServiceTemplate');
const CertificatNonJouissanceCongeTemplate = require('./CertificatNonJouissanceCongeTemplate');
const { HEADER_CSS, buildHeaderHTML, pickFirstNonEmptyString, formatFullFrenchDate } = require('./officialHeader');
const { formatDocumentReference } = require('./utils/documentReference');
const { hydrateAgentWithLatestFunction, getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel } = require('./utils/agentFunction');
const { attachActiveSignature } = require('./utils/signatureUtils');
const { formatAffectationPhrase, formatDirecteurFromDirection } = require('./utils/frenchGrammar');
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

async function buildSignatureImageData(validateur) {
    // Récupérer la signature active depuis la base de données
    if (validateur && validateur.id) {
        const { attachActiveSignature } = require('./utils/signatureUtils');
        await attachActiveSignature(validateur);
    }

    if (!validateur || !validateur.signature_path) {
        return null;
    }

    try {
        const sanitized = validateur.signature_path
            .replace(/^\/?uploads[\\/]/, '')
            .replace(/\\/g, '/');
        const filePath = path.join(__dirname, '..', 'uploads', sanitized);
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Fichier de signature introuvable: ${filePath}`);
            return null;
        }
        const buffer = fs.readFileSync(filePath);
        const mimeType = validateur.signature_type || 'image/png';
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error('❌ Erreur lors du chargement de la signature:', error);
        return null;
    }
}

async function resolveSignatureInfo(validateur, fallbackRole = 'Le Directeur') {
    if (!validateur) {
        return {
            role: fallbackRole,
            name: '',
            signatureImage: null
        };
    }

    // Récupérer la signature active depuis la base de données si elle n'est pas déjà attachée
    if (!validateur.signature_path && validateur.id) {
        const { attachActiveSignature } = require('./utils/signatureUtils');
        await attachActiveSignature(validateur);
    }

    const nameParts = formatNameParts(validateur);
    const role = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), fallbackRole);

    return {
        role,
        name: nameParts.fullWithCivilite || '',
        signatureImage: await buildSignatureImageData(validateur)
    };
}

function renderSignatureHTML(signatureInfo = {}) {
    const { role, name, signatureImage } = signatureInfo;
    if (!role && !name) {
        return '';
    }

    return `
            <div class="signature-section">
                <div class="signature-box">
                    ${role ? `<div class="signature-line">${role}</div>` : ''}
                    ${signatureImage ? `<div style="margin: 10px 0;"><img src="${signatureImage}" alt="Signature" style="max-height: 80px; width: auto; object-fit: contain;" /></div>` : ''}
                    ${name ? `<div class="signature-line">${name}</div>` : ''}
                </div>
            </div>`;
}

function resolveDemandeGenerationDate(source = {}) {
    const candidates = [
        source.date_generation,
        source.date_validation,
        source.date_approbation,
        source.date_decision,
        source.date_valide,
        source.validated_at,
        source.approved_at,
        source.updated_at,
        source.created_at
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

class DocumentGenerationService {


    /**
     * Génère un document d'attestation de présence
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateAttestationPresence(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document d'attestation de présence pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document
            const contenuHTML = await this.generateAttestationPresenceHTML(demande, agent, validateur);

            // Créer le titre du document
            const titre = `Attestation de Présence - ${agent.prenom} ${agent.nom} - ${demande.date_debut}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'attestation_presence',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document d'attestation de présence généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF d'attestation de présence généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF d'attestation de présence pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id, // Pour la compatibilité
                titre: titre,
                date_generation: document.date_generation,
                message: 'Document d\'attestation de présence généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document d\'attestation de présence:', error);
            throw error;
        }
    }

    /**
     * Génère un document d'attestation de travail
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateAttestationTravail(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document d'attestation de travail pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Le contenu sera généré dynamiquement via PDF
            const contenuHTML = 'Document PDF généré automatiquement';

            // Créer le titre du document
            const titre = `Attestation de Travail - ${agent.prenom} ${agent.nom} - ${demande.date_debut}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'attestation_travail',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document d'attestation de travail généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF d'attestation de travail généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF d'attestation de travail pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id, // Pour la compatibilité
                titre: titre,
                date_generation: document.date_generation,
                message: 'Document d\'attestation de travail généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document d\'attestation de travail:', error);
            throw error;
        }
    }

    /**
     * Génère un document d'autorisation d'absence
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateAutorisationAbsence(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document d'autorisation d'absence pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document
            const contenuHTML = await this.generateAutorisationAbsenceHTML(demande, agent, validateur);

            // Créer le titre du document
            const titre = `Autorisation d'Absence - ${agent.prenom} ${agent.nom} - ${demande.date_debut}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'autorisation_absence',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document d'autorisation généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF (PDFKit) généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF (PDFKit) pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id,
                titre: titre,
                date_generation: document.date_generation,
                message: 'Document d\'autorisation d\'absence généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document:', error);
            throw error;
        }
    }

    /**
     * Génère le HTML pour l'autorisation d'absence
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @returns {string} - Le HTML du document
     */
    static async generateAutorisationAbsenceHTML(demande, agent, validateur) {
        const generationDate = resolveDemandeGenerationDate(demande);
        const dateGeneration = generationDate.toLocaleDateString('fr-FR');
        const formattedGenerationDate = formatFullFrenchDate(generationDate);
        const generationTime = generationDate.toLocaleTimeString('fr-FR');

        const dateDebut = new Date(demande.date_debut).toLocaleDateString('fr-FR');
        const dateFin = new Date(demande.date_fin).toLocaleDateString('fr-FR');
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

        const documentNumber = formatDocumentReference({
            demande,
            agent: agentWithSigle,
            validateur: validateurWithSigle,
            sigle: resolvedSigle
        });
        const ministryName = (validateurWithSigle && (validateurWithSigle.ministere_nom || validateurWithSigle.ministereNom))
            || agentWithSigle.ministere_nom || '';
        const directionName = (validateurWithSigle && (validateurWithSigle.direction_nom || validateurWithSigle.directionNom || validateurWithSigle.service_nom))
            || agentWithSigle.direction_nom || agentWithSigle.service_nom || '';
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Récupérer les informations de signature de manière asynchrone avant de construire le template
        const signatureInfo = await resolveSignatureInfo(validateur);
        const signatureHTML = renderSignatureHTML(signatureInfo);

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
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                .document-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 12px;
                    margin: 20px auto 30px auto;
                    width: 82%;
                    letter-spacing: 1px;
                }
                .content {
                    margin: 30px 0;
                }
                .section {
                    margin: 25px 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #3498db;
                }
                .section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }
                .info-item {
                    padding: 15px;
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .info-label {
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                .info-value {
                    color: #555;
                }
                .signature-section {
                    margin-top: 50px;
                    display: flex;
                    justify-content: center;
                }
                .signature-box {
                    text-align: center;
                    min-width: 200px;
                    padding: 20px;
                    border: 2px dashed #bdc3c7;
                    border-radius: 5px;
                }
                .signature-line {
                    font-weight: bold;
                    margin: 6px 0;
                }
                .signature-label {
                    font-weight: bold;
                    margin-bottom: 50px;
                    color: #2c3e50;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #7f8c8d;
                    border-top: 1px solid #ecf0f1;
                    padding-top: 20px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    background-color: #27ae60;
                    color: white;
                    border-radius: 20px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            </style>
        </head>
        <body>
            ${headerHTML}

            <div class="document-title">Autorisation d'Absence</div>

            <div class="content">
                <div class="section">
                    <h3>📋 Informations de la Demande</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Numéro de Demande</div>
                            <div class="info-value">#${demande.id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Génération</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Type de Demande</div>
                            <div class="info-value">${demande.type_demande}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Statut</div>
                            <div class="info-value"><span class="status-badge">Autorisée</span></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>👤 Informations de l'Agent</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nom et prénoms</div>
                            <div class="info-value"><strong>${formatNameParts(agentWithSigle).fullWithCivilite}</strong></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Matricule</div>
                            <div class="info-value">${agent.matricule}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Service</div>
                            <div class="info-value">${agent.service_nom || 'Non spécifié'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Ministère</div>
                            <div class="info-value">${agent.ministere_nom || 'Non spécifié'}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>📅 Détails de l'Absence</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Date de Début</div>
                            <div class="info-value">${dateDebut}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Fin</div>
                            <div class="info-value">${dateFin}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Lieu</div>
                            <div class="info-value">${demande.lieu || 'Non spécifié'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Priorité</div>
                            <div class="info-value">${demande.priorite || 'Normale'}</div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <div class="info-label">Description / Motif</div>
                        <div class="info-value" style="padding: 15px; background-color: white; border-radius: 5px; margin-top: 10px;">
                            ${demande.description || 'Aucune description fournie'}
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>✅ Validation</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Validé par</div>
                            <div class="info-value">${validateur.prenom} ${validateur.nom}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fonction</div>
                            <div class="info-value">Directeur des Ressources Humaines</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Validation</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Commentaire</div>
                            <div class="info-value">${demande.commentaire_drh || 'Demande approuvée'}</div>
                        </div>
                    </div>
                </div>
            </div>

            ${signatureHTML}

            <div class="footer">
                <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
                <p>Pour toute question, veuillez contacter le service des ressources humaines.</p>
                <p>Document généré le ${formattedGenerationDate}${generationTime ? ` à ${generationTime}` : ''}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Génère le HTML pour l'attestation de présence
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @returns {string} - Le HTML du document
     */
    static async generateAttestationPresenceHTML(demande, agent, validateur) {
        const generationDate = resolveDemandeGenerationDate(demande);
        const dateGeneration = generationDate.toLocaleDateString('fr-FR');
        const formattedGenerationDate = formatFullFrenchDate(generationDate);
        const generationTime = generationDate.toLocaleTimeString('fr-FR');

        const dateDebut = new Date(demande.date_debut).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const dateFin = new Date(demande.date_fin).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
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

        const documentNumber = formatDocumentReference({
            demande,
            agent: agentWithSigle,
            validateur: validateurWithSigle,
            sigle: resolvedSigle
        });
        const ministryName = (validateurWithSigle && (validateurWithSigle.ministere_nom || validateurWithSigle.ministereNom))
            || agentWithSigle.ministere_nom || '';
        const directionName = (validateurWithSigle && (validateurWithSigle.direction_nom || validateurWithSigle.directionNom || validateurWithSigle.service_nom))
            || agentWithSigle.direction_nom || agentWithSigle.service_nom || '';
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Récupérer les informations de signature de manière asynchrone avant de construire le template
        const signatureInfo = await resolveSignatureInfo(validateur);
        const signatureHTML = renderSignatureHTML(signatureInfo);

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Attestation de présence</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                .document-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 12px;
                    margin: 20px auto 30px auto;
                    width: 82%;
                    letter-spacing: 1px;
                }
                .content {
                    margin: 30px 0;
                }
                .section {
                    margin: 25px 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #3498db;
                }
                .section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }
                .info-item {
                    padding: 15px;
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .info-label {
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                .info-value {
                    color: #555;
                }
                .attestation-text {
                    margin: 30px 0;
                    padding: 30px;
                    background-color: #ffffff;
                    border: 2px solid #ecf0f1;
                    border-radius: 10px;
                    font-size: 16px;
                    line-height: 1.8;
                    text-align: justify;
                }
                .signature-section {
                    margin-top: 50px;
                    text-align: center;
                }
                .signature-box {
                    display: inline-block;
                    margin: 20px;
                    padding: 20px;
                    border: 2px dashed #bdc3c7;
                    border-radius: 5px;
                    min-width: 200px;
                    text-align: center;
                }
                .signature-line {
                    font-weight: bold;
                    margin: 6px 0;
                }
                .signature-label {
                    font-weight: bold;
                    margin-bottom: 50px;
                    color: #2c3e50;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #7f8c8d;
                    border-top: 1px solid #ecf0f1;
                    padding-top: 20px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    background-color: #27ae60;
                    color: white;
                    border-radius: 20px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            </style>
        </head>
        <body>
            ${headerHTML}

            <div class="document-title">ATTESTATION DE PRÉSENCE</div>

            <div class="content">
                <div class="section">
                    <h3>📋 Informations de la Demande</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Numéro de Demande</div>
                            <div class="info-value">#${demande.id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Génération</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Type de Demande</div>
                            <div class="info-value">Attestation de Présence</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Statut</div>
                            <div class="info-value"><span class="status-badge">Certifiée</span></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>👤 Informations de l'Agent</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nom et prénoms</div>
                            <div class="info-value"><strong>${formatNameParts(agentWithSigle).fullWithCivilite}</strong></div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Matricule</div>
                            <div class="info-value">${agent.matricule}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fonction</div>
                            <div class="info-value">${getAgentPosteOuEmploi(agent)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Service</div>
                            <div class="info-value">${agent.service_nom || 'Non renseigné'}</div>
                        </div>
                    </div>
                </div>

                <div class="attestation-text">
                    <p><strong>Le Directeur soussigné(e), atteste que ${formatNameParts(agentWithSigle).fullWithCivilite},</strong></p>
                    <p><strong>matricule ${agent.matricule}, ${getAgentPosteOuEmploi(agent).toUpperCase()}, grade,</strong></p>
                    <p><strong>à la ${agent.service_nom || 'DIRECTION'},</strong></p>
                    <p><strong>est en poste dans ledit Ministère depuis le ${dateDebut} jusqu'à ce jour.</strong></p>
                    <br>
                    <p><em>En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</em></p>
                </div>

                <div class="section">
                    <h3>✅ Validation</h3>
                    <div class="info-grid">
                        <div class="info-item">
                        <div class="info-label">Certifié par</div>
                        <div class="info-value">${validateur ? `<strong>${formatNameParts(validateurWithSigle || validateur).fullWithCivilite}</strong>` : ''}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fonction</div>
                            <div class="info-value">Directeur des Ressources Humaines</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Certification</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Commentaire</div>
                            <div class="info-value">${demande.commentaire_drh || 'Attestation certifiée'}</div>
                        </div>
                    </div>
                </div>
            </div>

            ${renderSignatureHTML(await resolveSignatureInfo(validateur))}

            <div class="footer">
                <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
                <p>Pour toute question, veuillez contacter le service des ressources humaines.</p>
                <p>Document généré le ${formattedGenerationDate}${generationTime ? ` à ${generationTime}` : ''}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Génère un document de certificat de cessation de service
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateCertificatCessation(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document de certificat de cessation pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document avec le nouveau template
            const contenuHTML = await CertificatCessationTemplate.generateHTML(demande, agent, validateur);

            // Créer le titre du document
            const titre = `Certificat de Cessation de Service - ${agent.prenom} ${agent.nom} - ${demande.agree_date_cessation}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'certificat_cessation',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document de certificat de cessation généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF de certificat de cessation généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF de certificat de cessation pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id, // Pour la compatibilité
                titre: titre,
                type_document: 'certificat_cessation',
                date_generation: document.date_generation,
                message: 'Document de certificat de cessation généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document de certificat de cessation:', error);
            throw error;
        }
    }

    /**
     * Génère un document de certificat de reprise de service
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateCertificatRepriseService(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document de certificat de reprise de service pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document avec le template
            const contenuHTML = await CertificatRepriseServiceTemplate.generateHTML(demande, agent, validateur);

            // Créer le titre du document
            const dateReprise = demande.date_reprise_service || demande.date_fin_conges || demande.date_fin || 'Date non spécifiée';
            const titre = `Certificat de Reprise de Service - ${agent.prenom} ${agent.nom} - ${dateReprise}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'certificat_reprise_service',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document de certificat de reprise de service généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF de certificat de reprise de service généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF de certificat de reprise de service pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id, // Pour la compatibilité
                titre: titre,
                type_document: 'certificat_reprise_service',
                date_generation: document.date_generation,
                message: 'Document de certificat de reprise de service généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document de certificat de reprise de service:', error);
            throw error;
        }
    }

    /**
     * Génère un document de certificat de non jouissance de congé
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateCertificatNonJouissanceConge(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document de certificat de non jouissance de congé pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document avec le template
            const contenuHTML = await CertificatNonJouissanceCongeTemplate.generateHTML(demande, agent, validateur);

            // Créer le titre du document avec l'année
            let annee = demande.annee_non_jouissance_conge;
            if (!annee && demande.description) {
                // Essayer d'extraire l'année depuis la description
                const anneeMatch = demande.description.match(/année\s+(\d{4})/i);
                if (anneeMatch) {
                    annee = anneeMatch[1];
                }
            }
            
            const anneeLabel = annee ? `Année ${annee}` : 'Année non spécifiée';
            const titre = `Certificat de Non Jouissance de Congé - ${agent.prenom} ${agent.nom} - ${anneeLabel}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'certificat_non_jouissance_conge',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document de certificat de non jouissance de congé généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF de certificat de non jouissance de congé généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF de certificat de non jouissance de congé pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id, // Pour la compatibilité
                titre: titre,
                type_document: 'certificat_non_jouissance_conge',
                date_generation: document.date_generation,
                message: 'Document de certificat de non jouissance de congé généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document de certificat de non jouissance de congé:', error);
            throw error;
        }
    }

    /**
     * Génère le HTML pour l'attestation de travail
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @returns {string} - Le HTML du document
     */
    static async generateAttestationTravailHTML(demande, agent, validateur) {
        const generationDate = resolveDemandeGenerationDate(demande);
        const dateGeneration = generationDate.toLocaleDateString('fr-FR');
        const formattedGenerationDate = formatFullFrenchDate(generationDate);
        const generationTime = generationDate.toLocaleTimeString('fr-FR');

        const dateDebut = new Date(demande.date_debut).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const dateFin = new Date(demande.date_fin).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const documentNumber = demande.numero_document || demande.reference || demande.numero || '';
        const ministryName = (validateur && (validateur.ministere_nom || validateur.ministereNom))
            || agent.ministere_nom || '';
        const directionName = (validateur && (validateur.direction_nom || validateur.directionNom || validateur.service_nom))
            || agent.direction_nom || agent.service_nom || '';
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Récupérer les informations de signature de manière asynchrone avant de construire le template
        const signatureInfo = await resolveSignatureInfo(validateur);
        const signatureHTML = renderSignatureHTML(signatureInfo);

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Attestation de travail</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                .document-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 12px;
                    margin: 20px auto 30px auto;
                    width: 82%;
                    letter-spacing: 1px;
                }
                .content {
                    margin: 30px 0;
                }
                .section {
                    margin: 25px 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #3498db;
                }
                .section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }
                .info-item {
                    padding: 15px;
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .info-label {
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                .info-value {
                    color: #555;
                }
                .attestation-text {
                    margin: 30px 0;
                    padding: 30px;
                    background-color: #ffffff;
                    border: 2px solid #ecf0f1;
                    border-radius: 10px;
                    font-size: 16px;
                    line-height: 1.8;
                    text-align: justify;
                }
                .signature-section {
                    margin-top: 50px;
                    text-align: center;
                }
                .signature-box {
                    display: inline-block;
                    margin: 20px;
                    padding: 20px;
                    border: 2px dashed #bdc3c7;
                    border-radius: 5px;
                    min-width: 200px;
                    text-align: center;
                }
                .signature-line {
                    font-weight: bold;
                    margin: 6px 0;
                }
                .signature-label {
                    font-weight: bold;
                    margin-bottom: 50px;
                    color: #2c3e50;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #7f8c8d;
                    border-top: 1px solid #ecf0f1;
                    padding-top: 20px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    background-color: #27ae60;
                    color: white;
                    border-radius: 20px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            </style>
        </head>
        <body>
            ${headerHTML}

            <div class="document-title">ATTESTATION DE TRAVAIL</div>

            <div class="content">
                <div class="section">
                    <h3>📋 Informations de la Demande</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Numéro de Demande</div>
                            <div class="info-value">#${demande.id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Génération</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Type de Demande</div>
                            <div class="info-value">attestation_travail</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Statut</div>
                            <div class="info-value"><span class="status-badge">Approuvée</span></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>👤 Informations de l'Agent</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nom et Prénoms</div>
                            <div class="info-value">${agent.prenom} ${agent.nom}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Matricule</div>
                            <div class="info-value">${agent.matricule}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Service</div>
                            <div class="info-value">${agent.service_nom || 'Non renseigné'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Ministère</div>
                            <div class="info-value">${agent.ministere_nom || ''}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>📅 Détails de l'Attestation</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Date de Début</div>
                            <div class="info-value">${dateDebut}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Fin</div>
                            <div class="info-value">${dateFin}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Lieu de Travail</div>
                            <div class="info-value">${demande.lieu || 'Non renseigné'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Priorité</div>
                            <div class="info-value">${demande.priorite || 'normale'}</div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <div class="info-label">Description / Motif</div>
                        <div class="info-value" style="padding: 15px; background-color: white; border-radius: 5px; margin-top: 10px;">
                            ${demande.description || 'Non renseigné'}
                        </div>
                    </div>
                </div>

                <div class="attestation-text">
                    <p><strong>ATTESTATION DE TRAVAIL</strong></p>
                    <p>Je soussigné(e) <strong>${validateur.prenom} ${validateur.nom}</strong>, Directeur des Ressources Humaines du ${agent.ministere_nom || ''}, certifie par les présentes que :</p>
                    <p><strong>${agent.prenom} ${agent.nom}</strong>, matricule <strong>${agent.matricule}</strong>, agent au service <strong>${agent.service_nom || 'Non renseigné'}</strong>, a effectivement travaillé au sein de notre ministère du <strong>${dateDebut}</strong> au <strong>${dateFin}</strong>.</p>
                    <p>Cette attestation est délivrée à la demande de l'intéressé(e) pour servir et valoir ce que de droit.</p>
                </div>

                <div class="section">
                    <h3>✅ Validation</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Validé par</div>
                            <div class="info-value">${validateur.prenom} ${validateur.nom}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fonction</div>
                            <div class="info-value">Directeur des Ressources Humaines</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Validation</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Commentaire</div>
                            <div class="info-value">${demande.commentaire_drh || 'Demande approuvée'}</div>
                        </div>
                    </div>
                </div>
            </div>

            ${signatureHTML}

            <div class="footer">
                <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
                <p>Pour toute question, veuillez contacter le service des ressources humaines.</p>
                <p>Document généré le ${formattedGenerationDate}${generationTime ? ` à ${generationTime}` : ''}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Génère le HTML pour le certificat de cessation de service
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @returns {string} - Le HTML du document
     */
    static async generateCertificatCessationHTML(demande, agent, validateur) {
        const generationDate = resolveDemandeGenerationDate(demande);
        const dateGeneration = generationDate.toLocaleDateString('fr-FR');
        const formattedGenerationDate = formatFullFrenchDate(generationDate);
        const generationTime = generationDate.toLocaleTimeString('fr-FR');

        const dateCessation = new Date(demande.agree_date_cessation).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const documentNumber = demande.numero_document || demande.reference || demande.numero || '';
        const ministryName = (validateur && (validateur.ministere_nom || validateur.ministereNom))
            || agent.ministere_nom || '';
        const directionName = (validateur && (validateur.direction_nom || validateur.directionNom || validateur.service_nom))
            || agent.direction_nom || agent.service_nom || '';
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Récupérer les informations de signature de manière asynchrone avant de construire le template
        const signatureInfo = await resolveSignatureInfo(validateur);
        const signatureHTML = renderSignatureHTML(signatureInfo);

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificat de Cessation de Service</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                .document-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 12px;
                    margin: 20px auto 30px auto;
                    width: 82%;
                    letter-spacing: 1px;
                }
                .content {
                    margin: 30px 0;
                }
                .section {
                    margin: 25px 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #3498db;
                }
                .section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    font-size: 18px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 20px 0;
                }
                .info-item {
                    padding: 15px;
                    background-color: white;
                    border-radius: 5px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .info-label {
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 5px;
                }
                .info-value {
                    color: #555;
                }
                .certificate-text {
                    margin: 30px 0;
                    padding: 30px;
                    background-color: #ffffff;
                    border: 2px solid #ecf0f1;
                    border-radius: 10px;
                    font-size: 16px;
                    line-height: 1.8;
                    text-align: justify;
                }
                .signature-section {
                    margin-top: 50px;
                    text-align: center;
                }
                .signature-box {
                    display: inline-block;
                    margin: 20px;
                    padding: 20px;
                    border: 2px dashed #bdc3c7;
                    border-radius: 5px;
                    min-width: 200px;
                    text-align: center;
                }
                .signature-line {
                    font-weight: bold;
                    margin: 6px 0;
                }
                .signature-label {
                    font-weight: bold;
                    margin-bottom: 50px;
                    color: #2c3e50;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 12px;
                    color: #7f8c8d;
                    border-top: 1px solid #ecf0f1;
                    padding-top: 20px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 8px 16px;
                    background-color: #e74c3c;
                    color: white;
                    border-radius: 20px;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
            </style>
        </head>
        <body>
            ${headerHTML}

            <div class="document-title">Certificat de Cessation de Service</div>

            <div class="content">
                <div class="section">
                    <h3>📋 Informations de la Demande</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Numéro de Demande</div>
                            <div class="info-value">#${demande.id}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Génération</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Type de Demande</div>
                            <div class="info-value">Certificat de Cessation de Service</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Statut</div>
                            <div class="info-value"><span class="status-badge">Certifié</span></div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>👤 Informations de l'Agent</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Nom et Prénoms</div>
                            <div class="info-value">${agent.prenom} ${agent.nom}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Matricule</div>
                            <div class="info-value">${agent.matricule}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fonction</div>
                            <div class="info-value">${getAgentPosteOuEmploi(agent)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Service</div>
                            <div class="info-value">${agent.service_nom || 'Non renseigné'}</div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <h3>📅 Détails de la Cessation</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Date de Cessation</div>
                            <div class="info-value">${dateCessation}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Motif de Cessation</div>
                            <div class="info-value">${demande.motif || 'Non spécifié'}</div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <div class="info-label">Description / Détails</div>
                        <div class="info-value" style="padding: 15px; background-color: white; border-radius: 5px; margin-top: 10px;">
                            ${demande.description || 'Aucune description fournie'}
                        </div>
                    </div>
                </div>

                <div class="certificate-text">
                    <p><strong>CERTIFICAT DE CESSATION DE SERVICE</strong></p>
                    <p>Je soussigné(e) <strong>${validateur.prenom} ${validateur.nom}</strong>, Directeur des Ressources Humaines du ${agent.ministere_nom || ''}, certifie par les présentes que :</p>
                    <p><strong>${agent.prenom} ${agent.nom}</strong>, matricule <strong>${agent.matricule}</strong>, agent au service <strong>${agent.service_nom || 'Non renseigné'}</strong>, a cessé ses fonctions au sein de notre ministère le <strong>${dateCessation}</strong>.</p>
                    <p><strong>Motif de cessation :</strong> ${demande.motif || 'Non spécifié'}</p>
                    <p>Ce certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.</p>
                </div>

                <div class="section">
                    <h3>✅ Validation</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Certifié par</div>
                            <div class="info-value">${validateur.prenom} ${validateur.nom}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Fonction</div>
                            <div class="info-value">Directeur des Ressources Humaines</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Date de Certification</div>
                            <div class="info-value">${formattedGenerationDate}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Commentaire</div>
                            <div class="info-value">${demande.commentaire_drh || 'Certificat délivré'}</div>
                        </div>
                    </div>
                </div>
            </div>

            ${signatureHTML}

            <div class="footer">
                <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
                <p>Pour toute question, veuillez contacter le service des ressources humaines.</p>
                <p>Document généré le ${formattedGenerationDate}${generationTime ? ` à ${generationTime}` : ''}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Récupère un document par son ID
     * @param {number} documentId - L'ID du document
     * @returns {Promise<Object>} - Le document
     */
    static async getDocumentById(documentId) {
        try {
            const query = `
                SELECT d.*, a.prenom, a.nom, a.matricule, a.sexe, a.fonction_actuelle as poste,
                       c.libele as civilite,
                       s.libelle as service_nom, s.libelle as direction_nom, m.nom as ministere_nom,
                       val.prenom as validateur_prenom, val.nom as validateur_nom,
                       val.fonction_actuelle as validateur_fonction,
                       fa.designation_poste as validateur_fonction_designation,
                       val_dir.libelle as validateur_direction_nom,
                       m_val.nom as validateur_ministere_nom,
                       doc.type_document, doc.id_demande
                FROM documents_autorisation doc
                LEFT JOIN demandes d ON doc.id_demande = d.id
                LEFT JOIN agents a ON doc.id_agent_destinataire = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents val ON doc.id_agent_generateur = val.id
                LEFT JOIN directions val_dir ON val.id_direction = val_dir.id
                LEFT JOIN ministeres m_val ON val.id_ministere = m_val.id
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

            return result.rows[0];

        } catch (error) {
            console.error('❌ Erreur lors de la récupération du document:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les documents d'un agent
     * @param {number} agentId - L'ID de l'agent
     * @returns {Promise<Array>} - Les documents
     */
    static async getDocumentsByAgent(agentId) {
        try {
            const query = `
                SELECT da.*, d.type_demande, d.date_debut, d.date_fin,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                WHERE da.id_agent_destinataire = $1
                ORDER BY da.date_generation DESC
            `;

            const result = await db.query(query, [agentId]);
            return result.rows;

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des documents:', error);
            throw error;
        }
    }

    /**
     * Récupère tous les documents pour un validateur (DRH, chef de service)
     * @param {number} validateurId - L'ID du validateur
     * @returns {Promise<Array>} - Les documents
     */
    static async getDocumentsByValidateur(validateurId) {
        try {
            // Récupérer le rôle du validateur
            const roleQuery = `
                SELECT r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id_agent = $1
            `;
            const roleResult = await db.query(roleQuery, [validateurId]);
            const roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom) || '';

            console.log(`📋 Récupération des documents pour le validateur ${validateurId} (rôle: ${roleNom})`);

            let query = '';
            let params = [];

            if (roleNom.toLowerCase() === 'super_admin') {
                // Super admin : voir tous les documents
                query = `
                    SELECT da.*, d.type_demande, d.date_debut, d.date_fin,
                           a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                           s.libelle as service_nom, m.nom as ministere_nom
                    FROM documents_autorisation da
                    LEFT JOIN demandes d ON da.id_demande = d.id
                    LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    ORDER BY da.date_generation DESC
                `;
                params = [];

            } else if (roleNom.toLowerCase() === 'drh') {
                // DRH : voir les documents de son ministère
                const validateurQuery = `
                    SELECT a.id_ministere FROM agents a WHERE a.id = $1
                `;
                const validateurResult = await db.query(validateurQuery, [validateurId]);

                if (validateurResult.rows.length > 0) {
                    const idMinistere = validateurResult.rows[0].id_ministere;

                    query = `
                        SELECT da.*, d.type_demande, d.date_debut, d.date_fin,
                               a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                               s.libelle as service_nom, m.nom as ministere_nom
                        FROM documents_autorisation da
                        LEFT JOIN demandes d ON da.id_demande = d.id
                        LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        WHERE a.id_ministere = $1
                        ORDER BY da.date_generation DESC
                    `;
                    params = [idMinistere];
                }

            } else if (roleNom.toLowerCase() === 'chef_service') {
                // Chef de service : voir les documents de son service
                const validateurQuery = `
                    SELECT a.id_service, a.id_ministere FROM agents a WHERE a.id = $1
                `;
                const validateurResult = await db.query(validateurQuery, [validateurId]);

                if (validateurResult.rows.length > 0) {
                    const { id_service, id_ministere } = validateurResult.rows[0];

                    query = `
                        SELECT da.*, d.type_demande, d.date_debut, d.date_fin,
                               a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                               s.libelle as service_nom, m.nom as ministere_nom
                        FROM documents_autorisation da
                        LEFT JOIN demandes d ON da.id_demande = d.id
                        LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                        LEFT JOIN directions s ON a.id_direction = s.id
                        LEFT JOIN ministeres m ON a.id_ministere = m.id
                        WHERE a.id_service = $1 AND a.id_ministere = $2
                        ORDER BY da.date_generation DESC
                    `;
                    params = [id_service, id_ministere];
                }

            } else {
                // Autres rôles : voir seulement leurs propres documents
                query = `
                    SELECT da.*, d.type_demande, d.date_debut, d.date_fin,
                           a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                           s.libelle as service_nom, m.nom as ministere_nom
                    FROM documents_autorisation da
                    LEFT JOIN demandes d ON da.id_demande = d.id
                    LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                    LEFT JOIN directions s ON a.id_direction = s.id
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    WHERE da.id_agent_destinataire = $1
                    ORDER BY da.date_generation DESC
                `;
                params = [validateurId];
            }

            if (!query) {
                return [];
            }

            const result = await db.query(query, params);

            // Vérifier l'existence des fichiers PDF
            const documentsWithPDFStatus = await Promise.all(
                result.rows.map(async(doc) => {
                    const pdfExists = doc.chemin_fichier ?
                        await PDFGenerationService.pdfExists(doc.chemin_fichier) : false;

                    return {
                        ...doc,
                        pdf_available: pdfExists,
                        pdf_path: pdfExists ? doc.chemin_fichier : null
                    };
                })
            );

            return documentsWithPDFStatus;

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des documents du validateur:', error);
            throw error;
        }
    }

    /**
     * Génère un document d'autorisation de sortie du territoire
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateAutorisationSortieTerritoire(demande, agent, validateur) {
        try {
            console.log(`📄 Génération du document d'autorisation de sortie du territoire pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Importer le template spécifique
            const AutorisationSortieTerritoireTemplate = require('./AutorisationSortieTerritoireTemplate');

            // Générer le contenu HTML du document avec le template spécifique
            const contenuHTML = await AutorisationSortieTerritoireTemplate.generateHTML(demande, agent, validateur);

            // Créer le titre du document
            const titre = `Autorisation de Sortie du Territoire - ${agent.prenom} ${agent.nom} - ${demande.lieu}`;

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                demande.id,
                'autorisation_sortie_territoire',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document d'autorisation de sortie du territoire généré automatiquement lors de la validation de la demande ${demande.id}`
            ]);

            const documentId = result.rows[0].id;
            const dateGeneration = result.rows[0].date_generation;

            console.log(`✅ Document d'autorisation de sortie du territoire généré avec succès: ${documentId}`);

            return {
                id: documentId,
                type_document: 'autorisation_sortie_territoire',
                titre: titre,
                date_generation: dateGeneration,
                statut: 'generé'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document d\'autorisation de sortie du territoire:', error);
            throw error;
        }
    }

    /**
     * Génère une note de service pour un agent nouvellement inscrit
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} options - Options supplémentaires (date_effet, numero_certificat_prise_service)
     * @returns {Promise<Object>} - Le document généré}
     */
    static async generateNoteService(agent, validateur, options = {}) {
        try {
            console.log(`📄 Génération de la note de service pour l'agent ${agent.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document
            const contenuHTML = await this.generateNoteDeServiceHTML(agent, validateur, options);

            // Créer le titre du document
            const titre = `Note de Service - ${agent.prenom} ${agent.nom} - ${agent.matricule}`;

            // Générer un numéro de document unique (comptage par ministère)
            const documentNumber = await this.generateDocumentNumber('note_de_service', agent?.id_ministere ?? null);

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires,
                    date_generation
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                'note_de_service',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Note de service générée automatiquement lors de l'inscription de l'agent ${agent.id}. Numéro de document: ${documentNumber}`
            ]);

            const documentId = result.rows[0].id;
            const dateGeneration = result.rows[0].date_generation;

            console.log(`✅ Note de service générée avec succès: ${documentId}`);

            return {
                id: documentId,
                type_document: 'note_de_service',
                titre: titre,
                date_generation: dateGeneration,
                statut: 'generé',
                numero_document: documentNumber
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération de la note de service:', error);
            throw error;
        }
    }

    /**
     * Génère le HTML de la note de service
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires
     * @returns {string} - Le HTML généré
     */
    static async generateNoteDeServiceHTML(agent, validateur, options = {}) {
        // Date de génération
        const generationDate = options.date_generation ? new Date(options.date_generation) : new Date();
        
        // Récupérer les informations nécessaires
        const nameParts = formatNameParts(agent);
        const civilite = agent.civilite || (agent.sexe === 'F' ? 'Mlle' : 'M.');
        const prenoms = nameParts.prenoms;
        const nom = nameParts.nom;
        const matricule = agent.matricule || '';
        
        // Date de naissance formatée
        let dateNaissanceStr = '';
        let lieuNaissance = agent.lieu_de_naissance || '';
        if (agent.date_de_naissance) {
            const dateNaissance = new Date(agent.date_de_naissance);
            dateNaissanceStr = dateNaissance.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        // Fonction/Poste (emploi pour fonctionnaire, fonction pour autres - depuis emploi_agents / fonction_agents)
        const fonction = getAgentPosteOuEmploi(agent);
        
        // Récupérer le grade et l'échelon depuis les tables d'historique
        let grade = '';
        let echelon = '';
        
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
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération du grade et de l\'échelon:', error);
            }
        }
        
        // Si pas trouvé dans l'historique, utiliser les valeurs de l'objet agent
        if (!grade) {
            grade = agent.grade_libele || agent.grade_libelle || agent.grade || '';
        }
        if (!echelon) {
            echelon = agent.echelon_libelle || agent.echelon_libele || '';
        }
        
        // Classe et échelon
        let classeEchelon = '';
        if (agent.categorie_libele && echelon) {
            classeEchelon = `de ${agent.categorie_libele} ${echelon}`;
        } else if (agent.categorie_libele) {
            classeEchelon = `de ${agent.categorie_libele}`;
        }
        
        // Date d'entrée en fonction pour la classification
        let dateClassification = '';
        if (options.date_effet) {
            const dateEffet = new Date(options.date_effet);
            dateClassification = dateEffet.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        } else if (agent.date_embauche) {
            const dateEmbauche = new Date(agent.date_embauche);
            dateClassification = dateEmbauche.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        // Direction/Service d'affectation
        const direction = agent.direction_libelle || agent.service_libelle || agent.direction_nom || agent.service_nom || 'DIRECTION';
        
        // Déterminer le genre de l'agent pour la phrase d'affectation
        const genre = agent.sexe === 'F' ? 'F' : 'M';
        const phraseAffectation = formatAffectationPhrase(direction, genre);

        // Date d'effet
        const dateEffet = options.date_effet ? new Date(options.date_effet) : new Date();
        const dateEffetStr = dateEffet.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Date de génération formatée pour la phrase d'effet
        const generationDateStr = generationDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Numéro de certificat de première prise de service
        const numeroCertificat = options.numero_certificat_prise_service || '25109000921207/MINTOUR/DRH';

        // Préparer le header officiel
        const resolvedSigle = pickFirstNonEmptyString([
            agent?.ministere_sigle,
            validateur?.ministere_sigle
        ]);

        const ministryName = (validateur && (validateur.ministere_nom || validateur.ministereNom))
            || agent.ministere_nom || '';
        // Pour les notes de service, la direction dans le header doit toujours être "DIRECTION DES RESSOURCES HUMAINES"
        const directionName = 'DIRECTION DES RESSOURCES HUMAINES';

        // Numéro de document - Calculer dynamiquement en comptant les notes de service
        let numeroDocument = options.numero_document;
        if (!numeroDocument) {
            const documentId = options.documentId || options.document_id || null;
            let documentDateGeneration = options.date_generation || generationDate;
            
            // Si le document existe mais n'a pas de date_generation, utiliser la date actuelle ou la date de création
            if (documentId && !documentDateGeneration) {
                try {
                    const docQuery = await db.query(
                        'SELECT date_generation, created_at FROM documents_autorisation WHERE id = $1',
                        [documentId]
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
            
            let sequentialNumber = '';
            const idMinistere = agent?.id_ministere ?? null;
            try {
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
                    
                    const position = parseInt(positionResult.rows[0]?.position || 1, 10);
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
                    const count = parseInt(countResult.rows[0]?.count || 0, 10);
                    const nextNumber = count + 1;
                    sequentialNumber = String(nextNumber).padStart(4, '0');
                }
            } catch (error) {
                console.error('⚠️ Erreur lors du calcul du numéro de note de service:', error);
                // Fallback: utiliser generateSequentialNoteDeServiceDocumentNumber
                const { generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
                sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('note_de_service', documentId, idMinistere);
            }
            
            const sigle = resolvedSigle || '';
            
            // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS'
            const isMinTourismeEtLoisirs = ministryName && 
                ministryName.toUpperCase().includes('TOURISME') && 
                ministryName.toUpperCase().includes('LOISIRS');
            
            if (sigle) {
                if (isMinTourismeEtLoisirs) {
                    numeroDocument = `${sequentialNumber}/${sigle}/DRH/SDGP`;
                } else {
                    numeroDocument = `${sequentialNumber}/${sigle}`;
                }
            } else {
                numeroDocument = sequentialNumber;
            }
        }

        const headerHTML = buildHeaderHTML({
            documentNumber: numeroDocument,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Signature
        const signatureInfo = await resolveSignatureInfo(validateur, 'Le Directeur');
        const signatureHTML = renderSignatureHTML(signatureInfo);

        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Note de Service</title>
    <style>
        ${HEADER_CSS}
        body {
            font-family: 'Times New Roman', serif;
            font-size: 16px;
            line-height: 1.8;
            margin: 40px;
            color: #000;
        }
        .title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-decoration: underline;
            margin: 30px 0;
        }
        .content {
            text-align: justify;
            margin: 20px 0;
        }
        .content p {
            margin: 15px 0;
            text-indent: 0;
        }
        .agent-name {
            font-weight: bold;
        }
        .note-section {
            margin-top: 30px;
            font-weight: bold;
        }
        .note-section .note-label {
            font-weight: bold;
        }
        .signature-section {
            margin-top: 60px;
            text-align: right;
        }
        .signature-box {
            display: inline-block;
            text-align: right;
            min-width: 450px;
            max-width: 90%;
            padding: 20px;
        }
        .signature-line {
            margin: 5px 0;
            font-weight: bold;
            font-size: 19px;
            white-space: nowrap;
        }
    </style>
</head>
<body>
    ${headerHTML}
    
    <div class="title">NOTE DE SERVICE</div>
    
    <div class="content">
        <p>
            <span class="agent-name">${civilite} ${prenoms} ${nom}</span>, 
            matricule ${matricule}${dateNaissanceStr ? `, née le ${dateNaissanceStr}${lieuNaissance ? ` à ${lieuNaissance.toUpperCase()}` : ''}` : ''}, 
            ${fonction}${grade ? `, grade ${grade}` : ''}${classeEchelon ? `, ${classeEchelon}` : ''}${dateClassification ? ` au ${dateClassification}` : ''}, 
            ${phraseAffectation}.
        </p>
        <p>
            Conformément au CERT. DE 1ERE P. DE SERVICE n° ${numeroCertificat} du ${dateEffetStr}.
        </p>
    </div>
    
    <div class="content">
        <p>
            La présente note de service prend effet à compter du ${generationDateStr}.
        </p>
    </div>
    
    <div class="note-section">
        <p>
            <span class="note-label">N.B.:</span> Le Responsable chargé du Personnel devra adresser à la Direction des Ressources Humaines du Ministère, le certificat de prise de service de l'intéressé(e) dès sa prise de fonction.
        </p>
    </div>
    
    ${signatureHTML}
</body>
</html>`;
    }

    /**
     * Génère un document de mutation (Note de Service de Mutation)
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (DRH)
     * @param {Object} options - Options supplémentaires (id_direction_destination, direction_destination, date_effet, motif)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateMutation(demande, agent, validateur, options = {}) {
        try {
            console.log(`📄 Génération du document de mutation pour la demande ${demande.id}`);

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document
            const contenuHTML = await this.generateMutationHTML(demande, agent, validateur, options);

            // Créer le titre du document
            const titre = `Note de Service - Mutation - ${agent.prenom} ${agent.nom} - ${agent.matricule}`;

            // Générer un numéro de document unique (comptage par ministère)
            const documentNumber = await this.generateDocumentNumber('note_de_service_mutation', agent?.id_ministere ?? null);

            // Insérer le document dans la base de données
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, id_demande, commentaires,
                    date_generation
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                'note_de_service_mutation',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                demande.id,
                `Note de service de mutation générée automatiquement. Numéro de document: ${documentNumber}. Direction destination: ${options.direction_destination || 'Non spécifiée'}`
            ]);

            const documentId = result.rows[0].id;
            const dateGeneration = result.rows[0].date_generation;

            console.log(`✅ Note de service de mutation générée avec succès: ${documentId}`);

            return {
                id: documentId,
                type_document: 'note_de_service_mutation',
                titre: titre,
                date_generation: dateGeneration,
                statut: 'generé',
                numero_document: documentNumber
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération de la note de service de mutation:', error);
            throw error;
        }
    }

    /**
     * Génère le HTML de la note de service de mutation
     * @param {Object} demande - Les données de la demande
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur
     * @param {Object} options - Options supplémentaires (id_direction_destination, direction_destination, date_effet, motif)
     * @returns {Promise<string>} - Le HTML généré
     */
    static async generateMutationHTML(demande, agent, validateur, options = {}) {
        // Date de génération
        const generationDate = resolveDemandeGenerationDate(demande) || new Date();
        
        // Récupérer les informations nécessaires
        const nameParts = formatNameParts(agent);
        const civilite = agent.civilite || (agent.sexe === 'F' ? 'Mlle' : 'M.');
        const prenoms = nameParts.prenoms;
        const nom = nameParts.nom;
        const matricule = agent.matricule || '';
        
        // Date de naissance formatée
        let dateNaissanceStr = '';
        let lieuNaissance = agent.lieu_de_naissance || '';
        if (agent.date_de_naissance) {
            const dateNaissance = new Date(agent.date_de_naissance);
            dateNaissanceStr = dateNaissance.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        // Fonction/Poste (emploi pour fonctionnaire, fonction pour autres - depuis emploi_agents / fonction_agents)
        const fonction = getAgentPosteOuEmploi(agent);
        
        // Récupérer le grade et l'échelon depuis les tables d'historique
        let grade = '';
        let echelon = '';
        
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
            } catch (error) {
                console.error('⚠️ Erreur lors de la récupération du grade et de l\'échelon:', error);
            }
        }
        
        // Si pas trouvé dans l'historique, utiliser les valeurs de l'objet agent
        if (!grade) {
            grade = agent.grade_libele || agent.grade_libelle || agent.grade || '';
        }
        if (!echelon) {
            if (agent.echelon_libelle) {
                echelon = agent.echelon_libelle;
            } else if (agent.echelon_libele) {
                echelon = agent.echelon_libele;
            }
        }
        
        // Fonction helper pour parser les dates sans problème de fuseau horaire
        const parseDateLocal = (dateString) => {
            if (!dateString) return null;
            if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Format YYYY-MM-DD : parser manuellement pour éviter les problèmes de fuseau horaire
                const parts = dateString.split('-');
                return new Date(
                    parseInt(parts[0]),   // année
                    parseInt(parts[1]) - 1, // mois (0-indexé)
                    parseInt(parts[2])      // jour
                );
            }
            return new Date(dateString);
        };

        // Date d'entrée en fonction pour la classification
        let dateClassification = '';
        if (options.date_effet) {
            const dateEffet = parseDateLocal(options.date_effet);
            dateClassification = dateEffet.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        } else if (agent.emploi_date_entree || agent.date_embauche) {
            const dateEntree = parseDateLocal(agent.emploi_date_entree || agent.date_embauche);
            dateClassification = dateEntree.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
        }

        // Direction/Service de destination
        const directionDestination = options.direction_destination || agent.direction_libelle || agent.service_libelle || 'DIRECTION';

        // Date d'effet - Utiliser parseDateLocal pour éviter les décalages de fuseau horaire
        const dateEffet = options.date_effet ? parseDateLocal(options.date_effet) : generationDate;
        const dateEffetStr = dateEffet.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Date de génération formatée pour la phrase d'effet
        const generationDateStr = generationDate.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Préparer le header officiel
        const resolvedSigle = pickFirstNonEmptyString([
            agent?.ministere_sigle,
            validateur?.ministere_sigle
        ]);

        const ministryName = (validateur && (validateur.ministere_nom || validateur.ministereNom))
            || agent.ministere_nom || '';
        // Pour les notes de service mutation, la direction dans le header doit toujours être "DIRECTION DES RESSOURCES HUMAINES"
        const directionName = 'DIRECTION DES RESSOURCES HUMAINES';

        // Numéro de document - Calculer dynamiquement en comptant les notes de service de mutation
        let numeroDocument = options.numero_document;
        if (!numeroDocument) {
            const documentId = options.documentId || options.document_id || null;
            let documentDateGeneration = options.date_generation || generationDate;
            
            // Si le document existe mais n'a pas de date_generation, utiliser la date actuelle ou la date de création
            if (documentId && !documentDateGeneration) {
                try {
                    const docQuery = await db.query(
                        'SELECT date_generation, created_at FROM documents_autorisation WHERE id = $1',
                        [documentId]
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
            
            let sequentialNumber = '';
            const idMinistere = agent?.id_ministere ?? null;
            try {
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
                const { generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
                sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('note_de_service_mutation', documentId, idMinistere);
            }
            
            const sigle = resolvedSigle || '';
            
            // Vérifier si le ministère est 'MINISTERE DU TOURISME ET DES LOISIRS'
            const isMinTourismeEtLoisirs = ministryName && 
                ministryName.toUpperCase().includes('TOURISME') && 
                ministryName.toUpperCase().includes('LOISIRS');
            
            if (sigle) {
                if (isMinTourismeEtLoisirs) {
                    numeroDocument = `${sequentialNumber}/${sigle}/DRH/SDGP`;
                } else {
                    numeroDocument = `${sequentialNumber}/${sigle}`;
                }
            } else {
                numeroDocument = sequentialNumber;
            }
        }

        const headerHTML = buildHeaderHTML({
            documentNumber: numeroDocument,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Signature
        const signatureInfo = await resolveSignatureInfo(validateur, 'Le Directeur');
        const signatureHTML = renderSignatureHTML(signatureInfo);

        // Construire le texte de mutation
        let mutationText = `est mutée à la ${directionDestination.toUpperCase()}.`;
        if (options.motif) {
            mutationText += `\n\nConformément à ${options.motif}.`;
        }

        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Note de Service - Mutation</title>
    <style>
        ${HEADER_CSS}
        body {
            font-family: 'Times New Roman', serif;
            font-size: 16px;
            line-height: 1.8;
            margin: 40px;
            color: #000;
        }
        .title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-decoration: underline;
            margin: 30px 0;
        }
        .content {
            text-align: justify;
            margin: 20px 0;
        }
        .content p {
            margin: 15px 0;
            text-indent: 0;
        }
        .agent-name {
            font-weight: bold;
        }
        .note-section {
            margin-top: 30px;
            font-weight: bold;
        }
        .note-section .note-label {
            font-weight: bold;
        }
        .signature-section {
            margin-top: 60px;
            text-align: right;
        }
        .signature-box {
            display: inline-block;
            text-align: right;
            min-width: 450px;
            max-width: 90%;
            padding: 20px;
        }
        .signature-line {
            margin: 5px 0;
            font-weight: bold;
            font-size: 19px;
            white-space: nowrap;
        }
    </style>
</head>
<body>
    ${headerHTML}
    
    <div class="title">NOTE DE SERVICE</div>
    
    <div class="content">
        <p>
            <span class="agent-name">${civilite} ${prenoms} ${nom}</span>, 
            matricule ${matricule}${dateNaissanceStr ? `, née le ${dateNaissanceStr}${lieuNaissance ? ` à ${lieuNaissance.toUpperCase()}` : ''}` : ''}, 
            ${fonction}${grade ? `, grade ${grade}` : ''}${echelon ? `, échelon ${echelon}` : ''}${dateClassification ? ` au ${dateClassification}` : ''}, 
            ${mutationText}
        </p>
    </div>
    
    <div class="content">
        <p>
            La présente note de service prend effet à compter du ${generationDateStr}.
        </p>
    </div>
    
    <div class="note-section">
        <p>
            <span class="note-label">N.B.:</span> Le Responsable chargé du Personnel devra adresser à la Direction des Ressources Humaines du Ministère, le certificat de prise de service de l'intéressé(e) dès sa prise de fonction.
        </p>
    </div>
    
    ${signatureHTML}
</body>
</html>`;
    }

    /**
     * Génère un document de certificat de prise de service
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (Directeur/DRH)
     * @param {Object} options - Options supplémentaires (date_prise_service)
     * @returns {Promise<Object>} - Le document généré
     */
    static async generateCertificatPriseService(agent, validateur, options = {}) {
        try {
            console.log(`📄 Génération du document de certificat de prise de service pour l'agent ${agent.id}`);
            console.log('📄 OPTIONS REÇUES:', {
                date_prise_service: options.date_prise_service,
                type: typeof options.date_prise_service,
                is_date: options.date_prise_service instanceof Date,
                iso: options.date_prise_service instanceof Date ? options.date_prise_service.toISOString() : 'N/A'
            });

            await hydrateAgentWithLatestFunction(validateur);
            await attachActiveSignature(validateur);

            // Générer le contenu HTML du document
            const contenuHTML = await this.generateCertificatPriseServiceHTML(agent, validateur, options);

            // Créer le titre du document
            const datePriseService = options.date_prise_service || new Date();
            const datePriseServiceStr = datePriseService instanceof Date 
                ? datePriseService.toLocaleDateString('fr-FR')
                : new Date(datePriseService).toLocaleDateString('fr-FR');
            const titre = `Certificat de Prise de Service - ${agent.prenom} ${agent.nom} - ${datePriseServiceStr}`;

            // Insérer le document dans la base de données
            // Note: id_demande est NULL car ce document n'est pas lié à une demande
            const insertQuery = `
                INSERT INTO documents_autorisation (
                    id_demande, type_document, titre, contenu, statut,
                    id_agent_generateur, id_agent_destinataire, commentaires
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, date_generation
            `;

            const result = await db.query(insertQuery, [
                null, // id_demande est NULL pour les certificats de prise de service
                'certificat_prise_service',
                titre,
                contenuHTML,
                'generé',
                validateur.id,
                agent.id,
                `Document généré automatiquement pour l'agent ${agent.id}`
            ]);

            const document = result.rows[0];

            console.log(`✅ Document de certificat de prise de service généré avec succès (ID: ${document.id})`);

            // Générer le PDF avec PDFKit en arrière-plan
            PDFKitGenerationService.generatePDFForDocument(document)
                .then(pdfPath => {
                    // Mettre à jour le document avec le chemin du PDF
                    const updateQuery = `
                        UPDATE documents_autorisation 
                        SET chemin_fichier = $1, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    return db.query(updateQuery, [pdfPath, document.id]);
                })
                .then(() => {
                    console.log(`📄 PDF de certificat de prise de service généré pour le document ${document.id}`);
                })
                .catch(error => {
                    console.error(`❌ Erreur lors de la génération du PDF de certificat de prise de service pour le document ${document.id}:`, error);
                });

            return {
                success: true,
                id: document.id,
                document_id: document.id,
                titre: titre,
                type_document: 'certificat_prise_service',
                date_generation: document.date_generation,
                message: 'Document de certificat de prise de service généré avec succès'
            };

        } catch (error) {
            console.error('❌ Erreur lors de la génération du document de certificat de prise de service:', error);
            throw error;
        }
    }

    /**
     * Génère le contenu HTML du certificat de prise de service
     * @param {Object} agent - Les données de l'agent
     * @param {Object} validateur - Les données du validateur (Directeur/DRH)
     * @param {Object} options - Options supplémentaires (date_prise_service)
     * @returns {Promise<String>} - Le contenu HTML du document
     */
    static async generateCertificatPriseServiceHTML(agent, validateur, options = {}) {
        const db = require('../config/database');
        
        // Date de génération
        const generationDate = new Date();
        
        // Récupérer les informations nécessaires
        const nameParts = formatNameParts(agent);
        const civilite = agent.civilite || (agent.sexe === 'F' ? 'Mlle' : 'M.');
        const prenoms = nameParts.prenoms;
        const nom = nameParts.nom;
        const matricule = agent.matricule || '';
        
        // Fonction/Poste de l'agent (emploi pour fonctionnaire, fonction pour autres - depuis emploi_agents / fonction_agents)
        const fonction = getAgentPosteOuEmploi(agent);
        
        // Direction/Service d'affectation de l'agent (toujours utiliser la direction de l'agent dans le texte)
        const directionAgent = agent.direction_libelle || agent.service_libelle || agent.direction_nom || agent.service_nom || 'DIRECTION';
        
        // Vérifier si l'agent est à la Direction des Ressources Humaines (pour déterminer le signataire et le soulignement)
        const isDirectionRH = directionAgent && (
            directionAgent.toUpperCase().includes('RESSOURCES HUMAINES') ||
            directionAgent.toUpperCase().includes('DRH')
        );
        
        // Déterminer le signataire : si l'agent est à la DRH, utiliser le DRH, sinon le Directeur de la direction
        let signataire = validateur;
        if (isDirectionRH) {
            // Si l'agent est à la DRH, le signataire est le DRH
            // Le validateur devrait déjà être le DRH dans ce cas
            signataire = validateur;
        }
        
        // Formater le nom du signataire avec "épouse" si applicable
        // Format dans l'image: "Yawa Florentine ASSARI épouse AKPALE" (prénoms + nom + épouse + nom époux)
        const validateurNameParts = formatNameParts(signataire);
        let signataireNomComplet = validateurNameParts.fullWithCivilite;
        // Ajouter "épouse" si le signataire est une femme mariée (on peut vérifier dans les données si disponible)
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
        
        // Déterminer le genre du signataire pour "soussigné(e)"
        const signataireGenre = signataire.sexe === 'F' ? 'e' : '';
        
        // Date de prise de service
        // Priorité ABSOLUE: options.date_prise_service (fournie explicitement) > date_prise_service_dans_la_direction > date_prise_service > date_embauche
        // IMPORTANT: Si options.date_prise_service existe, elle DOIT être utilisée en priorité absolue
        let datePriseService = null;
        
        console.log('🔍 Vérification des dates disponibles dans generateCertificatPriseServiceHTML:');
        console.log('  - options.date_prise_service:', options.date_prise_service, typeof options.date_prise_service, options.date_prise_service instanceof Date);
        console.log('  - agent.date_prise_service_dans_la_direction:', agent.date_prise_service_dans_la_direction, typeof agent.date_prise_service_dans_la_direction);
        console.log('  - agent.date_prise_service:', agent.date_prise_service, typeof agent.date_prise_service);
        console.log('  - agent.date_embauche:', agent.date_embauche, typeof agent.date_embauche);
        
        // PRIORITÉ ABSOLUE: options.date_prise_service
        if (options.date_prise_service) {
            // La date a été fournie explicitement dans les options, l'utiliser en priorité absolue
            datePriseService = options.date_prise_service;
            console.log('✅ [PRIORITÉ 1] Utilisation de la date fournie dans options.date_prise_service:', datePriseService);
            if (datePriseService instanceof Date) {
                console.log('  → Date ISO:', datePriseService.toISOString());
                console.log('  → Date formatée:', datePriseService.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
            }
        } else if (agent.date_prise_service_dans_la_direction) {
            datePriseService = agent.date_prise_service_dans_la_direction;
            console.log('✅ [PRIORITÉ 2] Utilisation de agent.date_prise_service_dans_la_direction:', datePriseService);
        } else if (agent.date_prise_service) {
            datePriseService = agent.date_prise_service;
            console.log('✅ [PRIORITÉ 3] Utilisation de agent.date_prise_service:', datePriseService);
        } else if (agent.date_embauche) {
            datePriseService = agent.date_embauche;
            console.log('✅ [PRIORITÉ 4] Utilisation de agent.date_embauche:', datePriseService);
        } else {
            datePriseService = new Date();
            console.log('⚠️ [DERNIER RECOURS] Aucune date disponible, utilisation de la date actuelle:', datePriseService);
        }
        
        console.log('📅 Date de prise de service dans generateCertificatPriseServiceHTML:', {
            options_date_prise_service: options.date_prise_service,
            agent_date_prise_service_dans_la_direction: agent.date_prise_service_dans_la_direction,
            agent_date_prise_service: agent.date_prise_service,
            agent_date_embauche: agent.date_embauche,
            date_finale_selectionnee: datePriseService,
            type_date_finale: typeof datePriseService,
            is_date_object: datePriseService instanceof Date
        });
        
        // Convertir en objet Date si nécessaire
        let datePriseServiceObj = datePriseService instanceof Date 
            ? datePriseService 
            : new Date(datePriseService);
            
        // Vérifier que la date est valide
        if (isNaN(datePriseServiceObj.getTime())) {
            console.error('❌ Date de prise de service invalide dans HTML, utilisation de la date actuelle');
            datePriseServiceObj = new Date();
        }
        
        const datePriseServiceStr = datePriseServiceObj.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
        
        console.log('✅ Date de prise de service formatée pour HTML:', datePriseServiceStr);
        
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
                                validateur?.ministere_sigle || '';
                    
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
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
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
        
        // Construire le texte principal selon le format de l'image
        // Format: "Je soussigné(e), [Nom signataire], [Fonction], certifie que [Civilité] [Nom] [Prénoms], matricule [matricule], [Fonction], a effectivement pris service à la [Direction] le [date], conformément à la note de service N° [numéro] du [date]."
        
        // Récupérer la direction du validateur (signataire) pour construire la phrase dynamiquement
        const validateurDirectionName = (signataire && (signataire.direction_nom || signataire.service_nom || signataire.structure_nom)) ||
                                        (validateur && (validateur.direction_nom || validateur.service_nom || validateur.structure_nom)) ||
                                        '';
        
        // Récupérer le nom du ministère
        const ministryNameForText = (signataire && (signataire.ministere_nom || signataire.ministereNom))
            || agent.ministere_nom || '';
        
        // Construire la phrase selon la direction (éviter "Directeur de Direction...")
        let fonctionTexte = validateurDirectionName ? formatDirecteurFromDirection(validateurDirectionName) : signataireFonction;
        
        // Construire le texte principal
        let textePrincipal = `Je soussigné${signataireGenre}, <strong>${signataireNomComplet}</strong>, ${fonctionTexte}`;
        
        // Ajouter le nom du ministère si disponible
        if (ministryNameForText) {
            textePrincipal += ` du ${ministryNameForText}`;
        }
        
        // Format du nom de l'agent : "Monsieur TANO Kouakou Habib" (civilité + nom + prénoms)
        textePrincipal += `, certifie que <strong>${civilite} ${nom} ${prenoms}</strong>, matricule ${matricule}, <strong>${fonction}</strong>`;
        
        // Ajouter la direction de l'agent (sans soulignement)
        // La direction affichée est toujours celle de l'agent, peu importe le signataire
        textePrincipal += `, a effectivement pris service à la ${directionAgent} le ${datePriseServiceStr}`;
        
        // Ajouter la référence à la note de service si disponible
        if (noteServiceReference && noteServiceDate) {
            textePrincipal += `, conformément à la note de service N° ${noteServiceReference} du ${noteServiceDate}`;
        }
        
        textePrincipal += '.';
        
        // Préparer le header officiel
        // Pour le certificat de prise de service, la direction et le ministère dans le header doivent être ceux du validateur
        const resolvedSigle = pickFirstNonEmptyString([
            agent?.ministere_sigle,
            validateur?.ministere_sigle
        ]);

        // Utiliser le ministère du validateur pour le header (pas celui de l'agent)
        const ministryName = (validateur && (validateur.ministere_nom || validateur.ministereNom))
            || (userInfo && userInfo.ministere_nom)
            || agent.ministere_nom || '';
        
        // Utiliser la direction du validateur pour le header (pas celle de l'agent)
        const directionName = (validateur && (validateur.direction_nom || validateur.directionNom || validateur.service_nom))
            || (userInfo && (userInfo.direction_nom || userInfo.service_nom))
            || agent.direction_nom || agent.service_nom || direction || '';

        // Numéro de document - Calculer dynamiquement en comptant les certificats de prise de service
        let numeroDocument = options.numero_document;
        if (!numeroDocument) {
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
            
            const idMinistere = agent?.id_ministere ?? validateur?.id_ministere ?? null;
            try {
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
                    const positionParams = idMinistere != null ? [documentDateGeneration, documentId, idMinistere] : [documentDateGeneration, documentId];
                    const positionResult = await db.query(positionQuery, positionParams);
                    
                    const position = parseInt(positionResult.rows[0]?.position || 1, 10);
                    const paddedPosition = String(position).padStart(5, '0');
                    
                    // Vérifier si c'est le ministère du tourisme et des loisirs
                    const ministereNom = agent?.ministere_nom || 
                                        validateur?.ministere_nom || '';
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
                    // Si le document n'existe pas encore, compter tous les certificats (par ministère) et ajouter 1
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
                    const nextNumber = count + 1;
                    const paddedPosition = String(nextNumber).padStart(5, '0');
                    
                    // Vérifier si c'est le ministère du tourisme et des loisirs
                    const ministereNom = agent?.ministere_nom || 
                                        validateur?.ministere_nom || '';
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
                // En cas d'erreur, utiliser generateSequentialNoteDeServiceDocumentNumber comme fallback
                const { generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
                const sequentialNumber = await generateSequentialNoteDeServiceDocumentNumber('certificat_prise_service', null, idMinistere);
                const sigle = resolvedSigle || '';
                
                if (sigle) {
                    numeroDocument = `${sequentialNumber}/${sigle}`;
                } else {
                    numeroDocument = sequentialNumber;
                }
            }
        }

        const headerHTML = buildHeaderHTML({
            documentNumber: numeroDocument,
            dateString: generationDate,
            generatedAt: generationDate,
            city: 'Abidjan',
            ministryName,
            directionName
        });

        // Signature
        const signatureInfo = await resolveSignatureInfo(signataire, 'Le Directeur');
        const signatureHTML = renderSignatureHTML(signatureInfo);

        return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificat de Prise de Service</title>
    <style>
        ${HEADER_CSS}
        body {
            font-family: 'Times New Roman', serif;
            font-size: 16px;
            line-height: 1.8;
            margin: 40px;
            color: #000;
        }
        .document-title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            text-decoration: underline;
            margin: 40px 0;
            padding: 15px;
        }
        .content {
            text-align: left;
            margin: 30px 0;
            text-align: justify;
        }
        .content p {
            margin: 15px 0;
            line-height: 1.8;
        }
        .signature-section {
            margin-top: 80px;
            text-align: right;
        }
        .signature-box {
            display: inline-block;
            text-align: right;
            min-width: 450px;
            max-width: 90%;
            padding: 20px;
        }
        .signature-line {
            margin: 5px 0;
            font-weight: bold;
            font-size: 19px;
            white-space: nowrap;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    ${headerHTML}
    
    <div class="document-title">CERTIFICAT DE PRISE DE SERVICE</div>
    
    <div class="content">
        <p>${textePrincipal}</p>
        <p>En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.</p>
    </div>
    
    ${signatureHTML}
    
    <div class="footer">
        <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
        <p>Document généré le ${formatFullFrenchDate(generationDate)}</p>
    </div>
</body>
</html>`;
    }

    /**
     * Génère un numéro de document unique (comptage par ministère pour tous les types).
     * @param {string} typeDocument - Type de document (note_de_service, note_de_service_mutation, autorisation_absence, certificat_cessation, etc.)
     * @param {number} idMinistere - ID du ministère (optionnel). Si fourni, le comptage est fait par ministère.
     * @returns {Promise<string>} - Numéro de document formaté (ex: "0001")
     */
    static async generateDocumentNumber(typeDocument, idMinistere = null) {
        try {
            const { generateSequentialNoteDeServiceDocumentNumber } = require('./utils/documentReference');
            return await generateSequentialNoteDeServiceDocumentNumber(typeDocument, null, idMinistere);
        } catch (error) {
            console.error('❌ Erreur lors de la génération du numéro de document:', error);
            return String(Date.now() % 10000).padStart(4, '0');
        }
    }
}

module.exports = DocumentGenerationService;