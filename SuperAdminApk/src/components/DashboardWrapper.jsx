import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardPage from '../pages/DashboardPage';
import OrganizationDashboardPage from '../pages/OrganizationDashboardPage';

const DashboardWrapper = () => {
    const { user } = useAuth();
    
    // Les super_admin utilisent le DashboardPage classique avec toutes les statistiques
    if (user && user.role === 'super_admin') {
        return <DashboardPage />;
    }
    
    // Les autres utilisateurs utilisent l'OrganizationDashboardPage avec les données de leur organisation
    return <OrganizationDashboardPage />;
};

export default DashboardWrapper;
