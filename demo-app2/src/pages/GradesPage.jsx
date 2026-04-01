import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdStar } from 'react-icons/md';

const GradesPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true },
        { name: 'is_prefectoral', label: 'Grade Préfectoral', type: 'checkbox', colSize: 12 }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Carrière', active: false },
        { name: 'Grades', active: true }
    ];

    return (
        <ManagementPage
            title="Grades"
            description="Gestion des grades et échelons de carrière"
            icon={MdStar}
            apiEndpoint="/api/grades"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default GradesPage;
