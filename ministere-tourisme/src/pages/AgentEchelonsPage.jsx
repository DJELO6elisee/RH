import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Table,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    Row,
    Col,
    Alert,
    Spinner
} from 'reactstrap';
import Page from '../components/Page';
import { useAuth } from '../contexts/AuthContext';
import '../styles/table-styles.css';

const AgentEchelonsPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [echelons, setEchelons] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoadRef = useRef(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal states
    const [modal, setModal] = useState(false);
    const [modalEchelons, setModalEchelons] = useState(false);
    const [modalEdit, setModalEdit] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedAgentEchelons, setSelectedAgentEchelons] = useState([]);
    const [selectedEchelon, setSelectedEchelon] = useState(null);
    const [loadingEchelons, setLoadingEchelons] = useState(false);
    const [formData, setFormData] = useState({
        id_echelon: '',
        date_entree: '',
        nature: '',
        numero: '',
        date_signature: ''
    });
    const [editFormData, setEditFormData] = useState({
        id_echelon: '',
        date_entree: '',
        nature: '',
        numero: '',
        date_signature: ''
    });
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Debounce du terme de recherche
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Réinitialiser la page à 1 quand debouncedSearchTerm change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    const fetchAgents = useCallback(async () => {
        try {
            if (isInitialLoadRef.current) {
                setLoading(true);
            }
            setError(null);
            const token = localStorage.getItem('token');
            const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/echelons-agents/agents?page=${currentPage}&limit=${itemsPerPage}${searchParam}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const data = await response.json();
            setAgents(data.data);
            // Gérer différentes structures de réponse API
            const pagination = data.pagination || data.meta || {};
            // Le backend retourne total_pages, pas totalPages
            const totalPagesValue = pagination.total_pages || pagination.totalPages || Math.ceil((pagination.total || 0) / itemsPerPage) || 1;
            const totalItemsValue = pagination.total || pagination.totalCount || pagination.totalItems || 0;
            console.log('📄 Pagination - totalPages:', totalPagesValue, 'totalItems:', totalItemsValue, 'pagination object:', pagination);
            setTotalPages(totalPagesValue);
            setTotalItems(totalItemsValue);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [currentPage, debouncedSearchTerm, itemsPerPage]);

    // Charger les échelons une seule fois au montage
    useEffect(() => {
        fetchEchelons();
    }, []);

    // Charger les agents quand les dépendances changent
    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const fetchEchelons = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/echelons/select/all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const echelonsList = await response.json();
                setEchelons(echelonsList);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des échelons:', error);
        }
    };

    const toggleModal = (agent = null) => {
        setSelectedAgent(agent);
        setModal(!modal);
        if (!modal && agent) {
            setFormData({
                id_echelon: '',
                date_entree: '',
                nature: '',
                numero: '',
                date_signature: ''
            });
        }
    };

    const toggleModalEchelons = async (agent = null) => {
        if (agent && !modalEchelons) {
            setLoadingEchelons(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/echelons-agents/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentEchelons(data.data || []);
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || 'Erreur lors du chargement des échelons');
                }
            } catch (error) {
                setError('Erreur lors du chargement des échelons');
            } finally {
                setLoadingEchelons(false);
            }
        }
        setSelectedAgent(agent);
        setModalEchelons(!modalEchelons);
        
        if (modalEchelons && !agent) {
            setSelectedAgentEchelons([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/echelons-agents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    id_agent: selectedAgent.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de l\'attribution de l\'échelon');
            }

            setSuccess('Échelon attribué avec succès');
            setModal(false);
            fetchAgents();
            if (modalEchelons && selectedAgent) {
                toggleModalEchelons(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const toggleModalEdit = (echelon = null) => {
        if (echelon) {
            setSelectedEchelon(echelon);
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };
            
            let idEchelon = '';
            if (echelon.id_echelon !== null && echelon.id_echelon !== undefined) {
                idEchelon = String(echelon.id_echelon);
            } else if (echelon.echelon_libele) {
                const foundEchelon = echelons.find(e => e.libele === echelon.echelon_libele.trim());
                if (foundEchelon) {
                    idEchelon = String(foundEchelon.id);
                }
            }
            
            setEditFormData({
                id_echelon: idEchelon,
                date_entree: formatDateForInput(echelon.date_entree || echelon.created_at),
                nature: echelon.nature || '',
                numero: echelon.numero || '',
                date_signature: formatDateForInput(echelon.date_signature)
            });
            setModalEdit(true);
        } else {
            setSelectedEchelon(null);
            setModalEdit(false);
            setEditFormData({
                id_echelon: '',
                date_entree: '',
                nature: '',
                numero: '',
                date_signature: ''
            });
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/echelons-agents/${selectedEchelon.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editFormData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification de l\'échelon');
            }

            setSuccess('Échelon modifié avec succès');
            setModalEdit(false);
            fetchAgents();
            if (modalEchelons && selectedAgent) {
                toggleModalEchelons(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <Page title="Gestion des Échelons">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner color="primary" />
                </div>
            </Page>
        );
    }

    return (
        <Page title="Gestion des Échelons">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <div className="d-flex justify-content-between align-items-center">
                                <h4 className="mb-0">Liste des Agents</h4>
                                <div className="d-flex gap-2">
                                    <Input
                                        type="text"
                                        placeholder="Rechercher un agent..."
                                        value={searchTerm}
                                        onChange={handleSearch}
                                        className="form-control-sm"
                                        style={{ width: '250px', textTransform: 'uppercase' }}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {error && (
                                <Alert color="danger" className="mb-3" onClose={() => setError(null)} toggle>
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert color="success" className="mb-3" onClose={() => setSuccess(null)} toggle>
                                    {success}
                                </Alert>
                            )}
                            
                            <div className="table-responsive">
                                <Table hover>
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Matricule</th>
                                            <th>Nom</th>
                                            <th>Prénoms</th>
                                            <th>Nb. Échelons</th>
                                            <th>Dernier Échelon</th>
                                            <th>Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents.map((agent, index) => (
                                            <tr key={agent.id}>
                                                <td className="fw-bold text-center">
                                                    {((currentPage - 1) * itemsPerPage) + index + 1}
                                                </td>
                                                <td className="fw-bold">{agent.matricule || 'N/A'}</td>
                                                <td className="fw-bold">{agent.nom}</td>
                                                <td>{agent.prenom}</td>
                                                <td className="fw-bold text-center">
                                                    {agent.nb_echelons || 0}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const nbEchelons = parseInt(agent.nb_echelons) || 0;
                                                        if (nbEchelons > 0) {
                                                            return (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span>{agent.dernier_echelon_nom || '-'}</span>
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => toggleModalEchelons(agent)}
                                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                    >
                                                                        {nbEchelons > 1 ? 'Voir' : 'Voir/Modifier'}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }
                                                        return <span className="text-muted">Aucun échelon</span>;
                                                    })()}
                                                </td>
                                                <td>
                                                    {agent.dernier_echelon_date ? formatDate(agent.dernier_echelon_date) : '-'}
                                                </td>
                                                <td>
                                                    <Button
                                                        color="secondary"
                                                        size="sm"
                                                        onClick={() => toggleModal(agent)}
                                                        style={{ backgroundColor: 'black', borderColor: 'black', color: 'white' }}
                                                    >
                                                        Attribuer Échelon
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" style={{ width: '100%' }}>
                                <div className="d-flex align-items-center" style={{ flexShrink: 0 }}>
                                    <span className="me-2">Afficher</span>
                                    <select 
                                        className="form-select form-select-sm me-2" 
                                        style={{width: '70px'}}
                                        value={itemsPerPage}
                                        onChange={handleItemsPerPageChange}
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span>éléments par page</span>
                                </div>
                                
                                <div className="d-flex align-items-center gap-2 flex-wrap" style={{ 
                                    flex: '1 1 auto', 
                                    justifyContent: 'flex-end', 
                                    minWidth: 0
                                }}>
                                    <span className="text-nowrap" style={{ flexShrink: 0, marginRight: '1rem' }}>
                                        Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} éléments
                                    </span>
                                    
                                    <div style={{ 
                                        maxWidth: '100%', 
                                        overflowX: 'auto', 
                                        overflowY: 'hidden',
                                        WebkitOverflowScrolling: 'touch',
                                        flexShrink: 1,
                                        minWidth: 0
                                    }}>
                                        <nav>
                                            <ul className="pagination pagination-sm mb-0" style={{ 
                                                margin: 0, 
                                                flexWrap: 'nowrap', 
                                                display: 'flex',
                                                width: 'max-content'
                                            }}>
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                    >
                                                        Précédent
                                                    </button>
                                                </li>
                                                
                                                {/* Affichage de toutes les pages */}
                                                {totalPages > 0 ? (
                                                    Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                        <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`} style={{ flexShrink: 0 }}>
                                                            <button 
                                                                className="page-link" 
                                                                onClick={() => setCurrentPage(page)}
                                                                style={{ minWidth: '40px', cursor: 'pointer' }}
                                                            >
                                                                {page}
                                                            </button>
                                                        </li>
                                                    ))
                                                ) : (
                                                    <li className="page-item active" style={{ flexShrink: 0 }}>
                                                        <span className="page-link">1</span>
                                                    </li>
                                                )}
                                                
                                                <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage === totalPages || totalPages === 0}
                                                    >
                                                        Suivant
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal pour attribuer un échelon */}
            <Modal isOpen={modal} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    Attribuer un échelon à {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="id_echelon">Échelon *</Label>
                                    <Input
                                        type="select"
                                        name="id_echelon"
                                        id="id_echelon"
                                        value={formData.id_echelon}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner un échelon</option>
                                        {echelons.map(echelon => (
                                            <option key={echelon.id} value={echelon.id}>
                                                {echelon.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_entree">Date d'entrée</Label>
                                    <Input
                                        type="date"
                                        name="date_entree"
                                        id="date_entree"
                                        value={formData.date_entree}
                                        onChange={handleInputChange}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="nature">Nature de l'acte</Label>
                                    <Input
                                        type="text"
                                        name="nature"
                                        id="nature"
                                        value={formData.nature}
                                        onChange={handleInputChange}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="numero">Numéro de l'acte</Label>
                                    <Input
                                        type="text"
                                        name="numero"
                                        id="numero"
                                        value={formData.numero}
                                        onChange={handleInputChange}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_signature">Date de signature</Label>
                                    <Input
                                        type="date"
                                        name="date_signature"
                                        id="date_signature"
                                        value={formData.date_signature}
                                        onChange={handleInputChange}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModal}>Annuler</Button>
                        <Button color="primary" type="submit">Attribuer l'échelon</Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modal pour voir tous les échelons d'un agent */}
            <Modal isOpen={modalEchelons} toggle={toggleModalEchelons} size="lg">
                <ModalHeader toggle={toggleModalEchelons}>
                    Échelons de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {loadingEchelons ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des échelons...</p>
                        </div>
                    ) : selectedAgentEchelons.length > 0 ? (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Échelon</th>
                                    <th>Date d'entrée</th>
                                    <th>Date de sortie</th>
                                    <th>Date de signature</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentEchelons.map((echelon, index) => (
                                    <tr key={echelon.id}>
                                        <td className="fw-bold">{index + 1}</td>
                                        <td className="fw-bold">
                                            {echelon.echelon_libele || 'N/A'}
                                        </td>
                                        <td>{formatDate(echelon.date_entree || echelon.created_at)}</td>
                                        <td>{formatDate(echelon.date_sortie)}</td>
                                        <td>{formatDate(echelon.date_signature)}</td>
                                        <td>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                onClick={() => toggleModalEdit(echelon)}
                                            >
                                                <i className="fa fa-edit me-1"></i>
                                                Modifier
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert color="info" className="mb-0">
                            Aucun échelon trouvé pour cet agent.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleModalEchelons}>Fermer</Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour modifier un échelon */}
            <Modal isOpen={modalEdit} toggle={toggleModalEdit} size="lg">
                <ModalHeader toggle={toggleModalEdit}>
                    Modifier l'échelon de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleEditSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_id_echelon">Échelon *</Label>
                                    <Input
                                        type="select"
                                        name="id_echelon"
                                        id="edit_id_echelon"
                                        value={editFormData.id_echelon ? String(editFormData.id_echelon) : ''}
                                        onChange={handleEditInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner un échelon</option>
                                        {echelons.map(echelon => (
                                            <option key={echelon.id} value={echelon.id}>
                                                {echelon.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_entree">Date d'entrée *</Label>
                                    <Input
                                        type="date"
                                        name="date_entree"
                                        id="edit_date_entree"
                                        value={editFormData.date_entree}
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="edit_nature">Nature de l'acte</Label>
                                    <Input
                                        type="text"
                                        name="nature"
                                        id="edit_nature"
                                        value={editFormData.nature}
                                        onChange={handleEditInputChange}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_numero">Numéro de l'acte</Label>
                                    <Input
                                        type="text"
                                        name="numero"
                                        id="edit_numero"
                                        value={editFormData.numero}
                                        onChange={handleEditInputChange}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_signature">Date de signature</Label>
                                    <Input
                                        type="date"
                                        name="date_signature"
                                        id="edit_date_signature"
                                        value={editFormData.date_signature}
                                        onChange={handleEditInputChange}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModalEdit}>Annuler</Button>
                        <Button color="primary" type="submit">Enregistrer les modifications</Button>
                    </ModalFooter>
                </Form>
            </Modal>
        </Page>
    );
};

export default AgentEchelonsPage;

