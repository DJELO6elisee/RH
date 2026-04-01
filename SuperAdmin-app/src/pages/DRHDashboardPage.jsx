import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDRHLanguage } from '../contexts/DRHLanguageContext';
import { getDRHTranslation } from '../i18n/drhTranslations';
import { useLocation } from 'react-router-dom';
import { Card, CardBody, CardHeader, CardTitle, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane, Button, Alert, Spinner } from 'reactstrap';
import CreateDemandeModal from '../components/Demandes/CreateDemandeModal';
import DemandesList from '../components/Demandes/DemandesList';
import DemandeSuivi from '../components/Demandes/DemandeSuivi';
import DocumentsGenerated from '../components/Documents/DocumentsGenerated';
import NoteDeServiceViewer from '../components/Documents/NoteDeServiceViewer';
import MutationsValidationPage from './MutationsValidationPage';
import { 
  MdAssignment, 
  MdDescription, 
  MdAddCircle,
  MdInfo,
  MdArticle,
  MdSwapHoriz
} from 'react-icons/md';
import VersionChecker from '../components/VersionChecker';

const DRHDashboardPage = () => {
  const { user } = useAuth();
  const { language } = useDRHLanguage();
  const location = useLocation();
  const t = (key) => getDRHTranslation(language, key);
  
  // Récupérer le paramètre tab depuis l'URL
  const urlParams = new URLSearchParams(location.search);
  const urlTab = urlParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(urlTab || '1');
  const [activeDocumentsTab, setActiveDocumentsTab] = useState('all');
  const [showCreateDemandeModal, setShowCreateDemandeModal] = useState(false);
  const [refreshDemandesKey, setRefreshDemandesKey] = useState(0);
  const [error, setError] = useState(null);

  // Gérer le paramètre tab depuis l'URL
  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Vérifier que l'utilisateur est DRH et a un id_agent
  useEffect(() => {
    if (!user) {
      setError(t('dashboard.utilisateurNonConnecte'));
      return;
    }
    
    const isDRH = user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh';
    if (!isDRH) {
      setError(t('dashboard.accesReserve'));
      return;
    }
    
    if (!user.id_agent) {
      setError(t('dashboard.aucunAgent'));
      return;
    }
  }, [user, language]);

  const handleDemandeClick = (action, demande = null) => {
    if (action === 'create') {
      setShowCreateDemandeModal(true);
    }
  };

  const handleDemandeCreated = () => {
    setShowCreateDemandeModal(false);
    setRefreshDemandesKey(prev => prev + 1);
  };

  if (error) {
    return (
      <div className="container mt-4">
        <Alert color="danger">
          <MdInfo className="me-2" />
          {error}
        </Alert>
      </div>
    );
  }

  if (!user || !user.id_agent) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner color="primary" />
        <span className="ms-2">{t('dashboard.chargement')}</span>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      {/* Détecteur de nouvelle version */}
      <VersionChecker checkInterval={3000} />
      
      <Row>
        <Col>
          <Card>
            <CardHeader style={{ background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: 'white' }}>
              <CardTitle className="mb-0 d-flex align-items-center">
                <MdAssignment className="me-2" style={{ fontSize: '1.5rem' }} />
                <span style={{ fontWeight: 'bold' }}>{t('dashboard.espacePersonnel')}</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              {/* Navigation par onglets */}
              <Nav tabs className="mb-3">
                <NavItem>
                  <NavLink
                    className={activeTab === '1' ? 'active' : ''}
                    onClick={() => setActiveTab('1')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdAssignment className="me-1" />
                    {t('dashboard.mesDemandes')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === '2' ? 'active' : ''}
                    onClick={() => setActiveTab('2')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdAddCircle className="me-1" />
                    {t('dashboard.nouvelleDemande')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === '3' ? 'active' : ''}
                    onClick={() => setActiveTab('3')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdDescription className="me-1" />
                    {t('dashboard.mesDocuments')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === '4' ? 'active' : ''}
                    onClick={() => setActiveTab('4')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdArticle className="me-1" />
                    Notes de Service
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === '5' ? 'active' : ''}
                    onClick={() => setActiveTab('5')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdSwapHoriz className="me-1" />
                    Validation Mutations
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === '6' ? 'active' : ''}
                    onClick={() => setActiveTab('6')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdDescription className="me-1" />
                    Documents Générés
                  </NavLink>
                </NavItem>
              </Nav>

              <TabContent activeTab={activeTab}>
                {/* Onglet 1: Mes Demandes */}
                <TabPane tabId="1">
                  <Row>
                    <Col>
                      <Card>
                        <CardHeader>
                          <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                            <span>
                              <MdAssignment className="me-2" />
                              {t('dashboard.mesDemandes')}
                            </span>
                            <Button 
                              color="primary" 
                              size="sm"
                              onClick={() => {
                                setActiveTab('2');
                                setShowCreateDemandeModal(true);
                              }}
                            >
                              <MdAddCircle className="me-1" />
                              {t('dashboard.nouvelleDemandeBtn')}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <DemandeSuivi
                            key={refreshDemandesKey}
                            agentId={user.id_agent}
                            onDemandeClick={handleDemandeClick}
                          />
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                {/* Onglet 2: Nouvelle Demande */}
                <TabPane tabId="2">
                  <Row>
                    <Col>
                      <Card>
                        <CardHeader>
                          <CardTitle className="mb-0">
                            <MdAddCircle className="me-2" />
                            {t('dashboard.creerNouvelleDemande')}
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <Alert color="info">
                            <MdInfo className="me-2" />
                            {t('dashboard.remplirFormulaire')}
                          </Alert>
                          <div className="text-center py-4">
                            <Button 
                              color="primary" 
                              size="lg"
                              onClick={() => setShowCreateDemandeModal(true)}
                            >
                              <MdAddCircle className="me-2" />
                              {t('dashboard.ouvrirFormulaire')}
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                {/* Onglet 3: Mes Documents */}
                <TabPane tabId="3">
                  <Row>
                    <Col>
                      <Card>
                        <CardHeader>
                          <CardTitle className="mb-0">
                            <MdDescription className="me-2" />
                            {t('dashboard.mesDocuments')}
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <DocumentsGenerated forceAgentView={true} />
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                {/* Onglet 4: Notes de Service */}
                <TabPane tabId="4">
                  <Row>
                    <Col>
                      <NoteDeServiceViewer />
                    </Col>
                  </Row>
                </TabPane>

                {/* Onglet 5: Validation des Mutations */}
                <TabPane tabId="5">
                  <MutationsValidationPage />
                </TabPane>

                {/* Onglet 6: Documents Générés */}
                <TabPane tabId="6">
                  <Row>
                    <Col>
                      <Card>
                        <CardHeader>
                          <CardTitle className="mb-0">
                            <MdDescription className="me-2" />
                            Documents Générés
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <Nav tabs className="mb-3">
                            <NavItem>
                              <NavLink
                                className={activeDocumentsTab === 'all' ? 'active' : ''}
                                onClick={() => setActiveDocumentsTab('all')}
                                style={{ cursor: 'pointer' }}
                              >
                                Tous les documents
                              </NavLink>
                            </NavItem>
                            <NavItem>
                              <NavLink
                                className={activeDocumentsTab === 'mutation' ? 'active' : ''}
                                onClick={() => setActiveDocumentsTab('mutation')}
                                style={{ cursor: 'pointer' }}
                              >
                                <MdSwapHoriz className="me-1" />
                                Mutations
                              </NavLink>
                            </NavItem>
                          </Nav>
                          {activeDocumentsTab === 'all' ? (
                            <DocumentsGenerated typeDemande="" />
                          ) : (
                            <DocumentsGenerated typeDemande="mutation" />
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Modal de création de demande */}
      <CreateDemandeModal
        isOpen={showCreateDemandeModal}
        toggle={() => {
          setShowCreateDemandeModal(false);
          if (activeTab === '2') {
            // Si on ferme le modal depuis l'onglet "Nouvelle Demande", revenir à l'onglet "Mes Demandes"
            setActiveTab('1');
          }
        }}
        onDemandeCreated={handleDemandeCreated}
        agentId={user.id_agent}
      />
    </div>
  );
};

export default DRHDashboardPage;

