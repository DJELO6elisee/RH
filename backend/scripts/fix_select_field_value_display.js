const fs = require('fs');
const path = require('path');

// Corriger l'affichage des valeurs dans les champs de sélection
const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

console.log('🔧 Correction de l\'affichage des valeurs dans les champs de sélection...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si la correction a déjà été appliquée
    if (content.includes('fieldName !== \'type_service\'')) {
        console.log(`   ✅ Correction déjà appliquée pour ${appName}`);
        return;
    }

    // Remplacer la fonction handleInputValueChange
    const oldFunction = `const handleInputValueChange = (fieldName, value) => {
        let processedValue = value;
        if (typeof value === 'string' && fieldName !== 'email') {
            processedValue = value.toUpperCase();
        }
        return processedValue;
    };`;

    const newFunction = `const handleInputValueChange = (fieldName, value) => {
        let processedValue = value;
        // Ne pas convertir en majuscules pour les champs de sélection et email
        if (typeof value === 'string' && fieldName !== 'email' && fieldName !== 'type_service' && fieldName !== 'direction_id' && fieldName !== 'sous_direction_id' && fieldName !== 'responsable_id') {
            processedValue = value.toUpperCase();
        }
        return processedValue;
    };`;

    if (content.includes(oldFunction)) {
        content = content.replace(oldFunction, newFunction);
        console.log(`   ✅ Fonction handleInputValueChange corrigée pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Correction de l\'affichage des valeurs terminée !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Fonction handleInputValueChange corrigée');
console.log('   - Champs de sélection exclus de la conversion en majuscules');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Naviguer vers Services');
console.log('3. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('4. Sélectionner un type de service');
console.log('5. Vérifier que la valeur s\'affiche correctement dans le champ');

process.exit(0);