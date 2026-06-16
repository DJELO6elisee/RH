/**
 * Utilities for parsing HTML tags (like <strong> and <b>) 
 * and rendering them as rich text in PDFKit.
 */

/**
 * Parses basic HTML tags into an array of text segments with styling flags.
 * Currently supports <strong> and <b> tags.
 * 
 * @param {string} htmlText - The text containing HTML tags
 * @returns {Array<{text: string, bold: boolean}>} Array of text segments
 */
function parseHtmlToSegments(htmlText) {
    if (!htmlText) return [];

    const segments = [];
    // Regex to match <strong> or <b> tags, ignoring attributes (like <strong >)
    const regex = /<(strong|b)[^>]*>(.*?)<\/\1>/gi;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(htmlText)) !== null) {
        // Add preceding normal text
        if (match.index > lastIndex) {
            const normalText = htmlText.substring(lastIndex, match.index);
            if (normalText) {
                segments.push({ text: normalText, bold: false });
            }
        }

        // Add bold text
        const boldText = match[2];
        if (boldText) {
            segments.push({ text: boldText, bold: true });
        }

        lastIndex = regex.lastIndex;
    }

    // Add remaining normal text
    if (lastIndex < htmlText.length) {
        const remainingText = htmlText.substring(lastIndex);
        if (remainingText) {
            segments.push({ text: remainingText, bold: false });
        }
    }

    // Fallback if no tags were found
    if (segments.length === 0 && htmlText.length > 0) {
        segments.push({ text: htmlText, bold: false });
    }

    return segments;
}

/**
 * Renders an array of text segments into the PDF document with proper formatting.
 * Inspired by the writeFormattedText logic in MemoryPDFService.js
 * 
 * @param {PDFDocument} doc - The PDFKit document instance
 * @param {string} htmlText - The HTML text to render
 * @param {number} x - Starting X coordinate
 * @param {number} y - Starting Y coordinate
 * @param {Object} options - Formatting options (width, align, baseFont, boldFont, fontSize)
 * @returns {number} - The final Y position after rendering
 */
function writeRichText(doc, htmlText, x, y, options = {}) {
    const segments = parseHtmlToSegments(htmlText);
    const width = options.width || 500;
    // Forcer l'alignement à gauche pour éviter les espaces géants avec 'continued'
    const align = 'left';
    const BODY_FONT_SIZE = options.fontSize || 16;
    const BASE_FONT = options.baseFont || 'Times-Roman';
    const BOLD_FONT = options.boldFont || 'Times-Bold';

    // Ensure the initial font size is set
    doc.fontSize(BODY_FONT_SIZE);

    if (segments.length === 0) {
        return y;
    }


    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isLast = i === segments.length - 1;
        const nextSegment = !isLast ? segments[i + 1] : null;

        doc.font(segment.bold ? BOLD_FONT : BASE_FONT);

        // S'assurer qu'un espace est présent entre deux segments de styles différents
        // PDFKit avec 'continued' peut coller les segments bold/normal sans espace
        let textToRender = segment.text;
        if (isLast) {
            textToRender += '\n';
        }

        if (!isLast && nextSegment && segment.bold !== nextSegment.bold) {
            // Si le segment courant ne se termine pas par un espace
            // et que le suivant ne commence pas par un espace ou une ponctuation
            const endsWithSpace = /\s$/.test(textToRender);
            const nextStartsWithPunctOrSpace = /^[\s,;:.!?]/.test(nextSegment.text);
            if (!endsWithSpace && !nextStartsWithPunctOrSpace) {
                textToRender = textToRender + ' ';
            }
        }

        const textOptions = {
            continued: !isLast
        };

        if (i === 0) {
            textOptions.width = width;
            textOptions.align = align;
            doc.text(textToRender, x, y, textOptions);
        } else {
            doc.text(textToRender, textOptions);
        }
    }

    return doc.y;
}

/**
 * Replaces template placeholders for both legacy and UI-based variables.
 * 
 * @param {string} template - The template string
 * @param {Object} data - The data object containing variables like 'jours', 'diffDays', etc.
 * @returns {string} - The template with all placeholders replaced
 */
function replaceTemplatePlaceholders(template, data) {
    if (!template) return '';

    let result = template;

    for (const [key, value] of Object.entries(data)) {
        // Handle both with and without brackets in the key name
        const searchKey = key.startsWith('{') ? key : `{${key}}`;
        // Escape brackets for regex
        const regex = new RegExp(searchKey.replace(/([{}])/g, '\\$1'), 'g');
        result = result.replace(regex, value ?? '');
    }

    // Nettoyage post-remplacement : supprimer les doubles virgules générées
    // par des champs vides (ex: {classeInfo} vide → ", ," ou ",  ,")
    result = result.replace(/,\s*,/g, ',');
    // Supprimer une virgule isolée entre deux espaces sans texte entre elles
    result = result.replace(/,\s{2,}/g, ', ');
    // Supprimer virgule collée directement avant "à la" ou autre mot clé si le champ était vide
    result = result.replace(/,\s*,/g, ',');

    return result;
}

module.exports = {
    parseHtmlToSegments,
    writeRichText,
    replaceTemplatePlaceholders
};
