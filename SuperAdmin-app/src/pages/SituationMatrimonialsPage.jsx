import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdFavorite } from 'react-icons/md';

const SituationMatrimonialsPage = () => {
    const fields = [
        { name: 'libele', label: 'Libellé', type: 'text', required: true }
    ];

    const searchFields = ['libele'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Identité', active: false },
        { name: 'Situations Matrimoniales', active: true }
    ];

    return (
        <ManagementPage
            title="Situations Matrimoniales"
            description="Gestion des situations matrimoniales"
            icon={MdFavorite}
            apiEndpoint="/api/situation-matrimonials"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default SituationMatrimonialsPage;
