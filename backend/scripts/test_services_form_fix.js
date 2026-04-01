const fs = require('fs');
const path = require('path');

console.log('🧪 Test de la correction du formulaire de services...\n');

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
    const hasErrorHandling = content.includes('if (!response.ok) {');
    const hasDataValidation = content.includes('if (!Array.isArray(data)) {');
    const hasInvalidResponseHandling = content.includes('console.error(`❌ Réponse API invalide');

    console.log(`   📋 Corrections appliquées:`);
    console.log(`      - Gestion d'erreur API: ${hasErrorHandling ? '✅' : '❌'}`);
    console.log(`      - Validation des données: ${hasDataValidation ? '✅' : '❌'}`);
    console.log(`      - Gestion réponse invalide: ${hasInvalidResponseHandling ? '✅' : '❌'}`);

    if (!hasErrorHandling || !hasDataValidation || !hasInvalidResponseHandling) {
        allTestsPassed = false;
    }

    // Vérifier que la version simplifiée existe
    const simplePagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPageSimple.jsx');
    const hasSimplePage = fs.existsSync(simplePagePath);
    console.log(`      - Page simplifiée: ${hasSimplePage ? '✅' : '❌'}`);

    if (!hasSimplePage) {
        allTestsPassed = false;
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Corrections appliquées !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Gestion d\'erreur API ajoutée');
    console.log('   - Validation des données ajoutée');
    console.log('   - Gestion des réponses invalides ajoutée');
    console.log('   - Pages simplifiées créées');

    console.log('\n🚀 Le problème de rechargement devrait être corrigé !');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer les applications frontend');
    console.log('2. Se connecter avec un utilisateur DRH');
    console.log('3. Naviguer vers Services');
    console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
    console.log('5. Le formulaire devrait s\'afficher sans recharger la page');

    console.log('\n🔧 Si le problème persiste:');
    console.log('1. Tester avec la version simplifiée: /services-simple');
    console.log('2. Vérifier la console du navigateur (F12) pour les erreurs');
    console.log('3. Vérifier que l\'utilisateur a les bonnes permissions');
    console.log('4. S\'assurer que le backend est démarré et accessible');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines corrections sont manquantes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}