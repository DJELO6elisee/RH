import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdAssignment } from 'react-icons/md';

const EmploisPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true },
        { name: 'libele_court', label: 'Libellé court', type: 'text' }
    ];

    const searchFields = ['libele', 'libele_court'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Carrière', active: false },
        { name: 'Emplois', active: true }
    ];

    return (
        <ManagementPage
            title="Emplois"
            description="Gestion des emplois et postes de travail"
            icon={MdAssignment}
            apiEndpoint="/api/emplois"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default EmploisPage;
