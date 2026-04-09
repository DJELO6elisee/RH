import React from 'react';
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

export default ServicesPageSimple;
