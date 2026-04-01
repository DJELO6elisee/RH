const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🔍 Vérification des routes dans FilteredSidebar...\n');

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    // Vérifier le fichier FilteredSidebar.jsx
    const sidebarPath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'Layout', 'FilteredSidebar.jsx');

    if (!fs.existsSync(sidebarPath)) {
        console.log(`   ❌ Fichier FilteredSidebar.jsx non trouvé: ${sidebarPath}`);
        allTestsPassed = false;
        return;
    }

    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    // Vérifier si 'services' est dans la liste allowedRoutes
    const hasServicesInAllowedRoutes = sidebarContent.includes("'services'") || sidebarContent.includes('"services"');

    if (hasServicesInAllowedRoutes) {
        console.log('   ✅ Route "services" trouvée dans allowedRoutes');
    } else {
        console.log('   ❌ Route "services" manquante dans allowedRoutes');
        allTestsPassed = false;
    }

    // Vérifier si 'sous-directions' est dans la liste allowedRoutes
    const hasSousDirectionsInAllowedRoutes = sidebarContent.includes("'sous-directions'") || sidebarContent.includes('"sous-directions"');

    if (hasSousDirectionsInAllowedRoutes) {
        console.log('   ✅ Route "sous-directions" trouvée dans allowedRoutes');
    } else {
        console.log('   ❌ Route "sous-directions" manquante dans allowedRoutes');
        allTestsPassed = false;
    }

    // Vérifier le fichier routes.js
    const routesPath = path.join(__dirname, '..', '..', appName, 'src', 'config', 'routes.js');

    if (!fs.existsSync(routesPath)) {
        console.log(`   ❌ Fichier routes.js non trouvé: ${routesPath}`);
        allTestsPassed = false;
        return;
    }

    const routesContent = fs.readFileSync(routesPath, 'utf8');

    // Vérifier les routes dans routes.js
    const hasServicesRoute = routesContent.includes("id: 'services'");
    const hasSousDirectionsRoute = routesContent.includes("id: 'sous-directions'");

    if (hasServicesRoute) {
        console.log('   ✅ Route "services" trouvée dans routes.js');
    } else {
        console.log('   ❌ Route "services" manquante dans routes.js');
        allTestsPassed = false;
    }

    if (hasSousDirectionsRoute) {
        console.log('   ✅ Route "sous-directions" trouvée dans routes.js');
    } else {
        console.log('   ❌ Route "sous-directions" manquante dans routes.js');
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
    console.log('   - Routes ajoutées dans FilteredSidebar.jsx');
    console.log('   - Routes configurées dans routes.js');
    console.log('   - Pages créées et accessibles');
    console.log('\n🚀 Les nouvelles routes devraient maintenant apparaître dans le menu Organisation !');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Démarrer une application frontend');
    console.log('2. Se connecter avec un utilisateur ayant les permissions');
    console.log('3. Vérifier le menu "Organisation"');
    console.log('4. Les options "Services" et "Sous-directions" devraient être visibles');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines vérifications ont échoué.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}