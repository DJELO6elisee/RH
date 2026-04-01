const fs = require('fs');
const path = require('path');

// Masquer le champ direction_id quand le type de service est "sous_direction"
const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

console.log('🔧 Masquage du champ direction pour les services de sous-direction...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si la correction a déjà été appliquée
    if (content.includes('formData.type_service === \'sous_direction\' && field.name === \'direction_id\'')) {
        console.log(`   ✅ Masquage direction pour sous-direction déjà appliqué pour ${appName}`);
        return;
    }

    // Modifier la condition de masquage pour inclure sous_direction
    const oldCondition = `// Masquer les champs direction_id et sous_direction_id si le type de service est "direction"
                            if (formData.type_service === 'direction' && 
                                (field.name === 'direction_id' || field.name === 'sous_direction_id')) {
                                return null;
                            }`;

    const newCondition = `// Masquer les champs selon le type de service
                            if (formData.type_service === 'direction' && 
                                (field.name === 'direction_id' || field.name === 'sous_direction_id')) {
                                return null;
                            }
                            // Masquer le champ direction_id si le type de service est "sous_direction"
                            if (formData.type_service === 'sous_direction' && field.name === 'direction_id') {
                                return null;
                            }`;

    if (content.includes(oldCondition)) {
        content = content.replace(oldCondition, newCondition);
        console.log(`   ✅ Condition de masquage mise à jour pour ${appName}`);
    } else {
        console.log(`   ⚠️ Condition de masquage non trouvée pour ${appName}`);
    }

    // Modifier la fonction handleTypeServiceChange pour assigner automatiquement la direction
    const oldSousDirectionLogic = `} else if (value === 'sous_direction') {
            // Si c'est un service de sous-direction, vider le champ direction
            newFormData.direction_id = '';
        }`;

    const newSousDirectionLogic = `} else if (value === 'sous_direction' && user?.id_agent) {
            // Si c'est un service de sous-direction, assigner automatiquement la direction de l'utilisateur
            try {
                const agentResponse = await fetch(\`http://localhost:5000/api/agents/\${user.id_agent}\`, {
                    headers: getAuthHeaders()
                });
                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();
                    const userDirectionId = agentData.data?.id_direction;
                    if (userDirectionId) {
                        newFormData.direction_id = userDirectionId;
                        console.log('🔧 Direction automatiquement assignée pour service de sous-direction:', userDirectionId);
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération de la direction pour sous-direction:', error);
            }
        }`;

    if (content.includes(oldSousDirectionLogic)) {
        content = content.replace(oldSousDirectionLogic, newSousDirectionLogic);
        console.log(`   ✅ Logique sous-direction mise à jour pour ${appName}`);
    } else {
        console.log(`   ⚠️ Logique sous-direction non trouvée pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Masquage du champ direction pour sous-direction terminé !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Champ direction_id masqué pour services de sous-direction');
console.log('   - Direction automatiquement assignée pour sous-directions');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Se connecter avec un utilisateur directeur');
console.log('3. Naviguer vers Services');
console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('5. Sélectionner "Service de Sous-direction"');
console.log('6. Vérifier que le champ "Direction" disparaît');
console.log('7. Vérifier que la direction de l\'utilisateur est automatiquement assignée');
console.log('8. Vérifier que le champ "Sous-direction" reste visible');

process.exit(0);
