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
import { useSuperAdminFilters } from '../hooks/useSuperAdminFilters';
import '../styles/table-styles.css';

const API_BASE = 'https://tourisme.2ise-groupe.com';

const AgentFonctionsPage = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';
    const { queryParams: filterQueryParams, FilterUI } = useSuperAdminFilters(isSuperAdmin);
    const [agents, setAgents] = useState([]);
    const [fonctions, setFonctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoadRef = useRef(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal states
    const [modal, setModal] = useState(false);
    const [modalFonctions, setModalFonctions] = useState(false);
    const [modalEdit, setModalEdit] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedAgentFonctions, setSelectedAgentFonctions] = useState([]);
    const [selectedFonction, setSelectedFonction] = useState(null);
    const [loadingFonctions, setLoadingFonctions] = useState(false);
    const [formData, setFormData] = useState({
        id_fonction: '',
        date_entree: '',
        designation_poste: '',
        nature: '',
        numero: '',
        date_signature: ''
    });
    const [editFormData, setEditFormData] = useState({
        id_fonction: '',
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

    // Debounce du terme de recherche
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Réinitialiser la page à 1 quand debouncedSearchTerm ou les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);
    useEffect(() => {
        if (filterQueryParams && Object.keys(filterQueryParams).length > 0) {
            setCurrentPage(1);
        }
    }, [filterQueryParams]);

    const fetchAgents = useCallback(async () => {
        try {
            // Ne mettre loading à true que lors du chargement initial
            if (isInitialLoadRef.current) {
                setLoading(true);
            }
            setError(null);
            const token = localStorage.getItem('token');
            const searchParam = debouncedSearchTerm ? `&search=${encodeURIComponent(debouncedSearchTerm)}` : '';
            const filterParam = filterQueryParams ? '&' + new URLSearchParams(filterQueryParams).toString() : '';
            const response = await fetch(`${API_BASE}/api/fonction-agents/agents?page=${currentPage}&limit=${itemsPerPage}${searchParam}${filterParam}`, {
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
            setTotalPages(data.pagination.totalPages);
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
    }, [currentPage, debouncedSearchTerm, itemsPerPage, filterQueryParams]);

    // Charger les fonctions une seule fois au montage
    useEffect(() => {
        fetchFonctions();
    }, []);

    // Charger les agents quand les dépendances changent
    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // Synchroniser la fonction sélectionnée quand selectedFonction change et que les fonctions sont disponibles
    useEffect(() => {
        if (modalEdit && selectedFonction && fonctions.length > 0) {
            console.log('🔄 useEffect: Synchronisation de la fonction');
            console.log('🔄 selectedFonction:', selectedFonction);
            console.log('🔄 fonctions disponibles:', fonctions.length);
            
            // Déterminer l'ID de la fonction
            let idFonction = '';
            // Vérifier si id_fonction existe et n'est pas null/undefined
            if (selectedFonction.id_fonction !== null && selectedFonction.id_fonction !== undefined && selectedFonction.id_fonction !== '') {
                // Si id_fonction existe, l'utiliser directement
                idFonction = String(selectedFonction.id_fonction);
                console.log('✅ useEffect: Utilisation de id_fonction direct:', idFonction);
            } else if (selectedFonction.fonction_libele || selectedFonction.fonction_nom) {
                // Si id_fonction est null mais qu'on a un libellé, chercher la fonction correspondante
                const libeleToFind = (selectedFonction.fonction_libele || selectedFonction.fonction_nom).trim();
                console.log('🔍 useEffect: Recherche par libellé:', libeleToFind);
                const foundFonction = fonctions.find(f => 
                    (f.libele && f.libele.trim() === libeleToFind) || 
                    (f.nom && f.nom.trim() === libeleToFind)
                );
                if (foundFonction) {
                    idFonction = String(foundFonction.id);
                    console.log('✅ useEffect: Fonction trouvée par libellé:', idFonction);
                } else {
                    console.log('❌ useEffect: Aucune fonction trouvée pour le libellé:', libeleToFind);
                }
            }
            
            // Vérifier si la fonction existe dans la liste
            if (idFonction) {
                const functionExists = fonctions.some(f => String(f.id) === idFonction);
                console.log('🔍 useEffect: La fonction existe dans la liste?', functionExists, 'pour id:', idFonction);
                
                if (!functionExists) {
                    console.log('⚠️ useEffect: La fonction n\'existe pas dans la liste, recherche alternative...');
                    // Essayer de trouver par libellé si l'ID ne correspond pas
                    const libeleToFind = (selectedFonction.fonction_libele || selectedFonction.fonction_nom || '').trim();
                    if (libeleToFind) {
                        const foundFonction = fonctions.find(f => 
                            (f.libele && f.libele.trim().toUpperCase() === libeleToFind.toUpperCase()) || 
                            (f.nom && f.nom.trim().toUpperCase() === libeleToFind.toUpperCase())
                        );
                        if (foundFonction) {
                            idFonction = String(foundFonction.id);
                            console.log('✅ useEffect: Fonction trouvée par libellé (insensible à la casse):', idFonction);
                        }
                    }
                }
            }
            
            // Mettre à jour uniquement id_fonction si elle est définie
            if (idFonction) {
                setEditFormData(prev => {
                    console.log('🔄 useEffect: Valeur actuelle id_fonction:', prev.id_fonction, 'Nouvelle valeur:', idFonction);
                    // Toujours mettre à jour pour forcer le re-render
                    console.log('✅ useEffect: Mise à jour de id_fonction');
                    return {
                        ...prev,
                        id_fonction: idFonction
                    };
                });
                
                // Forcer la sélection dans le DOM après un court délai
                setTimeout(() => {
                    const selectElement = document.getElementById('edit_id_fonction');
                    if (selectElement) {
                        selectElement.value = idFonction;
                        console.log('🔧 DOM: Valeur forcée dans le select:', idFonction);
                        // Déclencher un événement change pour React
                        const event = new Event('change', { bubbles: true });
                        selectElement.dispatchEvent(event);
                    } else {
                        console.log('❌ DOM: Select non trouvé');
                    }
                }, 100);
            } else {
                console.log('❌ useEffect: idFonction est vide, pas de mise à jour');
            }
        }
    }, [modalEdit, selectedFonction, fonctions]);

    const fetchFonctions = async () => {
        try {
            const token = localStorage.getItem('token');
            // Ajouter un paramètre limit élevé pour récupérer toutes les fonctions
            const response = await fetch('https://tourisme.2ise-groupe.com/api/fonctions?limit=10000', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const fonctionsList = data.data || [];
                console.log('📋 Fonctions chargées:', fonctionsList.length);
                setFonctions(fonctionsList);
            } else {
                console.error('Erreur lors du chargement des fonctions:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des fonctions:', error);
        }
    };

    const toggleModal = (agent = null) => {
        setSelectedAgent(agent);
        setModal(!modal);
        if (!modal && agent) {
            setFormData({
                id_fonction: '',
                date_entree: '',
                designation_poste: '',
                nature: '',
                numero: '',
                date_signature: ''
            });
        }
    };

    const toggleModalFonctions = async (agent = null) => {
        if (agent && !modalFonctions) {
            // Charger les fonctions de l'agent
            setLoadingFonctions(true);
            setError(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/fonction-agents/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentFonctions(data.data || []);
                } else {
                    const errorData = await response.json();
                    setError(errorData.message || 'Erreur lors du chargement des fonctions');
                }
            } catch (error) {
                console.error('Erreur lors du chargement des fonctions:', error);
                setError('Erreur lors du chargement des fonctions');
            } finally {
                setLoadingFonctions(false);
            }
        }
        setSelectedAgent(agent);
        setModalFonctions(!modalFonctions);
        
        // Réinitialiser si on ferme la modal
        if (modalFonctions && !agent) {
            setSelectedAgentFonctions([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/fonction-agents', {
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
                throw new Error('Erreur lors de l\'attribution de la fonction');
            }

            setSuccess('Fonction attribuée avec succès');
            setModal(false);
            fetchAgents();
            // Recharger les fonctions si la modal est ouverte
            if (modalFonctions && selectedAgent) {
                toggleModalFonctions(selectedAgent);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const toggleModalEdit = (fonction = null) => {
        const willOpen = !modalEdit;
        
        if (willOpen && fonction) {
            // Définir selectedFonction AVANT d'ouvrir le modal pour éviter les problèmes de timing
            setSelectedFonction(fonction);
            // Formater les dates pour les inputs de type date
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };
            
            // Déterminer l'ID de la fonction
            let idFonction = '';
            
            // Debug: afficher les données reçues
            console.log('🔍 Données de la fonction reçues:', fonction);
            console.log('🔍 id_fonction:', fonction.id_fonction, 'Type:', typeof fonction.id_fonction);
            console.log('🔍 Fonctions disponibles:', fonctions.length);
            
            // Vérifier si id_fonction existe et n'est pas null/undefined
            if (fonction.id_fonction !== null && fonction.id_fonction !== undefined && fonction.id_fonction !== '') {
                // Si id_fonction existe, l'utiliser directement
                idFonction = String(fonction.id_fonction);
                console.log('✅ Utilisation de id_fonction direct:', idFonction);
            } else if (fonction.fonction_libele || fonction.fonction_nom) {
                // Si id_fonction est null mais qu'on a un libellé, chercher la fonction correspondante
                const libeleToFind = (fonction.fonction_libele || fonction.fonction_nom).trim();
                console.log('🔍 Recherche par libellé:', libeleToFind);
                const foundFonction = fonctions.find(f => 
                    (f.libele && f.libele.trim() === libeleToFind) || 
                    (f.nom && f.nom.trim() === libeleToFind)
                );
                if (foundFonction) {
                    idFonction = String(foundFonction.id);
                    console.log('✅ Fonction trouvée par libellé:', idFonction);
                } else {
                    console.log('❌ Aucune fonction trouvée pour le libellé:', libeleToFind);
                }
            } else {
                console.log('❌ Aucune méthode pour déterminer id_fonction');
            }
            
            console.log('🔍 id_fonction final:', idFonction);
            
            setEditFormData({
                id_fonction: idFonction,
                date_entree: formatDateForInput(fonction.date_entree || fonction.created_at),
                designation_poste: fonction.designation_poste || '',
                nature: fonction.nature || '',
                numero: fonction.numero || '',
                date_signature: formatDateForInput(fonction.date_signature)
            });
            
            console.log('🔍 editFormData après setEditFormData:', {
                id_fonction: idFonction,
                date_entree: formatDateForInput(fonction.date_entree || fonction.created_at),
                designation_poste: fonction.designation_poste || '',
                nature: fonction.nature || '',
                numero: fonction.numero || '',
                date_signature: formatDateForInput(fonction.date_signature)
            });
            
            // Ouvrir le modal APRÈS avoir défini les données
            setTimeout(() => {
                setModalEdit(true);
            }, 0);
        } else if (!willOpen) {
            setSelectedFonction(null);
            setModalEdit(false);
            // Réinitialiser les données quand on ferme le modal
            setEditFormData({
                id_fonction: '',
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
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/fonction-agents/${selectedFonction.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editFormData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification de la fonction');
            }

            setSuccess('Fonction modifiée avec succès');
            setModalEdit(false);
            fetchAgents();
            // Recharger les fonctions si la modal est ouverte
            if (modalFonctions && selectedAgent) {
                toggleModalFonctions(selectedAgent);
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
            
            // Si la fonction est sélectionnée, remplir automatiquement la désignation du poste
            if (name === 'id_fonction' && value) {
                const selectedFonction = fonctions.find(f => f.id === parseInt(value));
                if (selectedFonction) {
                    newData.designation_poste = selectedFonction.libele || selectedFonction.nom || '';
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
            
            // Si la fonction est sélectionnée, remplir automatiquement la désignation du poste
            if (name === 'id_fonction' && value) {
                const selectedFonction = fonctions.find(f => f.id === parseInt(value));
                if (selectedFonction) {
                    newData.designation_poste = selectedFonction.libele || selectedFonction.nom || '';
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
            <Page title="Gestion des Fonctions">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner color="primary" />
                </div>
            </Page>
        );
    }

    return (
        <Page title="Gestion des Fonctions">
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
                                <Alert color="danger" className="mb-3">
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert color="success" className="mb-3">
                                    {success}
                                </Alert>
                            )}
                            {FilterUI && (
                                <div className="mb-3">
                                    {FilterUI}
                                </div>
                            )}
                            <div className="table-responsive">
                                <Table hover>
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Matricule</th>
                                            <th>Nom</th>
                                            <th>Prénoms</th>
                                            <th>Nb. Fonctions</th>
                                            <th>Dernière Fonction</th>
                                            <th>Date de signature</th>
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
                                                    {agent.nb_fonctions || 0}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const nbFonctions = parseInt(agent.nb_fonctions) || 0;
                                                        if (nbFonctions === 1) {
                                                            return (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span>{agent.derniere_fonction_nom || '-'}</span>
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => toggleModalFonctions(agent)}
                                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                    >
                                                                        Voir/Modifier
                                                                    </Button>
                                                                </div>
                                                            );
                                                        } else if (nbFonctions > 1) {
                                                            return (
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span>{agent.derniere_fonction_nom || '-'}</span>
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => toggleModalFonctions(agent)}
                                                                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                    >
                                                                        Voir
                                                                    </Button>
                                                                </div>
                                                            );
                                                        } else {
                                                            return <span className="text-muted">Aucune fonction</span>;
                                                        }
                                                    })()}
                                                </td>
                                                <td>
                                                    {agent.derniere_fonction_date ? formatDate(agent.derniere_fonction_date) : '-'}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            color="secondary"
                                                            size="sm"
                                                            onClick={() => toggleModal(agent)}
                                                            style={{ backgroundColor: 'black', borderColor: 'black', color: 'white' }}
                                                        >
                                                            Attribuer Fonction
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
                                                    // Afficher toutes les pages si le nombre total est petit
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
                                                    // Logique pour afficher les pages de manière intelligente
                                                    let startPage = Math.max(1, currentPage - 2);
                                                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                                    
                                                    if (endPage - startPage < maxVisiblePages - 1) {
                                                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                                    }
                                                    
                                                    // Première page
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
                                                    
                                                    // Pages du milieu
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
                                                    
                                                    // Dernière page
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

            {/* Modal pour attribuer une fonction */}
            <Modal isOpen={modal} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    Attribuer une fonction à {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="id_fonction">Fonction *</Label>
                                    <Input
                                        type="select"
                                        name="id_fonction"
                                        id="id_fonction"
                                        value={formData.id_fonction}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner une fonction</option>
                                        {fonctions.map(fonction => (
                                            <option key={fonction.id} value={fonction.id}>
                                                {fonction.libele || fonction.nom}
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
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="nature">Nature de l'acte *</Label>
                                    <Input
                                        type="text"
                                        name="nature"
                                        id="nature"
                                        value={formData.nature}
                                        onChange={handleInputChange}
                                        required
                                        style={{ textTransform: 'uppercase' }}
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
                                        style={{ textTransform: 'uppercase' }}
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
                            Attribuer la fonction
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modal pour voir toutes les fonctions d'un agent */}
            <Modal isOpen={modalFonctions} toggle={toggleModalFonctions} size="lg">
                <ModalHeader toggle={toggleModalFonctions}>
                    Fonctions de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {error && (
                        <Alert color="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}
                    {loadingFonctions ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des fonctions...</p>
                        </div>
                    ) : selectedAgentFonctions.length > 0 ? (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Fonction</th>
                                    <th>Date d'entrée</th>
                                    <th>Date de signature</th>
                                    <th>Désignation du poste</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentFonctions.map((fonction, index) => (
                                    <tr key={fonction.id}>
                                        <td className="fw-bold">{index + 1}</td>
                                        <td className="fw-bold">
                                            {fonction.fonction_libele || fonction.fonction_nom || fonction.designation_poste || 'N/A'}
                                        </td>
                                        <td>
                                            {formatDate(fonction.date_entree || fonction.created_at)}
                                        </td>
                                        <td>
                                            {formatDate(fonction.date_signature)}
                                        </td>
                                        <td>
                                            {fonction.designation_poste || '-'}
                                        </td>
                                        <td>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                onClick={() => toggleModalEdit(fonction)}
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
                            Aucune fonction trouvée pour cet agent.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleModalFonctions}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour modifier une fonction */}
            <Modal isOpen={modalEdit} toggle={toggleModalEdit} size="lg">
                <ModalHeader toggle={toggleModalEdit}>
                    Modifier la fonction de {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <Form onSubmit={handleEditSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_id_fonction">Fonction *</Label>
                                    {(() => {
                                        console.log('🎨 Rendu du select - editFormData.id_fonction:', editFormData.id_fonction);
                                        console.log('🎨 Rendu du select - fonctions disponibles:', fonctions.length);
                                        console.log('🎨 Rendu du select - selectedFonction:', selectedFonction);
                                        return null;
                                    })()}
                                    <Input
                                        type="select"
                                        name="id_fonction"
                                        id="edit_id_fonction"
                                        key={`fonction-select-${editFormData.id_fonction || 'empty'}-${modalEdit}-${fonctions.length}`}
                                        value={editFormData.id_fonction ? String(editFormData.id_fonction) : ''}
                                        onChange={handleEditInputChange}
                                        required
                                    >
                                        <option value="">Sélectionner une fonction</option>
                                        {(() => {
                                            // Log une seule fois au début du rendu des options
                                            if (fonctions.length > 0 && editFormData.id_fonction) {
                                                console.log('📋 Toutes les fonctions disponibles:', fonctions.map(f => ({
                                                    id: f.id,
                                                    idStr: String(f.id),
                                                    libele: f.libele || f.nom
                                                })));
                                                console.log('🎯 Valeur recherchée dans editFormData:', editFormData.id_fonction, 'Type:', typeof editFormData.id_fonction);
                                                
                                                const foundFunction = fonctions.find(f => String(f.id) === String(editFormData.id_fonction));
                                                if (foundFunction) {
                                                    console.log('✅ Fonction trouvée dans la liste:', {
                                                        id: foundFunction.id,
                                                        libele: foundFunction.libele || foundFunction.nom
                                                    });
                                                } else {
                                                    console.log('❌ Fonction NON trouvée dans la liste pour id_fonction:', editFormData.id_fonction);
                                                }
                                            }
                                            return null;
                                        })()}
                                        {fonctions.map(fonction => {
                                            const fonctionIdStr = String(fonction.id);
                                            const editFormIdStr = String(editFormData.id_fonction || '');
                                            const isSelected = fonctionIdStr === editFormIdStr;
                                            
                                            return (
                                                <option 
                                                    key={fonction.id} 
                                                    value={fonctionIdStr}
                                                >
                                                    {fonction.libele || fonction.nom}
                                                </option>
                                            );
                                        })}
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
                            <Col md={12}>
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

export default AgentFonctionsPage;
