import SourceLink from 'components/SourceLink';
import React, { useState, useEffect } from 'react';
import { FaGithub } from 'react-icons/fa';
import { useAuth } from 'contexts/AuthContext';
import { useDRHLanguage } from 'contexts/DRHLanguageContext';
import { getDRHTranslation, translateCategory, translateRouteName } from 'i18n/drhTranslations';
import {
    MdAccountCircle,
    MdArrowDropDownCircle,
    MdBorderAll,
    MdBrush,
    MdChromeReaderMode,
    MdDashboard,
    MdExtension,
    MdGroupWork,
    MdInsertChart,
    MdKeyboardArrowDown,
    MdNotificationsActive,
    MdPages,
    MdRadioButtonChecked,
    MdSend,
    MdStar,
    MdTextFields,
    MdViewCarousel,
    MdViewDay,
    MdViewList,
    MdWeb,
    MdWidgets,
    MdPerson,
    MdWork,
    MdBusiness,
    MdAccountBalance,
    MdAssignment,
    MdBusinessCenter,
    MdPlace,
    MdTrendingUp,
    MdGroup,
    MdCategory,
    MdSchool,
    MdEmojiEvents,
    MdScience,
    MdLanguage,
    MdTranslate,
    MdComputer,
    MdCode,
    MdEvent,
    MdEventBusy,
    MdInput,
    MdExitToApp,
    MdFavorite,
    MdPublic,
    MdMap,
    MdLocationOn,
    MdChildCare,
    MdAccessibility,
    MdHealthAndSafety,
    MdWarning,
    MdGavel,
    MdDescription,
    MdMail,
    MdBuild,
    MdEventNote,
    MdAccountTree,
    MdFolder,
    MdFolderOpen,
    MdPeople,
    MdSwapHoriz,
    MdSecurity,
    MdSettings,
    MdFlight,
    MdCheckCircle,
    MdNote,
    MdHistory,
    MdVisibility,
} from 'react-icons/md';
import {
    Collapse,
    Nav,
    Navbar,
    NavItem,
    NavLink as BSNavLink,
} from 'reactstrap';
import { NavLink } from 'react-router-dom';
import bn from 'utils/bemnames';
import { backendRoutes, routesByCategory, categories } from 'config/routes';

const logo200Image = `${process.env.PUBLIC_URL}/img/logo-tourisme.jpg`;
const bem = bn.create('sidebar');

// Fonction pour capitaliser uniquement la première lettre du premier mot
const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    const lowerStr = str.toLowerCase();
    return lowerStr.charAt(0).toUpperCase() + lowerStr.slice(1);
};

const sidebarBackground = {
    background: 'linear-gradient(135deg, #009639 0%, #007A2E 100%)',
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
};



// Mapper les icônes pour les routes dynamiques
const iconMap = {
    'MdPerson': MdPerson,
    'MdLock': MdAccountCircle,
    'MdTitle': MdTextFields,
    'MdBusiness': MdBusiness,
    'MdBrush': MdBrush,
    'MdStar': MdStar,
    'MdAccountBalance': MdAccountBalance,
    'MdWork': MdWork,
    'MdAssignment': MdAssignment,
    'MdBusinessCenter': MdBusinessCenter,
    'MdPlace': MdPlace,
    'MdTrendingUp': MdTrendingUp,
    'MdGroup': MdGroup,
    'MdCategory': MdCategory,
    'MdSchool': MdSchool,
    'MdEmojiEvents': MdEmojiEvents,
    'MdScience': MdScience,
    'MdLanguage': MdLanguage,
    'MdTranslate': MdTranslate,
    'MdComputer': MdComputer,
    'MdCode': MdCode,
    'MdEvent': MdEvent,
    'MdEventBusy': MdEventBusy,
    'MdInput': MdInput,
    'MdExitToApp': MdExitToApp,
    'MdFavorite': MdFavorite,
    'MdPublic': MdPublic,
    'MdMap': MdMap,
    'MdLocationOn': MdLocationOn,
    'MdChildCare': MdChildCare,
    'MdAccessibility': MdAccessibility,
    'MdHealthAndSafety': MdHealthAndSafety,
    'MdWarning': MdWarning,
    'MdGavel': MdGavel,
    'MdDescription': MdDescription,
    'MdMail': MdMail,
    'MdSend': MdSend,
    'MdBuild': MdBuild,
    'MdEventNote': MdEventNote,
    'MdAccountTree': MdAccountTree,
    'MdGroupWork': MdGroupWork,
    'MdFolder': MdFolder,
    'MdFolderOpen': MdFolderOpen,
    'MdPeople': MdPeople,
    'MdSwapHoriz': MdSwapHoriz,
    'MdSecurity': MdSecurity,
    'MdFlight': MdFlight,
    'MdCheckCircle': MdCheckCircle,
    'MdNote': MdNote,
    'MdHistory': MdHistory,
    'MdVisibility': MdVisibility
};

const navItems = [
    { to: '/dashboard', name: 'dashboard', exact: true, Icon: MdDashboard },
];

// Fonction pour obtenir les items de navigation personnalisés selon le rôle
const getCustomNavItems = (user) => {
    const items = [];
    
    // Ajouter l'onglet "Espace Personnel DRH" pour les DRH
    if (user && (user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh') && user.id_agent) {
        items.push({
            to: '/drh-dashboard',
            name: 'Espace Personnel DRH',
            exact: true,
            Icon: MdAssignment
        });
        // Ajouter le lien "Notes de Service" pour les DRH
        items.push({
            to: '/notes-de-service',
            name: 'Notes de Service',
            exact: true,
            Icon: MdNote
        });
    }
    
    return items;
};

// Fonction pour charger les routes assignées à un agent
const loadAssignedRoutes = async (userId) => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return [];
        
        // Utiliser getApiUrl si disponible, sinon utiliser window.location.origin
        const apiBase = typeof window !== 'undefined' && window.location.origin ? 
            window.location.origin : 'https://tourisme.2ise-groupe.com';
        
        const response = await fetch(`${apiBase}/api/agent-route-assignments/my-routes`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.success ? (data.data || []) : [];
        }
    } catch (error) {
        console.error('Erreur lors du chargement des routes assignées:', error);
    }
    return [];
};

// Fonction pour filtrer les routes selon l'organisation de l'utilisateur (version synchrone de base)
const getFilteredRoutesBase = (user, assignedRouteIds = []) => {
    // Les super_admin voient toutes les routes
    if (user && user.role === 'super_admin') {
        return backendRoutes.filter(route => !route.isAgentRoute);
    }
    
    // Les DRH voient toutes les routes autorisées selon leur organisation
    const isDRH = user && (user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh');
    
    if (!user || !user.organization) {
        return backendRoutes; // Retourner toutes les routes si pas d'organisation
    }

    const { organization } = user;
    
    // Routes autorisées selon le type d'organisation
    const allowedRoutes = {
        'ministere': [
            'agents', 'fiche-signaletique', 'grades', 'directions', 'services', 'sous-directions', 'directions-entites-ministres', 'fonctions', 'positions', 'echelons', 'emplois',
            'type_d_agents', 'retraites', 'verification-retraite', 'prolongement-retraite', 'planning-previsionnel-conges',
            'categories', 'diplomes', 'distinctions', 'specialites',
            'langues', 'niveau_langues', 'logiciels', 'niveau_informatiques',
            'type_de_conges', 'autre_absences', 'mode_d_entrees', 'motif_de_departs',
            'type_de_retraites', 'situation_matrimonials', 'nationalites', 'pays',
            'regions', 'departements', 'localites', 'enfants', 'handicaps', 'pathologies', 'nature_d_accidents',
            'sanctions', 'nature_actes', 'type_de_documents', 'type_de_couriers',
            'type_de_destinations', 'type_de_materiels', 'type_de_seminaire_de_formation', 'seminaire_formation',
            'type_etablissements', 'unite_administratives', 'sindicats', 'dossiers',
            'classeurs', 'tiers', 'civilites', 'entites', 'ministeres',
            // Nomination
            'agent-fonctions', 'agent-emplois', 'agent-grades', 'agent-echelons', 'agent-categories',
            'agent-user-accounts', 'attribution-taches-agents', 'auth', 'drh-parametres', 'historique-des-agents', 'jours-conges', 'gestion-mariages',
            // États et Rapports
            'agents_reports', 'agents_by_type_report', 'agents_by_service_report',
    // Routes de gestion des documents administratifs
            'demande-absence', 'demande-sortie-territoire', 'demande-attestation-travail',
            'autorisation-conges', 'autorisation-retraite',
            'attestation-presence', 'note-service', 'certificat-cessation-service',
            // Documents générés & outils associés
            'autorisation-reprise-service', 'certificat-non-jouissance-conge', 'documents-generated', 'emargement',
            'historiques-demandes', 'decision'
        ],
        'institution': [
            'agents-institutions', 'enfants-institutions', 'entites-institutions',
            'directions-institutions', 'type-seminaire-institutions', 'type-documents-institutions',
            'tiers-institutions', 'dossiers-institutions', 'classeurs-institutions',
            'agents-entites-institutions', 'affectations-temporaires-institutions',
            'permissions-entites-institutions', 'institutions'
        ]
    };

    const userAllowedRoutes = allowedRoutes[organization.type] || [];
    
    // Fonction pour vérifier si l'utilisateur a accès à une route selon son rôle
    const hasRoleAccess = (route) => {
        if (!route.roles || route.roles.length === 0) {
            return true; // Pas de restriction de rôle
        }
        if (!user || !user.role) {
            return false;
        }
        return route.roles.some(role => 
            user.role === role || 
            user.role?.toLowerCase() === role?.toLowerCase()
        );
    };
    
    // Si c'est un DRH, retourner toutes les routes autorisées
    if (isDRH) {
        return backendRoutes.filter(route => 
            (userAllowedRoutes.includes(route.id) || 
            (route.isAgentRoute && user && user.role !== 'super_admin')) &&
            hasRoleAccess(route)
        );
    }
    
    // Pour les agents non-DRH, filtrer selon les routes assignées
    const filtered = backendRoutes.filter(route => 
        (userAllowedRoutes.includes(route.id) || 
        assignedRouteIds.includes(route.id) ||
        (route.isAgentRoute && user && user.role !== 'super_admin')) &&
        hasRoleAccess(route)
    );
    
    // Log pour débogage
    if (assignedRouteIds.length > 0) {
        const assignedRoutesInFiltered = filtered.filter(r => assignedRouteIds.includes(r.id));
        console.log('🔍 Routes assignées dans filteredRoutes:', assignedRoutesInFiltered.map(r => r.name));
    }
    
    return filtered;
};

const FilteredSidebar = (props) => {
    const { user } = useAuth();
    const { language } = useDRHLanguage();
    const t = (key) => getDRHTranslation(language, key);
    const [isOpenComponents, setIsOpenComponents] = useState(true);
    const [isOpenContents, setIsOpenContents] = useState(true);
    const [isOpenPages, setIsOpenPages] = useState(true);
    const [assignedRouteIds, setAssignedRouteIds] = useState([]);
    const [loadingRoutes, setLoadingRoutes] = useState(true);
    
    // État pour les catégories de routes RH
    const [categoryStates, setCategoryStates] = useState(
        categories.reduce((acc, category) => {
            // Ouvrir par défaut "États et Rapports" et "Gestion du Personnel"
            acc[`isOpen${category.replace(/\s+/g, '')}`] = category === 'États et Rapports' || category === 'Gestion du Personnel';
            return acc;
        }, {})
    );

    // État spécifique pour le menu déroulant Nomination
    const [isNominationOpen, setIsNominationOpen] = useState(false);
    
    // État spécifique pour le menu déroulant Gestion des demandes
    const [isDemandesOpen, setIsDemandesOpen] = useState(false);

    // Charger les routes assignées pour les agents non-DRH
    useEffect(() => {
        let isMounted = true;
        
        const loadRoutes = async () => {
            if (user && user.id) {
                const isDRH = user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh';
                const isSuperAdmin = user.role === 'super_admin';
                
                // Seulement charger les routes assignées pour les agents (pas DRH, pas super_admin)
                if (!isDRH && !isSuperAdmin) {
                    try {
                        const routes = await loadAssignedRoutes(user.id);
                        if (isMounted) {
                            console.log('✅ Routes assignées chargées:', routes);
                            setAssignedRouteIds(routes);
                        }
                    } catch (error) {
                        if (isMounted) {
                            console.error('Erreur lors du chargement des routes assignées:', error);
                        }
                    }
                } else {
                    if (isMounted) {
                        setAssignedRouteIds([]);
                    }
                }
            }
            if (isMounted) {
                setLoadingRoutes(false);
            }
        };
        
        loadRoutes();
        
        // Fonction de nettoyage
        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleClick = (name) => () => {
        if (name === 'Components') {
            setIsOpenComponents(!isOpenComponents);
        } else if (name === 'Contents') {
            setIsOpenContents(!isOpenContents);
        } else if (name === 'Pages') {
            setIsOpenPages(!isOpenPages);
        } else if (name === 'PROFIL DE CARRIERE') {
            // Gestion spécifique du menu déroulant PROFIL DE CARRIERE
            setIsNominationOpen(!isNominationOpen);
        } else if (name === 'Demandes') {
            // Gestion spécifique du menu déroulant Gestion des demandes
            setIsDemandesOpen(!isDemandesOpen);
        } else {
            // Gestion des catégories RH
            setCategoryStates(prev => ({
                ...prev,
                [`isOpen${name}`]: !prev[`isOpen${name}`]
            }));
        }
    };

    // Filtrer les routes selon l'organisation de l'utilisateur
    const filteredRoutes = getFilteredRoutesBase(user, assignedRouteIds);

    // Dédupliquer les routes pour éviter les clés en double
    const uniqueFilteredRoutes = filteredRoutes.filter((route, index, self) =>
        self.findIndex(candidate => candidate.id === route.id) === index
    );
    
    // Grouper les routes filtrées par catégorie
    const filteredRoutesByCategory = uniqueFilteredRoutes.reduce((acc, route) => {
        if (!acc[route.category]) {
            acc[route.category] = [];
        }
        if (!acc[route.category].some(existing => existing.id === route.id)) {
            acc[route.category].push(route);
        }
        return acc;
    }, {});

    // Séparer les routes de nomination des autres catégories
    const nominationRoutes = filteredRoutesByCategory['PROFIL DE CARRIERE'] || [];
    const demandesRoutes = filteredRoutesByCategory['Gestions des documents administratifs'] || [];
    const demandesRouteOrder = [
        'demande-absence',
        'demande-sortie-territoire',
        'demande-attestation-travail',
        'autorisation-conges',
        'autorisation-retraite',
        'attestation-presence',
        'note-service',
        'mutations',
        'mutations-validation',
        'certificat-cessation-service',
        'autorisation-reprise-service',
        'documents-generated',
        'emargement',
        'historiques-demandes'
    ];
    
    // Fallback: Si l'utilisateur est DRH et qu'il n'y a pas de routes de gestion des documents administratifs,
    // forcer l'affichage des routes de gestion des documents administratifs
    let finalDemandesRoutes = demandesRoutes;
    
    // Force l'affichage pour tous les utilisateurs DRH
    if (user && (user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh')) {
        finalDemandesRoutes = backendRoutes.filter(route => route.category === 'Gestions des documents administratifs');
    }
    // Séparer la catégorie "Paramètres" pour l'afficher en dernier
    const parametresCategory = Object.entries(filteredRoutesByCategory).find(([category]) => 
        category === 'Paramètres'
    );
    const otherCategories = Object.entries(filteredRoutesByCategory).filter(([category]) => 
        category !== 'PROFIL DE CARRIERE' && 
        category !== 'Gestions des documents administratifs' &&
        category !== 'Paramètres'
    );

    const fallbackDemandesRoutes = backendRoutes.filter(route => route.category === 'Gestions des documents administratifs');
    const rawDemandesRoutes = (finalDemandesRoutes.length > 0 ? finalDemandesRoutes : fallbackDemandesRoutes);
    const uniqueDemandesRoutes = rawDemandesRoutes.filter((route, index, self) =>
        self.findIndex(candidate => candidate.id === route.id) === index
    );
    const sortedDemandesRoutes = uniqueDemandesRoutes
        .slice()
        .sort((a, b) => {
            const indexA = demandesRouteOrder.indexOf(a.id);
            const indexB = demandesRouteOrder.indexOf(b.id);

            const weightA = indexA === -1 ? demandesRouteOrder.length + 1 : indexA;
            const weightB = indexB === -1 ? demandesRouteOrder.length + 1 : indexB;

            if (weightA === weightB) {
                return a.name.localeCompare(b.name, 'fr');
            }
            return weightA - weightB;
        });

    // S'assurer que l'historique est présent et inséré juste après Documents générés
    const historiqueRoute = sortedDemandesRoutes.find(route => route.id === 'historiques-demandes') || fallbackDemandesRoutes.find(route => route.id === 'historiques-demandes');

    const demandesRoutesForRendering = (() => {
        if (!historiqueRoute) {
            const deduped = [];
            const seenKeys = new Set();

            sortedDemandesRoutes.forEach(route => {
                const key = route.id;
                if (!seenKeys.has(key)) {
                    seenKeys.add(key);
                    deduped.push(route);
                }
            });

            return deduped;
        }

        const orderedRoutes = [];
        const seenIds = new Set();
        const hasEmargement = sortedDemandesRoutes.some(route => route.id === 'emargement');
        let historiquePending = true;

        sortedDemandesRoutes.forEach(route => {
            if (seenIds.has(route.id)) {
                return;
            }
            seenIds.add(route.id);

            if (route.id === 'historiques-demandes') {
                return;
            }

            orderedRoutes.push(route);

            const shouldInsertHistoriqueAfter =
                (hasEmargement && route.id === 'emargement') ||
                (!hasEmargement && route.id === 'documents-generated');

            if (historiquePending && shouldInsertHistoriqueAfter) {
                orderedRoutes.push({
                    ...historiqueRoute,
                    __injected: true,
                });
                historiquePending = false;
            }
        });

        if (historiquePending) {
            orderedRoutes.push({
                ...historiqueRoute,
                __injected: true,
            });
        }

        const deduped = [];
        const seenKeys = new Set();

        orderedRoutes.forEach(route => {
            const key = route.__injected ? `injected-${route.id}` : route.id;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                deduped.push(route);
            }
        });

        return deduped;
    })();

    return (
        <aside className={bem.b()}>
            <div className={bem.e('background')} style={sidebarBackground} />
            <div className={bem.e('content')}>
                <Navbar>
                    <SourceLink className="navbar-brand d-flex">
                        <img
                            src={logo200Image}
                            width="40"
                            height="30"
                            className="pr-2"
                            alt=""
                        />
                        <span className="text-white">
                            {user?.organization?.type === 'ministere' ? 'Ministère' : 'Institution'}
                        </span>
                    </SourceLink>
                </Navbar>
                <Nav vertical>
                    {/* Navigation principale */}
                    {navItems.map(({ to, name, exact, Icon }, index) => (
                        <NavItem key={index} className={bem.e('nav-item')}>
                            <BSNavLink
                                id={`navItem-${name}-${index}`}
                                className="text-uppercase"
                                tag={NavLink}
                                to={to}
                                activeClassName="active"
                                exact={exact}
                            >
                                <Icon className={bem.e('nav-item-icon')} />
                                <span className="" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{name.toUpperCase()}</span>
                            </BSNavLink>
                        </NavItem>
                    ))}
                    
                    {/* Navigation personnalisée selon le rôle */}
                    {getCustomNavItems(user).map(({ to, name, exact, Icon }, index) => (
                        <NavItem key={`custom-${index}`} className={bem.e('nav-item')}>
                            <BSNavLink
                                id={`navItem-${name}-${index}`}
                                className="text-uppercase"
                                tag={NavLink}
                                to={to}
                                activeClassName="active"
                                exact={exact}
                            >
                                <Icon className={bem.e('nav-item-icon')} />
                                <span className="" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    {name === 'Espace Personnel DRH' ? t('sidebar.espacePersonnelDRH') : name.toUpperCase()}
                                </span>
                            </BSNavLink>
                        </NavItem>
                    ))}

                    {/* Menu déroulant Nomination */}
                    {nominationRoutes.length > 0 && (
                        <NavItem className={bem.e('nav-item')}>
                            <BSNavLink 
                                className={bem.e('nav-item-collapse')}
                                onClick={handleClick('PROFIL DE CARRIERE')}
                            >
                                <div className="d-flex">
                                    <MdAssignment className={bem.e('nav-item-icon')} />
                                    <span className="align-self-start" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {t('sidebar.nomination')}
                                    </span>
                                </div>
                                <MdKeyboardArrowDown
                                    className={bem.e('nav-item-icon')}
                                    style={{
                                        padding: 0,
                                        transform: isNominationOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        transitionDuration: '0.3s',
                                        transitionProperty: 'transform',
                                    }}
                                />
                            </BSNavLink>
                            <Collapse isOpen={isNominationOpen}>
                                <Nav className="flex-column">
                                    {nominationRoutes.map((route) => {
                                        const Icon = iconMap[route.icon] || MdSettings;
                                        return (
                                            <NavItem key={route.id} className={bem.e('nav-item')}>
                                                <BSNavLink
                                                    id={`navItem-${route.id}`}
                                                    tag={NavLink}
                                                    to={route.path}
                                                    activeClassName="active"
                                                    style={{ textTransform: 'none' }}
                                                >
                                                    <Icon className={bem.e('nav-item-icon')} />
                                                    <span className="">{capitalizeFirstLetter(translateRouteName(language, route.name))}</span>
                                                </BSNavLink>
                                            </NavItem>
                                        );
                                    })}
                                </Nav>
                            </Collapse>
                        </NavItem>
                    )}

                    {/* Menu déroulant Gestions des documents administratifs */}
                    {(finalDemandesRoutes.length > 0 || (user && (user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh'))) && (
                        <NavItem className={bem.e('nav-item')}>
                            <BSNavLink 
                                className={bem.e('nav-item-collapse')}
                                onClick={handleClick('Demandes')}
                            >
                                <div className="d-flex">
                                    <MdAssignment className={bem.e('nav-item-icon')} />
                                    <span className="align-self-start" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {t('sidebar.gestionsDocumentsAdministratifs')}
                                    </span>
                                </div>
                                <MdKeyboardArrowDown
                                    className={bem.e('nav-item-icon')}
                                    style={{
                                        padding: 0,
                                        transform: isDemandesOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        transitionDuration: '0.3s',
                                        transitionProperty: 'transform',
                                    }}
                                />
                            </BSNavLink>
                            <Collapse isOpen={isDemandesOpen}>
                                <Nav className="flex-column">
                                    {demandesRoutesForRendering.map(route => {
                                        const Icon = iconMap[route.icon] || MdSettings;
                                        const key = route.__injected ? `injected-${route.id}` : route.id;
                                        return (
                                            <NavItem key={key} className={bem.e('nav-item')}>
                                                <BSNavLink
                                                    id={`navItem-${key}`}
                                                    tag={NavLink}
                                                    to={route.path}
                                                    activeClassName="active"
                                                    style={{ textTransform: 'none' }}
                                                >
                                                    <Icon className={bem.e('nav-item-icon')} />
                                                    <span className="">{capitalizeFirstLetter(translateRouteName(language, route.name))}</span>
                                                </BSNavLink>
                                            </NavItem>
                                        );
                                    })}
                                </Nav>
                            </Collapse>
                        </NavItem>
                    )}

                    {/* Boîte de réception */}
                    {/* <NavItem className={bem.e('nav-item')}>
                        <BSNavLink
                            id="navItem-boite-reception"
                            className="text-uppercase"
                            tag={NavLink}
                            to="/boite-reception"
                            activeClassName="active"
                        >
                            <MdMail className={bem.e('nav-item-icon')} />
                            <span className="">Boîte de réception</span>
                        </BSNavLink>
                    </NavItem> */}

                    {/* Autres sections RH filtrées par organisation */}
                    {otherCategories.map(([category, routes]) => {
                        const categoryKey = category.replace(/\s+/g, '');
                        const isOpen = categoryStates[`isOpen${categoryKey}`];
                        
                        return (
                            <NavItem key={category} className={bem.e('nav-item')}>
                                <BSNavLink 
                                    className={bem.e('nav-item-collapse')}
                                    onClick={handleClick(categoryKey)}
                                >
                                    <div className="d-flex">
                                        <MdExtension className={bem.e('nav-item-icon')} />
                                        <span className="align-self-start" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {translateCategory(language, category).toUpperCase()}
                                        </span>
                                    </div>
                                    <MdKeyboardArrowDown
                                        className={bem.e('nav-item-icon')}
                                        style={{
                                            padding: 0,
                                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        }}
                                    />
                                </BSNavLink>
                                <Collapse isOpen={isOpen}>
                                    <Nav className="flex-column">
                                        {routes.map((route) => {
                                            const Icon = iconMap[route.icon] || MdSettings;
                                            return (
                                                <NavItem key={route.id} className={bem.e('nav-item')}>
                                                    <BSNavLink
                                                        id={`navItem-${route.id}`}
                                                        tag={NavLink}
                                                        to={route.path}
                                                        activeClassName="active"
                                                        style={{ textTransform: 'none' }}
                                                    >
                                                        <Icon className={bem.e('nav-item-icon')} />
                                                        <span className="">{capitalizeFirstLetter(translateRouteName(language, route.name))}</span>
                                                    </BSNavLink>
                                                </NavItem>
                                            );
                                        })}
                                    </Nav>
                                </Collapse>
                            </NavItem>
                        );
                    })}

                    {/* Catégorie Paramètres - Affichée en dernier */}
                    {parametresCategory && (() => {
                        const [category, routes] = parametresCategory;
                        const categoryKey = category.replace(/\s+/g, '');
                        const isOpen = categoryStates[`isOpen${categoryKey}`];
                        
                        return (
                            <NavItem key={category} className={bem.e('nav-item')}>
                                <BSNavLink 
                                    className={bem.e('nav-item-collapse')}
                                    onClick={handleClick(categoryKey)}
                                >
                                    <div className="d-flex">
                                        <MdExtension className={bem.e('nav-item-icon')} />
                                        <span className="align-self-start" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {translateCategory(language, category).toUpperCase()}
                                        </span>
                                    </div>
                                    <MdKeyboardArrowDown
                                        className={bem.e('nav-item-icon')}
                                        style={{
                                            padding: 0,
                                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                        }}
                                    />
                                </BSNavLink>
                                <Collapse isOpen={isOpen}>
                                    <Nav className="flex-column">
                                        {routes.map((route) => {
                                            const Icon = iconMap[route.icon] || MdSettings;
                                            return (
                                                <NavItem key={route.id} className={bem.e('nav-item')}>
                                                    <BSNavLink
                                                        id={`navItem-${route.id}`}
                                                        tag={NavLink}
                                                        to={route.path}
                                                        activeClassName="active"
                                                        style={{ textTransform: 'none' }}
                                                    >
                                                        <Icon className={bem.e('nav-item-icon')} />
                                                        <span className="">{capitalizeFirstLetter(translateRouteName(language, route.name))}</span>
                                                    </BSNavLink>
                                                </NavItem>
                                            );
                                        })}
                                    </Nav>
                                </Collapse>
                            </NavItem>
                        );
                    })()}

                </Nav>
            </div>
        </aside>
    );
};

export default FilteredSidebar;
