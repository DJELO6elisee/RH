import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook personnalisé pour détecter l'inactivité de l'utilisateur
 * Déconnecte automatiquement après une période d'inactivité définie
 * 
 * @param {Function} onInactive - Fonction appelée après inactivité
 * @param {number} timeout - Durée d'inactivité en millisecondes (défaut: 30 minutes)
 * @param {boolean} enabled - Active ou désactive le timer (défaut: true)
 */
const useInactivityTimer = (onInactive, timeout = 30 * 60 * 1000, enabled = true) => {
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Réinitialiser le timer d'inactivité
  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Sauvegarder l'heure de la dernière activité dans sessionStorage
    sessionStorage.setItem('lastActivity', now.toString());
    
    // Nettoyer le timer existant
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Créer un nouveau timer
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Inactivité détectée - Déconnexion automatique...');
      onInactive();
    }, timeout);
    
    console.log(`🔄 Timer d'inactivité réinitialisé - Expiration dans ${timeout / 1000 / 60} minutes`);
  }, [onInactive, timeout]);

  // Gérer les événements d'activité
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Ne rien faire si le timer n'est pas activé
    if (!enabled) {
      console.log('ℹ️ Timer d\'inactivité désactivé (page publique ou non authentifié)');
      // Nettoyer sessionStorage si le timer est désactivé (utilisateur déconnecté)
      sessionStorage.removeItem('lastActivity');
      return;
    }

    // Vérifier s'il y a eu une activité récente dans sessionStorage
    // MAIS seulement si l'utilisateur est toujours connecté (token présent)
    // Si l'utilisateur vient de se reconnecter, on ignore l'ancienne activité
    const lastActivity = sessionStorage.getItem('lastActivity');
    const hasToken = localStorage.getItem('token'); // Vérifier si l'utilisateur est connecté
    
    if (lastActivity && hasToken) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      
      // Si l'inactivité est supérieure au timeout ET que l'utilisateur est toujours connecté
      // cela signifie qu'il y a eu un problème (par exemple, l'utilisateur est resté sur la page après expiration)
      if (timeSinceLastActivity >= timeout) {
        // L'utilisateur a été inactif trop longtemps
        console.log('⏰ Session expirée - Inactivité prolongée détectée');
        onInactive();
        return;
      }
    } else if (lastActivity && !hasToken) {
      // Si pas de token mais qu'il y a une ancienne activité, nettoyer
      // Cela signifie que l'utilisateur a été déconnecté et peut se reconnecter
      sessionStorage.removeItem('lastActivity');
    }

    // Initialiser le timer (démarre une nouvelle session)
    resetTimer();

    // Liste des événements qui indiquent une activité utilisateur
    const events = [
      'mousedown',    // Clic de souris
      'mousemove',    // Mouvement de souris
      'keydown',      // Frappe clavier
      'scroll',       // Défilement
      'touchstart',   // Touch sur mobile
      'click'         // Clic
    ];

    // Throttle pour éviter trop d'appels (max 1 par seconde)
    let throttleTimeout = null;
    const throttledHandleActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleActivity();
          throttleTimeout = null;
        }, 1000); // 1 seconde de throttle
      }
    };

    // Ajouter les écouteurs d'événements
    events.forEach(event => {
      window.addEventListener(event, throttledHandleActivity, { passive: true });
    });

    // Nettoyer à la destruction du composant
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledHandleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [enabled, onInactive, resetTimer, timeout]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current
  };
};

export default useInactivityTimer;

