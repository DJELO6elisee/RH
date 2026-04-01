const fs = require('fs');
const path = require('path');

console.log('🧪 Test du masquage du champ sous-direction...\n');

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
    const hasHideSousDirection = content.includes('field.name === \'sous_direction_id\'');
    const hasHideBothFields = content.includes('direction_id\' || field.name === \'sous_direction_id\'');
    const hasClearSousDirection = content.includes('Sous-direction vidée car service de direction');
    const hasClearSousDirectionValue = content.includes('newFormData.sous_direction_id = \'\'');

    console.log(`   📋 Corrections appliquées:`);
    console.log(`      - Masquage sous_direction_id: ${hasHideSousDirection ? '✅' : '❌'}`);
    console.log(`      - Masquage des deux champs: ${hasHideBothFields ? '✅' : '❌'}`);
    console.log(`      - Vidage sous_direction_id: ${hasClearSousDirectionValue ? '✅' : '❌'}`);
    console.log(`      - Log de débogage: ${hasClearSousDirection ? '✅' : '❌'}`);

    if (!hasHideSousDirection || !hasHideBothFields || !hasClearSousDirectionValue || !hasClearSousDirection) {
        allTestsPassed = false;
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Masquage du champ sous-direction appliqué !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Champ sous_direction_id masqué pour services de direction');
    console.log('   - Champ sous_direction_id vidé automatiquement');
    console.log('   - Logs de débogage ajoutés');

    console.log('\n🚀 Le masquage du champ sous-direction devrait fonctionner !');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer les applications frontend');
    console.log('2. Se connecter avec un utilisateur directeur');
    console.log('3. Naviguer vers Services');
    console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
    console.log('5. Sélectionner "Service de Direction"');
    console.log('6. Vérifier que les champs "Direction" et "Sous-direction" disparaissent');
    console.log('7. Vérifier que la direction de l\'utilisateur est automatiquement assignée');

    console.log('\n🔧 Comportement attendu:');
    console.log('- Quand "Service de Direction" est sélectionné :');
    console.log('  ✅ Le champ "Direction" disparaît du formulaire');
    console.log('  ✅ Le champ "Sous-direction" disparaît du formulaire');
    console.log('  ✅ La direction de l\'utilisateur est automatiquement assignée');
    console.log('  ✅ La sous-direction est automatiquement vidée');
    console.log('- Quand "Service de Sous-direction" est sélectionné :');
    console.log('  ✅ Le champ "Direction" reste visible');
    console.log('  ✅ Le champ "Sous-direction" reste visible');
    console.log('  ✅ L\'utilisateur peut choisir manuellement');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines corrections sont manquantes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}