import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useInactivityTimer from '../hooks/useInactivityTimer';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import { MdAccessTime } from 'react-icons/md';

/**
 * Composant pour gérer l'inactivité de l'utilisateur
 * Déconnecte automatiquement après 30 minutes d'inactivité
 * Affiche un avertissement 2 minutes avant l'expiration
 */
const InactivityHandler = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120);

  // Durée d'inactivité : 30 minutes (en millisecondes)
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 2 * 60 * 1000; // Avertir 2 minutes avant

  // Ne pas activer le système pour les pages publiques ou utilisateurs non connectés
  const publicPages = ['/ministere', '/login', '/login-page', '/signup', '/institution', '/public'];
  const isPublicPage = publicPages.some(page => location.pathname.startsWith(page));
  const shouldActivateTimer = isAuthenticated && !isPublicPage;

  // Fonction appelée lors de l'inactivité
  const handleInactive = async () => {
    console.log('⏰ Session expirée - Déconnexion automatique pour inactivité');
    
    // Fermer l'avertissement s'il est affiché
    setShowWarning(false);
    
    // Nettoyer sessionStorage pour permettre la reconnexion immédiate
    sessionStorage.removeItem('lastActivity');
    
    // Déconnecter l'utilisateur silencieusement
    await logout();
    
    // Rediriger vers la page d'accueil (déconnexion silencieuse)
    history.push('/ministere');
    
    console.log('✅ Utilisateur déconnecté automatiquement et redirigé vers /ministere');
  };

  // Utiliser le hook d'inactivité SEULEMENT si l'utilisateur est connecté ET sur une page protégée
  const { resetTimer } = useInactivityTimer(
    handleInactive,
    INACTIVITY_TIMEOUT,
    shouldActivateTimer // Activer seulement si connecté et page protégée
  );

  // Vérifier périodiquement et afficher l'avertissement
  useEffect(() => {
    // Ne rien faire si pas connecté ou sur page publique
    if (!shouldActivateTimer) {
      setShowWarning(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const lastActivity = sessionStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
        const timeRemaining = INACTIVITY_TIMEOUT - timeSinceLastActivity;

        // Afficher l'avertissement si moins de 2 minutes restantes
        if (timeRemaining <= WARNING_TIME && timeRemaining > 0) {
          setShowWarning(true);
          setRemainingSeconds(Math.ceil(timeRemaining / 1000));
        } else {
          setShowWarning(false);
        }
      }
    }, 1000); // Vérifier chaque seconde

    return () => clearInterval(checkInterval);
  }, [shouldActivateTimer, INACTIVITY_TIMEOUT, WARNING_TIME]);

  // Réinitialiser le timer si l'utilisateur continue
  const handleContinue = () => {
    setShowWarning(false);
    resetTimer();
  };

  // Retourner seulement les enfants si le timer n'est pas activé
  if (!shouldActivateTimer) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      {/* Modal d'avertissement d'expiration de session */}
      <Modal isOpen={showWarning} backdrop="static" keyboard={false}>
        <ModalHeader>
          <MdAccessTime className="me-2" style={{ fontSize: '1.5rem', color: '#ff9800' }} />
          Session bientôt expirée
        </ModalHeader>
        <ModalBody>
          <div className="text-center py-3">
            <div className="mb-3">
              <div style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold', 
                color: '#dc3545',
                fontFamily: 'monospace'
              }}>
                {remainingSeconds}
              </div>
              <div className="text-muted">secondes restantes</div>
            </div>
            <p>
              Votre session va expirer en raison d'une inactivité prolongée.
            </p>
            <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
              Cliquez sur "Continuer" pour prolonger votre session, sinon vous serez 
              automatiquement déconnecté(e) et redirigé(e) vers la page d'accueil.
            </p>
          </div>
        </ModalBody>
        <ModalFooter className="justify-content-center">
          <Button color="primary" size="lg" onClick={handleContinue}>
            <MdAccessTime className="me-2" />
            Continuer ma session
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default InactivityHandler;

