import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Table,
    Button,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    Row,
    Col,
    Badge,
    Spinner,
    Alert
} from 'reactstrap';
import { MdSearch, MdPerson, MdDownload, MdPrint, MdVisibility } from 'react-icons/md';
import Page from 'components/Page';
import { useAuth } from 'contexts/AuthContext';
import { useHistory } from 'react-router-dom';

const FicheSignaletiquePage = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // Terme de recherche affiché dans l'input
    const [searchQuery, setSearchQuery] = useState(''); // Terme de recherche utilisé pour l'API (avec debounce)
    const { user } = useAuth();
    const history = useHistory();
    const debounceTimer = useRef(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Debounce pour la recherche : attendre 500ms après la dernière saisie avant de lancer la recherche
    useEffect(() => {
        // Nettoyer le timer précédent si l'utilisateur tape encore
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // Créer un nouveau timer
        debounceTimer.current = setTimeout(() => {
            setSearchQuery(searchTerm);
            setCurrentPage(1); // Réinitialiser à la page 1 lors d'une nouvelle recherche
        }, 500); // Attendre 500ms après la dernière frappe

        // Nettoyer le timer lors du démontage du composant
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [searchTerm]);

    const fetchAgents = React.useCallback(async () => {
        try {
            setLoading(true);
            
            // Construire l'URL avec les paramètres de pagination et de recherche
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString()
            });
            
            if (searchQuery.trim()) {
                params.append('search', searchQuery.trim());
            }
            
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des agents');
            }

            const data = await response.json();
            setAgents(data.data || []);
            // Gérer différentes structures de réponse API
            const pagination = data.pagination || data.meta || {};
            // Le backend retourne total_pages, pas totalPages
            const totalPagesValue = pagination.total_pages || pagination.totalPages || Math.ceil((pagination.total || pagination.totalCount || 0) / itemsPerPage) || 1;
            const totalItemsValue = pagination.total || pagination.totalCount || pagination.totalItems || 0;
            console.log('📄 Pagination - totalPages:', totalPagesValue, 'totalItems:', totalItemsValue, 'pagination object:', pagination);
            setTotalPages(totalPagesValue);
            setTotalItems(totalItemsValue);
        } catch (err) {
            console.error('Erreur:', err);
            setError('Erreur lors du chargement des agents');
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, searchQuery]);

    // Lancer la recherche quand searchQuery change (après le debounce)
    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const handleViewFiche = (agentId) => {
        history.push(`/fiche-signaletique/${agentId}`);
    };

    const handleDownloadFiche = async (agentId) => {
        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}/fiche-signaletique/pdf-test`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la génération du PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fiche-signaletique-${agentId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            alert('Erreur lors du téléchargement de la fiche');
        }
    };

    const handlePrintFiche = async (agentId) => {
        try {
            console.log('🚀 Début de l\'impression PDF pour l\'agent:', agentId);
            
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}/fiche-signaletique/pdf-test`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            console.log('📊 Status de la réponse:', response.status);
            console.log('📊 Content-Type:', response.headers.get('content-type'));

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
            }

            // Vérifier que c'est bien un PDF
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                console.error('❌ Le serveur n\'a pas retourné un PDF. Content-Type:', contentType);
                const text = await response.text();
                console.error('📄 Contenu reçu:', text);
                throw new Error('Le serveur n\'a pas retourné un fichier PDF valide');
            }

            const blob = await response.blob();
            console.log('📦 Blob créé, taille:', blob.size, 'bytes');

            if (blob.size === 0) {
                throw new Error('Le fichier PDF est vide');
            }

            // Créer un blob et l'ouvrir dans une nouvelle fenêtre pour impression
            const url = window.URL.createObjectURL(blob);
            const printWindow = window.open(url, '_blank');
            
            // Attendre que le PDF soit chargé puis déclencher l'impression
            printWindow.onload = () => {
                printWindow.print();
                // Nettoyer l'URL après impression
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    console.log('✅ Impression terminée et nettoyée');
                }, 1000);
            };
        } catch (err) {
            console.error('❌ Erreur lors de l\'impression:', err);
            alert(`Erreur lors de l\'impression de la fiche: ${err.message}`);
        }
    };

    // Fonctions de pagination
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        // Ne pas réinitialiser currentPage ici, c'est fait dans le debounce useEffect
    };

    // Ne pas afficher le spinner de chargement complet si c'est juste une recherche
    // Afficher seulement un indicateur de chargement dans le tableau
    const isInitialLoad = loading && agents.length === 0;

    if (isInitialLoad) {
        return (
            <Page title="Fiche Signalétique">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner color="primary" />
                </div>
            </Page>
        );
    }

    if (error) {
        return (
            <Page title="Fiche Signalétique">
                <Alert color="danger">{error}</Alert>
            </Page>
        );
    }

    return (
        <Page title="Fiche Signalétique">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <h4 className="mb-0">
                                <MdPerson className="mr-2" />
                                Liste des Agents - Fiche Signalétique
                            </h4>
                            <p className="text-muted mb-0">
                                Sélectionnez un agent pour consulter, télécharger ou imprimer sa fiche signalétique
                            </p>
                        </CardHeader>
                        <CardBody>
                            {/* Barre de recherche */}
                            <Row className="mb-4">
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroupAddon addonType="prepend">
                                            <InputGroupText>
                                                <MdSearch />
                                            </InputGroupText>
                                        </InputGroupAddon>
                                        <Input
                                            type="text"
                                            placeholder="Rechercher par nom, prénoms, matricule ou grade..."
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            onKeyDown={(e) => {
                                                // Empêcher la soumission du formulaire si l'input est dans un formulaire
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md={6} className="text-right">
                                    <Badge color="info" className="p-2">
                                        {totalItems} agent(s) trouvé(s)
                                    </Badge>
                                </Col>
                            </Row>

                            {/* Tableau des agents */}
                            <div className="table-responsive" style={{ position: 'relative' }}>
                                {loading && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        zIndex: 10
                                    }}>
                                        <Spinner color="primary" />
                                    </div>
                                )}
                                <Table hover>
                                    <thead>
                                        <tr>
                                            <th>N°</th>
                                            <th>Photo</th>
                                            <th>Nom & Prénoms</th>
                                            <th>Matricule</th>
                                            <th>Grade</th>
                                            <th>Statut de l'agent</th>
                                            <th>Ministère</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="text-center py-4">
                                                    <div className="text-muted">
                                                        <MdPerson size={48} className="mb-2" />
                                                        <p>Aucun agent trouvé</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            agents.map((agent, index) => (
                                                <tr key={agent.id}>
                                                    <td className="fw-bold text-center">
                                                        {((currentPage - 1) * itemsPerPage) + index + 1}
                                                    </td>
                                                    <td>
                                                        <div className="avatar-sm">
                                                            {agent.photo_profil ? (
                                                                <img
                                                                    src={`/uploads/photos/${agent.photo_profil}`}
                                                                    alt={`${agent.nom} ${agent.prenom}`}
                                                                    className="rounded-circle"
                                                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                                                    style={{ width: '40px', height: '40px' }}
                                                                >
                                                                    <MdPerson size={20} className="text-muted" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div>
                                                            <strong>{agent.nom} {agent.prenom}</strong>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <strong>{agent.matricule}</strong>
                                                    </td>
                                                    <td>
                                                        <strong>{agent.grade_libele || 'N/A'}</strong>
                                                    </td>
                                                    <td>
                                                        <strong>{agent.type_agent_libele || 'N/A'}</strong>
                                                    </td>
                                                    <td>
                                                        {agent.ministere_nom || 'N/A'}
                                                    </td>
                                                    <td>
                                                        <div className="btn-group" role="group">
                                                            <Button
                                                                color="info"
                                                                size="sm"
                                                                onClick={() => handleViewFiche(agent.id)}
                                                                title="Consulter la fiche"
                                                            >
                                                                <MdVisibility />
                                                            </Button>
                                                            <Button
                                                                color="success"
                                                                size="sm"
                                                                onClick={() => handleDownloadFiche(agent.id)}
                                                                title="Télécharger PDF"
                                                            >
                                                                <MdDownload />
                                                            </Button>
                                                            <Button
                                                                color="warning"
                                                                size="sm"
                                                                onClick={() => handlePrintFiche(agent.id)}
                                                                title="Imprimer"
                                                            >
                                                                <MdPrint />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalItems > 0 && (
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
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Page>
    );
};

export default FicheSignaletiquePage;
