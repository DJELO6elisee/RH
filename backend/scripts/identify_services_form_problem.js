const fs = require('fs');
const path = require('path');

console.log('🔍 Identification du problème avec le formulaire de services...\n');

// Vérifier la configuration des champs dans ServicesPage
const servicesPagePath = path.join(__dirname, '..', '..', 'ministere-tourisme', 'src', 'pages', 'ServicesPage.jsx');

if (!fs.existsSync(servicesPagePath)) {
    console.log('❌ Fichier ServicesPage.jsx non trouvé');
    process.exit(1);
}

const content = fs.readFileSync(servicesPagePath, 'utf8');

// Extraire la configuration des champs
const fieldsMatch = content.match(/const fields = \[([\s\S]*?)\];/);

if (fieldsMatch) {
    console.log('📋 Configuration des champs trouvée:');
    console.log('   Voici les champs configurés:');

    // Analyser chaque champ
    const fieldsText = fieldsMatch[1];
    const fieldMatches = fieldsText.match(/\{[^}]*\}/g);

    if (fieldMatches) {
        fieldMatches.forEach((field, index) => {
            console.log(`\n   Champ ${index + 1}:`);

            // Extraire les propriétés du champ
            const nameMatch = field.match(/name:\s*['"`]([^'"`]+)['"`]/);
            const typeMatch = field.match(/type:\s*['"`]([^'"`]+)['"`]/);
            const dynamicTableMatch = field.match(/dynamicTable:\s*['"`]([^'"`]+)['"`]/);
            const requiredMatch = field.match(/required:\s*(true|false)/);
            const optionsMatch = field.match(/options:\s*\[/);

            if (nameMatch) console.log(`      - Nom: ${nameMatch[1]}`);
            if (typeMatch) console.log(`      - Type: ${typeMatch[1]}`);
            if (dynamicTableMatch) console.log(`      - Table dynamique: ${dynamicTableMatch[1]}`);
            if (requiredMatch) console.log(`      - Obligatoire: ${requiredMatch[1]}`);
            if (optionsMatch) console.log(`      - Options statiques: Oui`);

            // Identifier les champs potentiellement problématiques
            if (dynamicTableMatch && (dynamicTableMatch[1] === 'directions' || dynamicTableMatch[1] === 'sous_directions' || dynamicTableMatch[1] === 'agents')) {
                console.log(`      ⚠️  CHAMP DYNAMIQUE POTENTIELLEMENT PROBLÉMATIQUE: ${dynamicTableMatch[1]}`);
            }
        });
    }

    console.log('\n🔍 ANALYSE DU PROBLÈME:');
    console.log('   Le problème peut venir de plusieurs sources:');
    console.log('   1. Chargement des données dynamiques (directions, sous_directions, agents)');
    console.log('   2. Erreur dans la logique de rendu des options');
    console.log('   3. Problème de permissions ou d\'authentification');
    console.log('   4. Erreur JavaScript dans le composant ManagementPage');

    console.log('\n💡 SOLUTIONS RECOMMANDÉES:');
    console.log('   1. Tester avec la version simplifiée (/services-simple)');
    console.log('   2. Vérifier la console du navigateur (F12) pour les erreurs');
    console.log('   3. Vérifier que l\'utilisateur a les bonnes permissions');
    console.log('   4. Tester avec un utilisateur admin/drh');

} else {
    console.log('❌ Configuration des champs non trouvée');
}

console.log('\n🧪 TEST RECOMMANDÉ:');
console.log('1. Redémarrer l\'application ministere-tourisme');
console.log('2. Se connecter avec un utilisateur DRH');
console.log('3. Aller sur /services-simple');
console.log('4. Tester le bouton "Ajouter"');
console.log('5. Si ça fonctionne, le problème vient des champs dynamiques');
console.log('6. Si ça ne fonctionne pas, vérifier la console du navigateur');

process.exit(0);