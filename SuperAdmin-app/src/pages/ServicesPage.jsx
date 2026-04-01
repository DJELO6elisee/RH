import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdBusiness } from 'react-icons/md';

const ServicesPage = () => {
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
            name: 'id_direction', 
            label: 'Direction', 
            type: 'select', 
            dynamicTable: 'directions', 
            dynamicField: 'libelle',
            required: true,
            helpText: 'Direction à laquelle appartient ce service',
            showWhen: (formData) => formData.type_service === 'direction'
        },
        { 
            name: 'id_sous_direction', 
            label: 'Sous-direction', 
            type: 'select', 
            dynamicTable: 'sous_directions', 
            dynamicField: 'libelle',
            helpText: 'Sous-direction à laquelle appartient ce service (optionnel si service de direction)',
            showWhen: (formData) => formData.type_service === 'sous_direction',
            cascadeTrigger: true,
            dependsOn: 'id_direction'
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

    const searchFields = ['libelle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Services', active: true }
    ];

    // Configuration des colonnes pour l'affichage dans le tableau
    const displayColumns = [
        { key: 'libelle', label: 'Libellé', sortable: true },
        { key: 'direction_nom', label: 'Direction', sortable: true },
        { key: 'sous_direction_nom', label: 'Sous-direction', sortable: true },
        { key: 'responsable_nom', label: 'Responsable', sortable: true },
        { key: 'is_active', label: 'Statut', sortable: true, type: 'badge' }
    ];

    return (
        <ManagementPage
            title="Services"
            description="Gestion des services au sein du ministère du tourisme"
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

export default ServicesPage;
