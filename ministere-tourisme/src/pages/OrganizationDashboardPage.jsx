import React, { useState, useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, CardHeader, CardTitle, Row, Col, Badge, Alert, Spinner, Button, Table, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import BirthdaysDetailsModal from '../components/Anniversaires/BirthdaysDetailsModal';
import BirthdaysMessageModal from '../components/Anniversaires/BirthdaysMessageModal';
import { getApiUrl, getAuthHeaders } from '../config/api';
import { 
  MdBusiness, 
  MdPeople, 
  MdTrendingUp, 
  MdCheckCircle,
  MdWarning,
  MdInfo,
  MdAccountBalance,
  MdWork,
  MdSchool,
  MdCake,
  MdMessage,
  MdVisibility,
  MdEvent,
  MdCalendarToday
} from 'react-icons/md';

const OrganizationDashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const history = useHistory();
  const [organizationData, setOrganizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(false);
  
  // États pour les modals
  const [detailsModalToday, setDetailsModalToday] = useState(false);
  const [detailsModalUpcoming, setDetailsModalUpcoming] = useState(false);
  const [messageModalToday, setMessageModalToday] = useState(false);
  const [messageModalUpcoming, setMessageModalUpcoming] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  

  // États pour les congés prévisionnels
  const [congesAgents, setCongesAgents] = useState([]);
  const [congesLoading, setCongesLoading] = useState(false);
  const [selectedCongesPeriod, setSelectedCongesPeriod] = useState(null);
  const [showCongesModal, setShowCongesModal] = useState(false);

  // États pour les agents actuellement en congés
  const [agentsEnConges, setAgentsEnConges] = useState(null);
  const [agentsEnCongesLoading, setAgentsEnCongesLoading] = useState(false);
  const [showAgentsEnCongesModal, setShowAgentsEnCongesModal] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(null);

  // Récupérer les paramètres d'organisation depuis l'URL
  const urlParams = new URLSearchParams(location.search);
  const urlOrganizationType = urlParams.get('organization');
  const urlOrganizationId = urlParams.get('id');

  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Déterminer le type d'organisation et l'ID
        let organizationType, organizationId;
        
        // Les super_admin peuvent voir toutes les données sans restriction d'organisation
        if (user && user.role === 'super_admin') {
          // Pour les super_admin, charger les statistiques globales
          organizationType = null;
          organizationId = null;
        } else {
          // Priorité aux paramètres URL, puis aux données utilisateur
          if (urlOrganizationType && urlOrganizationId) {
            organizationType = urlOrganizationType;
            organizationId = urlOrganizationId;
          } else if (user && user.organization) {
            organizationType = user.organization.type;
            organizationId = user.organization.id;
          } else {
            setError('Organisation non définie');
            return;
          }
        }

        // Charger les données spécifiques à l'organisation ou les statistiques globales
        let endpoint;
        if (organizationType === 'ministere') {
          endpoint = `/api/ministeres/${organizationId}`;
        } else if (organizationType === 'institution') {
          endpoint = `/api/institutions/${organizationId}`;
        } else {
          // Pour les super_admin, charger les statistiques globales
          endpoint = `/api/ministeres/stats/global`;
        }
          
        const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          // Pour les ministères, extraire les données du ministère et les statistiques
          if (organizationType === 'ministere') {
            setOrganizationData({
              ...result.data.ministere,
              ...result.data.statistiques
            });
          } else {
            // Pour les institutions, utiliser les données directement
            setOrganizationData(result.data);
          }
        } else {
          setError('Erreur lors du chargement des données de l\'organisation');
        }
      } catch (err) {
        setError('Erreur de connexion au serveur');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadOrganizationData();
    }
  }, [user, urlOrganizationType, urlOrganizationId]);

  // Charger les anniversaires à venir
  useEffect(() => {
    const loadBirthdays = async () => {
      try {
        setBirthdaysLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('https://tourisme.2ise-groupe.com/api/agents/upcoming-birthdays?days=30', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          setBirthdays(result.data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des anniversaires:', err);
      } finally {
        setBirthdaysLoading(false);
      }
    };

    if (user) {
      loadBirthdays();
      // Recharger les anniversaires toutes les heures
      const interval = setInterval(loadBirthdays, 3600000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Charger les agents en congés prévisionnels
  useEffect(() => {
    const loadCongesAgents = async () => {
      try {
        setCongesLoading(true);
        const apiUrl = getApiUrl();
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        
        // Charger pour l'année en cours et l'année suivante
        const responses = await Promise.all([
          fetch(`${apiUrl}/api/planning-previsionnel/annee/${currentYear}`, {
            headers: getAuthHeaders()
          }),
          fetch(`${apiUrl}/api/planning-previsionnel/annee/${nextYear}`, {
            headers: getAuthHeaders()
          })
        ]);

        const results = await Promise.all(responses.map(r => r.json()));
        let allAgents = [];
        
        results.forEach(result => {
          if (result.success && result.data) {
            allAgents = [...allAgents, ...result.data];
          }
        });

        setCongesAgents(allAgents);
      } catch (err) {
        console.error('Erreur lors du chargement des congés prévisionnels:', err);
      } finally {
        setCongesLoading(false);
      }
    };

    if (user) {
      loadCongesAgents();
      // Recharger toutes les heures
      const interval = setInterval(loadCongesAgents, 3600000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Charger les agents actuellement en congés
  useEffect(() => {
    const loadAgentsEnConges = async () => {
      try {
        setAgentsEnCongesLoading(true);
        const apiUrl = getApiUrl();
        const currentYear = new Date().getFullYear();
        
        const response = await fetch(`${apiUrl}/api/planning-previsionnel/rapport-organisation/${currentYear}`, {
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setAgentsEnConges(result.data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des agents en congés:', err);
      } finally {
        setAgentsEnCongesLoading(false);
      }
    };

    if (user) {
      loadAgentsEnConges();
      // Recharger toutes les heures
      const interval = setInterval(loadAgentsEnConges, 3600000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner color="primary" />
        <span className="ms-2">Chargement des données...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="danger">
        <MdWarning className="me-2" />
        {error}
      </Alert>
    );
  }

  if (!organizationData) {
    return (
      <Alert color="warning">
        <MdInfo className="me-2" />
        Aucune donnée d'organisation disponible
      </Alert>
    );
  }

  const isMinistry = (urlOrganizationType || user?.organization?.type) === 'ministere';
  const organizationName = organizationData.nom || organizationData.libelle;
  const organizationCode = organizationData.code;

  // Fonctions de navigation
  const handleNavigateToAgents = () => {
    history.push('/agents');
  };

  const handleNavigateToEntites = () => {
    history.push('/entites');
  };

  const handleNavigateToServices = () => {
    history.push('/services');
  };

  const handleNavigateToDirections = () => {
    history.push('/directions');
  };


  // Grouper les agents en congés par période
  const groupCongesByPeriod = () => {
    if (!congesAgents || congesAgents.length === 0) return {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const groups = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      thisMonth: [],
      nextMonth: [],
      later: []
    };

    congesAgents.forEach(agent => {
      if (!agent.date_depart_conges) return;
      
      const departDate = new Date(agent.date_depart_conges);
      departDate.setHours(0, 0, 0, 0);
      
      const diffTime = departDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.floor(diffDays / 30);

      if (diffDays < 0) {
        // Date passée, ignorer
        return;
      } else if (diffDays === 0) {
        groups.today.push(agent);
      } else if (diffDays === 1) {
        groups.tomorrow.push(agent);
      } else if (diffDays <= 7) {
        groups.thisWeek.push(agent);
      } else if (diffDays <= 14) {
        groups.nextWeek.push(agent);
      } else if (diffMonths === 0) {
        groups.thisMonth.push(agent);
      } else if (diffMonths === 1) {
        groups.nextMonth.push(agent);
      } else {
        groups.later.push(agent);
      }
    });

    return groups;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  const getPeriodLabel = (period) => {
    const labels = {
      today: "Aujourd'hui",
      tomorrow: "Demain",
      thisWeek: "Cette semaine (dans 2-7 jours)",
      nextWeek: "Semaine prochaine (dans 8-14 jours)",
      thisMonth: "Ce mois (dans 15-30 jours)",
      nextMonth: "Le mois prochain (dans 1 mois)",
      later: "Plus tard (dans plus d'1 mois)"
    };
    return labels[period] || period;
  };

  return (
    <div className="organization-dashboard flag-background">
      <style jsx>{`
        .clickable-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        .clickable-card {
          transition: all 0.3s ease;
        }
      `}</style>
      {/* En-tête du dashboard */}
      <div className="dashboard-header mb-4 fade-in-up">
        <Row>
          <Col>
            <h1 className="h3 mb-1" style={{ fontWeight: 'bold' }}>
              <MdBusiness className="me-2" />
              TABLEAU DE BORD DU DIRECTEUR DES RESSOURCES HUMAINES{isMinistry ? '' : ' INSTITUTION'}
            </h1>
            <p className="text-muted mb-0">
              Bienvenue Dans Votre Espace De Gestion - {organizationName}
            </p>
          </Col>
          <Col xs="auto">
            <Badge color="primary" className="fs-6">
              {user?.role || 'Utilisateur'}
            </Badge>
          </Col>
        </Row>
      </div>

      {/* Statistiques principales */}
      <Row className="mb-4">
        {(() => {
          const total_agents = parseInt(organizationData.nombre_agents || organizationData.total_agents || 0);
          const hommes = parseInt(organizationData.hommes || 0);
          const femmes = parseInt(organizationData.femmes || 0);
          
          const foncHommes = parseInt(organizationData.fonctionnaires_hommes) || 0;
          const foncFemmes = parseInt(organizationData.fonctionnaires_femmes) || 0;
          const foncTotal = foncHommes + foncFemmes;
          
          const art18Hommes = parseInt(organizationData.articles_18_hommes) || 0;
          const art18Femmes = parseInt(organizationData.articles_18_femmes) || 0;
          const art18Total = art18Hommes + art18Femmes;
          
          const bnetdHommes = parseInt(organizationData.bnetd_hommes) || 0;
          const bnetdFemmes = parseInt(organizationData.bnetd_femmes) || 0;
          const bnetdTotal = bnetdHommes + bnetdFemmes;
          
          const contrHommes = parseInt(organizationData.contractuels_hommes) || 0;
          const contrFemmes = parseInt(organizationData.contractuels_femmes) || 0;
          const contrTotal = contrHommes + contrFemmes;
          
          const total_services = parseInt(organizationData.nombre_services || organizationData.total_services || 0);
          const total_directions = parseInt(organizationData.nombre_directions || organizationData.total_directions || 0);

          const cards = [
            { label: 'Total agents', value: total_agents, icon: <MdPeople style={{ color: '#4a90d9' }}/>, color: '#4a90d9', onClick: handleNavigateToAgents },
            { label: 'Hommes', value: hommes, sub: total_agents ? `${Math.round(hommes * 100 / total_agents)}%` : '0%', icon: <span style={{ fontSize: 24, fontWeight: 'bold' }}>H</span>, color: '#3b82f6', onClick: handleNavigateToAgents },
            { label: 'Femmes', value: femmes, sub: total_agents ? `${Math.round(femmes * 100 / total_agents)}%` : '0%', icon: <span style={{ fontSize: 24, fontWeight: 'bold' }}>F</span>, color: '#ec4899', onClick: handleNavigateToAgents },
            { 
              label: 'Fonctionnaires', 
              value: foncTotal, 
              sub: total_agents ? `${Math.round(foncTotal * 100 / total_agents)}%` : '0%', 
              sub2: `Hommes ${foncHommes} (${foncTotal ? Math.round(foncHommes * 100 / foncTotal) : 0}%) • Femmes ${foncFemmes} (${foncTotal ? Math.round(foncFemmes * 100 / foncTotal) : 0}%)`,
              icon: '✅', 
              color: '#22c55e',
              onClick: handleNavigateToAgents
            },
            { 
              label: 'Contractuels', 
              value: contrTotal, 
              sub: total_agents ? `${Math.round(contrTotal * 100 / total_agents)}%` : '0%', 
              sub2: `Hommes ${contrHommes} (${contrTotal ? Math.round(contrHommes * 100 / contrTotal) : 0}%) • Femmes ${contrFemmes} (${contrTotal ? Math.round(contrFemmes * 100 / contrTotal) : 0}%)`,
              icon: '🤝', 
              color: '#f59e0b',
              onClick: handleNavigateToAgents
            },
            { 
              label: 'Articles 18', 
              value: art18Total, 
              sub: total_agents ? `${Math.round(art18Total * 100 / total_agents)}%` : '0%', 
              sub2: `Hommes ${art18Hommes} (${art18Total ? Math.round(art18Hommes * 100 / art18Total) : 0}%) • Femmes ${art18Femmes} (${art18Total ? Math.round(art18Femmes * 100 / art18Total) : 0}%)`,
              icon: '📄', 
              color: '#8b5cf6',
              onClick: handleNavigateToAgents
            },
            { 
              label: 'BNETD', 
              value: bnetdTotal, 
              sub: total_agents ? `${Math.round(bnetdTotal * 100 / total_agents)}%` : '0%', 
              sub2: `Hommes ${bnetdHommes} (${bnetdTotal ? Math.round(bnetdHommes * 100 / bnetdTotal) : 0}%) • Femmes ${bnetdFemmes} (${bnetdTotal ? Math.round(bnetdFemmes * 100 / bnetdTotal) : 0}%)`,
              icon: '🏗️', 
              color: '#0ea5e9',
              onClick: handleNavigateToAgents
            },
            { label: 'Directions', value: total_directions, icon: <MdBusiness style={{ color: '#0ea5e9' }}/>, color: '#0ea5e9', onClick: handleNavigateToDirections },
            { label: 'Services', value: total_services, icon: <MdAccountBalance style={{ color: '#22c55e' }}/>, color: '#22c55e', onClick: handleNavigateToServices }
          ];

          return cards.map((card, i) => (
            <Col key={i} xs={12} sm={6} md={4} lg={3} style={{ marginBottom: 16 }}>
              <div 
                className="clickable-card"
                onClick={card.onClick}
                style={{
                  background: '#fff', borderRadius: 10, padding: '16px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `4px solid ${card.color}`,
                  cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#1a2340', lineHeight: 1.2 }}>{card.value}</div>
                <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                  {card.label}
                  {card.sub && <span style={{ marginLeft: 8, color: card.color, fontWeight: 600 }}>{card.sub}</span>}
                </div>
                {card.sub2 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                    {card.sub2}
                  </div>
                )}
              </div>
            </Col>
          ));
        })()}
      </Row>

      {/* Informations de l'organisation */}
      <Row>
        <Col md="8">
          <Card className="info-card fade-in-up">
            <CardHeader>
              <CardTitle style={{ fontWeight: 'bold' }}>
                <MdBusiness className="me-2" />
                INFORMATIONS {isMinistry ? 'DU MINISTÈRE' : 'DE L\'INSTITUTION'}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Row>
                <Col md="6">
                  <p><strong>Nom :</strong> {organizationName}</p>
                  {organizationData.sigle && (
                    <p><strong>Sigle :</strong> {organizationData.sigle}</p>
                  )}
                </Col>
                <Col md="6">
                  {organizationData.adresse && (
                    <p><strong>Adresse :</strong> {organizationData.adresse}</p>
                  )}
                  {organizationData.telephone && (
                    <p><strong>Téléphone :</strong> {organizationData.telephone}</p>
                  )}
                  {organizationData.email && (
                    <p><strong>Email :</strong> {organizationData.email}</p>
                  )}
                </Col>
              </Row>
              {/* {organizationData.description && (
                <div className="mt-3">
                  <p><strong>Description :</strong></p>
                  <p className="text-muted">{organizationData.description}</p>
                </div>
              )} */}
            </CardBody>
          </Card>
        </Col>
        <Col md="4">
          <Card className="status-card fade-in-up">
            <CardHeader>
              <CardTitle style={{ fontWeight: 'bold' }}>
                <MdCheckCircle className="me-2" />
                STATUT
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-center">
                <Badge 
                  color={organizationData.is_active ? 'success' : 'danger'} 
                  className="status-badge"
                >
                  {organizationData.is_active ? 'Actif' : 'Inactif'}
                </Badge>
                <p className="status-text">
                  {isMinistry ? 'Ministère' : 'Institution'} 
                  {organizationData.is_active ? ' Opérationnel' : ' Suspendu'}
                </p>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Section Anniversaires */}
      {birthdays.length > 0 && (() => {
        // Séparer les anniversaires d'aujourd'hui et ceux à venir
        const anniversairesAujourdhui = birthdays.filter(agent => parseInt(agent.jours_restants) === 0);
        const anniversairesAVenir = birthdays.filter(agent => parseInt(agent.jours_restants) > 0);

        return (
          <>
            {/* Section Anniversaires d'aujourd'hui */}
            {anniversairesAujourdhui.length > 0 && (
              <Row className="mt-4">
                <Col>
                  <Card className="birthdays-card fade-in-up">
                    <CardHeader style={{ background: '#007bff', color: 'white' }}>
                      <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <MdCake className="me-2" style={{ fontSize: '1.5rem' }} />
                          <span style={{ fontWeight: 'bold' }}>🎂 ANNIVERSAIRES D'AUJOURD'HUI ({anniversairesAujourdhui.length})</span>
                        </div>
                        <div>
                          <Button 
                            color="light" 
                            size="sm" 
                            className="me-2"
                            onClick={() => setDetailsModalToday(true)}
                          >
                            <MdVisibility className="me-1" />
                            Voir les détails
                          </Button>
                          <Button 
                            color="info" 
                            size="sm"
                            onClick={() => setMessageModalToday(true)}
                          >
                            <MdMessage className="me-1" />
                            Envoi de message
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {birthdaysLoading ? (
                        <div className="text-center py-3">
                          <Spinner size="sm" color="primary" />
                          <span className="ms-2">Chargement...</span>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <h4 className="text-muted">{anniversairesAujourdhui.length} agent(s) fête(nt) leur anniversaire aujourd'hui</h4>
                          <p className="text-muted mt-2">Cliquez sur "Voir les détails" pour voir la liste complète ou "Envoi de message" pour envoyer un message de félicitations</p>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Section Anniversaires à venir */}
            {anniversairesAVenir.length > 0 && (
              <Row className="mt-4">
                <Col>
                  <Card className="birthdays-card fade-in-up">
                    <CardHeader style={{ background: '#495057', color: 'white' }}>
                      <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <MdCake className="me-2" style={{ fontSize: '1.5rem' }} />
                          <span style={{ fontWeight: 'bold' }}>🎉 ANNIVERSAIRES À VENIR ({anniversairesAVenir.length})</span>
                        </div>
                        <div>
                          <Button 
                            color="light" 
                            size="sm" 
                            className="me-2"
                            onClick={() => setDetailsModalUpcoming(true)}
                          >
                            <MdVisibility className="me-1" />
                            Voir les détails
                          </Button>
                          <Button 
                            color="info" 
                            size="sm"
                            onClick={() => setMessageModalUpcoming(true)}
                          >
                            <MdMessage className="me-1" />
                            Envoi de message
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardBody>
                      {birthdaysLoading ? (
                        <div className="text-center py-3">
                          <Spinner size="sm" color="primary" />
                          <span className="ms-2">Chargement...</span>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <h4 className="text-muted">{anniversairesAVenir.length} agents fêtent leur anniversaire dans les prochains jours</h4>
                          <p className="text-muted mt-2">Cliquez sur "Voir les détails" pour voir la liste complète ou "Envoi de message" pour envoyer un message de rappel</p>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        );
      })()}

      {/* Section Agents actuellement en congés */}
      <Row className="mt-4">
        <Col>
          <Card className="fade-in-up">
            <CardHeader style={{ background: '#007bff', color: 'white' }}>
              <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center">
                  <MdWork className="me-2" style={{ fontSize: '1.5rem' }} />
                  <span style={{ fontWeight: 'bold' }}>👥 AGENTS EN CESSATION DE SERVICE</span>
                </div>
                {agentsEnConges && Object.keys(agentsEnConges).length > 0 && (
                  <Button 
                    color="light" 
                    size="sm"
                    onClick={() => setShowAgentsEnCongesModal(true)}
                  >
                    <MdVisibility className="me-1" />
                    Voir tous les détails
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {agentsEnCongesLoading ? (
                <div className="text-center py-3">
                  <Spinner size="sm" color="primary" />
                  <span className="ms-2">Chargement...</span>
                </div>
              ) : !agentsEnConges || Object.keys(agentsEnConges).length === 0 ? (
                <Alert color="info" className="mb-0">
                  <MdInfo className="me-2" />
                  Aucun agent en cessation de service
                </Alert>
              ) : (
                <Row>
                  {Object.values(agentsEnConges).slice(0, 6).map((direction, dirIndex) => (
                    <Col md="6" lg="4" key={dirIndex} className="mb-3">
                      <Card 
                        className="h-100 clickable-card" 
                        style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                        onClick={() => {
                          setSelectedStructure({ type: 'direction', data: direction, label: direction.libelle });
                          setShowAgentsEnCongesModal(true);
                        }}
                      >
                        <CardBody>
                          <h6 className="mb-2" style={{ color: '#212529', fontWeight: 'bold' }}>
                            {direction.libelle}
                          </h6>
                          {Object.values(direction.sous_directions).slice(0, 2).map((sousDirection, sdIndex) => {
                            const totalAgents = Object.values(sousDirection.services).reduce(
                              (sum, service) => sum + service.agents.length, 0
                            );
                            const totalRetards = Object.values(sousDirection.services).reduce(
                              (sum, service) => sum + service.agents.filter(a => a.en_retard_reprise).length, 0
                            );
                            return (
                              <div key={sdIndex} className="mb-2" style={{ fontSize: '0.9rem' }}>
                                <div style={{ color: '#495057', fontWeight: '600' }}>
                                  {sousDirection.libelle}
                                </div>
                                <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                                  {totalAgents} agent{totalAgents > 1 ? 's' : ''} en cessation de service
                                  {totalRetards > 0 && (
                                    <span style={{ color: '#dc3545', fontWeight: 'bold', marginLeft: '5px' }}>
                                      (dont {totalRetards} en retard de reprise)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {Object.values(direction.sous_directions).length > 2 && (
                            <div style={{ color: '#6c757d', fontSize: '0.85rem', fontStyle: 'italic' }}>
                              + {Object.values(direction.sous_directions).length - 2} autre(s) sous-direction(s)
                            </div>
                          )}
                          <div className="mt-2 pt-2" style={{ borderTop: '1px solid #e0e0e0' }}>
                            <Badge color="primary" style={{ fontSize: '0.9rem' }}>
                              {Object.values(direction.sous_directions).reduce(
                                (sum, sd) => sum + Object.values(sd.services).reduce(
                                  (s, svc) => s + svc.agents.length, 0
                                ), 0
                              )} agent{Object.values(direction.sous_directions).reduce(
                                (sum, sd) => sum + Object.values(sd.services).reduce(
                                  (s, svc) => s + svc.agents.length, 0
                                ), 0
                              ) > 1 ? 's' : ''} au total
                            </Badge>
                          </div>
                        </CardBody>
                      </Card>
                    </Col>
                  ))}
                  {Object.keys(agentsEnConges).length > 6 && (
                    <Col md="12" className="text-center mt-3">
                      <Button 
                        color="primary" 
                        onClick={() => setShowAgentsEnCongesModal(true)}
                      >
                        Voir toutes les directions ({Object.keys(agentsEnConges).length} au total)
                      </Button>
                    </Col>
                  )}
                </Row>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Section Congés prévisionnels */}
      {(() => {
        const congesGroups = groupCongesByPeriod();
        const hasConges = Object.values(congesGroups).some(group => group.length > 0);

        if (!hasConges && !congesLoading) return null;

        return (
          <Row className="mt-4">
            <Col>
              <Card className="fade-in-up">
                <CardHeader style={{ background: '#28a745', color: 'white' }}>
                  <CardTitle className="mb-0 d-flex align-items-center">
                    <MdCalendarToday className="me-2" style={{ fontSize: '1.5rem' }} />
                    <span style={{ fontWeight: 'bold' }}>📅 DÉPARTS EN CONGÉS PRÉVISIONNELS</span>
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  {congesLoading ? (
                    <div className="text-center py-3">
                      <Spinner size="sm" color="primary" />
                      <span className="ms-2">Chargement...</span>
                    </div>
                  ) : !hasConges ? (
                    <Alert color="info" className="mb-0">
                      <MdInfo className="me-2" />
                      Aucun départ en congés programmé pour le moment
                    </Alert>
                  ) : (
                    <Row>
                      {Object.entries(congesGroups).map(([period, agents]) => {
                        if (agents.length === 0) return null;
                        return (
                          <Col md="6" lg="4" key={period} className="mb-3">
                            <Card 
                              className="h-100 clickable-card" 
                              style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                              onClick={() => {
                                setSelectedCongesPeriod({ period, agents, label: getPeriodLabel(period) });
                                setShowCongesModal(true);
                              }}
                            >
                              <CardBody className="text-center">
                                <MdEvent className="mb-2" style={{ fontSize: '2rem', color: '#28a745' }} />
                                <h5 className="mb-2">{getPeriodLabel(period)}</h5>
                                <Badge color="success" style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}>
                                  {agents.length} agent{agents.length > 1 ? 's' : ''}
                                </Badge>
                                <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
                                  Cliquez pour voir les détails
                                </p>
                              </CardBody>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>
        );
      })()}


      {/* Message de bienvenue personnalisé */}
      <Row className="mt-4">
        <Col>
          <Alert className="alert-ivory fade-in-up">
            <MdInfo className="me-2" />
            <strong>Bienvenue {user?.nom || user?.username} !</strong><br />
            Vous êtes connecté en tant que <strong>{user?.role}</strong> du {isMinistry ? 'Ministère' : 'Institution'} <strong>{organizationName}</strong>.
            Vous pouvez maintenant accéder à toutes les fonctionnalités de gestion des ressources humaines.
          </Alert>
        </Col>
      </Row>

      {/* Modals pour les anniversaires */}
      {birthdays.length > 0 && (() => {
        const anniversairesAujourdhui = birthdays.filter(agent => parseInt(agent.jours_restants) === 0);
        const anniversairesAVenir = birthdays.filter(agent => parseInt(agent.jours_restants) > 0);

        return (
          <>
            {/* Modal détails anniversaires d'aujourd'hui */}
            <BirthdaysDetailsModal
              isOpen={detailsModalToday}
              toggle={() => setDetailsModalToday(false)}
              agents={anniversairesAujourdhui}
              title={`🎂 Anniversaires d'aujourd'hui (${anniversairesAujourdhui.length})`}
              type="today"
            />

            {/* Modal détails anniversaires à venir */}
            <BirthdaysDetailsModal
              isOpen={detailsModalUpcoming}
              toggle={() => setDetailsModalUpcoming(false)}
              agents={anniversairesAVenir}
              title={`🎉 Anniversaires à venir (${anniversairesAVenir.length})`}
              type="upcoming"
            />

            {/* Modal message anniversaires d'aujourd'hui */}
            <BirthdaysMessageModal
              isOpen={messageModalToday}
              toggle={() => setMessageModalToday(false)}
              agents={anniversairesAujourdhui}
              title={`Anniversaires d'aujourd'hui (${anniversairesAujourdhui.length})`}
              type="today"
            />

            {/* Modal message anniversaires à venir */}
            <BirthdaysMessageModal
              isOpen={messageModalUpcoming}
              toggle={() => setMessageModalUpcoming(false)}
              agents={anniversairesAVenir}
              title={`Anniversaires à venir (${anniversairesAVenir.length})`}
              type="upcoming"
            />
          </>
        );
      })()}


      {/* Modal détails des congés par période */}
      <Modal isOpen={showCongesModal} toggle={() => setShowCongesModal(false)} size="lg">
        <ModalHeader toggle={() => setShowCongesModal(false)}>
          <MdCalendarToday className="me-2" />
          Départs en congés - {selectedCongesPeriod?.label}
        </ModalHeader>
        <ModalBody>
          {selectedCongesPeriod && selectedCongesPeriod.agents.length > 0 ? (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Matricule</th>
                  <th>Nom</th>
                  <th>Prénoms</th>
                  <th>Direction</th>
                  <th>Sous-direction</th>
                  <th>Date de départ</th>
                </tr>
              </thead>
              <tbody>
                {selectedCongesPeriod.agents.map((agent) => (
                  <tr key={`${agent.id_agent}-${agent.annee}`}>
                    <td>{agent.matricule || '-'}</td>
                    <td>{agent.nom || '-'}</td>
                    <td>{agent.prenom || '-'}</td>
                    <td>{agent.direction_libelle || '-'}</td>
                    <td>{agent.sous_direction_libelle || '-'}</td>
                    <td>
                      <Badge color="primary">
                        {formatDate(agent.date_depart_conges)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert color="info">
              Aucun agent dans cette période
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowCongesModal(false)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>

      {/* Modal détails des agents en congés */}
      <Modal isOpen={showAgentsEnCongesModal} toggle={() => setShowAgentsEnCongesModal(false)} size="xl">
        <ModalHeader toggle={() => setShowAgentsEnCongesModal(false)}>
          <MdWork className="me-2" />
          Agents en cessation de service
        </ModalHeader>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {agentsEnConges && Object.keys(agentsEnConges).length > 0 ? (
            <div>
              {Object.values(agentsEnConges).map((direction, dirIndex) => (
                <div key={dirIndex} className="mb-4">
                  <h5 className="mb-3" style={{ color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #007bff', paddingBottom: '0.5rem' }}>
                    Direction: {direction.libelle}
                  </h5>
                  {Object.values(direction.sous_directions).map((sousDirection, sdIndex) => (
                    <div key={sdIndex} className="mb-3 ms-3">
                      <h6 className="mb-2" style={{ color: '#495057', fontWeight: 'bold' }}>
                        Sous-direction: {sousDirection.libelle}
                      </h6>
                      {Object.values(sousDirection.services).map((service, svcIndex) => {
                        if (service.agents.length === 0) return null;
                        return (
                          <div key={svcIndex} className="mb-2 ms-3">
                            <div className="mb-2" style={{ fontWeight: '600', color: '#6c757d' }}>
                              Service: {service.libelle} ({service.agents.length} agent{service.agents.length > 1 ? 's' : ''})
                            </div>
                            <Table striped hover responsive size="sm" className="ms-4">
                              <thead>
                                <tr>
                                  <th>Matricule</th>
                                  <th>Nom</th>
                                  <th>Prénoms</th>
                                  <th>Date de début</th>
                                  <th>Date de fin</th>
                                  <th>Rôle</th>
                                </tr>
                              </thead>
                              <tbody>
                                {service.agents.map((agent, agentIndex) => (
                                  <tr key={agentIndex} style={agent.en_retard_reprise ? { backgroundColor: '#fff5f5' } : {}}>
                                    <td>{agent.matricule || '-'}</td>
                                    <td>{agent.nom || '-'}</td>
                                    <td>{agent.prenom || '-'}</td>
                                    <td>
                                      <Badge color="primary">
                                        {agent.date_debut ? new Date(agent.date_debut).toLocaleDateString('fr-FR') : '-'}
                                      </Badge>
                                    </td>
                                    <td>
                                      <Badge color={agent.en_retard_reprise ? 'danger' : 'primary'}>
                                        {agent.date_fin ? new Date(agent.date_fin).toLocaleDateString('fr-FR') : 'En cours'}
                                      </Badge>
                                      {agent.en_retard_reprise && (
                                        <div style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '2px', fontWeight: 'bold' }}>
                                          En retard de reprise
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <Badge color="dark">
                                        {agent.role_agent || 'Agent'}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <Alert color="info">
              Aucun agent en cessation de service
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowAgentsEnCongesModal(false)}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default OrganizationDashboardPage;
