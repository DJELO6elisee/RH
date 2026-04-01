import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdBusiness } from 'react-icons/md';

const InstitutionsPage = () => {
    const fields = [
        { name: 'code', label: 'Code', type: 'text', disabled: true, placeholder: 'Généré automatiquement' },
        { name: 'nom', label: 'Nom', type: 'text' },
        { name: 'sigle', label: 'Sigle', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'adresse', label: 'Adresse', type: 'textarea' },
        { name: 'telephone', label: 'Téléphone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'website', label: 'Site web', type: 'url' },
        { name: 'logo_url', label: 'URL du logo', type: 'url' },
        { name: 'is_active', label: 'Institution active', type: 'checkbox' }
    ];

    const searchFields = ['code', 'nom', 'sigle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Institutions', active: true }
    ];

    return (
        <ManagementPage
            title="Institutions"
            description="Gestion des institutions et organismes publics"
            icon={MdBusiness}
            apiEndpoint="/api/ministeres"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default InstitutionsPage;
