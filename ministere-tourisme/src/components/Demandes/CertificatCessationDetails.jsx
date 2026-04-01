import React from 'react';
import { Card, CardHeader, CardBody, Row, Col, Badge, Alert } from 'reactstrap';

const CertificatCessationDetails = ({ demande, agent }) => {
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
        <div className="certificat-cessation-details">
            {/* En-tête avec informations principales */}
            <Card className="mb-3 border-primary">
                <CardHeader className="bg-primary text-white">
                    <Row className="align-items-center">
                        <Col md="8">
                            <h5 className="mb-0">
                                <i className="fa fa-certificate me-2"></i>
                                CERTIFICAT DE CESSATION DE SERVICE
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
                                <strong className="text-primary">
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
                                <strong className="text-primary">
                                    <i className="fa fa-calendar-check me-2"></i>
                                    Date de cessation:
                                </strong>
                                <p className="mt-1 mb-0">
                                    <strong>{formatDate(demande.date_cessation || demande.agree_date_cessation)}</strong>
                                </p>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            {/* Motif de cessation */}
            <Card className="mb-3">
                <CardHeader>
                    <h6 className="mb-0">
                        <i className="fa fa-file-alt text-info me-2"></i>
                        MOTIF DE LA CESSATION
                    </h6>
                </CardHeader>
                <CardBody>
                    <div className="motif-section">
                        <p className="mb-0">
                            <strong>Type de cessation:</strong>
                        </p>
                        <p className="mt-1 text-dark">
                            {(() => {
                                const motif = demande.motif_conge || demande.motif || demande.agree_motif || 'Non renseigné';
                                const motifLower = motif.toLowerCase();
                                
                                // Afficher la durée pour les congés de maternité et de paternité
                                if (motifLower.includes('maternité') || motifLower.includes('maternite')) {
                                    return `${motif} - 6 mois (180 jours)`;
                                } else if (motifLower.includes('paternité') || motifLower.includes('paternite')) {
                                    return `${motif} - 1 mois (30 jours)`;
                                }
                                return motif;
                            })()}
                        </p>
                    </div>
                </CardBody>
            </Card>

            {/* Motif détaillé */}
            {demande.description && (
                <Card className="mb-3">
                    <CardHeader>
                        <h6 className="mb-0">
                            <i className="fa fa-align-left text-secondary me-2"></i>
                            MOTIF DÉTAILLÉ
                        </h6>
                    </CardHeader>
                    <CardBody>
                        <div className="description-section">
                            <p className="mb-0 text-dark">
                                {demande.description}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Informations administratives */}
            <Card className="mb-3">
                <CardHeader>
                    <h6 className="mb-0">
                        <i className="fa fa-info-circle text-success me-2"></i>
                        INFORMATIONS ADMINISTRATIVES
                    </h6>
                </CardHeader>
                <CardBody>
                    <Row>
                        <Col md="6">
                            <div className="mb-3">
                                <strong>Date de soumission:</strong>
                                <p className="mt-1 mb-0">
                                    <i className="fa fa-clock text-muted me-2"></i>
                                    {new Date(demande.date_creation).toLocaleString('fr-FR')}
                                </p>
                            </div>
                        </Col>
                        <Col md="6">
                            <div className="mb-3">
                                <strong>Statut actuel:</strong>
                                <p className="mt-1 mb-0">
                                    <Badge 
                                        color={
                                            demande.statut === 'finalise' ? 'success' :
                                            demande.statut === 'rejete' ? 'danger' :
                                            demande.statut === 'en_attente' ? 'warning' : 'info'
                                        }
                                    >
                                        {demande.statut === 'finalise' ? 'Finalisé' :
                                         demande.statut === 'rejete' ? 'Rejeté' :
                                         demande.statut === 'en_attente' ? 'En attente' : 'En cours'}
                                    </Badge>
                                </p>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            {/* Alertes spécifiques */}
            {demande.priorite === 'urgente' || demande.priorite === 'critique' ? (
                <Alert color={demande.priorite === 'critique' ? 'danger' : 'warning'} className="mb-3">
                    <i className={`fa ${priorityBadge.icon} me-2`}></i>
                    <strong>Attention:</strong> Cette demande est marquée comme{' '}
                    <strong>{demande.priorite}</strong> et nécessite un traitement prioritaire.
                </Alert>
            ) : null}

            {/* Informations sur le processus */}
            <Card className="border-light">
                <CardHeader className="bg-light">
                    <h6 className="mb-0">
                        <i className="fa fa-route text-info me-2"></i>
                        PROCESSUS DE VALIDATION
                    </h6>
                </CardHeader>
                <CardBody>
                    <div className="process-info">
                        <p className="mb-2">
                            <strong>Workflow:</strong> Agent → Sous-Directeur → DRH → Génération du certificat
                        </p>
                        <p className="mb-0 text-muted">
                            <small>
                                <i className="fa fa-info-circle me-1"></i>
                                Une fois validée par le DRH, le certificat de cessation sera généré automatiquement 
                                et transmis à l'agent concerné.
                            </small>
                        </p>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default CertificatCessationDetails;
