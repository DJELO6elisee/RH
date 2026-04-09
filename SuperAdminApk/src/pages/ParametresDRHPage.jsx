import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDRHLanguage } from '../contexts/DRHLanguageContext';
import { getDRHTranslation } from '../i18n/drhTranslations';
import { getApiUrl, getAuthHeaders } from '../config/api';
import { 
  isWebAuthnSupported 
} from '../services/webauthnService';
import FingerprintRegistrationModal from '../components/WebAuthn/FingerprintRegistrationModal';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  CardTitle, 
  Row, 
  Col, 
  Form, 
  FormGroup, 
  Label, 
  Input, 
  Button, 
  Alert, 
  Spinner,
  ListGroup,
  ListGroupItem
} from 'reactstrap';
import { 
  MdSettings, 
  MdLock, 
  MdLanguage,
  MdCheckCircle,
  MdError,
  MdFingerprint,
  MdDelete,
  MdInfo
} from 'react-icons/md';

const ParametresDRHPage = () => {
  const { user } = useAuth();
  const { language, changeLanguage } = useDRHLanguage();
  const t = (key) => getDRHTranslation(language, key);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // États pour l'empreinte digitale
  const [fingerprintError, setFingerprintError] = useState(null);
  const [fingerprintSuccess, setFingerprintSuccess] = useState(null);
  const [isWebAuthnAvailable, setIsWebAuthnAvailable] = useState(false);
  const [credentials, setCredentials] = useState([]);
  const [deviceName, setDeviceName] = useState('');
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);

  // Vérifier si WebAuthn est disponible et charger les credentials
  useEffect(() => {
    setIsWebAuthnAvailable(isWebAuthnSupported());
    if (user && user.username) {
      loadCredentials();
    }
  }, [user]);

  // Charger les credentials enregistrés
  const loadCredentials = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/webauthn/credentials`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCredentials(data.data || []);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des credentials:', error);
    }
  };

  // Vérifier que l'utilisateur est DRH
  if (!user || (user.role !== 'drh' && user.role !== 'DRH' && user.role?.toLowerCase() !== 'drh')) {
    return (
      <div className="container mt-4">
        <Alert color="danger">
          <MdError className="me-2" />
          {t('parametres.accesReserve')}
        </Alert>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer les messages d'erreur/succès quand l'utilisateur tape
    if (errorMessage) setErrorMessage(null);
    if (successMessage) setSuccessMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrorMessage(t('parametres.champsRequis'));
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage(t('parametres.motsDePasseNeCorrespondentPas'));
      return;
    }

    if (formData.newPassword.length < 8) {
      setErrorMessage(t('parametres.motDePasseTropCourt'));
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setErrorMessage(t('parametres.motDePasseIdentique'));
      return;
    }

    setIsSubmitting(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || t('parametres.erreurMotDePasse'));
      }

      setSuccessMessage(data.message || t('parametres.motDePasseMisAJour'));
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    changeLanguage(newLang);
  };

  const handleOpenFingerprintModal = () => {
    if (!user || !user.username) {
      setFingerprintError('Utilisateur non connecté');
      return;
    }
    setFingerprintError(null);
    setFingerprintSuccess(null);
    setShowFingerprintModal(true);
  };

  const handleFingerprintSuccess = () => {
    setFingerprintSuccess('Empreinte digitale enregistrée avec succès ! Vous pouvez maintenant vous connecter avec votre empreinte digitale.');
    setDeviceName('');
    loadCredentials(); // Recharger la liste
  };

  const handleDeleteCredential = async (credentialId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette empreinte digitale ?')) {
      return;
    }

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/webauthn/credentials/${credentialId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      
      if (data.success) {
        setFingerprintSuccess('Empreinte digitale supprimée avec succès');
        loadCredentials();
      } else {
        setFingerprintError(data.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      setFingerprintError('Erreur lors de la suppression de l\'empreinte digitale');
    }
  };

  return (
    <div className="container-fluid mt-4">
      <Row>
        <Col>
          <Card>
            <CardHeader style={{ background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: 'white' }}>
              <CardTitle className="mb-0 d-flex align-items-center">
                <MdSettings className="me-2" style={{ fontSize: '1.5rem' }} />
                <span style={{ fontWeight: 'bold' }}>{t('parametres.titre').toUpperCase()}</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Row>
                {/* Section Changement de mot de passe */}
                <Col md="6">
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="mb-0 d-flex align-items-center">
                        <MdLock className="me-2" />
                        {t('parametres.changementMotDePasse')}
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {errorMessage && (
                        <Alert color="danger" className="d-flex align-items-center">
                          <MdError className="me-2" />
                          {errorMessage}
                        </Alert>
                      )}
                      {successMessage && (
                        <Alert color="success" className="d-flex align-items-center">
                          <MdCheckCircle className="me-2" />
                          {successMessage}
                        </Alert>
                      )}

                      <Form onSubmit={handleSubmit}>
                        <FormGroup>
                          <Label for="currentPassword">{t('parametres.motDePasseActuel')}</Label>
                          <Input
                            type="password"
                            name="currentPassword"
                            id="currentPassword"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            required
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label for="newPassword">{t('parametres.nouveauMotDePasse')}</Label>
                          <Input
                            type="password"
                            name="newPassword"
                            id="newPassword"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            required
                            minLength={8}
                          />
                        </FormGroup>

                        <FormGroup>
                          <Label for="confirmPassword">{t('parametres.confirmerMotDePasse')}</Label>
                          <Input
                            type="password"
                            name="confirmPassword"
                            id="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            minLength={8}
                          />
                        </FormGroup>

                        <Button 
                          type="submit" 
                          color="primary" 
                          disabled={isSubmitting}
                          className="w-100"
                        >
                          {isSubmitting ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              {t('parametres.changerMotDePasse')}...
                            </>
                          ) : (
                            t('parametres.changerMotDePasse')
                          )}
                        </Button>
                      </Form>
                    </CardBody>
                  </Card>
                </Col>

                {/* Section Changement de langue */}
                <Col md="6">
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="mb-0 d-flex align-items-center">
                        <MdLanguage className="me-2" />
                        {t('parametres.langue')}
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      <FormGroup>
                        <Label for="language">{t('parametres.selectionnerLangue')}</Label>
                        <Input
                          type="select"
                          name="language"
                          id="language"
                          value={language}
                          onChange={handleLanguageChange}
                        >
                          <option value="fr">{t('parametres.francais')}</option>
                          <option value="en">{t('parametres.anglais')}</option>
                          <option value="es">{t('parametres.espagnol')}</option>
                          <option value="de">{t('parametres.allemand')}</option>
                          <option value="zh">{t('parametres.chinois')}</option>
                          <option value="ru">{t('parametres.russe')}</option>
                        </Input>
                      </FormGroup>
                      <Alert color="info" className="mt-3">
                        <MdLanguage className="me-2" />
                        {t('parametres.infoLangue')}
                      </Alert>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {/* Section Empreinte digitale - Nouvelle ligne */}
              <Row>
                <Col md="12">
                  <Card>
                    <CardHeader>
                      <CardTitle className="mb-0 d-flex align-items-center">
                        <MdFingerprint className="me-2" />
                        Authentification par empreinte digitale
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {!isWebAuthnAvailable && (
                        <Alert color="warning" className="d-flex align-items-center">
                          <MdError className="me-2" />
                          L'authentification par empreinte digitale n'est pas supportée sur cet appareil ou navigateur.
                        </Alert>
                      )}

                      {isWebAuthnAvailable && (
                        <>
                          <Alert color="info" className="mb-4">
                            <MdInfo className="me-2" />
                            <strong>Deux moyens de connexion disponibles :</strong> Vous pouvez vous connecter avec votre mot de passe ou avec votre empreinte digitale. 
                            Enregistrez votre empreinte digitale ci-dessous pour activer cette fonctionnalité.
                          </Alert>

                          {fingerprintError && (
                            <Alert color="danger" className="d-flex align-items-center mb-3">
                              <MdError className="me-2" />
                              {fingerprintError}
                            </Alert>
                          )}
                          {fingerprintSuccess && (
                            <Alert color="success" className="d-flex align-items-center mb-3">
                              <MdCheckCircle className="me-2" />
                              {fingerprintSuccess}
                            </Alert>
                          )}

                          <FormGroup>
                            <Label for="deviceName">Nom de l'appareil (optionnel)</Label>
                            <Input
                              type="text"
                              id="deviceName"
                              value={deviceName}
                              onChange={(e) => setDeviceName(e.target.value)}
                              placeholder="Ex: Ordinateur portable, Smartphone, Tablette..."
                            />
                            <small className="text-muted">
                              Donnez un nom à cet appareil pour le reconnaître facilement dans la liste
                            </small>
                          </FormGroup>

                          <Button 
                            color="primary" 
                            onClick={handleOpenFingerprintModal}
                            className="mb-4"
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                          >
                            <MdFingerprint style={{ fontSize: '1.2rem' }} />
                            Enregistrer mon empreinte digitale
                          </Button>

                          <FingerprintRegistrationModal
                            isOpen={showFingerprintModal}
                            toggle={() => setShowFingerprintModal(false)}
                            username={user?.username}
                            deviceName={deviceName.trim() || `${navigator.userAgentData?.platform || 'Appareil'} - ${new Date().toLocaleDateString()}`}
                            onSuccess={handleFingerprintSuccess}
                          />

                          {credentials.length > 0 && (
                            <div className="mt-4">
                              <h6 className="mb-3">Empreintes digitales enregistrées</h6>
                              <ListGroup>
                                {credentials.map((cred) => (
                                  <ListGroupItem 
                                    key={cred.id} 
                                    className="d-flex justify-content-between align-items-center"
                                  >
                                    <div>
                                      <div className="fw-bold">
                                        <MdFingerprint className="me-2" />
                                        {cred.device_name || 'Appareil inconnu'}
                                      </div>
                                      <small className="text-muted">
                                        Enregistrée le {new Date(cred.created_at).toLocaleDateString('fr-FR', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                        {cred.last_used_at && (
                                          <> • Dernière utilisation: {new Date(cred.last_used_at).toLocaleDateString('fr-FR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</>
                                        )}
                                      </small>
                                    </div>
                                    <Button
                                      color="danger"
                                      size="sm"
                                      onClick={() => handleDeleteCredential(cred.id)}
                                      title="Supprimer cette empreinte digitale"
                                    >
                                      <MdDelete />
                                    </Button>
                                  </ListGroupItem>
                                ))}
                              </ListGroup>
                            </div>
                          )}

                          {credentials.length === 0 && (
                            <Alert color="info" className="mt-3">
                              <MdInfo className="me-2" />
                              Aucune empreinte digitale enregistrée. Cliquez sur le bouton ci-dessus pour enregistrer votre empreinte digitale 
                              et activer la connexion par empreinte.
                            </Alert>
                          )}
                        </>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ParametresDRHPage;

