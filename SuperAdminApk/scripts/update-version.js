#!/usr/bin/env node

/**
 * Script pour mettre à jour automatiquement le numéro de version
 * Usage: node scripts/update-version.js [major|minor|patch] "Description des changements"
 * 
 * Exemples:
 *   node scripts/update-version.js patch "Correction de bugs mineurs"
 *   node scripts/update-version.js minor "Ajout du Corps Préfectoral"
 *   node scripts/update-version.js major "Refonte complète de l'interface"
 */

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier version.json (remonter d'un niveau depuis scripts/)
const versionFilePath = path.join(__dirname, '..', 'public', 'version.json');

// Lire les arguments
const args = process.argv.slice(2);
const incrementType = args[0] || 'patch'; // major, minor, ou patch
const description = args[1] || 'Mise à jour de l\'application';

// Valider le type d'incrément
if (!['major', 'minor', 'patch'].includes(incrementType)) {
  console.error('❌ Type d\'incrément invalide. Utilisez: major, minor ou patch');
  process.exit(1);
}

try {
  // Lire le fichier version actuel
  const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
  const currentVersion = versionData.version;
  
  // Parser la version actuelle
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Calculer la nouvelle version
  let newVersion;
  switch (incrementType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  // Créer le nouveau contenu
  const newVersionData = {
    version: newVersion,
    buildDate: new Date().toISOString(),
    description: description
  };
  
  // Écrire le fichier
  fs.writeFileSync(
    versionFilePath,
    JSON.stringify(newVersionData, null, 2) + '\n',
    'utf8'
  );
  
  console.log('✅ Version mise à jour avec succès !');
  console.log('');
  console.log('📊 Détails:');
  console.log(`   Ancienne version: ${currentVersion}`);
  console.log(`   Nouvelle version: ${newVersion}`);
  console.log(`   Type: ${incrementType}`);
  console.log(`   Date: ${newVersionData.buildDate}`);
  console.log(`   Description: ${description}`);
  console.log('');
  console.log('🚀 Prochaines étapes:');
  console.log('   1. Commitez le fichier public/version.json');
  console.log('   2. Buildez l\'application (npm run build)');
  console.log('   3. Déployez sur le serveur');
  console.log('   4. Les utilisateurs verront automatiquement la notification !');
  console.log('');
  console.log('⚠️  Rappel: Les utilisateurs inactifs depuis 30 min seront déconnectés.');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour de la version:', error.message);
  process.exit(1);
}

