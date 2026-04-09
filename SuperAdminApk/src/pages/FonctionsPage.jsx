import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdBusinessCenter } from 'react-icons/md';

const FonctionsPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Carrière', active: false },
        { name: 'Fonctions', active: true }
    ];

    return (
        <ManagementPage
            title="Fonctions"
            description="Gestion des fonctions et rôles professionnels"
            icon={MdBusinessCenter}
            apiEndpoint="/api/fonctions"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default FonctionsPage;
