import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, Container, Row, Col, Badge, ListGroup, ListGroupItem } from 'reactstrap';
import { useLocation } from 'react-router-dom';

const VerifyDocument = () => {
    const [docData, setDocData] = useState(null);
    const [error, setError] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const base64Data = params.get('data');

        if (base64Data) {
            try {
                const decoded = atob(base64Data);
                const parsedData = JSON.parse(decoded);
                setDocData({
                    titre: parsedData.t || 'Document Officiel',
                    date: parsedData.d || 'Inconnue',
                    proprietaire: parsedData.p || 'Inconnu',
                    generateur: parsedData.g || 'Système',
                    numero: parsedData.n || 'N/A',
                    ministere: parsedData.m || 'N/A'
                });
            } catch (err) {
                console.error("Erreur de décodage:", err);
                setError(true);
            }
        } else {
            setError(true);
        }
    }, [location]);

    return (
        <div className="verify-page" style={{ backgroundColor: '#f4f7f6', minHeight: '100vh', display: 'flex', alignItems: 'center', py: 5 }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md="8" lg="6">
                        <Card className="shadow-lg border-0" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                            <div style={{ backgroundColor: '#2b579a', height: '10px' }}></div>
                            <CardHeader className="bg-white text-center py-4 border-0">
                                <h3 className="mb-0 text-primary fw-bold">
                                    <i className="fas fa-check-circle me-2 text-success"></i>
                                    Vérification de Document
                                </h3>
                                <p className="text-muted mt-2 mb-0">Certificat d'Authenticité</p>
                            </CardHeader>
                            <CardBody className="p-4 px-5">
                                {error ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-times-circle text-danger fa-4x mb-3"></i>
                                        <h4 className="text-danger">Document Invalide ou Données Corrompues</h4>
                                        <p className="text-muted mt-2">Le code QR scanné ne contient pas de données valides de vérification.</p>
                                    </div>
                                ) : docData ? (
                                    <div>
                                        <div className="text-center mb-4">
                                            <Badge color="success" pill className="px-3 py-2 fs-6 mb-3">Document Valide</Badge>
                                        </div>
                                        
                                        <ListGroup flush className="border rounded shadow-sm mb-4">
                                            <ListGroupItem className="d-flex justify-content-between align-items-center px-4 py-3">
                                                <div>
                                                    <small className="text-muted d-block mb-1">Ministère / Organisation</small>
                                                    <strong>{docData.ministere}</strong>
                                                </div>
                                                <div className="text-primary opacity-50">
                                                    <i className="fa fa-building fa-lg"></i>
                                                </div>
                                            </ListGroupItem>
                                        </ListGroup>

                                        <div className="d-flex flex-column gap-3">
                                            <div className="border-bottom pb-2">
                                                <span className="text-muted d-block" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Titre du Document</span>
                                                <strong className="fs-5 text-dark">{docData.titre}</strong>
                                            </div>
                                            
                                            <div className="border-bottom pb-2">
                                                <span className="text-muted d-block" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Numéro du Document</span>
                                                <strong className="text-dark">{docData.numero}</strong>
                                            </div>
                                            
                                            <div className="border-bottom pb-2">
                                                <span className="text-muted d-block" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Date de Génération</span>
                                                <strong className="text-dark">{docData.date}</strong>
                                            </div>
                                            
                                            <div className="border-bottom pb-2">
                                                <span className="text-muted d-block" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Agent Concerné (Propriétaire)</span>
                                                <strong className="text-dark">{docData.proprietaire}</strong>
                                            </div>
                                            
                                            <div className="pb-2">
                                                <span className="text-muted d-block" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Signataire / Générateur</span>
                                                <strong className="text-dark">{docData.generateur}</strong>
                                            </div>
                                        </div>

                                        <div className="mt-5 text-center text-muted" style={{ fontSize: '0.8rem' }}>
                                            <p className="mb-0">Ce document a été généré électroniquement par le Système Intégré de Gestion des Ressources Humaines.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">Chargement...</span>
                                        </div>
                                        <p className="mt-3 text-muted">Vérification en cours...</p>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default VerifyDocument;
