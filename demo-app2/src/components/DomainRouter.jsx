import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import { getOrganizationByDomain } from '../utils/domainMapping';
import OrganizationHomePage from '../pages/OrganizationHomePage';
import { Spinner, Alert, Container, Row, Col } from 'reactstrap';

const DomainRouter = () => {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const detectOrganization = () => {
      try {
        const detectedOrg = getOrganizationByDomain();
        
        if (detectedOrg) {
          setOrganization(detectedOrg);
        } else {
          setError('Organisation non reconnue pour ce domaine');
        }
      } catch (err) {
        setError('Erreur lors de la détection de l\'organisation');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    detectOrganization();
  }, []);

  if (loading) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md="6" className="text-center">
            <Spinner color="primary" size="lg" />
            <p className="mt-3">Détection de l'organisation...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Row className="justify-content-center">
          <Col md="8">
            <Alert color="danger">
              <h4>Organisation non trouvée</h4>
              <p>{error}</p>
              <p>Veuillez vérifier que vous accédez au bon domaine pour votre organisation.</p>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  if (organization) {
    // Passer les paramètres d'organisation au composant OrganizationHomePage
    return (
      <OrganizationHomePage 
        organizationType={organization.type}
        organizationId={organization.id}
        organizationData={organization}
      />
    );
  }

  // Fallback vers la page par défaut
  return <Redirect to="/ministere" />;
};

export default DomainRouter;
