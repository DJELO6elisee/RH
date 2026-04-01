const MemoryPDFService = require('../services/MemoryPDFService');
const DocumentGenerationService = require('../services/DocumentGenerationService');

class PDFController {

    /**
     * Génère et retourne un PDF d'autorisation d'absence à partir d'une demande
     */
    static async generatePDFFromDemande(req, res) {
        try {
            const { demandeId } = req.params;
            const { action = 'download' } = req.query; // 'download', 'view', 'print'

            console.log(`📄 Génération PDF en mémoire pour la demande ${demandeId}...`);

            // Récupérer les informations de l'utilisateur connecté
            const userInfo = await PDFController.getUserInfo(req.user.id);

            // Générer le PDF en mémoire avec les informations de l'utilisateur
            const pdfBuffer = await MemoryPDFService.generatePDFFromDemandeId(demandeId, userInfo);

            // Nom du fichier
            const fileName = `autorisation_absence_${demandeId}_${Date.now()}.pdf`;

            // Configurer les headers selon l'action
            if (action === 'view') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
            } else if (action === 'print') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
                res.setHeader('Cache-Control', 'no-cache');
            } else {
                // download par défaut
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
            }

            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            // Envoyer le PDF
            res.send(pdfBuffer);

            console.log(`✅ PDF généré et envoyé pour la demande ${demandeId}`);

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la génération du PDF',
                details: error.message
            });
        }
    }

    /**
     * Génère et retourne un PDF d'autorisation d'absence à partir d'un document existant
     */
    static async generatePDFFromDocument(req, res) {
        try {
            const { documentId } = req.params;
            const { action = 'download' } = req.query; // 'download', 'view', 'print'

            console.log(`📄 Génération PDF en mémoire pour le document ${documentId}...`);

            // Récupérer les informations de l'utilisateur connecté
            const userInfo = await PDFController.getUserInfo(req.user.id);

            // Générer le PDF en mémoire avec les informations de l'utilisateur
            const pdfBuffer = await MemoryPDFService.generatePDFFromDocumentId(documentId, userInfo);

            // Déterminer le nom du fichier selon le type de document
            const documentInfo = await PDFController.getDocumentInfo(documentId);
            const typeDoc = documentInfo.type_document || 'document';
            const fileName = `${typeDoc}_${documentId}_${Date.now()}.pdf`;

            // Configurer les headers selon l'action
            if (action === 'view') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
            } else if (action === 'print') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
                res.setHeader('Cache-Control', 'no-cache');
            } else {
                // download par défaut
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
            }

            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            // Envoyer le PDF
            res.send(pdfBuffer);

            console.log(`✅ PDF généré et envoyé pour le document ${documentId}`);

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la génération du PDF',
                details: error.message
            });
        }
    }

    /**
     * Génère un PDF d'autorisation d'absence directement à partir des données fournies
     */
    static async generatePDFFromData(req, res) {
        try {
            const { demande, agent, validateur } = req.body;
            const { action = 'download' } = req.query;

            console.log(`📄 Génération PDF en mémoire à partir des données fournies...`);

            // Vérifier que toutes les données nécessaires sont présentes
            if (!demande || !agent || !validateur) {
                return res.status(400).json({
                    success: false,
                    error: 'Données manquantes. Les objets demande, agent et validateur sont requis.'
                });
            }

            // Générer le PDF en mémoire
            const pdfBuffer = await MemoryPDFService.generateAutorisationAbsencePDFBuffer(demande, agent, validateur);

            // Nom du fichier
            const fileName = `autorisation_absence_${agent.prenom}_${agent.nom}_${Date.now()}.pdf`;

            // Configurer les headers selon l'action
            if (action === 'view') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
            } else if (action === 'print') {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline; filename="' + fileName + '"');
                res.setHeader('Cache-Control', 'no-cache');
            } else {
                // download par défaut
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename="' + fileName + '"');
            }

            res.setHeader('Content-Length', pdfBuffer.length);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

            // Envoyer le PDF
            res.send(pdfBuffer);

            console.log(`✅ PDF généré et envoyé à partir des données fournies`);

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur lors de la génération du PDF',
                details: error.message
            });
        }
    }

    /**
     * Retourne les informations d'une demande pour génération PDF (pour le frontend)
     */
    static async getDemandeInfoForPDF(req, res) {
        try {
            const { demandeId } = req.params;

            console.log(`📋 Récupération des informations pour génération PDF - Demande ${demandeId}...`);

            // Récupérer les informations de la demande
            const db = require('../config/database');
            const query = `
                SELECT 
                    d.*,
                    a.prenom as agent_prenom, a.nom as agent_nom, a.matricule, a.sexe, a.fonction_actuelle as poste,
                    c.libele as civilite,
                    s.libelle as service_nom,
                    m.nom as ministere_nom,
                    drh.prenom as validateur_prenom, drh.nom as validateur_nom
                FROM demandes d
                LEFT JOIN agents a ON d.id_agent = a.id
                LEFT JOIN civilites c ON a.id_civilite = c.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents drh ON d.id_drh = drh.id
                WHERE d.id = $1
            `;

            const result = await db.query(query, [demandeId]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Demande non trouvée'
                });
            }

            const row = result.rows[0];

            // Préparer les données pour le frontend
            const demandeInfo = {
                demande: {
                    id: row.id,
                    date_debut: row.date_debut,
                    date_fin: row.date_fin,
                    description: row.description,
                    commentaire_drh: row.commentaire_drh,
                    type_demande: row.type_demande,
                    statut: row.statut
                },
                agent: {
                    prenom: row.agent_prenom,
                    nom: row.agent_nom,
                    matricule: row.matricule,
                    civilite: row.civilite,
                    sexe: row.sexe,
                    poste: row.poste,
                    service_nom: row.service_nom,
                    ministere_nom: row.ministere_nom
                },
                validateur: {
                    prenom: row.validateur_prenom,
                    nom: row.validateur_nom
                }
            };

            res.json({
                success: true,
                data: demandeInfo
            });

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des informations:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    /**
     * Récupère les informations de l'utilisateur connecté (ministère et service)
     * @param {number} userId - L'ID de l'utilisateur
     * @returns {Promise<Object>} - Les informations de l'utilisateur
     */
    static async getUserInfo(userId) {
        try {
            const db = require('../config/database');

            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    a.prenom, a.nom, a.matricule,
                    s.libelle as service_nom,
                    m.nom as ministere_nom,
                    r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN agents a ON u.id_agent = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.id = $1
            `;

            const result = await db.query(query, [userId]);

            if (result.rows.length === 0) {
                throw new Error('Utilisateur non trouvé');
            }

            return result.rows[0];

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des informations utilisateur:', error);
            throw error;
        }
    }

    /**
     * Récupère les informations d'un document par son ID
     * @param {number} documentId - L'ID du document
     * @returns {Promise<Object>} - Les informations du document
     */
    static async getDocumentInfo(documentId) {
        try {
            const db = require('../config/database');

            const query = `
                SELECT da.type_document, d.type_demande
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                WHERE da.id = $1
            `;

            const result = await db.query(query, [documentId]);

            if (result.rows.length === 0) {
                throw new Error('Document non trouvé');
            }

            return result.rows[0];

        } catch (error) {
            console.error('❌ Erreur lors de la récupération des informations du document:', error);
            throw error;
        }
    }
}

module.exports = PDFController;