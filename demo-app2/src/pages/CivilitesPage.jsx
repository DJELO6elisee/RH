import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdTitle } from 'react-icons/md';

const CivilitesPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Identité', active: false },
        { name: 'Civilités', active: true }
    ];

    return (
        <ManagementPage
            title="Civilités"
            description="Gestion des civilités (Monsieur, Madame, etc.)"
            icon={MdTitle}
            apiEndpoint="/api/civilites"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default CivilitesPage;
