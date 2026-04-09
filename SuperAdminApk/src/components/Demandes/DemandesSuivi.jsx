import React, { useState, useEffect } from 'react';
import {
    Card, CardBody, CardHeader, CardTitle, Table, Badge, Button, 
    Row, Col, Alert, Spinner, Modal, ModalHeader, ModalBody, ModalFooter,
    Pagination, PaginationItem, PaginationLink, Input
} from 'reactstrap';
import { useAuth } from '../../contexts/AuthContext';

const DemandesSuivi = () => {
    const { user } = useAuth();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 5
    });
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        if (user?.id_agent) {
            fetchDemandesSuivi();
        }
    }, [user?.id_agent, filters]);

    const fetchDemandesSuivi = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key] !== '') {
                    queryParams.append(key, filters[key]);
                }
            });

            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/suivi/${user.id_agent}?${queryParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setDemandes(data.data || []);
                // Si l'API retourne des infos de pagination, les utiliser
                if (data.pagination) {
                    setPagination(data.pagination);
                } else {
                    // Pagination côté client si l'API ne la supporte pas
                    const total = data.data?.length || 0;
                    setPagination({
                        current_page: filters.page,
                        per_page: filters.limit,
                        total: total,
                        total_pages: Math.ceil(total / filters.limit)
                    });
                }
            } else {
                setError(data.error || 'Erreur lors du chargement des autorisations');
            }
        } catch (err) {
            console.error('Erreur lors du chargement des autorisations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status, phase, niveauEvolution) => {
        if (status === 'approuve') {
            return <Badge color="success" style={{ color: '#fff', fontWeight: 'bold' }}>Approuvée</Badge>;
        }
        if (status === 'rejete') {
            return <Badge color="danger" style={{ color: '#fff', fontWeight: 'bold' }}>Rejetée</Badge>;
        }
        
        // Badge pour les autorisations en cours selon la phase
        if (phase === 'aller') {
            return <Badge color="info" style={{ color: '#fff', fontWeight: 'bold' }}>En cours (Aller)</Badge>;
        } else if (phase === 'retour') {
            return <Badge color="warning" style={{ color: '#000', fontWeight: 'bold' }}>En cours (Retour)</Badge>;
        }
        
        return <Badge color="secondary" style={{ color: '#000', fontWeight: 'bold' }}>En attente</Badge>;
    };

    const getTypeBadge = (type) => {
        const types = {
            'absence': { color: 'primary', text: 'Absence' },
            'sortie_territoire': { color: 'info', text: 'Sortie Territoire' },
            'attestation_travail': { color: 'success', text: 'Attestation Travail' },
            'attestation_presence': { color: 'secondary', text: 'Attestation Présence' },
            'certificat_cessation': { color: 'danger', text: 'Certificat Cessation' },
            'certificat_reprise_service': { color: 'dark', text: 'Reprise de Service' },
            'autorisation_conges': { color: 'warning', text: 'Autorisation Congé' },
            'autorisation_retraite': { color: 'secondary', text: 'Autorisation Retraite' }
        };
        const config = types[type] || { color: 'secondary', text: type };
        return <Badge color={config.color} style={{ color: '#fff', fontWeight: 'bold' }}>{config.text}</Badge>;
    };

    const getPrioriteBadge = (priorite) => {
        const priorites = {
            'normale': { color: 'secondary', text: 'Normale' },
            'urgente': { color: 'warning', text: 'Urgente' },
            'critique': { color: 'danger', text: 'Exceptionnelle' }
        };
        const config = priorites[priorite] || { color: 'secondary', text: priorite };
        return <Badge color={config.color} style={{ 
            color: config.color === 'warning' ? '#000' : '#fff', 
            fontWeight: 'bold' 
        }}>{config.text}</Badge>;
    };

    const buildLocalDateFromDbDate = (dateValue) => {
        if (!dateValue) return null;
        const raw = String(dateValue).trim();
        if (!raw) return null;

        // Si c'est une date pure (sans heure), on garde la date brute.
        const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            return new Date(Number(year), Number(month) - 1, Number(day));
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (dateString) => {
        const date = buildLocalDateFromDbDate(dateString);
        if (!date) return 'N/A';
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const handleVoirDetails = (demande) => {
        setSelectedDemande(demande);
        setShowDetails(true);
    };

    const handlePageChange = (page) => {
        setFilters(prev => ({
            ...prev,
            page
        }));
    };

    const handleLimitChange = (limit) => {
        setFilters(prev => ({
            ...prev,
            limit: parseInt(limit),
            page: 1 // Reset to first page when changing limit
        }));
    };

    // Pagination côté client si l'API ne la supporte pas
    const getPaginatedDemandes = () => {
        if (pagination.total_pages && pagination.total_pages > 1) {
            // L'API gère la pagination
            return demandes;
        }
        // Pagination côté client
        const startIndex = (filters.page - 1) * filters.limit;
        const endIndex = startIndex + filters.limit;
        return demandes.slice(startIndex, endIndex);
    };

    const getClientPagination = () => {
        if (pagination.total_pages && pagination.total_pages > 1) {
            return pagination;
        }
        // Calculer la pagination côté client
        const total = demandes.length;
        const totalPages = Math.ceil(total / filters.limit);
        return {
            current_page: filters.page,
            per_page: filters.limit,
            total: total,
            total_pages: totalPages
        };
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <Spinner color="primary" />
                <p className="mt-2">Chargement du suivi des autorisations...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                <h5>Erreur</h5>
                <p>{error}</p>
                <Button color="primary" onClick={fetchDemandesSuivi}>
                    Réessayer
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>
                        <i className="fa fa-tasks me-2"></i>
                        Suivi de mes autorisations
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    {/* Contrôles de pagination */}
                    {demandes.length > 0 && (
                        <Row className="mb-3">
                            <Col md="3">
                                <Input
                                    type="select"
                                    value={filters.limit}
                                    onChange={(e) => handleLimitChange(e.target.value)}
                                >
                                    <option value="5">5 par page</option>
                                    <option value="10">10 par page</option>
                                    <option value="20">20 par page</option>
                                    <option value="50">50 par page</option>
                                </Input>
                            </Col>
                            <Col md="9" className="text-end">
                                <small className="text-muted">
                                    {getClientPagination().total} demande(s) au total
                                </small>
                            </Col>
                        </Row>
                    )}

                    {demandes.length === 0 ? (
                        <Alert color="info">
                            <h5>Aucune demande</h5>
                            <p>Vous n'avez pas encore d'autorisations à suivre.</p>
                        </Alert>
                    ) : (
                        <>
                            <Table responsive striped>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Motif</th>
                                        <th>Période</th>
                                        <th>Priorité</th>
                                        <th>Statut</th>
                                        <th>Phase</th>
                                        <th>Détail</th>
                                        <th>Date création</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedDemandes().map((demande) => (
                                    <tr key={demande.id}>
                                        <td>{getTypeBadge(demande.type_demande)}</td>
                                        <td>
                                            <div style={{ maxWidth: '200px', overflow: 'hidden' }}>
                                                {demande.description || 'Aucun motif'}
                                            </div>
                                        </td>
                                        <td>
                                            {(demande.type_demande || '').toLowerCase() === 'certificat_reprise_service' ? (
                                                <div>
                                                    <div><strong>Reprise:</strong> {demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}</div>
                                                </div>
                                            ) : demande.date_debut && demande.date_fin ? (
                                                <div>
                                                    <div><strong>Du:</strong> {formatDate(demande.date_debut)}</div>
                                                    <div><strong>Au:</strong> {formatDate(demande.date_fin)}</div>
                                                </div>
                                            ) : (
                                                'N/A'
                                            )}
                                        </td>
                                        <td>{getPrioriteBadge(demande.priorite)}</td>
                                        <td>{getStatusBadge(demande.status, demande.phase, demande.niveau_evolution_demande)}</td>
                                        <td>
                                            <Badge color={demande.phase === 'aller' ? 'info' : 'warning'}>
                                                {demande.phase === 'aller' ? 'Aller' : 'Retour'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <small className="text-muted">
                                                {demande.statut_detaille || 'Statut inconnu'}
                                            </small>
                                        </td>
                                        <td>{formatDate(demande.date_creation)}</td>
                                        <td>
                                            <Button
                                                color="info"
                                                size="sm"
                                                className="me-1"
                                                title="Voir les détails"
                                                onClick={() => handleVoirDetails(demande)}
                                            >
                                                <i className="fa fa-eye"></i> Voir
                                            </Button>
                                        </td>
                                    </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {/* Pagination */}
                            {getClientPagination().total_pages > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <Pagination>
                                        <PaginationItem disabled={getClientPagination().current_page === 1}>
                                            <PaginationLink
                                                previous
                                                onClick={() => handlePageChange(getClientPagination().current_page - 1)}
                                            />
                                        </PaginationItem>
                                        
                                        {Array.from({ length: getClientPagination().total_pages }, (_, i) => i + 1).map(page => (
                                            <PaginationItem key={page} active={page === getClientPagination().current_page}>
                                                <PaginationLink onClick={() => handlePageChange(page)}>
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        
                                        <PaginationItem disabled={getClientPagination().current_page === getClientPagination().total_pages}>
                                            <PaginationLink
                                                next
                                                onClick={() => handlePageChange(getClientPagination().current_page + 1)}
                                            />
                                        </PaginationItem>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Modal de détails */}
            <Modal isOpen={showDetails} toggle={() => setShowDetails(false)} size="lg">
                <ModalHeader toggle={() => setShowDetails(false)}>
                    Détails de la demande
                </ModalHeader>
                <ModalBody>
                    {selectedDemande && (
                        <div>
                            <Row>
                                <Col md="6">
                                    <h6>Informations générales</h6>
                                    <p><strong>Type:</strong> {getTypeBadge(selectedDemande.type_demande)}</p>
                                    <p><strong>Priorité:</strong> {getPrioriteBadge(selectedDemande.priorite)}</p>
                                    <p><strong>Statut:</strong> {getStatusBadge(selectedDemande.status, selectedDemande.phase, selectedDemande.niveau_evolution_demande)}</p>
                                    <p><strong>Phase:</strong> {selectedDemande.phase === 'aller' ? 'Aller' : 'Retour'}</p>
                                </Col>
                                <Col md="6">
                                    <h6>Période</h6>
                                    {(selectedDemande.type_demande || '').toLowerCase() === 'certificat_reprise_service' ? (
                                        <>
                                            <p><strong>Date de reprise:</strong> {selectedDemande.date_reprise_service ? formatDate(selectedDemande.date_reprise_service) : 'Non renseignée'}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p><strong>Date début:</strong> {formatDate(selectedDemande.date_debut)}</p>
                                            <p><strong>Date fin:</strong> {formatDate(selectedDemande.date_fin)}</p>
                                            <p><strong>Lieu:</strong> {selectedDemande.lieu || 'N/A'}</p>
                                        </>
                                    )}
                                </Col>
                            </Row>
                            <Row>
                                <Col md="12">
                                    <h6>Motif</h6>
                                    <p>{selectedDemande.description || 'Aucun motif'}</p>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="12">
                                    <h6>Suivi détaillé</h6>
                                    <p><strong>Statut actuel:</strong> {selectedDemande.statut_detaille || 'Statut inconnu'}</p>
                                    <p><strong>Date de création:</strong> {formatDate(selectedDemande.date_creation)}</p>
                                </Col>
                            </Row>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowDetails(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default DemandesSuivi;
