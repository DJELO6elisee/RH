const fs = require('fs');
const path = require('path');

console.log('🔍 Debug du problème des sous-directions dans le frontend...\n');

// Vérifier la configuration du champ sous_direction_id
function checkServicesPageConfiguration() {
    console.log('📋 1. Vérification de la configuration ServicesPage.jsx...');

    const servicesPagePath = path.join(__dirname, '..', '..', 'ministere-tourisme', 'src', 'pages', 'ServicesPage.jsx');

    if (!fs.existsSync(servicesPagePath)) {
        console.log('❌ Fichier ServicesPage.jsx non trouvé');
        return false;
    }

    const content = fs.readFileSync(servicesPagePath, 'utf8');

    // Vérifier la configuration du champ sous_direction_id
    const sousDirectionFieldRegex = /name:\s*['"]sous_direction_id['"].*?dynamicTable:\s*['"]sous_directions['"]/s;
    const hasCorrectConfig = sousDirectionFieldRegex.test(content);

    console.log(`   ✅ Configuration sous_direction_id: ${hasCorrectConfig ? 'Correcte' : 'Incorrecte'}`);

    if (hasCorrectConfig) {
        console.log('   📝 Le champ est configuré avec dynamicTable: "sous_directions"');
    } else {
        console.log('   ❌ Le champ n\'est pas correctement configuré');
        return false;
    }

    // Vérifier que dynamicField est défini
    const dynamicFieldRegex = /dynamicField:\s*['"]libelle['"]/;
    const hasDynamicField = dynamicFieldRegex.test(content);

    console.log(`   ✅ DynamicField configuré: ${hasDynamicField ? 'Oui (libelle)' : 'Non'}`);

    return hasCorrectConfig && hasDynamicField;
}

// Vérifier la gestion des erreurs dans ManagementPage
function checkManagementPageErrorHandling() {
    console.log('\n🔧 2. Vérification de la gestion d\'erreurs dans ManagementPage.jsx...');

    const managementPagePath = path.join(__dirname, '..', '..', 'ministere-tourisme', 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log('❌ Fichier ManagementPage.jsx non trouvé');
        return false;
    }

    const content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier la gestion d'erreur pour les réponses API
    const hasErrorHandling = content.includes('if (!response.ok)') &&
        content.includes('console.error') &&
        content.includes('options[field.name] = []');

    console.log(`   ✅ Gestion d'erreurs API: ${hasErrorHandling ? 'Présente' : 'Manquante'}`);

    // Vérifier les logs de debug
    const hasDebugLogs = content.includes('console.log') && content.includes('DEBUG');
    console.log(`   ✅ Logs de debug: ${hasDebugLogs ? 'Présents' : 'Manquants'}`);

    // Vérifier la fonction getAuthHeaders
    const hasAuthHeaders = content.includes('getAuthHeaders') &&
        content.includes('localStorage.getItem(\'token\')');
    console.log(`   ✅ Fonction getAuthHeaders: ${hasAuthHeaders ? 'Présente' : 'Manquante'}`);

    return hasErrorHandling && hasAuthHeaders;
}

// Créer un script de test pour le frontend
function createFrontendTestScript() {
    console.log('\n📝 3. Création d\'un script de test frontend...');

    const testScript = `
// Script de test pour vérifier les sous-directions dans le frontend
// À exécuter dans la console du navigateur

console.log('🧪 Test des sous-directions dans le frontend...');

// 1. Vérifier le token d'authentification
const token = localStorage.getItem('token');
console.log('🔐 Token présent:', !!token);
if (token) {
    console.log('   Token (premiers caractères):', token.substring(0, 20) + '...');
} else {
    console.log('   ❌ Aucun token trouvé - l\'utilisateur n\'est pas connecté');
    return;
}

// 2. Tester l'API directement
fetch('http://localhost:5000/api/sous-directions', {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
    }
})
.then(response => {
    console.log('📡 Réponse API:', response.status, response.statusText);
    return response.json();
})
.then(data => {
    console.log('📄 Données reçues:', data);
    if (data.success && data.data) {
        console.log(\`✅ \${data.data.length} sous-direction(s) récupérée(s)\`);
        data.data.forEach((sd, index) => {
            console.log(\`   \${index + 1}. ID: \${sd.id}, Libellé: "\${sd.libelle}"\`);
        });
    } else {
        console.log('❌ Erreur API:', data.message);
    }
})
.catch(error => {
    console.error('❌ Erreur de requête:', error);
});

// 3. Vérifier les options dynamiques dans le composant
console.log('🔍 Vérification des options dynamiques...');
// Note: Cette partie nécessite d'être dans le contexte React
`;

    const testScriptPath = path.join(__dirname, 'frontend_test_sous_directions.js');
    fs.writeFileSync(testScriptPath, testScript);

    console.log('   ✅ Script créé: frontend_test_sous_directions.js');
    console.log('   📋 Instructions:');
    console.log('      1. Copier le contenu du script');
    console.log('      2. Ouvrir la console du navigateur (F12)');
    console.log('      3. Coller et exécuter le script');
    console.log('      4. Vérifier les résultats');
}

// Fonction principale
function main() {
    console.log('🔍 Diagnostic du problème des sous-directions...\n');

    const configOk = checkServicesPageConfiguration();
    const managementOk = checkManagementPageErrorHandling();

    createFrontendTestScript();

    console.log('\n═══════════════════════════════════════════════════\n');

    if (configOk && managementOk) {
        console.log('✅ Configuration frontend correcte');
        console.log('\n💡 Le problème vient probablement de:');
        console.log('   1. L\'utilisateur n\'est pas connecté (pas de token)');
        console.log('   2. Le token a expiré');
        console.log('   3. Un problème de timing dans le chargement');

        console.log('\n🔧 Solutions à essayer:');
        console.log('   1. Se reconnecter dans l\'application');
        console.log('   2. Vérifier la console du navigateur pour les erreurs');
        console.log('   3. Exécuter le script de test frontend créé');
        console.log('   4. Vérifier l\'onglet Network pour voir les requêtes API');

    } else {
        console.log('❌ Configuration frontend incorrecte');
        console.log('   Vérifiez les erreurs ci-dessus et corrigez la configuration');
    }

    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Tester avec un utilisateur connecté');
    console.log('   2. Vérifier les logs de la console du navigateur');
    console.log('   3. Utiliser le script de test frontend');
}

main();
