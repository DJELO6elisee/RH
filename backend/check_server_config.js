const { execSync } = require('child_process');

console.log('\n🔍 DÉTECTION DE LA CONFIGURATION DU SERVEUR\n');
console.log('='.repeat(80));

// Fonction pour exécuter une commande de manière sécurisée
function runCommand(command, description) {
    try {
        const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
        console.log(`\n✅ ${description}:`);
        console.log(output.trim());
        return true;
    } catch (error) {
        console.log(`\n❌ ${description}: Non trouvé ou erreur`);
        return false;
    }
}

// Vérifier PM2
console.log('\n1️⃣ Vérification de PM2...');
const hasPM2 = runCommand('pm2 list', 'Processus PM2 actifs');

// Vérifier les processus Node.js
console.log('\n2️⃣ Processus Node.js actifs...');
try {
    if (process.platform === 'win32') {
        runCommand('tasklist /FI "IMAGENAME eq node.exe"', 'Processus Node.js (Windows)');
    } else {
        runCommand('ps aux | grep node', 'Processus Node.js (Linux/Mac)');
    }
} catch (e) {
    console.log('Erreur lors de la vérification des processus');
}

// Vérifier le fichier de configuration du serveur
console.log('\n3️⃣ Configuration du serveur...');
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    console.log('✅ Fichier server.js trouvé');
    console.log(`   Chemin: ${serverPath}`);
} else {
    console.log('❌ Fichier server.js non trouvé');
}

// Vérifier le package.json pour les scripts
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    console.log('\n4️⃣ Scripts npm disponibles:');
    if (packageJson.scripts) {
        Object.keys(packageJson.scripts).forEach(script => {
            console.log(`   - npm run ${script}: ${packageJson.scripts[script]}`);
        });
    }
}

// Recommandations
console.log('\n' + '='.repeat(80));
console.log('\n🎯 RECOMMANDATIONS POUR REDÉMARRER LE SERVEUR:\n');

if (hasPM2) {
    console.log('✅ Votre serveur utilise PM2');
    console.log('   Commande de redémarrage: pm2 restart all\n');
} else if (process.platform === 'win32') {
    console.log('⚠️  Serveur Windows détecté');
    console.log('   Option 1: Double-cliquez sur backend/restart_server.bat');
    console.log('   Option 2: Trouvez le terminal du serveur et faites Ctrl+C puis npm start\n');
} else {
    console.log('⚠️  Serveur Linux/Mac détecté');
    console.log('   Trouvez le terminal du serveur et faites Ctrl+C puis npm start\n');
}

console.log('='.repeat(80));
console.log('\n💡 Après le redémarrage:');
console.log('   1. Attendez 5 secondes');
console.log('   2. Rafraîchissez le navigateur (Ctrl+F5)');
console.log('   3. Vérifiez que les fonctions s\'affichent dans le tableau\n');


















