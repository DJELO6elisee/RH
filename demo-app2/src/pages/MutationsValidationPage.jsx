import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardBody,
    Table,
    Badge,
    Button,
    Row,
    Col,
    Input,
    Label,
    Alert,
    Spinner,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup
} from 'reactstrap';
import { useAuth } from '../contexts/AuthContext';
import { MdSwapHoriz, MdInfo, MdCheckCircle, MdCancel } from 'react-icons/md';

const MutationsValidationPage = () => {
    const { user } = useAuth();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [validationSuccess, setValidationSuccess] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [validationAction, setValidationAction] = useState('');
    const [validationCommentaire, setValidationCommentaire] = useState('');
    const [filters, setFilters] = useState({
        statut: 'en_attente',
        agent_search: ''
    });
    
    const isMountedRef = useRef(true);

    useEffect(() => {
        if (user?.id_agent) {
            loadMutations();
        }
        return () => {
            isMountedRef.current = false;
        };
    }, [user?.id_agent, filters]);

    const loadMutations = async () => {
        if (!isMountedRef.current) return;

        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            queryParams.append('type_demande', 'mutation');
            queryParams.append('niveau_actuel', 'drh');
            if (filters.statut) {
                queryParams.append('statut', filters.statut);
            }
            if (filters.agent_search) {
                queryParams.append('agent_search', filters.agent_search);
            }

            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/en-attente/${user.id_agent}?${queryParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des demandes de mutation');
            }

            const data = await response.json();
            if (isMountedRef.current) {
                setDemandes(data.data || []);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des mutations:', err);
            if (isMountedRef.current) {
                setError(err.message);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const handleValidateDemande = async (demandeId, action, commentaire) => {
        try {
            const token = localStorage.getItem('token');
            
            // Pour les mutations approuvées, la date d'effet sera automatiquement la date de validation
            const requestBody = {
                action: action || 'approuve',
                commentaire: commentaire || '',
                generate_document: (action === 'approuve' || action === 'valider' || !action)
            };

            // Pour les mutations, le backend utilisera automatiquement la date actuelle comme date d'effet
            // Pas besoin d'envoyer date_effet_mutation, le backend le fera automatiquement

            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/${demandeId}/valider`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erreur lors de la validation');
            }

            setValidationSuccess(true);
            setValidationMessage(result.message || 'Demande validée avec succès');
            setTimeout(() => {
                setValidationSuccess(false);
                setValidationMessage('');
            }, 5000);

            // Recharger la liste
            await loadMutations();
            return result;
        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            throw error;
        }
    };

    const handleViewDetails = (demande) => {
        setSelectedDemande(demande);
        setShowDetailsModal(true);
    };

    const handleValidateClick = (demande) => {
        setSelectedDemande(demande);
        setValidationAction('');
        setValidationCommentaire('');
        setShowValidationModal(true);
    };

    const getStatusBadge = (statut) => {
        const statusConfig = {
            'en_attente': { color: 'warning', text: 'En attente' },
            'approuve': { color: 'success', text: 'Approuvé' },
            'rejete': { color: 'danger', text: 'Rejeté' },
            'en_cours': { color: 'info', text: 'En cours' }
        };
        const config = statusConfig[statut] || { color: 'secondary', text: statut };
        return <Badge color={config.color}>{config.text}</Badge>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Spinner color="primary" />
                <span className="ms-2">Chargement des demandes de mutation...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                <h4 className="alert-heading">Erreur</h4>
                <p>{error}</p>
                <Button color="primary" onClick={loadMutations}>
                    Réessayer
                </Button>
            </Alert>
        );
    }

    return (
        <div className="container-fluid mt-4">
            {validationSuccess && (
                <Alert color="success" className="mb-3">
                    <MdCheckCircle className="me-2" />
                    {validationMessage}
                </Alert>
            )}

            <Card>
                <CardHeader style={{ background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: 'white' }}>
                    <CardTitle className="mb-0 d-flex align-items-center">
                        <MdSwapHoriz className="me-2" style={{ fontSize: '1.5rem' }} />
                        <span style={{ fontWeight: 'bold' }}>Validation des Demandes de Mutation</span>
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    {/* Filtres */}
                    <Row className="mb-3">
                        <Col md="4">
                            <Label for="statut">Statut</Label>
                            <Input
                                type="select"
                                id="statut"
                                value={filters.statut}
                                onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                            >
                                <option value="">Tous les statuts</option>
                                <option value="en_attente">En attente</option>
                                <option value="approuve">Approuvé</option>
                                <option value="rejete">Rejeté</option>
                            </Input>
                        </Col>
                        <Col md="4">
                            <Label for="agent_search">Rechercher un agent</Label>
                            <Input
                                type="text"
                                id="agent_search"
                                placeholder="Nom, prénom ou matricule..."
                                value={filters.agent_search}
                                onChange={(e) => setFilters(prev => ({ ...prev, agent_search: e.target.value }))}
                            />
                        </Col>
                        <Col md="4" className="d-flex align-items-end">
                            <Button color="primary" onClick={loadMutations} className="w-100">
                                Filtrer
                            </Button>
                        </Col>
                    </Row>

                    {/* Liste des demandes */}
                    {demandes.length === 0 ? (
                        <Alert color="info">
                            <MdInfo className="me-2" />
                            Aucune demande de mutation en attente de validation.
                        </Alert>
                    ) : (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Direction actuelle</th>
                                    <th>Direction de destination</th>
                                    <th>Motif</th>
                                    <th>Date de demande</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {demandes.map((demande) => (
                                    <tr key={demande.id}>
                                        <td>
                                            <strong>{demande.agent_prenom} {demande.agent_nom}</strong>
                                            <br />
                                            <small className="text-muted">Matricule: {demande.agent_matricule}</small>
                                        </td>
                                        <td>{demande.direction_libelle || 'N/A'}</td>
                                        <td>
                                            <strong className="text-primary">
                                                {demande.direction_destination_libelle || demande.id_direction_destination || 'N/A'}
                                            </strong>
                                        </td>
                                        <td>
                                            <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {demande.description || 'Aucun motif renseigné'}
                                            </div>
                                        </td>
                                        <td>{formatDate(demande.date_creation)}</td>
                                        <td>{getStatusBadge(demande.statut)}</td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    color="info"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(demande)}
                                                >
                                                    <i className="fa fa-eye me-1"></i>
                                                    Détails
                                                </Button>
                                                {demande.statut === 'en_attente' && (
                                                    <Button
                                                        color="success"
                                                        size="sm"
                                                        onClick={() => handleValidateClick(demande)}
                                                    >
                                                        <i className="fa fa-check me-1"></i>
                                                        Valider
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </CardBody>
            </Card>

            {/* Modal de validation */}
            <Modal isOpen={showValidationModal} toggle={() => {
                setShowValidationModal(false);
            }} size="lg">
                <ModalHeader toggle={() => {
                    setShowValidationModal(false);
                }}>
                    <MdSwapHoriz className="me-2" />
                    Valider la demande de mutation
                </ModalHeader>
                <ModalBody>
                    {selectedDemande && (
                        <>
                            <Alert color="info">
                                <MdInfo className="me-2" />
                                <strong>Agent:</strong> {selectedDemande.agent_prenom} {selectedDemande.agent_nom} 
                                ({selectedDemande.agent_matricule})
                                <br />
                                <strong>Direction actuelle:</strong> {selectedDemande.direction_libelle || 'N/A'}
                                <br />
                                <strong>Direction de destination:</strong> {selectedDemande.direction_destination_libelle || selectedDemande.id_direction_destination}
                                <br />
                                <strong>Motif:</strong> {selectedDemande.description || 'Aucun motif renseigné'}
                            </Alert>

                            {validationAction === 'approuve' && (
                                <Alert color="warning" className="mt-3">
                                    <strong>Note importante:</strong> La date d'effet de la mutation sera automatiquement définie à la date de validation (aujourd'hui).
                                </Alert>
                            )}

                            <Form>
                                <FormGroup>
                                    <Label for="action_validation">Action *</Label>
                                    <Input
                                        type="select"
                                        id="action_validation"
                                        value={validationAction}
                                        onChange={(e) => setValidationAction(e.target.value)}
                                    >
                                        <option value="">Sélectionner une action</option>
                                        <option value="approuve">Approuver</option>
                                        <option value="rejete">Rejeter</option>
                                    </Input>
                                </FormGroup>

                                <FormGroup>
                                    <Label for="commentaire_validation">
                                        {validationAction === 'rejete' ? 'Motif du rejet *' : 'Commentaire'}
                                    </Label>
                                    <Input
                                        type="textarea"
                                        id="commentaire_validation"
                                        rows="4"
                                        value={validationCommentaire}
                                        onChange={(e) => setValidationCommentaire(e.target.value)}
                                        placeholder={validationAction === 'rejete' ? 'Veuillez saisir le motif du rejet (obligatoire)' : 'Ajoutez un commentaire (optionnel)'}
                                        required={validationAction === 'rejete'}
                                    />
                                </FormGroup>
                            </Form>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => {
                        setShowValidationModal(false);
                        setValidationAction('');
                        setValidationCommentaire('');
                    }}>
                        Annuler
                    </Button>
                    <Button
                        color={validationAction === 'approuve' ? 'success' : validationAction === 'rejete' ? 'danger' : 'primary'}
                        onClick={async () => {
                            if (!validationAction) {
                                alert('Veuillez sélectionner une action');
                                return;
                            }
                            if (validationAction === 'rejete' && !validationCommentaire.trim()) {
                                alert('Veuillez saisir le motif du rejet');
                                return;
                            }
                            try {
                                await handleValidateDemande(selectedDemande.id, validationAction, validationCommentaire);
                                setShowValidationModal(false);
                                setValidationAction('');
                                setValidationCommentaire('');
                            } catch (err) {
                                alert('Erreur lors de la validation: ' + err.message);
                            }
                        }}
                        disabled={!validationAction || (validationAction === 'rejete' && !validationCommentaire.trim())}
                    >
                        {validationAction === 'approuve' ? 'Approuver' : validationAction === 'rejete' ? 'Rejeter' : 'Valider'}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal de détails */}
            <Modal isOpen={showDetailsModal} toggle={() => setShowDetailsModal(false)} size="lg">
                <ModalHeader toggle={() => setShowDetailsModal(false)}>
                    Détails de la demande de mutation
                </ModalHeader>
                <ModalBody>
                    {selectedDemande && (
                        <div>
                            <Row className="mb-3">
                                <Col md="6">
                                    <strong>Agent:</strong>
                                    <p>{selectedDemande.agent_prenom} {selectedDemande.agent_nom}</p>
                                </Col>
                                <Col md="6">
                                    <strong>Matricule:</strong>
                                    <p>{selectedDemande.agent_matricule}</p>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md="6">
                                    <strong>Direction actuelle:</strong>
                                    <p>{selectedDemande.direction_libelle || 'N/A'}</p>
                                </Col>
                                <Col md="6">
                                    <strong>Direction de destination:</strong>
                                    <p className="text-primary">
                                        <strong>{selectedDemande.direction_destination_libelle || selectedDemande.id_direction_destination || 'N/A'}</strong>
                                    </p>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col>
                                    <strong>Motif:</strong>
                                    <p>{selectedDemande.description || 'Aucun motif renseigné'}</p>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md="6">
                                    <strong>Date de demande:</strong>
                                    <p>{formatDate(selectedDemande.date_creation)}</p>
                                </Col>
                                <Col md="6">
                                    <strong>Statut:</strong>
                                    <p>{getStatusBadge(selectedDemande.statut)}</p>
                                </Col>
                            </Row>
                            {selectedDemande.date_debut && (
                                <Row className="mb-3">
                                    <Col>
                                        <strong>Date d'effet (date de validation):</strong>
                                        <p>{formatDate(selectedDemande.date_debut)}</p>
                                    </Col>
                                </Row>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowDetailsModal(false)}>
                        Fermer
                    </Button>
                    {selectedDemande && selectedDemande.statut === 'en_attente' && (
                        <Button
                            color="success"
                            onClick={() => {
                                setShowDetailsModal(false);
                                handleValidateClick(selectedDemande);
                            }}
                        >
                            <i className="fa fa-check me-1"></i>
                            Valider
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default MutationsValidationPage;
