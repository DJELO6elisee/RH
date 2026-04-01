const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

// Routes attendues
const expectedRoutes = [{
        id: 'services',
        name: 'Services',
        path: '/services',
        icon: 'MdBusiness',
        category: 'Organisation'
    },
    {
        id: 'sous-directions',
        name: 'Sous-directions',
        path: '/sous-directions',
        icon: 'MdAccountTree',
        category: 'Organisation'
    }
];

console.log('🔍 Vérification des routes frontend...\n');

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    // Vérifier le fichier routes.js
    const routesPath = path.join(__dirname, '..', '..', appName, 'src', 'config', 'routes.js');

    if (!fs.existsSync(routesPath)) {
        console.log(`   ❌ Fichier routes.js non trouvé: ${routesPath}`);
        allTestsPassed = false;
        return;
    }

    const routesContent = fs.readFileSync(routesPath, 'utf8');

    // Vérifier chaque route attendue
    expectedRoutes.forEach(route => {
        const hasRoute = routesContent.includes(`id: '${route.id}'`) &&
            routesContent.includes(`path: '${route.path}'`) &&
            routesContent.includes(`icon: '${route.icon}'`);

        if (hasRoute) {
            console.log(`   ✅ Route "${route.name}" trouvée`);
        } else {
            console.log(`   ❌ Route "${route.name}" manquante ou incomplète`);
            allTestsPassed = false;
        }
    });

    // Vérifier le fichier App.jsx
    const appJsxPath = path.join(__dirname, '..', '..', appName, 'src', 'App.jsx');

    if (!fs.existsSync(appJsxPath)) {
        console.log(`   ❌ Fichier App.jsx non trouvé: ${appJsxPath}`);
        allTestsPassed = false;
        return;
    }

    const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

    // Vérifier les imports
    const hasServicesImport = appJsxContent.includes('ServicesPage');
    const hasSousDirectionsImport = appJsxContent.includes('SousDirectionsPage');

    if (hasServicesImport) {
        console.log('   ✅ Import ServicesPage trouvé dans App.jsx');
    } else {
        console.log('   ❌ Import ServicesPage manquant dans App.jsx');
        allTestsPassed = false;
    }

    if (hasSousDirectionsImport) {
        console.log('   ✅ Import SousDirectionsPage trouvé dans App.jsx');
    } else {
        console.log('   ❌ Import SousDirectionsPage manquant dans App.jsx');
        allTestsPassed = false;
    }

    // Vérifier les routes dans App.jsx
    const hasServicesRoute = appJsxContent.includes('path="/services"') &&
        appJsxContent.includes('component={ServicesPage}');
    const hasSousDirectionsRoute = appJsxContent.includes('path="/sous-directions"') &&
        appJsxContent.includes('component={SousDirectionsPage}');

    if (hasServicesRoute) {
        console.log('   ✅ Route /services trouvée dans App.jsx');
    } else {
        console.log('   ❌ Route /services manquante dans App.jsx');
        allTestsPassed = false;
    }

    if (hasSousDirectionsRoute) {
        console.log('   ✅ Route /sous-directions trouvée dans App.jsx');
    } else {
        console.log('   ❌ Route /sous-directions manquante dans App.jsx');
        allTestsPassed = false;
    }

    // Vérifier les pages
    const servicePagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');
    const sousDirectionsPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'SousDirectionsPage.jsx');

    if (fs.existsSync(servicePagePath)) {
        console.log('   ✅ Page ServicesPage.jsx créée');
    } else {
        console.log('   ❌ Page ServicesPage.jsx manquante');
        allTestsPassed = false;
    }

    if (fs.existsSync(sousDirectionsPagePath)) {
        console.log('   ✅ Page SousDirectionsPage.jsx créée');
    } else {
        console.log('   ❌ Page SousDirectionsPage.jsx manquante');
        allTestsPassed = false;
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Toutes les vérifications ont réussi !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log(`   - ${expectedRoutes.length} routes par application`);
    console.log('   - Fichiers routes.js mis à jour');
    console.log('   - Fichiers App.jsx mis à jour');
    console.log('   - Pages créées et configurées');
    console.log('\n🚀 Les nouvelles pages sont prêtes à être utilisées !');
    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines vérifications ont échoué.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}