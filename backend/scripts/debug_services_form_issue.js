const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🔍 Débogage du problème de formulaire de services...\n');

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    const servicesPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');

    if (!fs.existsSync(servicesPagePath)) {
        console.log(`   ❌ Fichier ServicesPage.jsx non trouvé: ${servicesPagePath}`);
        return;
    }

    const content = fs.readFileSync(servicesPagePath, 'utf8');

    // Extraire la configuration des champs
    const fieldsMatch = content.match(/const fields = \[([\s\S]*?)\];/);

    if (fieldsMatch) {
        console.log('   📋 Configuration des champs trouvée:');

        // Vérifier les champs problématiques
        const hasTypeService = content.includes('type_service');
        const hasDirectionId = content.includes('direction_id');
        const hasSousDirectionId = content.includes('sous_direction_id');

        console.log(`      - type_service: ${hasTypeService ? '✅' : '❌'}`);
        console.log(`      - direction_id: ${hasDirectionId ? '✅' : '❌'}`);
        console.log(`      - sous_direction_id: ${hasSousDirectionId ? '✅' : '❌'}`);

        // Vérifier la configuration des options
        const hasOptionsConfig = content.includes('options: [');
        console.log(`      - Configuration des options: ${hasOptionsConfig ? '✅' : '❌'}`);

        // Vérifier les dynamicTable
        const hasDirectionsTable = content.includes("dynamicTable: 'directions'");
        const hasSousDirectionsTable = content.includes("dynamicTable: 'sous_directions'");
        const hasAgentsTable = content.includes("dynamicTable: 'agents'");

        console.log(`      - directions table: ${hasDirectionsTable ? '✅' : '❌'}`);
        console.log(`      - sous_directions table: ${hasSousDirectionsTable ? '✅' : '❌'}`);
        console.log(`      - agents table: ${hasAgentsTable ? '✅' : '❌'}`);

        // Vérifier les propriétés required
        const hasRequiredFields = content.includes('required: true');
        console.log(`      - Champs obligatoires: ${hasRequiredFields ? '✅' : '❌'}`);

    } else {
        console.log('   ❌ Configuration des champs non trouvée');
    }

    // Vérifier la configuration du ManagementPage
    const hasManagementPage = content.includes('<ManagementPage');
    const hasApiEndpoint = content.includes('apiEndpoint="/api/services"');
    const hasAllowCreate = content.includes('allowCreate={true}');

    console.log(`   📋 Configuration ManagementPage:`);
    console.log(`      - Composant ManagementPage: ${hasManagementPage ? '✅' : '❌'}`);
    console.log(`      - API endpoint: ${hasApiEndpoint ? '✅' : '❌'}`);
    console.log(`      - Allow create: ${hasAllowCreate ? '✅' : '❌'}`);

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');
console.log('🔍 DIAGNOSTIC TERMINÉ');
console.log('\n💡 Solutions possibles:');
console.log('1. Vérifier la console du navigateur pour les erreurs JavaScript');
console.log('2. S\'assurer que l\'API /api/services est accessible');
console.log('3. Vérifier que les tables directions, sous_directions et agents existent');
console.log('4. Tester avec un formulaire simplifié sans les nouveaux champs');

process.exit(0);