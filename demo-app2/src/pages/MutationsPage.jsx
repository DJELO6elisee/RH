import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  CardTitle, 
  Row, 
  Col, 
  Input, 
  Button, 
  Alert, 
  Spinner,
  Table,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label
} from 'reactstrap';
import SearchableSelect from '../components/SearchableSelect';
import { 
  MdPerson, 
  MdSwapHoriz, 
  MdAddCircle,
  MdSearch,
  MdVisibility,
  MdDownload,
  MdInfo,
  MdDateRange,
  MdBusiness,
  MdClose
} from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://tourisme.2ise-groupe.com';

const MutationsPage = () => {
  const { user } = useAuth();
  const [mutations, setMutations] = useState([]);
  const [filteredMutations, setFilteredMutations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [directions, setDirections] = useState([]);
  const [directionsGenerales, setDirectionsGenerales] = useState([]);
  const [sousDirections, setSousDirections] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [loadingDirectionsGenerales, setLoadingDirectionsGenerales] = useState(false);
  const [loadingSousDirections, setLoadingSousDirections] = useState(false);
  const [formData, setFormData] = useState({
    id_agent: '',
    id_direction_generale: '',
    id_direction_destination: '',
    id_sous_direction: '',
    date_effet: '',
    motif: '',
    type_mutation: 'complete' // 'complete', 'sous_direction', 'retirer_service'
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [sousDirectionsCurrentDirection, setSousDirectionsCurrentDirection] = useState([]);

  // Charger les mutations existantes
  useEffect(() => {
    loadMutations();
    loadDirectionsGenerales();
  }, []);

  // Charger les agents quand on ouvre le modal
  useEffect(() => {
    if (modalOpen) {
      loadAgents();
    }
  }, [modalOpen]);

  // Filtrer les mutations selon le terme de recherche
  useEffect(() => {
    if (!searchTerm) {
      setFilteredMutations(mutations);
    } else {
      const filtered = mutations.filter(mutation => {
        const searchLower = searchTerm.toLowerCase();
        const agentName = `${mutation.prenom || ''} ${mutation.nom || ''}`.toLowerCase();
        const matricule = (mutation.matricule || '').toLowerCase();
        const direction = (mutation.direction_destination || '').toLowerCase();
        
        return agentName.includes(searchLower) ||
               matricule.includes(searchLower) ||
               direction.includes(searchLower);
      });
      setFilteredMutations(filtered);
    }
  }, [searchTerm, mutations]);

  // ID du ministère pour le filtrage (sauf super_admin)
  const ministereId = user?.role !== 'super_admin' && (user?.organization?.type === 'ministere' ? user?.organization?.id : user?.id_ministere);

  const loadMutations = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/api/demandes/historiques-global?type_demande=mutation&limit=1000`;
      if (ministereId) {
        url += `&id_ministere=${ministereId}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des mutations');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Extraire les informations de mutation depuis la description
        const mutationsWithDetails = data.data.map(mutation => {
          let mutationDetails = {
            id_direction_destination: null,
            direction_destination: null,
            date_effet: mutation.date_debut || null,
            motif: null
          };

          if (mutation.description && mutation.description.startsWith('MUTATION_DATA:')) {
            try {
              const jsonStr = mutation.description.replace('MUTATION_DATA:', '');
              const parsed = JSON.parse(jsonStr);
              mutationDetails = {
                id_direction_destination: parsed.id_direction_destination,
                direction_destination: parsed.direction_destination,
                date_effet: parsed.date_effet || mutation.date_debut,
                motif: parsed.motif
              };
            } catch (e) {
              console.warn('Erreur lors du parsing des données de mutation:', e);
            }
          }

          return {
            ...mutation,
            ...mutationDetails
          };
        });
        setMutations(mutationsWithDetails);
        setFilteredMutations(mutationsWithDetails);
      } else {
        setMutations([]);
        setFilteredMutations([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des mutations:', err);
      setError('Erreur lors de la récupération des mutations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    setLoadingAgents(true);
    try {
      const token = localStorage.getItem('token');
      
      // Récupérer l'ID du ministère de l'utilisateur
      let url = `${API_BASE_URL}/api/agents?limit=1000&retire=false`;
      if (user?.id_ministere || user?.organization?.id) {
        const ministereId = user.id_ministere || user.organization.id;
        url += `&id_ministere=${ministereId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Données brutes de l\'API agents:', data);
        
        // Gérer différents formats de réponse
        let agentsList = [];
        if (data.success && data.data) {
          agentsList = Array.isArray(data.data) ? data.data : [];
        } else if (Array.isArray(data)) {
          agentsList = data;
        } else if (data.data && Array.isArray(data.data)) {
          agentsList = data.data;
        }
        
        console.log('✅ Agents chargés:', agentsList.length, 'agents');
        console.log('📋 Exemple d\'agent:', agentsList[0]);
        
        setAgents(agentsList);
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur API agents:', errorData);
        setError('Erreur lors du chargement des agents: ' + (errorData.error || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des agents:', err);
      setError('Erreur lors du chargement des agents: ' + err.message);
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadDirectionsGenerales = async () => {
    setLoadingDirectionsGenerales(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/api/directions-generales?limit=1000`;
      if (ministereId) {
        url += `&id_ministere=${ministereId}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const directionsGeneralesList = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);
        setDirectionsGenerales(directionsGeneralesList);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des directions générales:', err);
      setError('Erreur lors du chargement des directions générales: ' + err.message);
    } finally {
      setLoadingDirectionsGenerales(false);
    }
  };

  const loadDirections = async (idDirectionGenerale) => {
    if (!idDirectionGenerale) {
      setDirections([]);
      return;
    }

    setLoadingDirections(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/directions?limit=1000&id_direction_generale=${idDirectionGenerale}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const directionsList = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);
        setDirections(directionsList);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des directions:', err);
      setError('Erreur lors du chargement des directions: ' + err.message);
    } finally {
      setLoadingDirections(false);
    }
  };

  const loadSousDirections = async (idDirection, forCurrentDirection = false) => {
    if (!idDirection) {
      if (forCurrentDirection) {
        setSousDirectionsCurrentDirection([]);
      } else {
        setSousDirections([]);
      }
      return;
    }

    setLoadingSousDirections(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/api/sous-directions?limit=1000&direction_id=${idDirection}`;
      if (ministereId) {
        url += `&id_ministere=${ministereId}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sousDirectionsList = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);
        if (forCurrentDirection) {
          setSousDirectionsCurrentDirection(sousDirectionsList);
        } else {
          setSousDirections(sousDirectionsList);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des sous-directions:', err);
      setError('Erreur lors du chargement des sous-directions: ' + err.message);
    } finally {
      setLoadingSousDirections(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      
      // Si la direction générale change, recharger les directions et réinitialiser direction et sous-direction
      if (name === 'id_direction_generale') {
        loadDirections(value);
        newData.id_direction_destination = '';
        newData.id_sous_direction = '';
        setSousDirections([]);
      }
      
      // Si la direction change, recharger les sous-directions et réinitialiser sous-direction
      if (name === 'id_direction_destination') {
        loadSousDirections(value);
        newData.id_sous_direction = '';
      }
      
      return newData;
    });
  };

  const handleCreateMutation = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!formData.id_agent) {
      setError('Veuillez sélectionner un agent');
      setSaving(false);
      return;
    }

    if (!formData.date_effet) {
      setError('Veuillez sélectionner une date d\'effet');
      setSaving(false);
      return;
    }

    // Validation selon le type de mutation
    if (formData.type_mutation === 'complete') {
      if (!formData.id_direction_generale) {
        setError('Veuillez sélectionner une direction générale');
        setSaving(false);
        return;
      }
      if (!formData.id_direction_destination) {
        setError('Veuillez sélectionner une direction de destination');
        setSaving(false);
        return;
      }
    } else if (formData.type_mutation === 'sous_direction') {
      if (!formData.id_sous_direction) {
        setError('Veuillez sélectionner une sous-direction de destination');
        setSaving(false);
        return;
      }
      if (!selectedAgent?.id_direction) {
        setError('L\'agent sélectionné n\'a pas de direction actuelle');
        setSaving(false);
        return;
      }
    } else if (formData.type_mutation === 'retirer_service') {
      // Pas de validation supplémentaire nécessaire
    }

    try {
      const token = localStorage.getItem('token');
      
      // Préparer le body selon le type de mutation
      let requestBody = {
        id_agent: parseInt(formData.id_agent),
        date_effet: formData.date_effet,
        motif: formData.motif || null,
        type_mutation: formData.type_mutation
      };

      if (formData.type_mutation === 'complete') {
        requestBody.id_direction_destination = parseInt(formData.id_direction_destination);
        if (formData.id_sous_direction) {
          requestBody.id_sous_direction = parseInt(formData.id_sous_direction);
        }
      } else if (formData.type_mutation === 'sous_direction') {
        // Garder la même direction, changer seulement la sous-direction
        requestBody.id_direction_destination = selectedAgent.id_direction;
        requestBody.id_sous_direction = parseInt(formData.id_sous_direction);
      } else if (formData.type_mutation === 'retirer_service') {
        // Retirer du service (mettre id_service à null)
        requestBody.retirer_service = true;
        // Garder la direction actuelle
        if (selectedAgent?.id_direction) {
          requestBody.id_direction_destination = selectedAgent.id_direction;
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/documents/creer-mutation-directe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la mutation');
      }

      const successMessage = formData.type_mutation === 'retirer_service' 
        ? 'Agent retiré du service avec succès ! La note de service a été générée automatiquement.'
        : formData.type_mutation === 'sous_direction'
        ? 'Mutation de sous-direction créée avec succès ! La note de service a été générée automatiquement.'
        : 'Mutation créée avec succès ! La note de service a été générée automatiquement.';
      
      setSuccess(successMessage);
      setModalOpen(false);
      setFormData({
        id_agent: '',
        id_direction_generale: '',
        id_direction_destination: '',
        id_sous_direction: '',
        date_effet: '',
        motif: '',
        type_mutation: 'complete'
      });
      setSelectedAgent(null);
      setDirections([]);
      setSousDirections([]);
      setSousDirectionsCurrentDirection([]);
      
      // Recharger la liste des mutations
      setTimeout(() => {
        loadMutations();
      }, 1000);
    } catch (err) {
      console.error('Erreur lors de la création de la mutation:', err);
      setError(err.message || 'Erreur lors de la création de la mutation');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDocument = async (demandeId) => {
    try {
      // Trouver le document associé à cette demande
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/demande/${demandeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const document = data.data[0];
          const htmlResponse = await fetch(`${API_BASE_URL}/api/documents/${document.id}/html`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (htmlResponse.ok) {
            const htmlContent = await htmlResponse.text();
            const newWindow = window.open('', '_blank');
            newWindow.document.write(htmlContent);
            newWindow.document.close();
          }
        } else {
          setError('Aucun document trouvé pour cette mutation');
        }
      }
    } catch (err) {
      console.error('Erreur lors de l\'ouverture du document:', err);
      setError('Erreur lors de l\'ouverture du document: ' + err.message);
    }
  };

  const handleDownloadPDF = async (demandeId, matricule) => {
    try {
      const token = localStorage.getItem('token');
      // Trouver le document associé
      const docResponse = await fetch(`${API_BASE_URL}/api/documents/demande/${demandeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (docResponse.ok) {
        const docData = await docResponse.json();
        if (docData.success && docData.data && docData.data.length > 0) {
          const documentData = docData.data[0];
          const response = await fetch(`${API_BASE_URL}/api/documents/${documentData.id}/pdf`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Note_Service_Mutation_${matricule || 'agent'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
        }
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement du PDF:', err);
      setError('Erreur lors du téléchargement du PDF: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'approuve': { color: 'success', label: 'Approuvée' },
      'en_attente': { color: 'warning', label: 'En attente' },
      'rejete': { color: 'danger', label: 'Rejetée' }
    };
    const statusInfo = statusMap[status] || { color: 'secondary', label: status };
    return <Badge color={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  // Vérifier que l'utilisateur est DRH
  if (!user || (user.role?.toLowerCase() !== 'drh')) {
    return (
      <div className="container mt-4">
        <Alert color="danger">
          <MdInfo className="me-2" />
          Accès refusé. Seuls les DRH peuvent accéder à cette page.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <Row>
        <Col>
          <Card>
            <CardHeader>
              <Row className="align-items-center">
                <Col>
                  <CardTitle tag="h4" className="mb-0">
                    <MdSwapHoriz className="me-2" />
                    Gestion des Mutations
                  </CardTitle>
                  <small className="text-muted">
                    Créez et gérez les mutations d'agents avec génération automatique des notes de service
                  </small>
                </Col>
                <Col xs="auto">
                  <Button 
                    color="primary" 
                    onClick={() => setModalOpen(true)}
                    className="d-flex align-items-center"
                  >
                    <MdAddCircle className="me-2" />
                    Créer une mutation
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody>
              {error && (
                <Alert color="danger" className="mb-3" toggle={() => setError(null)}>
                  <MdInfo className="me-2" />
                  {error}
                </Alert>
              )}

              {success && (
                <Alert color="success" className="mb-3" toggle={() => setSuccess(null)}>
                  <MdInfo className="me-2" />
                  {success}
                </Alert>
              )}

              {/* Barre de recherche */}
              <Row className="mb-3">
                <Col md="6">
                  <Input
                    type="text"
                    placeholder="Rechercher par nom, matricule ou direction..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="d-inline-block"
                  />
                </Col>
                <Col md="6" className="text-end">
                  <Button color="secondary" outline onClick={loadMutations}>
                    <MdSearch className="me-2" />
                    Actualiser
                  </Button>
                </Col>
              </Row>

              {/* Tableau des mutations */}
              {loading ? (
                <div className="text-center py-5">
                  <Spinner color="primary" />
                  <p className="mt-2">Chargement des mutations...</p>
                </div>
              ) : filteredMutations.length === 0 ? (
                <Alert color="info">
                  <MdInfo className="me-2" />
                  Aucune mutation trouvée.
                </Alert>
              ) : (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Matricule</th>
                      <th>Direction destination</th>
                      <th>Date d'effet</th>
                      <th>Statut</th>
                      <th>Date de création</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMutations.map((mutation) => (
                      <tr key={mutation.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <MdPerson className="me-2" />
                            <div>
                              <strong>{mutation.prenom} {mutation.nom}</strong>
                            </div>
                          </div>
                        </td>
                        <td>{mutation.matricule || 'N/A'}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <MdBusiness className="me-2 text-muted" />
                            {mutation.direction_destination || 'Non spécifiée'}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <MdDateRange className="me-2 text-muted" />
                            {formatDate(mutation.date_effet)}
                          </div>
                        </td>
                        <td>{getStatusBadge(mutation.status)}</td>
                        <td>{formatDate(mutation.date_creation)}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <Button
                              color="info"
                              size="sm"
                              outline
                              onClick={() => handleViewDocument(mutation.id)}
                              title="Voir le document"
                            >
                              <MdVisibility />
                            </Button>
                            <Button
                              color="success"
                              size="sm"
                              outline
                              onClick={() => handleDownloadPDF(mutation.id, mutation.matricule)}
                              title="Télécharger le PDF"
                            >
                              <MdDownload />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {/* Modal de création de mutation */}
      <Modal isOpen={modalOpen} toggle={() => {
        setModalOpen(false);
        // Réinitialiser le formulaire et les listes filtrées
        setFormData({
          id_agent: '',
          id_direction_generale: '',
          id_direction_destination: '',
          id_sous_direction: '',
          date_effet: '',
          motif: ''
        });
        setDirections([]);
        setSousDirections([]);
      }} size="lg">
        <ModalHeader toggle={() => setModalOpen(false)}>
          <MdSwapHoriz className="me-2" />
          Créer une mutation
        </ModalHeader>
        <Form onSubmit={handleCreateMutation}>
          <ModalBody>
            <>
            <Alert color="info" className="mb-3">
              <MdInfo className="me-2" />
              <strong>Information :</strong> La création d'une mutation générera automatiquement une note de service
              et mettra à jour la direction de l'agent. L'agent sera notifié de cette mutation.
            </Alert>

            {/* Type de mutation */}
            <FormGroup>
              <Label>Type de mutation *</Label>
              <div>
                <FormGroup check className="mb-2">
                  <Label check>
                    <Input
                      type="radio"
                      name="type_mutation"
                      value="complete"
                      checked={formData.type_mutation === 'complete'}
                      onChange={handleInputChange}
                    />
                    {' '}
                    Mutation complète (changer de direction)
                  </Label>
                </FormGroup>
                <FormGroup check className="mb-2">
                  <Label check>
                    <Input
                      type="radio"
                      name="type_mutation"
                      value="sous_direction"
                      checked={formData.type_mutation === 'sous_direction'}
                      onChange={handleInputChange}
                    />
                    {' '}
                    Mutation de sous-direction uniquement (garder la même direction)
                  </Label>
                </FormGroup>
                <FormGroup check>
                  <Label check>
                    <Input
                      type="radio"
                      name="type_mutation"
                      value="retirer_service"
                      checked={formData.type_mutation === 'retirer_service'}
                      onChange={handleInputChange}
                    />
                    {' '}
                    Retirer l'agent de son service
                  </Label>
                </FormGroup>
              </div>
            </FormGroup>

            <Row>
              <Col md="6">
                <FormGroup>
                  <Label for="id_agent">Agent *</Label>
                  {loadingAgents ? (
                    <>
                      <Input
                        type="text"
                        disabled
                        value="Chargement des agents..."
                      />
                      <small className="text-muted d-block mt-1">
                        <Spinner size="sm" className="me-2" />
                        Chargement des agents...
                      </small>
                    </>
                  ) : (
                    <>
                      <SearchableSelect
                        id="id_agent"
                        value={formData.id_agent || ''}
                        onChange={(value) => {
                          handleInputChange({ target: { name: 'id_agent', value } });
                        }}
                        options={agents.map(agent => {
                          const label = `${agent.prenom || ''} ${agent.nom || ''} - ${agent.matricule || 'Sans matricule'}${agent.service_libelle || agent.service_nom || agent.direction_libelle ? ` (${agent.service_libelle || agent.service_nom || agent.direction_libelle})` : ''}`.trim();
                          return {
                            id: agent.id,
                            label: label || `Agent #${agent.id}`
                          };
                        })}
                        placeholder="Rechercher un agent..."
                        invalid={false}
                        disabled={false}
                      />
                      {agents.length === 0 && !loadingAgents && (
                        <small className="text-warning d-block mt-1">
                          Aucun agent disponible. Vérifiez votre connexion ou les filtres appliqués.
                        </small>
                      )}
                    </>
                  )}
                </FormGroup>
              </Col>
            </Row>

            {/* Champs pour mutation complète */}
            {formData.type_mutation === 'complete' && (
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label for="id_direction_generale">Direction générale *</Label>
                  {loadingDirectionsGenerales ? (
                    <>
                      <Input
                        type="text"
                        disabled
                        value="Chargement des directions générales..."
                      />
                      <small className="text-muted d-block mt-1">
                        <Spinner size="sm" className="me-2" />
                        Chargement des directions générales...
                      </small>
                    </>
                  ) : (
                    <SearchableSelect
                      id="id_direction_generale"
                      value={formData.id_direction_generale || ''}
                      onChange={(value) => {
                        handleInputChange({ target: { name: 'id_direction_generale', value } });
                      }}
                      options={directionsGenerales.map(dg => ({
                        id: dg.id,
                        label: dg.libelle
                      }))}
                      placeholder="Rechercher une direction générale..."
                      invalid={false}
                      disabled={false}
                    />
                  )}
                </FormGroup>
              </Col>
              <Col md="6">
                <FormGroup>
                  <Label for="id_direction_destination">Direction de destination *</Label>
                  {loadingDirections ? (
                    <>
                      <Input
                        type="text"
                        disabled
                        value="Chargement des directions..."
                      />
                      <small className="text-muted d-block mt-1">
                        <Spinner size="sm" className="me-2" />
                        Chargement des directions...
                      </small>
                    </>
                  ) : (
                    <SearchableSelect
                      id="id_direction_destination"
                      value={formData.id_direction_destination || ''}
                      onChange={(value) => {
                        handleInputChange({ target: { name: 'id_direction_destination', value } });
                      }}
                      options={directions.map(direction => ({
                        id: direction.id,
                        label: direction.libelle
                      }))}
                      placeholder={formData.id_direction_generale ? "Rechercher une direction..." : "Sélectionnez d'abord une direction générale"}
                      invalid={false}
                      disabled={!formData.id_direction_generale}
                    />
                  )}
                  {!formData.id_direction_generale && (
                    <small className="text-muted d-block mt-1">
                      Veuillez d'abord sélectionner une direction générale
                    </small>
                  )}
                  </FormGroup>
                </Col>
              </Row>
            )}

            {/* Champs pour mutation de sous-direction uniquement */}
            {formData.type_mutation === 'sous_direction' && (
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label for="id_sous_direction_current">Sous-direction de destination *</Label>
                    {loadingSousDirections ? (
                      <>
                        <Input
                          type="text"
                          disabled
                          value="Chargement des sous-directions..."
                        />
                        <small className="text-muted d-block mt-1">
                          <Spinner size="sm" className="me-2" />
                          Chargement des sous-directions...
                        </small>
                      </>
                    ) : (
                      <>
                        <SearchableSelect
                          id="id_sous_direction_current"
                          value={formData.id_sous_direction || ''}
                          onChange={(value) => {
                            setFormData(prev => ({
                              ...prev,
                              id_sous_direction: value
                            }));
                          }}
                          options={sousDirectionsCurrentDirection.map(sd => ({
                            id: sd.id,
                            label: sd.libelle
                          }))}
                          placeholder={selectedAgent?.id_direction ? "Rechercher une sous-direction..." : "Sélectionnez d'abord un agent"}
                          invalid={false}
                          disabled={!selectedAgent?.id_direction}
                        />
                        {selectedAgent && (
                          <small className="text-muted d-block mt-1">
                            Direction actuelle: {selectedAgent.direction_libelle || 'Non spécifiée'}
                          </small>
                        )}
                        {!selectedAgent?.id_direction && (
                          <small className="text-warning d-block mt-1">
                            L'agent sélectionné doit avoir une direction pour effectuer une mutation de sous-direction
                          </small>
                        )}
                      </>
                    )}
                  </FormGroup>
                </Col>
              </Row>
            )}

            {/* Message pour retrait de service */}
            {formData.type_mutation === 'retirer_service' && (
              <Alert color="warning" className="mb-3">
                <MdInfo className="me-2" />
                <strong>Attention :</strong> Cette action retirera l'agent de son service actuel. 
                L'agent conservera sa direction et sa sous-direction actuelles, mais n'aura plus de service assigné.
              </Alert>
            )}

            {/* Champs pour mutation complète - Sous-direction optionnelle */}
            {formData.type_mutation === 'complete' && (
              <Row>
                <Col md="6">
                  <FormGroup>
                    <Label for="id_sous_direction">Sous-direction (optionnel)</Label>
                  {loadingSousDirections ? (
                    <>
                      <Input
                        type="text"
                        disabled
                        value="Chargement des sous-directions..."
                      />
                      <small className="text-muted d-block mt-1">
                        <Spinner size="sm" className="me-2" />
                        Chargement des sous-directions...
                      </small>
                    </>
                  ) : (
                    <SearchableSelect
                      id="id_sous_direction"
                      value={formData.id_sous_direction || ''}
                      onChange={(value) => {
                        setFormData(prev => ({
                          ...prev,
                          id_sous_direction: value
                        }));
                      }}
                      options={sousDirections.map(sd => ({
                        id: sd.id,
                        label: sd.libelle
                      }))}
                      placeholder={formData.id_direction_destination ? "Rechercher une sous-direction..." : "Sélectionnez d'abord une direction"}
                      invalid={false}
                      disabled={!formData.id_direction_destination}
                    />
                  )}
                  {!formData.id_direction_destination && (
                    <small className="text-muted d-block mt-1">
                      Veuillez d'abord sélectionner une direction
                    </small>
                  )}
                </FormGroup>
              </Col>
            </Row>
            )}

            <Row>
              <Col md="6">
                <FormGroup>
                  <Label for="date_effet">Date d'effet de la mutation *</Label>
                  <Input
                    type="date"
                    name="date_effet"
                    id="date_effet"
                    value={formData.date_effet}
                    onChange={handleInputChange}
                    required
                    // min={new Date().toISOString().split('T')[0]}
                  />
                  <small className="text-muted d-block mt-1">
                    Date à laquelle la mutation prend effet
                  </small>
                </FormGroup>
              </Col>
            </Row>

            <FormGroup>
              <Label for="motif">Motif de la mutation (optionnel)</Label>
              <Input
                type="textarea"
                name="motif"
                id="motif"
                value={formData.motif}
                onChange={handleInputChange}
                rows="3"
                placeholder="Ex: Mutation faite par DRH, Mutation à la demande de l'agent, etc."
              />
              <small className="text-muted d-block mt-1">
                Si non spécifié, le motif par défaut sera "Mutation faite par DRH"
              </small>
            </FormGroup>
            </>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              <MdClose className="me-2" />
              Annuler
            </Button>
            <Button color="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Création en cours...
                </>
              ) : (
                <>
                  <MdAddCircle className="me-2" />
                  Créer la mutation
                </>
              )}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </div>
  );
};

export default MutationsPage;

