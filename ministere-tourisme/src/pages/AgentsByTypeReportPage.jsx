import React from 'react';
import ReportsPage from '../components/ReportsPage';
import { MdCategory } from 'react-icons/md';

const AgentsByTypeReportPage = () => {
    const fields = [
        { name: 'type_agent_libele', label: 'Type d\'agent' },
        { name: 'count', label: 'Nombre d\'agents' },
        { name: 'percentage', label: 'Pourcentage' }
    ];

    const searchFields = ['type_agent_libele'];

    return (
        <ReportsPage
            title="Répartition des Agents par Type"
            description="Statistiques sur la répartition des agents selon leur type"
            apiEndpoint="agents/stats/by-type"
            fields={fields}
            searchFields={searchFields}
            filters={[]}
        />
    );
};

export default AgentsByTypeReportPage;
