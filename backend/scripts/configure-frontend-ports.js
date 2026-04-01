// Script pour configurer les ports des applications frontend
// ========================================================

const fs = require('fs');
const path = require('path');

// Configuration des ports pour chaque ministère
const frontendConfigs = [{
        name: 'react-frontend',
        port: 3000,
        description: 'Frontend principal'
    },
    {
        name: 'ministere-education',
        port: 3001,
        description: 'Ministère de l\'Éducation'
    },
    {
        name: 'ministere-sante',
        port: 3002,
        description: 'Ministère de la Santé'
    },
    {
        name: 'ministere-finances',
        port: 3003,
        description: 'Ministère des Finances'
    },
    {
        name: 'ministere-interieur',
        port: 3004,
        description: 'Ministère de l\'Intérieur'
    }
];

// Fonction pour mettre à jour le package.json d'une application
function updatePackageJson(appPath, port) {
    const packageJsonPath = path.join(appPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        console.log(`⚠️  Package.json non trouvé pour ${appPath}`);
        return false;
    }

    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Mettre à jour le script start
        if (packageJson.scripts) {
            packageJson.scripts.start = `set PORT=${port} && react-scripts start`;
        }

        // Ajouter la configuration du port
        packageJson.homepage = `http://localhost:${port}`;

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log(`✅ Package.json mis à jour pour ${appPath} (port ${port})`);
        return true;
    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour de ${packageJsonPath}:`, error.message);
        return false;
    }
}

// Fonction pour créer un fichier .env.local
function createEnvLocal(appPath, port) {
    const envLocalPath = path.join(appPath, '.env.local');
    const envContent = `PORT=${port}
REACT_APP_API_URL=http://localhost:5000
REACT_APP_PORT=${port}
`;

    try {
        fs.writeFileSync(envLocalPath, envContent);
        console.log(`✅ .env.local créé pour ${appPath} (port ${port})`);
        return true;
    } catch (error) {
        console.error(`❌ Erreur lors de la création de .env.local pour ${appPath}:`, error.message);
        return false;
    }
}

// Fonction principale
function configureFrontendPorts() {
    console.log('🚀 Configuration des ports des applications frontend...\n');

    const basePath = path.join(__dirname, '..', '..');
    let successCount = 0;
    let totalCount = 0;

    frontendConfigs.forEach(config => {
        const appPath = path.join(basePath, config.name);
        totalCount++;

        console.log(`📁 Configuration de ${config.name} (${config.description})...`);

        if (!fs.existsSync(appPath)) {
            console.log(`⚠️  Dossier ${config.name} non trouvé, ignoré`);
            return;
        }

        const packageSuccess = updatePackageJson(appPath, config.port);
        const envSuccess = createEnvLocal(appPath, config.port);

        if (packageSuccess && envSuccess) {
            successCount++;
        }

        console.log('');
    });

    console.log('📊 Résumé de la configuration:');
    console.log(`  - Applications configurées: ${successCount}/${totalCount}`);

    if (successCount === totalCount) {
        console.log('🎉 Toutes les applications ont été configurées avec succès !');
    } else {
        console.log('⚠️  Certaines applications n\'ont pas pu être configurées');
    }

    console.log('\n📋 Prochaines étapes:');
    console.log('  1. Redémarrer le serveur backend pour appliquer la configuration CORS');
    console.log('  2. Démarrer chaque application frontend sur son port respectif');
    console.log('  3. Tester l\'accès depuis chaque URL');

    console.log('\n🔗 URLs des applications:');
    frontendConfigs.forEach(config => {
        console.log(`  - ${config.name}: http://localhost:${config.port}`);
    });
}

// Exécuter le script
if (require.main === module) {
    configureFrontendPorts();
}

module.exports = { configureFrontendPorts, frontendConfigs };

