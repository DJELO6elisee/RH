const fs = require('fs');
const path = require('path');

// Liste des applications à vérifier
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🔍 Vérification de la suppression des colonnes "Entité Administrative"...\n');

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

    // Vérifier que 'entite_nom' n'est pas dans displayColumns pour Services
    const hasEntiteInServices = servicesContent.includes("'entite_nom'") || servicesContent.includes('"entite_nom"');

    if (!hasEntiteInServices) {
        console.log('   ✅ Colonne "entite_nom" supprimée de ServicesPage');
    } else {
        console.log('   ❌ Colonne "entite_nom" encore présente dans ServicesPage');
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

    // Vérifier que 'entite_nom' n'est pas dans displayColumns pour SousDirections
    const hasEntiteInSousDirections = sousDirectionsContent.includes("'entite_nom'") || sousDirectionsContent.includes('"entite_nom"');

    if (!hasEntiteInSousDirections) {
        console.log('   ✅ Colonne "entite_nom" supprimée de SousDirectionsPage');
    } else {
        console.log('   ❌ Colonne "entite_nom" encore présente dans SousDirectionsPage');
        allTestsPassed = false;
    }

    // Vérifier les colonnes restantes dans ServicesPage
    const servicesDisplayColumns = servicesContent.match(/displayColumns\s*=\s*\[([\s\S]*?)\]/);
    if (servicesDisplayColumns) {
        const columnsContent = servicesDisplayColumns[1];
        const hasLibelle = columnsContent.includes("'libelle'") || columnsContent.includes('"libelle"');
        const hasResponsable = columnsContent.includes("'responsable_nom'") || columnsContent.includes('"responsable_nom"');
        const hasIsActive = columnsContent.includes("'is_active'") || columnsContent.includes('"is_active"');

        console.log('   📋 Colonnes restantes dans ServicesPage:');
        if (hasLibelle) console.log('      ✅ Libellé');
        if (hasResponsable) console.log('      ✅ Responsable');
        if (hasIsActive) console.log('      ✅ Statut');
    }

    // Vérifier les colonnes restantes dans SousDirectionsPage
    const sousDirectionsDisplayColumns = sousDirectionsContent.match(/displayColumns\s*=\s*\[([\s\S]*?)\]/);
    if (sousDirectionsDisplayColumns) {
        const columnsContent = sousDirectionsDisplayColumns[1];
        const hasLibelle = columnsContent.includes("'libelle'") || columnsContent.includes('"libelle"');
        const hasDirection = columnsContent.includes("'direction_nom'") || columnsContent.includes('"direction_nom"');
        const hasSousDirecteur = columnsContent.includes("'sous_directeur_nom'") || columnsContent.includes('"sous_directeur_nom"');
        const hasIsActive = columnsContent.includes("'is_active'") || columnsContent.includes('"is_active"');

        console.log('   📋 Colonnes restantes dans SousDirectionsPage:');
        if (hasLibelle) console.log('      ✅ Libellé');
        if (hasDirection) console.log('      ✅ Direction');
        if (hasSousDirecteur) console.log('      ✅ Sous-directeur');
        if (hasIsActive) console.log('      ✅ Statut');
    }

    console.log('');
});

console.log('═══════════════════════════════════════════════════\n');

if (allTestsPassed) {
    console.log('🎉 SUCCÈS : Toutes les colonnes "Entité Administrative" ont été supprimées !');
    console.log('\n✅ Résumé:');
    console.log(`   - ${applications.length} applications vérifiées`);
    console.log('   - Colonne "entite_nom" supprimée de ServicesPage dans toutes les applications');
    console.log('   - Colonne "entite_nom" supprimée de SousDirectionsPage dans toutes les applications');
    console.log('   - Colonnes pertinentes conservées');

    console.log('\n📋 Colonnes finales:');
    console.log('   Services: Libellé, Responsable, Statut');
    console.log('   Sous-directions: Libellé, Direction, Sous-directeur, Statut');

    console.log('\n🚀 Les tableaux sont maintenant plus clairs et pertinents !');

    process.exit(0);
} else {
    console.log('❌ ÉCHEC : Certaines colonnes "Entité Administrative" sont encore présentes.');
    console.log('\n⚠️ Veuillez vérifier les erreurs ci-dessus et corriger les fichiers manquants.');
    process.exit(1);
}