import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
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
    Badge,
    Alert,
    Spinner,
    InputGroup,
    InputGroupText
} from 'reactstrap';
import { 
    MdAdd, 
    MdEdit, 
    MdDelete, 
    MdSearch, 
    MdEvent, 
    MdPerson, 
    MdLocationOn, 
    MdDateRange, 
    MdGroup, 
    MdPersonAdd, 
    MdCheck, 
    MdClose, 
    MdPrint,
    MdDescription
} from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

const GestionEvenementsPage = () => {
    const { user, token } = useAuth();
    const [evenements, setEvenements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editingEvenement, setEditingEvenement] = useState(null);
    const [formData, setFormData] = useState({
        titre: '',
        description: '',
        date_debut: '',
        date_fin: '',
        lieu: '',
        organisateur: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    // États pour la gestion des participants
    const [participantsModal, setParticipantsModal] = useState(false);
    const [currentEvenement, setCurrentEvenement] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [availableAgents, setAvailableAgents] = useState([]);
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [searchAgent, setSearchAgent] = useState('');

    // Charger les données au montage du composant
    useEffect(() => {
        loadEvenements();
        loadAgents();
    }, []);

    const loadEvenements = async () => {
        try {
            setLoading(true);
            const response = await fetch('https://tourisme.2ise-groupe.com/api/evenements', {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                setEvenements(Array.isArray(data) ? data : (data.data || []));
            } else {
                showAlert('Erreur lors du chargement des événements', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        } finally {
            setLoading(false);
        }
    };

    const loadAgents = async () => {
        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/agents?limit=1000', {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const result = await response.json();
                const agents = result.success ? (result.data || []) : (Array.isArray(result) ? result : []);
                setAvailableAgents(agents);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des agents:', error);
        }
    };

    const showAlert = (message, type) => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
    };

    const toggleModal = () => {
        setModal(!modal);
        if (!modal) {
            setEditingEvenement(null);
            setFormData({
                titre: '',
                description: '',
                date_debut: '',
                date_fin: '',
                lieu: '',
                organisateur: ''
            });
        }
    };

    const handleEdit = (evenement) => {
        setEditingEvenement(evenement);
        setFormData({
            titre: evenement.titre || '',
            description: evenement.description || '',
            date_debut: evenement.date_debut || '',
            date_fin: evenement.date_fin || '',
            lieu: evenement.lieu || '',
            organisateur: evenement.organisateur || ''
        });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation des champs obligatoires
        if (!formData.titre || !formData.date_debut || !formData.date_fin || !formData.lieu) {
            showAlert('Veuillez remplir tous les champs obligatoires', 'danger');
            return;
        }
        
        // Validation des dates
        if (new Date(formData.date_fin) < new Date(formData.date_debut)) {
            showAlert('La date de fin doit être postérieure à la date de début', 'danger');
            return;
        }

        try {
            const url = editingEvenement 
                ? `https://tourisme.2ise-groupe.com/api/evenements/${editingEvenement.id}`
                : 'https://tourisme.2ise-groupe.com/api/evenements';
            
            const method = editingEvenement ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showAlert(
                    editingEvenement 
                        ? 'Événement mis à jour avec succès' 
                        : 'Événement créé avec succès',
                    'success'
                );
                toggleModal();
                loadEvenements();
            } else {
                const error = await response.json();
                showAlert(error.error || 'Erreur lors de la sauvegarde', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
            try {
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/evenements/${id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    showAlert('Événement supprimé avec succès', 'success');
                    loadEvenements();
                } else {
                    showAlert('Erreur lors de la suppression', 'danger');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showAlert('Erreur de connexion au serveur', 'danger');
            }
        }
    };

    const toggleParticipantsModal = (evenement) => {
        setCurrentEvenement(evenement);
        setParticipantsModal(!participantsModal);
        if (!participantsModal && evenement) {
            loadParticipants(evenement.id);
        } else {
            setParticipants([]);
            setSelectedAgents([]);
        }
    };

    const loadParticipants = async (evenementId) => {
        try {
            setLoadingParticipants(true);
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/evenements/${evenementId}/participants`, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                const participantsList = Array.isArray(data) ? data : (data.data || []);
                setParticipants(participantsList);
                // Pré-sélectionner les agents déjà participants
                const participantIds = participantsList.map(p => p.id_agent || p.agent_id);
                setSelectedAgents(participantIds);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des participants:', error);
        } finally {
            setLoadingParticipants(false);
        }
    };

    const toggleAgentSelection = (agentId) => {
        setSelectedAgents(prev => {
            if (prev.includes(agentId)) {
                return prev.filter(id => id !== agentId);
            } else {
                return [...prev, agentId];
            }
        });
    };

    const saveParticipants = async () => {
        if (!currentEvenement) return;

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/evenements/${currentEvenement.id}/participants`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ participants: selectedAgents }),
            });

            if (response.ok) {
                const data = await response.json();
                showAlert('Participants enregistrés avec succès', 'success');
                setParticipants(Array.isArray(data) ? data : (data.data || []));
            } else {
                const error = await response.json();
                showAlert(error.error || 'Erreur lors de l\'enregistrement', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        }
    };

    const handlePrint = (evenement) => {
        // Charger les participants pour l'impression
        fetch(`https://tourisme.2ise-groupe.com/api/evenements/${evenement.id}/participants`, {
            headers: getAuthHeaders()
        })
        .then(response => response.json())
        .then(data => {
            const participantsData = Array.isArray(data) ? data : (data.data || []);
            printEvenement(evenement, participantsData);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des participants:', error);
            printEvenement(evenement, []);
        });
    };

    const printEvenement = (evenement, participantsList) => {
        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Événement - ${evenement.titre}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #000;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .info-section {
                        margin-bottom: 20px;
                    }
                    .info-section h2 {
                        font-size: 18px;
                        border-bottom: 1px solid #ccc;
                        padding-bottom: 5px;
                        margin-bottom: 10px;
                    }
                    .info-row {
                        margin-bottom: 8px;
                    }
                    .info-label {
                        font-weight: bold;
                        display: inline-block;
                        width: 150px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    @media print {
                        body {
                            margin: 0;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${evenement.titre || 'Événement'}</h1>
                </div>
                
                <div class="info-section">
                    <h2>Informations de l'événement</h2>
                    <div class="info-row">
                        <span class="info-label">Titre:</span>
                        <span>${evenement.titre || 'N/A'}</span>
                    </div>
                    ${evenement.description ? `
                    <div class="info-row">
                        <span class="info-label">Description:</span>
                        <span>${evenement.description}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">Date de début:</span>
                        <span>${evenement.date_debut ? new Date(evenement.date_debut).toLocaleDateString('fr-FR') : 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Date de fin:</span>
                        <span>${evenement.date_fin ? new Date(evenement.date_fin).toLocaleDateString('fr-FR') : 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Lieu:</span>
                        <span>${evenement.lieu || 'N/A'}</span>
                    </div>
                    ${evenement.organisateur ? `
                    <div class="info-row">
                        <span class="info-label">Organisateur:</span>
                        <span>${evenement.organisateur}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="info-section">
                    <h2>Liste des participants (${participantsList.length})</h2>
                    ${participantsList.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Prénom</th>
                                <th>Fonction</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${participantsList.map((p, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${p.matricule || p.agent?.matricule || 'N/A'}</td>
                                    <td>${p.nom || p.agent?.nom || 'N/A'}</td>
                                    <td>${p.prenom || p.agent?.prenom || 'N/A'}</td>
                                    <td>${p.fonction_actuelle || p.agent?.fonction_actuelle || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    ` : '<p>Aucun participant enregistré.</p>'}
                </div>

                <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
                    <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                </div>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    const filteredEvenements = evenements.filter(evenement =>
        evenement.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evenement.lieu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evenement.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAgents = availableAgents.filter(agent =>
        `${agent.prenom || ''} ${agent.nom || ''} ${agent.matricule || ''}`.toLowerCase().includes(searchAgent.toLowerCase())
    );

    return (
        <div className="container-fluid mt-4">
            {alert.show && (
                <Alert color={alert.type} className="mb-3">
                    {alert.message}
                </Alert>
            )}

            <Card>
                <CardHeader style={{ background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white' }}>
                    <CardTitle tag="h4" className="mb-0">
                        <MdEvent className="me-2" />
                        Gestion des Événements
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <Row className="mb-3">
                        <Col md={6}>
                            <InputGroup>
                                <InputGroupText>
                                    <MdSearch />
                                </InputGroupText>
                                <Input
                                    type="text"
                                    placeholder="Rechercher un événement..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={6} className="text-end">
                            <Button color="success" onClick={toggleModal}>
                                <MdAdd className="me-2" />
                                Nouvel Événement
                            </Button>
                        </Col>
                    </Row>

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner color="success" />
                            <p className="mt-2">Chargement des événements...</p>
                        </div>
                    ) : filteredEvenements.length === 0 ? (
                        <Alert color="info">
                            Aucun événement trouvé. Créez votre premier événement !
                        </Alert>
                    ) : (
                        <Table responsive striped hover>
                            <thead>
                                <tr>
                                    <th>Titre</th>
                                    <th>Date de début</th>
                                    <th>Date de fin</th>
                                    <th>Lieu</th>
                                    <th>Organisateur</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvenements.map((evenement) => (
                                    <tr key={evenement.id}>
                                        <td>
                                            <strong>{evenement.titre}</strong>
                                        </td>
                                        <td>
                                            {evenement.date_debut 
                                                ? new Date(evenement.date_debut).toLocaleDateString('fr-FR')
                                                : 'N/A'}
                                        </td>
                                        <td>
                                            {evenement.date_fin 
                                                ? new Date(evenement.date_fin).toLocaleDateString('fr-FR')
                                                : 'N/A'}
                                        </td>
                                        <td>
                                            <MdLocationOn className="me-1" />
                                            {evenement.lieu || 'N/A'}
                                        </td>
                                        <td>{evenement.organisateur || 'N/A'}</td>
                                        <td>
                                            <Button
                                                color="info"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => toggleParticipantsModal(evenement)}
                                                title="Gérer les participants"
                                            >
                                                <MdGroup />
                                            </Button>
                                            <Button
                                                color="primary"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handlePrint(evenement)}
                                                title="Imprimer"
                                            >
                                                <MdPrint />
                                            </Button>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                className="me-2"
                                                onClick={() => handleEdit(evenement)}
                                                title="Modifier"
                                            >
                                                <MdEdit />
                                            </Button>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() => handleDelete(evenement.id)}
                                                title="Supprimer"
                                            >
                                                <MdDelete />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </CardBody>
            </Card>

            {/* Modal de création/édition d'événement */}
            <Modal isOpen={modal} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    {editingEvenement ? 'Modifier l\'événement' : 'Nouvel Événement'}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <FormGroup>
                            <Label>Titre *</Label>
                            <Input
                                type="text"
                                value={formData.titre}
                                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                                required
                                placeholder="Titre de l'événement"
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>Description</Label>
                            <Input
                                type="textarea"
                                rows="3"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Description de l'événement"
                            />
                        </FormGroup>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Date de début *</Label>
                                    <Input
                                        type="date"
                                        value={formData.date_debut}
                                        onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Date de fin *</Label>
                                    <Input
                                        type="date"
                                        value={formData.date_fin}
                                        onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Lieu *</Label>
                                    <Input
                                        type="text"
                                        value={formData.lieu}
                                        onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                                        required
                                        placeholder="Lieu de l'événement"
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label>Organisateur</Label>
                                    <Input
                                        type="text"
                                        value={formData.organisateur}
                                        onChange={(e) => setFormData({ ...formData, organisateur: e.target.value })}
                                        placeholder="Nom de l'organisateur"
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModal}>
                            Annuler
                        </Button>
                        <Button color="success" type="submit">
                            {editingEvenement ? 'Modifier' : 'Créer'}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modal de gestion des participants */}
            <Modal isOpen={participantsModal} toggle={toggleParticipantsModal} size="xl">
                <ModalHeader toggle={toggleParticipantsModal}>
                    <MdGroup className="me-2" />
                    Gestion des participants - {currentEvenement?.titre}
                </ModalHeader>
                <ModalBody>
                    {loadingParticipants ? (
                        <div className="text-center py-5">
                            <Spinner color="success" />
                            <p className="mt-2">Chargement des participants...</p>
                        </div>
                    ) : (
                        <>
                            <Row className="mb-3">
                                <Col>
                                    <InputGroup>
                                        <InputGroupText>
                                            <MdSearch />
                                        </InputGroupText>
                                        <Input
                                            type="text"
                                            placeholder="Rechercher un agent..."
                                            value={searchAgent}
                                            onChange={(e) => setSearchAgent(e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                            </Row>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <Table striped hover>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px' }}>Sélection</th>
                                            <th>Matricule</th>
                                            <th>Nom</th>
                                            <th>Prénom</th>
                                            <th>Fonction</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAgents.map((agent) => (
                                            <tr key={agent.id}>
                                                <td>
                                                    <Input
                                                        type="checkbox"
                                                        checked={selectedAgents.includes(agent.id)}
                                                        onChange={() => toggleAgentSelection(agent.id)}
                                                    />
                                                </td>
                                                <td>{agent.matricule || 'N/A'}</td>
                                                <td>{agent.nom || 'N/A'}</td>
                                                <td>{agent.prenom || 'N/A'}</td>
                                                <td>{agent.fonction_actuelle || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            <Alert color="info" className="mt-3">
                                <strong>{selectedAgents.length}</strong> participant(s) sélectionné(s)
                            </Alert>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleParticipantsModal}>
                        Fermer
                    </Button>
                    <Button color="success" onClick={saveParticipants} disabled={loadingParticipants}>
                        <MdCheck className="me-2" />
                        Enregistrer les participants
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default GestionEvenementsPage;

