import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdAccountBalance } from 'react-icons/md';

const MinisteresPage = () => {
    const fields = [
        { name: 'code', label: 'Code', type: 'text', required: true },
        { name: 'nom', label: 'Nom', type: 'text', required: true },
        { name: 'sigle', label: 'Sigle', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'adresse', label: 'Adresse', type: 'textarea' },
        { name: 'telephone', label: 'Téléphone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'website', label: 'Site web', type: 'url' },
        { name: 'logo_url', label: 'URL du logo', type: 'url' },
        { name: 'is_active', label: 'Ministère actif', type: 'checkbox', defaultValue: true }
    ];

    const searchFields = ['code', 'nom', 'sigle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Ministères', active: true }
    ];

    return (
        <ManagementPage
            title="Gestion des Ministères"
            description="Gestion des ministères et administrations publiques"
            icon={MdAccountBalance}
            apiEndpoint="/api/ministeres"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default MinisteresPage;
