import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

const AgentEmploisPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [emplois, setEmplois] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoadRef = useRef(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal states
    const [modal, setModal] = useState(false);
    const [modalEmplois, setModalEmplois] = useState(false);
    const [modalEdit, setModalEdit] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedAgentEmplois, setSelectedAgentEmplois] = useState([]);
    const [selectedEmploi, setSelectedEmploi] = useState(null);
    const [loadingEmplois, setLoadingEmplois] = useState(false);
    const [formData, setFormData] = useState({
        id_emploi: '',
        date_entree: '',
        designation_poste: '',
        nature: '',
        numero: '',
        date_signature: ''
    });
    const [editFormData, setEditFormData] = useState({
        id_emploi: '',
        date_entree: '',
        designation_poste: '',
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
    
    // Filtres
    const [filterNbEmplois, setFilterNbEmplois] = useState('');
    const [filterNomEmploi, setFilterNomEmploi] = useState('');
    const [allAgents, setAllAgents] = useState([]); // Stocker tous les agents pour le filtrage côté client

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

    const fetchEmplois = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : user?.id_ministere;
            let url = 'https://tourisme.2ise-groupe.com/api/emplois?limit=10000';
            if (user?.role !== 'super_admin' && ministereId) {
                url += `&id_ministere=${ministereId}`;
            }
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const emploisList = data.data || [];
                console.log('📋 Emplois chargés:', emploisList.length);
                setEmplois(emploisList);
            } else {
                console.error('Erreur lors du chargement des emplois:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des emplois:', error);
        }
    }, [user?.organization?.type, user?.organization?.id, user?.id_ministere, user?.role]);

    // Charger tous les agents une fois pour le filtrage côté client
    const loadAllAgents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
            
            // Charger tous les agents avec pagination
            let allAgentsData = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/emploi-agents/agents?page=${page}&limit=1000${searchParam}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Erreur lors du chargement des agents');
                }
                
                const data = await response.json();
                const pageAgents = data.data || [];
                allAgentsData = [...allAgentsData, ...pageAgents];
                
                const pagination = data.pagination || data.meta || {};
                const totalPagesAll = pagination.total_pages || pagination.totalPages || 1;
                hasMore = page < totalPagesAll;
                page++;
            }
            
            setAllAgents(allAgentsData);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [debouncedSearchTerm]);

    // Filtrer les agents selon les critères
    const filteredAgents = useMemo(() => {
        let filtered = [...allAgents];
        
        // Filtre par nombre d'emplois
        if (filterNbEmplois !== '') {
            const nbEmplois = parseInt(filterNbEmplois);
            if (!isNaN(nbEmplois)) {
                filtered = filtered.filter(agent => {
                    const agentNbEmplois = parseInt(agent.nb_emplois) || 0;
                    if (nbEmplois === 5) {
                        // "5 emplois ou plus"
                        return agentNbEmplois >= 5;
                    } else {
                        return agentNbEmplois === nbEmplois;
                    }
                });
            }
        }
        
        // Filtre par nom d'emploi
        if (filterNomEmploi !== '') {
            filtered = filtered.filter(agent => {
                const emploiNom = (agent.dernier_emploi_nom || '').toLowerCase();
                return emploiNom.includes(filterNomEmploi.toLowerCase());
            });
        }
        
        return filtered;
    }, [allAgents, filterNbEmplois, filterNomEmploi]);

    // Pagination côté client sur les agents filtrés
    const paginatedAgents = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAgents.slice(startIndex, endIndex);
    }, [filteredAgents, currentPage, itemsPerPage]);

    // Calculer le nombre total de pages pour les agents filtrés
    useEffect(() => {
        const totalPagesFiltered = Math.ceil(filteredAgents.length / itemsPerPage) || 1;
        setTotalPages(totalPagesFiltered);
        setTotalItems(filteredAgents.length);
        
        // Réinitialiser la page si elle dépasse le nombre total de pages
        if (currentPage > totalPagesFiltered && totalPagesFiltered > 0) {
            setCurrentPage(1);
        }
    }, [filteredAgents.length, itemsPerPage, currentPage]);

    // Charger les emplois au montage et quand l'utilisateur (ministère) change
    useEffect(() => {
        fetchEmplois();
    }, [fetchEmplois]);

    // Charger tous les agents quand les dépendances changent
    useEffect(() => {
        loadAllAgents();
    }, [loadAllAgents]);

    // Réinitialiser la page quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [filterNbEmplois, filterNomEmploi]);

    const toggleModal = (agent = null) => {
        setSelectedAgent(agent);
        setModal(!modal);
        if (!modal && agent) {
            setFormData({
                id_emploi: '',
                date_entree: '',
                designation_poste: '',
                nature: '',
                numero: '',
                date_signature: ''
            });
        }
    };

    const toggleModalEmplois = async (agent = null) => {
        if (agent && !modalEmplois) {
            // Charger les emplois de l'agent
            setLoadingEmplois(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/emploi-agents/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentEmplois(data.data || []);
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || 'Erreur lors du chargement des emplois');
                }
            } catch (error) {
                console.error('Erreur lors du chargement des emplois:', error);
                setError('Erreur lors du chargement des emplois');
            } finally {
                setLoadingEmplois(false);
            }
        }
        setSelectedAgent(agent);
        setModalEmplois(!modalEmplois);
        
        // Réinitialiser si on ferme la modal
        if (modalEmplois && !agent) {
            setSelectedAgentEmplois([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/emploi-agents', {
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
                throw new Error('Erreur lors de l\'ajout de l\'emploi');
            }

            setSuccess('Emploi ajouté avec succès');
            setModal(false);
            loadAllAgents();
            // Recharger les emplois si la modal est ouverte
            if (modalEmplois && selectedAgent) {
                toggleModalEmplois(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const toggleModalEdit = (emploi = null) => {
        const willOpen = !modalEdit;
        setSelectedEmploi(emploi);
        setModalEdit(willOpen);
        
        if (willOpen && emploi) {
            // Formater les dates pour les inputs de type date
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };
            
            // Déterminer l'ID de l'emploi
            let idEmploi = '';
            if (emploi.id_emploi) {
                // Si id_emploi existe, l'utiliser
                idEmploi = String(emploi.id_emploi);
            } else if (emploi.emploi_libele || emploi.emploi_nom) {
                // Si id_emploi est null mais qu'on a un libellé, chercher l'emploi correspondant
                const libeleToFind = (emploi.emploi_libele || emploi.emploi_nom).trim();
                const foundEmploi = emplois.find(e => 
                    (e.libele && e.libele.trim() === libeleToFind) || 
                    (e.nom && e.nom.trim() === libeleToFind)
                );
                if (foundEmploi) {
                    idEmploi = String(foundEmploi.id);
                }
            }
            
            setEditFormData({
                id_emploi: idEmploi,
                date_entree: formatDateForInput(emploi.date_entree || emploi.date_nomination_emploi || emploi.created_at),
                designation_poste: emploi.designation_poste || '',
                nature: emploi.nature || '',
                numero: emploi.numero || '',
                date_signature: formatDateForInput(emploi.date_signature)
            });
        } else if (!willOpen) {
            // Réinitialiser les données quand on ferme le modal
            setEditFormData({
                id_emploi: '',
                date_entree: '',
                designation_poste: '',
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
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/emploi-agents/${selectedEmploi.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editFormData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification de l\'emploi');
            }

            setSuccess('Emploi modifié avec succès');
            setModalEdit(false);
            loadAllAgents();
            // Recharger les emplois si la modal est ouverte
            if (modalEmplois && selectedAgent) {
                toggleModalEmplois(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => {
            const newData = {
                ...prev,
                [name]: value
            };
            
            // Si l'emploi est sélectionné, remplir automatiquement la désignation du poste
            if (name === 'id_emploi' && value) {
                const selectedEmploi = emplois.find(e => e.id === parseInt(value));
                if (selectedEmploi) {
                    newData.designation_poste = selectedEmploi.libele || selectedEmploi.nom || '';
                }
            }
            
            return newData;
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: value
            };
            
            // Si l'emploi est sélectionné, remplir automatiquement la désignation du poste
            if (name === 'id_emploi' && value) {
                const selectedEmploi = emplois.find(e => e.id === parseInt(value));
                if (selectedEmploi) {
                    newData.designation_poste = selectedEmploi.libele || selectedEmploi.nom || '';
                }
            }
            
            return newData;
        });
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
            <Page title="Gestion des Emplois">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner color="primary" />
                </div>
            </Page>
        );
    }

    return (
        <Page title="Gestion des Emplois">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <h4 className="mb-0">Liste des Agents</h4>
                                <div className="d-flex gap-2 flex-wrap">
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
                                <Alert color="danger" className="mb-3">
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert color="success" className="mb-3">
                                    {success}
                                </Alert>
                            )}
                            
                            {/* Filtres */}
                            <Row className="mb-3">
                                <Col md={4}>
                                    <FormGroup>
                                        <Label for="filterNbEmplois">Filtrer par nombre d'emplois</Label>
                                        <Input
                                            type="select"
                                            id="filterNbEmplois"
                                            value={filterNbEmplois}
                                            onChange={(e) => setFilterNbEmplois(e.target.value)}
                                        >
                                            <option value="">Tous</option>
                                            <option value="0">0 emploi</option>
                                            <option value="1">1 emploi</option>
                                            <option value="2">2 emplois</option>
                                            <option value="3">3 emplois</option>
                                            <option value="4">4 emplois</option>
                                            <option value="5">5 emplois ou plus</option>
                                        </Input>
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label for="filterNomEmploi">Filtrer par nom d'emploi</Label>
                                        <Input
                                            type="text"
                                            id="filterNomEmploi"
                                            placeholder="Rechercher un emploi..."
                                            value={filterNomEmploi}
                                            onChange={(e) => setFilterNomEmploi(e.target.value)}
                                        />
                                    </FormGroup>
                                </Col>
                                <Col md={2} className="d-flex align-items-end">
                                    <Button
                                        color="secondary"
                                        onClick={() => {
                                            setFilterNbEmplois('');
                                            setFilterNomEmploi('');
                                        }}
                                        style={{ width: '100%' }}
                                    >
                                        Réinitialiser
                                    </Button>
                                </Col>
                            </Row>
                            
                            {/* Indicateur de résultats filtrés */}
                            {(filterNbEmplois !== '' || filterNomEmploi !== '') && (
                                <Alert color="info" className="mb-3">
                                    <strong>{filteredAgents.length}</strong> agent(s) trouvé(s) sur {allAgents.length} total
                                    {(filterNbEmplois !== '' || filterNomEmploi !== '') && (
                                        <span className="ms-2">
                                            {filterNbEmplois !== '' && `• Nombre d'emplois: ${filterNbEmplois === '5' ? '5 ou plus' : filterNbEmplois}`}
                                            {filterNomEmploi !== '' && ` • Emploi: "${filterNomEmploi}"`}
                                        </span>
                                    )}
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
                                            <th>Nb. Emplois</th>
                                            <th>Dernier Emploi</th>
                                            <th>Date de signature</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedAgents.map((agent, index) => (
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
                                                    {agent.nb_emplois || 0}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const nbEmplois = parseInt(agent.nb_emplois) || 0;
                                                        if (nbEmplois === 1) {
                                                            return (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span>{agent.dernier_emploi_nom || '-'}</span>
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => toggleModalEmplois(agent)}
                                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                    >
                                                                        Voir/Modifier
                                                                    </Button>
                                                                </div>
                                                            );
                                                        } else if (nbEmplois > 1) {
                                                            return (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span>{agent.dernier_emploi_nom || '-'}</span>
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => toggleModalEmplois(agent)}
                                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                    >
                                                                        Voir
                                                                    </Button>
                                                                </div>
                                                            );
                                                        } else {
                                                            return <span className="text-muted">Aucun emploi</span>;
                                                        }
                                                    })()}
                                                </td>
                                                <td>
                                                    {agent.dernier_emploi_date ? formatDate(agent.dernier_emploi_date) : '-'}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            color="secondary"
                                                            size="sm"
                                                            onClick={() => toggleModal(agent)}
                                                            style={{ backgroundColor: 'black', borderColor: 'black', color: 'white' }}
                                                        >
                                                            Ajouter Emploi
                                                        </Button>
                                                    </div>
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

            {/* Modal pour ajouter un emploi */}
            <Modal isOpen={modal} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    Ajouter un emploi à {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="id_emploi">Emploi *</Label>
                                    <Input
                                        type="select"
                                        name="id_emploi"
                                        id="id_emploi"
                                        value={formData.id_emploi}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner un emploi</option>
                                        {emplois.map(emploi => (
                                            <option key={emploi.id} value={emploi.id}>
                                                {emploi.libele || emploi.nom}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_entree">Date d'entrée *</Label>
                                    <Input
                                        type="date"
                                        name="date_entree"
                                        id="date_entree"
                                        value={formData.date_entree}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="designation_poste">Désignation du poste *</Label>
                                    <Input
                                        type="textarea"
                                        name="designation_poste"
                                        id="designation_poste"
                                        value={formData.designation_poste}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="nature">Nature de l'acte *</Label>
                                    <Input
                                        type="text"
                                        name="nature"
                                        id="nature"
                                        value={formData.nature}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="numero">Numéro de l'acte *</Label>
                                    <Input
                                        type="text"
                                        name="numero"
                                        id="numero"
                                        value={formData.numero}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_signature">Date de signature *</Label>
                                    <Input
                                        type="date"
                                        name="date_signature"
                                        id="date_signature"
                                        value={formData.date_signature}
                                        onChange={handleInputChange}
                                        required
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
                            Ajouter l'emploi
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modal pour voir tous les emplois d'un agent */}
            <Modal isOpen={modalEmplois} toggle={toggleModalEmplois} size="lg">
                <ModalHeader toggle={toggleModalEmplois}>
                    Emplois de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {error && (
                        <Alert color="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}
                    {loadingEmplois ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des emplois...</p>
                        </div>
                    ) : selectedAgentEmplois.length > 0 ? (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Emploi</th>
                                    <th>Date d'entrée</th>
                                    <th>Date de signature</th>
                                    <th>Désignation du poste</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentEmplois.map((emploi, index) => (
                                    <tr key={emploi.id}>
                                        <td className="fw-bold">{index + 1}</td>
                                        <td className="fw-bold">
                                            {emploi.emploi_libele || emploi.emploi_nom || emploi.designation_poste || 'N/A'}
                                        </td>
                                        <td>
                                            {formatDate(emploi.date_entree || emploi.date_nomination_emploi || emploi.created_at)}
                                        </td>
                                        <td>
                                            {formatDate(emploi.date_signature)}
                                        </td>
                                        <td>
                                            {emploi.designation_poste || '-'}
                                        </td>
                                        <td>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                onClick={() => toggleModalEdit(emploi)}
                                                style={{ marginRight: '5px' }}
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
                            Aucun emploi trouvé pour cet agent.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleModalEmplois}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour modifier un emploi */}
            <Modal isOpen={modalEdit} toggle={toggleModalEdit} size="lg">
                <ModalHeader toggle={toggleModalEdit}>
                    Modifier l'emploi de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleEditSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_id_emploi">Emploi *</Label>
                                    <Input
                                        type="select"
                                        name="id_emploi"
                                        id="edit_id_emploi"
                                        value={editFormData.id_emploi}
                                        onChange={handleEditInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner un emploi</option>
                                        {emplois.map(emploi => (
                                            <option key={emploi.id} value={String(emploi.id)}>
                                                {emploi.libele || emploi.nom}
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
                                    <Label for="edit_designation_poste">Désignation du poste *</Label>
                                    <Input
                                        type="textarea"
                                        name="designation_poste"
                                        id="edit_designation_poste"
                                        value={editFormData.designation_poste}
                                        onChange={handleEditInputChange}
                                        required
                                        rows={3}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_nature">Nature de l'acte *</Label>
                                    <Input
                                        type="text"
                                        name="nature"
                                        id="edit_nature"
                                        value={editFormData.nature}
                                        onChange={handleEditInputChange}
                                        required
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_numero">Numéro de l'acte *</Label>
                                    <Input
                                        type="text"
                                        name="numero"
                                        id="edit_numero"
                                        value={editFormData.numero}
                                        onChange={handleEditInputChange}
                                        required
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_signature">Date de signature *</Label>
                                    <Input
                                        type="date"
                                        name="date_signature"
                                        id="edit_date_signature"
                                        value={editFormData.date_signature}
                                        onChange={handleEditInputChange}
                                        required
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

export default AgentEmploisPage;
