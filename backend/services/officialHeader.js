const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { URL } = require('url');
const Jimp = require('jimp');

const CREST_FILES = [
  { filename: 'logo-armoirie-transparent.png', mime: 'image/png' },
  { filename: 'photo-logo.png', mime: 'image/png' },
  { filename: 'logo-armoirie.jpg', mime: 'image/jpeg' },
  { filename: 'amoirie-transparent.png', mime: 'image/png' },
  { filename: 'photo-logo.png', mime: 'image/png' },
  { filename: 'amoirie.jpg', mime: 'image/jpeg' },
  { filename: 'amoirie.jpeg', mime: 'image/jpeg' }
];

const CREST_DIRECTORIES = [
  path.resolve(__dirname, '..', '..', 'ministere-tourisme', 'public', 'img'),
  path.resolve(__dirname, '..', 'ministere-tourisme', 'public', 'img'),
  path.resolve(__dirname, '..', 'public', 'img'),
  path.resolve(process.cwd(), 'ministere-tourisme', 'public', 'img'),
  path.resolve(process.cwd(), 'public', 'img'),
  path.resolve(process.cwd(), 'img'),
  path.resolve(__dirname, '..', '..', 'ministere-tourisme', 'build', 'img'),
  path.resolve(__dirname, '..', 'ministere-tourisme', 'build', 'img'),
  path.resolve(process.cwd(), 'ministere-tourisme', 'build', 'img')
];

const CREST_DOWNLOAD_DIRECTORIES = [
  path.resolve(__dirname, '..', 'public', 'img'),
  path.resolve(process.cwd(), 'public', 'img'),
  path.resolve(process.cwd(), 'img')
];

const REMOTE_CREST_URLS = [
  'http://tourisme.2ise-groupe.com/img/logo-armoirie-transparent.png',
  'http://tourisme.2ise-groupe.com/img/photo-logo.png',
  'http://tourisme.2ise-groupe.com/img/amoirie-transparent.png',
  'http://tourisme.2ise-groupe.com/img/photo-logo.png',
  'http://tourisme.2ise-groupe.com/img/photo-logo.jpg'
];

let cachedCrestInfo = null;
let crestBase64Cache = null;
let crestBufferCache = null;
let crestFetchPromise = null;
const CREST_BACKGROUND_THRESHOLD = Number(process.env.CREST_BACKGROUND_THRESHOLD) || 240;

function pickFirstNonEmptyString(values = []) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return '';
}

function findCrestInfo() {
  if (cachedCrestInfo !== null) {
    return cachedCrestInfo;
  }

  for (const dir of CREST_DIRECTORIES) {
    for (const file of CREST_FILES) {
      const absolutePath = path.join(dir, file.filename);
      if (fs.existsSync(absolutePath)) {
        cachedCrestInfo = {
          filename: file.filename,
          mime: file.mime,
          absolutePath
        };
        return cachedCrestInfo;
      }
    }
  }

  cachedCrestInfo = null;
  return cachedCrestInfo;
}

function crestImageExists() {
  return !!findCrestInfo();
}

function getCrestImagePath() {
  return findCrestInfo()?.absolutePath || null;
}

function getCrestBase64() {
  if (crestBase64Cache !== null) {
    return crestBase64Cache;
  }

  if (crestBufferCache) {
    crestBase64Cache = crestBufferCache.toString('base64');
    return crestBase64Cache;
  }

  const crestInfo = findCrestInfo();
  if (!crestInfo) {
    crestBase64Cache = null;
    return null;
  }

  try {
    crestBase64Cache = fs.readFileSync(crestInfo.absolutePath).toString('base64');
  } catch (error) {
    crestBase64Cache = null;
  }

  return crestBase64Cache;
}

function getCrestBuffer() {
  return crestBufferCache;
}

function getCrestDataUri() {
  const base64 = getCrestBase64();
  const mime = findCrestInfo()?.mime || 'image/png';
  return base64 ? `data:${mime};base64,${base64}` : null;
}

function getFallbackCrestUrl() {
  return process.env.CREST_IMAGE_URL || 'http://tourisme.2ise-groupe.com/img/photo-logo.png';
}

function sanitizeLabel(label) {
  if (!label || typeof label !== 'string') {
    return '';
  }
  return label.trim().toUpperCase();
}

function parseDateInput(dateInput, fallback = null) {
  if (dateInput === undefined || dateInput === null || (typeof dateInput === 'string' && dateInput.trim() === '')) {
    return fallback;
  }

  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    return dateInput;
  }

  if (typeof dateInput === 'number') {
    const numericDate = new Date(dateInput);
    if (!Number.isNaN(numericDate.getTime())) {
      return numericDate;
    }
  }

  if (typeof dateInput === 'string') {
    const trimmedInput = dateInput.trim();
    if (!trimmedInput) {
      return fallback;
    }

    const slashMatch = trimmedInput.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1;
      const year = parseInt(slashMatch[3], 10);
      const hours = slashMatch[4] ? parseInt(slashMatch[4], 10) : 0;
      const minutes = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0;
      const seconds = slashMatch[6] ? parseInt(slashMatch[6], 10) : 0;
      const manualDate = new Date(year, month, day, hours, minutes, seconds);
      if (!Number.isNaN(manualDate.getTime())) {
        return manualDate;
      }
    }

    const isoLikeMatch = trimmedInput.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (isoLikeMatch) {
      const year = parseInt(isoLikeMatch[1], 10);
      const month = parseInt(isoLikeMatch[2], 10) - 1;
      const day = parseInt(isoLikeMatch[3], 10);
      const hours = isoLikeMatch[4] ? parseInt(isoLikeMatch[4], 10) : 0;
      const minutes = isoLikeMatch[5] ? parseInt(isoLikeMatch[5], 10) : 0;
      const seconds = isoLikeMatch[6] ? parseInt(isoLikeMatch[6], 10) : 0;
      const manualDate = new Date(year, month, day, hours, minutes, seconds);
      if (!Number.isNaN(manualDate.getTime())) {
        return manualDate;
      }
    }

    const namedMonthMatch = trimmedInput.match(/^(\d{1,2})\s+([a-zA-Z\u00C0-\u017F]+)\s+(\d{4})$/);
    if (namedMonthMatch) {
      const day = parseInt(namedMonthMatch[1], 10);
      const monthName = namedMonthMatch[2].toLowerCase();
      const year = parseInt(namedMonthMatch[3], 10);
      const frenchMonthMap = {
        'janvier': 0,
        'février': 1,
        'fevrier': 1,
        'mars': 2,
        'avril': 3,
        'mai': 4,
        'juin': 5,
        'juillet': 6,
        'août': 7,
        'aout': 7,
        'septembre': 8,
        'octobre': 9,
        'novembre': 10,
        'décembre': 11,
        'decembre': 11
      };
      const monthIndex = frenchMonthMap[monthName];
      if (typeof monthIndex === 'number' && monthIndex >= 0 && monthIndex <= 11) {
        const manualDate = new Date(year, monthIndex, day);
        if (!Number.isNaN(manualDate.getTime())) {
          return manualDate;
        }
      }
    }

    const parsed = Date.parse(trimmedInput);
    if (!Number.isNaN(parsed)) {
      const parsedDate = new Date(parsed);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }

  return fallback;
}

function formatFullFrenchDate(dateInput, fallback = null) {
  const date = parseDateInput(dateInput, fallback);
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formatted = formatter.format(date);
  // Retourner tout en minuscule
  return formatted.toLowerCase();
}

const LABEL_SPLIT_RULES = [
  {
    regex: /^(MINISTERE DU TOURISME)(\s+ET\s+DES\s+LOISIRS\b.*)$/,
    format: (first, rest) => `${first.replace(/\s+/g, '\u00A0')}\n${rest.trim()}`
  },
  {
    regex: /^(DIRECTION DES RESSOURCES)(\s+HUMAINES\b.*)$/,
    format: (first, rest) => `${first.replace(/\s+/g, '\u00A0')}\n${rest.trim()}`
  }
];

function formatOfficialLabel(label = '') {
  const sanitized = sanitizeLabel(label);
  if (!sanitized) {
    return '';
  }

  let formatted = sanitized.replace(/\s+/g, ' ').trim();

  for (const rule of LABEL_SPLIT_RULES) {
    const match = formatted.match(rule.regex);
    if (match) {
      formatted = rule.format(match[1], match[2]);
      break;
    }
  }

  return formatted;
}

function resolveOfficialHeaderContext({ agent = {}, validateur = {}, userInfo = null } = {}) {
  const ministryName = pickFirstNonEmptyString([
    userInfo?.ministere_nom,
    userInfo?.ministere,
    userInfo?.organisation,
    validateur?.ministere_nom,
    validateur?.ministere,
    validateur?.ministere_label,
    validateur?.ministereLabel,
    agent?.ministere_nom,
    agent?.ministere,
    agent?.ministere_label,
    agent?.ministereLabel
  ]);

  let directionName = pickFirstNonEmptyString([
    userInfo?.direction_nom,
    userInfo?.direction,
    userInfo?.direction_generale_nom,
    userInfo?.service_nom,
    userInfo?.service,
    userInfo?.structure_nom,
    userInfo?.structure,
    validateur?.direction_nom,
    validateur?.direction,
    validateur?.direction_generale_nom,
    validateur?.direction_label,
    validateur?.service_nom,
    validateur?.service,
    validateur?.structure_nom,
    validateur?.structure,
    validateur?.departement_nom,
    validateur?.departement,
    validateur?.unite_nom,
    validateur?.unite,
    agent?.direction_nom,
    agent?.direction,
    agent?.direction_generale_nom,
    agent?.service_nom,
    agent?.service
  ]);

  if (!directionName) {
    const fonctionSource = pickFirstNonEmptyString([
      validateur?.fonction,
      validateur?.fonction_actuelle,
      validateur?.fonction_designation,
      validateur?.designation_poste,
      userInfo?.fonction
    ]);

    if (fonctionSource && /ressources\s+humaines/i.test(fonctionSource)) {
      directionName = 'DIRECTION DES RESSOURCES HUMAINES';
    }
  }

  return {
    ministryName,
    directionName
  };
}

function getMimeTypeFromFilename(filename = '') {
  const lowered = filename.toLowerCase();
  if (lowered.endsWith('.jpg') || lowered.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (lowered.endsWith('.png')) {
    return 'image/png';
  }
  if (lowered.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lowered.endsWith('.gif')) {
    return 'image/gif';
  }
  return 'image/png';
}

async function processCrestBuffer(buffer, source = {}) {
  try {
    const image = await Jimp.read(buffer);
    const { data } = image.bitmap;

    let containsTransparency = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        containsTransparency = true;
        break;
      }
    }

    if (!containsTransparency) {
      let modified = false;
      image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
        const red = this.bitmap.data[idx];
        const green = this.bitmap.data[idx + 1];
        const blue = this.bitmap.data[idx + 2];
        if (
          red >= CREST_BACKGROUND_THRESHOLD &&
          green >= CREST_BACKGROUND_THRESHOLD &&
          blue >= CREST_BACKGROUND_THRESHOLD
        ) {
          this.bitmap.data[idx + 3] = 0;
          modified = true;
        }
      });

      if (modified) {
        try {
          image.autocrop();
        } catch (cropError) {
          // Ignorer les erreurs d'autocrop
        }
        const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        const baseName = (source.filename || 'crest').replace(/\.[^/.]+$/, '');
        return {
          buffer: processedBuffer,
          filename: `${baseName}-transparent.png`,
          mime: 'image/png'
        };
      }
    }

    if (source.mime === 'image/webp') {
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
      const baseName = (source.filename || 'crest').replace(/\.[^/.]+$/, '');
      return {
        buffer: processedBuffer,
        filename: `${baseName}.png`,
        mime: 'image/png'
      };
    }
  } catch (error) {
    // Ignorer les erreurs de traitement et renvoyer les données originales
  }

  return {
    buffer,
    filename: source.filename,
    mime: source.mime
  };
}

async function persistCrestBuffer(buffer, filename) {
  for (const directory of CREST_DOWNLOAD_DIRECTORIES) {
    try {
      await fs.promises.mkdir(directory, { recursive: true });
      const destination = path.join(directory, filename);
      await fs.promises.writeFile(destination, buffer);
      return destination;
    } catch (error) {
      // Ignorer et tenter l'emplacement suivant
    }
  }
  return null;
}

async function downloadCrestFromRemote() {
  const envUrl = process.env.CREST_IMAGE_URL ? [process.env.CREST_IMAGE_URL] : [];
  const uniqueUrls = [...envUrl, ...REMOTE_CREST_URLS].filter((value, index, array) => array.indexOf(value) === index);

  for (const url of uniqueUrls) {
    try {
      if (!url) {
        continue;
      }
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (!buffer.length) {
        continue;
      }

      const parsedUrl = new URL(url);
      const filename = path.basename(parsedUrl.pathname) || 'logo-armoirie.png';
      const mime = getMimeTypeFromFilename(filename);

      const processed = await processCrestBuffer(buffer, { filename, mime });
      const finalBuffer = processed.buffer || buffer;
      const finalFilename = processed.filename || filename;
      const finalMime = processed.mime || mime;

      const persistedPath = await persistCrestBuffer(finalBuffer, finalFilename);

      if (persistedPath) {
        cachedCrestInfo = {
          filename: finalFilename,
          mime: finalMime,
          absolutePath: persistedPath
        };
      } else {
        cachedCrestInfo = {
          filename: finalFilename,
          mime: finalMime,
          absolutePath: null
        };
      }

      crestBufferCache = finalBuffer;
      crestBase64Cache = finalBuffer.toString('base64');
      return finalBuffer;
    } catch (error) {
      // Ignorer et essayer la prochaine URL
    }
  }

  return null;
}

async function ensureCrestAssetsLoaded() {
  if (crestBufferCache) {
    return crestBufferCache;
  }

  const localInfo = findCrestInfo();
  if (localInfo) {
    try {
      const rawBuffer = fs.readFileSync(localInfo.absolutePath);
      const processed = await processCrestBuffer(rawBuffer, localInfo);
      const finalBuffer = processed.buffer || rawBuffer;

      crestBufferCache = finalBuffer;
      crestBase64Cache = finalBuffer.toString('base64');

      if (processed.filename && processed.filename !== localInfo.filename) {
        const persistedPath = await persistCrestBuffer(finalBuffer, processed.filename);
        if (persistedPath) {
          cachedCrestInfo = {
            filename: processed.filename,
            mime: processed.mime || localInfo.mime,
            absolutePath: persistedPath
          };
        }
      } else if (processed.mime && processed.mime !== localInfo.mime) {
        cachedCrestInfo = {
          filename: localInfo.filename,
          mime: processed.mime,
          absolutePath: localInfo.absolutePath
        };
      }

      return crestBufferCache;
    } catch (error) {
      crestBufferCache = null;
      crestBase64Cache = null;
    }
  }

  if (!crestFetchPromise) {
    crestFetchPromise = downloadCrestFromRemote().finally(() => {
      crestFetchPromise = null;
    });
  }

  return crestFetchPromise;
}

async function drawOfficialHeaderPDF(doc, {
  documentNumber = '',
  dateString = null,
  generatedAt = null,
  city = 'ABIDJAN',
  agentMinistryName = '',
  agentDirectionName = '',
  validatorMinistryName = '',
  validatorDirectionName = '',
  numeroActeDecision = null
} = {}) {
  const margins = doc.page.margins || { left: 50, right: 50 };
  const leftX = margins.left || 50;
  const topY = 40;
  const sectionWidth = 200;
  const crestWidth = 90;
  const canopySpacing = 8;
  const centerX = (doc.page.width / 2) - (crestWidth / 2);
  const rightX = (doc.page.width - (margins.right || 50) - sectionWidth);

  const ministryLabel = formatOfficialLabel(validatorMinistryName || agentMinistryName);
  const directionLabel = formatOfficialLabel(validatorDirectionName || agentDirectionName);

  doc.fillColor('#000000');
  let currentY = topY;

  doc.font('Times-Bold').fontSize(14);
  if (ministryLabel) {
    doc.text(ministryLabel, leftX, currentY, { width: sectionWidth, align: 'left' });
    const ministryHeight = doc.heightOfString(ministryLabel, { width: sectionWidth });
    const ministrySeparatorY = currentY + ministryHeight + canopySpacing / 2;
    const ministrySeparatorWidth = Math.min(90, sectionWidth - 40);
    const ministrySeparatorStart = leftX + 20;

    doc.lineWidth(1.5)
      .dash(2, { space: 2 })
      .moveTo(ministrySeparatorStart, ministrySeparatorY)
      .lineTo(ministrySeparatorStart + ministrySeparatorWidth, ministrySeparatorY)
      .stroke();
    doc.undash();

    currentY = ministrySeparatorY + canopySpacing;
  }

  doc.font('Times-Bold').fontSize(12);
  if (directionLabel) {
    doc.text(directionLabel, leftX, currentY, { width: sectionWidth, align: 'left' });
    const directionHeight = doc.heightOfString(directionLabel, { width: sectionWidth });

    const directionSeparatorY = currentY + directionHeight + canopySpacing / 2;
    const directionSeparatorWidth = Math.min(90, sectionWidth - 40);
    const directionSeparatorStart = leftX + 20;

    doc.lineWidth(1.5)
      .dash(2, { space: 2 })
      .moveTo(directionSeparatorStart, directionSeparatorY)
      .lineTo(directionSeparatorStart + directionSeparatorWidth, directionSeparatorY)
      .stroke();
    doc.undash();

    currentY = directionSeparatorY + canopySpacing;
  }

  // Calculer la hauteur finale de la section gauche
  const leftSectionBottom = currentY;

  await ensureCrestAssetsLoaded();
  const crestBuffer = getCrestBuffer();
  const crestStartY = topY - 5;
  
  if (crestBuffer) {
    // Dessiner l'armoirie
    doc.image(crestBuffer, centerX, crestStartY, { width: crestWidth, height: crestWidth, fit: [crestWidth, crestWidth] });
  }

  // Calculer la hauteur de la section droite
  doc.font('Times-Bold').fontSize(13);
  const republicLine = "REPUBLIQUE DE COTE D'IVOIRE".replace(/\s+/g, '\u00A0');
  const republicWidth = doc.widthOfString(republicLine);
  const republicX = rightX + (sectionWidth - republicWidth) / 2;
  doc.text(republicLine, republicX, topY, {
    lineBreak: false
  });

  doc.font('Times-Roman').fontSize(12);
  doc.text('Union-Discipline-Travail', rightX, topY + 18, { width: sectionWidth, align: 'center' });

  const rightSeparatorWidth = Math.min(90, sectionWidth - 40);
  const rightSeparatorY = topY + 32;
  const rightSeparatorStart = rightX + (sectionWidth - rightSeparatorWidth) / 2;

  doc.lineWidth(1.5)
    .dash(2, { space: 2 })
    .moveTo(rightSeparatorStart, rightSeparatorY)
    .lineTo(rightSeparatorStart + rightSeparatorWidth, rightSeparatorY)
    .stroke();
  doc.undash();

  // Calculer la hauteur finale de la section droite (après le séparateur)
  const rightSectionBottom = rightSeparatorY + canopySpacing;

  // Déterminer la coordonnée Y commune pour le numéro et la date
  // Prendre la valeur Y la plus basse des deux sections supérieures, plus un espacement plus grand pour éviter que ce soit trop proche de la direction
  const commonLineY = Math.max(leftSectionBottom, rightSectionBottom) + 30;

  // Dessiner le numéro de document à gauche à cette Y commune
  // Note : documentNumber est calculé par le caller (getDocumentReference dans documentReference.js), ce module ne fait qu'afficher la valeur reçue.
  doc.font('Times-Bold').fontSize(11);
  const referenceText = documentNumber && documentNumber.trim() ? `N° ${documentNumber.trim()}` : 'N° 00000';
  doc.text(referenceText, leftX, commonLineY, { width: sectionWidth, align: 'left' });
  const referenceHeight = doc.heightOfString(referenceText, { width: sectionWidth });
  
  // Dessiner la date à droite à la même Y commune
  let formattedDate = formatFullFrenchDate(dateString ?? generatedAt, generatedAt ?? null);
  if (!formattedDate) {
    formattedDate = formatFullFrenchDate(new Date());
  }
  // Capitaliser seulement la première lettre de la ville, le reste en minuscule
  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
  const dateLine = `${cityCapitalized}, le ${formattedDate}`;
  doc.font('Times-Roman').fontSize(11);
  doc.text(dateLine, rightX, commonLineY, { width: sectionWidth, align: 'right' });
  const dateHeight = doc.heightOfString(dateLine, { width: sectionWidth });

  // Position Y finale pour les éléments suivants (prendre la hauteur maximale)
  let finalBottomY = commonLineY + Math.max(referenceHeight, dateHeight);

  // Si une décision existe, placer la décision sous le numéro de référence à gauche (avec libellé "Décision : ")
  let decisionHeight = 0;
  if (numeroActeDecision) {
    const decisionText = ('DECISION ' + (numeroActeDecision || '').trim());
    doc.font('Times-Roman').fontSize(9);
    doc.fillColor('#000000');
    const decisionY = finalBottomY + 5;
    decisionHeight = doc.heightOfString(decisionText, { width: sectionWidth });
    doc.text(decisionText, leftX, decisionY, {
      align: 'left',
      width: sectionWidth,
      lineGap: 2
    });
    finalBottomY = decisionY + decisionHeight + 5;
  }

  // Calculer le bas de la section armoirie
  const crestBottom = crestStartY + crestWidth + 10;

  // Retourner la position Y la plus basse pour le contenu suivant
  return Math.max(finalBottomY, crestBottom) + 30;
}

const HEADER_CSS = `
  .official-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 20px;
    font-family: 'Times New Roman', Georgia, serif;
    color: #000;
    gap: 16px;
  }
  .logo-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .logo {
    max-width: 110px;
    max-height: 110px;
    height: auto;
  }
  .official-header__left,
  .official-header__right {
    width: 35%;
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-height: 120px;
  }
  .official-header__left-title {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.2;
    margin: 0 0 6px 0;
    white-space: pre-line;
  }
  .official-header__left-subtitle {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    margin: 0 0 10px 0;
    white-space: pre-line;
  }
  .official-header__separator {
    width: 100px;
    border-bottom: 1px dashed #000;
    margin: 8px auto 10px auto;
  }
  .official-header__reference {
    font-size: 11px;
    font-weight: 700;
    align-self: flex-start;
    margin-left: 0;
  }
  .official-header__decision-number {
    text-align: left;
    font-weight: normal;
    font-size: 10px;
    margin-top: 6px;
    color: #000;
    width: 100%;
    line-height: 1.3;
    padding: 0;
  }
  .official-header__center {
    width: 30%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-height: 120px;
  }
  .official-header__right-title {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
    margin: 0 0 6px 0;
  }
  .official-header__right-motto {
    font-size: 13px;
    font-style: normal;
    font-weight: 600;
    text-transform: none;
    margin: 4px 0 6px 0;
  }
  .official-header-bottom-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    padding: 0 0 0 0;
    margin-top: 25px;
    margin-bottom: 16px;
    font-family: 'Times New Roman', Georgia, serif;
    color: #000;
    font-size: 11px;
  }
  .official-header__reference-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  .official-header__right-location-aligned {
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    line-height: 1.2;
  }
  .official-header__right-location {
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
    margin-top: 0;
  }
`;

// documentNumber doit être fourni par le caller (getDocumentReference) ; ce module n'effectue aucun calcul, il affiche uniquement la valeur reçue.
function buildHeaderHTML({ documentNumber = '', dateString = '', generatedAt = null, city = 'ABIDJAN', ministryName = '', directionName = '', numeroActeDecision = null } = {}) {
  const crestDataUri = getCrestDataUri();
  const crestSource = crestDataUri || getFallbackCrestUrl();
  const referenceText = documentNumber && documentNumber.trim()
    ? `N° ${documentNumber.trim()}`
    : 'N° 00000';
  const ministryFormatted = formatOfficialLabel(typeof ministryName === 'string' ? ministryName : '');
  const directionFormatted = formatOfficialLabel(typeof directionName === 'string' ? directionName : '');
  const ministryHtml = ministryFormatted
    ? ministryFormatted.replace(/\u00A0/g, '&nbsp;').replace(/\r?\n/g, '<br/>')
    : '&nbsp;';
  const directionHtml = directionFormatted
    ? directionFormatted.replace(/\u00A0/g, '&nbsp;').replace(/\r?\n/g, '<br/>')
    : '&nbsp;';
  let formattedDate = formatFullFrenchDate(dateString || generatedAt, generatedAt || null);
  if (!formattedDate) {
    formattedDate = formatFullFrenchDate(new Date());
  }
  // Capitaliser seulement la première lettre de la ville, le reste en minuscule
  const cityCapitalized = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

  return `
    <div class="official-header">
      <div class="official-header__left">
        <div class="official-header__left-title">${ministryHtml}</div>
        <div class="official-header__left-subtitle">${directionHtml}</div>
        <div class="official-header__separator"></div>
      </div>
      <div class="official-header__center">
        <div class="logo-container">
          <img src="${crestSource}" alt="Logo École" class="logo" />
        </div>
      </div>
      <div class="official-header__right">
        <div class="official-header__right-title">REPUBLIQUE DE COTE D'IVOIRE</div>
        <div class="official-header__right-motto">Union-Discipline-Travail</div>
        <div class="official-header__separator"></div>
      </div>
    </div>
    <div class="official-header-bottom-line">
      <div class="official-header__reference-container">
        <span class="official-header__reference">${referenceText}</span>
        ${numeroActeDecision ? `<div class="official-header__decision-number">${numeroActeDecision}</div>` : ''}
      </div>
      <span class="official-header__right-location-aligned">${cityCapitalized}, le ${formattedDate}</span>
    </div>
  `;
}

module.exports = {
  getCrestImagePath,
  getCrestDataUri,
  HEADER_CSS,
  buildHeaderHTML,
  drawOfficialHeaderPDF,
  resolveOfficialHeaderContext,
  pickFirstNonEmptyString,
  formatFullFrenchDate,
};


