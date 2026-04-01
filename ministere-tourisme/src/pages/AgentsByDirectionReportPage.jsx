import React from 'react';
import ReportsPage from '../components/ReportsPage';
import { MdBusiness } from 'react-icons/md';

const AgentsByDirectionReportPage = () => {
    const fields = [
        { name: 'direction_libelle', label: 'Direction' },
        { name: 'count', label: 'Nombre d\'agents' },
        { name: 'percentage', label: 'Pourcentage' }
    ];

    const searchFields = ['direction_libelle'];

    return (
        <ReportsPage
            title="Répartition des Agents par Direction"
            description="Statistiques sur la répartition des agents par direction"
            apiEndpoint="agents/stats/by-direction"
            fields={fields}
            searchFields={searchFields}
            filters={[]}
        />
    );
};

export default AgentsByDirectionReportPage;

