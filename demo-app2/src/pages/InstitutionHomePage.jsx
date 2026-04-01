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
  ListGroup,
  ListGroupItem,
  Carousel,
  CarouselItem,
  CarouselControl,
  CarouselIndicators
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
  MdCheckCircle,
  MdAccountBalance,
  MdWork,
  MdEvent,
  MdLibraryBooks,
  MdSupport,
  MdVerified,
  MdGroup,
  MdAssessment,
  MdLightbulb
} from 'react-icons/md';
import './InstitutionHomePage.scss';

const InstitutionHomePage = () => {
  // État du carrousel
  const [activeIndex, setActiveIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Images du carrousel
  const carouselImages = [
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
    },
    {
      src: process.env.PUBLIC_URL + '/img/photo-actualite.jpg',
      alt: 'Actualités',
      caption: 'Travail d\'équipe et efficacité'
    },
    {
      src: process.env.PUBLIC_URL + '/img/presi.jpg',
      alt: 'Présidence',
      caption: 'Leadership et gouvernance'
    },
    {
      src: process.env.PUBLIC_URL + '/img/nos-rea.webp',
      alt: 'Nos réalisations',
      caption: 'Succès et accomplissements'
    }
  ];

  // Fonctions de contrôle du carrousel
  const next = () => {
    if (animating) return;
    const nextIndex = activeIndex === carouselImages.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(nextIndex);
  };

  const previous = () => {
    if (animating) return;
    const nextIndex = activeIndex === 0 ? carouselImages.length - 1 : activeIndex - 1;
    setActiveIndex(nextIndex);
  };

  const goToIndex = (newIndex) => {
    if (animating) return;
    setActiveIndex(newIndex);
  };

  // Auto-play du carrousel
  useEffect(() => {
    const interval = setInterval(() => {
      next();
    }, 5000); // Change d'image toutes les 5 secondes

    return () => clearInterval(interval);
  }, [activeIndex, animating]);

  return (
    <div className="institution-homepage">
      {/* Navbar */}
      <Navbar className="navbar-institution" expand="md" fixed="top">
        <Container>
          <NavbarBrand href="/" className="navbar-brand-institution">
            <img 
              src={process.env.PUBLIC_URL + '/img/logo-armoirie.png'} 
              alt="Logo Institution" 
              className="navbar-logo me-2"
              style={{ height: '40px', width: 'auto' }}
            />
            Institution Publique
          </NavbarBrand>
          <Nav className="ms-auto" navbar>
            <NavItem>
              <NavLink href="#accueil" className="nav-link-institution">
                <MdHome className="me-1" /> Accueil
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#services" className="nav-link-institution">
                <MdWork className="me-1" /> Services
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#formations" className="nav-link-institution">
                <MdSchool className="me-1" /> Formations
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#actualites" className="nav-link-institution">
                <MdEvent className="me-1" /> Actualités
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink href="#contact" className="nav-link-institution">
                <MdContactMail className="me-1" /> Contact
              </NavLink>
            </NavItem>
            <NavItem>
              <Button color="light" className="btn-login">
                Connexion
              </Button>
            </NavItem>
          </Nav>
        </Container>
      </Navbar>

      {/* Hero Section avec Carrousel */}
      <section id="accueil" className="hero-section">
        {/* Carrousel d'images en arrière-plan */}
        <div className="hero-carousel" style={{ width: '100vw', height: '100vh' }}>
          <Carousel
            activeIndex={activeIndex}
            next={next}
            previous={previous}
            interval={false}
            className="hero-carousel-inner"
            style={{ width: '100vw', height: '100vh' }}
          >
            {carouselImages.map((image, index) => (
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
                    filter: 'brightness(0.8) contrast(1.1) saturate(1.1)',
                    imageRendering: 'crisp-edges',
                    transform: 'scale(1.02)',
                    zIndex: 1
                  }}
                  onLoad={() => {
                    console.log(`Image ${index + 1} chargée:`, image.src);
                  }}
                  onError={(e) => {
                    console.error(`Erreur chargement image ${index + 1}:`, image.src);
                    // Fallback vers une image de test
                    e.target.src = `https://picsum.photos/1920/1080?random=${index + 1}`;
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
                  <Badge color="success" className="hero-badge mb-3">
                    <MdVerified className="me-1" /> Institution Certifiée
                  </Badge>
                  <h1 className="hero-title">
                    Institution <span className="text-success">Publique</span>
                  </h1>
                  <p className="hero-subtitle">
                    Excellence dans le service public, innovation dans nos méthodes. 
                    Nous nous engageons à offrir des services de qualité supérieure 
                    et à contribuer au développement de notre communauté.
                  </p>
                  <div className="hero-buttons">
                    <Button color="light" size="md" className="btn-hero-primary">
                      <MdInfo className="me-2" /> Nos services
                    </Button>
                    <Button color="outline-light" size="md" className="btn-hero-secondary">
                      <MdContactMail className="me-2" /> Contactez-nous
                    </Button>
                  </div>
                  <div className="hero-features">
                    <div className="feature-item">
                      <MdCheckCircle className="feature-icon" />
                      <span>Service 24/7</span>
                    </div>
                    <div className="feature-item">
                      <MdCheckCircle className="feature-icon" />
                      <span>Équipe qualifiée</span>
                    </div>
                    <div className="feature-item">
                      <MdCheckCircle className="feature-icon" />
                      <span>Technologie moderne</span>
                    </div>
                  </div>
                </div>
              </Col>
              <Col lg="6">
                <div className="hero-image">
                  <div className="hero-stats">
                    <div className="stat-item">
                      <h3>2,500+</h3>
                      <p>Agents</p>
                    </div>
                    <div className="stat-item">
                      <h3>15</h3>
                      <p>Départements</p>
                    </div>
                    <div className="stat-item">
                      <h3>98%</h3>
                      <p>Satisfaction</p>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services-section py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Nos Services</h2>
              <p className="section-subtitle">
                Des services publics de qualité pour tous les citoyens
              </p>
            </Col>
          </Row>
          <Row>
            <Col md="4" className="mb-4">
              <Card className="service-card h-100">
                <CardBody className="text-center">
                  <div className="service-icon">
                    <MdGroup />
                  </div>
                  <CardTitle tag="h4">Accueil Citoyen</CardTitle>
                  <CardText>
                    Service d'accueil et d'orientation pour tous les citoyens 
                    avec une équipe dédiée et des horaires étendus.
                  </CardText>
                  <ListGroup flush>
                    <ListGroupItem>Accueil personnalisé</ListGroupItem>
                    <ListGroupItem>Orientation spécialisée</ListGroupItem>
                    <ListGroupItem>Suivi des dossiers</ListGroupItem>
                  </ListGroup>
                  <Button color="success" outline className="mt-3">
                    En savoir plus
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="service-card h-100">
                <CardBody className="text-center">
                  <div className="service-icon">
                    <MdLibraryBooks />
                  </div>
                  <CardTitle tag="h4">Administration</CardTitle>
                  <CardText>
                    Gestion administrative complète avec des procédures 
                    simplifiées et des délais de traitement optimisés.
                  </CardText>
                  <ListGroup flush>
                    <ListGroupItem>Traitement rapide</ListGroupItem>
                    <ListGroupItem>Procédures simplifiées</ListGroupItem>
                    <ListGroupItem>Suivi en temps réel</ListGroupItem>
                  </ListGroup>
                  <Button color="success" outline className="mt-3">
                    En savoir plus
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="service-card h-100">
                <CardBody className="text-center">
                  <div className="service-icon">
                    <MdSupport />
                  </div>
                  <CardTitle tag="h4">Support Technique</CardTitle>
                  <CardText>
                    Assistance technique et support pour tous les services 
                    numériques et administratifs de l'institution.
                  </CardText>
                  <ListGroup flush>
                    <ListGroupItem>Support 24/7</ListGroupItem>
                    <ListGroupItem>Formation utilisateur</ListGroupItem>
                    <ListGroupItem>Maintenance préventive</ListGroupItem>
                  </ListGroup>
                  <Button color="success" outline className="mt-3">
                    En savoir plus
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Formations Section */}
      <section id="formations" className="training-section py-5 bg-light">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Formations & Développement</h2>
              <p className="section-subtitle">
                Investir dans le développement des compétences de nos agents
              </p>
            </Col>
          </Row>
          <Row>
            <Col md="6" className="mb-4">
              <Card className="training-card h-100">
                <CardBody>
                  <div className="training-header">
                    <MdSchool className="training-icon" />
                    <div>
                      <CardTitle tag="h5">Formation Continue</CardTitle>
                      <Badge color="info">Nouveau</Badge>
                    </div>
                  </div>
                  <CardText>
                    Programmes de formation continue pour maintenir et améliorer 
                    les compétences de nos agents dans un environnement en évolution.
                  </CardText>
                  <ul className="training-list">
                    <li>Formation en leadership</li>
                    <li>Compétences numériques</li>
                    <li>Gestion de projet</li>
                    <li>Communication efficace</li>
                  </ul>
                  <Button color="info" outline>
                    Voir le programme
                  </Button>
                </CardBody>
              </Card>
            </Col>
            <Col md="6" className="mb-4">
              <Card className="training-card h-100">
                <CardBody>
                  <div className="training-header">
                    <MdLightbulb className="training-icon" />
                    <div>
                      <CardTitle tag="h5">Innovation & Recherche</CardTitle>
                      <Badge color="warning">En cours</Badge>
                    </div>
                  </div>
                  <CardText>
                    Initiatives d'innovation et programmes de recherche pour 
                    améliorer nos services et développer de nouvelles solutions.
                  </CardText>
                  <ul className="training-list">
                    <li>Laboratoire d'innovation</li>
                    <li>Partenariats recherche</li>
                    <li>Projets pilotes</li>
                    <li>Transfert de technologie</li>
                  </ul>
                  <Button color="warning" outline>
                    Découvrir
                  </Button>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Actualités Section */}
      <section id="actualites" className="news-section py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="section-title">Actualités & Événements</h2>
              <p className="section-subtitle">
                Restez informé des dernières nouvelles de notre institution
              </p>
            </Col>
          </Row>
          <Row>
            <Col md="4" className="mb-4">
              <Card className="news-card h-100">
                <div className="news-image">
                  <img 
                    src={process.env.PUBLIC_URL + '/img/photo-actualite.jpg'} 
                    alt="Journée Portes Ouvertes" 
                    className="news-image-bg"
                  />
                  <Badge color="success" className="news-badge">Événement</Badge>
                </div>
                <CardBody>
                  <CardTitle tag="h5">Journée Portes Ouvertes 2025</CardTitle>
                  <CardText>
                    Découvrez nos services et rencontrez nos équipes lors de 
                    notre journée portes ouvertes annuelle.
                  </CardText>
                  <div className="news-meta">
                    <small className="text-muted">
                      <MdAccessTime className="me-1" /> 20 Janvier 2025
                    </small>
                    <small className="text-muted ms-3">
                      <MdLocationOn className="me-1" /> Siège principal
                    </small>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="news-card h-100">
                <div className="news-image">
                  <img 
                    src={process.env.PUBLIC_URL + '/img/media-article.jpg'} 
                    alt="Nouvelle Plateforme Digitale" 
                    className="news-image-bg"
                  />
                  <Badge color="info" className="news-badge">Innovation</Badge>
                </div>
                <CardBody>
                  <CardTitle tag="h5">Nouvelle Plateforme Digitale</CardTitle>
                  <CardText>
                    Lancement de notre nouvelle plateforme de services en ligne 
                    pour une meilleure expérience utilisateur.
                  </CardText>
                  <div className="news-meta">
                    <small className="text-muted">
                      <MdAccessTime className="me-1" /> 15 Janvier 2025
                    </small>
                    <small className="text-muted ms-3">
                      <MdPublic className="me-1" /> En ligne
                    </small>
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col md="4" className="mb-4">
              <Card className="news-card h-100">
                <div className="news-image">
                  <img 
                    src={process.env.PUBLIC_URL + '/img/atelier-formation.jpg'} 
                    alt="Programme de Formation" 
                    className="news-image-bg"
                  />
                  <Badge color="primary" className="news-badge">Formation</Badge>
                </div>
                <CardBody>
                  <CardTitle tag="h5">Programme de Formation 2025</CardTitle>
                  <CardText>
                    Inscriptions ouvertes pour notre nouveau programme de 
                    formation continue destiné à tous les agents.
                  </CardText>
                  <div className="news-meta">
                    <small className="text-muted">
                      <MdAccessTime className="me-1" /> 10 Janvier 2025
                    </small>
                    <small className="text-muted ms-3">
                      <MdSchool className="me-1" /> Centre de formation
                    </small>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Statistiques Section */}
      <section className="stats-section py-5">
        <Container>
          <Row className="text-center">
            <Col md="3" className="mb-4">
              <div className="stat-box">
                <MdAssessment className="stat-icon" />
                <h3>15,000+</h3>
                <p>Dossiers traités</p>
              </div>
            </Col>
            <Col md="3" className="mb-4">
              <div className="stat-box">
                <MdPeople className="stat-icon" />
                <h3>2,500+</h3>
                <p>Agents formés</p>
              </div>
            </Col>
            <Col md="3" className="mb-4">
              <div className="stat-box">
                <MdCheckCircle className="stat-icon" />
                <h3>99%</h3>
                <p>Taux de réussite</p>
              </div>
            </Col>
            <Col md="3" className="mb-4">
              <div className="stat-box">
                <MdTrendingUp className="stat-icon" />
                <h3>25%</h3>
                <p>Amélioration efficacité</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer-section">
        <Container>
          <Row>
            <Col md="4" className="mb-4">
              <h5>Institution Publique</h5>
              <p>
                Excellence dans le service public, innovation dans nos méthodes. 
                Nous nous engageons à offrir des services de qualité supérieure.
              </p>
              <div className="social-links">
                <Button color="success" size="sm" className="me-2">
                  <MdPublic />
                </Button>
                <Button color="success" size="sm" className="me-2">
                  <MdEmail />
                </Button>
                <Button color="success" size="sm">
                  <MdPhone />
                </Button>
              </div>
            </Col>
            <Col md="4" className="mb-4">
              <h5>Liens Utiles</h5>
              <ul className="footer-links">
                <li><a href="#accueil">Accueil</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#formations">Formations</a></li>
                <li><a href="#actualites">Actualités</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </Col>
            <Col md="4" className="mb-4">
              <h5>Contact & Horaires</h5>
              <div className="contact-info">
                <p>
                  <MdLocationOn className="me-2" />
                  Avenue de l'Indépendance, BP 5678
                </p>
                <p>
                  <MdPhone className="me-2" />
                  +225 XX XX XX XX XX
                </p>
                <p>
                  <MdEmail className="me-2" />
                  contact@institution.gov.ci
                </p>
                <p>
                  <MdAccessTime className="me-2" />
                  Lun - Ven: 7h30 - 16h30
                </p>
                <p>
                  <MdAccessTime className="me-2" />
                  Sam: 8h00 - 12h00
                </p>
              </div>
            </Col>
          </Row>
          <hr className="my-4" />
          <Row>
            <Col className="text-center">
              <p className="mb-0">
                © 2025 Institution Publique. Tous droits réservés.
              </p>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default InstitutionHomePage;
