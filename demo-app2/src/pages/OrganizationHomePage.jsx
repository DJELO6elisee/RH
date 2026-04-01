import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Navbar, 
  NavbarBrand,
  Nav, 
  NavItem, 
  NavLink, 
  Button, 
  Card, 
  CardBody, 
  CardTitle, 
  CardText,
  Badge,
  Carousel,
  CarouselItem,
  CarouselControl,
  CarouselIndicators,
  Spinner,
  Alert
} from 'reactstrap';
import { 
  MdHome, 
  MdInfo, 
  MdContactMail, 
  MdPublic, 
  MdPeople, 
  MdBusiness, 
  MdTrendingUp,
  MdSecurity,
  MdSchool,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdAccessTime,
  MdStar,
  MdCheckCircle
} from 'react-icons/md';
import { Link, useParams, Redirect } from 'react-router-dom';
import './OrganizationHomePage.scss';

const OrganizationHomePage = ({ organizationType: propType, organizationId: propId, organizationData: propData }) => {
  const { organizationType: paramType, organizationId: paramId } = useParams();
  
  // Utiliser les props en priorité, sinon les paramètres d'URL
  const organizationType = propType || paramType;
  const organizationId = propId || paramId;
  
  const [organization, setOrganization] = useState(propData || null);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState(null);
  
  // État pour le carrousel
  const [activeIndex, setActiveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Charger les informations de l'organisation
  useEffect(() => {
    const loadOrganization = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const endpoint = `/api/ministeres/${organizationId}`;
          
        const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setOrganization(result.data);
        } else {
          setError('Organisation non trouvée');
        }
      } catch (err) {
        setError('Erreur lors du chargement de l\'organisation');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    // Ne charger que si on n'a pas déjà les données en props
    if (organizationId && !propData) {
      loadOrganization();
    } else if (propData) {
      setLoading(false);
    }
  }, [organizationType, organizationId, propData]);

  // Images du carrousel par défaut
  const defaultCarouselImages = [
    {
      src: process.env.PUBLIC_URL + '/img/renforcement-capacites.jpg',
      alt: 'Renforcement des capacités',
      caption: 'Excellence dans le service public'
    },
    {
      src: process.env.PUBLIC_URL + '/img/atelier-formation.jpg',
      alt: 'Atelier de formation',
      caption: 'Développement des compétences'
    },
    {
      src: process.env.PUBLIC_URL + '/img/media-article.jpg',
      alt: 'Article média',
      caption: 'Innovation et collaboration'
    }
  ];

  // Fonctions pour contrôler le carrousel
  const next = () => {
    const nextIndex = activeIndex === defaultCarouselImages.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(nextIndex);
  };

  const previous = () => {
    const nextIndex = activeIndex === 0 ? defaultCarouselImages.length - 1 : activeIndex - 1;
    setActiveIndex(nextIndex);
  };

  const goToIndex = (newIndex) => {
    setActiveIndex(newIndex);
  };

  // Auto-play du carrousel
  useEffect(() => {
    const interval = setInterval(() => {
      next();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex]);

  // Annuler cette page pour le ministère 10 et rediriger vers la page dédiée
  if (organizationType === 'ministere' && String(organizationId) === '10') {
    return <Redirect to="/ministere" />;
  }

  if (loading) {
    return (
      <div className="organization-homepage">
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <Spinner color="primary" size="lg" />
        </div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="organization-homepage">
        <Container className="mt-5">
          <Alert color="danger">
            {error || 'Organisation non trouvée'}
          </Alert>
          <Link to="/" className="btn btn-primary">
            Retour à l'accueil
          </Link>
        </Container>
      </div>
    );
  }

  const isMinistry = organizationType === 'ministere';
  const organizationName = organization.nom || organization.libelle;
  const organizationTypeLabel = isMinistry ? 'Ministère' : 'Institution';

  return (
    <div className="organization-homepage">
      {/* Navbar */}
      <Navbar className="navbar-organization" expand="md" fixed="top">
        <Container>
          <NavbarBrand href="/" className="navbar-brand-organization">
            <img 
              src={organization.logo_url || process.env.PUBLIC_URL + '/img/logo-armoirie.png'} 
              alt={`Logo ${organizationName}`} 
              className="navbar-logo me-2"
              style={{ height: '40px', width: 'auto' }}
            />
            {organizationName}
          </NavbarBrand>
          <Nav className="ms-auto" navbar>
            <NavItem>
              <NavLink href="#accueil" className="nav-link-organization">
                <MdHome className="me-1" /> Accueil
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#services" className="nav-link-organization">
                <MdPeople className="me-1" /> Services
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#actualites" className="nav-link-organization">
                <MdPublic className="me-1" /> Actualités
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#contact" className="nav-link-organization">
                <MdContactMail className="me-1" /> Contact
              </NavLink>
            </NavItem>
            <NavItem>
              <Link 
                to={`/login-page?organization=${organizationType}&id=${organizationId}`} 
                className="btn btn-light btn-login"
              >
                Connexion
              </Link>
            </NavItem>
          </Nav>
        </Container>
      </Navbar>

      {/* Hero Section avec Carrousel */}
      <section id="accueil" className="hero-section">
        <div className="hero-carousel" style={{ width: '100vw', height: '100vh' }}>
          <Carousel
            activeIndex={activeIndex}
            next={next}
            previous={previous}
            interval={false}
            className="hero-carousel-inner"
            style={{ width: '100vw', height: '100vh' }}
          >
            {defaultCarouselImages.map((image, index) => (
              <CarouselItem key={index} style={{ height: '100vh', width: '100vw' }}>
                <img 
                  src={image.src}
                  alt={image.alt}
                  className="hero-carousel-image"
                  style={{
                    width: '100vw',
                    height: '100vh',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    minWidth: '100%',
                    minHeight: '100%',
                    filter: 'brightness(1.2) contrast(1.2) saturate(1.3)',
                    imageRendering: 'crisp-edges',
                    transform: 'scale(1.02)',
                    zIndex: 1
                  }}
                />
                <div className="hero-overlay"></div>
              </CarouselItem>
            ))}
            <CarouselControl
              direction="prev"
              directionText="Previous"
              onClickHandler={previous}
            />
          </Carousel>
        </div>

        {/* Contenu de la section hero */}
        <div className="hero-content-overlay">
          <Container>
            <Row className="align-items-center min-vh-100">
              <Col lg="6">
                <div className="hero-content">
                  <Badge color="primary" className="hero-badge mb-3">
                    <MdStar className="me-1" /> {organizationTypeLabel} Officiel
                  </Badge>
                  <h1 className="hero-title">
                    {organizationName}
                  </h1>
                  <p className="hero-subtitle">
                    {organization.description || 
                      `Excellence, Innovation et Service Public au cœur de notre mission. 
                      Nous nous engageons à développer et valoriser le capital humain 
                      pour un service public moderne et efficace.`}
                  </p>
                  <div className="hero-buttons">
                    <Button color="light" size="md" className="btn-hero-primary">
                      <MdInfo className="me-2" /> Découvrir nos services
                    </Button>
                    <Button color="outline-light" size="md" className="btn-hero-secondary">
                      <MdContactMail className="me-2" /> Nous contacter
                    </Button>
                  </div>
                </div>
              </Col>
              <Col lg="6">
                <div className="hero-image">
                  <div className="hero-stats">
                    <div className="stat-item">
                      <h3>{organization.code || 'N/A'}</h3>
                      <p>Code {organizationTypeLabel}</p>
                    </div>
                    <div className="stat-item">
                      <h3>100%</h3>
                      <p>Engagement</p>
                    </div>
                    <div className="stat-item">
                      <h3>24/7</h3>
                      <p>Service</p>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>

        {/* Indicateurs du carrousel */}
        <div className="carousel-indicators-custom">
          {defaultCarouselImages.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${activeIndex === index ? 'active' : ''}`}
              onClick={() => goToIndex(index)}
            />
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Nos Services</h2>
              <p className="section-subtitle">
                Des solutions complètes pour la gestion des ressources humaines
              </p>
            </Col>
          </Row>
          <Row>
            <Col md="4" className="mb-4">
              <Card className="service-card h-100">
                <CardBody className="text-center">
                  <div className="service-icon">
                    <MdPeople />
                  </div>
                  <CardTitle tag="h4">Gestion du Personnel</CardTitle>
                  <CardText>
                    Administration complète des agents, 
                    gestion des carrières et développement professionnel.
                  </CardText>
                  <Button color="primary" outline>
                    En savoir plus
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="service-card h-100">
                <CardBody className="text-center">
                  <div className="service-icon">
                    <MdSchool />
                  </div>
                  <CardTitle tag="h4">Formation & Développement</CardTitle>
                  <CardText>
                    Programmes de formation continue et développement 
                    des compétences pour tous les agents.
                  </CardText>
                  <Button color="primary" outline>
                    En savoir plus
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="service-card h-100">
                <CardBody className="text-center">
                  <div className="service-icon">
                    <MdSecurity />
                  </div>
                  <CardTitle tag="h4">Sécurité & Bien-être</CardTitle>
                  <CardText>
                    Protection sociale, santé au travail et 
                    amélioration des conditions de vie des agents.
                  </CardText>
                  <Button color="primary" outline>
                    En savoir plus
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer-section">
        <Container>
          <Row>
            <Col md="4" className="mb-4">
              <h5>{organizationName}</h5>
              <p>
                {organization.description || 
                  'Excellence, Innovation et Service Public au cœur de notre mission.'}
              </p>
              <div className="social-links">
                <Button color="primary" size="sm" className="me-2">
                  <MdPublic />
                </Button>
                <Button color="primary" size="sm" className="me-2">
                  <MdEmail />
                </Button>
                <Button color="primary" size="sm">
                  <MdPhone />
                </Button>
              </div>
            </Col>
            <Col md="4" className="mb-4">
              <h5>Liens Utiles</h5>
              <ul className="footer-links">
                <li><a href="#accueil">Accueil</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#actualites">Actualités</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </Col>
            <Col md="4" className="mb-4">
              <h5>Contact</h5>
              <div className="contact-info">
                {organization.adresse && (
                  <p>
                    <MdLocationOn className="me-2" />
                    {organization.adresse}
                  </p>
                )}
                {organization.telephone && (
                  <p>
                    <MdPhone className="me-2" />
                    {organization.telephone}
                  </p>
                )}
                {organization.email && (
                  <p>
                    <MdEmail className="me-2" />
                    {organization.email}
                  </p>
                )}
                {organization.website && (
                  <p>
                    <MdPublic className="me-2" />
                    <a href={organization.website} target="_blank" rel="noopener noreferrer">
                      {organization.website}
                    </a>
                  </p>
                )}
                <p>
                  <MdAccessTime className="me-2" />
                  Lun - Ven: 8h00 - 17h00
                </p>
              </div>
            </Col>
          </Row>
          <hr className="my-4" />
          <Row>
            <Col className="text-center">
              <p className="mb-0">
                © 2025 {organizationName}. Tous droits réservés.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default OrganizationHomePage;
