const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📦 Installation des dépendances pour le système d\'email...');

try {
    // Installer nodemailer
    console.log('📧 Installation de nodemailer...');
    execSync('npm install nodemailer', { stdio: 'inherit' });

    // Installer crypto (déjà inclus dans Node.js)
    console.log('🔐 Crypto est déjà inclus dans Node.js');

    // Vérifier si le fichier .env existe
    const envPath = path.join(__dirname, '../.env');
    const envExamplePath = path.join(__dirname, '../env-email.example');

    if (!fs.existsSync(envPath)) {
        console.log('📝 Création du fichier .env à partir de l\'exemple...');
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ Fichier .env créé. Veuillez le configurer avec vos paramètres SMTP.');
        } else {
            console.log('⚠️ Fichier env-email.example non trouvé');
        }
    } else {
        console.log('✅ Fichier .env existe déjà');
    }

    console.log('\n🎉 Installation terminée avec succès!');
    console.log('\n📝 Prochaines étapes:');
    console.log('1. Configurez vos paramètres SMTP dans le fichier .env');
    console.log('2. Exécutez: node scripts/setup-email-system.js');
    console.log('3. Redémarrez le serveur backend');
    console.log('4. Testez la création d\'un agent avec un email valide');

} catch (error) {
    console.error('❌ Erreur lors de l\'installation:', error.message);
    process.exit(1);
}