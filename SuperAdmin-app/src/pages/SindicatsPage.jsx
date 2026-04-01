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
    Spinner,
    Badge
} from 'reactstrap';
import Page from '../components/Page';
import { useAuth } from '../contexts/AuthContext';
import '../styles/table-styles.css';

const SindicatsPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [associations, setAssociations] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoadRef = useRef(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal states
    const [modal, setModal] = useState(false);
    const [modalAssociations, setModalAssociations] = useState(false);
    const [modalEdit, setModalEdit] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedAgentAssociations, setSelectedAgentAssociations] = useState([]);
    const [selectedAssociation, setSelectedAssociation] = useState(null);
    const [loadingAssociations, setLoadingAssociations] = useState(false);
    const [formData, setFormData] = useState({
        id_sindicat: '',
        date_adhesion: '',
        date_fin: '',
        role: '',
        statut: 'actif'
    });
    const [editFormData, setEditFormData] = useState({
        id_sindicat: '',
        date_adhesion: '',
        date_fin: '',
        role: '',
        statut: 'actif'
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
            // Ne mettre loading à true que lors du chargement initial
            if (isInitialLoadRef.current) {
                setLoading(true);
            }
            setError(null);
            const token = localStorage.getItem('token');
            const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/agents?page=${currentPage}&limit=${itemsPerPage}${searchParam}`, {
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
            setTotalPages(data.pagination.total_pages);
            setTotalItems(data.pagination.total);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
            // Désactiver le chargement initial après le premier chargement réussi
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [currentPage, debouncedSearchTerm, itemsPerPage]);

    // Charger les associations une seule fois au montage
    useEffect(() => {
        fetchAssociations();
    }, []);

    // Charger les agents quand les dépendances changent
    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const fetchAssociations = async () => {
        try {
            const token = localStorage.getItem('token');
            // Ajouter un paramètre limit élevé pour récupérer toutes les associations
            const response = await fetch('https://tourisme.2ise-groupe.com/api/sindicats?limit=10000', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const associationsList = data.data || [];
                console.log('📋 Associations chargées:', associationsList.length);
                setAssociations(associationsList);
            } else {
                console.error('Erreur lors du chargement des associations:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des associations:', error);
        }
    };

    const toggleModal = (agent = null) => {
        setSelectedAgent(agent);
        setModal(!modal);
        if (!modal && agent) {
            setFormData({
                id_sindicat: '',
                date_adhesion: '',
                date_fin: '',
                role: '',
                statut: 'actif'
            });
        }
    };

    const toggleModalAssociations = async (agent = null) => {
        if (agent && !modalAssociations) {
            // Charger les associations de l'agent
            setLoadingAssociations(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentAssociations(data.data || []);
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || 'Erreur lors du chargement des associations');
                }
            } catch (error) {
                console.error('Erreur lors du chargement des associations:', error);
                setError('Erreur lors du chargement des associations');
            } finally {
                setLoadingAssociations(false);
            }
        }
        setSelectedAgent(agent);
        setModalAssociations(!modalAssociations);
        
        // Réinitialiser si on ferme la modal
        if (modalAssociations && !agent) {
            setSelectedAgentAssociations([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/agent-associations', {
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
                throw new Error(errorData.message || 'Erreur lors de l\'attribution de l\'association');
            }

            setSuccess('Association attribuée avec succès');
            setModal(false);
            fetchAgents();
            // Recharger les associations si la modal est ouverte
            if (modalAssociations && selectedAgent) {
                toggleModalAssociations(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const toggleModalEdit = (association = null) => {
        const willOpen = !modalEdit;
        setSelectedAssociation(association);
        setModalEdit(willOpen);
        
        if (willOpen && association) {
            // Formater les dates pour les inputs de type date
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };
            
            setEditFormData({
                id_sindicat: String(association.id_sindicat || association.sindicat_id || ''),
                date_adhesion: formatDateForInput(association.date_adhesion || association.created_at),
                date_fin: formatDateForInput(association.date_fin),
                role: association.role || '',
                statut: association.statut || 'actif'
            });
        } else if (!willOpen) {
            // Réinitialiser les données quand on ferme le modal
            setEditFormData({
                id_sindicat: '',
                date_adhesion: '',
                date_fin: '',
                role: '',
                statut: 'actif'
            });
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/${selectedAssociation.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editFormData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification de l\'association');
            }

            setSuccess('Association modifiée avec succès');
            setModalEdit(false);
            fetchAgents();
            // Recharger les associations si la modal est ouverte
            if (modalAssociations && selectedAgent) {
                toggleModalAssociations(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleDelete = async (associationId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette association ?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/${associationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la suppression de l\'association');
            }

            setSuccess('Association supprimée avec succès');
            fetchAgents();
            // Recharger les associations si la modal est ouverte
            if (modalAssociations && selectedAgent) {
                toggleModalAssociations(selectedAgent);
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

    const getStatutBadge = (statut) => {
        const statuts = {
            'actif': { color: 'success', label: 'Actif' },
            'inactif': { color: 'warning', label: 'Inactif' },
            'resigne': { color: 'danger', label: 'Démissionné' }
        };
        const s = statuts[statut] || { color: 'secondary', label: statut || 'N/A' };
        return <Badge color={s.color}>{s.label}</Badge>;
    };

    if (loading) {
        return (
            <Page title="Gestion des Associations">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner color="primary" />
                </div>
            </Page>
        );
    }

    return (
        <Page title="Gestion des Associations">
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
                                <Alert color="danger" className="mb-3" onDismiss={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert color="success" className="mb-3" onDismiss={() => setSuccess(null)}>
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
                                            <th>Nb. Associations</th>
                                            <th>Dernière Association</th>
                                            <th>Date d'adhésion</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents.map((agent, index) => (
                                            <tr key={agent.id}>
                                                <td className="fw-bold text-center">
                                                    {((currentPage - 1) * itemsPerPage) + index + 1}
                                                </td>
                                                <td className="fw-bold">
                                                    {agent.matricule || 'N/A'}
                                                </td>
                                                <td className="fw-bold">{agent.nom}</td>
                                                <td>{agent.prenom}</td>
                                                <td className="fw-bold text-center">
                                                    {agent.nb_associations || 0}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const nbAssociations = parseInt(agent.nb_associations) || 0;
                                                        if (nbAssociations >= 1) {
                                                            return (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span>{agent.derniere_association_nom || '-'}</span>
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => toggleModalAssociations(agent)}
                                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                    >
                                                                        {nbAssociations > 1 ? 'Voir' : 'Voir/Modifier'}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        } else {
                                                            return <span className="text-muted">Aucune association</span>;
                                                        }
                                                    })()}
                                                </td>
                                                <td>
                                                    {agent.derniere_association_date ? formatDate(agent.derniere_association_date) : '-'}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            color="secondary"
                                                            size="sm"
                                                            onClick={() => toggleModal(agent)}
                                                            style={{ backgroundColor: 'black', borderColor: 'black', color: 'white' }}
                                                        >
                                                            Attribuer Association
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <div className="d-flex align-items-center">
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
                                
                                <div className="d-flex align-items-center">
                                    <span className="me-3">
                                        Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} éléments
                                    </span>
                                    
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(currentPage - 1)}
                                                    disabled={currentPage === 1}
                                                >
                                                    Précédent
                                                </button>
                                            </li>
                                            
                                            {/* Affichage intelligent des numéros de pages */}
                                            {(() => {
                                                const pages = [];
                                                const maxVisiblePages = 5;
                                                
                                                if (totalPages <= maxVisiblePages) {
                                                    for (let i = 1; i <= totalPages; i++) {
                                                        pages.push(
                                                            <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                                                <button
                                                                    className="page-link"
                                                                    onClick={() => setCurrentPage(i)}
                                                                >
                                                                    {i}
                                                                </button>
                                                            </li>
                                                        );
                                                    }
                                                } else {
                                                    let startPage = Math.max(1, currentPage - 2);
                                                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                                    
                                                    if (endPage - startPage < maxVisiblePages - 1) {
                                                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                                    }
                                                    
                                                    if (startPage > 1) {
                                                        pages.push(
                                                            <li key={1} className="page-item">
                                                                <button className="page-link" onClick={() => setCurrentPage(1)}>1</button>
                                                            </li>
                                                        );
                                                        if (startPage > 2) {
                                                            pages.push(<li key="ellipsis1" className="page-item disabled"><span className="page-link">...</span></li>);
                                                        }
                                                    }
                                                    
                                                    for (let i = startPage; i <= endPage; i++) {
                                                        pages.push(
                                                            <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                                                <button
                                                                    className="page-link"
                                                                    onClick={() => setCurrentPage(i)}
                                                                >
                                                                    {i}
                                                                </button>
                                                            </li>
                                                        );
                                                    }
                                                    
                                                    if (endPage < totalPages) {
                                                        if (endPage < totalPages - 1) {
                                                            pages.push(<li key="ellipsis2" className="page-item disabled"><span className="page-link">...</span></li>);
                                                        }
                                                        pages.push(
                                                            <li key={totalPages} className="page-item">
                                                                <button className="page-link" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                                                            </li>
                                                        );
                                                    }
                                                }
                                                
                                                return pages;
                                            })()}
                                            
                                            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(currentPage + 1)}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Suivant
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal pour attribuer une association */}
            <Modal isOpen={modal} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    Attribuer une association à {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="id_sindicat">Association/Syndicat *</Label>
                                    <Input
                                        type="select"
                                        name="id_sindicat"
                                        id="id_sindicat"
                                        value={formData.id_sindicat}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner une association</option>
                                        {associations.map(association => (
                                            <option key={association.id} value={association.id}>
                                                {association.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_adhesion">Date d'adhésion *</Label>
                                    <Input
                                        type="date"
                                        name="date_adhesion"
                                        id="date_adhesion"
                                        value={formData.date_adhesion}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_fin">Date de fin (optionnel)</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="date_fin"
                                        value={formData.date_fin}
                                        onChange={handleInputChange}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="statut">Statut *</Label>
                                    <Input
                                        type="select"
                                        name="statut"
                                        id="statut"
                                        value={formData.statut}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="resigne">Démissionné</option>
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="role">Rôle dans l'association (optionnel)</Label>
                                    <Input
                                        type="text"
                                        name="role"
                                        id="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Membre, Secrétaire, Président..."
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModal}>
                            Annuler
                        </Button>
                        <Button color="primary" type="submit">
                            Attribuer l'association
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modal pour voir toutes les associations d'un agent */}
            <Modal isOpen={modalAssociations} toggle={toggleModalAssociations} size="lg">
                <ModalHeader toggle={toggleModalAssociations}>
                    Associations de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {error && (
                        <Alert color="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}
                    {loadingAssociations ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des associations...</p>
                        </div>
                    ) : selectedAgentAssociations.length > 0 ? (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Association</th>
                                    <th>Date d'adhésion</th>
                                    <th>Date de fin</th>
                                    <th>Rôle</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentAssociations.map((association, index) => (
                                    <tr key={association.id}>
                                        <td className="fw-bold">{index + 1}</td>
                                        <td className="fw-bold">
                                            {association.association_nom || 'N/A'}
                                        </td>
                                        <td>
                                            {formatDate(association.date_adhesion || association.created_at)}
                                        </td>
                                        <td>
                                            {formatDate(association.date_fin)}
                                        </td>
                                        <td>
                                            {association.role || '-'}
                                        </td>
                                        <td>
                                            {getStatutBadge(association.statut)}
                                        </td>
                                        <td>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                onClick={() => toggleModalEdit(association)}
                                                style={{ marginRight: '5px' }}
                                            >
                                                <i className="fa fa-edit me-1"></i>
                                                Modifier
                                            </Button>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() => handleDelete(association.id)}
                                            >
                                                <i className="fa fa-trash me-1"></i>
                                                Supprimer
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert color="info" className="mb-0">
                            Aucune association trouvée pour cet agent.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleModalAssociations}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour modifier une association */}
            <Modal isOpen={modalEdit} toggle={toggleModalEdit} size="lg">
                <ModalHeader toggle={toggleModalEdit}>
                    Modifier l'association de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleEditSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_id_sindicat">Association/Syndicat *</Label>
                                    <Input
                                        type="select"
                                        name="id_sindicat"
                                        id="edit_id_sindicat"
                                        value={editFormData.id_sindicat}
                                        onChange={handleEditInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner une association</option>
                                        {associations.map(association => (
                                            <option key={association.id} value={String(association.id)}>
                                                {association.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_adhesion">Date d'adhésion *</Label>
                                    <Input
                                        type="date"
                                        name="date_adhesion"
                                        id="edit_date_adhesion"
                                        value={editFormData.date_adhesion}
                                        onChange={handleEditInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_fin">Date de fin (optionnel)</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="edit_date_fin"
                                        value={editFormData.date_fin}
                                        onChange={handleEditInputChange}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_statut">Statut *</Label>
                                    <Input
                                        type="select"
                                        name="statut"
                                        id="edit_statut"
                                        value={editFormData.statut}
                                        onChange={handleEditInputChange}
                                        required
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="resigne">Démissionné</option>
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="edit_role">Rôle dans l'association (optionnel)</Label>
                                    <Input
                                        type="text"
                                        name="role"
                                        id="edit_role"
                                        value={editFormData.role}
                                        onChange={handleEditInputChange}
                                        placeholder="Ex: Membre, Secrétaire, Président..."
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModalEdit}>
                            Annuler
                        </Button>
                        <Button color="primary" type="submit">
                            Enregistrer les modifications
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>
        </Page>
    );
};

export default SindicatsPage;
