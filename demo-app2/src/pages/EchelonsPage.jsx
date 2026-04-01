import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdTrendingUp } from 'react-icons/md';

const EchelonsPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true },
        { name: 'is_prefectoral', label: 'Échelon Préfectoral', type: 'checkbox', colSize: 12 }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Carrière', active: false },
        { name: 'Échelons', active: true }
    ];

    return (
        <ManagementPage
            title="Échelons"
            description="Gestion des échelons et indices de carrière"
            icon={MdTrendingUp}
            apiEndpoint="/api/echelons"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default EchelonsPage;
