import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    Form,
    FormGroup,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Row,
    Spinner,
    Table
} from 'reactstrap';
import {
    MdAssignment,
    MdCheckCircle,
    MdDelete,
    MdPerson,
    MdRefresh,
    MdSearch,
    MdRoute,
    MdPeople,
    MdInfo,
    MdClear,
    MdSelectAll,
    MdVisibility,
    MdClose
} from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getAuthHeaders } from '../config/api';
import { backendRoutes } from '../config/routes';

const API_BASE_URL = getApiUrl();

const AttributionTachesPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [selectedRoutes, setSelectedRoutes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [agentSearchTerm, setAgentSearchTerm] = useState('');
    const [filterRoute, setFilterRoute] = useState('');
    const [filterAgent, setFilterAgent] = useState('');
    const [filterAgentSearchTerm, setFilterAgentSearchTerm] = useState('');
    const [selectedAgentDetails, setSelectedAgentDetails] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);

    // Charger la liste des agents
    const loadAgents = useCallback(async () => {
        try {
            // Construire les paramètres de requête
            const params = new URLSearchParams();
            params.append('limit', '1000');
            params.append('retire', 'false');
            
            // Ajouter le filtre par ministère si l'utilisateur est DRH
            if (user && user.organization && user.organization.type === 'ministere' && user.organization.id) {
                params.append('id_ministere', user.organization.id);
            } else if (user && (user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh')) {
                // Fallback: essayer de récupérer l'ID du ministère depuis l'utilisateur
                const userMinistereId = user?.id_ministere || user?.ministere_id || user?.ministere?.id;
                if (userMinistereId) {
                    params.append('id_ministere', userMinistereId);
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/agents?${params.toString()}`, {
                headers: getAuthHeaders()
            });
            
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setAgents(data.data);
            } else if (Array.isArray(data.data)) {
                setAgents(data.data);
            } else {
                console.warn('Format de réponse inattendu:', data);
                setAgents([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des agents:', error);
            setNotification({ type: 'danger', message: 'Erreur lors du chargement des agents: ' + error.message });
            setAgents([]);
        }
    }, [user]);

    // Charger les assignations
    const loadAssignments = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterAgent) params.append('agentId', filterAgent);
            if (filterRoute) params.append('routeId', filterRoute);

            const response = await fetch(`${API_BASE_URL}/api/agent-route-assignments?${params.toString()}`, {
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
                setAssignments(data.data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des assignations:', error);
            setNotification({ type: 'danger', message: 'Erreur lors du chargement des assignations' });
        } finally {
            setLoading(false);
        }
    }, [filterAgent, filterRoute]);

    useEffect(() => {
        if (user) {
            loadAgents();
            loadAssignments();
        }
    }, [loadAgents, loadAssignments, user]);

    // Assigner des tâches à des agents
    const handleAssign = async () => {
        if (selectedAgents.length === 0 || selectedRoutes.length === 0) {
            setNotification({ type: 'warning', message: 'Veuillez sélectionner au moins un agent et une tâche' });
            return;
        }

        try {
            setSaving(true);
            const response = await fetch(`${API_BASE_URL}/api/agent-route-assignments/assign`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    agentIds: selectedAgents,
                    routeIds: selectedRoutes
                })
            });

            const data = await response.json();
            if (data.success) {
                setNotification({ type: 'success', message: data.message || 'Assignation effectuée avec succès' });
                setModalOpen(false);
                setSelectedAgents([]);
                setSelectedRoutes([]);
                setAgentSearchTerm('');
                loadAssignments();
            } else {
                setNotification({ type: 'danger', message: data.message || 'Erreur lors de l\'assignation' });
            }
        } catch (error) {
            console.error('Erreur lors de l\'assignation:', error);
            setNotification({ type: 'danger', message: 'Erreur lors de l\'assignation' });
        } finally {
            setSaving(false);
        }
    };

    // Retirer une assignation
    const handleUnassign = async (assignmentId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir retirer cette assignation ?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/agent-route-assignments/${assignmentId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            if (data.success) {
                setNotification({ type: 'success', message: 'Assignation retirée avec succès' });
                loadAssignments();
            } else {
                setNotification({ type: 'danger', message: data.message || 'Erreur lors du retrait' });
            }
        } catch (error) {
            console.error('Erreur lors du retrait:', error);
            setNotification({ type: 'danger', message: 'Erreur lors du retrait' });
        }
    };

    // Filtrer les tâches disponibles (exclure certaines tâches système)
    // Exclure les tâches liées aux institutions si l'utilisateur est dans un ministère
    const availableRoutes = backendRoutes.filter(route => {
        // Exclure les routes système
        if (route.id === 'agent-dashboard' || route.id === 'drh-dashboard' || !route.category) {
            return false;
        }
        // Exclure les routes liées aux institutions si l'utilisateur est dans un ministère
        if (user && user.organization && user.organization.type === 'ministere') {
            // Exclure la tâche "Institutions" (catégorie Organisation)
            if (route.id === 'institutions') {
                return false;
            }
            // Exclure toutes les tâches avec la catégorie "Institutions"
            if (route.category === 'Institutions') {
                return false;
            }
        }
        return true;
    });

    // Filtrer les assignations selon le terme de recherche
    const filteredAssignments = assignments.filter(assignment => {
        const matchSearch = !searchTerm || 
            assignment.agent_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assignment.agent_prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assignment.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            assignment.route_id?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchSearch;
    });

    // Grouper les assignations par agent
    const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
        const agentKey = `${assignment.agent_id || assignment.agent_nom}_${assignment.agent_prenom}`;
        if (!acc[agentKey]) {
            acc[agentKey] = {
                agent_id: assignment.agent_id,
                agent_nom: assignment.agent_nom,
                agent_prenom: assignment.agent_prenom,
                matricule: assignment.matricule,
                direction_libelle: assignment.direction_libelle,
                service_libelle: assignment.service_libelle,
                assignments: []
            };
        }
        acc[agentKey].assignments.push(assignment);
        return acc;
    }, {});

    // Convertir en tableau et trier par nom
    const groupedAssignmentsArray = Object.values(groupedAssignments).sort((a, b) => {
        const nomA = (a.agent_nom || '').toLowerCase();
        const nomB = (b.agent_nom || '').toLowerCase();
        if (nomA !== nomB) {
            return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
        }
        const prenomA = (a.agent_prenom || '').toLowerCase();
        const prenomB = (b.agent_prenom || '').toLowerCase();
        return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
    });

    // Fonction pour ouvrir le modal de détails d'un agent
    const handleViewAgentDetails = (agentData) => {
        setSelectedAgentDetails(agentData);
        setDetailsModalOpen(true);
    };

    // Grouper les tâches par catégorie
    const routesByCategory = availableRoutes.reduce((acc, route) => {
        if (!acc[route.category]) {
            acc[route.category] = [];
        }
        acc[route.category].push(route);
        return acc;
    }, {});

    // Fonction pour sélectionner toutes les tâches
    const handleSelectAllRoutes = () => {
        const allRouteIds = availableRoutes.map(route => route.id);
        setSelectedRoutes(allRouteIds);
    };

    return (
        <div className="content">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h4">
                                <MdAssignment className="mr-2" />
                                Attribution des Tâches aux Agents
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {notification && (
                                <Alert color={notification.type} onClose={() => setNotification(null)} dismissible>
                                    {notification.message}
                                </Alert>
                            )}

                            {/* Actions */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Button
                                        color="primary"
                                        onClick={() => setModalOpen(true)}
                                    >
                                        <MdAssignment className="mr-1" />
                                        Assigner des Tâches
                                    </Button>
                                </Col>
                                <Col md={6} className="text-right">
                                    <Button
                                        color="secondary"
                                        onClick={loadAssignments}
                                        disabled={loading}
                                    >
                                        <MdRefresh className="mr-1" />
                                        Actualiser
                                    </Button>
                                </Col>
                            </Row>

                            {/* Filtres */}
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Input
                                        type="text"
                                        placeholder="Rechercher (nom, prénom, matricule, tâche)..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </Col>
                                <Col md={4}>
                                    <Input
                                        type="select"
                                        value={filterRoute}
                                        onChange={(e) => setFilterRoute(e.target.value)}
                                    >
                                        <option value="">Toutes les Tâches</option>
                                        {availableRoutes.map(route => (
                                            <option key={route.id} value={route.id}>
                                                {route.name}
                                            </option>
                                        ))}
                                    </Input>
                                </Col>
                                <Col md={4}>
                                    <FormGroup>
                                        <div className="position-relative mb-2">
                                            <MdSearch 
                                                style={{ 
                                                    position: 'absolute', 
                                                    left: '12px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)', 
                                                    color: '#6c757d',
                                                    fontSize: '1.2rem',
                                                    zIndex: 1
                                                }} 
                                            />
                                            <Input
                                                type="text"
                                                placeholder="Rechercher un agent (nom ou matricule)..."
                                                value={filterAgentSearchTerm}
                                                onChange={(e) => setFilterAgentSearchTerm(e.target.value)}
                                                style={{ 
                                                    paddingLeft: '40px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #ced4da'
                                                }}
                                            />
                                            {filterAgentSearchTerm && (
                                                <Button
                                                    color="link"
                                                    size="sm"
                                                    onClick={() => {
                                                        setFilterAgentSearchTerm('');
                                                        setFilterAgent('');
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '5px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        padding: '0',
                                                        color: '#6c757d',
                                                        zIndex: 1
                                                    }}
                                                >
                                                    <MdClear />
                                                </Button>
                                            )}
                                        </div>
                                        <Input
                                            type="select"
                                            value={filterAgent}
                                            onChange={(e) => setFilterAgent(e.target.value)}
                                        >
                                            <option value="">Tous les agents</option>
                                            {agents
                                                .filter(agent => {
                                                    if (!filterAgentSearchTerm) return true;
                                                    const searchLower = filterAgentSearchTerm.toLowerCase();
                                                    const nomComplet = `${agent.nom || ''} ${agent.prenom || ''}`.toLowerCase();
                                                    const matricule = (agent.matricule || '').toLowerCase();
                                                    return nomComplet.includes(searchLower) || matricule.includes(searchLower);
                                                })
                                                .sort((a, b) => {
                                                    // Trier par nom puis par prénom
                                                    const nomA = (a.nom || '').toLowerCase();
                                                    const nomB = (b.nom || '').toLowerCase();
                                                    if (nomA !== nomB) {
                                                        return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
                                                    }
                                                    const prenomA = (a.prenom || '').toLowerCase();
                                                    const prenomB = (b.prenom || '').toLowerCase();
                                                    return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
                                                })
                                                .map(agent => (
                                                    <option key={agent.id} value={agent.id}>
                                                        {agent.nom} {agent.prenom} ({agent.matricule})
                                                    </option>
                                                ))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                            </Row>

                            {/* Table des assignations groupées par agent */}
                            {loading ? (
                                <div className="text-center">
                                    <Spinner color="primary" />
                                </div>
                            ) : (
                                <Table responsive hover>
                                    <thead>
                                        <tr>
                                            <th>Agent</th>
                                            <th>Matricule</th>
                                            <th>Direction/Service</th>
                                            <th>Nombre de Tâches</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedAssignmentsArray.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center">
                                                    Aucune assignation trouvée
                                                </td>
                                            </tr>
                                        ) : (
                                            groupedAssignmentsArray.map((agentData) => (
                                                <tr key={`${agentData.agent_id || agentData.agent_nom}_${agentData.agent_prenom}`}>
                                                    <td>
                                                        <strong className="mr-2" style={{ color: '#000' }}>
                                                            [{agentData.assignments.length}]
                                                        </strong>
                                                        {agentData.agent_nom} {agentData.agent_prenom}
                                                    </td>
                                                    <td>
                                                        {agentData.matricule || '-'}
                                                    </td>
                                                    <td>
                                                        {agentData.direction_libelle || '-'}
                                                        {agentData.service_libelle && ` / ${agentData.service_libelle}`}
                                                    </td>
                                                    <td>
                                                        {agentData.assignments.length} tâche{agentData.assignments.length > 1 ? 's' : ''}
                                                    </td>
                                                    <td>
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            onClick={() => handleViewAgentDetails(agentData)}
                                                            className="mr-2"
                                                        >
                                                            <MdVisibility className="mr-1" />
                                                            Voir
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal d'assignation */}
            <Modal isOpen={modalOpen} toggle={() => {
                setModalOpen(false);
                setAgentSearchTerm('');
            }} size="xl" style={{ maxWidth: '1200px' }}>
                <ModalHeader toggle={() => {
                    setModalOpen(false);
                    setAgentSearchTerm('');
                }} style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <div className="d-flex align-items-center">
                        <MdAssignment className="mr-2" style={{ fontSize: '1.5rem', color: '#007bff' }} />
                        <strong>Assigner des tâches aux Agents</strong>
                    </div>
                </ModalHeader>
                <ModalBody style={{ padding: '1.5rem' }}>
                    {/* Note informative */}
                    <Alert color="light" style={{ marginBottom: '1.5rem', borderRadius: '8px', border: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                        <div className="d-flex align-items-start">
                            <MdInfo className="mr-2" style={{ fontSize: '1.25rem', color: '#17a2b8', marginTop: '2px', flexShrink: 0 }} />
                            <div style={{ color: '#000' }}>
                                <strong style={{ color: '#000', display: 'block', marginBottom: '0.5rem' }}>Comment fonctionne l'assignation ?</strong>
                                <ul style={{ marginBottom: 0, paddingLeft: '1.25rem', color: '#000' }}>
                                    <li>Sélectionnez un ou plusieurs <strong>agents</strong> dans la liste de gauche (utilisez la recherche pour filtrer)</li>
                                    <li>Sélectionnez une ou plusieurs <strong>Tâches</strong> dans la liste de droite (ou utilisez "Tout sélectionner" pour toutes les Tâches)</li>
                                    <li>Le nombre total d'assignations sera calculé automatiquement (agents × Tâches)</li>
                                    <li>Cliquez sur <strong>"Assigner"</strong> pour créer toutes les assignations en une seule fois</li>
                                </ul>
                            </div>
                        </div>
                    </Alert>

                    {/* Résumé des sélections */}
                    {(selectedAgents.length > 0 || selectedRoutes.length > 0) && (
                        <Alert color="info" style={{ marginBottom: '1.5rem', borderRadius: '8px' }}>
                            <div className="d-flex align-items-center justify-content-between flex-wrap">
                                <div className="d-flex align-items-center flex-wrap">
                                    {selectedAgents.length > 0 && (
                                        <Badge color="primary" pill className="mr-2 mb-1" style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem', color: '#000' }}>
                                            <MdPeople className="mr-1" />
                                            {selectedAgents.length} agent{selectedAgents.length > 1 ? 's' : ''} sélectionné{selectedAgents.length > 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                    {selectedRoutes.length > 0 && (
                                        <Badge color="success" pill className="mr-2 mb-1" style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem', color: '#000' }}>
                                            <MdRoute className="mr-1" />
                                            {selectedRoutes.length} tâche{selectedRoutes.length > 1 ? 's' : ''} sélectionnée{selectedRoutes.length > 1 ? 's' : ''}
                                        </Badge>
                                    )}
                                </div>
                                {selectedAgents.length > 0 && selectedRoutes.length > 0 && (
                                    <div className="mt-2 mt-md-0">
                                        <strong style={{ fontSize: '1.1rem', color: '#000' }}>
                                            = {selectedAgents.length * selectedRoutes.length} assignation{selectedAgents.length * selectedRoutes.length > 1 ? 's' : ''} seront créée{selectedAgents.length * selectedRoutes.length > 1 ? 's' : ''}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </Alert>
                    )}

                    <Row>
                        {/* Sélection des agents */}
                        <Col md={6}>
                            <Card style={{ border: '1px solid #dee2e6', borderRadius: '8px', height: '100%' }}>
                                <CardHeader style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <MdPeople className="mr-2" style={{ fontSize: '1.25rem', color: '#007bff' }} />
                                            <strong>Sélectionner les Agents</strong>
                                        </div>
                                        {selectedAgents.length > 0 && (
                                            <Badge color="primary" pill>
                                                {selectedAgents.length}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <FormGroup>
                                        <div className="position-relative mb-3">
                                            <MdSearch 
                                                style={{ 
                                                    position: 'absolute', 
                                                    left: '12px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)', 
                                                    color: '#6c757d',
                                                    fontSize: '1.2rem'
                                                }} 
                                            />
                                            <Input
                                                type="text"
                                                placeholder="Rechercher par nom ou matricule..."
                                                value={agentSearchTerm}
                                                onChange={(e) => setAgentSearchTerm(e.target.value)}
                                                style={{ 
                                                    paddingLeft: '40px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #ced4da'
                                                }}
                                            />
                                            {agentSearchTerm && (
                                                <Button
                                                    color="link"
                                                    size="sm"
                                                    onClick={() => setAgentSearchTerm('')}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '5px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        padding: '0',
                                                        color: '#6c757d'
                                                    }}
                                                >
                                                    <MdClear />
                                                </Button>
                                            )}
                                        </div>
                                        <Input
                                            type="select"
                                            multiple
                                            value={selectedAgents}
                                            onChange={(e) => {
                                                const values = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                                                setSelectedAgents(values);
                                            }}
                                            style={{ 
                                                height: '350px',
                                                borderRadius: '6px',
                                                border: '1px solid #ced4da'
                                            }}
                                        >
                                            {agents
                                                .filter(agent => {
                                                    if (!agentSearchTerm) return true;
                                                    const searchLower = agentSearchTerm.toLowerCase();
                                                    const nomComplet = `${agent.nom || ''} ${agent.prenom || ''}`.toLowerCase();
                                                    const matricule = (agent.matricule || '').toLowerCase();
                                                    return nomComplet.includes(searchLower) || matricule.includes(searchLower);
                                                })
                                                .sort((a, b) => {
                                                    // Trier par nom puis par prénom
                                                    const nomA = (a.nom || '').toLowerCase();
                                                    const nomB = (b.nom || '').toLowerCase();
                                                    if (nomA !== nomB) {
                                                        return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
                                                    }
                                                    const prenomA = (a.prenom || '').toLowerCase();
                                                    const prenomB = (b.prenom || '').toLowerCase();
                                                    return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
                                                })
                                                .map(agent => (
                                                    <option key={agent.id} value={agent.id}>
                                                        {agent.nom} {agent.prenom} ({agent.matricule})
                                                    </option>
                                                ))}
                                        </Input>
                                        <small className="text-muted d-block mt-2">
                                            <MdInfo className="mr-1" />
                                            Maintenez Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs agents
                                        </small>
                                        {agents.filter(agent => {
                                            if (!agentSearchTerm) return true;
                                            const searchLower = agentSearchTerm.toLowerCase();
                                            const nomComplet = `${agent.nom || ''} ${agent.prenom || ''}`.toLowerCase();
                                            const matricule = (agent.matricule || '').toLowerCase();
                                            return nomComplet.includes(searchLower) || matricule.includes(searchLower);
                                        }).length === 0 && agentSearchTerm && (
                                            <Alert color="warning" className="mt-2" style={{ fontSize: '0.875rem' }}>
                                                Aucun agent trouvé pour "{agentSearchTerm}"
                                            </Alert>
                                        )}
                                    </FormGroup>
                                </CardBody>
                            </Card>
                        </Col>

                        {/* Sélection des tâches */}
                        <Col md={6}>
                            <Card style={{ border: '1px solid #dee2e6', borderRadius: '8px', height: '100%' }}>
                                <CardHeader style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                    <div className="d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center">
                                            <MdRoute className="mr-2" style={{ fontSize: '1.25rem', color: '#28a745' }} />
                                            <strong>Sélectionner les Tâches</strong>
                                        </div>
                                        <div className="d-flex align-items-center">
                                            {selectedRoutes.length > 0 && (
                                                <Badge color="success" pill className="mr-2">
                                                    {selectedRoutes.length}
                                                </Badge>
                                            )}
                                            <Button
                                                color="outline-success"
                                                size="sm"
                                                onClick={handleSelectAllRoutes}
                                                style={{ 
                                                    borderRadius: '6px',
                                                    fontSize: '0.875rem',
                                                    padding: '0.25rem 0.75rem'
                                                }}
                                                title="Sélectionner toutes les Tâches"
                                            >
                                                <MdSelectAll className="mr-1" />
                                                Tout sélectionner
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <FormGroup>
                                        <Input
                                            type="select"
                                            multiple
                                            value={selectedRoutes}
                                            onChange={(e) => {
                                                const values = Array.from(e.target.selectedOptions, option => option.value);
                                                setSelectedRoutes(values);
                                            }}
                                            style={{ 
                                                height: '350px',
                                                borderRadius: '6px',
                                                border: '1px solid #ced4da'
                                            }}
                                        >
                                            {Object.entries(routesByCategory).map(([category, routes]) => (
                                                <optgroup key={category} label={category}>
                                                    {routes.map(route => (
                                                        <option key={route.id} value={route.id}>
                                                            {route.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </Input>
                                        <small className="text-muted d-block mt-2">
                                            <MdInfo className="mr-1" />
                                            Maintenez Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs Tâches
                                        </small>
                                    </FormGroup>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </ModalBody>
                <ModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6', padding: '1rem 1.5rem' }}>
                    <Button 
                        color="secondary" 
                        onClick={() => {
                            setModalOpen(false);
                            setSelectedAgents([]);
                            setSelectedRoutes([]);
                            setAgentSearchTerm('');
                        }}
                        style={{ borderRadius: '6px', padding: '0.5rem 1.5rem' }}
                    >
                        Annuler
                    </Button>
                    <Button
                        color="primary"
                        onClick={handleAssign}
                        disabled={saving || selectedAgents.length === 0 || selectedRoutes.length === 0}
                        style={{ 
                            borderRadius: '6px', 
                            padding: '0.5rem 1.5rem',
                            minWidth: '120px'
                        }}
                    >
                        {saving ? (
                            <>
                                <Spinner size="sm" className="mr-2" />
                                Assignation...
                            </>
                        ) : (
                            <>
                                <MdCheckCircle className="mr-1" />
                                Assigner
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal de détails des routes assignées à un agent */}
            <Modal isOpen={detailsModalOpen} toggle={() => {
                setDetailsModalOpen(false);
                setSelectedAgentDetails(null);
            }} size="lg">
                <ModalHeader toggle={() => {
                    setDetailsModalOpen(false);
                    setSelectedAgentDetails(null);
                }} style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <div className="d-flex align-items-center">
                        <MdRoute className="mr-2" style={{ fontSize: '1.5rem', color: '#007bff' }} />
                        <strong>
                            Tâches assignées à {selectedAgentDetails?.agent_nom} {selectedAgentDetails?.agent_prenom}
                        </strong>
                    </div>
                </ModalHeader>
                <ModalBody style={{ padding: '1.5rem' }}>
                    {selectedAgentDetails && (
                        <>
                            {/* Informations de l'agent */}
                            <Card className="mb-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
                                <CardBody>
                                    <Row>
                                        <Col md={6}>
                                            <strong>Matricule:</strong>{' '}
                                            <Badge color="info">{selectedAgentDetails.matricule || '-'}</Badge>
                                        </Col>
                                        <Col md={6}>
                                            <strong>Direction/Service:</strong>{' '}
                                            {selectedAgentDetails.direction_libelle || '-'}
                                            {selectedAgentDetails.service_libelle && ` / ${selectedAgentDetails.service_libelle}`}
                                        </Col>
                                    </Row>
                                </CardBody>
                            </Card>

                            {/* Liste des tâches assignées */}
                            <div className="mb-2">
                                <strong>
                                    {selectedAgentDetails.assignments.length} tâche{selectedAgentDetails.assignments.length > 1 ? 's' : ''} assignée{selectedAgentDetails.assignments.length > 1 ? 's' : ''}:
                                </strong>
                            </div>
                            <Table responsive hover>
                                <thead>
                                    <tr>
                                        <th>Tâche</th>
                                        <th>Assigné par</th>
                                        <th>Date d'assignation</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedAgentDetails.assignments
                                        .sort((a, b) => {
                                            const routeA = availableRoutes.find(r => r.id === a.route_id);
                                            const routeB = availableRoutes.find(r => r.id === b.route_id);
                                            const nameA = routeA ? routeA.name : a.route_id;
                                            const nameB = routeB ? routeB.name : b.route_id;
                                            return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
                                        })
                                        .map((assignment) => {
                                            const route = availableRoutes.find(r => r.id === assignment.route_id);
                                            return (
                                                <tr key={assignment.id}>
                                                    <td>
                                                        {route ? route.name : assignment.route_id}
                                                    </td>
                                                    <td>{assignment.assigned_by_username || '-'}</td>
                                                    <td>
                                                        {new Date(assignment.assigned_at).toLocaleDateString('fr-FR')}
                                                    </td>
                                                    <td>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            onClick={() => {
                                                                handleUnassign(assignment.id);
                                                                setDetailsModalOpen(false);
                                                                setSelectedAgentDetails(null);
                                                            }}
                                                        >
                                                            <MdDelete />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </Table>
                        </>
                    )}
                </ModalBody>
                <ModalFooter style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
                    <Button 
                        color="secondary" 
                        onClick={() => {
                            setDetailsModalOpen(false);
                            setSelectedAgentDetails(null);
                        }}
                        style={{ borderRadius: '6px', padding: '0.5rem 1.5rem' }}
                    >
                        <MdClose className="mr-1" />
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default AttributionTachesPage;

