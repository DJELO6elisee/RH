import Avatar from 'components/Avatar';
import { UserCard } from 'components/Card';
import Notifications from 'components/Notifications';
import SearchInput from 'components/SearchInput';
import { notificationsData } from 'demos/header';
import withBadge from 'hocs/withBadge';
import { useAuth } from 'contexts/AuthContext';
import { useHistory } from 'react-router-dom';
import React from 'react';
import {
  MdClearAll,
  MdExitToApp,
  MdHelp,
  MdInsertChart,
  MdMessage,
  MdNotificationsActive,
  MdNotificationsNone,
  MdPersonPin,
  MdSettingsApplications,
} from 'react-icons/md';
import {
  Button,
  ListGroup,
  ListGroupItem,
  // NavbarToggler,
  Nav,
  Navbar,
  NavItem,
  NavLink,
  Popover,
  PopoverBody,
} from 'reactstrap';
import bn from 'utils/bemnames';

const bem = bn.create('header');
const logo200Image = `${process.env.PUBLIC_URL}/img/logo-tourisme.jpg`;

const MdNotificationsActiveWithBadge = withBadge({
  size: 'md',
  color: 'primary',
  style: {
    top: -10,
    right: -10,
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  children: <small>5</small>,
})(MdNotificationsActive);

const Header = () => {
  const { user, logout } = useAuth();
  const history = useHistory();
  const [isOpenNotificationPopover, setIsOpenNotificationPopover] = React.useState(false);
  const [isNotificationConfirmed, setIsNotificationConfirmed] = React.useState(false);
  const [isOpenUserCardPopover, setIsOpenUserCardPopover] = React.useState(false);
  
  const handleNotificationClick = (notification) => {
    // Naviguer vers la boîte de réception avec la notification sélectionnée
    history.push(`/agent-dashboard?tab=6&notificationId=${notification.id}`);
    setIsOpenNotificationPopover(false);
  };

  const toggleNotificationPopover = () => {
    setIsOpenNotificationPopover(!isOpenNotificationPopover);

    if (!isNotificationConfirmed) {
      setIsNotificationConfirmed(true);
    }
  };

  const toggleUserCardPopover = () => {
    setIsOpenUserCardPopover(!isOpenUserCardPopover);
  };

  const handleSidebarControlButton = event => {
    event.preventDefault();
    event.stopPropagation();

    document.querySelector('.cr-sidebar').classList.toggle('cr-sidebar--open');
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/ministere';
  };

  return (
    <Navbar light expand className={bem.b('bg-white')}>
      <Nav navbar className="mr-2">
        <Button outline onClick={handleSidebarControlButton}>
          <MdClearAll size={25} />
        </Button>
      </Nav>
      <Nav navbar>
        <SearchInput />
      </Nav>

      <Nav navbar className={bem.e('nav-right')}>
        <NavItem className="d-inline-flex">
          <NavLink id="Popover1" className="position-relative">
            {isNotificationConfirmed ? (
              <MdNotificationsNone
                size={25}
                className="text-secondary can-click"
                onClick={toggleNotificationPopover}
              />
            ) : (
              <MdNotificationsActiveWithBadge
                size={25}
                className="text-secondary can-click animated swing infinite"
                onClick={toggleNotificationPopover}
              />
            )}
          </NavLink>
          <Popover
            placement="bottom"
            isOpen={isOpenNotificationPopover}
            toggle={toggleNotificationPopover}
            target="Popover1"
          >
            <PopoverBody>
              <Notifications notificationsData={notificationsData} onNotificationClick={handleNotificationClick} />
            </PopoverBody>
          </Popover>
        </NavItem>

        <NavItem>
          <NavLink id="Popover2">
            <img
              src={logo200Image}
              alt="Logo Armoirie"
              onClick={toggleUserCardPopover}
              className="can-click"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                cursor: 'pointer',
                border: '2px solid #fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            />
          </NavLink>
          <Popover
            placement="bottom-end"
            isOpen={isOpenUserCardPopover}
            toggle={toggleUserCardPopover}
            target="Popover2"
            className="p-0 border-0"
            style={{ minWidth: 250 }}
          >
            <PopoverBody className="p-0 border-light">
              <UserCard
                avatar={logo200Image}
                avatarSize={80}
                title={user && user.username ? user.username : 'Utilisateur'}
                subtitle={user && user.email ? user.email : 'email@example.com'}
                text={`Rôle: ${user && user.role ? user.role : 'Non défini'}`}
                className="border-light"
              >
                <ListGroup flush>
                  <ListGroupItem tag="button" action className="border-light">
                    <MdPersonPin /> Profile
                  </ListGroupItem>
                  <ListGroupItem tag="button" action className="border-light">
                    <MdInsertChart /> Stats
                  </ListGroupItem>
                  <ListGroupItem tag="button" action className="border-light">
                    <MdMessage /> Messages
                  </ListGroupItem>
                  <ListGroupItem tag="button" action className="border-light">
                    <MdSettingsApplications /> Settings
                  </ListGroupItem>
                  <ListGroupItem tag="button" action className="border-light">
                    <MdHelp /> Help
                  </ListGroupItem>
                  <ListGroupItem tag="button" action className="border-light" onClick={handleLogout}>
                    <MdExitToApp /> Déconnexion
                  </ListGroupItem>
                </ListGroup>
              </UserCard>
            </PopoverBody>
          </Popover>
        </NavItem>
      </Nav>
    </Navbar>
  );
};

export default Header;
