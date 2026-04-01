import React, { useState, useEffect, useMemo } from 'react';
import { Nav, NavItem, NavLink, Button } from 'reactstrap';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { backendRoutes } from '../../config/routes';
import { getApiUrl, getAuthHeaders } from '../../config/api';
import { FaSignOutAlt } from 'react-icons/fa';
import {
    MdPerson, MdBusiness, MdWork, MdAssignment, MdPlace, MdTrendingUp,
    MdGroup, MdCategory, MdSchool, MdEmojiEvents, MdScience, MdLanguage,
    MdComputer, MdEvent, MdDescription, MdMail, MdBuild, MdFolder, MdPeople,
    MdSecurity, MdFlight, MdNote, MdHistory, MdVisibility,
    MdDashboard, MdAccountBalance, MdBusinessCenter, MdCheckCircle
} from 'react-icons/md';

// Mapper les icônes pour les routes dynamiques
const iconMap = {
    'MdPerson': MdPerson,
    'MdBusiness': MdBusiness,
    'MdWork': MdWork,
    'MdAssignment': MdAssignment,
    'MdPlace': MdPlace,
    'MdTrendingUp': MdTrendingUp,
    'MdGroup': MdGroup,
    'MdCategory': MdCategory,
    'MdSchool': MdSchool,
    'MdEmojiEvents': MdEmojiEvents,
    'MdScience': MdScience,
    'MdLanguage': MdLanguage,
    'MdComputer': MdComputer,
    'MdEvent': MdEvent,
    'MdDescription': MdDescription,
    'MdMail': MdMail,
    'MdBuild': MdBuild,
    'MdFolder': MdFolder,
    'MdPeople': MdPeople,
    'MdSecurity': MdSecurity,
    'MdFlight': MdFlight,
    'MdCheckCircle': MdCheckCircle,
    'MdNote': MdNote,
    'MdHistory': MdHistory,
    'MdVisibility': MdVisibility,
    'MdDashboard': MdDashboard,
    'MdAccountBalance': MdAccountBalance,
    'MdBusinessCenter': MdBusinessCenter
};

const AgentSidebar = ({ onNavigateToDashboard }) => {
    const { user, logout } = useAuth();
    const history = useHistory();
    const location = useLocation();
    const [assignedRoutes, setAssignedRoutes] = useState([]);
    const [loadingAssignedRoutes, setLoadingAssignedRoutes] = useState(false);
    const [agentData, setAgentData] = useState(null);
    const [profilePhotoUrl, setProfilePhotoUrl] = useState(null);

    // Charger les routes assignées
    useEffect(() => {
        const loadAssignedRoutes = async () => {
            if (!user || !user.id) return;
            const isDRH = user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh';
            const isSuperAdmin = user.role === 'super_admin';
            if (isDRH || isSuperAdmin) return;

            setLoadingAssignedRoutes(true);
            try {
                const apiBase = getApiUrl();
                const response = await fetch(`${apiBase}/api/agent-route-assignments/my-routes`, {
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.data)) {
                        const routeDetails = data.data
                            .map(routeId => backendRoutes.find(r => r.id === routeId))
                            .filter(route => route && route.id !== 'agent-dashboard' && route.id !== 'drh-dashboard');
                        setAssignedRoutes(routeDetails);
                    }
                }
            } catch (error) {
                console.error('Erreur lors du chargement des routes assignées:', error);
            } finally {
                setLoadingAssignedRoutes(false);
            }
        };

        loadAssignedRoutes();
    }, [user]);

    // Charger les données de l'agent pour la photo de profil
    useEffect(() => {
        const loadAgentData = async () => {
            if (!user?.id_agent) return;

            try {
                const apiBase = getApiUrl();
                const response = await fetch(`${apiBase}/api/agents/${user.id_agent}`, {
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        setAgentData(data.data);
                        // Charger la photo de profil si disponible
                        if (data.data.photo_profil) {
                            const photoUrl = `${apiBase}/api/images/agent/${user.id_agent}/photo_profil`;
                            setProfilePhotoUrl(photoUrl);
                        }
                    }
                }
            } catch (error) {
                console.error('Erreur lors du chargement des données de l\'agent:', error);
            }
        };

        loadAgentData();
    }, [user]);

    // Grouper les routes assignées par catégorie
    const assignedRoutesByCategory = useMemo(() => {
        const grouped = {};
        assignedRoutes.forEach(route => {
            const category = route.category || 'Autres';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(route);
        });
        return grouped;
    }, [assignedRoutes]);

    const handleLogout = async () => {
        try {
            await logout();
            history.push('/login');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        }
    };

    const handleRouteClick = (route) => {
        history.push(route.path);
    };

    const isRouteActive = (path) => {
        return location.pathname === path;
    };

    return (
        <div className="agent-sidebar text-white" style={{ 
            width: '250px', 
            minHeight: '100vh',
            backgroundColor: '#2c3e50',
            position: 'fixed',
            left: 0,
            top: 0,
            overflowY: 'auto'
        }}>
            <div className="p-3">
                {/* Logo et titre */}
                <div className="d-flex align-items-center mb-4">
                    <div className="bg-white text-primary rounded p-2 me-2" style={{ width: '40px', height: '40px' }}>
                        <i className="fa fa-user fa-lg"></i>
                    </div>
                    <div>
                        <h5 className="mb-0 text-white">Espace Agent</h5>
                        <small className="text-light">Tableau de bord personnel</small>
                    </div>
                </div>

                {/* Navigation principale */}
                <Nav vertical>
                    <NavItem>
                        <NavLink 
                            onClick={() => onNavigateToDashboard ? onNavigateToDashboard() : history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-home me-2"></i>
                            Tableau de bord
                        </NavLink>
                    </NavItem>
                    
                    {/* Onglets personnels de l'agent - Redirection vers AgentDashboard */}
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-user me-2"></i>
                            Informations personnelles
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-briefcase me-2"></i>
                            Informations professionnelles
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-home me-2"></i>
                            Informations familiales
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-child me-2"></i>
                            Enfants
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className="text-white"
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', background: 'transparent', border: 'none' }}
                        >
                            <i className="fa fa-user me-2"></i>
                            Mes Demandes
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-history me-2"></i>
                            Historique des demandes
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className="text-white"
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', background: 'transparent', border: 'none' }}
                        >
                            <i className="fa fa-file-text me-2"></i>
                            Mes Documents
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-cog me-2"></i>
                            Paramètres
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink 
                            onClick={() => history.push('/agent-dashboard')}
                            className={`text-white ${location.pathname === '/agent-dashboard' ? 'bg-white text-primary' : ''}`}
                            style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                        >
                            <i className="fa fa-inbox me-2"></i>
                            Boîte de réception
                        </NavLink>
                    </NavItem>

                    {/* Routes assignées par le DRH */}
                    {assignedRoutes.length > 0 && (
                        <>
                            <NavItem>
                                <div className="text-light mt-3 mb-2 px-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                    Tâches Assignées
                                </div>
                            </NavItem>
                            {Object.entries(assignedRoutesByCategory).map(([category, routes]) => (
                                <React.Fragment key={category}>
                                    {routes.map((route) => {
                                        const IconComponent = route.icon ? iconMap[route.icon] : null;
                                        const active = isRouteActive(route.path);
                                        return (
                                            <NavItem key={route.id}>
                                                <NavLink
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleRouteClick(route);
                                                    }}
                                                    className={`text-white ${active ? 'bg-white text-primary' : ''}`}
                                                    style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                                                >
                                                    {IconComponent ? (
                                                        <IconComponent className="me-2" style={{ fontSize: '18px', verticalAlign: 'middle' }} />
                                                    ) : (
                                                        <i className="fa fa-folder-open me-2"></i>
                                                    )}
                                                    <span>{route.name}</span>
                                                </NavLink>
                                            </NavItem>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </>
                    )}
                </Nav>

                {/* Informations de l'agent dans la sidebar */}
                {agentData && (
                    <div className="mt-4 pt-3 border-top border-light">
                        <div className="text-center">
                            {profilePhotoUrl ? (
                                <img 
                                    src={profilePhotoUrl}
                                    alt="Photo de profil" 
                                    className="rounded-circle mb-2"
                                    style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                    onError={() => setProfilePhotoUrl(null)}
                                />
                            ) : (
                                <div className="bg-white text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-2" 
                                     style={{ width: '60px', height: '60px' }}>
                                    <i className="fa fa-user fa-2x"></i>
                                </div>
                            )}
                            <h6 className="text-white mb-1">{agentData.prenom} {agentData.nom}</h6>
                            <small className="text-light">{agentData.matricule}</small>
                        </div>
                        
                        {/* Bouton de déconnexion */}
                        <div className="mt-3">
                            <Button 
                                color="danger" 
                                size="sm" 
                                onClick={handleLogout}
                                className="w-100"
                            >
                                <FaSignOutAlt className="me-1" />
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentSidebar;

