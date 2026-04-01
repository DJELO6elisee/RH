import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert } from 'reactstrap';
import { MdRefresh, MdSystemUpdateAlt, MdClose } from 'react-icons/md';

/**
 * Composant de détection automatique de nouvelle version
 * Vérifie périodiquement si une nouvelle version est disponible
 * Affiche une notification avec bouton "Actualiser" si détection de mise à jour
 */
const VersionChecker = ({ checkInterval = 60000 }) => { // Vérifier toutes les 60 secondes par défaut
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [newVersion, setNewVersion] = useState(null);
  const [newBuildId, setNewBuildId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  // Fonction pour obtenir la version actuelle stockée en localStorage
  const getCurrentVersion = () => {
    return localStorage.getItem('app_version');
  };

  // Fonction pour vérifier s'il y a une nouvelle version
  const checkForNewVersion = useCallback(async () => {
    try {
      // Ajouter un timestamp pour éviter le cache lors de la vérification
      const timestamp = Date.now();
      const response = await fetch(`/version.json?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const versionInfo = await response.json();
        const serverVersion = versionInfo.version;
        const serverBuildId = versionInfo.buildId || versionInfo.version; // Utiliser buildId si disponible
        const storedBuildId = localStorage.getItem('app_build_id');
        const storedVersion = getCurrentVersion();
        
        console.log('🔍 Vérification de version:', {
          serverVersion,
          serverBuildId,
          storedVersion,
          storedBuildId,
          buildDate: versionInfo.buildDate
        });
        
        // Si c'est la première visite
        if (!storedBuildId) {
          // Première visite, stocker le buildId et la version actuels
          localStorage.setItem('app_build_id', serverBuildId);
          localStorage.setItem('app_version', serverVersion);
          setCurrentVersion(serverVersion);
          console.log('📝 Première visite - Build ID stocké:', serverBuildId);
        } else if (storedBuildId !== serverBuildId) {
          // Nouveau build détecté (buildId différent) !
          console.log('🆕 Nouveau build détecté !', {
            ancienBuildId: storedBuildId,
            nouveauBuildId: serverBuildId,
            ancienneVersion: storedVersion,
            nouvelleVersion: serverVersion
          });
          setCurrentVersion(storedVersion);
          setNewVersion(serverVersion);
          setNewBuildId(serverBuildId);
          setNewVersionAvailable(true);
          setShowAlert(true);
        } else {
          console.log('✅ Même build - Pas de mise à jour nécessaire');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de version:', error);
    }
  }, []);

  // Vérifier au chargement de la page
  useEffect(() => {
    // Vérification immédiate au chargement
    checkForNewVersion();
    
    // Première vérification rapide après 3 secondes
    const initialTimeout = setTimeout(() => {
      checkForNewVersion();
    }, 3000);
    
    // Vérifier périodiquement ensuite
    const interval = setInterval(() => {
      checkForNewVersion();
    }, checkInterval);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkInterval, checkForNewVersion]);

  // Fonction pour actualiser l'application (comme Ctrl+F5)
  const handleHardRefresh = () => {
    console.log('🔄 Actualisation forcée de l\'application...');
    
    // Mettre à jour la version et le buildId stockés
    if (newVersion) {
      localStorage.setItem('app_version', newVersion);
    }
    if (newBuildId) {
      localStorage.setItem('app_build_id', newBuildId);
      console.log('📝 Nouveau Build ID stocké:', newBuildId);
    }
    
    // Vider le cache de l'application
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
          console.log('🗑️ Cache supprimé:', name);
        });
      });
    }
    
    // Forcer le rechargement complet (équivalent Ctrl+F5)
    // Méthode 1: Meta refresh
    const meta = document.createElement('meta');
    meta.httpEquiv = 'refresh';
    meta.content = '0';
    document.head.appendChild(meta);
    
    // Méthode 2: Reload forcé après un court délai
    setTimeout(() => {
      window.location.reload(true);
    }, 100);
  };

  // Fonction pour fermer l'alerte (reporter la mise à jour)
  const handleDismiss = () => {
    setShowAlert(false);
    console.log('ℹ️ Mise à jour reportée par l\'utilisateur');
  };

  // Ne rien afficher si aucune mise à jour n'est disponible
  if (!newVersionAvailable || !showAlert) {
    return null;
  }

  return (
    <Alert 
      color="info" 
      isOpen={showAlert}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        minWidth: '350px',
        maxWidth: '450px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderLeft: '4px solid #0d6efd',
        animation: 'slideInRight 0.5s ease-out'
      }}
      className="d-flex align-items-center justify-content-between"
    >
      <div className="d-flex align-items-start flex-grow-1">
        <MdSystemUpdateAlt 
          style={{ 
            fontSize: '2rem', 
            marginRight: '15px',
            color: '#0d6efd',
            flexShrink: 0
          }} 
        />
        <div>
          <h6 className="alert-heading mb-2" style={{ fontWeight: 'bold' }}>
            🎉 Nouvelle version disponible !
          </h6>
          <p className="mb-2" style={{ fontSize: '0.9rem' }}>
            Une nouvelle version de l'application est disponible.
            {newVersion && (
              <span className="d-block mt-1">
                <strong>Version : {newVersion}</strong>
              </span>
            )}
          </p>
          <div className="d-flex gap-2">
            <Button
              color="primary"
              size="sm"
              onClick={handleHardRefresh}
              className="d-flex align-items-center"
              style={{ gap: '5px' }}
            >
              <MdRefresh style={{ fontSize: '1.1rem' }} />
              Actualiser maintenant
            </Button>
            <Button
              color="secondary"
              size="sm"
              outline
              onClick={handleDismiss}
            >
              Plus tard
            </Button>
          </div>
        </div>
      </div>
      <Button
        close
        onClick={handleDismiss}
        style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px',
          fontSize: '1.2rem'
        }}
      >
        <MdClose />
      </Button>
    </Alert>
  );
};

// Ajouter l'animation CSS
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
if (!document.head.querySelector('style[data-version-checker]')) {
  styleElement.setAttribute('data-version-checker', 'true');
  document.head.appendChild(styleElement);
}

export default VersionChecker;

