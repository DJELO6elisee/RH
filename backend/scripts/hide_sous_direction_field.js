const fs = require('fs');
const path = require('path');

// Masquer le champ sous_direction_id quand le type de service est "direction"
const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

console.log('🔧 Masquage du champ sous-direction pour les services de direction...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si la correction a déjà été appliquée
    if (content.includes('field.name === \'sous_direction_id\'')) {
        console.log(`   ✅ Masquage sous-direction déjà appliqué pour ${appName}`);
        return;
    }

    // Modifier la condition de masquage pour inclure sous_direction_id
    const oldCondition = `// Masquer le champ direction_id si le type de service est "direction"
                            if (field.name === 'direction_id' && formData.type_service === 'direction') {
                                return null;
                            }`;

    const newCondition = `// Masquer les champs direction_id et sous_direction_id si le type de service est "direction"
                            if (formData.type_service === 'direction' && 
                                (field.name === 'direction_id' || field.name === 'sous_direction_id')) {
                                return null;
                            }`;

    if (content.includes(oldCondition)) {
        content = content.replace(oldCondition, newCondition);
        console.log(`   ✅ Condition de masquage mise à jour pour ${appName}`);
    } else {
        console.log(`   ⚠️ Condition de masquage non trouvée pour ${appName}`);
    }

    // Modifier la fonction handleTypeServiceChange pour vider sous_direction_id
    const oldHandleTypeService = `// Vider le champ sous_direction_id car un service de direction n'a pas de sous-direction
            newFormData.sous_direction_id = '';
            console.log('🔧 Sous-direction vidée car service de direction');`;

    const newHandleTypeService = `// Vider le champ sous_direction_id car un service de direction n'a pas de sous-direction
            newFormData.sous_direction_id = '';
            console.log('🔧 Sous-direction vidée car service de direction');`;

    if (!content.includes('Sous-direction vidée car service de direction')) {
        // Ajouter la ligne pour vider sous_direction_id
        const oldDirectionAssignment = `newFormData.direction_id = userDirectionId;
                        console.log('🔧 Direction automatiquement assignée:', userDirectionId);`;

        const newDirectionAssignment = `newFormData.direction_id = userDirectionId;
                        console.log('🔧 Direction automatiquement assignée:', userDirectionId);
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération de la direction:', error);
            }
            // Vider le champ sous_direction_id car un service de direction n'a pas de sous-direction
            newFormData.sous_direction_id = '';
            console.log('🔧 Sous-direction vidée car service de direction');`;

        if (content.includes(oldDirectionAssignment)) {
            content = content.replace(oldDirectionAssignment, newDirectionAssignment);
            console.log(`   ✅ Vidage de sous_direction_id ajouté pour ${appName}`);
        } else {
            console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
        }
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Masquage du champ sous-direction terminé !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Champ sous_direction_id masqué pour services de direction');
console.log('   - Champ sous_direction_id vidé automatiquement');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Se connecter avec un utilisateur directeur');
console.log('3. Naviguer vers Services');
console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('5. Sélectionner "Service de Direction"');
console.log('6. Vérifier que les champs "Direction" et "Sous-direction" disparaissent');
console.log('7. Vérifier que la direction de l\'utilisateur est automatiquement assignée');

process.exit(0);