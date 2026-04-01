import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    Table,
    Badge,
    Button,
    Row,
    Col,
    Input,
    Alert,
    Spinner,
    Pagination,
    PaginationItem,
    PaginationLink,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'reactstrap';

const DemandesList = ({ agentId, onDemandeClick, typeDemande = '' }) => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        type_demande: typeDemande || '',
        page: 1,
        limit: 5
    });
    const isTypeLocked = !!typeDemande;
    const [pagination, setPagination] = useState({});
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return window.innerWidth < 768;
    });
    
    // Référence pour vérifier si le composant est monté
    const isMountedRef = useRef(true);

    useEffect(() => {
        loadDemandes();
    }, [agentId, filters]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadDemandes = async () => {
        // Vérifier si le composant est encore monté avant de commencer
        if (!isMountedRef.current) {
            console.log('🔍 Composant démonté, annulation de loadDemandes');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    queryParams.append(key, filters[key]);
                }
            });

            // IMPORTANT : Cet endpoint récupère UNIQUEMENT les demandes créées par l'agent lui-même
            // Les demandes créées par d'autres agents (à valider) sont gérées par DemandesDRHList
            // Ces deux listes ne doivent JAMAIS afficher les mêmes demandes
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/agent/${agentId}?${queryParams.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (result.success) {
                setDemandes(result.data);
                setPagination(result.pagination);
            } else {
                setError(result.error || 'Erreur lors du chargement des autorisations');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value,
            page: 1 // Reset to first page when filtering
        }));
    };

    const handlePageChange = (page) => {
        setFilters(prev => ({
            ...prev,
            page
        }));
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'en_attente': { color: 'warning', text: 'En attente', style: { color: '#000', fontWeight: 'bold' } },
            'approuve': { color: 'success', text: 'Approuvée', style: { color: '#fff', fontWeight: 'bold' } },
            'rejete': { color: 'danger', text: 'Rejetée', style: { color: '#fff', fontWeight: 'bold' } }
        };
        const config = statusConfig[status] || { color: 'secondary', text: status, style: { color: '#000', fontWeight: 'bold' } };
        return <Badge color={config.color} style={config.style}>{config.text}</Badge>;
    };

    const getTypeDemandeLabel = (type) => {
        const labels = {
            'absence': 'Absence',
            'sortie_territoire': 'Sortie territoire',
            'attestation_travail': 'Attestation travail',
            'attestation_presence': 'Attestation présence',
            'certificat_cessation': 'Certificat cessation',
            'certificat_reprise_service': 'Reprise de service',
            'autorisation_conges': 'Autorisation congé',
            'autorisation_retraite': 'Autorisation retraite'
        };
        return labels[type] || type;
    };

    const getNiveauEvolutionBadge = (niveau, phase) => {
        const niveaux = {
            'soumis': { color: 'info', text: 'Soumis', style: { color: '#fff', fontWeight: 'bold' } },
            'en_cours_traitement': { color: 'primary', text: 'En cours', style: { color: '#fff', fontWeight: 'bold' } },
            'valide_par_superieur': { color: 'warning', text: 'En attente supérieur', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_sous_directeur': { color: 'warning', text: 'En attente sous-directeur', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_directeur': { color: 'warning', text: 'En attente directeur', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_drh': { color: 'warning', text: 'En attente DRH', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_dir_cabinet': { color: 'warning', text: 'En attente Dir Cabinet', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_chef_cabinet': { color: 'warning', text: 'En attente Chef Cabinet', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_directeur_general': { color: 'warning', text: 'En attente Dir Général', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_directeur_central': { color: 'warning', text: 'En attente Dir Central', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_directeur_service_exterieur': { color: 'warning', text: 'En attente Dir. service ext.', style: { color: '#000', fontWeight: 'bold' } },
            'valide_par_ministre': { color: 'warning', text: 'En attente ministre', style: { color: '#000', fontWeight: 'bold' } },
            'retour_dir_cabinet': { color: 'warning', text: 'Retour Dir Cabinet', style: { color: '#000', fontWeight: 'bold' } },
            'retour_ministre': { color: 'warning', text: 'Retour ministre', style: { color: '#000', fontWeight: 'bold' } },
            'retour_drh': { color: 'warning', text: 'Retour DRH', style: { color: '#000', fontWeight: 'bold' } },
            'retour_chef_service': { color: 'warning', text: 'Retour chef service', style: { color: '#000', fontWeight: 'bold' } },
            'finalise': { color: 'success', text: 'Finalisé', style: { color: '#fff', fontWeight: 'bold' } }
        };
        const config = niveaux[niveau] || { color: 'secondary', text: niveau, style: { color: '#000', fontWeight: 'bold' } };
        return <Badge color={config.color} style={config.style}>{config.text}</Badge>;
    };

    const getPhaseBadge = (phase) => {
        const phases = {
            'aller': { color: 'primary', text: 'Phase aller', style: { color: '#fff', fontWeight: 'bold' } },
            'retour': { color: 'warning', text: 'Phase retour', style: { color: '#000', fontWeight: 'bold' } }
        };
        const config = phases[phase] || { color: 'secondary', text: phase || 'Inconnue', style: { color: '#000', fontWeight: 'bold' } };
        return <Badge color={config.color} style={config.style}>{config.text}</Badge>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <Spinner color="primary" />
                <span className="ml-2">Chargement des autorisations...</span>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <Row className="align-items-center">
                    <Col>
                        <h5 className="mb-0">
                            <i className="fa fa-list me-2"></i>
                            Mes autorisations
                        </h5>
                    </Col>
                    <Col md="auto">
                        <Button color="primary" size="sm" onClick={() => onDemandeClick('create')}>
                            <i className="fa fa-plus me-1"></i>
                            Nouvelle demande
                        </Button>
                    </Col>
                </Row>
            </CardHeader>
            <CardBody>
                {error && (
                    <Alert color="danger">
                        <i className="fa fa-exclamation-triangle me-2"></i>
                        {error}
                    </Alert>
                )}

                {/* Filtres */}
                <Row className="mb-3">
                    <Col xs="12" md="3" className="mb-2 mb-md-0">
                        <Input
                            type="select"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">Tous les statuts</option>
                            <option value="en_attente">En attente</option>
                            <option value="approuve">Approuvées</option>
                            <option value="rejete">Rejetées</option>
                        </Input>
                    </Col>
                    <Col xs="12" md="3" className="mb-2 mb-md-0">
                        <Input
                            type="select"
                            value={filters.type_demande}
                            onChange={(e) => handleFilterChange('type_demande', e.target.value)}
                            disabled={isTypeLocked}
                            style={{ 
                                backgroundColor: isTypeLocked ? '#f8f9fa' : 'white',
                                color: isTypeLocked ? '#6c757d' : 'inherit'
                            }}
                        >
                            <option value="">Tous les types</option>
                            <option value="absence">Absence</option>
                            <option value="sortie_territoire">Sortie territoire</option>
                            <option value="attestation_travail">Attestation travail</option>
                            <option value="attestation_presence">Attestation présence</option>
                            <option value="certificat_cessation">Certificat cessation</option>
                            <option value="certificat_reprise_service">Autorisation reprise</option>
                            <option value="autorisation_conges">Autorisation congé</option>
                            <option value="autorisation_retraite">Autorisation retraite</option>
                        </Input>
                    </Col>
                    <Col xs="12" md="3" className="mb-2 mb-md-0">
                        <Input
                            type="select"
                            value={filters.limit}
                            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        >
                            <option value="5">5 par page</option>
                            <option value="10">10 par page</option>
                            <option value="25">25 par page</option>
                            <option value="50">50 par page</option>
                        </Input>
                    </Col>
                    <Col xs="12" md="3">
                        <Dropdown isOpen={sortDropdownOpen} toggle={() => setSortDropdownOpen(!sortDropdownOpen)}>
                            <DropdownToggle caret color="outline-secondary" size="sm">
                                <i className="fa fa-sort me-1"></i>
                                Trier
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem>Date (plus récent)</DropdownItem>
                                <DropdownItem>Date (plus ancien)</DropdownItem>
                                <DropdownItem>Statut</DropdownItem>
                                <DropdownItem>Type</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                </Row>

                {/* Table des autorisations */}
                {!isMobile ? (
                    <div className="table-responsive" style={{ 
                        maxWidth: '100%',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        maxHeight: '600px'
                    }}>
                        <Table hover style={{ minWidth: '800px' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '11%' }}>Type</th>
                                    <th style={{ width: '14%' }}>Motif</th>
                                    <th style={{ width: '14%' }}>{ 
                                        (filters.type_demande || '').toLowerCase() === 'certificat_cessation'
                                            ? 'Motif / Date cessation'
                                            : (filters.type_demande || '').toLowerCase() === 'certificat_reprise_service'
                                                ? 'Fin congés / Reprise'
                                                : 'Période'
                                    }</th>
                                    <th style={{ width: '7%' }}>Statut</th>
                                    <th style={{ width: '7%' }}>Phase</th>
                                    <th style={{ width: '12%' }}>Niveau</th>
                                    <th style={{ width: '9%' }}>Date création</th>
                                    <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {demandes.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted py-4">
                                            <i className="fa fa-inbox fa-2x mb-2 d-block"></i>
                                            Aucune demande trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    demandes.map((demande) => (
                                        <tr key={demande.id} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div style={{ 
                                                    maxWidth: '150px', 
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <Badge color="info" style={{ 
                                                        color: '#000', 
                                                        fontWeight: 'bold', 
                                                        backgroundColor: '#e3f2fd',
                                                        fontSize: '0.75rem',
                                                        padding: '4px 8px',
                                                        display: 'inline-block',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }} title={getTypeDemandeLabel(demande.type_demande)}>
                                                        {getTypeDemandeLabel(demande.type_demande)}
                                                    </Badge>
                                                    {demande.priorite === 'urgente' && (
                                                        <Badge color="warning" className="ms-1" style={{ fontSize: '0.7rem' }}>Urgent</Badge>
                                                    )}
                                                    {demande.priorite === 'critique' && (
                                                        <Badge color="danger" className="ms-1" style={{ fontSize: '0.7rem' }}>Exceptionnelle</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ 
                                                    maxWidth: '180px', 
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    padding: '4px 0'
                                                }} title={demande.description || 'Aucun motif'}>
                                                    <span style={{ fontSize: '0.9rem' }}>
                                                        {demande.description || 'Aucun motif'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                {(filters.type_demande || '').toLowerCase() === 'certificat_cessation' ? (
                                                    <div>
                                                        <small className="text-muted">Motif</small><br />
                                                        {demande.agree_motif || 'Non renseigné'}<br />
                                                        <small className="text-muted">Date</small><br />
                                                        {demande.agree_date_cessation ? formatDate(demande.agree_date_cessation) : 'Non renseigné'}
                                                    </div>
                                                ) : (filters.type_demande || '').toLowerCase() === 'certificat_reprise_service' ? (
                                                    <div>
                                                        <small className="text-muted">Fin congés</small><br />
                                                        {demande.date_fin_conges ? formatDate(demande.date_fin_conges) : 'Non renseigné'}<br />
                                                        <small className="text-muted">Reprise</small><br />
                                                        {demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}
                                                    </div>
                                                ) : (
                                                    demande.date_debut && demande.date_fin ? (
                                                        <div>
                                                            <small className="text-muted">Du</small><br />
                                                            {formatDate(demande.date_debut)}<br />
                                                            <small className="text-muted">Au</small><br />
                                                            {formatDate(demande.date_fin)}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted">N/A</span>
                                                    )
                                                )}
                                            </td>
                                            <td>{getStatusBadge(demande.status)}</td>
                                            <td>{getPhaseBadge(demande.phase)}</td>
                                            <td>
                                                <div style={{ 
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <div style={{ 
                                                        fontSize: '0.65rem',
                                                        padding: '2px 4px',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }} title={demande.niveau_evolution_demande}>
                                                        {getNiveauEvolutionBadge(
                                                            // Si la demande est approuvée ou finalisée (DRH a validé), afficher "Finalisé"
                                                            demande.status === 'approuve' || demande.niveau_actuel === 'finalise'
                                                                ? 'finalise'
                                                                : demande.niveau_actuel === 'drh'
                                                                ? 'valide_par_drh'
                                                                : demande.niveau_evolution_demande,
                                                            demande.phase
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{formatDate(demande.date_creation)}</td>
                                            <td
                                                style={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    if (e.target.closest('button')) return;
                                                    e.stopPropagation();
                                                    if (typeof onDemandeClick === 'function') {
                                                        onDemandeClick('view', demande);
                                                    }
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        if (typeof onDemandeClick === 'function') {
                                                            onDemandeClick('view', demande);
                                                        }
                                                    }
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '100%',
                                                    display: 'flex', 
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    padding: '2px'
                                                }}>
                                                    <Button
                                                        type="button"
                                                        color="outline-primary"
                                                        size="sm"
                                                        data-demande-id={demande.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (typeof onDemandeClick === 'function') {
                                                                onDemandeClick('view', demande);
                                                            }
                                                        }}
                                                        title="Voir les détails"
                                                        style={{ 
                                                            fontSize: '0.7rem', 
                                                            padding: '2px 4px',
                                                            minWidth: '45px',
                                                            height: '26px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <i className="fa fa-eye me-1"></i>
                                                        Voir
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                ) : (
                    <div className="demande-mobile-list">
                        {demandes.length === 0 ? (
                            <div className="text-center text-muted py-4">
                                <i className="fa fa-inbox fa-2x mb-2 d-block"></i>
                                Aucune demande trouvée
                            </div>
                        ) : (
                            demandes.map((demande) => (
                                <div className="demande-mobile-card" key={demande.id}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Badge color="info" className="demande-mobile-badge">
                                            {getTypeDemandeLabel(demande.type_demande)}
                                        </Badge>
                                        <span className="demande-mobile-date">
                                            {formatDate(demande.date_creation)}
                                        </span>
                                    </div>

                                    <div className="demande-mobile-row">
                                        <span className="demande-mobile-label">Statut</span>
                                        <span className="demande-mobile-value">{getStatusBadge(demande.status)}</span>
                                    </div>

                                    <div className="demande-mobile-row">
                                        <span className="demande-mobile-label">Phase</span>
                                        <span className="demande-mobile-value">{getPhaseBadge(demande.phase)}</span>
                                    </div>

                                    <div className="demande-mobile-row">
                                        <span className="demande-mobile-label">Niveau</span>
                                        <span className="demande-mobile-value">
                                            {getNiveauEvolutionBadge(
                                                demande.status === 'approuve' || demande.niveau_actuel === 'finalise'
                                                    ? 'finalise'
                                                    : demande.niveau_actuel === 'drh'
                                                    ? 'valide_par_drh'
                                                    : demande.niveau_evolution_demande,
                                                demande.phase
                                            )}
                                        </span>
                                    </div>

                                    <div className="demande-mobile-section">
                                        {(filters.type_demande || '').toLowerCase() === 'certificat_cessation' ? (
                                            <>
                                                <div className="demande-mobile-row">
                                                    <span className="demande-mobile-label">Motif</span>
                                                    <span className="demande-mobile-text">{demande.agree_motif || 'Non renseigné'}</span>
                                                </div>
                                                <div className="demande-mobile-row">
                                                    <span className="demande-mobile-label">Date</span>
                                                    <span className="demande-mobile-text">
                                                        {demande.agree_date_cessation ? formatDate(demande.agree_date_cessation) : 'Non renseigné'}
                                                    </span>
                                                </div>
                                            </>
                                        ) : (filters.type_demande || '').toLowerCase() === 'certificat_reprise_service' ? (
                                            <>
                                                <div className="demande-mobile-row">
                                                    <span className="demande-mobile-label">Fin congés</span>
                                                    <span className="demande-mobile-text">
                                                        {demande.date_fin_conges ? formatDate(demande.date_fin_conges) : 'Non renseigné'}
                                                    </span>
                                                </div>
                                                <div className="demande-mobile-row">
                                                    <span className="demande-mobile-label">Reprise</span>
                                                    <span className="demande-mobile-text">
                                                        {demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}
                                                    </span>
                                                </div>
                                            </>
                                        ) : demande.date_debut && demande.date_fin ? (
                                            <>
                                                <div className="demande-mobile-row">
                                                    <span className="demande-mobile-label">Du</span>
                                                    <span className="demande-mobile-text">{formatDate(demande.date_debut)}</span>
                                                </div>
                                                <div className="demande-mobile-row">
                                                    <span className="demande-mobile-label">Au</span>
                                                    <span className="demande-mobile-text">{formatDate(demande.date_fin)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="demande-mobile-row">
                                                <span className="demande-mobile-label">Période</span>
                                                <span className="demande-mobile-text text-muted">N/A</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="demande-mobile-row">
                                        <span className="demande-mobile-label">Motif</span>
                                        <span className="demande-mobile-text">
                                            {demande.description || 'Aucun motif'}
                                        </span>
                                    </div>

                                    <div className="text-end mt-3">
                                        <Button
                                            type="button"
                                            color="primary"
                                            size="sm"
                                            data-demande-id={demande.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (typeof onDemandeClick === 'function') {
                                                    onDemandeClick('view', demande);
                                                }
                                            }}
                                        >
                                            <i className="fa fa-eye me-1"></i>
                                            Voir la demande
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                        <Pagination>
                            <PaginationItem disabled={pagination.current_page === 1}>
                                <PaginationLink
                                    previous
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                />
                            </PaginationItem>
                            
                            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(page => (
                                <PaginationItem key={page} active={page === pagination.current_page}>
                                    <PaginationLink onClick={() => handlePageChange(page)}>
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            
                            <PaginationItem disabled={pagination.current_page === pagination.total_pages}>
                                <PaginationLink
                                    next
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                />
                            </PaginationItem>
                        </Pagination>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default DemandesList;
