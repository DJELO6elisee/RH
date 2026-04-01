import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Navbar, 
  NavbarBrand,
  Nav, 
  NavItem, 
  Button
} from 'reactstrap';
import { 
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdAccessTime,
  MdPublic
} from 'react-icons/md';
import { Link } from 'react-router-dom';
import VersionChecker from '../components/VersionChecker';
import './MinistereHomePage.scss';

const MinistereHomePage = () => {
  // Forcer l'organisation pour le ministère des RH (MIN001)
  const organizationType = 'ministere';
  const organizationId = 1;

  // États pour l'animation de texte
  const [currentText, setCurrentText] = useState(0);
  const texts = [
    'Ministère du Tourisme et des Loisirs',
    'Direction des Ressources Humaines'
  ];

  // Animation qui alterne entre les deux textes toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentText((prev) => (prev + 1) % texts.length);
    }, 5000); // 5 secondes

    return () => clearInterval(interval);
  }, [texts.length]);

  return (
    <div className="ministere-homepage">
      {/* Détecteur de nouvelle version */}
      <VersionChecker checkInterval={3000} />
      
      {/* Navbar */}
      <Navbar className="navbar-ministere" expand="md" fixed="top">
        <Container>
          <NavbarBrand href="/" className="navbar-brand-ministere" style={{ flex: 1, maxWidth: 'calc(100% - 120px)' }}>
            <span className="d-none d-md-inline" style={{ fontSize: '1.5rem' }}>
              <span style={{ color: '#dc3545' }}>S</span>ystème{' '}
              <span style={{ color: '#dc3545' }}>I</span>ntégré de{' '}
              <span style={{ color: '#dc3545' }}>G</span>estion des{' '}
              <span style={{ color: '#dc3545' }}>R</span>essources{' '}
              <span style={{ color: '#dc3545' }}>H</span>umaines{' '}
              <span style={{ color: '#dc3545' }}>(SIGRH)</span>
            </span>
            <span className="d-inline d-md-none" style={{ 
              fontSize: '11px', 
              fontWeight: '700',
              color: '#2c5aa0',
              lineHeight: '1.3',
              display: 'block'
            }}>
              <span style={{ color: '#dc3545' }}>S</span>ystème{' '}
              <span style={{ color: '#dc3545' }}>I</span>ntégré de{' '}
              <span style={{ color: '#dc3545' }}>G</span>estion des{' '}
              <span style={{ color: '#dc3545' }}>R</span>essources{' '}
              <span style={{ color: '#dc3545' }}>H</span>umaines{' '}
              <span style={{ color: '#dc3545' }}>(SIGRH)</span>
            </span>
          </NavbarBrand>
          <Nav className="ms-auto" navbar>
            <NavItem>
              <Link to={`/login-page?organization=${organizationType}&id=${organizationId}`} className="btn btn-light btn-login">
                Connexion
              </Link>
            </NavItem>
          </Nav>
        </Container>
      </Navbar>

      {/* Section Logo avec image de fond */}
      <section className="logo-section py-5" style={{ marginTop: '80px', minHeight: '100vh', position: 'relative' }}>
        {/* Image de fond simple avec personnes (sans logo) */}
        <img 
          src={`${process.env.PUBLIC_URL}/img/mon-image.webp`}
          alt="Fond"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'brightness(1.05)',
            opacity: 0.9,
            zIndex: 0
          }}
          onError={(e) => {
            console.error('Erreur de chargement de l\'image:', e.target.src);
            e.target.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image chargée avec succès');
          }}
        />
        <Container style={{ position: 'relative', zIndex: 1 }}>
          <Row className="justify-content-center">
            <Col md="8" className="text-center">
              {/* Logo du Ministère en haut */}
              <div className="logo-container mb-4">
                <img 
                  src={process.env.PUBLIC_URL + '/img/logo-tou.jpeg'} 
                  alt="Logo Ministère du Tourisme et des Loisirs" 
                  className="logo-ministere"
                />
              </div>
              
              {/* Logo DRH juste en dessous */}
              <div className="logo-container mb-5">
                <img 
                  src={process.env.PUBLIC_URL + '/img/logo-tourisme.jpg'} 
                  alt="Logo Direction des Ressources Humaines" 
                  className="logo-drh"
                />
              </div>
              
              {/* Titre animé */}
              <div className="title-container">
                <h1 className={`animated-title text-animation-${currentText}`} key={currentText}>
                  {texts[currentText]}
                </h1>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer-section">
        <Container>
          <Row className="py-4">
            <Col md="6" className="mb-4 mb-md-0">
              <h5 className="mb-3" style={{ color: '#0d6efd', fontWeight: 'bold' }}>
                Direction des Ressources Humaines
              </h5>
              <p className="mb-4" style={{ color: '#fff', lineHeight: '1.6' }}>
                Excellence, Innovation et Service Public au cœur de notre mission. 
                Nous nous engageons à développer et valoriser le capital humain.
              </p>
              <div className="social-links d-flex">
                <Button 
                  color="primary" 
                  size="sm" 
                  className="me-2 rounded-circle"
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MdPublic />
                </Button>
                <Button 
                  color="primary" 
                  size="sm" 
                  className="me-2 rounded-circle"
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MdEmail />
                </Button>
                <Button 
                  color="primary" 
                  size="sm"
                  className="rounded-circle"
                  style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MdPhone />
                </Button>
              </div>
            </Col>
            <Col md="6" className="mb-4 mb-md-0">
              <h5 className="mb-3" style={{ color: '#0d6efd', fontWeight: 'bold' }}>
                Contact
              </h5>
              <div className="contact-info">
                <p className="mb-3" style={{ color: '#fff', display: 'flex', alignItems: 'flex-start' }}>
                  <MdLocationOn className="me-2" style={{ marginTop: '4px', flexShrink: 0 }} />
                  <span>PLATEAU 2ème ETAGE- IMMEUBLE TROPIC 3, PORTE C22, BP V 184 ABIDJAN.</span>
                </p>
                <p className="mb-3" style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <MdPhone className="me-2" style={{ flexShrink: 0 }} />
                  <span>27 20 27 22 03</span>
                </p>
                <p className="mb-3" style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <MdEmail className="me-2" style={{ flexShrink: 0 }} />
                  <span>drh@tourisme.gouv.ci</span>
                </p>
                <p className="mb-0" style={{ color: '#fff', display: 'flex', alignItems: 'center' }}>
                  <MdAccessTime className="me-2" style={{ flexShrink: 0 }} />
                  <span>Lun - Ven: 8h00 - 17h00</span>
                </p>
              </div>
            </Col>
          </Row>
          <hr className="my-3" style={{ borderColor: '#6c757d', opacity: 0.3 }} />
          <Row>
            <Col className="text-center">
              <div className="footer-info-section pt-3">
                <div className="d-flex flex-column align-items-center justify-content-center gap-3">
                  {/* Logo et slogan */}
                  <div className="text-center">
                    <img 
                      src={process.env.PUBLIC_URL + '/img/2ise.jpeg'} 
                      alt="Logo 2ISE-GROUPE" 
                      style={{ height: '80px', width: 'auto', marginBottom: '10px' }}
                      onError={(e) => {
                        console.error('Erreur de chargement du logo:', e.target.src);
                        e.target.src = process.env.PUBLIC_URL + '/img/photo-logo.png';
                      }}
                    />
                    <p className="mb-0" style={{ color: '#0d6efd', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      L'EXPERIENCE POUR VOUS SERVIR
                    </p>
                  </div>
                  
                  {/* Informations centrées */}
                  <div className="text-center">
                    <h4 className="mb-2" style={{ color: '#0d6efd', fontWeight: 'bold', fontSize: '1.8rem' }}>
                      2ISE-GROUPE
                    </h4>
                    <p className="mb-1" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                      <span style={{ color: '#0d6efd' }}>I</span><span style={{ color: '#dc3545' }}>ngénierie</span>{' '}
                      <span style={{ color: '#0d6efd' }}>I</span><span style={{ color: '#dc3545' }}>nformatique</span>{' '}
                      <span style={{ color: '#dc3545' }}>&</span>{' '}
                      <span style={{ color: '#0d6efd' }}>S</span><span style={{ color: '#dc3545' }}>écurité</span>{' '}
                      <span style={{ color: '#0d6efd' }}>É</span><span style={{ color: '#dc3545' }}>lectronique</span>
                    </p>
                    <p className="mb-3" style={{ color: '#dc3545', fontSize: '0.9rem' }}>
                      Vente de fournitures de bureaux et d'équipements informatiques - Formation
                    </p>
                    
                    {/* Contacts */}
                    <div className="mt-3 d-flex flex-wrap gap-3 justify-content-center">
                      <span style={{ color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <MdPhone className="me-1" style={{ flexShrink: 0, color: '#0d6efd' }} />
                        27 22 34 47 30 / 07 58 99 90 73
                      </span>
                      <span style={{ color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <MdEmail className="me-1" style={{ flexShrink: 0, color: '#0d6efd' }} />
                        infogroupe2ise@gmail.com
                      </span>
                      <span style={{ color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <MdLocationOn className="me-1" style={{ flexShrink: 0, color: '#0d6efd' }} />
                        Abidjan, Côte d'Ivoire
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
};

export default MinistereHomePage;

