import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdGroup } from 'react-icons/md';

const TypeDAgentsPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true },
        { name: 'automatique', label: 'Génération automatique', type: 'checkbox', defaultValue: false },
        { name: 'numero_initial', label: 'Numéro initial', type: 'number', defaultValue: 1, min: 1 }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Identité', active: false },
        { name: 'Types d\'Agents', active: true }
    ];

    return (
        <ManagementPage
            title="Types d'Agents"
            description="Gestion des types d'agents"
            icon={MdGroup}
            apiEndpoint="/api/type-d-agents"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default TypeDAgentsPage;
