import React from 'react';
import { Card, CardHeader, CardBody, Row, Col, Badge, Alert } from 'reactstrap';

const CertificatRepriseServiceDetails = ({ demande, agent }) => {
    // Fonction pour formater les dates
    const formatDate = (dateString) => {
        if (!dateString) return 'Non renseigné';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Fonction pour obtenir le badge de priorité
    const getPriorityBadge = (priorite) => {
        const badges = {
            'normale': { color: 'primary', icon: 'fa-info-circle' },
            'urgente': { color: 'warning', icon: 'fa-exclamation-triangle' },
            'critique': { color: 'danger', icon: 'fa-exclamation-circle' }
        };
        const badge = badges[priorite] || badges['normale'];
        return badge;
    };

    const priorityBadge = getPriorityBadge(demande.priorite);

    return (
        <div className="certificat-reprise-service-details">
            
            <Card className="mb-3 border-success">
                <CardHeader className="bg-success text-white">
                    <Row className="align-items-center">
                        <Col md="8">
                            <h5 className="mb-0">
                                <i className="fa fa-undo me-2"></i>
                                CERTIFICAT DE REPRISE DE SERVICE
                            </h5>
                        </Col>
                        <Col md="4" className="text-end">
                            <Badge color={priorityBadge.color} className="me-2">
                                <i className={`fa ${priorityBadge.icon} me-1`}></i>
                                {demande.priorite?.toUpperCase() || 'NORMALE'}
                            </Badge>
                        </Col>
                    </Row>
                </CardHeader>
                <CardBody>
                    <Row>
                        <Col md="6">
                            <div className="mb-3">
                                <strong className="text-success">
                                    <i className="fa fa-user me-2"></i>
                                    Agent concerné:
                                </strong>
                                <p className="mt-1 mb-0">
                                    <strong>{agent.prenom} {agent.nom}</strong>
                                    <br />
                                    <small className="text-muted">
                                        Matricule: {agent.matricule} | Service: {agent.service_nom || 'Non renseigné'}
                                    </small>
                                </p>
                            </div>
                        </Col>
                        <Col md="6">
                            <div className="mb-3">
                                <strong className="text-success">
                                    <i className="fa fa-calendar-check me-2"></i>
                                    Date de reprise de service:
                                </strong>
                                <p className="mt-1 mb-0">
                                    <strong>{formatDate(demande.date_reprise_service || demande.date_fin_conges || demande.date_fin)}</strong>
                                </p>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            {/* Motif de reprise */}
            <Card className="mb-3">
                <CardHeader>
                    <h6 className="mb-0">
                        <i className="fa fa-file-alt text-info me-2"></i>
                        MOTIF DE LA REPRISE DE SERVICE
                    </h6>
                </CardHeader>
                <CardBody>
                    <div className="motif-section">
                        <p className="mb-0">
                            <strong>Type de reprise:</strong>
                        </p>
                        <p className="mt-1 text-dark">
                            {demande.description || demande.motif || 'Non renseigné'}
                        </p>
                    </div>
                </CardBody>
            </Card>

            {/* Informations sur le congé */}
            {(demande.date_debut || demande.date_fin) && (
                <Card className="mb-3">
                    <CardHeader>
                        <h6 className="mb-0">
                            <i className="fa fa-calendar-alt text-secondary me-2"></i>
                            PÉRIODE DE CONGÉ
                        </h6>
                    </CardHeader>
                    <CardBody>
                        <Row>
                            {demande.date_debut && (
                                <Col md="6">
                                    <div className="mb-3">
                                        <strong>Date de début:</strong>
                                        <p className="mt-1 mb-0 text-dark">
                                            {formatDate(demande.date_debut)}
                                        </p>
                                    </div>
                                </Col>
                            )}
                            {demande.date_fin && (
                                <Col md="6">
                                    <div className="mb-3">
                                        <strong>Date de fin:</strong>
                                        <p className="mt-1 mb-0 text-dark">
                                            {formatDate(demande.date_fin)}
                                        </p>
                                    </div>
                                </Col>
                            )}
                        </Row>
                    </CardBody>
                </Card>
            )}

            {/* Informations administratives */}
            <Card className="mb-3">
                <CardHeader>
                    <h6 className="mb-0">
                        <i className="fa fa-info-circle text-primary me-2"></i>
                        INFORMATIONS ADMINISTRATIVES
                    </h6>
                </CardHeader>
                <CardBody>
                    <Row>
                        <Col md="6">
                            <div className="mb-3">
                                <strong>Numéro de demande:</strong>
                                <p className="mt-1 mb-0 text-dark">
                                    #{demande.id}
                                </p>
                            </div>
                        </Col>
                        <Col md="6">
                            <div className="mb-3">
                                <strong>Statut:</strong>
                                <p className="mt-1 mb-0">
                                    <Badge color={demande.status === 'approuve' ? 'success' : demande.status === 'rejete' ? 'danger' : 'warning'}>
                                        {demande.status === 'approuve' ? 'Approuvée' : demande.status === 'rejete' ? 'Rejetée' : 'En attente'}
                                    </Badge>
                                </p>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </div>
    );
};

export default CertificatRepriseServiceDetails;

