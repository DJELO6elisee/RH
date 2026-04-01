export const NOTIFICATION_SYSTEM_STYLE = {
  NotificationItem: {
    DefaultStyle: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',

      borderRadius: '4px',
      fontSize: '14px',
    },

    success: {
      borderTop: 0,
      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      WebkitBoxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
      MozBoxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
      boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)',
    },

    error: {
      borderTop: 0,
      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      WebkitBoxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
      MozBoxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
      boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
    },

    warning: {
      borderTop: 0,
      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
      WebkitBoxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
      MozBoxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
      boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
    },

    info: {
      borderTop: 0,
      background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
      WebkitBoxShadow: '0 4px 12px rgba(23, 162, 184, 0.3)',
      MozBoxShadow: '0 4px 12px rgba(23, 162, 184, 0.3)',
      boxShadow: '0 4px 12px rgba(23, 162, 184, 0.3)',
    },
  },

  Title: {
    DefaultStyle: {
      margin: 0,
      padding: 0,
      paddingRight: 5,
      color: '#fff',
      display: 'inline-flex',
      fontSize: 20,
      fontWeight: 'bold',
      // left: '15px',
      // position: 'absolute',
      // top: '50%',
    },
  },

  MessageWrapper: {
    DefaultStyle: {
      display: 'block',
      color: '#fff',
      width: '100%',
    },
  },

  Dismiss: {
    DefaultStyle: {
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'inherit',
      fontSize: 20,
      color: '#f2f2f2',
      position: 'relative',
      margin: 0,
      padding: 0,
      background: 'none',
      borderRadius: 0,
      opacity: 1,
      width: 20,
      height: 20,
      textAlign: 'initial',
      float: 'none',
      top: 'unset',
      right: 'unset',
      lineHeight: 'inherit',
    },
  },

  Action: {
    DefaultStyle: {
      background: '#fff',
      borderRadius: '2px',
      padding: '6px 20px',
      fontWeight: 'bold',
      margin: '10px 0 0 0',
      border: 0,
    },

    success: {
      backgroundColor: '#45b649',
      color: '#fff',
    },

    error: {
      backgroundColor: '#f85032',
      color: '#fff',
    },

    warning: {
      backgroundColor: '#ffd700',
      color: '#fff',
    },

    info: {
      backgroundColor: '#00c9ff',
      color: '#fff',
    },
  },

  ActionWrapper: {
    DefaultStyle: {
      margin: 0,
      padding: 0,
    },
  },
};
