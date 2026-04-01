const fs = require('fs');
const path = require('path');

// Créer une version simplifiée du ServicesPage pour déboguer
const applications = [
    'application-super_admin',
    'ministere-education',
    'ministere-tourisme',
    'entite-template'
];

console.log('🔧 Création de versions simplifiées pour déboguer...\n');

const simpleServicesPageContent = `import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdBusiness } from 'react-icons/md';

const ServicesPageSimple = () => {
    // Configuration simplifiée pour déboguer le problème de rechargement
    const fields = [
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
            name: 'is_active', 
            label: 'Service Actif', 
            type: 'checkbox', 
            defaultValue: true,
            helpText: 'Décochez pour désactiver le service'
        }
    ];

    const searchFields = ['libelle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Services (Simple)', active: true }
    ];

    // Configuration des colonnes pour l'affichage dans le tableau
    const displayColumns = [
        { key: 'libelle', label: 'Libellé', sortable: true },
        { key: 'responsable_nom', label: 'Responsable', sortable: true },
        { key: 'is_active', label: 'Statut', sortable: true, type: 'badge' }
    ];

    return (
        <ManagementPage
            title="Services (Version Simple)"
            description="Gestion des services - Version simplifiée pour déboguer"
            icon={MdBusiness}
            apiEndpoint="/api/services"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
            displayColumns={displayColumns}
            allowCreate={true}
            allowEdit={true}
            allowDelete={true}
        />
    );
};

export default ServicesPageSimple;`;

applications.forEach(appName => {
    console.log(`📱 Création pour ${appName}...`);

    const servicesPageSimplePath = path.join(__dirname, '..', '..', appName, 'src', 'pages', 'ServicesPageSimple.jsx');

    // Créer le fichier
    fs.writeFileSync(servicesPageSimplePath, simpleServicesPageContent, 'utf8');
    console.log(`   ✅ ServicesPageSimple.jsx créé`);

    // Ajouter la route dans App.jsx
    const appPath = path.join(__dirname, '..', '..', appName, 'src', 'App.jsx');

    if (fs.existsSync(appPath)) {
        let appContent = fs.readFileSync(appPath, 'utf8');

        // Ajouter l'import si pas déjà présent
        if (!appContent.includes('ServicesPageSimple')) {
            const importMatch = appContent.match(/import.*ServicesPage.*from.*ServicesPage/);
            if (importMatch) {
                appContent = appContent.replace(
                    importMatch[0],
                    `${importMatch[0]}\\nimport ServicesPageSimple from 'pages/ServicesPageSimple';`
                );
            }
        }

        // Ajouter la route si pas déjà présente
        if (!appContent.includes('ServicesPageSimple')) {
            const routeMatch = appContent.match(/<ProtectedRoute.*path="\/services".*component={ServicesPage}/);
            if (routeMatch) {
                appContent = appContent.replace(
                    routeMatch[0],
                    `${routeMatch[0]}\n                <ProtectedRoute path="/services-simple" component={ServicesPageSimple} />`
                );
            }
        }

        fs.writeFileSync(appPath, appContent, 'utf8');
        console.log(`   ✅ Route ajoutée dans App.jsx`);
    }
});

console.log('\n═══════════════════════════════════════════════════\n');
console.log('🎉 Versions simplifiées créées !');
console.log('\n🚀 Instructions pour tester:');
console.log('1. Redémarrer les applications frontend');
console.log('2. Naviguer vers /services-simple');
console.log('3. Tester le bouton "Ajouter"');
console.log('4. Si ça fonctionne, le problème vient des champs dynamiques');
console.log('5. Si ça ne fonctionne pas, le problème est plus profond');

console.log('\n💡 Pour accéder aux versions simplifiées:');
applications.forEach(appName => {
    console.log(`   - ${appName}: http://localhost:3000/services-simple`);
});

process.exit(0);