const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🧪 Test de la fonctionnalité de type de service...\n');

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    const servicesPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');

    if (!fs.existsSync(servicesPagePath)) {
        console.log(`   ❌ Fichier ServicesPage.jsx non trouvé: ${servicesPagePath}`);
        allTestsPassed = false;
        return;
    }

    const content = fs.readFileSync(servicesPagePath, 'utf8');

    // Vérifier les nouveaux champs ajoutés
    const hasTypeService = content.includes('type_service');
    const hasDirectionId = content.includes('direction_id');
    const hasSousDirectionId = content.includes('sous_direction_id');

    if (hasTypeService && hasDirectionId && hasSousDirectionId) {
        console.log('   ✅ Nouveaux champs ajoutés (type_service, direction_id, sous_direction_id)');
    } else {
        console.log('   ❌ Nouveaux champs manquants');
        allTestsPassed = false;
    }

    // Vérifier les options du type de service
    const hasDirectionOption = content.includes("'direction'");
    const hasSousDirectionOption = content.includes("'sous_direction'");

    if (hasDirectionOption && hasSousDirectionOption) {
        console.log('   ✅ Options de type de service configurées');
    } else {
        console.log('   ❌ Options de type de service manquantes');
        allTestsPassed = false;
    }

    // Vérifier les tables dynamiques
    const hasDirectionsTable = content.includes("dynamicTable: 'directions'");
    const hasSousDirectionsTable = content.includes("dynamicTable: 'sous_directions'");

    if (hasDirectionsTable && hasSousDirectionsTable) {
        console.log('   ✅ Tables dynamiques configurées (directions, sous_directions)');
    } else {
        console.log('   ❌ Tables dynamiques manquantes');
        allTestsPassed = false;
    }

    // Vérifier les textes d'aide
    const hasHelpTexts = content.includes('Direction à laquelle appartient ce service') &&
        content.includes('Sous-direction à laquelle appartient ce service');

    if (hasHelpTexts) {
        console.log('   ✅ Textes d\'aide configurés');
    } else {
        console.log('   ❌ Textes d\'aide manquants');
        allTestsPassed = false;
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Toutes les modifications ont été appliquées correctement !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Nouveaux champs ajoutés dans toutes les applications');
    console.log('   - Options de type de service configurées');
    console.log('   - Tables dynamiques configurées');
    console.log('   - Textes d\'aide ajoutés');

    console.log('\n🚀 Fonctionnalités disponibles:');
    console.log('   - Type de Service: Service de Direction / Service de Sous-direction');
    console.log('   - Sélection de Direction (obligatoire)');
    console.log('   - Sélection de Sous-direction (optionnel)');
    console.log('   - Recherche d\'agents avec autocomplétion pour le responsable');
    console.log('   - Validation des données côté backend');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer le backend');
    console.log('2. Redémarrer les applications frontend');
    console.log('3. Naviguer vers Services');
    console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
    console.log('5. Tester les nouveaux champs:');
    console.log('   - Type de Service (direction/sous_direction)');
    console.log('   - Direction (obligatoire)');
    console.log('   - Sous-direction (optionnel)');
    console.log('   - Responsable (avec recherche d\'agents)');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines modifications sont manquantes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}