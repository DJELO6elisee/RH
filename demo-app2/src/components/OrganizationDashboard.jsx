import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, CardHeader, CardTitle, Row, Col, Badge, Alert } from 'reactstrap';
import { 
  MdBusiness, 
  MdPeople, 
  MdTrendingUp, 
  MdCheckCircle,
  MdWarning,
  MdInfo
} from 'react-icons/md';

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [organizationData, setOrganizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Déterminer le type d'organisation et l'ID basé sur l'utilisateur
        let organizationType, organizationId;
        
        if (user && user.organization) {
          organizationType = user.organization.type;
          organizationId = user.organization.id;
        } else {
          // Fallback: essayer de déterminer l'organisation depuis les données utilisateur
          // Cette logique dépendra de votre structure de données
          setError('Organisation non définie pour cet utilisateur');
          return;
        }

        // Charger les données spécifiques à l'organisation (ministère uniquement)
        const endpoint = `/api/ministeres/${organizationId}`;
          
        const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setOrganizationData(result.data);
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
  }, [user]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert color="danger">
        {error}
      </Alert>
    );
  }

  if (!organizationData) {
    return (
      <Alert color="warning">
        Aucune donnée d'organisation disponible
      </Alert>
    );
  }

  const isMinistry = user?.organization?.type === 'ministere';
  const organizationName = organizationData.nom || organizationData.libelle;

  return (
    <div className="organization-dashboard">
      {/* En-tête de l'organisation */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <CardBody className="p-4">
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <img 
                    src={organizationData.logo_url || '/img/logo-armoirie.png'} 
                    alt={`Logo ${organizationName}`}
                    style={{ height: '60px', width: 'auto' }}
                    className="rounded"
                  />
                </div>
                <div>
                  <h2 className="mb-1">{organizationName}</h2>
                  <Badge color={isMinistry ? 'primary' : 'info'} className="mb-2">
                    {isMinistry ? 'Ministère' : 'Institution'}
                  </Badge>
                  <p className="text-muted mb-0">
                    {organizationData.description || 'Tableau de bord organisationnel'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Statistiques de l'organisation */}
      <Row className="mb-4">
        <Col md="3" className="mb-3">
          <Card className="text-center border-0 shadow-sm">
            <CardBody>
              <MdPeople className="text-primary mb-2" size={40} />
              <h4 className="mb-1">Agents</h4>
              <p className="text-muted mb-0">Gestion du personnel</p>
            </CardBody>
          </Card>
        </Col>
        <Col md="3" className="mb-3">
          <Card className="text-center border-0 shadow-sm">
            <CardBody>
              <MdBusiness className="text-success mb-2" size={40} />
              <h4 className="mb-1">Services</h4>
              <p className="text-muted mb-0">Unités administratives</p>
            </CardBody>
          </Card>
        </Col>
        <Col md="3" className="mb-3">
          <Card className="text-center border-0 shadow-sm">
            <CardBody>
              <MdTrendingUp className="text-warning mb-2" size={40} />
              <h4 className="mb-1">Formations</h4>
              <p className="text-muted mb-0">Développement des compétences</p>
            </CardBody>
          </Card>
        </Col>
        <Col md="3" className="mb-3">
          <Card className="text-center border-0 shadow-sm">
            <CardBody>
              <MdCheckCircle className="text-info mb-2" size={40} />
              <h4 className="mb-1">Performance</h4>
              <p className="text-muted mb-0">Indicateurs clés</p>
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Informations de contact */}
      <Row>
        <Col md="6" className="mb-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="mb-0">
                <MdInfo className="me-2" />
                Informations de contact
              </CardTitle>
            </CardHeader>
            <CardBody>
              {organizationData.adresse && (
                <p className="mb-2">
                  <strong>Adresse:</strong> {organizationData.adresse}
                </p>
              )}
              {organizationData.telephone && (
                <p className="mb-2">
                  <strong>Téléphone:</strong> {organizationData.telephone}
                </p>
              )}
              {organizationData.email && (
                <p className="mb-2">
                  <strong>Email:</strong> {organizationData.email}
                </p>
              )}
              {organizationData.website && (
                <p className="mb-0">
                  <strong>Site web:</strong> 
                  <a href={organizationData.website} target="_blank" rel="noopener noreferrer" className="ms-1">
                    {organizationData.website}
                  </a>
                </p>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md="6" className="mb-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="mb-0">
                <MdWarning className="me-2" />
                Accès restreint
              </CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-muted">
                Vous avez accès uniquement aux données de votre organisation. 
                Toutes les informations affichées sont filtrées selon votre 
                {isMinistry ? ' ministère' : ' institution'}.
              </p>
              <Badge color="success" className="mt-2">
                Accès sécurisé et filtré
              </Badge>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrganizationDashboard;
