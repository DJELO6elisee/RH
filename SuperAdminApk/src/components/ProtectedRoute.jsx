import React, { useState, useEffect, Suspense } from 'react';
import { Route, Redirect, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { canAccessRoute } from '../utils/authUtils';

// Import sécurisé de backendRoutes
let backendRoutes = [];
try {
  const routesModule = require('../config/routes');
  backendRoutes = routesModule.backendRoutes || [];
} catch (error) {
  console.warn('Impossible de charger backendRoutes dans ProtectedRoute:', error);
}

const ProtectedRoute = ({ 
  component: Component, 
  requiredRoles = null, 
  organizationId = null, 
  organizationType = null,
  path,
  ...rest 
}) => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  // Vérifier si cette route correspond au pathname actuel
  const isCurrentRoute = location?.pathname === path || 
    (path && path.includes(':') && location?.pathname?.startsWith(path.split(':')[0])) ||
    (path && location?.pathname?.startsWith(path));

  // Vérification rapide pour DRH et super_admin
  const isSuperAdmin = user?.role === 'super_admin';
  const isDRH = user?.role === 'drh' || user?.role === 'DRH' || user?.role?.toLowerCase() === 'drh';
  const isPrivilegedUser = isSuperAdmin || isDRH;

  useEffect(() => {
    // Ne vérifier l'autorisation que si c'est la route actuelle
    const isCurrentRoute = location?.pathname === path || 
      (path && path.includes(':') && location?.pathname?.startsWith(path.split(':')[0])) ||
      (path && location?.pathname?.startsWith(path));
    
    if (!isCurrentRoute) {
      // Si ce n'est pas la route actuelle, ne pas vérifier
      setCheckingAuth(false);
      return;
    }
    
    const checkAuthorization = async () => {
      if (!isLoading && user && token) {
        // Pour les DRH et super_admin, autoriser immédiatement (sauf si requiredRoles spécifique)
        if (isPrivilegedUser) {
          if (requiredRoles) {
            // Vérifier seulement le rôle requis
            const hasRequiredRole = Array.isArray(requiredRoles) 
              ? requiredRoles.includes(user.role)
              : user.role === requiredRoles;
            setIsAuthorized(hasRequiredRole);
          } else {
            // Pas de restriction de rôle, autoriser
            setIsAuthorized(true);
          }
          setCheckingAuth(false);
          return;
        }

        // Pour les autres utilisateurs, vérifier l'autorisation
        try {
          // Trouver le routeId à partir du path
          let routeId = null;
          const currentPath = location?.pathname || path;
          
          console.log('🔍 ProtectedRoute - Recherche routeId:', {
            path,
            currentPath,
            locationPathname: location?.pathname,
            backendRoutesLength: backendRoutes?.length || 0
          });
          
          if (path && backendRoutes && Array.isArray(backendRoutes) && backendRoutes.length > 0) {
            // Essayer plusieurs méthodes de correspondance
            let route = backendRoutes.find(r => {
              if (!r || !r.path) return false;
              // Correspondance exacte
              if (r.path === currentPath) return true;
              if (r.path === path) return true;
              return false;
            });
            
            // Si pas trouvé, essayer sans slash initial
            if (!route) {
              route = backendRoutes.find(r => {
                if (!r || !r.path) return false;
                const rPath = r.path.replace(/^\//, '');
                const cPath = currentPath.replace(/^\//, '');
                const pPath = path.replace(/^\//, '');
                return rPath === cPath || rPath === pPath;
              });
            }
            
            // Si pas trouvé, essayer avec correspondance partielle (pour routes avec paramètres)
            if (!route) {
              route = backendRoutes.find(r => {
                if (!r || !r.path) return false;
                // Gérer les routes avec paramètres (ex: /fiche-signaletique/:agentId)
                if (r.path.includes(':')) {
                  const basePath = r.path.split(':')[0];
                  return currentPath.startsWith(basePath) || path.startsWith(basePath);
                }
                return false;
              });
            }
            
            if (route && route.id) {
              routeId = route.id;
              console.log('✅ ProtectedRoute - routeId trouvé:', routeId, 'pour path:', currentPath, 'route name:', route.name);
            } else {
              console.warn('⚠️ ProtectedRoute - routeId non trouvé pour path:', currentPath, 'path prop:', path);
              console.warn('   Essai de correspondance avec les premières routes:', backendRoutes.slice(0, 5).map(r => ({ id: r.id, path: r.path })));
            }
          } else {
            console.error('❌ ProtectedRoute - backendRoutes non disponible ou vide:', {
              hasPath: !!path,
              hasBackendRoutes: !!backendRoutes,
              isArray: Array.isArray(backendRoutes),
              length: backendRoutes?.length || 0
            });
          }

          const hasAccess = await canAccessRoute(
            user, 
            token, 
            organizationId, 
            organizationType, 
            requiredRoles,
            routeId
          );
          console.log('🔐 ProtectedRoute - hasAccess:', hasAccess, 'pour routeId:', routeId, 'user role:', user?.role, 'path:', path, 'currentPath:', location?.pathname);
          
          // Vérifier à nouveau si c'est toujours la route actuelle avant de mettre à jour
          const stillCurrentRoute = location?.pathname === path || 
            (path && path.includes(':') && location?.pathname?.startsWith(path.split(':')[0])) ||
            (path && location?.pathname?.startsWith(path));
          
          if (stillCurrentRoute) {
            console.log('✅ ProtectedRoute - Mise à jour isAuthorized à', hasAccess, 'pour path:', path);
            setIsAuthorized(hasAccess);
          } else {
            console.log('⚠️ ProtectedRoute - Route a changé, ne pas mettre à jour isAuthorized. Ancien path:', path, 'Nouveau path:', location?.pathname);
          }
        } catch (error) {
          console.error('Erreur de vérification d\'autorisation:', error);
          setIsAuthorized(false);
        }
      } else if (!isLoading && !user) {
        setIsAuthorized(false);
      }
      setCheckingAuth(false);
    };

    checkAuthorization();
  }, [user, token, isLoading, organizationId, organizationType, requiredRoles, path, location?.pathname, isPrivilegedUser]);

  if (isLoading || checkingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Chargement...</span>
          </div>
          <p className="mt-2">Vérification des autorisations...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <Redirect to="/login" />;
  }

  if (!isAuthorized) {
    // Vérifier à nouveau si c'est la route actuelle avant de rediriger
    const isCurrentRoute = location?.pathname === path || 
      (path && path.includes(':') && location?.pathname?.startsWith(path.split(':')[0])) ||
      (path && location?.pathname?.startsWith(path));
    
    if (!isCurrentRoute) {
      // Si ce n'est pas la route actuelle, ne pas rediriger (évite les redirections depuis d'autres routes)
      console.log('⚠️ ProtectedRoute - Route non actuelle, ne pas rediriger. path:', path, 'currentPath:', location?.pathname);
      return null;
    }
    
    // Rediriger vers le dashboard approprié selon le rôle
    const isAgent = user && !['drh', 'DRH', 'super_admin'].includes(user.role?.toLowerCase());
    if (isAgent) {
      console.log('🔄 ProtectedRoute - Redirection agent vers /agent-dashboard car accès refusé pour path:', path);
      return <Redirect to="/agent-dashboard" />;
    }
    
    // Pour DRH et super_admin, afficher un message d'erreur
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Accès refusé</h4>
            <p>Vous n'êtes pas autorisé à accéder à cette page.</p>
            <hr />
            <p className="mb-0">
              <a href="/" className="btn btn-primary">Retour à l'accueil</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ne pas vérifier Component ici car les composants lazy peuvent apparaître undefined
  // Laisser Suspense gérer le chargement
  return (
    <Route 
      {...rest} 
      path={path}
      render={(props) => {
        // Si Component est vraiment undefined (pas un lazy component), afficher une erreur
        if (!Component || typeof Component === 'undefined') {
          console.error('ProtectedRoute: Component is undefined for path:', path);
          return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
              <div className="text-center">
                <div className="alert alert-warning" role="alert">
                  <h4 className="alert-heading">Composant non trouvé</h4>
                  <p>Le composant de cette page n'a pas pu être chargé.</p>
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    Path: {path}<br />
                    Component type: {typeof Component}
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return (
          <Suspense fallback={
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
              <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="sr-only">Chargement...</span>
                </div>
                <p className="mt-2">Chargement du composant...</p>
              </div>
            </div>
          }>
            <Component {...props} />
          </Suspense>
        );
      }} 
    />
  );
};

export default ProtectedRoute;
