import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdPublic } from 'react-icons/md';

const NationalitesPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Identité', active: false },
        { name: 'Nationalités', active: true }
    ];

    return (
        <ManagementPage
            title="Nationalités"
            description="Gestion des nationalités"
            icon={MdPublic}
            apiEndpoint="/api/nationalites"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default NationalitesPage;
