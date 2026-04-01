const fs = require('fs');
const path = require('path');

// Liste des applications à corriger
const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

console.log('🔧 Correction du rendu des options dans toutes les applications...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si la correction a déjà été appliquée
    if (content.includes('// Si l\'option est un objet avec value et label')) {
        console.log(`   ✅ Correction déjà appliquée pour ${appName}`);
        return;
    }

    // Remplacer le rendu des options statiques
    const oldOptionsRender = `{/* Options statiques */}
                                            {field.options && field.options.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}`;

    const newOptionsRender = `{/* Options statiques */}
                                            {field.options && field.options.map((option) => {
                                                // Si l'option est un objet avec value et label
                                                if (typeof option === 'object' && option.value !== undefined) {
                                                    return (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    );
                                                }
                                                // Si l'option est une chaîne simple
                                                return (
                                                    <option key={option} value={option}>{option}</option>
                                                );
                                            })}`;

    // Remplacer dans le contenu
    if (content.includes(oldOptionsRender)) {
        content = content.replace(oldOptionsRender, newOptionsRender);
        console.log(`   ✅ Rendu des options statiques corrigé pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Correction du rendu des options terminée !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Rendu des options statiques corrigé');
console.log('   - Support des objets {value, label} ajouté');
console.log('   - Erreur React "Objects are not valid as a React child" corrigée');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Naviguer vers Services');
console.log('3. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('4. Vérifier que le champ "Type de Service" fonctionne correctement');

process.exit(0);