import React from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  CardBody, 
  Form, 
  FormGroup, 
  Label, 
  Input, 
  Button, 
  Alert,
  Navbar,
  NavbarBrand
} from 'reactstrap';
import { 
  MdBusiness, 
  MdEmail, 
  MdLock, 
  MdFingerprint,
  MdArrowBack,
  MdPerson
} from 'react-icons/md';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getOrganizationByDomain, getHomeUrl } from '../utils/domainMapping';
import { 
  authenticateWithFingerprint, 
  hasRegisteredFingerprints, 
  isWebAuthnSupported 
} from '../services/webauthnService';
import './LoginPage.scss';

const LoginPage = () => {
  const { login, loginWithFingerprint } = useAuth();
  const history = useHistory();
  const location = useLocation();
  
  // Récupérer les paramètres d'organisation depuis l'URL ou le domaine
  const urlParams = new URLSearchParams(location.search);
  const urlOrganizationType = urlParams.get('organization');
  const urlOrganizationId = urlParams.get('id');
  
  // Détecter l'organisation depuis le domaine
  const domainOrganization = getOrganizationByDomain();
  
  // PRIORITÉ À L'URL : Si un ID est spécifié dans l'URL, l'utiliser en priorité
  // Sinon, utiliser l'organisation du domaine
  const organizationType = urlOrganizationType || domainOrganization?.type;
  // Convertir organizationId en nombre si c'est une chaîne depuis l'URL
  // L'ID de l'URL a la priorité sur celui du domaine
  let organizationId = (urlOrganizationId ? parseInt(urlOrganizationId, 10) : null) || domainOrganization?.id;
  
  // S'assurer que organizationId est un nombre valide
  if (organizationId !== null && isNaN(organizationId)) {
    console.warn('⚠️ organizationId invalide, conversion échouée:', urlOrganizationId);
    organizationId = null;
  }
  
  // Logs de débogage pour vérifier les valeurs
  console.log('🔍 Paramètres organisation:', {
    domainOrganization,
    urlOrganizationType,
    urlOrganizationId,
    organizationType,
    organizationId,
    type_organizationId: typeof organizationId,
    priority: 'URL a la priorité sur le domaine'
  });
  
  // État pour le formulaire de connexion
  const [loginForm, setLoginForm] = React.useState({
    username: '',
    password: ''
  });
  const [loginError, setLoginError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showFingerprint, setShowFingerprint] = React.useState(false);
  const [organization, setOrganization] = React.useState(null);
  const [hasFingerprint, setHasFingerprint] = React.useState(false);
  const [isWebAuthnAvailable, setIsWebAuthnAvailable] = React.useState(false);

  // Charger les informations de l'organisation
  React.useEffect(() => {
    const loadOrganization = async () => {
      if (organizationId && organizationType) {
        try {
          const endpoint = organizationType === 'ministere' 
            ? `/api/ministeres/${organizationId}`
            : `/api/institutions/${organizationId}`;
            
          const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}`);
          const result = await response.json();
          
          if (result.success && result.data) {
            setOrganization(result.data);
          }
        } catch (err) {
          console.error('Erreur lors du chargement de l\'organisation:', err);
        }
      }
    };

    loadOrganization();
  }, [organizationId, organizationType]);

  // Vérifier si WebAuthn est disponible
  React.useEffect(() => {
    setIsWebAuthnAvailable(isWebAuthnSupported());
  }, []);

  // Vérifier si l'utilisateur a des empreintes digitales enregistrées
  React.useEffect(() => {
    const checkFingerprint = async () => {
      if (loginForm.username && isWebAuthnAvailable) {
        try {
          const hasFp = await hasRegisteredFingerprints(loginForm.username);
          setHasFingerprint(hasFp);
        } catch (error) {
          setHasFingerprint(false);
        }
      } else {
        setHasFingerprint(false);
      }
    };

    const timeoutId = setTimeout(checkFingerprint, 500); // Délai pour éviter trop de requêtes
    return () => clearTimeout(timeoutId);
  }, [loginForm.username, isWebAuthnAvailable]);

  // Debug: Afficher l'URL de l'image
  const backgroundImageUrl = `${process.env.PUBLIC_URL}/img/presi.jpg`;
  console.log('URL de l\'image d\'arrière-plan:', backgroundImageUrl);
  console.log('PUBLIC_URL:', process.env.PUBLIC_URL);

  // Fonctions pour gérer le formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Ne pas convertir le nom d'utilisateur en majuscules pour la connexion
    setLoginForm(prev => ({
      ...prev,
      [name]: value
    }));
    setLoginError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    // Logs de débogage
    console.log('🔍 Tentative de connexion:', {
      username: loginForm.username,
      organizationId,
      organizationType,
      type_organizationId: typeof organizationId,
      urlParams: {
        urlOrganizationType,
        urlOrganizationId,
        domainOrganization: domainOrganization?.id
      }
    });

    try {
      const result = await login(
        loginForm.username, 
        loginForm.password, 
        organizationId, 
        organizationType
      );
      
      if (result.success) {
        // Redirection basée sur le rôle et l'organisation
        const userRole = result.user.role;
        
        // Redirection basée sur le rôle et l'organisation
        if (userRole === 'super_admin') {
          // Les super_admin accèdent au dashboard principal sans restriction d'organisation
          history.push('/dashboard');
        } else if (userRole === 'admin' || userRole === 'DRH') {
          // Construire l'URL du dashboard avec les paramètres d'organisation
          const dashboardUrl = organizationId && organizationType 
            ? `/dashboard?organization=${organizationType}&id=${organizationId}`
            : '/dashboard';
          history.push(dashboardUrl);
        } else if (['agent', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central'].includes(userRole)) {
          // Les agents, chefs de service, directeurs, sous-directeurs, directeurs de cabinet et ministres sont redirigés vers leur tableau de bord personnel
          const agentDashboardUrl = organizationId && organizationType 
            ? `/agent-dashboard?organization=${organizationType}&id=${organizationId}`
            : '/agent-dashboard';
          console.log(`🔀 Redirection ${userRole} vers:`, agentDashboardUrl);
          history.push(agentDashboardUrl);
        } else {
          // Rediriger vers la page d'accueil de l'organisation
          const homeUrl = organizationId && organizationType 
            ? `/${organizationType}/${organizationId}`
            : '/';
          history.push(homeUrl);
        }
      } else {
        setLoginError(result.message || 'Erreur de connexion. Vérifiez vos identifiants.');
      }
      
    } catch (error) {
      setLoginError('Erreur de connexion. Vérifiez vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    if (!loginForm.username) {
      setLoginError('Veuillez entrer votre nom d\'utilisateur d\'abord');
      return;
    }

    setShowFingerprint(true);
    setIsLoading(true);
    setLoginError('');

    try {
      const result = await authenticateWithFingerprint(
        loginForm.username,
        organizationId,
        organizationType
      );

      if (result.success) {
        // Mettre à jour le token et l'utilisateur dans le contexte
        localStorage.setItem('token', result.token);
        localStorage.setItem('organization', JSON.stringify({
          id: organizationId,
          type: organizationType
        }));

        // Mettre à jour le contexte d'authentification
        await loginWithFingerprint(loginForm.username, organizationId, organizationType);

        // Redirection basée sur le rôle
        const userRole = result.user.role;
        
        if (userRole === 'super_admin') {
          history.push('/dashboard');
        } else if (userRole === 'admin' || userRole === 'DRH') {
          const dashboardUrl = organizationId && organizationType 
            ? `/dashboard?organization=${organizationType}&id=${organizationId}`
            : '/dashboard';
          history.push(dashboardUrl);
        } else if (['agent', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central'].includes(userRole)) {
          const agentDashboardUrl = organizationId && organizationType 
            ? `/agent-dashboard?organization=${organizationType}&id=${organizationId}`
            : '/agent-dashboard';
          history.push(agentDashboardUrl);
        } else {
          const homeUrl = organizationId && organizationType 
            ? `/${organizationType}/${organizationId}`
            : '/';
          history.push(homeUrl);
        }
      }
      
    } catch (error) {
      // Messages d'erreur plus spécifiques
      let errorMessage = 'Échec de l\'authentification par empreinte digitale.';
      
      if (error.message) {
        if (error.message.includes('non trouvée') || error.message.includes('aucune empreinte')) {
          errorMessage = 'Aucune empreinte digitale enregistrée pour cet utilisateur. Veuillez vous connecter avec votre mot de passe et enregistrer votre empreinte dans les Paramètres.';
        } else if (error.message.includes('annulé') || error.message.includes('refusé')) {
          errorMessage = 'Authentification annulée. Veuillez réessayer.';
        } else if (error.message.includes('non supportée')) {
          errorMessage = 'L\'authentification par empreinte digitale n\'est pas supportée sur cet appareil.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
      setShowFingerprint(false);
    }
  };

  return (
    <div 
      className="login-page"
      style={{
        backgroundImage: `linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%), url(${backgroundImageUrl})`
      }}
    >
      {/* Navbar */}
      <Navbar className="navbar-login" expand="md">
        <Container>
          <NavbarBrand 
            href={getHomeUrl()} 
            className="navbar-brand-login"
          >
            <img 
              src={organization?.logo_url || process.env.PUBLIC_URL + '/img/2ise.jpeg'} 
              alt={`Logo ${organization?.nom || domainOrganization?.name || 'Ministère'}`} 
              className="navbar-logo me-2"
              style={{ height: '40px', width: 'auto' }}
            />
            {'2ISE GROUPE' || organization?.nom || domainOrganization?.name  }
          </NavbarBrand>
          <Link 
            to={getHomeUrl()} 
            className="btn-back-home"
          >
            <MdArrowBack className="me-1" />
            Retour à l'accueil
          </Link>
        </Container>
      </Navbar>

      {/* Section principale */}
      <section className="login-section">
        <Container>
          <Row className="justify-content-center align-items-center min-vh-100">
            <Col md="6" lg="5" xl="4">
              <Card className="login-card">
                <CardBody className="p-4">
                  {/* En-tête */}
                  <div className="login-header text-center mb-4">
                    <div className="login-icon">
                      <MdBusiness />
                    </div>
                    <h2 className="login-title">Connexion</h2>
                    <p className="login-subtitle">
                      Accédez à votre espace personnel
                    </p>
                  </div>

                  {/* Messages d'erreur */}
                  {loginError && (
                    <Alert color="danger" className="mb-3">
                      {loginError}
                    </Alert>
                  )}

                  {/* Formulaire de connexion */}
                  <Form onSubmit={handleLoginSubmit}>
                    <FormGroup className="mb-3">
                      <Label for="username" className="form-label">
                        <MdPerson className="me-2" />
                        Nom d'utilisateur
                      </Label>
                      <Input
                        type="text"
                        name="username"
                        id="username"
                        placeholder="Votre nom d'utilisateur"
                        value={loginForm.username}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className="form-input"
                      />
                    </FormGroup>
                    
                    <FormGroup className="mb-4">
                      <Label for="password" className="form-label">
                        <MdLock className="me-2" />
                        Mot de passe
                      </Label>
                      <Input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Votre mot de passe"
                        value={loginForm.password}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading}
                        className="form-input"
                      />
                    </FormGroup>

                    {/* Bouton de connexion classique */}
                    <Button 
                      color="primary" 
                      type="submit" 
                      className="btn-login w-100 mb-3"
                      disabled={isLoading}
                    >
                      {isLoading && !showFingerprint ? 'Connexion...' : 'Se connecter'}
                    </Button>
                  </Form>

                  {/* Séparateur et option empreinte digitale */}
                  {isWebAuthnAvailable && (
                    <>
                      <div className="login-separator mb-3">
                        <span>ou</span>
                      </div>

                      {/* Bouton d'authentification par empreinte digitale */}
                      <Button 
                        color="outline-primary" 
                        className="btn-fingerprint w-100 mb-3"
                        onClick={handleFingerprintLogin}
                        disabled={isLoading || !loginForm.username}
                        style={{
                          borderWidth: '2px',
                          fontSize: '1rem',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MdFingerprint className="me-2" style={{ fontSize: '1.5rem' }} />
                        {isLoading && showFingerprint ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Authentification en cours...
                          </>
                        ) : (
                          'Connexion par empreinte digitale'
                        )}
                      </Button>

                      {!hasFingerprint && loginForm.username && !isLoading && (
                        <Alert color="info" className="mb-3" style={{ fontSize: '0.875rem' }}>
                          <strong>Info :</strong> Aucune empreinte digitale enregistrée pour cet utilisateur. 
                          Connectez-vous d'abord avec votre mot de passe, puis allez dans <strong>Paramètres</strong> pour enregistrer votre empreinte digitale.
                        </Alert>
                      )}

                      {!loginForm.username && (
                        <div className="text-center mb-3">
                          <small className="text-muted">
                            Entrez votre nom d'utilisateur pour activer la connexion par empreinte digitale
                          </small>
                        </div>
                      )}
                    </>
                  )}

                  {!isWebAuthnAvailable && (
                    <div className="text-center mb-3">
                      <small className="text-muted">
                        L'authentification par empreinte digitale n'est pas disponible sur cet appareil
                      </small>
                    </div>
                  )}

                  {/* Liens utiles */}
                  <div className="login-links text-center">
                    <Link to="/forgot-password" className="login-link">
                      Mot de passe oublié ?
                    </Link>
                  </div>
                </CardBody>
              </Card>

              {/* Informations supplémentaires */}
              <div className="login-info text-center mt-4">
                <p className="text-muted">
                  <small>
                    En vous connectant, vous acceptez nos conditions d'utilisation 
                    et notre politique de confidentialité.
                  </small>
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Animation d'empreinte digitale */}
      {showFingerprint && (
        <div className="fingerprint-overlay">
          <div className="fingerprint-animation">
            <MdFingerprint className="fingerprint-icon" />
            <p>Placez votre doigt sur le capteur</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
