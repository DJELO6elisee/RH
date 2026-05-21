import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getAuthHeaders } from '../config/api';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Row,
    Col,
    Table,
    Input,
    Button,
    Spinner,
    Alert,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Pagination,
    PaginationItem,
    PaginationLink
} from 'reactstrap';
import * as MdIcons from 'react-icons/md';
import Page from '../components/Page';
import SearchableSelect from '../components/SearchableSelect';

// Use explicit icons from MdIcons
const {
    MdSearch: SearchIcon,
    MdEdit: EditIcon,
    MdDelete: DeleteIcon,
    MdVisibility: ViewIcon,
    MdAddCircle: AddIcon,
    MdCancel: CancelIcon,
    MdSave: SaveIcon,
    MdRateReview: ReviewIcon,
    MdRefresh: RefreshIcon
} = MdIcons;

const EvaluationsPage = () => {
    const { user } = useAuth();
    const apiUrl = getApiUrl();

    // List & Filters states
    const [evaluations, setEvaluations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAnnee, setFilterAnnee] = useState(new Date().getFullYear().toString());
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState(null);
    
    // Form & Agents states
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        id_agent: '',
        annee: new Date().getFullYear(),
        note_assiduite: 0,
        comment_assiduite: '',
        note_initiative: 0,
        comment_initiative: '',
        note_equipe: 0,
        comment_equipe: '',
        note_rendement: 0,
        comment_rendement: '',
        note_discipline: 0,
        comment_discipline: '',
        comment_general: ''
    });

    // Generate last 10 years for filter and selection
    const currentYear = new Date().getFullYear();
    const yearsList = Array.from({ length: 11 }, (_, i) => currentYear - i);

    useEffect(() => {
        if (user) {
            loadEvaluations();
        }
    }, [user, currentPage, rowsPerPage, filterAnnee]);

    // Load evaluations from backend with query parameters
    const loadEvaluations = async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: rowsPerPage,
                ...(filterAnnee && { annee: filterAnnee }),
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`${apiUrl}/api/evaluations?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setEvaluations(result.data || []);
                    if (result.pagination) {
                        setTotalPages(result.pagination.totalPages || 1);
                        setTotalCount(result.pagination.totalCount || 0);
                    }
                } else {
                    setError(result.error || 'Erreur lors du chargement des évaluations');
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.error || 'Erreur de communication avec le serveur');
            }
        } catch (err) {
            console.error('Error loading evaluations:', err);
            setError('Impossible de se connecter au serveur de base de données.');
        } finally {
            setLoading(false);
        }
    };

    // Load active agents for dropdown select
    const loadAgents = async () => {
        setLoadingAgents(true);
        try {
            let url = `${apiUrl}/api/agents?limit=1000&retire=false`;
            
            // Filter by user's organization/ministry
            if (user?.id_ministere || user?.organization?.id) {
                const ministereId = user.id_ministere || user.organization.id;
                url += `&id_ministere=${ministereId}`;
            }

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                let agentsList = [];
                if (result.success && result.data) {
                    agentsList = Array.isArray(result.data) ? result.data : [];
                } else if (Array.isArray(result)) {
                    agentsList = result;
                }
                setAgents(agentsList);
            } else {
                console.error('Failed to load agents list');
            }
        } catch (err) {
            console.error('Error fetching agents:', err);
        } finally {
            setLoadingAgents(false);
        }
    };

    // Open Modal to create
    const handleCreateOpen = (agent) => {
        setIsEdit(false);
        setFormData({
            id_agent: agent.id_agent,
            annee: parseInt(filterAnnee || new Date().getFullYear().toString(), 10),
            note_assiduite: 0,
            comment_assiduite: '',
            note_initiative: 0,
            comment_initiative: '',
            note_equipe: 0,
            comment_equipe: '',
            note_rendement: 0,
            comment_rendement: '',
            note_discipline: 0,
            comment_discipline: '',
            comment_general: ''
        });
        setError(null);
        setAgents([{ id: agent.id_agent, nom: agent.agent_nom, prenom: agent.agent_prenom, matricule: agent.agent_matricule }]);
        setModalOpen(true);
    };

    // Open Modal to edit
    const handleEditOpen = (evaluation) => {
        setIsEdit(true);
        setSelectedEvaluation(evaluation);
        setFormData({
            id_agent: evaluation.id_agent,
            annee: evaluation.annee,
            note_assiduite: evaluation.note_assiduite,
            comment_assiduite: evaluation.comment_assiduite || '',
            note_initiative: evaluation.note_initiative,
            comment_initiative: evaluation.comment_initiative || '',
            note_equipe: evaluation.note_equipe,
            comment_equipe: evaluation.comment_equipe || '',
            note_rendement: evaluation.note_rendement,
            comment_rendement: evaluation.comment_rendement || '',
            note_discipline: evaluation.note_discipline,
            comment_discipline: evaluation.comment_discipline || '',
            comment_general: evaluation.comment_general || ''
        });
        setError(null);
        setAgents([{ id: evaluation.id_agent, nom: evaluation.agent_nom, prenom: evaluation.agent_prenom, matricule: evaluation.agent_matricule }]);
        setModalOpen(true);
    };

    // Open Modal to view detail
    const handleViewOpen = (evaluation) => {
        setSelectedEvaluation(evaluation);
        setViewModalOpen(true);
    };

    // Delete Evaluation
    const handleDelete = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette évaluation ?')) {
            try {
                const response = await fetch(`${apiUrl}/api/evaluations/${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    setSuccess('Évaluation supprimée avec succès.');
                    loadEvaluations();
                    setTimeout(() => setSuccess(null), 3000);
                } else {
                    const errData = await response.json().catch(() => ({}));
                    setError(errData.error || 'Erreur lors de la suppression.');
                }
            } catch (err) {
                console.error(err);
                setError('Erreur lors de la suppression de l\'évaluation.');
            }
        }
    };

    // Form inputs change handler
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Notes bounds clamping or validating
        if (name.startsWith('note_')) {
            let numVal = value === '' ? '' : parseFloat(value);
            if (numVal !== '' && !isNaN(numVal)) {
                // Ensure non-negative
                numVal = Math.max(0, numVal);
            }
            setFormData(prev => ({ ...prev, [name]: numVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // Agent SearchableSelect change handler
    const handleAgentSelect = (agentId) => {
        setFormData(prev => ({ ...prev, id_agent: agentId }));
    };

    // Validate the current form values before submission
    const getFormValidationError = () => {
        if (!formData.id_agent) {
            return "Veuillez sélectionner un agent.";
        }
        if (!formData.annee) {
            return "Veuillez spécifier l'année de l'évaluation.";
        }

        const assiduite = parseFloat(formData.note_assiduite || 0);
        const initiative = parseFloat(formData.note_initiative || 0);
        const equipe = parseFloat(formData.note_equipe || 0);
        const rendement = parseFloat(formData.note_rendement || 0);
        const discipline = parseFloat(formData.note_discipline || 0);

        if (isNaN(assiduite) || assiduite < 0 || assiduite > 5) {
            return "La note d'assiduité doit être comprise entre 0 et 5.";
        }
        if (isNaN(initiative) || initiative < 0 || initiative > 3) {
            return "La note d'esprit d'initiative doit être comprise entre 0 et 3.";
        }
        if (isNaN(equipe) || equipe < 0 || equipe > 3) {
            return "La note d'esprit d'équipe doit être comprise entre 0 et 3.";
        }
        if (isNaN(rendement) || rendement < 0 || rendement > 5) {
            return "La note de rendement doit être comprise entre 0 et 5.";
        }
        if (isNaN(discipline) || discipline < 0 || discipline > 4) {
            return "La note de discipline doit être comprise entre 0 et 4.";
        }

        return null;
    };

    // Submit form handler
    const handleSave = async (e) => {
        e.preventDefault();
        const valError = getFormValidationError();
        if (valError) {
            setError(valError);
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const url = isEdit 
                ? `${apiUrl}/api/evaluations/${selectedEvaluation.id}`
                : `${apiUrl}/api/evaluations`;
            
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...formData,
                    id_agent: parseInt(formData.id_agent, 10),
                    annee: parseInt(formData.annee, 10),
                    note_assiduite: parseFloat(formData.note_assiduite || 0),
                    note_initiative: parseFloat(formData.note_initiative || 0),
                    note_equipe: parseFloat(formData.note_equipe || 0),
                    note_rendement: parseFloat(formData.note_rendement || 0),
                    note_discipline: parseFloat(formData.note_discipline || 0)
                })
            });

            if (response.ok) {
                setSuccess(isEdit ? 'Évaluation mise à jour avec succès.' : 'Évaluation enregistrée avec succès.');
                setModalOpen(false);
                loadEvaluations();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.error || 'Une erreur s\'est produite lors de l\'enregistrement.');
            }
        } catch (err) {
            console.error('Error saving evaluation:', err);
            setError('Impossible d\'enregistrer les données. Veuillez réessayer.');
        } finally {
            setSaving(false);
        }
    };

    // Calculate sum for visual feedback
    const noteAssiduite = parseFloat(formData.note_assiduite || 0);
    const noteInitiative = parseFloat(formData.note_initiative || 0);
    const noteEquipe = parseFloat(formData.note_equipe || 0);
    const noteRendement = parseFloat(formData.note_rendement || 0);
    const noteDiscipline = parseFloat(formData.note_discipline || 0);
    const totalScore = noteAssiduite + noteInitiative + noteEquipe + noteRendement + noteDiscipline;

    // Formatting agents options list
    const agentOptions = agents.map(agent => ({
        id: agent.id,
        label: `${agent.nom} ${agent.prenom} (${agent.matricule || 'Sans matricule'})`
    }));

    const breadcrumbs = [
        { name: 'Gestion du Personnel', active: false },
        { name: 'Évaluation des agents', active: true }
    ];

    return (
        <Page title="Évaluations des agents" breadcrumbs={breadcrumbs}>
            <Row>
                <Col>
                    <Card className="shadow border-0">
                        <CardHeader className="bg-white py-3">
                            <CardTitle className="d-flex align-items-center justify-content-between mb-0">
                                <div className="d-flex align-items-center">
                                    <ReviewIcon className="me-2 text-primary" size={24} style={{ marginRight: '8px' }} />
                                    <span className="h5 mb-0">Notation Annuelle et Suivi des Critères</span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {error && !modalOpen && (
                                <Alert color="danger" className="mb-3" toggle={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                            
                            {success && (
                                <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>
                                    {success}
                                </Alert>
                            )}

                            {/* Search and Filters */}
                            <Row className="mb-4 align-items-center">
                                <Col md="4" className="mb-2 mb-md-0">
                                    <div className="position-relative d-flex align-items-center">
                                        <Input
                                            type="text"
                                            placeholder="Rechercher agent (nom, prénom, matricule)..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && loadEvaluations()}
                                            style={{ paddingLeft: '35px' }}
                                        />
                                        <SearchIcon
                                            style={{
                                                position: 'absolute',
                                                left: '10px',
                                                color: '#6c757d'
                                            }}
                                        />
                                    </div>
                                </Col>
                                <Col md="3" className="mb-2 mb-md-0">
                                    <Input
                                        type="select"
                                        value={filterAnnee}
                                        onChange={(e) => setFilterAnnee(e.target.value)}
                                    >
                                        {yearsList.map(yr => (
                                            <option key={yr} value={yr}>{yr}</option>
                                        ))}
                                    </Input>
                                </Col>
                                <Col md="5" className="d-flex justify-content-md-end gap-2">
                                    <Button color="secondary" onClick={loadEvaluations} disabled={loading} className="d-flex align-items-center">
                                        <RefreshIcon className="me-1" style={{ marginRight: '5px' }} />
                                        Actualiser
                                    </Button>
                                </Col>
                            </Row>

                            {/* Table */}
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                    <p className="mt-2 text-muted">Chargement des évaluations en cours...</p>
                                </div>
                            ) : evaluations.length === 0 ? (
                                <Alert color="info" className="text-center py-4">
                                    Aucune évaluation trouvée pour les filtres sélectionnés.
                                </Alert>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <Table striped bordered hover className="align-middle">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Agent</th>
                                                    <th>Matricule</th>
                                                    <th className="text-center">Année</th>
                                                    <th className="text-center">Note Finale</th>
                                                    <th>Date d'évaluation</th>
                                                    <th className="text-center" style={{ width: '250px' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {evaluations.map((evalObj) => {
                                                    const isEvaluated = evalObj.id !== null && evalObj.id !== undefined;
                                                    return (
                                                        <tr key={evalObj.id_agent}>
                                                            <td>
                                                                <strong>{evalObj.agent_nom}</strong> {evalObj.agent_prenom}
                                                            </td>
                                                            <td>{evalObj.agent_matricule || '-'}</td>
                                                            <td className="text-center">
                                                                <span className="badge bg-secondary p-2">{evalObj.annee}</span>
                                                            </td>
                                                            <td className="text-center">
                                                                <strong className={isEvaluated ? "text-success h5" : "text-muted h5"}>
                                                                    {evalObj.note_finale}
                                                                </strong> <span className="text-muted">/ 20</span>
                                                            </td>
                                                            <td>
                                                                {isEvaluated && evalObj.created_at ? (
                                                                    new Date(evalObj.created_at).toLocaleDateString('fr-FR')
                                                                ) : (
                                                                    <span className="text-muted italic small">Non évalué</span>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                <div className="d-flex justify-content-center gap-2">
                                                                    {isEvaluated ? (
                                                                        <>
                                                                            <Button
                                                                                color="info"
                                                                                size="sm"
                                                                                className="d-flex align-items-center"
                                                                                onClick={() => handleViewOpen(evalObj)}
                                                                                style={{ marginRight: '4px' }}
                                                                            >
                                                                                <ViewIcon size={14} className="me-1" style={{ marginRight: '2px' }} />
                                                                                Détails
                                                                            </Button>
                                                                            <Button
                                                                                color="warning"
                                                                                size="sm"
                                                                                className="d-flex align-items-center text-white"
                                                                                onClick={() => handleEditOpen(evalObj)}
                                                                                style={{ marginRight: '4px' }}
                                                                            >
                                                                                <EditIcon size={14} className="me-1" style={{ marginRight: '2px' }} />
                                                                                Modifier
                                                                            </Button>
                                                                            <Button
                                                                                color="danger"
                                                                                size="sm"
                                                                                className="d-flex align-items-center"
                                                                                onClick={() => handleDelete(evalObj.id)}
                                                                            >
                                                                                <DeleteIcon size={14} className="me-1" style={{ marginRight: '2px' }} />
                                                                                Supprimer
                                                                            </Button>
                                                                        </>
                                                                    ) : (
                                                                        <Button
                                                                            color="primary"
                                                                            size="sm"
                                                                            className="d-flex align-items-center"
                                                                            onClick={() => handleCreateOpen(evalObj)}
                                                                        >
                                                                            <ReviewIcon size={14} className="me-1" style={{ marginRight: '2px' }} />
                                                                            Évaluer
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </div>

                                    {/* Pagination */}
                                    {totalCount > 0 && (
                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4">
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="text-muted">
                                                    Affichage de {(currentPage - 1) * rowsPerPage + 1} à {Math.min(currentPage * rowsPerPage, totalCount)} sur {totalCount} évaluation(s)
                                                </span>
                                                <select
                                                    className="form-select form-select-sm w-auto ms-2"
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    {[10, 25, 50, 100].map(n => (
                                                        <option key={n} value={n}>{n} par page</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <Pagination className="mb-0">
                                                <PaginationItem disabled={currentPage <= 1}>
                                                    <PaginationLink first onClick={() => setCurrentPage(1)} />
                                                </PaginationItem>
                                                <PaginationItem disabled={currentPage <= 1}>
                                                    <PaginationLink previous onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                                                </PaginationItem>
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <PaginationItem key={page} active={currentPage === page}>
                                                        <PaginationLink onClick={() => setCurrentPage(page)}>
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                <PaginationItem disabled={currentPage >= totalPages}>
                                                    <PaginationLink next onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                                                </PaginationItem>
                                                <PaginationItem disabled={currentPage >= totalPages}>
                                                    <PaginationLink last onClick={() => setCurrentPage(totalPages)} />
                                                </PaginationItem>
                                            </Pagination>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Create/Edit Modal */}
            <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} size="lg">
                <ModalHeader toggle={() => setModalOpen(false)} className="bg-primary text-white">
                    <ReviewIcon className="me-2" style={{ marginRight: '8px' }} />
                    {isEdit ? 'Modifier l\'évaluation de l\'agent' : 'Créer une nouvelle évaluation'}
                </ModalHeader>
                <ModalBody style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    {error && (
                        <Alert color="danger" className="mb-3" toggle={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    <Form onSubmit={handleSave}>
                        <Row className="mb-4">
                            <Col md="6">
                                <FormGroup>
                                    <Label for="id_agent" className="fw-bold">Agent à évaluer <span className="text-danger">*</span></Label>
                                    {loadingAgents ? (
                                        <div><Spinner size="sm" /> Chargement des agents...</div>
                                    ) : (
                                        <SearchableSelect
                                            id="id_agent"
                                            value={formData.id_agent}
                                            onChange={handleAgentSelect}
                                            options={agentOptions}
                                            placeholder="Rechercher un agent..."
                                            disabled={true}
                                        />
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label for="annee" className="fw-bold">Année d'évaluation <span className="text-danger">*</span></Label>
                                    <Input
                                        type="select"
                                        name="annee"
                                        id="annee"
                                        value={formData.annee}
                                        onChange={handleInputChange}
                                        disabled={true}
                                    >
                                        {yearsList.map(yr => (
                                            <option key={yr} value={yr}>{yr}</option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>

                        <div className="border-bottom pb-2 mb-3">
                            <h5 className="text-secondary mb-0">Détails des critères de notation</h5>
                        </div>

                        {/* 1 - Assiduité */}
                        <div className="mb-3 p-3 bg-light rounded border">
                            <Row className="align-items-center">
                                <Col md="4">
                                    <FormGroup className="mb-md-0">
                                        <Label for="note_assiduite" className="fw-bold mb-1">1. Assiduité (Note sur 5)</Label>
                                        <Input
                                            type="number"
                                            name="note_assiduite"
                                            id="note_assiduite"
                                            min="0"
                                            max="5"
                                            step="0.25"
                                            value={formData.note_assiduite}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className="text-muted small">Range: 0 - 5</span>
                                    </FormGroup>
                                </Col>
                                <Col md="8">
                                    <FormGroup className="mb-0">
                                        <Label for="comment_assiduite" className="mb-1">Commentaire Assiduité</Label>
                                        <Input
                                            type="text"
                                            name="comment_assiduite"
                                            id="comment_assiduite"
                                            value={formData.comment_assiduite}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Ponctuel, respecte le temps de travail..."
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </div>

                        {/* 2 - Esprit d'initiative */}
                        <div className="mb-3 p-3 bg-light rounded border">
                            <Row className="align-items-center">
                                <Col md="4">
                                    <FormGroup className="mb-md-0">
                                        <Label for="note_initiative" className="fw-bold mb-1">2. Esprit d’initiative (Note sur 3)</Label>
                                        <Input
                                            type="number"
                                            name="note_initiative"
                                            id="note_initiative"
                                            min="0"
                                            max="3"
                                            step="0.25"
                                            value={formData.note_initiative}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className="text-muted small">Range: 0 - 3</span>
                                    </FormGroup>
                                </Col>
                                <Col md="8">
                                    <FormGroup className="mb-0">
                                        <Label for="comment_initiative" className="mb-1">Commentaire Esprit d'initiative</Label>
                                        <Input
                                            type="text"
                                            name="comment_initiative"
                                            id="comment_initiative"
                                            value={formData.comment_initiative}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Propose des solutions innovantes..."
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </div>

                        {/* 3 - Esprit d'équipe */}
                        <div className="mb-3 p-3 bg-light rounded border">
                            <Row className="align-items-center">
                                <Col md="4">
                                    <FormGroup className="mb-md-0">
                                        <Label for="note_equipe" className="fw-bold mb-1">3. Esprit d’équipe (Note sur 3)</Label>
                                        <Input
                                            type="number"
                                            name="note_equipe"
                                            id="note_equipe"
                                            min="0"
                                            max="3"
                                            step="0.25"
                                            value={formData.note_equipe}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className="text-muted small">Range: 0 - 3</span>
                                    </FormGroup>
                                </Col>
                                <Col md="8">
                                    <FormGroup className="mb-0">
                                        <Label for="comment_equipe" className="mb-1">Commentaire Esprit d'équipe</Label>
                                        <Input
                                            type="text"
                                            name="comment_equipe"
                                            id="comment_equipe"
                                            value={formData.comment_equipe}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Très collaboratif, soutient ses collègues..."
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </div>

                        {/* 4 - Rendement */}
                        <div className="mb-3 p-3 bg-light rounded border">
                            <Row className="align-items-center">
                                <Col md="4">
                                    <FormGroup className="mb-md-0">
                                        <Label for="note_rendement" className="fw-bold mb-1">4. Rendement (Note sur 5)</Label>
                                        <Input
                                            type="number"
                                            name="note_rendement"
                                            id="note_rendement"
                                            min="0"
                                            max="5"
                                            step="0.25"
                                            value={formData.note_rendement}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className="text-muted small">Range: 0 - 5</span>
                                    </FormGroup>
                                </Col>
                                <Col md="8">
                                    <FormGroup className="mb-0">
                                        <Label for="comment_rendement" className="mb-1">Commentaire Rendement</Label>
                                        <Input
                                            type="text"
                                            name="comment_rendement"
                                            id="comment_rendement"
                                            value={formData.comment_rendement}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Atteint régulièrement les objectifs..."
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </div>

                        {/* 5 - Discipline */}
                        <div className="mb-3 p-3 bg-light rounded border">
                            <Row className="align-items-center">
                                <Col md="4">
                                    <FormGroup className="mb-md-0">
                                        <Label for="note_discipline" className="fw-bold mb-1">5. La discipline (Note sur 4)</Label>
                                        <Input
                                            type="number"
                                            name="note_discipline"
                                            id="note_discipline"
                                            min="0"
                                            max="4"
                                            step="0.25"
                                            value={formData.note_discipline}
                                            onChange={handleInputChange}
                                            required
                                        />
                                        <span className="text-muted small">Range: 0 - 4</span>
                                    </FormGroup>
                                </Col>
                                <Col md="8">
                                    <FormGroup className="mb-0">
                                        <Label for="comment_discipline" className="mb-1">Commentaire Discipline</Label>
                                        <Input
                                            type="text"
                                            name="comment_discipline"
                                            id="comment_discipline"
                                            value={formData.comment_discipline}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Respectueux des procédures et de la hiérarchie..."
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </div>

                        {/* Note Finale Display */}
                        <div className="p-3 bg-secondary text-white rounded mb-4 d-flex align-items-center justify-content-between">
                            <h5 className="mb-0">Note finale cumulée calculée :</h5>
                            <h3 className="mb-0 fw-bold">{totalScore} <span className="small">/ 20</span></h3>
                        </div>

                        {/* General Comment */}
                        <FormGroup className="mb-4">
                            <Label for="comment_general" className="fw-bold">Commentaire général d'évaluation</Label>
                            <Input
                                type="textarea"
                                name="comment_general"
                                id="comment_general"
                                rows="3"
                                value={formData.comment_general}
                                onChange={handleInputChange}
                                placeholder="Synthèse globale de l'évaluation annuelle de l'agent..."
                            />
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                        <CancelIcon className="me-1" style={{ marginRight: '5px' }} />
                        Annuler
                    </Button>
                    <Button color="primary" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner size="sm" className="me-1" /> Enregistrement...
                            </>
                        ) : (
                            <>
                                <SaveIcon className="me-1" style={{ marginRight: '5px' }} /> Enregistrer
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Read-Only Details Modal */}
            <Modal isOpen={viewModalOpen} toggle={() => setViewModalOpen(false)} size="lg">
                <ModalHeader toggle={() => setViewModalOpen(false)} className="bg-info text-white">
                    <ViewIcon className="me-2" style={{ marginRight: '8px' }} />
                    Détail de l'évaluation - {selectedEvaluation?.agent_nom} {selectedEvaluation?.agent_prenom} ({selectedEvaluation?.annee})
                </ModalHeader>
                <ModalBody style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    {selectedEvaluation && (
                        <div>
                            <Row className="mb-4 pb-3 border-bottom">
                                <Col md="6">
                                    <div className="mb-2">
                                        <span className="text-muted d-block">Agent :</span>
                                        <strong>{selectedEvaluation.agent_nom} {selectedEvaluation.agent_prenom}</strong>
                                    </div>
                                    <div>
                                        <span className="text-muted d-block">Matricule :</span>
                                        <strong>{selectedEvaluation.agent_matricule || '-'}</strong>
                                    </div>
                                </Col>
                                <Col md="6">
                                    <div className="mb-2">
                                        <span className="text-muted d-block">Année de l'évaluation :</span>
                                        <span className="badge bg-secondary p-2">{selectedEvaluation.annee}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted d-block">Date d'enregistrement :</span>
                                        <strong>{selectedEvaluation.created_at ? new Date(selectedEvaluation.created_at).toLocaleString('fr-FR') : '-'}</strong>
                                    </div>
                                </Col>
                            </Row>

                            <h5 className="text-secondary mb-3">Critères d'évaluation détaillés</h5>
                            
                            <Table bordered striped responsive className="mb-4">
                                <thead className="table-light">
                                    <tr>
                                        <th>Critère</th>
                                        <th className="text-center" style={{ width: '120px' }}>Note Max</th>
                                        <th className="text-center" style={{ width: '120px' }}>Note Obtenue</th>
                                        <th>Commentaire associé</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>1. Assiduité</strong></td>
                                        <td className="text-center">5</td>
                                        <td className="text-center fw-bold">{selectedEvaluation.note_assiduite}</td>
                                        <td>{selectedEvaluation.comment_assiduite || <span className="text-muted italic small">Aucun commentaire</span>}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>2. Esprit d’initiative</strong></td>
                                        <td className="text-center">3</td>
                                        <td className="text-center fw-bold">{selectedEvaluation.note_initiative}</td>
                                        <td>{selectedEvaluation.comment_initiative || <span className="text-muted italic small">Aucun commentaire</span>}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>3. Esprit d’équipe</strong></td>
                                        <td className="text-center">3</td>
                                        <td className="text-center fw-bold">{selectedEvaluation.note_equipe}</td>
                                        <td>{selectedEvaluation.comment_equipe || <span className="text-muted italic small">Aucun commentaire</span>}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>4. Rendement</strong></td>
                                        <td className="text-center">5</td>
                                        <td className="text-center fw-bold">{selectedEvaluation.note_rendement}</td>
                                        <td>{selectedEvaluation.comment_rendement || <span className="text-muted italic small">Aucun commentaire</span>}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>5. La discipline</strong></td>
                                        <td className="text-center">4</td>
                                        <td className="text-center fw-bold">{selectedEvaluation.note_discipline}</td>
                                        <td>{selectedEvaluation.comment_discipline || <span className="text-muted italic small">Aucun commentaire</span>}</td>
                                    </tr>
                                    <tr className="table-secondary">
                                        <td><strong>NOTE FINALE</strong></td>
                                        <td className="text-center"><strong>20</strong></td>
                                        <td className="text-center text-primary h5 mb-0"><strong>{selectedEvaluation.note_finale}</strong></td>
                                        <td><strong className="text-uppercase text-secondary">Cumul des notes</strong></td>
                                    </tr>
                                </tbody>
                            </Table>

                            <Card className="bg-light border-0 mb-3 shadow-sm">
                                <CardBody>
                                    <h6 className="fw-bold text-secondary mb-2">Commentaire général de synthèse</h6>
                                    <p className="mb-0 bg-white p-3 border rounded text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedEvaluation.comment_general || <span className="text-muted italic small">Aucun commentaire général n'a été fourni.</span>}
                                    </p>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setViewModalOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        </Page>
    );
};

export default EvaluationsPage;
