const fs = require('fs');
const path = require('path');

// Ajouter la logique conditionnelle pour le champ direction
const applications = [
    'application-super_admin',
    'ministere-education',
    'entite-template'
];

console.log('🔧 Ajout de la logique conditionnelle pour le champ direction...\n');

applications.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si la correction a déjà été appliquée
    if (content.includes('handleTypeServiceChange')) {
        console.log(`   ✅ Logique conditionnelle déjà appliquée pour ${appName}`);
        return;
    }

    // Ajouter la fonction handleTypeServiceChange après selectAgent
    const selectAgentFunction = `const selectAgent = (fieldName, agent) => {
        setFormData(prev => ({ ...prev, [fieldName]: agent.id }));
        setAgentSearchVisible(prev => ({ ...prev, [fieldName]: false }));
    };`;

    const newSelectAgentFunction = `const selectAgent = (fieldName, agent) => {
        setFormData(prev => ({ ...prev, [fieldName]: agent.id }));
        setAgentSearchVisible(prev => ({ ...prev, [fieldName]: false }));
    };

    // Fonction pour gérer les changements de type de service
    const handleTypeServiceChange = async (value) => {
        const newFormData = { ...formData, type_service: value };
        
        // Si le type est "direction", récupérer automatiquement la direction de l'utilisateur
        if (value === 'direction' && user?.id_agent) {
            try {
                const agentResponse = await fetch(\`http://localhost:5000/api/agents/\${user.id_agent}\`, {
                    headers: getAuthHeaders()
                });
                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();
                    const userDirectionId = agentData.data?.id_direction;
                    if (userDirectionId) {
                        newFormData.direction_id = userDirectionId;
                        console.log('🔧 Direction automatiquement assignée:', userDirectionId);
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération de la direction:', error);
            }
        } else if (value === 'sous_direction') {
            // Si c'est un service de sous-direction, vider le champ direction
            newFormData.direction_id = '';
        }
        
        setFormData(newFormData);
    };`;

    if (content.includes(selectAgentFunction)) {
        content = content.replace(selectAgentFunction, newSelectAgentFunction);
        console.log(`   ✅ Fonction handleTypeServiceChange ajoutée pour ${appName}`);
    } else {
        console.log(`   ⚠️ Fonction selectAgent non trouvée pour ${appName}`);
    }

    // Modifier le rendu des champs pour masquer conditionnellement le champ direction
    const oldFieldsMap = `{fields.map((field) => (
                            <FormGroup key={field.name}>
                                <Label for={field.name}>{field.label}</Label>`;

    const newFieldsMap = `{fields.map((field) => {
                            // Masquer le champ direction_id si le type de service est "direction"
                            if (field.name === 'direction_id' && formData.type_service === 'direction') {
                                return null;
                            }
                            
                            return (
                                <FormGroup key={field.name}>
                                    <Label for={field.name}>{field.label}</Label>`;

    if (content.includes(oldFieldsMap)) {
        content = content.replace(oldFieldsMap, newFieldsMap);
        console.log(`   ✅ Rendu conditionnel des champs ajouté pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de rendu des champs non trouvé pour ${appName}`);
    }

    // Modifier le onChange du champ type_service
    const oldOnChange = `onChange={(e) => setFormData({ ...formData, [field.name]: handleInputValueChange(field.name, e.target.value) })}`;

    const newOnChange = `onChange={(e) => {
                                                const value = handleInputValueChange(field.name, e.target.value);
                                                if (field.name === 'type_service') {
                                                    handleTypeServiceChange(value);
                                                } else {
                                                    setFormData({ ...formData, [field.name]: value });
                                                }
                                            }}`;

    if (content.includes(oldOnChange)) {
        content = content.replace(oldOnChange, newOnChange);
        console.log(`   ✅ Gestion onChange du type_service ajoutée pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern onChange non trouvé pour ${appName}`);
    }

    // Fermer correctement la fonction map
    const oldFormGroupEnd = `                            </FormGroup>
                        ))}`;

    const newFormGroupEnd = `                            </FormGroup>
                            );
                        })}`;

    if (content.includes(oldFormGroupEnd)) {
        content = content.replace(oldFormGroupEnd, newFormGroupEnd);
        console.log(`   ✅ Fermeture de la fonction map corrigée pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Ajout de la logique conditionnelle terminé !');
console.log('\n✅ Résumé:');
console.log(`   - ${applications.length} applications traitées`);
console.log('   - Fonction handleTypeServiceChange ajoutée');
console.log('   - Rendu conditionnel des champs implémenté');
console.log('   - Gestion onChange du type_service mise à jour');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Se connecter avec un utilisateur directeur');
console.log('3. Naviguer vers Services');
console.log('4. Cliquer sur "Ajouter" pour créer un nouveau service');
console.log('5. Sélectionner "Service de Direction"');
console.log('6. Vérifier que le champ "Direction" disparaît automatiquement');
console.log('7. Vérifier que la direction de l\'utilisateur est automatiquement assignée');

process.exit(0);