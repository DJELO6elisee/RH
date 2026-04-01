import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdCategory } from 'react-icons/md';

const CategoriesPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Carrière', active: false },
        { name: 'Catégories', active: true }
    ];

    return (
        <ManagementPage
            title="Catégories"
            description="Gestion des catégories de personnel"
            icon={MdCategory}
            apiEndpoint="/api/categories"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default CategoriesPage;
