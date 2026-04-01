import React, { useState, useEffect, useCallback } from 'react';
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
  Badge
} from 'reactstrap';
import { 
  MdSearch, 
  MdDescription, 
  MdDownload, 
  MdVisibility,
  MdPerson,
  MdInfo,
  MdAdd
} from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://tourisme.2ise-groupe.com';

const NoteDeServiceViewer = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [noteDeService, setNoteDeService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [noNoteFound, setNoNoteFound] = useState(false);

  // Charger la liste des agents
  const loadAgents = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setAgents([]);
      setShowResults(false);
      return;
    }

    setLoadingAgents(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('limit', '50');
      params.append('retire', 'false');
      params.append('search', searchTerm);

      // Filtrer par ministère si l'utilisateur est DRH
      if (user && (user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh')) {
        const userMinistereId = user?.id_ministere || user?.ministere_id || user?.ministere?.id;
        if (userMinistereId) {
          params.append('id_ministere', userMinistereId);
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/agents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche des agents');
      }

      const data = await response.json();
      const agentsList = Array.isArray(data.data) ? data.data : (data.success && Array.isArray(data.data) ? data.data : []);
      
      setAgents(agentsList);
      // Toujours afficher les résultats s'il y a des agents trouvés
      if (agentsList.length > 0) {
        setShowResults(true);
      } else {
        setShowResults(false);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des agents:', err);
      setError('Erreur lors de la recherche des agents: ' + err.message);
      setAgents([]);
      setShowResults(false);
    } finally {
      setLoadingAgents(false);
    }
  }, [searchTerm, user]);

  // Recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAgents();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, loadAgents]);

  // Charger la note de service d'un agent
  const loadNoteDeService = async (agentId) => {
    setLoading(true);
    setError(null);
    setNoteDeService(null);
    setNoNoteFound(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/agent/${agentId}/note-de-service`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Pas d'erreur, juste aucune note trouvée - on peut générer
          setNoNoteFound(true);
          setError(null);
        } else {
          throw new Error('Erreur lors de la récupération de la note de service');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setNoteDeService(data.data);
        setSelectedAgent(data.data.agent);
        setNoNoteFound(false);
      } else {
        setError('Format de réponse inattendu');
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la note de service:', err);
      setError('Erreur lors de la récupération de la note de service: ' + err.message);
      setNoNoteFound(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentSelect = (agent) => {
    setSelectedAgent(agent);
    setSearchTerm(`${agent.prenom} ${agent.nom} (${agent.matricule})`);
    setShowResults(false);
    setError(null); // Réinitialiser les erreurs
    loadNoteDeService(agent.id);
  };

  const handleViewDocument = async () => {
    if (!noteDeService || !noteDeService.document) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/${noteDeService.document.id}/html`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const htmlContent = await response.text();
        const newWindow = window.open('', '_blank');
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      } else {
        setError('Erreur lors de l\'ouverture du document');
      }
    } catch (err) {
      console.error('Erreur lors de l\'ouverture du document:', err);
      setError('Erreur lors de l\'ouverture du document: ' + err.message);
    }
  };

  const handleDownloadPDF = async () => {
    if (!noteDeService || !noteDeService.document) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/${noteDeService.document.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Note_de_Service_${selectedAgent?.matricule || 'agent'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Erreur lors du téléchargement du PDF');
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement du PDF:', err);
      setError('Erreur lors du téléchargement du PDF: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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

  // Générer une note de service pour un agent
  const handleGenerateNoteDeService = async () => {
    if (!selectedAgent) return;

    setIsGenerating(true);
    setError(null);
    setGenerateSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/generer-note-de-service`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_agent: selectedAgent.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération de la note de service');
      }

      const data = await response.json();
      setGenerateSuccess(true);
      setNoNoteFound(false);
      
      // Recharger la note de service après génération
      setTimeout(() => {
        loadNoteDeService(selectedAgent.id);
      }, 1000);
    } catch (err) {
      console.error('Erreur lors de la génération de la note de service:', err);
      setError('Erreur lors de la génération de la note de service: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="mb-0 d-flex align-items-center">
            <MdDescription className="me-2" />
            Consultation des Notes de Service
          </CardTitle>
        </CardHeader>
        <CardBody>
          {/* Recherche d'agent */}
          <Row className="mb-4">
            <Col md={12}>
              <div className="position-relative">
                <Input
                  type="text"
                  placeholder="Rechercher un agent (nom, prénom ou matricule)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (agents.length > 0) {
                      setShowResults(true);
                    }
                  }}
                  onBlur={(e) => {
                    // Ne pas masquer si on clique sur un élément de la liste
                    const relatedTarget = e.relatedTarget;
                    if (!relatedTarget || !relatedTarget.closest('.agent-results-list')) {
                      // Délai pour permettre le clic sur un agent avant de masquer
                      setTimeout(() => {
                        setShowResults(false);
                      }, 200);
                    }
                  }}
                />
                {loadingAgents && (
                  <div className="position-absolute" style={{ right: '10px', top: '10px' }}>
                    <Spinner size="sm" color="primary" />
                  </div>
                )}
                
                {/* Résultats de recherche */}
                {showResults && agents.length > 0 && (
                  <div 
                    className="position-absolute w-100 bg-white border rounded shadow-lg agent-results-list"
                    style={{ 
                      zIndex: 9999, 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      marginTop: '5px',
                      top: '100%',
                      left: 0,
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {agents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => handleAgentSelect(agent)}
                        style={{
                          padding: '10px 15px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div className="d-flex align-items-center">
                          <MdPerson className="me-2" />
                          <div>
                            <strong>{agent.prenom} {agent.nom}</strong>
                            {agent.matricule && (
                              <span className="text-muted ms-2">({agent.matricule})</span>
                            )}
                            {agent.fonction_actuelle && (
                              <div className="text-muted small">{agent.fonction_actuelle}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {error && (
            <Alert color="danger" className="mb-3">
              <MdInfo className="me-2" />
              {error}
            </Alert>
          )}

          {/* Affichage de la note de service */}
          {loading && (
            <div className="text-center py-5">
              <Spinner color="primary" />
              <p className="mt-2">Chargement de la note de service...</p>
            </div>
          )}

          {!loading && noteDeService && noteDeService.document && (
            <Card className="mt-3">
              <CardHeader className="bg-light">
                <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                  <span>
                    <MdDescription className="me-2" />
                    Note de Service - {selectedAgent?.prenom} {selectedAgent?.nom}
                  </span>
                  <div>
                    <Button
                      color="info"
                      size="sm"
                      className="me-2"
                      onClick={handleViewDocument}
                    >
                      <MdVisibility className="me-1" />
                      Voir
                    </Button>
                    {noteDeService.document.pdf_available && (
                      <Button
                        color="success"
                        size="sm"
                        onClick={handleDownloadPDF}
                      >
                        <MdDownload className="me-1" />
                        Télécharger PDF
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <Row>
                  <Col md={6}>
                    <Table borderless size="sm">
                      <tbody>
                        <tr>
                          <td><strong>Matricule:</strong></td>
                          <td>{selectedAgent?.matricule || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Nom complet:</strong></td>
                          <td>{selectedAgent?.prenom} {selectedAgent?.nom}</td>
                        </tr>
                        {selectedAgent?.fonction_actuelle && (
                          <tr>
                            <td><strong>Fonction:</strong></td>
                            <td>{selectedAgent.fonction_actuelle}</td>
                          </tr>
                        )}
                        {selectedAgent?.grade_libele && (
                          <tr>
                            <td><strong>Grade:</strong></td>
                            <td>{selectedAgent.grade_libele}</td>
                          </tr>
                        )}
                        {selectedAgent?.echelon_libele && (
                          <tr>
                            <td><strong>Échelon:</strong></td>
                            <td>{selectedAgent.echelon_libele}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Col>
                  <Col md={6}>
                    <Table borderless size="sm">
                      <tbody>
                        <tr>
                          <td><strong>Numéro de document:</strong></td>
                          <td>{noteDeService.document.numero_document || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Date de génération:</strong></td>
                          <td>{formatDate(noteDeService.document.date_generation)}</td>
                        </tr>
                        <tr>
                          <td><strong>Statut:</strong></td>
                          <td>
                            <Badge color={
                              noteDeService.document.statut === 'generé' ? 'success' :
                              noteDeService.document.statut === 'transmis' ? 'info' :
                              noteDeService.document.statut === 'finalise' ? 'primary' : 'secondary'
                            }>
                              {noteDeService.document.statut}
                            </Badge>
                          </td>
                        </tr>
                        {noteDeService.service?.nom && (
                          <tr>
                            <td><strong>Service/Direction:</strong></td>
                            <td>{noteDeService.service.nom}</td>
                          </tr>
                        )}
                        {noteDeService.ministere?.nom && (
                          <tr>
                            <td><strong>Ministère:</strong></td>
                            <td>{noteDeService.ministere.nom}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          )}

          {!loading && !noteDeService && noNoteFound && selectedAgent && (
            <Alert color="info" className="mt-3">
              <div className="d-flex align-items-center justify-content-between flex-wrap">
                <div className="mb-2 mb-md-0">
                  <MdInfo className="me-2" />
                  Aucune note de service trouvée pour cet agent. Vous pouvez générer une note de service maintenant.
                </div>
                <Button
                  color="primary"
                  onClick={handleGenerateNoteDeService}
                  disabled={isGenerating}
                  className="ms-md-2"
                >
                  {isGenerating ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <MdAdd className="me-1" />
                      Générer la note de service
                    </>
                  )}
                </Button>
              </div>
            </Alert>
          )}

          {/* Message quand aucun agent n'est trouvé */}
          {!loading && !loadingAgents && searchTerm && searchTerm.length >= 2 && agents.length === 0 && !selectedAgent && (
            <Alert color="warning" className="mt-3">
              <MdInfo className="me-2" />
              Aucun agent trouvé avec "{searchTerm}". Veuillez vérifier l'orthographe ou essayer une autre recherche.
            </Alert>
          )}

          {/* Message pour inviter à sélectionner un agent */}
          {!loading && !loadingAgents && searchTerm && agents.length > 0 && !selectedAgent && (
            <Alert color="info" className="mt-3">
              <MdInfo className="me-2" />
              {agents.length} agent{agents.length > 1 ? 's' : ''} trouvé{agents.length > 1 ? 's' : ''}. Veuillez sélectionner un agent dans la liste déroulante ci-dessus pour voir ou générer sa note de service.
            </Alert>
          )}

          {generateSuccess && (
            <Alert color="success" className="mt-3">
              <MdInfo className="me-2" />
              Note de service générée avec succès ! Rechargement en cours...
            </Alert>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default NoteDeServiceViewer;

