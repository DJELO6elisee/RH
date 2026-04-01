import React from 'react';
import { Card, CardBody, Button, Row, Col } from 'reactstrap';
import { FaDownload, FaPrint, FaEye } from 'react-icons/fa';

const NoteServiceDocument = ({ notification, onClose }) => {
    // Extraire les informations de la notification
    const { titre, message, date_creation, description, date_debut, date_fin, lieu } = notification;
    
    // Parser le message pour extraire les détails (si nécessaire)
    const parseMessage = (msg) => {
        // Le message contient généralement : "Nouvelle note de service reçue pour l'événement du 2025-01-15 à Abidjan"
        const eventMatch = msg.match(/pour l'événement du (\d{4}-\d{2}-\d{2})/);
        const lieuMatch = msg.match(/à ([^)]+)/);
        
        return {
            dateEvenement: eventMatch ? eventMatch[1] : null,
            lieuFromMessage: lieuMatch ? lieuMatch[1] : null
        };
    };

    const { dateEvenement, lieuFromMessage } = parseMessage(message);
    
    // Formater la date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        // Créer un contenu HTML pour le téléchargement
        const content = document.getElementById('note-service-content').innerHTML;
        const blob = new Blob([`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Note de Service</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .document-header { text-align: center; margin-bottom: 30px; }
                    .document-title { font-size: 18px; font-weight: bold; margin: 20px 0; }
                    .document-content { margin: 20px 0; line-height: 1.6; }
                    .document-footer { margin-top: 40px; }
                    .signature-line { border-bottom: 1px solid #000; width: 200px; margin: 20px 0; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `], { type: 'text/html' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `note-service-${formatDateShort(date_creation)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="note-service-document">
            <Card className="shadow-lg">
                <CardBody id="note-service-content" style={{ 
                    background: 'white',
                    fontFamily: 'Times New Roman, serif',
                    lineHeight: '1.6',
                    padding: '40px'
                }}>
                    {/* En-tête du document */}
                    <div className="document-header">
                        <Row>
                            <Col md="6">
                                <div style={{ textAlign: 'left' }}>
                                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                                        MINISTÈRE DE L'ÉCONOMIE
                                    </h6>
                                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                                        ET DES FINANCES
                                    </h6>
                                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                                        DIRECTION DES AFFAIRES
                                    </h6>
                                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                                        ADMINISTRATIVES ET FINANCIÈRES
                                    </h6>
                                    <p style={{ margin: '10px 0 0 0', fontSize: '12px' }}>
                                        N° {Math.floor(Math.random() * 1000000)} /MEF/DAAF/
                                    </p>
                                </div>
                            </Col>
                            <Col md="6">
                                <div style={{ textAlign: 'right' }}>
                                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                                        RÉPUBLIQUE DE CÔTE D'IVOIRE
                                    </h6>
                                    <p style={{ margin: '5px 0', fontSize: '12px', fontStyle: 'italic' }}>
                                        Union-Discipline-Travail
                                    </p>
                                </div>
                            </Col>
                        </Row>
                    </div>

                    {/* Titre principal */}
                    <div style={{ textAlign: 'center', margin: '30px 0' }}>
                        <h4 style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            NOTE DE SERVICE
                        </h4>
                    </div>

                    {/* Contenu principal */}
                    <div className="document-content" style={{ margin: '20px 0' }}>
                        {/* Contenu original de la note */}
                        {description && (
                            <div style={{ 
                                fontSize: '14px', 
                                textAlign: 'justify', 
                                marginBottom: '20px',
                                padding: '15px',
                                border: '1px solid #ddd',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '5px',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {description}
                            </div>
                        )}
                    </div>

                    {/* Section AMPLIATIONS */}
                    <div style={{ marginTop: '40px' }}>
                        <Row>
                            <Col md="6">
                                <div>
                                    <h6 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                                        AMPLIATIONS
                                    </h6>
                                    <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '20px' }}>
                                        <li>- MEF/CAB: 1</li>
                                        <li>- MFPE: 1</li>
                                        <li>- CF: 1</li>
                                        <li>- DAAF: 1</li>
                                        <li>- DOSSIER: 2</li>
                                        <li>- INTÉRESSÉ(E): 2</li>
                                        <li>- SOLDE: 1</li>
                                        <li>- CHRONO: 1</li>
                                    </ul>
                                </div>
                            </Col>
                            <Col md="6">
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '12px', margin: '20px 0 0 0' }}>
                                        Abidjan, le {formatDate(date_creation)}
                                    </p>
                                    <div style={{ marginTop: '30px' }}>
                                        <p style={{ fontSize: '12px', margin: '5px 0' }}>
                                            Le Directeur des Ressources Humaines
                                        </p>
                                        <div className="signature-line"></div>
                                        <p style={{ fontSize: '12px', margin: '5px 0' }}>
                                            [Signature]
                                        </p>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </div>
                </CardBody>
                
                {/* Boutons d'action */}
                <div style={{ 
                    padding: '20px', 
                    borderTop: '1px solid #dee2e6',
                    background: '#f8f9fa'
                }}>
                    <Row className="justify-content-between align-items-center">
                        <Col>
                            <small className="text-muted">
                                <i className="fa fa-clock me-1"></i>
                                Reçue le {formatDate(date_creation)}
                            </small>
                        </Col>
                        <Col md="auto">
                            <Button 
                                color="outline-primary" 
                                size="sm" 
                                className="me-2"
                                onClick={handlePrint}
                            >
                                <FaPrint className="me-1" />
                                Imprimer
                            </Button>
                            <Button 
                                color="outline-success" 
                                size="sm" 
                                className="me-2"
                                onClick={handleDownload}
                            >
                                <FaDownload className="me-1" />
                                Télécharger
                            </Button>
                            <Button 
                                color="secondary" 
                                size="sm"
                                onClick={onClose}
                            >
                                <FaEye className="me-1" />
                                Fermer
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Card>
        </div>
    );
};

export default NoteServiceDocument;
