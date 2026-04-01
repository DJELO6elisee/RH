import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdEventNote } from 'react-icons/md';

const TypeFormationsPage = () => {
    const fields = [
        { name: 'libelle', label: 'Saisir la formation', type: 'text', required: true, placeholder: 'SAISIR LA FORMATION' }
    ];

    // Colonnes à afficher dans le tableau (seulement le nom du type de formation)
    const displayColumns = [
        { name: 'libelle', label: 'Nom du type de formation' }
    ];

    const searchFields = ['libelle'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Formation', active: false },
        { name: 'Types de formations', active: true }
    ];

    return (
        <ManagementPage
            title="Types de formations"
            description="Gestion des types de formations"
            icon={MdEventNote}
            apiEndpoint="/api/type_de_seminaire_de_formation"
            fields={fields}
            displayColumns={displayColumns}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default TypeFormationsPage;

