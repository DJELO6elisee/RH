import { Content, Footer, Header } from 'components/Layout';
import FilteredSidebar from './FilteredSidebar';
import AgentSidebar from './AgentSidebar';
import React from 'react';
import {
  MdImportantDevices,
  // MdCardGiftcard,
  MdLoyalty,
} from 'react-icons/md';
import NotificationSystem from 'react-notification-system';
import { NOTIFICATION_SYSTEM_STYLE } from 'utils/constants';
import { useAuth } from '../../contexts/AuthContext';

// Wrapper pour MainLayout avec contexte utilisateur
const MainLayoutWithAuth = (props) => {
  const { user } = useAuth();
  return <MainLayout {...props} user={user} />;
};

class MainLayout extends React.Component {
  static isSidebarOpen() {
    const sidebar = document.querySelector('.cr-sidebar');
    if (!sidebar) return false;
    return sidebar.classList.contains('cr-sidebar--open');
  }

  componentWillReceiveProps({ breakpoint }) {
    if (breakpoint !== this.props.breakpoint) {
      this.checkBreakpoint(breakpoint);
    }
  }

  componentDidMount() {
    // Ne pas afficher les notifications si c'est un agent
    const user = this.props.user;
    const isAgent = user && user.role && 
                    user.role.toLowerCase() === 'agent' && 
                    user.role.toLowerCase() !== 'drh';
    
    if (isAgent) {
      // Pour les agents, ne pas afficher la sidebar DRH, juste le contenu
      return;
    }

    this.checkBreakpoint(this.props.breakpoint);

    setTimeout(() => {
      if (!this.notificationSystem) {
        return;
      }

      this.notificationSystem.addNotification({
        title: <MdImportantDevices />,
        message: 'Bienvenue dans votre Système de Gestion des Ressources Humaines !',
        level: 'success',
      });
    }, 1500);

    setTimeout(() => {
      if (!this.notificationSystem) {
        return;
      }

      this.notificationSystem.addNotification({
        title: <MdLoyalty />,
        message:
          'Gérez efficacement vos agents, nominations, congés et rapports en toute simplicité !',
        level: 'warning',
      });
    }, 2500);
  }

  // close sidebar when
  handleContentClick = event => {
    // close sidebar if sidebar is open and screen size is less than `md`
    if (
      MainLayout.isSidebarOpen() &&
      (this.props.breakpoint === 'xs' ||
        this.props.breakpoint === 'sm' ||
        this.props.breakpoint === 'md')
    ) {
      this.openSidebar('close');
    }
  };

  checkBreakpoint(breakpoint) {
    switch (breakpoint) {
      case 'xs':
      case 'sm':
      case 'md':
        return this.openSidebar('close');

      case 'lg':
      case 'xl':
      default:
        return this.openSidebar('open');
    }
  }

  openSidebar(openOrClose) {
    const sidebar = document.querySelector('.cr-sidebar');
    if (!sidebar) return;
    if (openOrClose === 'open') {
      return sidebar.classList.add('cr-sidebar--open');
    }
    sidebar.classList.remove('cr-sidebar--open');
  }

  render() {
    const { children, user } = this.props;
    
    // Vérifier si l'utilisateur est un agent (pas DRH)
    const isAgent = user && user.role && 
                    user.role.toLowerCase() === 'agent' && 
                    user.role.toLowerCase() !== 'drh';
    
    // Si c'est un agent, afficher AgentSidebar avec tous les onglets
    // AgentSidebar a maintenant tous les onglets de AgentDashboard plus les routes assignées
    if (isAgent) {
      return (
        <main className="cr-app bg-light" style={{ display: 'flex', minHeight: '100vh' }}>
          <AgentSidebar />
          <Content fluid style={{ marginLeft: '250px', padding: '20px', width: 'calc(100% - 250px)' }}>
            {children}
          </Content>
        </main>
      );
    }
    
    // Pour DRH et super_admin, afficher le layout complet avec sidebar
    return (
      <main className="cr-app bg-light" style={{ display: 'flex', minHeight: '100vh' }}>
        <FilteredSidebar />
        <Content fluid onClick={this.handleContentClick} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
          <Header />
          <div style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto' }}>
            {children}
          </div>
          <Footer style={{ marginTop: 'auto' }} />
        </Content>

        <NotificationSystem
          dismissible={false}
          ref={notificationSystem =>
            (this.notificationSystem = notificationSystem)
          }
          style={NOTIFICATION_SYSTEM_STYLE}
        />
      </main>
    );
  }
}

export default MainLayoutWithAuth;
