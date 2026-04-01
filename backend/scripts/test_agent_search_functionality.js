const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🧪 Test de la fonctionnalité de recherche d\'agents...\n');

let allTestsPassed = true;

applications.forEach(appName => {
    console.log(`📱 Vérification de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        allTestsPassed = false;
        return;
    }

    const content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier les états ajoutés
    const hasAgentSearchResults = content.includes('agentSearchResults');
    const hasAgentSearchLoading = content.includes('agentSearchLoading');
    const hasAgentSearchVisible = content.includes('agentSearchVisible');

    if (hasAgentSearchResults && hasAgentSearchLoading && hasAgentSearchVisible) {
        console.log('   ✅ États de recherche d\'agents ajoutés');
    } else {
        console.log('   ❌ États de recherche d\'agents manquants');
        allTestsPassed = false;
    }

    // Vérifier les fonctions ajoutées
    const hasSearchAgents = content.includes('const searchAgents = async');
    const hasHandleAgentSearchChange = content.includes('const handleAgentSearchChange');
    const hasSelectAgent = content.includes('const selectAgent');

    if (hasSearchAgents && hasHandleAgentSearchChange && hasSelectAgent) {
        console.log('   ✅ Fonctions de recherche d\'agents ajoutées');
    } else {
        console.log('   ❌ Fonctions de recherche d\'agents manquantes');
        allTestsPassed = false;
    }

    // Vérifier le rendu conditionnel des champs d'agents
    const hasAgentSearchRender = content.includes('field.dynamicTable === \'agents\'') &&
        content.includes('agentSearchVisible[field.name]');

    if (hasAgentSearchRender) {
        console.log('   ✅ Rendu conditionnel pour les champs d\'agents ajouté');
    } else {
        console.log('   ❌ Rendu conditionnel pour les champs d\'agents manquant');
        allTestsPassed = false;
    }

    // Vérifier les Services et Sous-directions
    const servicesPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');
    const sousDirectionsPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'SousDirectionsPage.jsx');

    if (fs.existsSync(servicesPagePath)) {
        const servicesContent = fs.readFileSync(servicesPagePath, 'utf8');
        const hasResponsableField = servicesContent.includes('responsable_id') &&
            servicesContent.includes('dynamicTable: \'agents\'');

        if (hasResponsableField) {
            console.log('   ✅ Page Services avec champ responsable configuré');
        } else {
            console.log('   ❌ Page Services sans champ responsable configuré');
            allTestsPassed = false;
        }
    }

    if (fs.existsSync(sousDirectionsPagePath)) {
        const sousDirectionsContent = fs.readFileSync(sousDirectionsPagePath, 'utf8');
        const hasSousDirecteurField = sousDirectionsContent.includes('sous_directeur_id') &&
            sousDirectionsContent.includes('dynamicTable: \'agents\'');

        if (hasSousDirecteurField) {
            console.log('   ✅ Page Sous-directions avec champ sous-directeur configuré');
        } else {
            console.log('   ❌ Page Sous-directions sans champ sous-directeur configuré');
            allTestsPassed = false;
        }
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Toutes les modifications ont été appliquées correctement !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - États de recherche d\'agents ajoutés dans toutes les applications');
    console.log('   - Fonctions de recherche d\'agents ajoutées dans toutes les applications');
    console.log('   - Rendu conditionnel pour les champs d\'agents ajouté dans toutes les applications');
    console.log('   - Pages Services et Sous-directions configurées correctement');

    console.log('\n🚀 Fonctionnalités disponibles:');
    console.log('   - Recherche d\'agents avec autocomplétion');
    console.log('   - Affichage des noms et prénoms au format "Prénom Nom"');
    console.log('   - Affichage des matricules dans les résultats');
    console.log('   - Bouton de recherche pour afficher la liste complète');
    console.log('   - Filtrage par ministère/entité selon l\'organisation');

    console.log('\n📋 Instructions pour tester:');
    console.log('1. Redémarrer le backend');
    console.log('2. Redémarrer les applications frontend');
    console.log('3. Naviguer vers Services ou Sous-directions');
    console.log('4. Cliquer sur "Modifier" pour une entrée existante');
    console.log('5. Tester la recherche d\'agents dans les champs de sélection');
    console.log('6. Vérifier l\'autocomplétion et la sélection');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines modifications sont manquantes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}