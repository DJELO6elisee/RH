import React, { useState } from 'react';
import ManagementPage from 'components/ManagementPage';
import MinistereFilter from 'components/MinistereFilter';
import { MdAccountTree } from 'react-icons/md';

const SousDirectionsPage = () => {
    const [selectedMinistere, setSelectedMinistere] = useState('');
    const fields = [
        { 
            name: 'libelle', 
            label: 'Libellé de la Sous-direction', 
            type: 'text', 
            required: true,
            placeholder: 'Ex: Sous-direction des Affaires Administratives'
        },
        { 
            name: 'direction_id', 
            label: 'Direction', 
            type: 'select', 
            dynamicTable: 'directions', 
            dynamicField: 'libelle', 
            required: true,
            helpText: 'Sélectionnez la direction parente à laquelle rattacher cette sous-direction'
        },
        { 
            name: 'description', 
            label: 'Description', 
            type: 'textarea',
            placeholder: 'Description détaillée de la sous-direction et de ses missions'
        }
    ];

    const searchFields = ['libelle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Sous-directions', active: true }
    ];

    // Configuration des colonnes pour l'affichage dans le tableau
    const displayColumns = [
        { key: 'libelle', label: 'Libellé', sortable: true },
        { key: 'direction_nom', label: 'Direction', sortable: true },
        { key: 'sous_directeur_nom', label: 'Sous-directeur', sortable: true },
        { key: 'is_active', label: 'Statut', sortable: true, type: 'badge' }
    ];

    return (
        <ManagementPage
            title="Sous-directions"
            description="Gestion des sous-directions au sein du ministère du tourisme"
            icon={MdAccountTree}
            apiEndpoint="/api/sous-directions"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
            displayColumns={displayColumns}
            allowCreate={true}
            allowEdit={true}
            allowDelete={true}
            listQueryParams={{ id_ministere: selectedMinistere || undefined }}
            customFilterContent={
                <MinistereFilter 
                    selectedMinistere={selectedMinistere} 
                    setSelectedMinistere={setSelectedMinistere} 
                />
            }
        />
    );
};

export default SousDirectionsPage;
