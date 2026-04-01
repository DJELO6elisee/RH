#!/usr/bin/env node

/**
 * Script pour générer automatiquement un ID de build unique
 * Exécuté automatiquement à chaque "npm run build"
 * Génère un timestamp unique qui permet de détecter les nouvelles versions
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Chemin vers le fichier version.json
const versionFilePath = path.join(__dirname, '..', 'public', 'version.json');

try {
  // Générer un ID unique basé sur le timestamp
  const buildDate = new Date();
  const buildId = buildDate.getTime().toString(); // Timestamp en millisecondes
  const buildDateISO = buildDate.toISOString();
  
  // Générer aussi un hash court pour identifier le build
  const hash = crypto.createHash('md5')
    .update(buildId)
    .digest('hex')
    .substring(0, 8);

  // Lire le fichier version actuel pour conserver la description si elle existe
  let currentDescription = 'Nouvelle version';
  let currentVersion = '1.0.0';
  
  if (fs.existsSync(versionFilePath)) {
    try {
      const currentData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
      if (currentData.description) {
        currentDescription = currentData.description;
      }
      if (currentData.version) {
        // Incrémenter automatiquement le patch
        const [major, minor, patch] = currentData.version.split('.').map(Number);
        currentVersion = `${major}.${minor}.${patch + 1}`;
      }
    } catch (e) {
      console.log('⚠️ Impossible de lire la version précédente, utilisation des valeurs par défaut');
    }
  }
  
  // Créer le nouveau contenu avec ID de build unique
  const versionData = {
    version: currentVersion,
    buildId: buildId,
    buildHash: hash,
    buildDate: buildDateISO,
    description: currentDescription
  };
  
  // Écrire le fichier
  fs.writeFileSync(
    versionFilePath,
    JSON.stringify(versionData, null, 2) + '\n',
    'utf8'
  );
  
  console.log('');
  console.log('✅ ========================================');
  console.log('✅ BUILD ID GÉNÉRÉ AVEC SUCCÈS !');
  console.log('✅ ========================================');
  console.log('');
  console.log('📊 Informations du Build:');
  console.log(`   Version: ${currentVersion}`);
  console.log(`   Build ID: ${buildId}`);
  console.log(`   Hash: ${hash}`);
  console.log(`   Date: ${buildDateISO}`);
  console.log(`   Description: ${currentDescription}`);
  console.log('');
  console.log('🎉 Les utilisateurs verront automatiquement la notification de mise à jour !');
  console.log('');
  
} catch (error) {
  console.error('❌ Erreur lors de la génération du Build ID:', error.message);
  process.exit(1);
}

