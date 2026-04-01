import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { MdBusiness } from 'react-icons/md';

const EntitesPage = () => {
    const fields = [
        { name: 'code', label: 'Code', type: 'text', required: true },
        { name: 'nom', label: 'Nom', type: 'text', required: true },
        { name: 'sigle', label: 'Sigle', type: 'text', placeholder: 'Sigle de l\'entité' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'type_entite', label: 'Type d\'entité', type: 'select', required: true, 
            options: ['direction', 'departement', 'service', 'bureau', 'division'] },
        { name: 'niveau_hierarchique', label: 'Niveau hiérarchique', type: 'number', defaultValue: 1, min: 1, max: 10 },
        { name: 'id_ministere', label: 'Ministère', type: 'select', dynamicTable: 'ministeres', dynamicField: 'nom', required: true },
        { name: 'id_entite_parent', label: 'Entité parente', type: 'select', dynamicTable: 'entites_administratives', dynamicField: 'nom', placeholder: 'Sélectionner une entité parente' },
        { name: 'adresse', label: 'Adresse', type: 'textarea' },
        { name: 'telephone', label: 'Téléphone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'responsable_id', label: 'Responsable', type: 'select', dynamicTable: 'agents', dynamicField: 'nom', placeholder: 'Sélectionner un responsable' },
        { name: 'is_active', label: 'Entité active', type: 'checkbox', defaultValue: true }
    ];

    const searchFields = ['code', 'nom', 'sigle', 'description'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Organisation', active: false },
        { name: 'Entités', active: true }
    ];

    return (
        <ManagementPage
            title="Entités"
            description="Gestion des entités organisationnelles et hiérarchiques"
            icon={MdBusiness}
            apiEndpoint="/api/entites-administratives"
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
        />
    );
};

export default EntitesPage;
