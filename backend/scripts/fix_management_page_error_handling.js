const fs = require('fs');
const path = require('path');

// Appliquer la correction de gestion d'erreur à toutes les applications
const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

console.log('🔧 Correction de la gestion d\'erreur dans ManagementPage...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si la correction a déjà été appliquée
    if (content.includes('if (!response.ok) {')) {
        console.log(`   ✅ Gestion d'erreur déjà appliquée pour ${appName}`);
        return;
    }

    // Remplacer la gestion des réponses API
    const oldResponseHandling = `const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                const result = await response.json();
                
                if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                    console.log('🔍 DEBUG AGENTS - Réponse API:', response.status);
                    console.log('🔍 DEBUG AGENTS - Résultat:', result);
                }
                
                if (result.success || result.data) {`;

    const newResponseHandling = `const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                
                if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                    console.log('🔍 DEBUG AGENTS - Réponse API:', response.status);
                }
                
                if (!response.ok) {
                    console.error(\`❌ Erreur API pour \${field.dynamicTable}:\`, response.status, response.statusText);
                    // En cas d'erreur, initialiser avec un tableau vide
                    options[field.name] = [];
                    setDynamicOptions({ ...options });
                    return;
                }
                
                const result = await response.json();
                
                if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                    console.log('🔍 DEBUG AGENTS - Résultat:', result);
                }
                
                if (result.success || result.data) {`;

    if (content.includes(oldResponseHandling)) {
        content = content.replace(oldResponseHandling, newResponseHandling);
        console.log(`   ✅ Gestion d'erreur API ajoutée pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
    }

    // Ajouter la vérification des données invalides
    const oldDataHandling = `if (result.success || result.data) {
                    const data = result.data || result;
                    
                    if (field.dynamicTable === 'nationalites') {`;

    const newDataHandling = `if (result.success || result.data) {
                    const data = result.data || result;
                    
                    // Vérifier que data est un tableau
                    if (!Array.isArray(data)) {
                        console.error(\`❌ Données invalides pour \${field.dynamicTable}:\`, data);
                        options[field.name] = [];
                        setDynamicOptions({ ...options });
                        return;
                    }
                    
                    if (field.dynamicTable === 'nationalites') {`;

    if (content.includes(oldDataHandling)) {
        content = content.replace(oldDataHandling, newDataHandling);
        console.log(`   ✅ Vérification des données invalides ajoutée pour ${appName}`);
    }

    // Ajouter la gestion du cas où result n'est pas valide
    const oldEndHandling = `                    } else if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                        console.log('🔍 DEBUG AGENTS - Options mappées:', mappedData.length, 'options');
                    }
                }`;

    const newEndHandling = `                    } else if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                        console.log('🔍 DEBUG AGENTS - Options mappées:', mappedData.length, 'options');
                    }
                } else {
                    console.error(\`❌ Réponse API invalide pour \${field.dynamicTable}:\`, result);
                    options[field.name] = [];
                }`;

    if (content.includes(oldEndHandling)) {
        content = content.replace(oldEndHandling, newEndHandling);
        console.log(`   ✅ Gestion des réponses invalides ajoutée pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Correction de la gestion d\'erreur terminée !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Gestion d\'erreur API ajoutée');
console.log('   - Vérification des données invalides ajoutée');
console.log('   - Gestion des réponses invalides ajoutée');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Naviguer vers Services');
console.log('3. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('4. Vérifier que le formulaire s\'affiche correctement');
console.log('5. Si le problème persiste, vérifier la console du navigateur');

process.exit(0);