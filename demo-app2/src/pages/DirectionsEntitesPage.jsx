import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdWork } from 'react-icons/md';

const DirectionsEntitesPage = () => {
    const fields = [
        { 
            name: 'id_entite', 
            label: 'Entité Administrative', 
            type: 'select', 
            dynamicTable: 'entites', 
            dynamicField: 'nom', 
            required: true,
            helpText: 'Sélectionnez l\'entité administrative à laquelle cette direction appartient'
        },
        { 
            name: 'libelle', 
            label: 'Libellé de la Direction', 
            type: 'text', 
            required: true,
            placeholder: 'Ex: Direction des Ressources Humaines'
        },
        { 
            name: 'description', 
            label: 'Description', 
            type: 'textarea',
            placeholder: 'Description détaillée du service et de ses missions'
        },
        { 
            name: 'code', 
            label: 'Code du Service', 
            type: 'text',
            placeholder: 'Ex: SRH, SIT, SAD'
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
    ];

    const searchFields = ['libelle', 'description', 'code'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Directions par Entité', active: true }
    ];

    // Configuration des colonnes pour l'affichage dans le tableau
    const tableColumns = [
        { key: 'libelle', label: 'Direction', sortable: true },
        { key: 'nom_entite', label: 'Entité', sortable: true },
        { key: 'type_entite', label: 'Type Entité', sortable: true },
        { key: 'nom_ministere', label: 'Ministère', sortable: true },
        { key: 'code', label: 'Code', sortable: true },
        { key: 'is_active', label: 'Statut', type: 'badge', 
          badgeConfig: {
            true: { text: 'Actif', color: 'success' },
            false: { text: 'Inactif', color: 'danger' }
          }
        }
    ];

    // Filtres avancés disponibles
    const advancedFilters = [
        {
            name: 'id_ministere',
            label: 'Ministère',
            type: 'select',
            dynamicTable: 'ministeres',
            dynamicField: 'nom'
        },
        {
            name: 'id_entite',
            label: 'Entité',
            type: 'select',
            dynamicTable: 'entites',
            dynamicField: 'nom'
        },
        {
            name: 'type_entite',
            label: 'Type d\'Entité',
            type: 'select',
            options: [
                { value: 'direction', label: 'Direction' },
                { value: 'departement', label: 'Département' },
                { value: 'service', label: 'Service' },
                { value: 'bureau', label: 'Bureau' },
                { value: 'division', label: 'Division' }
            ]
        },
        {
            name: 'is_active',
            label: 'Statut',
            type: 'select',
            options: [
                { value: 'true', label: 'Actif' },
                { value: 'false', label: 'Inactif' },
                { value: 'all', label: 'Tous' }
            ]
        }
    ];

    return (
        <ManagementPage
            title="Directions par Entité"
            description="Gestion des directions rattachées aux entités administratives des ministères"
            icon={MdWork}
            apiEndpoint="/api/services-entites"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
            tableColumns={tableColumns}
            advancedFilters={advancedFilters}
            // Configuration spécifique pour les services-entités
            customActions={[
                {
                    name: 'viewDetails',
                    label: 'Voir Détails',
                    icon: 'MdVisibility',
                    endpoint: '/api/services-entites/{id}/details',
                    type: 'modal'
                },
                {
                    name: 'viewByEntite',
                    label: 'Services par Entité',
                    icon: 'MdBusiness',
                    endpoint: '/api/services-entites/entite/{id_entite}',
                    type: 'page'
                },
                {
                    name: 'viewByMinistere',
                    label: 'Services par Ministère',
                    icon: 'MdAccountBalance',
                    endpoint: '/api/services-entites/ministere/{id_ministere}',
                    type: 'page'
                }
            ]}
            // Statistiques spécifiques
            statsEndpoint="/api/services-entites/stats"
            statsConfig={[
                { key: 'total_services', label: 'Total Services', icon: 'MdWork' },
                { key: 'services_actifs', label: 'Services Actifs', icon: 'MdCheckCircle' },
                { key: 'services_inactifs', label: 'Services Inactifs', icon: 'MdCancel' },
                { key: 'entites_avec_services', label: 'Entités avec Services', icon: 'MdBusiness' }
            ]}
        />
    );
};

export default DirectionsEntitesPage;
