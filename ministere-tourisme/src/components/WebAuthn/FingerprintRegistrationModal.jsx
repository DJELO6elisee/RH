import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Alert,
  Spinner
} from 'reactstrap';
import { MdFingerprint, MdCheckCircle, MdError, MdInfo, MdTouchApp } from 'react-icons/md';
import { registerFingerprint } from '../../services/webauthnService';
import './FingerprintRegistrationModal.css';

const FingerprintRegistrationModal = ({ isOpen, toggle, username, deviceName, onSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('ready'); // 'ready', 'scanning', 'success', 'error'

  // Réinitialiser quand la modale se ferme
  useEffect(() => {
    if (!isOpen) {
      setStep('ready');
      setError(null);
      setIsRegistering(false);
    }
  }, [isOpen]);

  const handleRegister = async (event) => {
    // Empêcher le double-clic
    if (isRegistering || step === 'scanning') {
      return;
    }

    if (!username) {
      setError('Nom d\'utilisateur requis');
      return;
    }

    // Empêcher la propagation si c'est un événement
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setIsRegistering(true);
    setError(null);
    setStep('scanning');

    try {
      console.log('🔐 Démarrage de l\'enregistrement pour:', username);
      
      // Vérifier que WebAuthn est disponible
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn n\'est pas supporté sur ce navigateur. Utilisez Chrome, Edge, Firefox ou Safari.');
      }
      
      if (!navigator.credentials) {
        throw new Error('L\'API Credentials n\'est pas disponible sur ce navigateur.');
      }
      
      console.log('✅ WebAuthn est disponible, démarrage de l\'enregistrement...');
      
      const result = await registerFingerprint(username, deviceName);
      
      if (result.success) {
        setStep('success');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      setStep('error');
      
      // Messages d'erreur plus clairs
      let errorMessage = 'Erreur lors de l\'enregistrement de l\'empreinte digitale';
      
      if (error.message) {
        if (error.message.includes('annulé') || error.message.includes('refusé')) {
          errorMessage = 'L\'enregistrement a été annulé. Veuillez réessayer et placer votre doigt sur le capteur quand demandé.';
        } else if (error.message.includes('déjà enregistrée')) {
          errorMessage = 'Cette empreinte digitale est déjà enregistrée pour cet utilisateur.';
        } else if (error.message.includes('non supportée')) {
          errorMessage = 'L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil ou navigateur.';
        } else if (error.message.includes('sécurité')) {
          errorMessage = 'Erreur de sécurité. Assurez-vous d\'utiliser HTTPS ou localhost.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = () => {
    setStep('ready');
    setError(null);
    setIsRegistering(false);
    toggle();
  };

  const handleRetry = (event) => {
    setStep('ready');
    setError(null);
    // Utiliser setTimeout pour permettre au navigateur de détecter le clic utilisateur
    setTimeout(() => {
      handleRegister(event);
    }, 100);
  };

  return (
    <Modal isOpen={isOpen} toggle={handleClose} centered size="md" className="fingerprint-modal">
      <ModalHeader toggle={handleClose} className="text-center">
        <MdFingerprint className="me-2" style={{ fontSize: '1.5rem' }} />
        Enregistrement de l'empreinte digitale
      </ModalHeader>
      <ModalBody className="text-center">
        {step === 'ready' && (
          <>
            <div 
              className="fingerprint-scan-area mb-4" 
              onClick={handleRegister}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRegister(e);
                }
              }}
              aria-label="Cliquez pour commencer l'enregistrement de l'empreinte digitale"
            >
              <div className="fingerprint-icon-large">
                <MdFingerprint />
              </div>
              <div className="touch-indicator">
                <MdTouchApp />
              </div>
              <p className="scan-instruction">Cliquez ici pour commencer</p>
            </div>
            <h5 className="mb-3">Enregistrement de l'empreinte digitale</h5>
            <p className="text-muted mb-4">
              <strong>Cliquez sur la zone ci-dessus</strong> pour commencer l'enregistrement. 
              <br />
              <strong>Placez ensuite votre doigt (ou pouce) directement sur le capteur d'empreinte digitale</strong> de votre appareil 
              (ordinateur portable, smartphone, tablette, etc.).
              <br />
              Le scan se fera automatiquement dès que votre doigt sera détecté.
            </p>
            {deviceName && (
              <Alert color="info" className="mb-3">
                <MdInfo className="me-2" />
                Appareil: <strong>{deviceName}</strong>
              </Alert>
            )}
            <Alert color="warning" className="mb-3">
              <MdInfo className="me-2" />
              <strong>⚠️ Important :</strong> Si une fenêtre popup apparaît vous demandant de choisir où enregistrer votre clé d'accès, 
              <strong className="text-primary"> choisissez "Windows Hello"</strong> et non "Gestionnaire de mots de passe Google". 
              Windows Hello utilisera directement votre empreinte digitale sans créer de passkey.
            </Alert>
          </>
        )}

        {step === 'scanning' && (
          <>
            <div className="fingerprint-scan-area mb-4 scanning">
              <div className="fingerprint-icon-large scanning">
                <MdFingerprint />
              </div>
              <div className="scanning-pulse"></div>
              <p className="scan-instruction">Placez votre doigt maintenant</p>
            </div>
            <h5 className="mb-3">Scannez votre empreinte digitale</h5>
            <Alert color="warning" className="mb-3">
              <MdInfo className="me-2" />
              <strong>⚠️ Si une fenêtre popup apparaît :</strong>
              <br />
              <strong className="text-primary">Choisissez "Windows Hello"</strong> et non "Gestionnaire de mots de passe Google".
              <br />
              Windows Hello utilisera directement votre empreinte digitale sans créer de passkey.
            </Alert>
            <p className="text-muted mb-4">
              <strong>Le navigateur devrait maintenant vous demander de placer votre doigt.</strong>
              <br />
              <strong>Placez votre doigt directement sur le capteur d'empreinte digitale de votre appareil.</strong>
            </p>
            <div className="mb-3">
              <Spinner color="primary" size="lg" />
              <p className="mt-2 text-muted">En attente du scan...</p>
            </div>
            <Alert color="warning" className="mb-3">
              <MdInfo className="me-2" />
              <strong>Où trouver le capteur d'empreinte digitale ?</strong>
              <ul className="mb-0 mt-2 text-start">
                <li><strong>Ordinateur portable :</strong> Sur le côté du clavier, près du trackpad, ou sur le bouton d'alimentation</li>
                <li><strong>Smartphone/Tablette :</strong> Sur le bouton d'accueil ou à l'arrière de l'appareil</li>
                <li><strong>Si aucune fenêtre n'apparaît :</strong> Placez votre doigt directement sur le capteur - le scan se déclenchera automatiquement</li>
              </ul>
            </Alert>
            <Alert color="info">
              <MdInfo className="me-2" />
              <strong>Note :</strong> Le scan peut prendre quelques secondes. Maintenez votre doigt sur le capteur jusqu'à ce que le message de succès apparaisse.
            </Alert>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="fingerprint-icon-large mb-4 success">
              <MdCheckCircle />
            </div>
            <h5 className="mb-3 text-success">Empreinte digitale enregistrée avec succès !</h5>
            <p className="text-muted">
              Vous pouvez maintenant vous connecter avec votre empreinte digitale.
            </p>
          </>
        )}

        {step === 'error' && error && (
          <>
            <div 
              className="fingerprint-scan-area mb-4 error" 
              onClick={handleRetry}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRetry(e);
                }
              }}
              aria-label="Cliquez pour réessayer l'enregistrement"
            >
              <div className="fingerprint-icon-large error">
                <MdError />
              </div>
              <p className="scan-instruction">Cliquez pour réessayer</p>
            </div>
            <h5 className="mb-3 text-danger">Erreur lors de l'enregistrement</h5>
            <Alert color="danger">
              <MdError className="me-2" />
              {error}
            </Alert>
            <p className="text-muted mt-3">
              <strong>Cliquez sur la zone ci-dessus pour réessayer.</strong> Assurez-vous que :
              <ul className="text-start mt-2">
                <li>Votre appareil supporte l'authentification par empreinte digitale</li>
                <li>Vous avez autorisé l'accès au capteur d'empreinte</li>
                <li>Vous utilisez un navigateur compatible (Chrome, Edge, Firefox, Safari)</li>
                <li>Vous êtes sur HTTPS ou localhost</li>
              </ul>
            </p>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'ready' && (
          <Button color="secondary" onClick={handleClose}>
            Annuler
          </Button>
        )}
        {step === 'scanning' && (
          <Button color="secondary" onClick={handleClose} disabled>
            Annuler (scan en cours...)
          </Button>
        )}
        {step === 'success' && (
          <Button color="primary" onClick={handleClose}>
            Fermer
          </Button>
        )}
        {step === 'error' && (
          <>
            <Button color="secondary" onClick={handleClose}>
              Fermer
            </Button>
            <Button color="primary" onClick={handleRetry}>
              <MdFingerprint className="me-2" />
              Réessayer
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default FingerprintRegistrationModal;

