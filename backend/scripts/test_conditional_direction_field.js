const fs = require('fs');
const path = require('path');

console.log('🧪 Test de la logique conditionnelle pour le champ direction...\n');

// Vérifier que les corrections ont été appliquées
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé`);
        allTestsPassed = false;
        return;
    }

    const content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier les corrections appliquées
    const hasHandleTypeServiceChange = content.includes('handleTypeServiceChange');
    const hasConditionalRendering = content.includes('field.name === \'direction_id\' && formData.type_service === \'direction\'');
    const hasOnChangeUpdate = content.includes('if (field.name === \'type_service\') {');

    console.log(`   📋 Corrections appliquées:`);
    console.log(`      - Fonction handleTypeServiceChange: ${hasHandleTypeServiceChange ? '✅' : '❌'}`);
    console.log(`      - Rendu conditionnel: ${hasConditionalRendering ? '✅' : '❌'}`);
    console.log(`      - Gestion onChange type_service: ${hasOnChangeUpdate ? '✅' : '❌'}`);

    if (!hasHandleTypeServiceChange || !hasConditionalRendering || !hasOnChangeUpdate) {
        allTestsPassed = false;
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Logique conditionnelle appliquée !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Fonction handleTypeServiceChange ajoutée');
    console.log('   - Rendu conditionnel des champs implémenté');
    console.log('   - Gestion onChange du type_service mise à jour');

    console.log('\n🚀 La logique conditionnelle devrait fonctionner !');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer les applications frontend');
    console.log('2. Se connecter avec un utilisateur directeur');
    console.log('3. Naviguer vers Services');
    console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
    console.log('5. Sélectionner "Service de Direction"');
    console.log('6. Vérifier que le champ "Direction" disparaît automatiquement');
    console.log('7. Vérifier que la direction de l\'utilisateur est automatiquement assignée');

    console.log('\n🔧 Comportement attendu:');
    console.log('- Quand "Service de Direction" est sélectionné :');
    console.log('  ✅ Le champ "Direction" disparaît du formulaire');
    console.log('  ✅ La direction de l\'utilisateur est automatiquement assignée');
    console.log('- Quand "Service de Sous-direction" est sélectionné :');
    console.log('  ✅ Le champ "Direction" reste visible');
    console.log('  ✅ L\'utilisateur peut choisir une direction');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines corrections sont manquantes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}