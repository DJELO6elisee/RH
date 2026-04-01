const fs = require('fs');
const path = require('path');

console.log('🔧 Ajout des logs de debug pour les sous-directions...\n');

const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si les logs de debug ont déjà été ajoutés
    if (content.includes('DEBUG ${field.dynamicTable?.toUpperCase()} - URL:')) {
        console.log(`   ✅ Logs de debug déjà présents pour ${appName}`);
        return;
    }

    // Remplacer la section de fetch pour ajouter les logs de debug
    const oldFetchSection = `                const response = await fetch(url, {
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
                }`;

    const newFetchSection = `                console.log(\`🔍 DEBUG \${field.dynamicTable?.toUpperCase()} - URL:\`, url);
                console.log(\`🔍 DEBUG \${field.dynamicTable?.toUpperCase()} - Headers:\`, getAuthHeaders());
                
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                
                console.log(\`🔍 DEBUG \${field.dynamicTable?.toUpperCase()} - Réponse API:\`, response.status, response.statusText);
                
                if (!response.ok) {
                    console.error(\`❌ Erreur API pour \${field.dynamicTable}:\`, response.status, response.statusText);
                    
                    // Afficher plus de détails sur l'erreur
                    if (response.status === 401) {
                        console.error(\`🔐 Erreur d'authentification - Token manquant ou invalide pour \${field.dynamicTable}\`);
                        console.error(\`   Vérifiez que l'utilisateur est bien connecté\`);
                    }
                    
                    // En cas d'erreur, initialiser avec un tableau vide
                    options[field.name] = [];
                    setDynamicOptions({ ...options });
                    return;
                }`;

    if (content.includes(oldFetchSection)) {
        content = content.replace(oldFetchSection, newFetchSection);
        console.log(`   ✅ Logs de debug ajoutés pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Logs de debug ajoutés !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Logs de debug détaillés ajoutés');
console.log('   - Messages d\'erreur d\'authentification améliorés');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Se connecter avec un utilisateur valide');
console.log('3. Naviguer vers Services → Ajouter');
console.log('4. Sélectionner "Service de Sous-direction"');
console.log('5. Ouvrir la console du navigateur (F12)');
console.log('6. Vérifier les logs de debug pour voir:');
console.log('   - L\'URL appelée');
console.log('   - Les headers d\'authentification');
console.log('   - Le statut de la réponse API');
console.log('   - Les erreurs d\'authentification si applicable');

process.exit(0);
