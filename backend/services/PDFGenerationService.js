const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const PDFKitGenerationService = require('./PDFKitGenerationService');
const { getCrestDataUri, getCrestImagePath } = require('./officialHeader');

function computeCrestMimeType(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return 'image/png';
    }
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.jpg' || extension === '.jpeg') {
        return 'image/jpeg';
    }
    if (extension === '.webp') {
        return 'image/webp';
    }
    return 'image/png';
}

function buildTransparentCrestDataUri() {
    const crestPath = typeof getCrestImagePath === 'function' ? getCrestImagePath() : null;
    if (crestPath && fsSync.existsSync(crestPath)) {
        try {
            const buffer = fsSync.readFileSync(crestPath);
            if (buffer && buffer.length) {
                const mime = computeCrestMimeType(crestPath);
                return `data:${mime};base64,${buffer.toString('base64')}`;
            }
        } catch (error) {
            // Ignorer et tenter la suite
        }
    }
    if (typeof getCrestDataUri === 'function') {
        return getCrestDataUri();
    }
    return null;
}

function injectTransparentCrest(html, crestDataUri) {
    if (!html || typeof html !== 'string' || !crestDataUri) {
        return html;
    }

    const crestSrcRegex = /(src\s*=\s*)(["'])([^"']*(?:logo-armoirie|photo-logo|amoirie)[^"']*)(\2)/gi;
    let updatedHtml = html.replace(crestSrcRegex, (_match, prefix, quote) => `${prefix}${quote}${crestDataUri}${quote}`);

    const crestUrlRegex = /url\((['"]?)[^"')]*(?:logo-armoirie|photo-logo|amoirie)[^"')]*\1\)/gi;
    updatedHtml = updatedHtml.replace(crestUrlRegex, () => `url('${crestDataUri}')`);

    return updatedHtml;
}

class PDFGenerationService {

    /**
     * Génère un PDF à partir du contenu HTML d'un document
     * @param {Object} document - Le document à convertir en PDF
     * @param {string} outputPath - Chemin de sortie pour le PDF
     * @returns {Promise<string>} - Le chemin du fichier PDF généré
     */
    static async generatePDFFromHTML(document, outputPath) {
        let browser = null;

        try {
            console.log(`📄 Génération du PDF pour le document ${document.id}...`);

            // Créer le répertoire de sortie s'il n'existe pas
            const outputDir = path.dirname(outputPath);
            await fs.mkdir(outputDir, { recursive: true });

            // Lancer Puppeteer
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();

            // Définir la taille de la page
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: 2
            });

            // Charger le contenu HTML
            const crestDataUri = buildTransparentCrestDataUri();
            const rawHtml = typeof document.contenu === 'string' ? document.contenu : '';
            const htmlContent = injectTransparentCrest(rawHtml, crestDataUri);

            await page.setContent(htmlContent, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Générer le PDF avec les options
            const pdfOptions = {
                path: outputPath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                },
                displayHeaderFooter: true,
                headerTemplate: `
                    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 auto;">
                        Document officiel - Ministère du Tourisme
                    </div>
                `,
                footerTemplate: `
                    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 auto;">
                        Page <span class="pageNumber"></span> sur <span class="totalPages"></span> - 
                        Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                    </div>
                `
            };

            await page.pdf(pdfOptions);

            console.log(`✅ PDF généré avec succès: ${outputPath}`);

            return outputPath;

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Génère un PDF pour un document d'autorisation d'absence
     * @param {Object} document - Le document d'autorisation d'absence
     * @param {boolean} usePDFKit - Utiliser PDFKit au lieu de Puppeteer (par défaut: true)
     * @returns {Promise<string>} - Le chemin relatif du PDF généré
     */
    static async generateAutorisationAbsencePDF(document, usePDFKit = true) {
        try {
            if (usePDFKit) {
                // Utiliser PDFKit pour une génération conforme au modèle officiel
                console.log(`📄 Génération du PDF avec PDFKit pour le document ${document.id}...`);
                return await PDFKitGenerationService.generatePDFForDocument(document);
            } else {
                // Utiliser Puppeteer pour la génération HTML existante
                console.log(`📄 Génération du PDF avec Puppeteer pour le document ${document.id}...`);

                // Créer un nom de fichier unique
                const timestamp = Date.now();
                const fileName = `autorisation_absence_${document.id}_${timestamp}.pdf`;

                // Chemin complet vers le fichier PDF
                const outputPath = path.join(__dirname, '..', 'uploads', 'documents', fileName);

                // Générer le PDF
                const pdfPath = await this.generatePDFFromHTML(document, outputPath);

                // Retourner le chemin relatif pour la base de données
                const relativePath = `uploads/documents/${fileName}`;

                return relativePath;
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération du PDF d\'autorisation:', error);
            throw error;
        }
    }

    /**
     * Génère un PDF pour tous les documents qui n'en ont pas encore
     * @param {boolean} usePDFKit - Utiliser PDFKit au lieu de Puppeteer (par défaut: true)
     * @returns {Promise<Array>} - Liste des documents mis à jour
     */
    static async generateMissingPDFs(usePDFKit = true) {
        try {
            if (usePDFKit) {
                // Utiliser PDFKit pour tous les PDFs manquants
                return await PDFKitGenerationService.generateMissingPDFsWithPDFKit();
            } else {
                // Utiliser Puppeteer pour tous les PDFs manquants
                const db = require('../config/database');

                console.log('🔍 Recherche des documents sans PDF (Puppeteer)...');

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
                        console.log(`📄 Génération du PDF (Puppeteer) pour le document ${document.id}...`);

                        const pdfPath = await this.generateAutorisationAbsencePDF(document, false);

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
                            method: 'puppeteer'
                        });

                        console.log(`✅ PDF (Puppeteer) généré pour le document ${document.id}: ${pdfPath}`);

                    } catch (error) {
                        console.error(`❌ Erreur pour le document ${document.id}:`, error);
                        updatedDocuments.push({
                            id: document.id,
                            status: 'error',
                            error: error.message,
                            method: 'puppeteer'
                        });
                    }
                }

                return updatedDocuments;
            }

        } catch (error) {
            console.error('❌ Erreur lors de la génération des PDFs manquants:', error);
            throw error;
        }
    }

    /**
     * Vérifie si un fichier PDF existe
     * @param {string} filePath - Chemin vers le fichier PDF
     * @returns {Promise<boolean>} - True si le fichier existe
     */
    static async pdfExists(filePath) {
        try {
            const fullPath = path.join(__dirname, '..', filePath);
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Supprime un fichier PDF
     * @param {string} filePath - Chemin vers le fichier PDF
     * @returns {Promise<boolean>} - True si supprimé avec succès
     */
    static async deletePDF(filePath) {
        try {
            const fullPath = path.join(__dirname, '..', filePath);
            await fs.unlink(fullPath);
            console.log(`🗑️ PDF supprimé: ${filePath}`);
            return true;
        } catch (error) {
            console.error(`❌ Erreur lors de la suppression du PDF ${filePath}:`, error);
            return false;
        }
    }
}

module.exports = PDFGenerationService;