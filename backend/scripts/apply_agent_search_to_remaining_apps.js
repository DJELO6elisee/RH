const fs = require('fs');
const path = require('path');

// Liste des applications restantes à modifier
const remainingApps = [
    'application-super_admin',
    'entite-template'
];

console.log('🔧 Application de la fonctionnalité de recherche d\'agents aux applications restantes...\n');

remainingApps.forEach(appName => {
    console.log(`📱 Traitement de ${appName}...`);

    const managementPagePath = path.join(__dirname, '..', '..', appName, 'src', 'components', 'ManagementPage.jsx');

    if (!fs.existsSync(managementPagePath)) {
        console.log(`   ❌ Fichier ManagementPage.jsx non trouvé: ${managementPagePath}`);
        return;
    }

    let content = fs.readFileSync(managementPagePath, 'utf8');

    // Vérifier si les modifications ont déjà été appliquées
    if (content.includes('agentSearchResults')) {
        console.log(`   ✅ Modifications déjà appliquées pour ${appName}`);
        return;
    }

    // Remplacer le rendu des champs de sélection
    const oldSelectRender = `) : field.type === 'select' ? (
                                    <Input
                                        type="select"
                                        id={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: handleInputValueChange(field.name, e.target.value) })}
                                        disabled={field.disabled || field.readOnly || false}
                                        readOnly={field.readOnly || false}
                                    >
                                        <option value="">Sélectionner {field.label.toLowerCase()}</option>
                                        {/* Options statiques */}
                                        {field.options && field.options.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                        {/* Options dynamiques */}
                                        {dynamicOptions[field.name] && dynamicOptions[field.name].map((option) => {
                                            // Si l'option est un objet avec value et label (pour les agents)
                                            if (typeof option === 'object' && option.value !== undefined) {
                                                return (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                );
                                            }
                                            // Si l'option est un objet avec id et label (pour MultiStepForm)
                                            if (typeof option === 'object' && option.id !== undefined) {
                                                return (
                                                    <option key={option.id} value={option.id}>
                                                        {option.label}
                                                    </option>
                                                );
                                            }
                                            // Sinon, utiliser la logique existante
                                            return (
                                                <option key={option} value={option}>{option}</option>
                                            );
                                        })}
                                    </Input>`;

    const newSelectRender = `) : field.type === 'select' ? (
                                    // Vérifier si c'est un champ d'agents pour utiliser la recherche
                                    field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions' ? (
                                        <div className="position-relative">
                                            <Input
                                                type="text"
                                                id={field.name}
                                                value={(() => {
                                                    const selectedAgent = dynamicOptions[field.name]?.find(option => 
                                                        option.value === formData[field.name] || option.id === formData[field.name]
                                                    );
                                                    return selectedAgent ? selectedAgent.label : '';
                                                })()}
                                                onChange={(e) => handleAgentSearchChange(field.name, e.target.value)}
                                                placeholder={\`Rechercher \${field.label.toLowerCase()}...\`}
                                                disabled={field.disabled || field.readOnly || false}
                                                readOnly={field.readOnly || false}
                                                style={{ textTransform: 'uppercase' }}
                                            />
                                            
                                            {/* Liste de résultats de recherche */}
                                            {agentSearchVisible[field.name] && (
                                                <div 
                                                    className="position-absolute w-100 bg-white border rounded shadow-lg"
                                                    style={{ 
                                                        zIndex: 1000, 
                                                        maxHeight: '200px', 
                                                        overflowY: 'auto',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0
                                                    }}
                                                >
                                                    {agentSearchLoading[field.name] ? (
                                                        <div className="p-3 text-center">
                                                            <Spinner size="sm" /> Recherche...
                                                        </div>
                                                    ) : agentSearchResults[field.name]?.length > 0 ? (
                                                        agentSearchResults[field.name].map((agent) => (
                                                            <div
                                                                key={agent.id}
                                                                className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                                onClick={() => selectAgent(field.name, agent)}
                                                                style={{ cursor: 'pointer' }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                            >
                                                                <div className="fw-bold">{agent.label}</div>
                                                                <small className="text-muted">{agent.matricule}</small>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-muted">
                                                            Aucun agent trouvé
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Bouton pour afficher la liste complète */}
                                            <Button
                                                type="button"
                                                color="outline-secondary"
                                                size="sm"
                                                className="position-absolute"
                                                style={{ 
                                                    right: '5px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)',
                                                    zIndex: 999
                                                }}
                                                onClick={() => {
                                                    if (agentSearchVisible[field.name]) {
                                                        setAgentSearchVisible(prev => ({ ...prev, [field.name]: false }));
                                                    } else {
                                                        // Charger tous les agents disponibles
                                                        const allAgents = dynamicOptions[field.name] || [];
                                                        setAgentSearchResults(prev => ({ ...prev, [field.name]: allAgents }));
                                                        setAgentSearchVisible(prev => ({ ...prev, [field.name]: true }));
                                                    }
                                                }}
                                            >
                                                <MdSearch />
                                            </Button>
                                        </div>
                                    ) : (
                                        // Rendu normal pour les autres champs de sélection
                                        <Input
                                            type="select"
                                            id={field.name}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => setFormData({ ...formData, [field.name]: handleInputValueChange(field.name, e.target.value) })}
                                            disabled={field.disabled || field.readOnly || false}
                                            readOnly={field.readOnly || false}
                                        >
                                            <option value="">Sélectionner {field.label.toLowerCase()}</option>
                                            {/* Options statiques */}
                                            {field.options && field.options.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                            {/* Options dynamiques */}
                                            {dynamicOptions[field.name] && dynamicOptions[field.name].map((option) => {
                                                // Si l'option est un objet avec value et label (pour les agents)
                                                if (typeof option === 'object' && option.value !== undefined) {
                                                    return (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    );
                                                }
                                                // Si l'option est un objet avec id et label (pour MultiStepForm)
                                                if (typeof option === 'object' && option.id !== undefined) {
                                                    return (
                                                        <option key={option.id} value={option.id}>
                                                            {option.label}
                                                        </option>
                                                    );
                                                }
                                                // Sinon, utiliser la logique existante
                                                return (
                                                    <option key={option} value={option}>{option}</option>
                                                );
                                            })}
                                        </Input>
                                    )`;

    // Remplacer dans le contenu
    if (content.includes(oldSelectRender)) {
        content = content.replace(oldSelectRender, newSelectRender);
        console.log(`   ✅ Rendu des champs de sélection mis à jour pour ${appName}`);
    } else {
        console.log(`   ⚠️ Pattern de remplacement non trouvé pour ${appName}`);
    }

    // Sauvegarder le fichier modifié
    fs.writeFileSync(managementPagePath, content, 'utf8');
    console.log(`   ✅ Fichier sauvegardé pour ${appName}`);
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Application des modifications terminée !');
console.log('\n✅ Résumé:');
console.log(`   - ${remainingApps.length} applications traitées`);
console.log('   - Fonctionnalité de recherche d\'agents ajoutée');
console.log('   - Autocomplétion avec affichage des noms et matricules');
console.log('   - Bouton de recherche pour afficher la liste complète');

console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Naviguer vers Services ou Sous-directions');
console.log('3. Cliquer sur "Modifier" pour une entrée existante');
console.log('4. Tester la recherche d\'agents dans les champs de sélection');
console.log('5. Vérifier l\'autocomplétion et la sélection');

process.exit(0);