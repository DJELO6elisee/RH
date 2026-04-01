const fs = require('fs');
const path = require('path');

// Liste des applications à modifier
const applications = [
    'application-super_admin',
    'entite-template'
];

console.log('🔧 Mise à jour du formulaire de services dans toutes les applications...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const servicesPagePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPage.jsx');

    if (!fs.existsSync(servicesPagePath)) {
        console.log(`   ❌ Fichier ServicesPage.jsx non trouvé: ${servicesPagePath}`);
        return;
    }

    let content = fs.readFileSync(servicesPagePath, 'utf8');

    // Vérifier si les modifications ont déjà été appliquées
    if (content.includes('type_service')) {
        console.log(`   ✅ Modifications déjà appliquées pour ${appName}`);
        return;
    }

    // Remplacer le tableau des champs
    const oldFields = `const fields = [
        { 
            name: 'libelle', 
            label: 'Libellé du Service', 
            type: 'text', 
            required: true,
            placeholder: 'Ex: Service des Ressources Humaines'
        },
        { 
            name: 'description', 
            label: 'Description', 
            type: 'textarea',
            placeholder: 'Description détaillée du service et de ses missions'
        },
        { 
            name: 'responsable_id', 
            label: 'Responsable du Service', 
            type: 'select', 
            dynamicTable: 'agents', 
            dynamicField: 'nom_prenom',
            helpText: 'Agent responsable de ce service'
        },
        { 
            name: 'is_active', 
            label: 'Service Actif', 
            type: 'checkbox', 
            defaultValue: true,
            helpText: 'Décochez pour désactiver le service'
        }
    ];`;

    const newFields = `const fields = [
        { 
            name: 'libelle', 
            label: 'Libellé du Service', 
            type: 'text', 
            required: true,
            placeholder: 'Ex: Service des Ressources Humaines'
        },
        { 
            name: 'description', 
            label: 'Description', 
            type: 'textarea',
            placeholder: 'Description détaillée du service et de ses missions'
        },
        { 
            name: 'type_service', 
            label: 'Type de Service', 
            type: 'select', 
            required: true,
            options: [
                { value: 'direction', label: 'Service de Direction' },
                { value: 'sous_direction', label: 'Service de Sous-direction' }
            ],
            helpText: 'Sélectionnez si ce service appartient à une direction ou une sous-direction'
        },
        { 
            name: 'direction_id', 
            label: 'Direction', 
            type: 'select', 
            dynamicTable: 'directions', 
            dynamicField: 'libelle',
            required: true,
            helpText: 'Direction à laquelle appartient ce service'
        },
        { 
            name: 'sous_direction_id', 
            label: 'Sous-direction', 
            type: 'select', 
            dynamicTable: 'sous_directions', 
            dynamicField: 'libelle',
            helpText: 'Sous-direction à laquelle appartient ce service (optionnel si service de direction)'
        },
        { 
            name: 'responsable_id', 
            label: 'Responsable du Service', 
            type: 'select', 
            dynamicTable: 'agents', 
            dynamicField: 'nom_prenom',
            helpText: 'Agent responsable de ce service'
        },
        { 
            name: 'is_active', 
            label: 'Service Actif', 
            type: 'checkbox', 
            defaultValue: true,
            helpText: 'Décochez pour désactiver le service'
        }
    ];`;

    // Remplacer dans le contenu
    if (content.includes(oldFields)) {
        content = content.replace(oldFields, newFields);
        console.log(`   ✅ Champs du formulaire mis à jour pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(servicesPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Mise à jour du formulaire de services terminée !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Nouveaux champs ajoutés:');
console.log('     - Type de Service (direction/sous_direction)');
console.log('     - Direction (obligatoire)');
console.log('     - Sous-direction (optionnel)');
console.log('   - Formulaire mis à jour dans toutes les applications');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer le backend');
console.log('2. Redémarrer les applications frontend');
console.log('3. Naviguer vers Services');
console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('5. Vérifier les nouveaux champs: Type de Service, Direction, Sous-direction');

process.exit(0);