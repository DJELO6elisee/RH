import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Row,
    Col,
    Alert,
    Spinner
} from 'reactstrap';
import { useAuth } from '../../contexts/AuthContext';

const DemandeDetailsNew = ({ isOpen, toggle, demande, onValidationSuccess }) => {
    const { user } = useAuth();
    const [demandeDetails, setDemandeDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && demande) {
            loadDemandeDetails();
        }
    }, [isOpen, demande]);

    const loadDemandeDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/${demande.id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des détails');
            }

            const data = await response.json();
            setDemandeDetails(data.data);
        } catch (err) {
            console.error('Erreur lors de la récupération des détails:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Non spécifiée';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const canValidateDemandes = () => {
        const canValidate = user?.role === 'drh' || user?.role === 'sous_directeur' || user?.role === 'chef_service';
        console.log('🔍 Debug validation:', {
            userRole: user?.role,
            canValidate,
            demandeStatus: demandeData?.status,
            demandeNiveau: demandeData?.niveau_evolution_demande
        });
        return canValidate;
    };

    const handleValidation = (action) => {
        // Logique de validation - à implémenter selon vos besoins
        console.log(`Validation ${action} pour la demande ${demande.id}`);
        if (onValidationSuccess) {
            onValidationSuccess();
        }
        toggle();
    };

    if (loading) {
        return (
            <Modal isOpen={isOpen} toggle={toggle} size="lg">
                <ModalHeader toggle={toggle}>
                    <i className="fa fa-file-text me-2"></i>
                    Détails de la demande
                </ModalHeader>
                <ModalBody className="text-center py-4">
                    <Spinner color="primary" />
                    <p className="mt-2">Chargement des détails...</p>
                </ModalBody>
            </Modal>
        );
    }

    if (error) {
        return (
            <Modal isOpen={isOpen} toggle={toggle} size="lg">
                <ModalHeader toggle={toggle}>
                    <i className="fa fa-file-text me-2"></i>
                    Détails de la demande
                </ModalHeader>
                <ModalBody>
                    <Alert color="danger">
                        <h5>Erreur</h5>
                        <p>{error}</p>
                        <Button color="primary" onClick={loadDemandeDetails}>
                            Réessayer
                        </Button>
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggle}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    // Utiliser les données détaillées si disponibles, sinon les données de base
    const details = demandeDetails || { demande, agent: {}, service: {}, ministere: {} };
    const demandeData = details.demande || demande;
    const agentData = details.agent || {};
    const serviceData = details.service || {};
    const ministereData = details.ministere || {};

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="lg">
            <ModalHeader toggle={toggle}>
                <i className="fa fa-file-text me-2"></i>
                Détails de la demande - {demandeData.type_demande?.replace(/_/g, ' ').toUpperCase()}
            </ModalHeader>
            <ModalBody>
                <Row>
                    <Col md="6">
                        <div className="mb-4">
                            <h6 className="text-primary mb-3">
                                <i className="fa fa-user me-2"></i>
                                INFORMATIONS DE L'AGENT
                            </h6>
                            <div className="border p-3 rounded">
                                <p className="mb-2"><strong>Nom:</strong> {agentData.prenom} {agentData.nom}</p>
                                <p className="mb-2"><strong>Matricule:</strong> {agentData.matricule}</p>
                                <p className="mb-2"><strong>Email:</strong> {agentData.email || 'Non renseigné'}</p>
                                <p className="mb-2"><strong>Service:</strong> {serviceData.nom || 'Non renseigné'}</p>
                                <p className="mb-0"><strong>Ministère:</strong> {ministereData.nom || 'Non renseigné'}</p>
                            </div>
                        </div>
                    </Col>
                    <Col md="6">
                        <div className="mb-4">
                            <h6 className="text-primary mb-3">
                                <i className="fa fa-info-circle me-2"></i>
                                DÉTAILS DE LA DEMANDE
                            </h6>
                            <div className="border p-3 rounded">
                                <p className="mb-2"><strong>Type:</strong> {demandeData.type_demande?.replace(/_/g, ' ').toUpperCase()}</p>
                                <p className="mb-2"><strong>Statut:</strong> {demandeData.status || 'En attente'}</p>
                                <p className="mb-2"><strong>Niveau:</strong> {demandeData.niveau_evolution_demande || 'Non défini'}</p>
                                <p className="mb-2"><strong>Priorité:</strong> {demandeData.priorite || 'normale'}</p>
                                <p className="mb-0"><strong>Date création:</strong> {formatDate(demandeData.date_creation)}</p>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* Informations spécifiques pour les certificats de cessation */}
                {demandeData.type_demande === 'certificat_cessation' && (
                    <Row>
                        <Col>
                            <div className="mb-4">
                                <h6 className="text-primary mb-3">
                                    <i className="fa fa-calendar-times me-2"></i>
                                    DÉTAILS DE CESSATION
                                </h6>
                                <div className="border p-3 rounded">
                                    <p className="mb-2"><strong>Motif de cessation:</strong> {demandeData.agree_motif || 'Non spécifié'}</p>
                                    <p className="mb-0"><strong>Date de cessation:</strong> {demandeData.agree_date_cessation ? formatDate(demandeData.agree_date_cessation) : 'Non spécifiée'}</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}

                {/* Informations spécifiques pour les demandes de sortie du territoire */}
                {demandeData.type_demande === 'sortie_territoire' && (
                    <Row>
                        <Col>
                            <div className="mb-4">
                                <h6 className="text-primary mb-3">
                                    <i className="fa fa-plane me-2"></i>
                                    DÉTAILS DE SORTIE DU TERRITOIRE
                                </h6>
                                <div className="border p-3 rounded">
                                    <p className="mb-2"><strong>Destination:</strong> {demandeData.lieu || 'Non spécifiée'}</p>
                                    <p className="mb-2"><strong>Date de départ:</strong> {demandeData.date_debut ? formatDate(demandeData.date_debut) : 'Non spécifiée'}</p>
                                    <p className="mb-2"><strong>Date de retour:</strong> {demandeData.date_fin ? formatDate(demandeData.date_fin) : 'Non spécifiée'}</p>
                                    <p className="mb-0"><strong>Durée:</strong> {demandeData.date_debut && demandeData.date_fin ? 
                                        Math.ceil((new Date(demandeData.date_fin) - new Date(demandeData.date_debut)) / (1000 * 60 * 60 * 24)) + 1 + ' jour(s)' : 
                                        'Non calculable'}</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}

                {/* Informations spécifiques pour les demandes d'absence */}
                {demandeData.type_demande === 'absence' && (
                    <Row>
                        <Col>
                            <div className="mb-4">
                                <h6 className="text-primary mb-3">
                                    <i className="fa fa-calendar-minus me-2"></i>
                                    DÉTAILS D'ABSENCE
                                </h6>
                                <div className="border p-3 rounded">
                                    <p className="mb-2"><strong>Lieu d'absence:</strong> {demandeData.lieu || 'Non spécifié'}</p>
                                    <p className="mb-2"><strong>Date de début:</strong> {demandeData.date_debut ? formatDate(demandeData.date_debut) : 'Non spécifiée'}</p>
                                    <p className="mb-2"><strong>Date de fin:</strong> {demandeData.date_fin ? formatDate(demandeData.date_fin) : 'Non spécifiée'}</p>
                                    <p className="mb-0"><strong>Durée:</strong> {demandeData.date_debut && demandeData.date_fin ? 
                                        Math.ceil((new Date(demandeData.date_fin) - new Date(demandeData.date_debut)) / (1000 * 60 * 60 * 24)) + 1 + ' jour(s)' : 
                                        'Non calculable'}</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}

                {demandeData.type_demande === 'certificat_reprise_service' && (
                    <Row>
                        <Col>
                            <div className="mb-4">
                                <h6 className="text-primary mb-3">
                                    <i className="fa fa-undo me-2"></i>
                                    REPRISE DE SERVICE
                                </h6>
                                <div className="border p-3 rounded">
                                    <p className="mb-2"><strong>Date de fin de congés:</strong> {demandeData.date_fin_conges ? formatDate(demandeData.date_fin_conges) : 'Non spécifiée'}</p>
                                    <p className="mb-0"><strong>Date de reprise de service:</strong> {demandeData.date_reprise_service ? formatDate(demandeData.date_reprise_service) : 'Non spécifiée'}</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}

                {/* Motif */}
                {demandeData.description && (
                    <Row>
                        <Col>
                            <div className="mb-4">
                                <h6 className="text-primary mb-3">
                                    <i className="fa fa-align-left me-2"></i>
                                    MOTIF
                                </h6>
                                <div className="border p-3 rounded">
                                    <p className="mb-0">{demandeData.description}</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                )}
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    <i className="fa fa-times me-2"></i>
                    Fermer
                </Button>
                {canValidateDemandes() && (
                    <>
                        <Button color="success" onClick={() => handleValidation('approuve')}>
                            <i className="fa fa-check me-2"></i>
                            Valider
                        </Button>
                        <Button color="danger" onClick={() => handleValidation('rejete')}>
                            <i className="fa fa-times me-2"></i>
                            Rejeter
                        </Button>
                    </>
                )}
            </ModalFooter>
        </Modal>
    );
};

export default DemandeDetailsNew;