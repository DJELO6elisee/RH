import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Table,
    Badge,
    Button,
    Alert,
    Spinner,
    Row,
    Col,
    FormGroup,
    Label,
    Input,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Pagination,
    PaginationItem,
    PaginationLink
} from 'reactstrap';

const typeConfig = {
    absence: { color: 'primary', label: 'Absence' },
    sortie_territoire: { color: 'info', label: 'Sortie territoire' },
    attestation_travail: { color: 'success', label: 'Attestation travail' },
    attestation_presence: { color: 'secondary', label: 'Attestation présence' },
    certificat_cessation: { color: 'danger', label: 'Certificat cessation' },
    certificat_reprise_service: { color: 'dark', label: 'Reprise de service' },
    autorisation_conges: { color: 'warning', label: 'Autorisation congé' },
    autorisation_retraite: { color: 'secondary', label: 'Autorisation retraite' }
};

const statusConfig = {
    en_attente: { color: 'warning', label: 'En attente', textColor: '#000' },
    en_cours: { color: 'info', label: 'En cours', textColor: '#000' },
    approuve: { color: 'success', label: 'Approuvée', textColor: '#000' },
    rejete: { color: 'danger', label: 'Rejetée', textColor: '#000' },
    finalise: { color: 'success', label: 'Finalisée', textColor: '#000' }
};

const DEFAULT_REMOTE_BASE_URL = 'https://tourisme.2ise-groupe.com';

const sanitizeBaseUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return null;
    }
    return url.trim().replace(/\/+$/, '');
};

const buildApiBaseCandidates = () => {
    const candidates = [];
    const envBase =
        sanitizeBaseUrl(process.env.REACT_APP_API_URL) ||
        sanitizeBaseUrl(process.env.REACT_APP_API_BASE_URL);

    if (envBase) {
        candidates.push(envBase);
    }

    if (typeof window !== 'undefined') {
        const { origin, hostname, protocol } = window.location;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            candidates.push(DEFAULT_REMOTE_BASE_URL);
            candidates.push(`${protocol}//localhost:5000`);
        } else {
            candidates.push(sanitizeBaseUrl(origin));
            candidates.push(DEFAULT_REMOTE_BASE_URL);
        }
    }

    if (candidates.length === 0) {
        candidates.push(DEFAULT_REMOTE_BASE_URL);
    }

    return [...new Set(candidates.filter(Boolean))];
};

const fetchWithBaseFallback = async (path, options = {}) => {
    const candidates = buildApiBaseCandidates();
    let lastError = null;

    for (const base of candidates) {
        try {
            const response = await fetch(`${base}${path}`, options);

            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;
            if (!(error instanceof TypeError)) {
                break;
            }
        }
    }

    throw lastError || new Error('Impossible de contacter l\'API');
};

const formatDate = (dateString, withTime = false) => {
    if (!dateString) return 'N/A';
    const options = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
};

const HistoriqueDemandes = ({ agentId, isValidateur = false }) => {
    const [demandesApprouvees, setDemandesApprouvees] = useState([]);
    const [demandesRejetees, setDemandesRejetees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('1'); // '1' pour approuvées, '2' pour rejetées
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [filtersApprouvees, setFiltersApprouvees] = useState({
        type_demande: '',
        date_debut: '',
        date_fin: '',
        page: 1,
        limit: 5
    });
    const [filtersRejetees, setFiltersRejetees] = useState({
        type_demande: '',
        date_debut: '',
        date_fin: '',
        page: 1,
        limit: 5
    });
    const [paginationApprouvees, setPaginationApprouvees] = useState({});
    const [paginationRejetees, setPaginationRejetees] = useState({});

    // Détecter la taille de l'écran
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Initialiser les dates pour l'année en cours
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const dateDebut = `${currentYear}-01-01`;
        const dateFin = `${currentYear}-12-31`;
        setFiltersApprouvees({
            type_demande: '',
            date_debut: dateDebut,
            date_fin: dateFin,
            page: 1,
            limit: 5
        });
        setFiltersRejetees({
            type_demande: '',
            date_debut: dateDebut,
            date_fin: dateFin,
            page: 1,
            limit: 5
        });
    }, []);

    const loadHistorique = async (filters, statusFilter, isRejetees = false) => {
        if (!agentId) return;

        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            
            if (filters.type_demande) {
                params.append('type_demande', filters.type_demande);
            }
            
            // Ajouter le filtre de statut
            if (statusFilter) {
                params.append('status', statusFilter);
            }
            
            // Ajouter les filtres de date si présents
            if (filters.date_debut) {
                params.append('date_debut', filters.date_debut);
            }
            if (filters.date_fin) {
                params.append('date_fin', filters.date_fin);
            }
            
            // Ajouter les paramètres de pagination
            if (filters.page) {
                params.append('page', filters.page);
            }
            if (filters.limit) {
                params.append('limit', filters.limit);
            }

            const queryString = params.toString();
            // Si isValidateur = true, on utilise l'endpoint d'historique par validateur (DRH, Ministre, Cabinet, etc.)
            // Sinon, on reste sur l'historique classique des demandes de l'agent.
            const basePath = isValidateur
                ? `/api/demandes/historique-validateur/${agentId}`
                : `/api/demandes/agent/${agentId}`;
            const url = `${basePath}${queryString ? `?${queryString}` : ''}`;

            const response = await fetchWithBaseFallback(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                const data = result.data || [];
                // Filtrer selon le statut
                if (statusFilter === 'approuve') {
                    // Pour les approuvées, inclure aussi les finalisées
                    const filtered = data.filter(d => 
                        d.status === 'approuve' || d.status === 'finalise'
                    );
                    setDemandesApprouvees(filtered);
                    // Gérer la pagination
                    if (result.pagination) {
                        setPaginationApprouvees(result.pagination);
                    } else {
                        // Pagination côté client
                        const total = filtered.length;
                        setPaginationApprouvees({
                            current_page: filters.page,
                            per_page: filters.limit,
                            total: total,
                            total_pages: Math.ceil(total / filters.limit)
                        });
                    }
                } else if (statusFilter === 'rejete') {
                    const filtered = data.filter(d => d.status === 'rejete');
                    setDemandesRejetees(filtered);
                    // Gérer la pagination
                    if (result.pagination) {
                        setPaginationRejetees(result.pagination);
                    } else {
                        // Pagination côté client
                        const total = filtered.length;
                        setPaginationRejetees({
                            current_page: filters.page,
                            per_page: filters.limit,
                            total: total,
                            total_pages: Math.ceil(total / filters.limit)
                        });
                    }
                }
            } else {
                throw new Error(result.error || 'Erreur lors du chargement de l\'historique');
            }
        } catch (err) {
            console.error('Erreur lors du chargement de l\'historique:', err);
            setError(err.message || 'Erreur lors du chargement de l\'historique');
        } finally {
            setLoading(false);
        }
    };

    // Charger les demandes approuvées
    useEffect(() => {
        if (agentId && filtersApprouvees.date_debut && filtersApprouvees.date_fin) {
            loadHistorique(filtersApprouvees, 'approuve', false);
        }
    }, [agentId, filtersApprouvees.type_demande, filtersApprouvees.date_debut, filtersApprouvees.date_fin, filtersApprouvees.page, filtersApprouvees.limit]);

    // Charger les demandes rejetées
    useEffect(() => {
        if (agentId && filtersRejetees.date_debut && filtersRejetees.date_fin) {
            loadHistorique(filtersRejetees, 'rejete', true);
        }
    }, [agentId, filtersRejetees.type_demande, filtersRejetees.date_debut, filtersRejetees.date_fin, filtersRejetees.page, filtersRejetees.limit]);

    const handleFilterChange = (field, value, isRejetees = false) => {
        if (isRejetees) {
            setFiltersRejetees(prev => ({
                ...prev,
                [field]: value,
                page: 1 // Reset to first page when filtering
            }));
        } else {
            setFiltersApprouvees(prev => ({
                ...prev,
                [field]: value,
                page: 1 // Reset to first page when filtering
            }));
        }
    };

    const handlePageChange = (page, isRejetees = false) => {
        if (isRejetees) {
            setFiltersRejetees(prev => ({
                ...prev,
                page
            }));
        } else {
            setFiltersApprouvees(prev => ({
                ...prev,
                page
            }));
        }
    };

    const handleLimitChange = (limit, isRejetees = false) => {
        if (isRejetees) {
            setFiltersRejetees(prev => ({
                ...prev,
                limit: parseInt(limit),
                page: 1 // Reset to first page when changing limit
            }));
        } else {
            setFiltersApprouvees(prev => ({
                ...prev,
                limit: parseInt(limit),
                page: 1 // Reset to first page when changing limit
            }));
        }
    };

    // Pagination côté client si l'API ne la supporte pas
    const getPaginatedDemandes = (demandes, filters) => {
        const pagination = filters === filtersApprouvees ? paginationApprouvees : paginationRejetees;
        if (pagination.total_pages && pagination.total_pages > 1 && pagination.total > demandes.length) {
            // L'API gère la pagination
            return demandes;
        }
        // Pagination côté client
        const startIndex = (filters.page - 1) * filters.limit;
        const endIndex = startIndex + filters.limit;
        return demandes.slice(startIndex, endIndex);
    };

    const getClientPagination = (filters) => {
        const pagination = filters === filtersApprouvees ? paginationApprouvees : paginationRejetees;
        if (pagination.total_pages && pagination.total_pages > 1 && pagination.total > (filters === filtersApprouvees ? demandesApprouvees : demandesRejetees).length) {
            return pagination;
        }
        // Calculer la pagination côté client
        const demandes = filters === filtersApprouvees ? demandesApprouvees : demandesRejetees;
        const total = demandes.length;
        const totalPages = Math.ceil(total / filters.limit);
        return {
            current_page: filters.page,
            per_page: filters.limit,
            total: total,
            total_pages: totalPages
        };
    };

    const getTypeLabel = (type) => {
        return typeConfig[type]?.label || type;
    };

    const getTypeColor = (type) => {
        return typeConfig[type]?.color || 'secondary';
    };

    const getStatusBadge = (status) => {
        const config = statusConfig[status] || { color: 'secondary', label: status };
        return (
            <Badge 
                color={config.color} 
                style={{ color: config.textColor || '#000', fontWeight: '500' }}
            >
                {config.label}
            </Badge>
        );
    };

    const getMotif = (demande) => {
        if (demande.motif_conge) {
            return demande.motif_conge;
        }
        if (demande.agree_motif) {
            return demande.agree_motif;
        }
        if (demande.description) {
            return demande.description;
        }
        return 'N/A';
    };

    const getNombreJours = (demande) => {
        if (demande.nombre_jours) {
            return `${demande.nombre_jours} jour(s)`;
        }
        if (demande.date_debut && demande.date_fin) {
            const debut = new Date(demande.date_debut);
            const fin = new Date(demande.date_fin);
            const diffTime = Math.abs(fin - debut);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return `${diffDays} jour(s)`;
        }
        return 'N/A';
    };

    const getMotifRejet = (demande) => {
        // Chercher le commentaire de rejet dans les différents champs selon le niveau
        if (demande.commentaire_sous_directeur && demande.statut_sous_directeur === 'rejete') {
            return demande.commentaire_sous_directeur;
        }
        if (demande.commentaire_directeur && demande.statut_directeur === 'rejete') {
            return demande.commentaire_directeur;
        }
        if (demande.commentaire_drh && demande.statut_drh === 'rejete') {
            return demande.commentaire_drh;
        }
        if (demande.commentaire_dir_cabinet && demande.statut_dir_cabinet === 'rejete') {
            return demande.commentaire_dir_cabinet;
        }
        if (demande.commentaire_ministre && demande.statut_ministre === 'rejete') {
            return demande.commentaire_ministre;
        }
        // Fallback: chercher dans tous les commentaires
        return demande.commentaire_sous_directeur || 
               demande.commentaire_directeur || 
               demande.commentaire_drh || 
               demande.commentaire_dir_cabinet || 
               demande.commentaire_ministre || 
               'Aucun motif de rejet spécifié';
    };

    const getValidateurRejet = (demande) => {
        if (demande.statut_sous_directeur === 'rejete') {
            return 'Sous-directeur';
        }
        if (demande.statut_directeur === 'rejete') {
            return 'Directeur';
        }
        if (demande.statut_drh === 'rejete') {
            return 'DRH';
        }
        if (demande.statut_dir_cabinet === 'rejete') {
            return 'Directeur de Cabinet';
        }
        if (demande.statut_ministre === 'rejete') {
            return 'Ministre';
        }
        return 'Supérieur hiérarchique';
    };

    const handleDemandeClick = (demande) => {
        setSelectedDemande(demande);
        setShowModal(true);
    };

    const toggleModal = () => {
        setShowModal(!showModal);
        if (!showModal) {
            setSelectedDemande(null);
        }
    };

    const renderTable = (demandes, showActions = false, filters) => {
        if (loading) {
            return (
                <div className="text-center py-4">
                    <Spinner color="primary" />
                    <p className="mt-2">Chargement de l'historique...</p>
                </div>
            );
        }

        if (error) {
            return (
                <Alert color="danger">
                    <i className="fa fa-exclamation-circle me-2"></i>
                    {error}
                </Alert>
            );
        }

        if (demandes.length === 0) {
            return (
                <Alert color="info">
                    <i className="fa fa-info-circle me-2"></i>
                    {showActions 
                        ? 'Aucune demande rejetée trouvée pour la période sélectionnée.'
                        : 'Aucune demande approuvée trouvée pour la période sélectionnée.'}
                </Alert>
            );
        }

        const paginatedDemandes = getPaginatedDemandes(demandes, filters);
        const pagination = getClientPagination(filters);

        return (
            <>
                {/* Contrôles de pagination */}
                {demandes.length > 0 && (
                    <Row className="mb-3">
                        <Col md="3">
                            <Input
                                type="select"
                                value={filters.limit}
                                onChange={(e) => handleLimitChange(e.target.value, showActions)}
                            >
                                <option value="5">5 par page</option>
                                <option value="10">10 par page</option>
                                <option value="20">20 par page</option>
                                <option value="50">50 par page</option>
                            </Input>
                        </Col>
                        <Col md="9" className="text-end">
                            <small className="text-muted">
                                {pagination.total} demande(s) au total
                            </small>
                        </Col>
                    </Row>
                )}

                {/* Version mobile : Cartes individuelles */}
                <div className="d-block d-md-none">
                    {paginatedDemandes.length === 0 ? (
                        <Alert color="info">
                            <i className="fa fa-info-circle me-2"></i>
                            Aucune demande sur cette page
                        </Alert>
                    ) : (
                        paginatedDemandes.map((demande) => (
                            <Card key={demande.id} className="mb-3">
                                <CardBody>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <Badge 
                                                color={getTypeColor(demande.type_demande)}
                                                style={{ color: '#000', fontWeight: '500' }}
                                                className="mb-2"
                                            >
                                                {getTypeLabel(demande.type_demande)}
                                            </Badge>
                                            <div className="mt-2">
                                                {getStatusBadge(demande.status)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <hr className="my-2" />
                                    
                                    <Row className="g-2">
                                        <Col xs="12">
                                            <small className="text-muted d-block">Motif</small>
                                            <div className="fw-bold" style={{ color: '#000' }}>
                                                {getMotif(demande)}
                                            </div>
                                        </Col>
                                        <Col xs="6">
                                            <small className="text-muted d-block">Nombre de jours</small>
                                            <div className="fw-bold" style={{ color: '#000' }}>
                                                {getNombreJours(demande)}
                                            </div>
                                        </Col>
                                        <Col xs="6">
                                            <small className="text-muted d-block">Date de création</small>
                                            <div className="fw-bold" style={{ color: '#000' }}>
                                                {formatDate(demande.date_creation, true)}
                                            </div>
                                        </Col>
                                        {demande.date_debut && demande.date_fin && (
                                            <Col xs="12">
                                                <small className="text-muted d-block">Période</small>
                                                <div className="fw-bold" style={{ color: '#000' }}>
                                                    {formatDate(demande.date_debut)} - {formatDate(demande.date_fin)}
                                                </div>
                                            </Col>
                                        )}
                                        {showActions && (
                                            <Col xs="12" className="mt-2">
                                                <Button 
                                                    color="info" 
                                                    size="sm" 
                                                    block
                                                    onClick={() => handleDemandeClick(demande)}
                                                    className="w-100"
                                                >
                                                    <i className="fa fa-eye me-1"></i>
                                                    Voir détails
                                                </Button>
                                            </Col>
                                        )}
                                    </Row>
                                </CardBody>
                            </Card>
                        ))
                    )}
                </div>

                {/* Version desktop : Tableau */}
                <div className="d-none d-md-block">
                    <div className="table-responsive">
                        <Table striped hover>
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>Type</th>
                                    <th>Motif</th>
                                    <th style={{ width: '130px' }}>Nombre de jours</th>
                                    <th style={{ width: '200px' }}>Période</th>
                                    <th style={{ width: '120px' }}>Statut</th>
                                    <th style={{ width: '150px' }}>Date de création</th>
                                    {showActions && <th style={{ width: '130px' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedDemandes.length === 0 ? (
                                    <tr>
                                        <td colSpan={showActions ? 7 : 6} className="text-center text-muted py-4">
                                            Aucune demande sur cette page
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedDemandes.map((demande) => (
                                        <tr key={demande.id}>
                                            <td>
                                                <Badge 
                                                    color={getTypeColor(demande.type_demande)}
                                                    style={{ color: '#000', fontWeight: '500' }}
                                                >
                                                    {getTypeLabel(demande.type_demande)}
                                                </Badge>
                                            </td>
                                            <td style={{ color: '#000' }}>{getMotif(demande)}</td>
                                            <td style={{ color: '#000' }}>{getNombreJours(demande)}</td>
                                            <td style={{ color: '#000' }}>
                                                {demande.date_debut && demande.date_fin ? (
                                                    <span>
                                                        {formatDate(demande.date_debut)} - {formatDate(demande.date_fin)}
                                                    </span>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </td>
                                            <td>{getStatusBadge(demande.status)}</td>
                                            <td style={{ color: '#000' }}>{formatDate(demande.date_creation, true)}</td>
                                            {showActions && (
                                                <td>
                                                    <Button 
                                                        color="info" 
                                                        size="sm" 
                                                        onClick={() => handleDemandeClick(demande)}
                                                    >
                                                        <i className="fa fa-eye me-1"></i>
                                                        Voir détails
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                        <Pagination>
                            <PaginationItem disabled={pagination.current_page === 1}>
                                <PaginationLink
                                    previous
                                    onClick={() => handlePageChange(pagination.current_page - 1, showActions)}
                                />
                            </PaginationItem>
                            
                            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(page => (
                                <PaginationItem key={page} active={page === pagination.current_page}>
                                    <PaginationLink onClick={() => handlePageChange(page, showActions)}>
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            
                            <PaginationItem disabled={pagination.current_page === pagination.total_pages}>
                                <PaginationLink
                                    next
                                    onClick={() => handlePageChange(pagination.current_page + 1, showActions)}
                                />
                            </PaginationItem>
                        </Pagination>
                    </div>
                )}
            </>
        );
    };

    const renderFilters = (filters, isRejetees = false) => {
        return (
            <Row className="mb-4">
                <Col md="4">
                    <FormGroup>
                        <Label>Type de demande</Label>
                        <Input
                            type="select"
                            value={filters.type_demande}
                            onChange={(e) => handleFilterChange('type_demande', e.target.value, isRejetees)}
                        >
                            <option value="">Tous les types</option>
                            <option value="absence">Absence</option>
                            <option value="sortie_territoire">Sortie territoire</option>
                            <option value="attestation_travail">Attestation travail</option>
                            <option value="attestation_presence">Attestation présence</option>
                            <option value="certificat_cessation">Certificat cessation</option>
                            <option value="certificat_reprise_service">Reprise de service</option>
                        </Input>
                    </FormGroup>
                </Col>
                <Col md="4">
                    <FormGroup>
                        <Label>Date de début</Label>
                        <Input
                            type="date"
                            value={filters.date_debut}
                            onChange={(e) => handleFilterChange('date_debut', e.target.value, isRejetees)}
                        />
                    </FormGroup>
                </Col>
                <Col md="4">
                    <FormGroup>
                        <Label>Date de fin</Label>
                        <Input
                            type="date"
                            value={filters.date_fin}
                            onChange={(e) => handleFilterChange('date_fin', e.target.value, isRejetees)}
                        />
                    </FormGroup>
                </Col>
            </Row>
        );
    };

    return (
        <>
        <Card>
            <CardHeader>
                <CardTitle>
                    <i className="fa fa-history me-2"></i>
                    Historique des Demandes
                </CardTitle>
            </CardHeader>
            <CardBody>
                <Nav tabs>
                    <NavItem>
                        <NavLink
                            className={activeTab === '1' ? 'active' : ''}
                            onClick={() => setActiveTab('1')}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="fa fa-check-circle me-2"></i>
                            Demandes Approuvées
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink
                            className={activeTab === '2' ? 'active' : ''}
                            onClick={() => setActiveTab('2')}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="fa fa-ban me-2"></i>
                            Demandes Rejetées
                        </NavLink>
                    </NavItem>
                </Nav>

                <TabContent activeTab={activeTab}>
                    <TabPane tabId="1">
                        {renderFilters(filtersApprouvees, false)}
                        {renderTable(demandesApprouvees, false, filtersApprouvees)}
                    </TabPane>
                    <TabPane tabId="2">
                        {renderFilters(filtersRejetees, true)}
                        {renderTable(demandesRejetees, true, filtersRejetees)}
                    </TabPane>
                </TabContent>
            </CardBody>
        </Card>

        {/* Modal pour afficher les détails d'une demande rejetée */}
        <Modal isOpen={showModal} toggle={toggleModal} size="lg">
            <ModalHeader toggle={toggleModal}>
                <i className="fa fa-ban me-2 text-danger"></i>
                Détails de la demande rejetée
            </ModalHeader>
            <ModalBody>
                {selectedDemande && (
                    <div>
                        <Row className="mb-3">
                            <Col md="6">
                                <strong>Type de demande:</strong>
                                <p>
                                    <Badge 
                                        color={getTypeColor(selectedDemande.type_demande)}
                                        style={{ color: '#000', fontWeight: '500' }}
                                    >
                                        {getTypeLabel(selectedDemande.type_demande)}
                                    </Badge>
                                </p>
                            </Col>
                            <Col md="6">
                                <strong>Statut:</strong>
                                <p>{getStatusBadge(selectedDemande.status)}</p>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col md="6">
                                <strong>Motif de la demande:</strong>
                                <p style={{ color: '#000' }}>{getMotif(selectedDemande)}</p>
                            </Col>
                            <Col md="6">
                                <strong>Nombre de jours:</strong>
                                <p style={{ color: '#000' }}>{getNombreJours(selectedDemande)}</p>
                            </Col>
                        </Row>

                        {selectedDemande.date_debut && selectedDemande.date_fin && (
                            <Row className="mb-3">
                                <Col md="6">
                                    <strong>Période:</strong>
                                    <p style={{ color: '#000' }}>
                                        Du {formatDate(selectedDemande.date_debut)} au {formatDate(selectedDemande.date_fin)}
                                    </p>
                                </Col>
                                <Col md="6">
                                    <strong>Date de création:</strong>
                                    <p style={{ color: '#000' }}>{formatDate(selectedDemande.date_creation, true)}</p>
                                </Col>
                            </Row>
                        )}

                        <hr />

                        <div className="alert alert-danger">
                            <h6 className="alert-heading">
                                <i className="fa fa-exclamation-triangle me-2"></i>
                                Motif de rejet
                            </h6>
                            <p className="mb-2">
                                <strong>Rejeté par:</strong> {getValidateurRejet(selectedDemande)}
                            </p>
                            <p className="mb-0">
                                <strong>Commentaire:</strong>
                            </p>
                            <div className="mt-2 p-3 bg-light rounded">
                                {getMotifRejet(selectedDemande)}
                            </div>
                        </div>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggleModal}>
                    Fermer
                </Button>
            </ModalFooter>
        </Modal>
        </>
    );
};

export default HistoriqueDemandes;

