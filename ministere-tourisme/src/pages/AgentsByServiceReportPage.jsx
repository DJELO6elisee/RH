import React from 'react';
import ReportsPage from '../components/ReportsPage';
import { MdBusiness } from 'react-icons/md';

const AgentsByServiceReportPage = () => {
    const fields = [
        { name: 'service_nom', label: 'Service' },
        // { name: 'entite_nom', label: 'Entité' },
        { name: 'count', label: 'Nombre d\'agents' },
        { name: 'percentage', label: 'Pourcentage' }
    ];

    const searchFields = ['service_nom', 'entite_nom'];

    return (
        <ReportsPage
            title="Répartition des Agents par Direction"
            description="Statistiques sur la répartition des agents par direction et entité"
            apiEndpoint="agents/stats/by-service"
            fields={fields}
            searchFields={searchFields}
            filters={[]}
        />
    );
};

export default AgentsByServiceReportPage;
