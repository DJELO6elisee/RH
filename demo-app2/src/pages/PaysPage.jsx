import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdPublic } from 'react-icons/md';

const PaysPage = () => {
    const fields = [
        { name: 'libele', label: 'Nom du Pays', type: 'text', required: true, placeholder: 'Saisir le nom du pays' },
        { name: 'nationalite_libele', label: 'Nationalité', type: 'select', dynamicTable: 'nationalites', dynamicField: 'libele', required: true, placeholder: 'Sélectionner la nationalité' }
    ];

    const searchFields = ['libele', 'nationalite_libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Identité', active: false },
        { name: 'Pays', active: true }
    ];

    const customActions = [];
    const rowActions = [];

    return (
        <ManagementPage
            title="Pays"
            description="Gestion des pays avec leurs nationalités correspondantes"
            icon={MdPublic}
            apiEndpoint="/api/pays"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
            customActions={customActions}
            rowActions={rowActions}
        />
    );
};

export default PaysPage;
