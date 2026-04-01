import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Fonction helper pour obtenir l'URL de l'API
const getApiUrl = () => {
  // Si une URL est définie dans les variables d'environnement, l'utiliser
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // En développement (localhost), utiliser l'URL locale
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'https://tourisme.2ise-groupe.com';
  }
  
  // Sinon, utiliser l'URL de production
  return 'https://tourisme.2ise-groupe.com';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
    
    // Référence pour vérifier si le composant est monté
    const isMountedRef = useRef(true);

  // Vérifier le token au chargement de l'application
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/api/auth/verify`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            // Récupérer les informations d'organisation depuis localStorage si disponibles
            const organizationData = localStorage.getItem('organization');
            if (organizationData) {
              const organization = JSON.parse(organizationData);
              // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setUser({
                ...data.data,
                organization: organization
              });
            } else {
                console.log('🔍 Composant démonté, mise à jour de l\'état annulée');
            }
            } else {
              // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setUser(data.data);
            } else {
                console.log('🔍 Composant démonté, mise à jour de l\'état annulée');
            }
            }
          } else {
            // Vérifier si c'est une erreur d'authentification réelle (401, 403)
            // ou une erreur serveur (500, 503, etc.)
            if (response.status === 401 || response.status === 403) {
              // Token invalide ou expiré - déconnecter l'utilisateur
              console.warn('Token invalide ou expiré, déconnexion...');
              localStorage.removeItem('token');
              setToken(null);
              if (isMountedRef.current) {
                setUser(null);
              }
            } else {
              // Erreur serveur - ne pas déconnecter, juste logger
              console.error('Erreur serveur lors de la vérification du token:', response.status, response.statusText);
              // Garder l'utilisateur connecté en cas d'erreur serveur temporaire
            }
          }
        } catch (error) {
          // Vérifier si c'est une erreur réseau ou une autre erreur
          if (error.message === 'Failed to fetch' || error.name === 'TypeError' || error.name === 'NetworkError') {
            // Erreur réseau - ne pas déconnecter l'utilisateur
            console.warn('Erreur réseau lors de la vérification du token, l\'utilisateur reste connecté:', error.message);
            // Garder l'utilisateur connecté en cas de problème réseau temporaire
          } else {
            // Autre type d'erreur - logger mais ne pas déconnecter automatiquement
            console.error('Erreur lors de la vérification du token:', error);
            // Ne pas déconnecter automatiquement pour éviter les déconnexions intempestives
          }
        }
      }
      setIsLoading(false);
    };

    verifyToken();
  }, [token]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

  const login = async (username, password, organizationId = null, organizationType = null) => {
    try {
      const apiUrl = getApiUrl();
      
      // Logs de débogage
      console.log('🔍 AuthContext.login appelé:', {
        username,
        organizationId,
        organizationType,
        type_organizationId: typeof organizationId,
        isNull: organizationId === null,
        isUndefined: organizationId === undefined
      });
      
      // Vérifier d'abord si l'agent de l'utilisateur appartient à cette organisation
      if (organizationId && organizationType === 'ministere') {
        // Convertir organizationId en nombre si c'est une chaîne
        const ministereIdNum = typeof organizationId === 'string' ? parseInt(organizationId, 10) : organizationId;
        
        console.log('🔍 Vérification accès ministère:', {
          username,
          organizationId,
          organizationType,
          ministereIdNum,
          type: typeof ministereIdNum
        });
        
        const ministereCheckResponse = await fetch(`${apiUrl}/api/auth/check-login-ministere`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: username,
            ministereId: ministereIdNum
          })
        });

        if (!ministereCheckResponse.ok) {
          return { 
            success: false, 
            message: 'Erreur de vérification du ministère. Veuillez réessayer.' 
          };
        }

        const ministereCheckData = await ministereCheckResponse.json();
        
        console.log('🔍 Résultat vérification ministère:', ministereCheckData);
        
        if (!ministereCheckData.authorized) {
          console.error('❌ Accès refusé:', ministereCheckData.message);
          return { 
            success: false, 
            message: ministereCheckData.message || `Vous n'êtes pas autorisé à accéder à cette application. Cette application est réservée aux agents de ce ministère.` 
          };
        }
      }

      // Si autorisé, procéder à la connexion
      // Convertir organizationId en nombre si c'est une chaîne
      const orgIdForLogin = typeof organizationId === 'string' ? parseInt(organizationId, 10) : organizationId;
      
      console.log('🔍 Connexion avec:', {
        username,
        organizationId,
        orgIdForLogin,
        organizationType
      });
      
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          password, 
          organizationId: orgIdForLogin, 
          organizationType 
        })
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.data.token);
        // Ajouter les informations d'organisation à l'utilisateur
        const userWithOrganization = {
          ...data.data.user,
          organization: {
            id: organizationId,
            type: organizationType
          }
        };
        // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setUser(userWithOrganization);
            } else {
                console.log('🔍 Composant démonté, mise à jour de l\'état annulée');
            }
        localStorage.setItem('token', data.data.token);
        // Sauvegarder les informations d'organisation
        localStorage.setItem('organization', JSON.stringify({
          id: organizationId,
          type: organizationType
        }));
        // Nettoyer l'ancienne activité pour démarrer une nouvelle session propre
        sessionStorage.removeItem('lastActivity');
        return { success: true, user: userWithOrganization };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, message: 'Erreur de connexion au serveur' };
    }
  };

  const loginWithFingerprint = async (username, organizationId = null, organizationType = null) => {
    try {
      // Cette fonction sera appelée depuis la page de login après une authentification WebAuthn réussie
      // Le token et les données utilisateur sont déjà disponibles dans localStorage
      const storedToken = localStorage.getItem('token');
      const storedOrganization = localStorage.getItem('organization');
      
      if (storedToken) {
        setToken(storedToken);
        
        // Vérifier le token pour obtenir les informations utilisateur
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const organization = storedOrganization ? JSON.parse(storedOrganization) : null;
          
          if (isMountedRef.current) {
            setUser({
              ...data.data,
              organization: organization || {
                id: organizationId,
                type: organizationType
              }
            });
          }
          
          // Nettoyer l'ancienne activité pour démarrer une nouvelle session propre
          sessionStorage.removeItem('lastActivity');
          
          return { success: true, user: data.data };
        }
      }
      
      return { success: false, message: 'Token invalide' };
    } catch (error) {
      console.error('Erreur lors de la connexion par empreinte digitale:', error);
      return { success: false, message: 'Erreur de connexion au serveur' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        const apiUrl = getApiUrl();
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setToken(null);
      // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setUser(null);
            } else {
                console.log('🔍 Composant démonté, mise à jour de l\'état annulée');
            }
      localStorage.removeItem('token');
      localStorage.removeItem('organization');
      // Nettoyer sessionStorage pour permettre la reconnexion après déconnexion automatique
      sessionStorage.removeItem('lastActivity');
    }
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    loginWithFingerprint,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
