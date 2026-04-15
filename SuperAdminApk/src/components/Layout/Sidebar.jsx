import sidebarBgImage from 'assets/img/sidebar/sidebar-4.jpg';
import React from 'react';
import { FaGithub } from 'react-icons/fa';
import { useAuth } from 'contexts/AuthContext';
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
    MdRetirement,
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
    MdSettings,
    MdFlight,
    MdCheckCircle,
    MdNote,
    MdDateRange,
} from 'react-icons/md';
import { NavLink } from 'react-router-dom';
import {
    // UncontrolledTooltip,
    Collapse,
    Nav,
    Navbar,
    NavItem,
    NavLink as BSNavLink,
} from 'reactstrap';
import bn from 'utils/bemnames';
import { backendRoutes, routesByCategory, categories } from 'config/routes';

const sidebarBackground = {
    backgroundImage: `url("${sidebarBgImage}")`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
};

// const navComponents = [
//     { to: '/buttons', name: 'buttons', exact: false, Icon: MdRadioButtonChecked },
//     {
//         to: '/button-groups',
//         name: 'button groups',
//         exact: false,
//         Icon: MdGroupWork,
//     },
//     { to: '/forms', name: 'forms', exact: false, Icon: MdChromeReaderMode },
//     { to: '/input-groups', name: 'input groups', exact: false, Icon: MdViewList },
//     {
//         to: '/dropdowns',
//         name: 'dropdowns',
//         exact: false,
//         Icon: MdArrowDropDownCircle,
//     },
//     { to: '/badges', name: 'badges', exact: false, Icon: MdStar },
//     { to: '/alerts', name: 'alerts', exact: false, Icon: MdNotificationsActive },
//     { to: '/progress', name: 'progress', exact: false, Icon: MdBrush },
//     { to: '/modals', name: 'modals', exact: false, Icon: MdViewDay },
// ];

// const navContents = [
//     { to: '/typography', name: 'typography', exact: false, Icon: MdTextFields },
//     { to: '/tables', name: 'tables', exact: false, Icon: MdBorderAll },
// ];

// const pageContents = [
//     { to: '/login', name: 'login / signup', exact: false, Icon: MdAccountCircle },
//     {
//         to: '/login-modal',
//         name: 'login modal',
//         exact: false,
//         Icon: MdViewCarousel,
//     },
// ];

const navItems = [
    { to: '/', name: 'Tableau de Bord', exact: true, Icon: MdDashboard },
    { to: '/fiche-signaletique', name: 'fiche signalétique', exact: false, Icon: MdDescription },
    { to: '/parametres', name: 'paramètres', exact: false, Icon: MdSettings },
    // { to: '/cards', name: 'cards', exact: false, Icon: MdWeb },
    // { to: '/charts', name: 'charts', exact: false, Icon: MdInsertChart },
    // { to: '/widgets', name: 'widgets', exact: false, Icon: MdWidgets },
];

// Mapper les icônes pour les routes dynamiques
const iconMap = {
    'MdPerson': MdPerson,
    'MdLock': MdAccountCircle,
    'MdTitle': MdTextFields,
    'MdBusiness': MdBusiness,
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
    'MdRetirement': MdWork,
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
    'MdLocationCity': MdBusiness,
    'MdAssessment': MdInsertChart,
    'MdPieChart': MdInsertChart,
    'MdBarChart': MdInsertChart,
    'MdFlight': MdFlight,
    'MdCheckCircle': MdCheckCircle,
    'MdNote': MdNote,
    'MdDateRange': MdDateRange
};

const bem = bn.create('sidebar');

class Sidebar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOpenComponents: true,
            isOpenContents: true,
            isOpenPages: true,
            isOpenGestionRH: true,
            // État pour les catégories de routes RH
            ...(categories && categories.length > 0 ? categories.reduce((acc, category) => {
                acc[`isOpen${category.replace(/\s+/g, '')}`] = category === 'États et Rapports';
                return acc;
            }, {}) : {})
        };
    }

    handleClick = name => () => {
        this.setState(prevState => {
            const isOpen = prevState[`isOpen${name}`];

            return {
                [`isOpen${name}`]: !isOpen,
            };
        });
    };

    render() {
        return (
            <aside className={bem.b()} data-image={sidebarBgImage}>
                <div className={bem.e('background')} style={sidebarBackground} />
                <div className={bem.e('content')}>
                    <Navbar>
                        <div className="navbar-brand d-flex">
                            <img
                                src="/img/logo-tourisme.jpg"
                                width="40"
                                height="30"
                                className="pr-2"
                                alt="Logo Tourisme"
                            />
                            <span className="text-white">Ressource Humaine</span>
                        </div>
                    </Navbar>
                    <Nav vertical>
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
                                    <span className="" style={{ fontWeight: 'bold' }}>{name}</span>
                                </BSNavLink>
                            </NavItem>
                        ))}

                        {/* <NavItem className={bem.e('nav-item')} onClick={this.handleClick('Components')}>
                            <BSNavLink className={bem.e('nav-item-collapse')}>
                                <div className="d-flex">
                                    <MdExtension className={bem.e('nav-item-icon')} />
                                    <span className=" align-self-start">Components</span>
                                </div>
                                <MdKeyboardArrowDown
                                    className={bem.e('nav-item-icon')}
                                    style={{
                                        padding: 0,
                                        transform: this.state.isOpenComponents
                                            ? 'rotate(0deg)'
                                            : 'rotate(-90deg)',
                                        transitionDuration: '0.3s',
                                        transitionProperty: 'transform',
                                    }}
                                />
                            </BSNavLink>
                        </NavItem> */}
                        {/* <Collapse isOpen={this.state.isOpenComponents}>
                            {navComponents.map(({ to, name, exact, Icon }, index) => (
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
                                        <span className="">{name}</span>
                                    </BSNavLink>
                                </NavItem>
                            ))}
                        </Collapse> */}

                        {/* <NavItem className={bem.e('nav-item')} onClick={this.handleClick('Contents')}>
                            <BSNavLink className={bem.e('nav-item-collapse')}>
                                <div className="d-flex">
                                    <MdSend className={bem.e('nav-item-icon')} />
                                    <span className="">Contents</span>
                                </div>
                                <MdKeyboardArrowDown
                                    className={bem.e('nav-item-icon')}
                                    style={{
                                        padding: 0,
                                        transform: this.state.isOpenContents
                                            ? 'rotate(0deg)'
                                            : 'rotate(-90deg)',
                                        transitionDuration: '0.3s',
                                        transitionProperty: 'transform',
                                    }}
                                />
                            </BSNavLink>
                        </NavItem> */}
                        {/* <Collapse isOpen={this.state.isOpenContents}>
                            {navContents.map(({ to, name, exact, Icon }, index) => (
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
                                        <span className="">{name}</span>
                                    </BSNavLink>
                                </NavItem>
                            ))}
                        </Collapse> */}

                        {/* <NavItem className={bem.e('nav-item')} onClick={this.handleClick('Pages')}>
                            <BSNavLink className={bem.e('nav-item-collapse')}>
                                <div className="d-flex">
                                    <MdPages className={bem.e('nav-item-icon')} />
                                    <span className="">Pages</span>
                                </div>
                                <MdKeyboardArrowDown
                                    className={bem.e('nav-item-icon')}
                                    style={{
                                        padding: 0,
                                        transform: this.state.isOpenPages
                                            ? 'rotate(0deg)'
                                            : 'rotate(-90deg)',
                                        transitionDuration: '0.3s',
                                        transitionProperty: 'transform',
                                    }}
                                />
                            </BSNavLink>
                        </NavItem> */}
                        {/* <Collapse isOpen={this.state.isOpenPages}>
                            {pageContents.map(({ to, name, exact, Icon }, index) => (
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
                                        <span className="">{name}</span>
                                    </BSNavLink>
                                </NavItem>
                            ))}
                        </Collapse> */}

                        {/* Section Gestion RH */}
                        <NavItem className={bem.e('nav-item')} onClick={this.handleClick('GestionRH')}>
                            <BSNavLink className={bem.e('nav-item-collapse')}>
                                <div className="d-flex">
                                    <MdPerson className={bem.e('nav-item-icon')} />
                                    <span className="" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>GESTION RH</span>
                                </div>
                                <MdKeyboardArrowDown
                                    className={bem.e('nav-item-icon')}
                                    style={{
                                        padding: 0,
                                        transform: this.state.isOpenGestionRH
                                            ? 'rotate(0deg)'
                                            : 'rotate(-90deg)',
                                        transitionDuration: '0.3s',
                                        transitionProperty: 'transform',
                                    }}
                                />
                            </BSNavLink>
                        </NavItem>
                        <Collapse isOpen={this.state.isOpenGestionRH}>
                            {categories && categories.length > 0 ? categories.map((category) => (
                                <div key={category}>
                                    <NavItem className={bem.e('nav-item')} onClick={this.handleClick(category.replace(/\s+/g, ''))}>
                                        <BSNavLink className={bem.e('nav-item-collapse')}>
                                            <div className="d-flex">
                                                <MdSettings className={bem.e('nav-item-icon')} />
                                                <span className="" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{category.toUpperCase()}</span>
                                            </div>
                                            <MdKeyboardArrowDown
                                                className={bem.e('nav-item-icon')}
                                                style={{
                                                    padding: 0,
                                                    transform: this.state[`isOpen${category.replace(/\s+/g, '')}`]
                                                        ? 'rotate(0deg)'
                                                        : 'rotate(-90deg)',
                                                    transitionDuration: '0.3s',
                                                    transitionProperty: 'transform',
                                                }}
                                            />
                                        </BSNavLink>
                                    </NavItem>
                                    <Collapse isOpen={this.state[`isOpen${category.replace(/\s+/g, '')}`]}>
                                        {routesByCategory[category].map((route, index) => {
                                            const Icon = iconMap[route.icon] || MdSettings;
                                            return (
                                                <NavItem key={index} className={bem.e('nav-item')}>
                                                    <BSNavLink
                                                        id={`navItem-${route.id}-${index}`}
                                                        className="text-uppercase"
                                                        tag={NavLink}
                                                        to={route.path}
                                                        activeClassName="active"
                                                        exact={false}
                                                    >
                                                        <Icon className={bem.e('nav-item-icon')} />
                                                        <span className="" style={{ fontWeight: 'bold' }}>{route.name}</span>
                                                    </BSNavLink>
                                                </NavItem>
                                            );
                                        })}
                                    </Collapse>
                                </div>
                            )) : null}
                        </Collapse>
                    </Nav>
                </div>
            </aside>
        );
    }
}

export default Sidebar;
