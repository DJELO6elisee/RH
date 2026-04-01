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

const AgentCategoriesPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoadRef = useRef(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal states
    const [modalCategories, setModalCategories] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedAgentCategories, setSelectedAgentCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    
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
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/categories-agents/agents?page=${currentPage}&limit=${itemsPerPage}${searchParam}`, {
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

    // Charger les catégories une seule fois au montage
    useEffect(() => {
        fetchCategories();
    }, []);

    // Charger les agents quand les dépendances changent
    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/categories/select/all', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const categoriesList = await response.json();
                setCategories(categoriesList);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des catégories:', error);
        }
    };

    const toggleModalCategories = async (agent = null) => {
        if (agent && !modalCategories) {
            setLoadingCategories(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/categories-agents/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentCategories(data.data || []);
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || 'Erreur lors du chargement des catégories');
                }
            } catch (error) {
                setError('Erreur lors du chargement des catégories');
            } finally {
                setLoadingCategories(false);
            }
        }
        setSelectedAgent(agent);
        setModalCategories(!modalCategories);
        
        if (modalCategories && !agent) {
            setSelectedAgentCategories([]);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    };

    return (
        <Page title="Catégories des Agents">
            {error && <Alert color="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            {success && <Alert color="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

            <Row>
                <Col md={12}>
                    <Card>
                        <CardHeader>
                            <Row>
                                <Col md={6}>
                                    <h4>Liste des Agents</h4>
                                </Col>
                                <Col md={6} className="text-right">
                                    <Input
                                        type="text"
                                        placeholder="Rechercher un agent..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ maxWidth: '300px', display: 'inline-block', marginRight: '10px' }}
                                    />
                                    <Input
                                        type="select"
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        style={{ maxWidth: '100px', display: 'inline-block' }}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </Input>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {loading ? (
                                <div className="text-center">
                                    <Spinner color="primary" />
                                    <p>Chargement...</p>
                                </div>
                            ) : (
                                <>
                                    <Table striped hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Matricule</th>
                                                <th>Nom</th>
                                                <th>Prénom</th>
                                                <th>Email</th>
                                                <th>Téléphone</th>
                                                <th>Fonction</th>
                                                <th>Emploi</th>
                                                <th>Catégorie Actuelle</th>
                                                <th>Nb. Catégories</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agents.length === 0 ? (
                                                <tr>
                                                    <td colSpan="10" className="text-center">Aucun agent trouvé</td>
                                                </tr>
                                            ) : (
                                                agents.map(agent => (
                                                    <tr key={agent.id}>
                                                        <td>{agent.matricule}</td>
                                                        <td>{agent.nom}</td>
                                                        <td>{agent.prenom}</td>
                                                        <td>{agent.email || '-'}</td>
                                                        <td>{agent.telephone1 || '-'}</td>
                                                        <td>{agent.fonction_actuelle || '-'}</td>
                                                        <td>{agent.emploi_actuel || '-'}</td>
                                                        <td>{agent.categorie_actuelle || '-'}</td>
                                                        <td>{agent.nb_categories || 0}</td>
                                                        <td>
                                                            <Button
                                                                color="info"
                                                                size="sm"
                                                                onClick={() => toggleModalCategories(agent)}
                                                            >
                                                                Voir l'historique
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </Table>
                                    <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" style={{ width: '100%' }}>
                                        <div style={{ flexShrink: 0 }}>
                                            <p>Page {currentPage} sur {totalPages} ({totalItems} agents)</p>
                                        </div>
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
                                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                                                    
                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                                        <button
                                                            className="page-link"
                                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                            disabled={currentPage === totalPages}
                                                        >
                                                            Suivant
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal pour voir l'historique des catégories */}
            <Modal isOpen={modalCategories} toggle={() => toggleModalCategories(null)} size="lg">
                <ModalHeader toggle={() => toggleModalCategories(null)}>
                    Historique des catégories de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {loadingCategories ? (
                        <div className="text-center">
                            <Spinner color="primary" />
                            <p>Chargement...</p>
                        </div>
                    ) : (
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Catégorie</th>
                                    <th>Date d'entrée</th>
                                    <th>Date de sortie</th>
                                    <th>Nature de l'acte</th>
                                    <th>Numéro de l'acte</th>
                                    <th>Date de signature</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center">Aucune catégorie enregistrée</td>
                                    </tr>
                                ) : (
                                    selectedAgentCategories.map(categorie => (
                                        <tr key={categorie.id}>
                                            <td>{categorie.categorie_libele || '-'}</td>
                                            <td>{formatDate(categorie.date_entree || categorie.created_at)}</td>
                                            <td>{formatDate(categorie.date_sortie)}</td>
                                            <td>{categorie.nature || '-'}</td>
                                            <td>{categorie.numero || '-'}</td>
                                            <td>{formatDate(categorie.date_signature)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => toggleModalCategories(null)}>Fermer</Button>
                </ModalFooter>
            </Modal>
        </Page>
    );
};

export default AgentCategoriesPage;

