const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🔍 Vérification de la suppression des champs "id_entite" des formulaires...\n');

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    // Vérifier ServicesPage.jsx
    const servicesPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');

    if (!fs.existsSync(servicesPagePath)) {
        console.log(`   ❌ Fichier ServicesPage.jsx non trouvé: ${servicesPagePath}`);
        allTestsPassed = false;
        return;
    }

    const servicesContent = fs.readFileSync(servicesPagePath, 'utf8');

    // Vérifier que 'id_entite' n'est pas dans les fields pour Services
    const hasIdEntiteInServices = servicesContent.includes("name: 'id_entite'") || servicesContent.includes('name: "id_entite"');

    if (!hasIdEntiteInServices) {
        console.log('   ✅ Champ "id_entite" supprimé de ServicesPage');
    } else {
        console.log('   ❌ Champ "id_entite" encore présent dans ServicesPage');
        allTestsPassed = false;
    }

    // Vérifier SousDirectionsPage.jsx
    const sousDirectionsPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'SousDirectionsPage.jsx');

    if (!fs.existsSync(sousDirectionsPagePath)) {
        console.log(`   ❌ Fichier SousDirectionsPage.jsx non trouvé: ${sousDirectionsPagePath}`);
        allTestsPassed = false;
        return;
    }

    const sousDirectionsContent = fs.readFileSync(sousDirectionsPagePath, 'utf8');

    // Vérifier que 'id_entite' n'est pas dans les fields pour SousDirections
    const hasIdEntiteInSousDirections = sousDirectionsContent.includes("name: 'id_entite'") || sousDirectionsContent.includes('name: "id_entite"');

    if (!hasIdEntiteInSousDirections) {
        console.log('   ✅ Champ "id_entite" supprimé de SousDirectionsPage');
    } else {
        console.log('   ❌ Champ "id_entite" encore présent dans SousDirectionsPage');
        allTestsPassed = false;
    }

    // Vérifier les champs restants dans ServicesPage
    const servicesFieldsMatch = servicesContent.match(/const fields = \[([\s\S]*?)\];/);
    if (servicesFieldsMatch) {
        const fieldsContent = servicesFieldsMatch[1];
        const fieldNames = [];

        // Extraire les noms des champs
        const nameMatches = fieldsContent.match(/name:\s*['"]([^'"]+)['"]/g);
        if (nameMatches) {
            nameMatches.forEach(match => {
                const name = match.match(/name:\s*['"]([^'"]+)['"]/)[1];
                if (name !== 'id') {
                    fieldNames.push(name);
                }
            });
        }

        console.log('   📋 Champs restants dans ServicesPage:');
        fieldNames.forEach(name => {
            console.log(`      ✅ ${name}`);
        });
    }

    // Vérifier les champs restants dans SousDirectionsPage
    const sousDirectionsFieldsMatch = sousDirectionsContent.match(/const fields = \[([\s\S]*?)\];/);
    if (sousDirectionsFieldsMatch) {
        const fieldsContent = sousDirectionsFieldsMatch[1];
        const fieldNames = [];

        // Extraire les noms des champs
        const nameMatches = fieldsContent.match(/name:\s*['"]([^'"]+)['"]/g);
        if (nameMatches) {
            nameMatches.forEach(match => {
                const name = match.match(/name:\s*['"]([^'"]+)['"]/)[1];
                if (name !== 'id') {
                    fieldNames.push(name);
                }
            });
        }

        console.log('   📋 Champs restants dans SousDirectionsPage:');
        fieldNames.forEach(name => {
            console.log(`      ✅ ${name}`);
        });
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Tous les champs "id_entite" ont été supprimés des formulaires !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Champ "id_entite" supprimé de ServicesPage dans toutes les applications');
    console.log('   - Champ "id_entite" supprimé de SousDirectionsPage dans toutes les applications');
    console.log('   - Champs pertinents conservés');

    console.log('\n🚀 Les tableaux ne devraient plus afficher la colonne "Entité Administrative" !');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer l\'application frontend');
    console.log('2. Vider le cache du navigateur (Ctrl+F5)');
    console.log('3. Naviguer vers Services ou Sous-directions');
    console.log('4. Vérifier que la colonne "Entité Administrative" n\'apparaît plus');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certains champs "id_entite" sont encore présents.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}