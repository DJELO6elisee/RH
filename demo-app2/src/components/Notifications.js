import React, { useState, useEffect } from 'react';
import PropTypes from 'utils/propTypes';
import { Media, Spinner, Badge } from 'reactstrap';
import { useHistory } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import Avatar from 'components/Avatar';

const Notifications = ({ notificationsData, onNotificationClick }) => {
  const { user } = useAuth();
  const history = useHistory();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id_agent) {
      loadNotifications();
    } else if (notificationsData) {
      // Fallback vers les données statiques si pas d'agent
      setNotifications(notificationsData);
      setLoading(false);
    }
  }, [user?.id_agent]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://tourisme.2ise-groupe.com/api/demandes/notifications/agent/${user.id_agent}?limit=10&page=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const result = await response.json();
      if (result.success) {
        // Trier par date décroissante (plus récentes en premier)
        const sorted = (result.data || []).sort((a, b) => {
          const dateA = new Date(a.date_creation || a.created_at || 0);
          const dateB = new Date(b.date_creation || b.created_at || 0);
          return dateB - dateA;
        });
        setNotifications(sorted);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des notifications:', err);
      // Fallback vers les données statiques en cas d'erreur
      if (notificationsData) {
        setNotifications(notificationsData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    } else {
      // Navigation par défaut vers la boîte de réception
      history.push('/agent-dashboard?tab=6&notificationId=' + notification.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="text-center p-3">
        <Spinner size="sm" color="primary" />
        <div className="mt-2 small">Chargement...</div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center p-3 text-muted">
        <small>Aucune notification</small>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '400px', overflowY: 'auto', minWidth: '300px' }}>
      {notifications.map((notification) => {
        const message = notification.message || notification.titre || 'Notification';
        const date = notification.date_creation || notification.created_at || notification.date;
        const isUnread = !notification.lu;

        return (
          <Media 
            key={notification.id} 
            className="pb-2 px-2 py-2 border-bottom"
            style={{ 
              cursor: 'pointer',
              backgroundColor: isUnread ? '#f0f8ff' : 'transparent',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e8f4f8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnread ? '#f0f8ff' : 'transparent'}
            onClick={() => handleNotificationClick(notification)}
          >
            <Media left className="align-self-center pr-3">
              <Avatar 
                tag={Media} 
                object 
                src={notification.avatar || `${process.env.PUBLIC_URL}/img/default-avatar.png`} 
                alt="Avatar"
                size="sm"
              />
            </Media>
            <Media body middle className="align-self-center">
              <div className="d-flex align-items-center flex-wrap">
                <div style={{ color: '#000', fontWeight: isUnread ? '600' : '400', wordBreak: 'break-word', maxWidth: '250px' }}>
                  {notification.titre || message}
                </div>
                {isUnread && (
                  <Badge color="primary" className="ms-2" pill>Nouveau</Badge>
                )}
              </div>
              {notification.titre && notification.message && notification.message !== notification.titre && (
                <small className="text-muted d-block mt-1" style={{ fontSize: '0.85rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {notification.message.substring(0, 50)}...
                </small>
              )}
            </Media>
            <Media right className="align-self-center">
              <small className="text-muted">{formatDate(date)}</small>
            </Media>
          </Media>
        );
      })}
    </div>
  );
};

Notifications.propTypes = {
  notificationsData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.ID,
      avatar: PropTypes.string,
      message: PropTypes.node,
      date: PropTypes.date,
    })
  ),
  onNotificationClick: PropTypes.func,
};

Notifications.defaultProps = {
  notificationsData: [],
  onNotificationClick: null,
};

export default Notifications;
