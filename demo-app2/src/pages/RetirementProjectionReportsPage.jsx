import React from 'react';
import AgentsReportsPage from './AgentsReportsPage';

/**
 * Onglet « Projections des retraites » : même écran que les états des agents
 * avec filtre d’exclusion des retraites dans les N prochaines années (API + export hiérarchique).
 */
const RetirementProjectionReportsPage = () => <AgentsReportsPage retirementProjection />;

export default RetirementProjectionReportsPage;
