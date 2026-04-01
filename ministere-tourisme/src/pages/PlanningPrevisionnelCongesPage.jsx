import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    CardTitle,
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Table,
    Alert,
    Spinner,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Badge,
    Collapse
} from 'reactstrap';
import {
    MdEventNote,
    MdGroup,
    MdPerson,
    MdSearch,
    MdCheck,
    MdClose,
    MdRefresh,
    MdDelete,
    MdCalendarToday,
    MdExpandMore,
    MdExpandLess,
    MdVisibility,
    MdArrowBack,
    MdPersonAdd,
    MdPrint,
    MdFileDownload,
    MdPictureAsPdf,
    MdList
} from 'react-icons/md';
import { getAuthHeaders, getApiUrl } from '../config/api';
import RapportCongesOrganisation from '../components/PlanningPrevisionnel/RapportCongesOrganisation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const apiUrl = getApiUrl();

const PlanningPrevisionnelCongesPage = () => {
    const [mode, setMode] = useState(null); // 'grouped' ou 'individual'
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState([]);
    const [filteredAgents, setFilteredAgents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('nom'); // 'nom' ou 'matricule'
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [dateDebut, setDateDebut] = useState('');
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [programmedAgents, setProgrammedAgents] = useState([]);
    const [loadingProgrammed, setLoadingProgrammed] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expandedDates, setExpandedDates] = useState({}); // Pour gérer l'ouverture/fermeture des dates
    const [showRapport, setShowRapport] = useState(false); // Pour afficher/masquer le rapport

    // Charger la liste des agents quand la modal s'ouvre
    useEffect(() => {
        if (showAgentModal) {
            console.log('🔍 Ouverture de la modal - agents.length:', agents.length);
            if (agents.length === 0 && !loading) {
                console.log('🔍 Chargement des agents...');
                loadAgents();
            } else if (agents.length > 0) {
                console.log('✅ Agents déjà chargés:', agents.length);
            }
            // Réinitialiser le champ de recherche quand on ouvre le modal
            if (mode === 'individual') {
                setSearchTerm('');
                setShowDropdown(false);
            }
        }
    }, [showAgentModal, mode]);

    // Charger la liste des agents avec date de départ programmée
    useEffect(() => {
        if (mode) {
            console.log('🔄 useEffect déclenché - mode:', mode, 'année:', selectedYear);
            loadProgrammedAgents();
        } else {
            // Si aucun mode n'est sélectionné, vider la liste
            setProgrammedAgents([]);
        }
    }, [selectedYear, mode]);

    // Recharger après une sauvegarde réussie
    useEffect(() => {
        if (success && success.includes('programmé')) {
            loadProgrammedAgents();
        }
    }, [success]);

    // Filtrer les agents selon le terme de recherche et le type de recherche
    useEffect(() => {
        console.log('🔍 Filtrage - searchTerm:', searchTerm, 'searchType:', searchType, 'agents.length:', agents.length);
        
        if (searchTerm.trim() === '') {
            setFilteredAgents(agents);
            setShowDropdown(false);
        } else {
            const term = searchTerm.toLowerCase().trim();
            let filtered = [];
            
            if (searchType === 'matricule') {
                filtered = agents.filter(agent => {
                    const matricule = agent.matricule ? agent.matricule.toLowerCase() : '';
                    const matches = matricule.includes(term);
                    if (matches) {
                        console.log('✅ Agent trouvé par matricule:', agent.nom, agent.prenom, agent.matricule);
                    }
                    return matches;
                });
            } else if (searchType === 'nom') {
                filtered = agents.filter(agent => {
                    const nom = agent.nom ? agent.nom.toLowerCase() : '';
                    const prenom = agent.prenom ? agent.prenom.toLowerCase() : '';
                    const matches = nom.includes(term) || prenom.includes(term);
                    if (matches) {
                        console.log('✅ Agent trouvé par nom:', agent.nom, agent.prenom);
                    }
                    return matches;
                });
            }
            
            console.log('🔍 Résultats filtrés:', filtered.length);
            setFilteredAgents(filtered);
            setShowDropdown(filtered.length > 0 && searchTerm.trim() !== '');
        }
    }, [searchTerm, searchType, agents]);

    const loadProgrammedAgents = async () => {
        // Ne pas charger si aucun mode n'est sélectionné
        if (!mode) {
            setProgrammedAgents([]);
            return;
        }
        
        setLoadingProgrammed(true);
        try {
            // Déterminer le type de congé selon le mode
            const typeConge = mode === 'individual' ? 'individual' : mode === 'grouped' ? 'grouped' : null;
            
            console.log('🔍 Chargement des agents programmés pour l\'année:', selectedYear, 'mode:', mode, 'type:', typeConge);
            let url = `${apiUrl}/api/planning-previsionnel/annee/${selectedYear}`;
            if (typeConge) {
                url += `?type_conge=${typeConge}`;
            }
            
            console.log('🔍 URL complète:', url);
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            console.log('🔍 Réponse API - Status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur HTTP:', response.status, errorText);
                throw new Error(`Erreur ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('🔍 Résultat API:', {
                success: result.success,
                count: result.count,
                dataLength: result.data?.length || 0,
                data: result.data
            });

            if (result.success) {
                setProgrammedAgents(result.data || []);
                console.log('✅ Agents programmés chargés:', result.data?.length || 0);
                // Réinitialiser les dates expandées lors du chargement
                setExpandedDates({});
            } else {
                console.error('❌ Erreur dans la réponse:', result.error);
                setProgrammedAgents([]);
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des agents programmés:', error);
            setProgrammedAgents([]);
            setError(`Erreur lors du chargement: ${error.message}`);
        } finally {
            setLoadingProgrammed(false);
        }
    };

    const loadAgents = async () => {
        setLoading(true);
        setError('');
        try {
            console.log('🔍 Chargement des agents...');
            const response = await fetch(`${apiUrl}/api/agents?limit=1000&page=1`, {
                headers: getAuthHeaders()
            });

            console.log('🔍 Status de la réponse:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur HTTP:', response.status, errorText);
                throw new Error(`Erreur ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('🔍 Réponse API agents:', {
                success: result.success,
                hasData: !!result.data,
                dataIsArray: Array.isArray(result.data),
                dataLength: result.data?.length || 0,
                resultKeys: Object.keys(result || {})
            });
            
            let allAgents = [];
            
            // Gérer différents formats de réponse
            if (result.success && result.data && Array.isArray(result.data)) {
                allAgents = result.data;
            } else if (Array.isArray(result)) {
                allAgents = result;
            } else if (result.data && Array.isArray(result.data)) {
                allAgents = result.data;
            }
            
            console.log('✅ Nombre total d\'agents récupérés:', allAgents.length);
            
            // Filtrer uniquement les agents actifs
            const activeAgents = allAgents.filter(agent => {
                const isActive = agent.statut_emploi === 'actif' && 
                    (agent.retire === null || agent.retire === false);
                return isActive;
            });
            
            console.log('✅ Nombre d\'agents actifs:', activeAgents.length);
            console.log('🔍 Exemple d\'agent:', activeAgents[0]);
            
            setAgents(activeAgents);
            setFilteredAgents(activeAgents);
            
            if (activeAgents.length === 0) {
                setError('Aucun agent actif trouvé');
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des agents:', error);
            setError(`Erreur lors du chargement des agents: ${error.message}`);
            setAgents([]);
            setFilteredAgents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleModeSelection = (selectedMode) => {
        setMode(selectedMode);
        setSelectedAgents([]);
        setSelectedAgent(null);
        setDateDebut('');
        setSearchTerm('');
        setSearchType('nom');
        setShowDropdown(false);
        setError('');
        setSuccess('');
        setShowAgentModal(false);
        // Réinitialiser la liste des agents programmés pour forcer le rechargement
        setProgrammedAgents([]);
    };

    const handleAgentSelect = (agent, event) => {
        if (mode === 'grouped') {
            // Empêcher la propagation du clic sur la checkbox
            if (event) {
                event.stopPropagation();
            }
            // Ajouter ou retirer l'agent de la sélection
            const isSelected = selectedAgents.some(a => a.id === agent.id);
            if (isSelected) {
                setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
            } else {
                setSelectedAgents([...selectedAgents, agent]);
            }
        } else if (mode === 'individual') {
            setSelectedAgent(agent);
            setShowAgentModal(false);
        }
    };

    const handleCheckboxChange = (agent, event) => {
        handleAgentSelect(agent, event);
    };

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        if (mode === 'grouped') {
            if (!dateDebut) {
                setError('Veuillez saisir la date de départ en congés');
                return;
            }
            if (selectedAgents.length === 0) {
                setError('Veuillez sélectionner au moins un agent');
                return;
            }
        } else if (mode === 'individual') {
            if (!selectedAgent) {
                setError('Veuillez sélectionner un agent');
                return;
            }
            if (!dateDebut) {
                setError('Veuillez saisir la date de départ en congés');
                return;
            }
        }

        try {
            setLoading(true);
            
            const annee = new Date(dateDebut).getFullYear();
            
            if (mode === 'grouped') {
                // Appel API pour les congés groupés
                const agentIds = selectedAgents.map(a => a.id);
                
                const response = await fetch(`${apiUrl}/api/planning-previsionnel/grouped`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        agents: agentIds,
                        annee: annee,
                        date_depart_conges: dateDebut
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Erreur lors de la sauvegarde');
                }

                setSuccess(`${result.data.length} agent(s) programmé(s) pour des congés à partir du ${formatDate(dateDebut)}`);
                // Réinitialiser la sélection après l'enregistrement
                setSelectedAgents([]);
                setDateDebut('');
                // Recharger la liste des agents programmés
                loadProgrammedAgents();
            } else {
                // Appel API pour les congés individuels
                const response = await fetch(`${apiUrl}/api/planning-previsionnel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        id_agent: selectedAgent.id,
                        annee: annee,
                        date_depart_conges: dateDebut,
                        type_conge: 'individual'
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'Erreur lors de la sauvegarde');
                }

                setSuccess(`Agent ${selectedAgent.nom} ${selectedAgent.prenom} programmé pour des congés à partir du ${formatDate(dateDebut)}`);
            }

            // Recharger la liste des agents programmés
            loadProgrammedAgents();

            // Réinitialiser le formulaire après 3 secondes
            setTimeout(() => {
                setMode(null);
                setSelectedAgents([]);
                setSelectedAgent(null);
                setDateDebut('');
                setSuccess('');
            }, 3000);

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            setError(error.message || 'Erreur lors de la sauvegarde des données');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const isAgentSelected = (agentId) => {
        if (mode === 'grouped') {
            return selectedAgents.some(a => a.id === agentId);
        }
        return false;
    };

    const handleReset = () => {
        setMode(null);
        setSelectedAgents([]);
        setSelectedAgent(null);
        setDateDebut('');
        setSearchTerm('');
        setSearchType('nom');
        setShowDropdown(false);
        setError('');
        setSuccess('');
        setShowAgentModal(false);
    };

    const handleSearchFocus = () => {
        if (searchTerm.trim() && filteredAgents.length > 0) {
            setShowDropdown(true);
        }
    };

    const handleSearchBlur = (e) => {
        // Ne pas fermer si le clic est dans la liste déroulante
        const relatedTarget = e.relatedTarget;
        const dropdown = e.currentTarget.parentElement?.querySelector('[data-dropdown]');
        
        // Si le focus passe vers un élément de la liste déroulante, ne pas fermer
        if (relatedTarget && dropdown && dropdown.contains(relatedTarget)) {
            return;
        }
        
        // Délai pour permettre le clic sur un élément de la liste
        setTimeout(() => {
            // Vérifier si le focus est toujours dans la liste déroulante
            const activeElement = document.activeElement;
            if (!activeElement || !dropdown?.contains(activeElement)) {
                setShowDropdown(false);
            }
        }, 150);
    };

    // Grouper les agents par date de départ
    const groupAgentsByDate = (agents) => {
        const grouped = {};
        agents.forEach(agent => {
            const dateKey = agent.date_depart_conges;
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(agent);
        });
        return grouped;
    };

    // Toggle l'expansion d'une date
    const toggleDateExpansion = (dateKey) => {
        setExpandedDates(prev => ({
            ...prev,
            [dateKey]: !prev[dateKey]
        }));
    };

    const handleDeleteProgrammedDate = async (agentId, annee) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer la date de départ en congés pour cet agent ?')) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${apiUrl}/api/planning-previsionnel/agent/${agentId}/annee/${annee}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erreur lors de la suppression');
            }

            setSuccess('Date de départ en congés supprimée avec succès');
            loadProgrammedAgents();
            
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            setError(error.message || 'Erreur lors de la suppression');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="mt-4">
            <Row>
                <Col>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <CardTitle tag="h4" className="mb-0">
                                    <MdEventNote className="me-2" style={{ color: '#d63384' }} />
                                    Planning prévisionnel des congés
                                </CardTitle>
                                {mode && (
                                    <Button
                                        color="secondary"
                                        onClick={() => setMode(null)}
                                        className="d-flex align-items-center"
                                    >
                                        <MdArrowBack className="me-2" />
                                        Retour
                                    </Button>
                                )}
                            </div>

                            {!mode && !showRapport ? (
                                <Row className="mt-4">
                                    <Col md="4" className="mb-3">
                                        <Card className="h-100" style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                                            onClick={() => handleModeSelection('grouped')}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                                        >
                                            <CardBody className="text-center p-5">
                                                <MdGroup size={60} className="mb-3" style={{ color: '#007bff' }} />
                                                <h5>Congés groupés</h5>
                                                <p className="text-muted">
                                                    Saisir une période de congés et sélectionner plusieurs agents
                                                </p>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md="4" className="mb-3">
                                        <Card className="h-100" style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                                            onClick={() => handleModeSelection('individual')}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#28a745'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                                        >
                                            <CardBody className="text-center p-5">
                                                <MdPerson size={60} className="mb-3" style={{ color: '#28a745' }} />
                                                <h5>Congés individuels</h5>
                                                <p className="text-muted">
                                                    Sélectionner un agent et saisir sa période de congés
                                                </p>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                    <Col md="4" className="mb-3">
                                        <Card className="h-100" style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                                            onClick={() => setShowRapport(true)}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#d63384'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                                        >
                                            <CardBody className="text-center p-5">
                                                <MdList size={60} className="mb-3" style={{ color: '#d63384' }} />
                                                <h5>Rapport par organisation</h5>
                                                <p className="text-muted">
                                                    Liste des agents en congés par direction, sous-direction et service
                                                </p>
                                            </CardBody>
                                        </Card>
                                    </Col>
                                </Row>
                            ) : showRapport ? (
                                <div>
                                    <div className="d-flex justify-content-end mb-3">
                                        <Button
                                            color="secondary"
                                            onClick={() => setShowRapport(false)}
                                        >
                                            <MdArrowBack className="me-2" />
                                            Retour
                                        </Button>
                                    </div>
                                    <RapportCongesOrganisation 
                                        selectedYear={selectedYear}
                                        onClose={() => setShowRapport(false)}
                                    />
                                </div>
                            ) : (
                                <div>
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

                                    <Form>
                                        {mode === 'grouped' && (
                                            <>
                                                <Row className="mb-3">
                                                    <Col md="3">
                                                        <FormGroup>
                                                            <Label>Date de départ en congés <span className="text-danger">*</span></Label>
                                                            <Input
                                                                type="date"
                                                                value={dateDebut}
                                                                onChange={(e) => setDateDebut(e.target.value)}
                                                                required
                                                            />
                                                        </FormGroup>
                                                    </Col>
                                                    <Col md="9" className="d-flex align-items-end">
                                                        <Button
                                                            color="primary"
                                                            onClick={() => {
                                                                if (!dateDebut) {
                                                                    setError('Veuillez d\'abord saisir la date de départ en congés');
                                                                    return;
                                                                }
                                                                setError('');
                                                                setSearchTerm('');
                                                                setShowAgentModal(true);
                                                            }}
                                                            disabled={!dateDebut}
                                                        >
                                                            <MdSearch className="me-2" />
                                                            Rechercher et sélectionner les agents
                                                        </Button>
                                                    </Col>
                                                </Row>

                                                {selectedAgents.length > 0 && (
                                                    <Card className="mb-3">
                                                        <CardBody>
                                                            <div className="mb-3">
                                                                <h6 className="mb-2">Date de départ en congés :</h6>
                                                                <Badge color="info" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                                                    {formatDate(dateDebut)}
                                                                </Badge>
                                                            </div>
                                                            <h6 className="mb-3">Agents sélectionnés ({selectedAgents.length}) :</h6>
                                                            <Table striped hover responsive size="sm">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Matricule</th>
                                                                        <th>Nom</th>
                                                                        <th>Prénoms</th>
                                                                        <th>Direction</th>
                                                                        <th>Service</th>
                                                                        <th>Actions</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedAgents.map((agent) => (
                                                                        <tr key={agent.id}>
                                                                            <td>{agent.matricule || '-'}</td>
                                                                            <td>{agent.nom || '-'}</td>
                                                                            <td>{agent.prenom || '-'}</td>
                                                                            <td>{agent.direction_libelle || '-'}</td>
                                                                            <td>{agent.service_libelle || '-'}</td>
                                                                            <td>
                                                                                <Button
                                                                                    color="danger"
                                                                                    size="sm"
                                                                                    onClick={() => setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id))}
                                                                                >
                                                                                    <MdClose />
                                                                                </Button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </Table>
                                                        </CardBody>
                                                    </Card>
                                                )}
                                            </>
                                        )}

                                        {mode === 'individual' && (
                                            <>
                                                <Row className="mb-3">
                                                    <Col md="12">
                                                        <FormGroup>
                                                            <Label>Agent <span className="text-danger">*</span></Label>
                                                            <div className="d-flex gap-2 align-items-end">
                                                                <Input
                                                                    type="text"
                                                                    value={selectedAgent ? `${selectedAgent.nom} ${selectedAgent.prenom} (${selectedAgent.matricule || 'N/A'})` : ''}
                                                                    placeholder="Cliquez pour sélectionner un agent"
                                                                    readOnly
                                                                    onClick={() => setShowAgentModal(true)}
                                                                    style={{ cursor: 'pointer', flex: 1 }}
                                                                />
                                                                {selectedAgent && (
                                                                    <Button
                                                                        color="primary"
                                                                        onClick={() => {
                                                                            const dateInput = document.getElementById('date-depart-individuel');
                                                                            if (dateInput) {
                                                                                dateInput.focus();
                                                                                dateInput.showPicker?.();
                                                                            }
                                                                        }}
                                                                    >
                                                                        <MdCalendarToday className="me-2" />
                                                                        Saisir la date de congé
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </FormGroup>
                                                    </Col>
                                                </Row>
                                                {selectedAgent && (
                                                    <Row className="mb-3">
                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label>Date de départ en congés <span className="text-danger">*</span></Label>
                                                                <Input
                                                                    id="date-depart-individuel"
                                                                    type="date"
                                                                    value={dateDebut}
                                                                    onChange={(e) => setDateDebut(e.target.value)}
                                                                    required
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                )}
                                            </>
                                        )}

                                        <Row>
                                            <Col className="d-flex gap-2">
                                                <Button
                                                    color="primary"
                                                    onClick={handleSubmit}
                                                    disabled={loading || (mode === 'grouped' && selectedAgents.length === 0) || (mode === 'individual' && !selectedAgent) || !dateDebut}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Spinner size="sm" className="me-2" />
                                                            Enregistrement...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <MdCheck className="me-2" />
                                                            Enregistrer
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    color="secondary"
                                                    onClick={handleReset}
                                                    disabled={loading}
                                                >
                                                    <MdRefresh className="me-2" />
                                                    Réinitialiser
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Form>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal de sélection des agents */}
            <Modal isOpen={showAgentModal} toggle={() => setShowAgentModal(false)} size="lg">
                <ModalHeader toggle={() => setShowAgentModal(false)}>
                    {mode === 'grouped' ? 'Sélectionner les agents' : 'Sélectionner un agent'}
                </ModalHeader>
                <ModalBody>
                    <Row className="mb-3">
                        <Col md="3">
                            <FormGroup>
                                <Label>Type de recherche</Label>
                                <Input
                                    type="select"
                                    value={searchType}
                                    onChange={(e) => {
                                        setSearchType(e.target.value);
                                        setSearchTerm('');
                                        setShowDropdown(false);
                                    }}
                                >
                                    <option value="nom">Par nom</option>
                                    <option value="matricule">Par matricule</option>
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md="9">
                            <FormGroup>
                                <Label>
                                    {searchType === 'nom' ? 'Rechercher par nom ou prénoms' : 'Rechercher par matricule'}
                                </Label>
                                <div style={{ position: 'relative' }}>
                                    <Input
                                        type="text"
                                        placeholder={searchType === 'nom' ? 'Saisir le nom ou prénoms...' : 'Saisir le matricule...'}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            if (e.target.value.trim() && filteredAgents.length > 0) {
                                                setShowDropdown(true);
                                            }
                                        }}
                                        onFocus={handleSearchFocus}
                                        onBlur={handleSearchBlur}
                                    />
                                    {showDropdown && filteredAgents.length > 0 && (
                                        <div
                                            data-dropdown
                                            onMouseDown={(e) => {
                                                // Empêcher le blur de l'input quand on clique dans la liste
                                                e.preventDefault();
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                backgroundColor: 'white',
                                                border: '1px solid #ced4da',
                                                borderRadius: '0.25rem',
                                                maxHeight: '300px',
                                                overflowY: 'auto',
                                                zIndex: 1000,
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                                marginTop: '2px'
                                            }}
                                        >
                                            {filteredAgents.map((agent) => (
                                                <div
                                                    key={agent.id}
                                                    onClick={() => {
                                                        if (mode === 'grouped') {
                                                            handleAgentSelect(agent);
                                                        } else {
                                                            setSelectedAgent(agent);
                                                            // Ne pas mettre à jour searchTerm pour permettre de rechercher à nouveau
                                                            setShowDropdown(false);
                                                            setShowAgentModal(false);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '10px 15px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid #f0f0f0',
                                                        backgroundColor: (mode === 'grouped' && isAgentSelected(agent.id)) || (mode === 'individual' && selectedAgent?.id === agent.id) ? '#e3f2fd' : 'white'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isAgentSelected(agent.id) && mode === 'grouped') {
                                                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                        }
                                                        if (selectedAgent?.id !== agent.id && mode === 'individual') {
                                                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isAgentSelected(agent.id) && mode === 'grouped') {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                        }
                                                        if (selectedAgent?.id !== agent.id && mode === 'individual') {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                        }
                                                    }}
                                                >
                                                    <div className="d-flex align-items-center">
                                                        {mode === 'grouped' && (
                                                            <Input
                                                                type="checkbox"
                                                                checked={isAgentSelected(agent.id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCheckboxChange(agent, e);
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    // Empêcher le blur de l'input
                                                                    e.preventDefault();
                                                                }}
                                                                style={{ marginRight: '10px' }}
                                                            />
                                                        )}
                                                        <div>
                                                            <strong>{agent.nom} {agent.prenom}</strong>
                                                            {agent.matricule && (
                                                                <span className="text-muted ms-2">({agent.matricule})</span>
                                                            )}
                                                            <div className="text-muted small">
                                                                {agent.direction_libelle || '-'} - {agent.service_libelle || '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormGroup>
                        </Col>
                    </Row>

                    {error && (
                        <Alert color="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}
                    
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des agents...</p>
                        </div>
                    ) : agents.length === 0 ? (
                        <Alert color="warning">
                            Aucun agent disponible. Veuillez vérifier votre connexion ou contacter l'administrateur.
                        </Alert>
                    ) : (
                        <>
                            {!searchTerm.trim() && (
                                <Alert color="info" className="mb-3">
                                    {searchType === 'nom' 
                                        ? `Saisissez un nom ou prénoms pour rechercher parmi ${agents.length} agent(s) disponible(s)` 
                                        : `Saisissez un matricule pour rechercher parmi ${agents.length} agent(s) disponible(s)`}
                                </Alert>
                            )}
                            {searchTerm.trim() && filteredAgents.length === 0 && (
                                <Alert color="warning">
                                    Aucun agent trouvé avec le critère "{searchTerm}" ({searchType === 'nom' ? 'nom/prénoms' : 'matricule'}).
                                </Alert>
                            )}
                            {searchTerm.trim() && filteredAgents.length > 0 && (
                                <div className="mt-3">
                                    <Alert color="success">
                                        {filteredAgents.length} agent(s) trouvé(s) avec le critère "{searchTerm}"
                                    </Alert>
                                </div>
                            )}
                        </>
                    )}

                    {/* Tableau des agents sélectionnés */}
                    {mode === 'grouped' && selectedAgents.length > 0 && (
                        <div className="mt-4">
                            <Card>
                                <CardBody>
                                    <CardTitle tag="h6" className="mb-3">
                                        Agents sélectionnés ({selectedAgents.length})
                                    </CardTitle>
                                    <Table striped hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Matricule</th>
                                                <th>Nom</th>
                                                <th>Prénoms</th>
                                                <th>Direction</th>
                                                <th>Sous-direction</th>
                                                <th>Service</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedAgents.map((agent) => (
                                                <tr key={agent.id}>
                                                    <td>{agent.matricule || '-'}</td>
                                                    <td>{agent.nom}</td>
                                                    <td>{agent.prenom}</td>
                                                    <td>{agent.direction_libelle || '-'}</td>
                                                    <td>{agent.sous_direction_libelle || '-'}</td>
                                                    <td>{agent.service_libelle || '-'}</td>
                                                    <td>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedAgents(selectedAgents.filter(a => a.id !== agent.id));
                                                            }}
                                                        >
                                                            <MdClose />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    {mode === 'grouped' && (
                        <div className="me-auto">
                            <Badge color="info">
                                {selectedAgents.length} agent(s) sélectionné(s)
                            </Badge>
                        </div>
                    )}
                    <Button 
                        color="secondary" 
                        onClick={() => setShowAgentModal(false)}
                        className="me-2"
                    >
                        Annuler
                    </Button>
                    {mode === 'grouped' && (
                        <Button 
                            color="primary" 
                            onClick={() => {
                                if (selectedAgents.length > 0) {
                                    setShowAgentModal(false);
                                } else {
                                    setError('Veuillez sélectionner au moins un agent');
                                }
                            }}
                            disabled={selectedAgents.length === 0}
                        >
                            <MdCheck className="me-2" />
                            Terminer ({selectedAgents.length})
                        </Button>
                    )}
                    {mode === 'individual' && (
                        <Button color="primary" onClick={() => setShowAgentModal(false)}>
                            Valider
                        </Button>
                    )}
                </ModalFooter>
            </Modal>

            {/* Liste des agents avec date de départ programmée */}
            {/* Afficher uniquement pour les congés groupés */}
            {mode === 'grouped' && (
            <Row className="mt-4">
                <Col>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <CardTitle tag="h5" className="mb-0">
                                    <MdCalendarToday className="me-2" style={{ color: '#d63384' }} />
                                    Agents avec date de départ en congés programmée (Congés groupés)
                                </CardTitle>
                                <div className="d-flex align-items-center gap-2">
                                    <Label className="mb-0">Année :</Label>
                                    <Input
                                        type="select"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        style={{ width: '120px' }}
                                    >
                                        {Array.from({ length: 5 }, (_, i) => {
                                            const year = new Date().getFullYear() + i;
                                            return (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            );
                                        })}
                                    </Input>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        onClick={loadProgrammedAgents}
                                        disabled={loadingProgrammed}
                                    >
                                        <MdRefresh className={loadingProgrammed ? 'spinning' : ''} />
                                    </Button>
                                </div>
                            </div>

                            {loadingProgrammed ? (
                                <div className="text-center py-4">
                                    <Spinner color="primary" />
                                    <p className="mt-2">Chargement...</p>
                                </div>
                            ) : programmedAgents.length === 0 ? (
                                <Alert color="info">
                                    Aucun agent avec date de départ en congés programmée pour l'année {selectedYear}
                                </Alert>
                            ) : (() => {
                                const groupedByDate = groupAgentsByDate(programmedAgents);
                                const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));
                                
                                return (
                                    <div>
                                        <Table striped hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>Date de départ en congés</th>
                                                    <th>Nombre d'agents</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedDates.map((dateKey) => {
                                                    const agentsForDate = groupedByDate[dateKey];
                                                    const isExpanded = expandedDates[dateKey];
                                                    
                                                    return (
                                                        <React.Fragment key={dateKey}>
                                                            <tr>
                                                                <td>
                                                                    <strong style={{ fontSize: '1.1rem' }}>{formatDate(dateKey)}</strong>
                                                                </td>
                                                                <td>
                                                                    <Badge 
                                                                        color="primary" 
                                                                        style={{ 
                                                                            fontSize: '1rem', 
                                                                            padding: '0.5rem 1rem',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        {agentsForDate.length} agent{agentsForDate.length > 1 ? 's' : ''}
                                                                    </Badge>
                                                                </td>
                                                                <td>
                                                                    <div className="d-flex gap-2">
                                                                        <Button
                                                                            color="success"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                // Pré-remplir la date et ouvrir le modal
                                                                                const dateParts = dateKey.split('-');
                                                                                const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                                                                                setDateDebut(dateKey);
                                                                                setSelectedAgents([]);
                                                                                setShowAgentModal(true);
                                                                            }}
                                                                        >
                                                                            <MdPersonAdd className="me-1" />
                                                                            Ajouter des agents
                                                                        </Button>
                                                                        <Button
                                                                            color="primary"
                                                                            size="sm"
                                                                            onClick={() => toggleDateExpansion(dateKey)}
                                                                        >
                                                                            {isExpanded ? (
                                                                                <>
                                                                                    <MdExpandLess className="me-1" />
                                                                                    Masquer
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <MdVisibility className="me-1" />
                                                                                    Voir les agents
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan="3">
                                                                        <div className="mt-3">
                                                                            <Table striped hover responsive size="sm" className="mb-0">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th>Matricule</th>
                                                                                        <th>Nom</th>
                                                                                        <th>Prénoms</th>
                                                                                        <th>Emploi</th>
                                                                                        <th>Direction</th>
                                                                                        <th>Sous-direction</th>
                                                                                        <th>Service</th>
                                                                                        <th>Année</th>
                                                                                        <th>Actions</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {agentsForDate.map((agent) => (
                                                                                        <tr key={`${agent.id_agent}-${agent.annee}`}>
                                                                                            <td>{agent.matricule || '-'}</td>
                                                                                            <td>{agent.nom || '-'}</td>
                                                                                            <td>{agent.prenom || '-'}</td>
                                                                                            <td>{agent.emploi_actuel_libele || '-'}</td>
                                                                                            <td>{agent.direction_libelle || '-'}</td>
                                                                                            <td>{agent.sous_direction_libelle || '-'}</td>
                                                                                            <td>{agent.service_libelle || '-'}</td>
                                                                                            <td>{agent.annee}</td>
                                                                                            <td>
                                                                                                <Button
                                                                                                    color="danger"
                                                                                                    size="sm"
                                                                                                    onClick={() => handleDeleteProgrammedDate(agent.id_agent, agent.annee)}
                                                                                                    disabled={loading}
                                                                                                >
                                                                                                    <MdDelete />
                                                                                                </Button>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </Table>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                    </div>
                                );
                            })()}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            )}

            {/* Liste des agents avec date de départ programmée pour les congés individuels */}
            {mode === 'individual' && (
            <Row className="mt-4">
                <Col>
                    <Card>
                        <CardBody>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <CardTitle tag="h5" className="mb-0">
                                    <MdCalendarToday className="me-2" style={{ color: '#d63384' }} />
                                    Agents avec date de départ en congés programmée (Congés individuels)
                                </CardTitle>
                                <div className="d-flex align-items-center gap-2">
                                    <Label className="mb-0">Filtrer par année :</Label>
                                    <Input
                                        type="select"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        style={{ width: '140px' }}
                                    >
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const year = new Date().getFullYear() - 2 + i; // Inclure 2 années passées et 8 futures
                                            return (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            );
                                        })}
                                    </Input>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        onClick={loadProgrammedAgents}
                                        disabled={loadingProgrammed}
                                        title="Actualiser la liste"
                                    >
                                        <MdRefresh className={loadingProgrammed ? 'spinning' : ''} />
                                    </Button>
                                </div>
                            </div>

                            {loadingProgrammed ? (
                                <div className="text-center py-4">
                                    <Spinner color="primary" />
                                    <p className="mt-2">Chargement...</p>
                                </div>
                            ) : programmedAgents.length === 0 ? (
                                <Alert color="info">
                                    Aucun agent avec date de départ en congés programmée pour l'année {selectedYear} (Congés individuels)
                                </Alert>
                            ) : (
                                <>
                                    <div className="mb-3">
                                        <Badge color="success" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                            {programmedAgents.length} agent{programmedAgents.length > 1 ? 's' : ''} trouvé{programmedAgents.length > 1 ? 's' : ''} pour l'année {selectedYear}
                                        </Badge>
                                    </div>
                                    <Table striped hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Matricule</th>
                                                <th>Nom</th>
                                                <th>Prénoms</th>
                                                <th>Emploi</th>
                                                <th>Direction</th>
                                                <th>Sous-direction</th>
                                                <th>Service</th>
                                                <th>Date de départ en congés</th>
                                                <th>Année</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {programmedAgents.map((agent) => (
                                                <tr key={`${agent.id_agent}-${agent.annee}`}>
                                                    <td>{agent.matricule || '-'}</td>
                                                    <td>{agent.nom || '-'}</td>
                                                    <td>{agent.prenom || '-'}</td>
                                                    <td>{agent.emploi_actuel_libele || '-'}</td>
                                                    <td>{agent.direction_libelle || '-'}</td>
                                                    <td>{agent.sous_direction_libelle || '-'}</td>
                                                    <td>{agent.service_libelle || '-'}</td>
                                                    <td>
                                                        <Badge color="light" style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem', color: 'black', fontWeight: 'bold', border: '1px solid #dee2e6' }}>
                                                            {formatDate(agent.date_depart_conges)}
                                                        </Badge>
                                                    </td>
                                                    <td>{agent.annee}</td>
                                                    <td>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteProgrammedDate(agent.id_agent, agent.annee)}
                                                            disabled={loading}
                                                        >
                                                            <MdDelete />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            )}
        </Container>
    );
};

export default PlanningPrevisionnelCongesPage;

