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
  Badge
} from 'reactstrap';
import { 
  MdDescription, 
  MdDownload, 
  MdVisibility,
  MdSearch,
  MdInfo,
  MdAdd,
  MdPerson
} from 'react-icons/md';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://tourisme.2ise-groupe.com';

const NotesDeServicePage = () => {
  const { user } = useAuth();
  const [notesDeService, setNotesDeService] = useState([]);
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgentResults, setShowAgentResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  // Charger toutes les notes de service
  useEffect(() => {
    loadNotesDeService();
  }, []);

  // Rechercher des agents quand on tape dans la recherche
  useEffect(() => {
    if (searchTerm && searchTerm.length >= 2) {
      const timer = setTimeout(() => {
        searchAgents();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAgents([]);
      setShowAgentResults(false);
      // Filtrer les notes existantes
      filterNotes();
    }
  }, [searchTerm]);

  // Filtrer les notes de service selon le terme de recherche
  const filterNotes = () => {
    if (!searchTerm) {
      setFilteredNotes(notesDeService);
    } else {
      const filtered = notesDeService.filter(note => {
        const searchLower = searchTerm.toLowerCase();
        const agentName = `${note.agent.prenom} ${note.agent.nom}`.toLowerCase();
        const matricule = (note.agent.matricule || '').toLowerCase();
        const fonction = (note.agent.fonction_actuelle || '').toLowerCase();
        const service = (note.service.nom || '').toLowerCase();
        
        return agentName.includes(searchLower) ||
               matricule.includes(searchLower) ||
               fonction.includes(searchLower) ||
               service.includes(searchLower);
      });
      setFilteredNotes(filtered);
    }
  };

  const searchAgents = async () => {
    setLoadingAgents(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('limit', '50');
      params.append('retire', 'false');
      params.append('search', searchTerm);

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

      if (response.ok) {
        const data = await response.json();
        const agentsList = Array.isArray(data.data) ? data.data : (data.success && Array.isArray(data.data) ? data.data : []);
        setAgents(agentsList);
        setShowAgentResults(agentsList.length > 0);
      }
    } catch (err) {
      console.error('Erreur lors de la recherche des agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const loadNotesDeService = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/notes-de-service`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Accès refusé. Seuls les DRH peuvent accéder à cette page.');
        } else {
          throw new Error('Erreur lors de la récupération des notes de service');
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.data) {
        setNotesDeService(data.data);
        setFilteredNotes(data.data);
      } else {
        setError('Format de réponse inattendu');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des notes de service:', err);
      setError('Erreur lors de la récupération des notes de service: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/html`, {
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

  const handleDownloadPDF = async (documentId, matricule) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Note_de_Service_${matricule || 'agent'}.pdf`;
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

  const handleGenerateNoteDeService = async (agentId) => {
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
          id_agent: agentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération de la note de service');
      }

      setGenerateSuccess(true);
      setShowAgentResults(false);
      setAgents([]);
      setSearchTerm('');
      
      // Recharger les notes de service
      setTimeout(() => {
        loadNotesDeService();
      }, 1000);
    } catch (err) {
      console.error('Erreur lors de la génération de la note de service:', err);
      setError('Erreur lors de la génération de la note de service: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <Spinner color="primary" />
        <span className="ms-2">Chargement des notes de service...</span>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      <Row>
        <Col>
          <Card>
            <CardHeader style={{ background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: 'white' }}>
              <CardTitle className="mb-0 d-flex align-items-center">
                <MdDescription className="me-2" style={{ fontSize: '1.5rem' }} />
                <span style={{ fontWeight: 'bold' }}>Gestion des Notes de Service</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              {error && (
                <Alert color="danger" className="mb-3">
                  <MdInfo className="me-2" />
                  {error}
                </Alert>
              )}

              {/* Barre de recherche */}
              <Row className="mb-3">
                <Col md={6}>
                  <div className="position-relative">
                    <Input
                      type="text"
                      placeholder="Rechercher un agent (nom, prénom ou matricule)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => {
                        if (agents.length > 0) {
                          setShowAgentResults(true);
                        }
                      }}
                      onBlur={(e) => {
                        setTimeout(() => {
                          setShowAgentResults(false);
                        }, 200);
                      }}
                    />
                    {loadingAgents ? (
                      <Spinner 
                        size="sm" 
                        className="position-absolute"
                        style={{ right: '15px', top: '50%', transform: 'translateY(-50%)' }}
                      />
                    ) : (
                      <MdSearch 
                        className="position-absolute"
                        style={{ right: '15px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}
                      />
                    )}
                    
                    {/* Résultats de recherche d'agents */}
                    {showAgentResults && agents.length > 0 && (
                      <div 
                        className="position-absolute w-100 bg-white border rounded shadow-lg"
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
                        {agents.map((agent) => {
                          // Vérifier si l'agent a déjà une note de service
                          const hasNote = notesDeService.some(note => note.agent.id === agent.id);
                          
                          return (
                            <div
                              key={agent.id}
                              style={{
                                padding: '10px 15px',
                                cursor: hasNote ? 'default' : 'pointer',
                                borderBottom: '1px solid #eee',
                                backgroundColor: hasNote ? '#f8f9fa' : 'white'
                              }}
                              onMouseEnter={(e) => {
                                if (!hasNote) e.target.style.backgroundColor = '#e9ecef';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = hasNote ? '#f8f9fa' : 'white';
                              }}
                              onClick={() => {
                                if (!hasNote) {
                                  handleGenerateNoteDeService(agent.id);
                                }
                              }}
                            >
                              <div className="d-flex align-items-center justify-content-between">
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
                                {hasNote ? (
                                  <Badge color="success" className="ms-2">Note existante</Badge>
                                ) : (
                                  <Button
                                    color="primary"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateNoteDeService(agent.id);
                                    }}
                                    disabled={isGenerating}
                                  >
                                    <MdAdd className="me-1" />
                                    Générer
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Col>
                <Col md={6} className="text-end">
                  <Badge color="info" className="p-2">
                    {filteredNotes.length} note{filteredNotes.length > 1 ? 's' : ''} de service
                  </Badge>
                </Col>
              </Row>

              {generateSuccess && (
                <Alert color="success" className="mb-3">
                  <MdInfo className="me-2" />
                  Note de service générée avec succès ! Rechargement en cours...
                </Alert>
              )}

              {/* Tableau des notes de service */}
              {filteredNotes.length === 0 && !showAgentResults && !loadingAgents ? (
                <Alert color="info">
                  <MdInfo className="me-2" />
                  {searchTerm && searchTerm.length >= 2 
                    ? 'Aucune note de service trouvée. Tapez le nom d\'un agent dans la recherche ci-dessus pour générer sa note de service.' 
                    : 'Aucune note de service trouvée.'}
                </Alert>
              ) : filteredNotes.length > 0 ? (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Matricule</th>
                      <th>Nom complet</th>
                      <th>Fonction</th>
                      <th>Service/Direction</th>
                      <th>Date de génération</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNotes.map((note) => (
                      <tr key={note.document.id}>
                        <td>{note.agent.matricule || 'N/A'}</td>
                        <td>
                          <strong>{note.agent.prenom} {note.agent.nom}</strong>
                        </td>
                        <td>{note.agent.fonction_actuelle || 'N/A'}</td>
                        <td>{note.service.nom || 'N/A'}</td>
                        <td>{formatDate(note.document.date_generation)}</td>
                        <td>
                          <Badge color={
                            note.document.statut === 'generé' ? 'success' :
                            note.document.statut === 'transmis' ? 'info' :
                            note.document.statut === 'finalise' ? 'primary' : 'secondary'
                          }>
                            {note.document.statut}
                          </Badge>
                        </td>
                        <td>
                          <Button
                            color="info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleViewDocument(note.document.id)}
                          >
                            <MdVisibility className="me-1" />
                            Voir
                          </Button>
                          <Button
                            color="success"
                            size="sm"
                            onClick={() => handleDownloadPDF(note.document.id, note.agent.matricule)}
                          >
                            <MdDownload className="me-1" />
                            PDF
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                null
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NotesDeServicePage;

