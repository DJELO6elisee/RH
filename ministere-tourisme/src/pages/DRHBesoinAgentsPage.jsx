import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getAuthHeaders } from '../config/api';
import {
    Container,
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Table,
    Badge,
    Button,
    Spinner,
    Alert,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Label,
    Input,
    Row,
    Col
} from 'reactstrap';
import { MdPersonAdd, MdCheckCircle, MdSchedule, MdRefresh, MdWork, MdEdit } from 'react-icons/md';

const DRHBesoinAgentsPage = () => {
    const { user } = useAuth();
    const [besoins, setBesoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // États pour le modal de satisfaction
    const [satisfaireModalOpen, setSatisfaireModalOpen] = useState(false);
    const [selectedBesoin, setSelectedBesoin] = useState(null);
    const [agentsSatisfaits, setAgentsSatisfaits] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Récupérer toutes les demandes "besoin_personnel"
    const loadBesoins = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // On utilise l'historique global pour récupérer toutes les demandes
            const response = await fetch(`${getApiUrl()}/api/demandes/historiques-global`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const besoinsData = result.data.filter(d => d.type_demande === 'besoin_personnel');
                    
                    // Trier par date la plus récente
                    besoinsData.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));
                    setBesoins(besoinsData);
                }
            } else {
                throw new Error('Erreur lors du chargement des demandes.');
            }
        } catch (err) {
            console.error('Erreur :', err);
            setError('Impossible de charger la liste des besoins en personnel.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.id_agent) {
            loadBesoins();
        }
    }, [user, refreshKey]);

    const handleOpenSatisfaireModal = (besoin) => {
        setSelectedBesoin(besoin);
        setAgentsSatisfaits(besoin.agents_satisfaits || 0);
        setSatisfaireModalOpen(true);
    };

    const handleCloseSatisfaireModal = () => {
        setSatisfaireModalOpen(false);
        setSelectedBesoin(null);
        setAgentsSatisfaits(0);
    };

    const handleSubmitSatisfaire = async () => {
        if (!selectedBesoin) return;

        try {
            setSubmitting(true);
            const response = await fetch(`${getApiUrl()}/api/demandes/${selectedBesoin.id}/satisfaire`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agents_satisfaits: parseInt(agentsSatisfaits, 10)
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setRefreshKey(prev => prev + 1);
                handleCloseSatisfaireModal();
            } else {
                throw new Error(result.message || 'Erreur lors de la mise à jour.');
            }
        } catch (err) {
            console.error('Erreur :', err);
            alert(err.message || 'Impossible de mettre à jour le nombre d\'agents affectés.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status, reste) => {
        if (reste === 0) {
            return <Badge color="primary" pill><MdCheckCircle className="me-1" /> Satisfait</Badge>;
        }
        switch (status) {
            case 'approuvee':
            case 'validé':
                return <Badge color="success" pill><MdCheckCircle className="me-1" /> Validé</Badge>;
            case 'en_attente':
                return <Badge color="warning" className="text-dark" pill><MdSchedule className="me-1" /> En attente</Badge>;
            case 'rejetee':
                return <Badge color="danger" pill>Refusé</Badge>;
            case 'satisfait':
                 return <Badge color="primary" pill><MdCheckCircle className="me-1" /> Satisfait</Badge>;
            default:
                return <Badge color="secondary" pill>{status}</Badge>;
        }
    };

    if (loading && besoins.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner color="primary" />
                <span className="ms-3 text-muted">Chargement des besoins en personnel...</span>
            </div>
        );
    }

    return (
        <Container fluid className="px-4 py-4 animate__animated animate__fadeIn">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold text-dark d-flex align-items-center mb-0">
                    <MdPersonAdd size={28} className="text-primary me-2" />
                    Gestion des Besoins en Personnel
                </h4>
                <Button color="light" className="shadow-sm" onClick={() => setRefreshKey(k => k + 1)}>
                    <MdRefresh size={20} className="me-1" /> Actualiser
                </Button>
            </div>

            <Card className="shadow-sm border-0" style={{ borderRadius: '15px' }}>
                <CardBody className="p-0">
                    {error && <Alert color="danger" className="m-3 text-center">{error}</Alert>}

                    {besoins.length === 0 && !error ? (
                        <div className="text-center py-5">
                            <MdPersonAdd size={64} className="text-light mb-3" />
                            <h5 className="text-muted">Aucune demande en cours</h5>
                            <p className="text-muted small">Les demandes de personnel s'afficheront ici.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="align-middle mb-0 text-nowrap" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                                <thead className="bg-light">
                                    <tr>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold">Date</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold">Agent Solliciteur</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold">Poste Souhaité</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold text-center">Nombre</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold text-center">Affectés</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold text-center">Reste</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold text-center">Statut</th>
                                        <th className="py-3 px-4 border-0 text-muted fw-bold text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(
                                        besoins.reduce((acc, besoin) => {
                                            const direction = besoin.service_nom || 'Direction non spécifiée';
                                            if (!acc[direction]) acc[direction] = [];
                                            acc[direction].push(besoin);
                                            return acc;
                                        }, {})
                                    ).map(([direction, directionBesoins]) => (
                                        <React.Fragment key={direction}>
                                            <tr className="bg-light">
                                                <td colSpan="8" className="py-2 px-4 border-0">
                                                    <span className="fw-bold text-primary">
                                                        {direction}
                                                    </span>
                                                    <Badge color="secondary" pill className="ms-2">{directionBesoins.length}</Badge>
                                                </td>
                                            </tr>
                                            {directionBesoins.map(besoin => {
                                                const nbDemande = parseInt(besoin.nombre_agents || 0);
                                                const nbSatisfait = parseInt(besoin.agents_satisfaits || 0);
                                                const reste = Math.max(0, nbDemande - nbSatisfait);
                                                
                                                return (
                                                    <tr key={besoin.id} style={{ transition: 'background-color 0.2s' }}>
                                                        <td className="px-4 py-3 border-0">{new Date(besoin.date_creation).toLocaleDateString()}</td>
                                                        <td className="px-4 py-3 border-0">
                                                            <div className="fw-bold">{besoin.agent_nom || besoin.nom} {besoin.agent_prenom || besoin.prenom}</div>
                                                        </td>
                                                        <td className="px-4 py-3 border-0">
                                                            <MdWork className="text-muted me-2" />
                                                            {besoin.poste_souhaite}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-0">
                                                            <span className="fw-bold">{nbDemande}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-0">
                                                            <Badge color="success">{nbSatisfait}</Badge>
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-0">
                                                            {reste > 0 ? (
                                                                <span className="text-danger fw-bold">{reste}</span>
                                                            ) : (
                                                                <span className="text-success"><MdCheckCircle /></span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-0">
                                                            {getStatusBadge(besoin.statut, reste)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center border-0">
                                                            <Button 
                                                                color="primary" 
                                                                outline 
                                                                size="sm" 
                                                                style={{ borderRadius: '20px' }}
                                                                onClick={() => handleOpenSatisfaireModal(besoin)}
                                                            >
                                                                <MdEdit className="me-1" />
                                                                Mettre à jour
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal de satisfaction des besoins */}
            <Modal isOpen={satisfaireModalOpen} toggle={handleCloseSatisfaireModal} centered>
                <ModalHeader toggle={handleCloseSatisfaireModal} className="bg-light border-0">
                    <MdPersonAdd className="me-2 text-primary" size={24} />
                    <strong>Validation de Recrutement</strong>
                </ModalHeader>
                <ModalBody className="p-4 bg-white">
                    {selectedBesoin && (
                        <>
                            <div className="mb-4">
                                <h6 className="text-muted mb-1">Poste souhaité par la direction :</h6>
                                <p className="lead fw-bold mb-0">{selectedBesoin.poste_souhaite}</p>
                            </div>
                            
                            <Row className="mb-4 g-3">
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded shadow-sm text-center">
                                        <span className="d-block text-muted small mb-1">Total Demandé</span>
                                        <h3 className="mb-0 text-primary">{selectedBesoin.nombre_agents}</h3>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="p-3 bg-light rounded shadow-sm text-center">
                                        <span className="d-block text-muted small mb-1">Reste à satisfaire</span>
                                        <h3 className="mb-0 text-danger">{Math.max(0, parseInt(selectedBesoin.nombre_agents) - parseInt(selectedBesoin.agents_satisfaits || 0))}</h3>
                                    </div>
                                </Col>
                            </Row>

                            <FormGroup>
                                <Label for="agentsSatisfaits" className="fw-bold">
                                    Nombre total d'agents affectés <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    id="agentsSatisfaits"
                                    min="0"
                                    max={selectedBesoin.nombre_agents}
                                    value={agentsSatisfaits}
                                    onChange={(e) => setAgentsSatisfaits(e.target.value)}
                                    className="border-primary py-2 text-center"
                                    style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
                                />
                                <small className="text-muted mt-2 d-block">
                                    Si vous avez affecté un agent, augmentez ce compteur. Dès qu'il atteindra le nombre total demandé, la demande sera considérée comme satisfaite.
                                </small>
                            </FormGroup>
                        </>
                    )}
                </ModalBody>
                <ModalFooter className="bg-light border-0">
                    <Button color="secondary" outline className="px-4" onClick={handleCloseSatisfaireModal}>Annuler</Button>
                    <Button color="primary" className="px-4 shadow-sm" onClick={handleSubmitSatisfaire} disabled={submitting}>
                        {submitting ? <Spinner size="sm" /> : 'Enregistrer'}
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>
    );
};

export default DRHBesoinAgentsPage;
