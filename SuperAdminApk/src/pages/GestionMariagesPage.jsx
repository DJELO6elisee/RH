import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    CardTitle,
    Form,
    FormGroup,
    Label,
    Input,
    Button,
    Table,
    Alert,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Spinner
} from 'reactstrap';
import { MdSearch, MdPerson, MdFavorite, MdList, MdRefresh } from 'react-icons/md';
import { getAuthHeaders, getApiUrl } from '../config/api';
import classnames from 'classnames';

const apiUrl = getApiUrl();

const GestionMariagesPage = () => {
    const [activeTab, setActiveTab] = useState('1'); // '1' pour liste, '2' pour recherche
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('nom'); // 'nom' ou 'matricule'
    const [agents, setAgents] = useState([]);
    const [mariages, setMariages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMariages, setLoadingMariages] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [hasSearched, setHasSearched] = useState(false); // Pour savoir si une recherche a été effectuée
    const [formData, setFormData] = useState({
        nom_conjoint: '',
        prenom_conjoint: '',
        date_mariage: '',
        lieu_mariage: '',
        lieu_reception: ''
    });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    // Charger la liste des mariages au chargement de la page
    useEffect(() => {
        loadMariages();
    }, []);

    // Charger la liste des mariages
    const loadMariages = async () => {
        setLoadingMariages(true);
        try {
            const response = await fetch(`${apiUrl}/api/mariages?limit=100`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des mariages');
            }

            const result = await response.json();
            
            if (result.success && result.data && Array.isArray(result.data)) {
                setMariages(result.data);
            } else {
                setMariages([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des mariages:', error);
            setMariages([]);
        } finally {
            setLoadingMariages(false);
        }
    };

    // Rechercher un agent
    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            alert('Veuillez saisir un nom ou un matricule');
            return;
        }

        setHasSearched(true); // Marquer qu'une recherche a été effectuée
        setLoading(true);
        setAgents([]);
        setErrors({});

        try {
            const params = new URLSearchParams();
            // Le backend utilise le paramètre 'search' pour rechercher dans nom, prénom et matricule
            params.append('search', searchTerm.trim());
            
            // Ajouter une limite pour éviter trop de résultats
            params.append('limit', '100');
            params.append('page', '1');

            const url = `${apiUrl}/api/agents?${params.toString()}`;
            console.log('🔍 URL de recherche:', url);
            console.log('🔍 Type de recherche:', searchType);
            console.log('🔍 Terme de recherche:', searchTerm);

            const headers = getAuthHeaders();
            console.log('🔍 Headers:', headers);

            const response = await fetch(url, {
                headers: headers
            });

            console.log('🔍 Status de la réponse:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur HTTP:', response.status, errorText);
                let errorMessage = `Erreur ${response.status}`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.message || errorJson.error || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            
            console.log('✅ Résultat de la recherche:', {
                success: result.success,
                hasData: !!result.data,
                dataIsArray: Array.isArray(result.data),
                dataLength: result.data?.length || 0,
                fullResult: result
            });
            
            // Filtrer les résultats selon le type de recherche
            let filteredAgents = [];
            
            // Le backend peut retourner les données avec ou sans champ 'success'
            // Vérifier si result.data existe et est un tableau
            if (result.data && Array.isArray(result.data)) {
                filteredAgents = result.data;
                console.log(`📊 ${filteredAgents.length} agent(s) trouvé(s) avant filtrage`);
                
                // Si recherche par matricule, filtrer pour ne garder que ceux qui correspondent exactement ou commencent par
                if (searchType === 'matricule') {
                    const searchTermUpper = searchTerm.trim().toUpperCase();
                    filteredAgents = filteredAgents.filter(agent => {
                        const matricule = (agent.matricule || '').toUpperCase();
                        return matricule === searchTermUpper || matricule.startsWith(searchTermUpper);
                    });
                    console.log(`📊 ${filteredAgents.length} agent(s) après filtrage par matricule`);
                }
                // Si recherche par nom, filtrer pour ne garder que ceux dont le nom ou prénom correspond
                else if (searchType === 'nom') {
                    const searchTermLower = searchTerm.trim().toLowerCase();
                    filteredAgents = filteredAgents.filter(agent => {
                        const nom = (agent.nom || '').toLowerCase();
                        const prenom = (agent.prenom || '').toLowerCase();
                        return nom.includes(searchTermLower) || prenom.includes(searchTermLower);
                    });
                    console.log(`📊 ${filteredAgents.length} agent(s) après filtrage par nom`);
                }
            } else if (result.success === false) {
                // Seulement si success est explicitement false
                console.error('❌ La recherche a échoué:', result);
                throw new Error(result.message || result.error || 'Erreur lors de la recherche');
            } else if (!result.data || !Array.isArray(result.data)) {
                // Si pas de données ou format incorrect
                console.warn('⚠️ Format de réponse inattendu:', result);
            }
            
            if (filteredAgents.length > 0) {
                setAgents(filteredAgents);
                setErrors({});
            } else {
                setAgents([]);
                if (result.success && result.data && result.data.length === 0) {
                    setErrors({ search: 'Aucun agent trouvé. Vérifiez que le terme de recherche est correct.' });
                } else {
                    setErrors({ search: 'Aucun agent trouvé avec ces critères de recherche.' });
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la recherche:', error);
            setErrors({ search: error.message || 'Erreur lors de la recherche de l\'agent. Vérifiez votre connexion.' });
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    // Ouvrir le formulaire pour un agent
    const handleOpenForm = (agent) => {
        setSelectedAgent(agent);
        // Pré-remplir avec les données existantes si disponibles
        setFormData({
            nom_conjoint: agent.nom_conjointe || '',
            prenom_conjoint: agent.prenom_conjointe || '',
            date_mariage: agent.date_mariage || '',
            lieu_mariage: agent.lieu_mariage || '',
            lieu_reception: agent.lieu_reception || ''
        });
        setShowForm(true);
        setErrors({});
        setSuccessMessage('');
    };

    // Fermer le formulaire
    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedAgent(null);
        setFormData({
            nom_conjoint: '',
            prenom_conjoint: '',
            date_mariage: '',
            lieu_mariage: '',
            lieu_reception: ''
        });
        setErrors({});
        setSuccessMessage('');
    };

    // Gérer les changements dans le formulaire
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Effacer l'erreur pour ce champ
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Valider le formulaire
    const validateForm = () => {
        const newErrors = {};

        if (!formData.nom_conjoint.trim()) {
            newErrors.nom_conjoint = 'Le nom du conjoint est obligatoire';
        }

        if (!formData.prenom_conjoint.trim()) {
            newErrors.prenom_conjoint = 'Le prénom du conjoint est obligatoire';
        }

        if (!formData.date_mariage) {
            newErrors.date_mariage = 'La date de mariage est obligatoire';
        }

        if (!formData.lieu_mariage.trim()) {
            newErrors.lieu_mariage = 'Le lieu de mariage (mairie) est obligatoire';
        }

        if (!formData.lieu_reception.trim()) {
            newErrors.lieu_reception = 'Le lieu de réception est obligatoire';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Soumettre le formulaire
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/mariages/${selectedAgent.id}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
            }

            const result = await response.json();
            
            if (result.success) {
                setSuccessMessage('Informations de mariage enregistrées avec succès');
                // Mettre à jour l'agent dans la liste
                setAgents(prev => prev.map(agent => 
                    agent.id === selectedAgent.id 
                        ? { ...agent, ...formData }
                        : agent
                ));
                
                // Recharger la liste des mariages
                loadMariages();
                
                // Fermer le formulaire après 2 secondes
                setTimeout(() => {
                    handleCloseForm();
                }, 2000);
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            setErrors({ submit: error.message || 'Erreur lors de la sauvegarde des informations' });
        }
    };

    // Formater la date
    const formatDate = (dateString) => {
        if (!dateString) return '-';
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

    return (
        <Container fluid className="mt-4">
            <Row>
                <Col>
                    <Card>
                        <CardBody>
                            <CardTitle tag="h4" className="mb-4">
                                <MdFavorite className="me-2" style={{ color: '#d63384' }} />
                                Gestion des Mariages
                            </CardTitle>

                            {/* Note informative sur les notifications automatiques */}
                            <Alert color="info" className="mb-3">
                                <strong>ℹ️ Information :</strong> Un message automatique sera envoyé à tous les agents 
                                un mois, une semaine et trois jours avant la date du mariage pour les informer de cet événement.
                            </Alert>

                            {/* Onglets */}
                            <Nav tabs className="mb-3">
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => { 
                                            setActiveTab('1');
                                            setHasSearched(false); // Réinitialiser lors du changement d'onglet
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <MdList className="me-2" />
                                        Liste des Mariages ({mariages.length})
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '2' })}
                                        onClick={() => { 
                                            setActiveTab('2');
                                            setHasSearched(false); // Réinitialiser lors du changement d'onglet
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <MdSearch className="me-2" />
                                        Rechercher un Agent
                                    </NavLink>
                                </NavItem>
                            </Nav>

                            <TabContent activeTab={activeTab}>
                                {/* Onglet 1 : Liste des mariages */}
                                <TabPane tabId="1">
                                    <Card className="mt-3">
                                        <CardBody>
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h5>Liste des Mariages Enregistrés</h5>
                                                <Button
                                                    color="primary"
                                                    size="sm"
                                                    onClick={loadMariages}
                                                    disabled={loadingMariages}
                                                >
                                                    <MdRefresh className="me-2" />
                                                    Actualiser
                                                </Button>
                                            </div>

                                            {loadingMariages ? (
                                                <div className="text-center py-4">
                                                    <Spinner color="primary" />
                                                    <p className="mt-2">Chargement des mariages...</p>
                                                </div>
                                            ) : mariages.length > 0 ? (
                                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                                    <Table striped hover responsive>
                                                        <thead>
                                                            <tr>
                                                                <th>Matricule</th>
                                                                <th>Nom</th>
                                                                <th>Prénoms</th>
                                                                <th>Emploi</th>
                                                                <th>Nom Conjoint(e)</th>
                                                                <th>Prénom Conjoint(e)</th>
                                                                <th>Date de Mariage</th>
                                                                <th>Lieu de Mariage</th>
                                                                <th>Lieu de Réception</th>
                                                                <th>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {mariages.map((mariage) => (
                                                                <tr key={mariage.id}>
                                                                    <td>{mariage.matricule || '-'}</td>
                                                                    <td>{mariage.nom || '-'}</td>
                                                                    <td>{mariage.prenom || '-'}</td>
                                                                    <td>{mariage.emploi_actuel_libele || '-'}</td>
                                                                    <td>{mariage.nom_conjointe || '-'}</td>
                                                                    <td>{mariage.prenom_conjointe || '-'}</td>
                                                                    <td>{formatDate(mariage.date_mariage)}</td>
                                                                    <td>{mariage.lieu_mariage || '-'}</td>
                                                                    <td>{mariage.lieu_reception || '-'}</td>
                                                                    <td>
                                                                        <Button
                                                                            color="info"
                                                                            size="sm"
                                                                            onClick={() => handleOpenForm(mariage)}
                                                                        >
                                                                            <MdPerson className="me-1" />
                                                                            Modifier
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <Alert color="info" className="mt-3">
                                                    Aucun mariage enregistré pour le moment.
                                                </Alert>
                                            )}
                                        </CardBody>
                                    </Card>
                                </TabPane>

                                {/* Onglet 2 : Recherche d'agent */}
                                <TabPane tabId="2">
                                    <div className="mt-3">
                                        {/* Section de recherche */}
                                        <Card className="mb-4" style={{ backgroundColor: '#f8f9fa' }}>
                                            <CardBody>
                                                <Row>
                                                    <Col md="3">
                                                        <FormGroup>
                                                            <Label>Type de recherche</Label>
                                                            <Input
                                                                type="select"
                                                                value={searchType}
                                                                onChange={(e) => setSearchType(e.target.value)}
                                                            >
                                                                <option value="nom">Par nom</option>
                                                                <option value="matricule">Par matricule</option>
                                                            </Input>
                                                        </FormGroup>
                                                    </Col>
                                                    <Col md="6">
                                                        <FormGroup>
                                                            <Label>
                                                                {searchType === 'nom' ? 'Nom de l\'agent' : 'Matricule de l\'agent'}
                                                            </Label>
                                                            <Input
                                                                type="text"
                                                                placeholder={searchType === 'nom' ? 'Saisir le nom' : 'Saisir le matricule'}
                                                                value={searchTerm}
                                                                onChange={(e) => {
                                                                    setSearchTerm(e.target.value);
                                                                    setHasSearched(false); // Réinitialiser quand l'utilisateur modifie le champ
                                                                }}
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleSearch();
                                                                    }
                                                                }}
                                                            />
                                                        </FormGroup>
                                                    </Col>
                                                    <Col md="3" className="d-flex align-items-end">
                                                        <Button
                                                            color="primary"
                                                            onClick={handleSearch}
                                                            disabled={loading}
                                                            className="w-100"
                                                        >
                                                            <MdSearch className="me-2" />
                                                            {loading ? 'Recherche...' : 'Rechercher'}
                                                        </Button>
                                                    </Col>
                                                </Row>
                                                {errors.search && (
                                                    <Alert color="danger" className="mt-2">
                                                        {errors.search}
                                                    </Alert>
                                                )}
                                            </CardBody>
                                        </Card>

                                        {/* Résultats de recherche */}
                                        {agents.length > 0 && (
                                            <div>
                                                <h5 className="mb-3">Résultats de la recherche</h5>
                                                <Table striped hover responsive>
                                                    <thead>
                                                        <tr>
                                                            <th>Matricule</th>
                                                            <th>Nom</th>
                                                            <th>Prénoms</th>
                                                            <th>Fonction</th>
                                                            <th>Emploi</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {agents.map((agent) => (
                                                            <tr key={agent.id}>
                                                                <td>{agent.matricule || '-'}</td>
                                                                <td>{agent.nom || '-'}</td>
                                                                <td>{agent.prenom || '-'}</td>
                                                                <td>{agent.fonction_actuelle_libele || '-'}</td>
                                                                <td>{agent.emploi_actuel_libele || '-'}</td>
                                                                <td>
                                                                    <Button
                                                                        color="success"
                                                                        size="sm"
                                                                        onClick={() => handleOpenForm(agent)}
                                                                    >
                                                                        <MdPerson className="me-1" />
                                                                        Saisir les informations
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        )}

                                        {agents.length === 0 && !loading && hasSearched && (
                                            <Alert color="info" className="mt-3">
                                                Aucun agent trouvé. Veuillez effectuer une recherche.
                                            </Alert>
                                        )}
                                    </div>
                                </TabPane>
                            </TabContent>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal du formulaire */}
            <Modal isOpen={showForm} toggle={handleCloseForm} size="lg">
                <ModalHeader toggle={handleCloseForm}>
                    Informations de mariage - {selectedAgent?.nom} {selectedAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {successMessage && (
                        <Alert color="success" className="mb-3">
                            {successMessage}
                        </Alert>
                    )}

                    {errors.submit && (
                        <Alert color="danger" className="mb-3">
                            {errors.submit}
                        </Alert>
                    )}

                    <Form>
                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>Nom conjoint(e) <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        name="nom_conjoint"
                                        value={formData.nom_conjoint}
                                        onChange={handleInputChange}
                                        invalid={!!errors.nom_conjoint}
                                    />
                                    {errors.nom_conjoint && (
                                        <div className="text-danger small mt-1">{errors.nom_conjoint}</div>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label>Prénoms conjoint(e) <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        name="prenom_conjoint"
                                        value={formData.prenom_conjoint}
                                        onChange={handleInputChange}
                                        invalid={!!errors.prenom_conjoint}
                                    />
                                    {errors.prenom_conjoint && (
                                        <div className="text-danger small mt-1">{errors.prenom_conjoint}</div>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row>
                            <Col md="6">
                                <FormGroup>
                                    <Label>Date de mariage <span className="text-danger">*</span></Label>
                                    <Input
                                        type="date"
                                        name="date_mariage"
                                        value={formData.date_mariage}
                                        onChange={handleInputChange}
                                        invalid={!!errors.date_mariage}
                                    />
                                    {errors.date_mariage && (
                                        <div className="text-danger small mt-1">{errors.date_mariage}</div>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row>
                            <Col md="12">
                                <FormGroup>
                                    <Label>Lieu de mariage (Mairie) <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        name="lieu_mariage"
                                        value={formData.lieu_mariage}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Mairie de Cocody, Abidjan"
                                        invalid={!!errors.lieu_mariage}
                                    />
                                    {errors.lieu_mariage && (
                                        <div className="text-danger small mt-1">{errors.lieu_mariage}</div>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row>
                            <Col md="12">
                                <FormGroup>
                                    <Label>Lieu de réception <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        name="lieu_reception"
                                        value={formData.lieu_reception}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Hôtel Pullman, Cocody"
                                        invalid={!!errors.lieu_reception}
                                    />
                                    {errors.lieu_reception && (
                                        <div className="text-danger small mt-1">{errors.lieu_reception}</div>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={handleCloseForm}>
                        Annuler
                    </Button>
                    <Button color="primary" onClick={handleSubmit}>
                        Enregistrer
                    </Button>
                </ModalFooter>
            </Modal>
        </Container>
    );
};

export default GestionMariagesPage;

