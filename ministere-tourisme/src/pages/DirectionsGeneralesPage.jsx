import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdAccountBalance } from 'react-icons/md';

const DirectionsGeneralesPage = () => {
    const fields = [
        { name: 'libelle', label: 'Libellé', type: 'text', required: true }
    ];

    const searchFields = ['libelle', 'code', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Directions générales', active: true }
    ];

    return (
        <ManagementPage
            title="Directions générales"
            description="Gestion des directions générales de l'organisation"
            icon={MdAccountBalance}
            apiEndpoint="/api/directions-generales"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
            displayColumns={[{ name: 'libelle', label: 'Libellé' }]}
        />
    );
};

export default DirectionsGeneralesPage;
