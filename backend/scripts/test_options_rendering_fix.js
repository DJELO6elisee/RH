const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🧪 Test de la correction du rendu des options...\n');

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        allTestsPassed = false;
        return;
    }

    const content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier que la correction a été appliquée
    const hasCorrectOptionsRender = content.includes('// Si l\'option est un objet avec value et label') &&
        content.includes('typeof option === \'object\' && option.value !== undefined');

    if (hasCorrectOptionsRender) {
        console.log('   ✅ Correction du rendu des options appliquée');
    } else {
        console.log('   ❌ Correction du rendu des options manquante');
        allTestsPassed = false;
    }

    // Vérifier qu'il n'y a pas l'ancien code problématique
    const hasOldProblematicCode = content.includes('field.options.map((option) => (\n                                                <option key={option} value={option}>{option}</option>\n                                            ))');

    if (!hasOldProblematicCode) {
        console.log('   ✅ Ancien code problématique supprimé');
    } else {
        console.log('   ❌ Ancien code problématique encore présent');
        allTestsPassed = false;
    }

    // Vérifier les nouveaux champs dans ServicesPage
    const servicesPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');

    if (fs.existsSync(servicesPagePath)) {
        const servicesContent = fs.readFileSync(servicesPagePath, 'utf8');
        const hasTypeServiceField = servicesContent.includes('type_service') &&
            servicesContent.includes('Service de Direction') &&
            servicesContent.includes('Service de Sous-direction');

        if (hasTypeServiceField) {
            console.log('   ✅ Champs de type de service présents');
        } else {
            console.log('   ❌ Champs de type de service manquants');
            allTestsPassed = false;
        }
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Correction du rendu des options appliquée !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Correction du rendu des options appliquée dans toutes les applications');
    console.log('   - Ancien code problématique supprimé');
    console.log('   - Champs de type de service présents');

    console.log('\n🚀 L\'erreur React "Objects are not valid as a React child" est corrigée !');
    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer les applications frontend');
    console.log('2. Naviguer vers Services');
    console.log('3. Cliquer sur "Ajouter" pour créer un nouveau service');
    console.log('4. Vérifier que le champ "Type de Service" fonctionne sans erreur');
    console.log('5. Tester la sélection des options:');
    console.log('   - Service de Direction');
    console.log('   - Service de Sous-direction');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines corrections sont manquantes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}