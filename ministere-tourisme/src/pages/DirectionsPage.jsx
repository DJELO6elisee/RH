import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdWork } from 'react-icons/md';

const DirectionsPage = () => {
    const fields = [
        { name: 'libelle', label: 'Libellé', type: 'text', required: true },
        { name: 'id_direction_generale', label: 'Direction générale', type: 'select', dynamicTable: 'directions-generales', dynamicField: 'libelle', required: false }
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
            displayColumns={[
                { name: 'libelle', label: 'Libellé' },
                { name: 'id_direction_generale', label: 'Direction générale' }
            ]}
        />
    );
};

export default DirectionsPage;
