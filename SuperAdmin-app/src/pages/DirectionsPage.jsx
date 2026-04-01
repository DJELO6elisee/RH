import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdWork } from 'react-icons/md';

const DirectionsPage = () => {
    const fields = [
        { name: 'libelle', label: 'Libellé', type: 'text', required: true },
        { name: 'responsable_id', label: 'Chef de direction', type: 'select', dynamicTable: 'agents', dynamicField: 'nom_complet' }
    ];

    const searchFields = ['libelle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Directions', active: true }
    ];

    return (
        <ManagementPage
            title="Directions"
            description="Gestion des directions et départements de l'organisation"
            icon={MdWork}
            apiEndpoint="/api/directions"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default DirectionsPage;
