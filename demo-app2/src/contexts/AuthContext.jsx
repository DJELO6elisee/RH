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

/**
 * Normalise le rôle (libellé ou code) en code canonique pour l'affichage et les droits.
 * Ex: "CABINET CHEF", "Chef de cabinet" -> "chef_cabinet"
 */
const normalizeRoleCode = (roleNom) => {
  if (!roleNom || typeof roleNom !== 'string') return roleNom || '';
  const r = String(roleNom).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!r) return '';
  const withUnderscore = r.replace(/\s+/g, '_');
  if (withUnderscore === 'cabinet_chef' || (r.includes('chef') && r.includes('cabinet'))) return 'chef_cabinet';
  if (withUnderscore === 'dir_cabinet' || (r.includes('cabinet') && (r.includes('directeur') || r.includes('dir')))) return 'dir_cabinet';
  if (withUnderscore === 'chef_de_service' || (r.includes('chef') && r.includes('service') && !r.includes('cabinet'))) return 'chef_service';
  if (['directeur', 'sous_directeur', 'sous-directeur', 'directeur_central', 'directeur_general', 'drh', 'super_admin', 'inspecteur_general', 'directeur_service_exterieur', 'chef_service', 'ministre', 'agent', 'admin_entite'].includes(r)) return r === 'sous-directeur' ? 'sous_directeur' : r;
  if (r.includes('inspecteur') && (r.includes('général') || r.includes('general'))) return 'inspecteur_general';
  if (r.includes('service') && r.includes('exterieur')) return 'directeur_service_exterieur';
  if (r.includes('directeur') && r.includes('central')) return 'directeur_central';
  if (r.includes('directeur') && r.includes('general')) return 'directeur_general';
  if (r.includes('sous') && r.includes('directeur')) return 'sous_directeur';
  if (r === 'directeur') return 'directeur';
  return r;
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
            const userData = data.data || {};
            const roleCode = normalizeRoleCode(userData.role || userData.role_nom);
            const userNormalized = {
              ...userData,
              role: roleCode || userData.role,
              role_code: roleCode || userData.role_code
            };
            const organizationData = localStorage.getItem('organization');
            if (organizationData) {
              const organization = JSON.parse(organizationData);
              if (isMountedRef.current) {
                setUser({ ...userNormalized, organization });
              } else {
                console.log('🔍 Composant démonté, mise à jour de l\'état annulée');
              }
            } else {
              if (isMountedRef.current) {
                setUser(userNormalized);
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
      
      // Vérifier d'abord si l'agent de l'utilisateur appartient à cette organisation
      if (organizationId && organizationType === 'ministere') {
        const ministereCheckResponse = await fetch(`${apiUrl}/api/auth/check-login-ministere`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: username,
            ministereId: organizationId
          })
        });

        if (!ministereCheckResponse.ok) {
          return { 
            success: false, 
            message: 'Erreur de vérification du ministère. Veuillez réessayer.' 
          };
        }

        const ministereCheckData = await ministereCheckResponse.json();
        if (!ministereCheckData.authorized) {
          return { 
            success: false, 
            message: `Vous n'êtes pas autorisé à accéder à cette application. Cette application est réservée aux agents de ce ministère.` 
          };
        }
      }

      // Si autorisé, procéder à la connexion
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username, 
          password, 
          organizationId, 
          organizationType 
        })
      });

      const data = await response.json();

      if (data.success) {
        setToken(data.data.token);
        const loginUser = data.data.user || {};
        const roleCode = normalizeRoleCode(loginUser.role || loginUser.role_nom);
        const userWithOrganization = {
          ...loginUser,
          role: roleCode || loginUser.role,
          role_code: roleCode || loginUser.role_code,
          organization: {
            id: organizationId,
            type: organizationType
          }
        };
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
