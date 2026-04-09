import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardBody, CardHeader, CardTitle, Row, Col, Form, FormGroup, Label, Input, Button, Alert, Spinner, Table, Nav, NavItem, NavLink, TabContent, TabPane, InputGroup, InputGroupText } from 'reactstrap';
import { 
  MdDescription, 
  MdInfo,
  MdSearch,
  MdPrint,
  MdPictureAsPdf
} from 'react-icons/md';
import { getApiUrl, getAuthHeaders } from '../config/api';

const CertificatsPriseServicePage = () => {
  const { user } = useAuth();
  
  // États pour la gestion des certificats de prise de service
  const [agentsList, setAgentsList] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [generatingCertificat, setGeneratingCertificat] = useState(false);
  const [certificatsList, setCertificatsList] = useState([]);
  const [loadingCertificats, setLoadingCertificats] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [datePriseService, setDatePriseService] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCertificats, setTotalCertificats] = useState(0);
  const itemsPerPage = 10;

  // Vérifier que l'utilisateur est DRH ou directeur
  useEffect(() => {
    if (!user) {
      return;
    }
    
    const userRole = user.role?.toLowerCase();
    const isAuthorized = ['drh', 'directeur', 'super_admin'].includes(userRole);
    
    if (!isAuthorized) {
      console.warn('Accès non autorisé pour ce rôle:', userRole);
    }
  }, [user]);

  // Charger les agents de la direction du DRH/Directeur
  useEffect(() => {
    const loadAgents = async () => {
      if (user?.id_agent) {
        try {
          setLoadingAgents(true);
          const userRole = user?.role?.toLowerCase();
          let url = `${getApiUrl()}/api/agents`;
          
          // Construire les paramètres de requête
          const params = new URLSearchParams();
          
          // Si c'est un directeur, filtrer par sa direction
          if (userRole === 'directeur' && user?.id_direction) {
            params.append('id_direction', user.id_direction);
          } 
          // Si c'est un DRH, récupérer sa direction et filtrer par direction
          else if (userRole === 'drh') {
            // Récupérer l'id_direction du DRH depuis son agent
            try {
              const agentResponse = await fetch(`${getApiUrl()}/api/agents/${user.id_agent}`, {
                headers: getAuthHeaders()
              });
              
              if (agentResponse.ok) {
                const agentData = await agentResponse.json();
                if (agentData.success && agentData.data && agentData.data.id_direction) {
                  // Filtrer par la direction du DRH
                  params.append('id_direction', agentData.data.id_direction);
                  console.log('✅ Filtrage par direction du DRH:', agentData.data.id_direction);
                } else {
                  console.warn('⚠️ DRH sans direction associée, filtrage par ministère uniquement');
                }
              }
            } catch (agentErr) {
              console.error('Erreur lors de la récupération de l\'agent DRH:', agentErr);
            }
            
            // Paramètres pour la liste déroulante
            params.append('for_select', 'true');
            params.append('limit', '1000');
            params.append('page', '1');
          }
          // Pour super_admin, on peut charger tous les agents ou filtrer si nécessaire
          else if (userRole === 'super_admin') {
            params.append('for_select', 'true');
            params.append('limit', '1000');
            params.append('page', '1');
          }
          
          if (params.toString()) {
            url += `?${params.toString()}`;
          }
          
          console.log('🔍 Chargement des agents depuis:', url);
          
          // Ajouter un paramètre de cache-busting pour éviter les réponses 304
          const cacheBuster = `_t=${Date.now()}`;
          const separator = url.includes('?') ? '&' : '?';
          url += `${separator}${cacheBuster}`;
          
          const response = await fetch(url, {
            headers: getAuthHeaders()
          });
          
          console.log('📡 Statut de la réponse:', response.status, response.statusText);
          console.log('📡 Headers de la réponse:', Object.fromEntries(response.headers.entries()));
          
          if (response.ok || response.status === 304) {
            let result;
            try {
              // Pour 304, le body peut être vide, on doit gérer cela
              if (response.status === 304) {
                console.log('⚠️ Réponse 304 - Utilisation du cache, on force un rechargement');
                // Forcer un rechargement sans cache
                const noCacheUrl = `${getApiUrl()}/api/agents?for_select=true&limit=1000&page=1&_nocache=${Date.now()}`;
                const freshResponse = await fetch(noCacheUrl, {
                  headers: getAuthHeaders()
                });
                result = await freshResponse.json();
              } else {
                // Vérifier si la réponse a un contenu
                const contentType = response.headers.get('content-type');
                console.log('📋 Content-Type:', contentType);
                
                if (!contentType || !contentType.includes('application/json')) {
                  const text = await response.text();
                  console.error('❌ Réponse non-JSON reçue:', text.substring(0, 200));
                  setAgentsList([]);
                  return;
                }
                
                const text = await response.text();
                console.log('📋 Taille de la réponse (caractères):', text.length);
                console.log('📋 Début de la réponse:', text.substring(0, 500));
                
                if (!text || text.trim().length === 0) {
                  console.error('❌ Réponse vide reçue');
                  setAgentsList([]);
                  return;
                }
                
                result = JSON.parse(text);
              }
              
              console.log('📋 Résultat de la requête agents:', result);
              console.log('📋 Type de result:', typeof result);
              console.log('📋 Structure result.success:', result?.success);
              console.log('📋 Structure result.data:', result?.data);
              console.log('📋 Type de result.data:', typeof result?.data);
              
              if (result) {
                // Gérer différentes structures de réponse
                let agents = [];
                
                // Cas 1: result.data est directement un tableau
                if (Array.isArray(result.data)) {
                  agents = result.data;
                  console.log('✅ Structure: result.data est un tableau');
                } 
                // Cas 2: result.data.rows est un tableau
                else if (result.data && result.data.rows && Array.isArray(result.data.rows)) {
                  agents = result.data.rows;
                  console.log('✅ Structure: result.data.rows est un tableau');
                } 
                // Cas 3: result.data.data est un tableau
                else if (result.data && result.data.data && Array.isArray(result.data.data)) {
                  agents = result.data.data;
                  console.log('✅ Structure: result.data.data est un tableau');
                }
                // Cas 4: result est directement un tableau
                else if (Array.isArray(result)) {
                  agents = result;
                  console.log('✅ Structure: result est directement un tableau');
                }
                // Cas 5: result.rows existe
                else if (result.rows && Array.isArray(result.rows)) {
                  agents = result.rows;
                  console.log('✅ Structure: result.rows est un tableau');
                }
                // Cas 6: result.success est false mais il y a peut-être des données ailleurs
                else if (result.success === false) {
                  console.warn('⚠️ API retourne success=false:', result.error || result.message);
                  // Même si success=false, vérifier s'il y a des données
                  if (result.data && Array.isArray(result.data)) {
                    agents = result.data;
                    console.log('✅ Données trouvées malgré success=false');
                  }
                }
                
                console.log(`✅ ${agents.length} agents trouvés après traitement`);
                if (agents.length > 0) {
                  console.log('📋 Premier agent (exemple):', JSON.stringify(agents[0], null, 2));
                }
                
                if (agents.length > 0) {
                  setAgentsList(agents);
                  console.log('✅ Liste des agents mise à jour dans le state');
                } else {
                  console.warn('⚠️ Aucun agent dans le tableau après traitement');
                  console.warn('⚠️ Structure complète de result:', JSON.stringify(result, null, 2));
                  setAgentsList([]);
                }
              } else {
                console.error('❌ result est null ou undefined');
                setAgentsList([]);
              }
            } catch (parseError) {
              console.error('❌ Erreur lors du parsing JSON:', parseError);
              console.error('❌ Stack trace:', parseError.stack);
              setAgentsList([]);
            }
          } else {
            const errorText = await response.text().catch(() => 'Impossible de lire le texte d\'erreur');
            console.error('❌ Erreur lors du chargement des agents:', response.status, response.statusText);
            console.error('❌ Texte d\'erreur:', errorText);
            setAgentsList([]);
          }
        } catch (err) {
          console.error('❌ Erreur lors du chargement des agents:', err);
        } finally {
          setLoadingAgents(false);
        }
      }
    };
    
    loadAgents();
  }, [user]);

  // Charger les certificats de prise de service avec pagination et recherche
  useEffect(() => {
    const loadCertificats = async () => {
      if (user?.id_agent && activeTab === '2') {
        try {
          setLoadingCertificats(true);
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: itemsPerPage.toString()
          });
          if (searchTerm && searchTerm.trim()) {
            params.append('search', searchTerm.trim());
          }
          
          const response = await fetch(`${getApiUrl()}/api/documents/certificats-prise-service?${params.toString()}`, {
            headers: getAuthHeaders()
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setCertificatsList(result.data);
              if (result.pagination) {
                setTotalPages(result.pagination.totalPages);
                setTotalCertificats(result.pagination.total);
              }
            }
          }
        } catch (err) {
          console.error('Erreur lors du chargement des certificats:', err);
        } finally {
          setLoadingCertificats(false);
        }
      }
    };
    
    loadCertificats();
  }, [user, refreshKey, activeTab, currentPage, searchTerm]);

  // Fonction pour générer un certificat de prise de service
  const handleGenerateCertificat = async (e) => {
    e.preventDefault();
    
    if (!selectedAgent) {
      alert('Veuillez sélectionner un agent');
      return;
    }

    if (!datePriseService || !datePriseService.trim()) {
      alert('Veuillez renseigner la date de prise de service');
      return;
    }
    
    setGeneratingCertificat(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/documents/generer-certificat-prise-service`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_agent: parseInt(selectedAgent),
          date_prise_service: datePriseService
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Certificat de prise de service généré avec succès!');
        // Ouvrir le PDF avec authentification
        if (data.document_id) {
          try {
            const token = localStorage.getItem('token');
            const pdfResponse = await fetch(`${getApiUrl()}/api/documents/${data.document_id}/pdf`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (pdfResponse.ok) {
              const blob = await pdfResponse.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const newWindow = window.open(blobUrl, '_blank');
              
              // Nettoyer l'URL après ouverture
              if (newWindow) {
                newWindow.addEventListener('beforeunload', () => {
                  window.URL.revokeObjectURL(blobUrl);
                });
              } else {
                // Si la popup est bloquée, nettoyer après un délai
                setTimeout(() => {
                  window.URL.revokeObjectURL(blobUrl);
                }, 1000);
              }
            } else {
              console.error('Erreur lors de la récupération du PDF:', pdfResponse.status);
              alert('Erreur lors de l\'ouverture du PDF. Vous pouvez le télécharger depuis la liste ci-dessous.');
            }
          } catch (pdfError) {
            console.error('Erreur lors de l\'ouverture du PDF:', pdfError);
            alert('Erreur lors de l\'ouverture du PDF. Vous pouvez le télécharger depuis la liste ci-dessous.');
          }
        }
        // Réinitialiser le formulaire
        setSelectedAgent(null);
        setDatePriseService('');
        // Basculer vers l'onglet Liste et recharger
        setActiveTab('2');
        setSearchApplied('');
        setSearchTerm('');
        setCurrentPage(1);
      } else {
        alert(`Erreur: ${data.error || 'Erreur lors de la génération du certificat'}`);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la génération du certificat de prise de service');
    } finally {
      setGeneratingCertificat(false);
    }
  };

  // Vérifier les permissions
  const userRole = user?.role?.toLowerCase();
  const isAuthorized = ['drh', 'directeur', 'super_admin'].includes(userRole);

  if (!isAuthorized) {
    return (
      <div className="container mt-4">
        <Alert color="danger">
          <MdInfo className="me-2" />
          Accès réservé aux DRH et Directeurs
        </Alert>
      </div>
    );
  }

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchApplied(searchTerm);
    setCurrentPage(1);
  };

  const handleViewPDF = async (documentId) => {
    try {
      const pdfUrl = `${getApiUrl()}/api/documents/${documentId}/pdf`;
      const response = await fetch(pdfUrl, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Erreur: ${errorData.message || 'Impossible de charger le PDF'}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du PDF:', error);
      alert('Erreur lors du chargement du PDF');
    }
  };

  const handlePrintPDF = async (documentId) => {
    try {
      const pdfUrl = `${getApiUrl()}/api/documents/${documentId}/pdf`;
      const response = await fetch(pdfUrl, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Erreur: ${errorData.message || 'Impossible de charger le PDF'}`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du PDF:', error);
      alert('Erreur lors du chargement du PDF');
    }
  };

  return (
    <div className="container-fluid mt-4">
      <Row>
        <Col>
          <Card>
            <CardHeader style={{ background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)', color: 'white' }}>
              <CardTitle className="mb-0 d-flex align-items-center">
                <MdDescription className="me-2" style={{ fontSize: '1.5rem' }} />
                <span style={{ fontWeight: 'bold' }}>Gestion des Certificats de Prise de Service</span>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <Nav tabs className="mb-3">
                <NavItem>
                  <NavLink
                    className={activeTab === '1' ? 'active' : ''}
                    onClick={() => setActiveTab('1')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdDescription className="me-2" />
                    Générer un Certificat
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === '2' ? 'active' : ''}
                    onClick={() => setActiveTab('2')}
                    style={{ cursor: 'pointer' }}
                  >
                    <MdDescription className="me-2" />
                    Liste des Certificats
                  </NavLink>
                </NavItem>
              </Nav>

              <TabContent activeTab={activeTab}>
                <TabPane tabId="1">
                  <Row>
                    <Col md="8" className="mx-auto">
                      <Card>
                        <CardHeader>
                          <CardTitle className="mb-0">
                            <MdDescription className="me-2" />
                            Générer un Certificat de Prise de Service
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <Form onSubmit={handleGenerateCertificat}>
                            <FormGroup>
                              <Label for="agentSelect">
                                Agent <span className="text-danger">*</span>
                              </Label>
                              {loadingAgents ? (
                                <div className="text-center py-3">
                                  <Spinner color="primary" size="sm" />
                                  <span className="ms-2">Chargement des agents...</span>
                                </div>
                              ) : (
                                <Input
                                  type="select"
                                  id="agentSelect"
                                  value={selectedAgent || ''}
                                  onChange={(e) => setSelectedAgent(e.target.value)}
                                  required
                                >
                                  <option value="">Sélectionner un agent</option>
                                  {agentsList && agentsList.length > 0 ? (
                                    agentsList.map(agent => {
                                      const agentId = agent.id;
                                      const agentPrenom = agent.prenom || agent.prenom || '';
                                      const agentNom = agent.nom || agent.nom || '';
                                      const agentMatricule = agent.matricule || agent.matricule || '';
                                      
                                      if (!agentId) {
                                        console.warn('Agent sans ID:', agent);
                                        return null;
                                      }
                                      
                                      return (
                                        <option key={agentId} value={agentId}>
                                          {agentPrenom} {agentNom} - {agentMatricule}
                                        </option>
                                      );
                                    }).filter(Boolean)
                                  ) : (
                                    <option value="" disabled>Aucun agent disponible</option>
                                  )}
                                </Input>
                              )}
                            </FormGroup>
                            <FormGroup>
                              <Label for="datePriseService">
                                Date de prise de service <span className="text-danger">*</span>
                              </Label>
                              <Input
                                type="date"
                                id="datePriseService"
                                value={datePriseService}
                                onChange={(e) => setDatePriseService(e.target.value)}
                                required
                              />
                              <small className="text-muted">Date de prise de service dans la direction de l'agent</small>
                            </FormGroup>
                            <Button 
                              type="submit" 
                              color="primary" 
                              disabled={generatingCertificat || loadingAgents}
                              className="w-100"
                            >
                              {generatingCertificat ? (
                                <>
                                  <Spinner size="sm" className="me-2" />
                                  Génération en cours...
                                </>
                              ) : (
                                <>
                                  <MdDescription className="me-2" />
                                  Générer le certificat
                                </>
                              )}
                            </Button>
                          </Form>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tabId="2">
                  <Card>
                    <CardHeader>
                      <Row className="align-items-center">
                        <Col md="6">
                          <CardTitle className="mb-0">
                            <MdDescription className="me-2" />
                            Liste des Certificats de Prise de Service
                          </CardTitle>
                        </Col>
                        <Col md="6">
                          <Form onSubmit={handleSearch}>
                            <InputGroup>
                              <InputGroupText>
                                <MdSearch />
                              </InputGroupText>
                              <Input
                                type="text"
                                placeholder="Rechercher par nom, prénom ou matricule..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSearch(e);
                                  }
                                }}
                              />
                              <Button color="primary" type="submit">
                                Rechercher
                              </Button>
                              {searchTerm && (
                                <Button 
                                  color="secondary" 
                                  onClick={() => {
                                    setSearchTerm('');
                                    setCurrentPage(1);
                                    setRefreshKey(prev => prev + 1);
                                  }}
                                >
                                  Effacer
                                </Button>
                              )}
                            </InputGroup>
                          </Form>
                        </Col>
                      </Row>
                    </CardHeader>
                    <CardBody>
                      {loadingCertificats ? (
                        <div className="text-center py-5">
                          <Spinner color="primary" size="sm" />
                          <span className="ms-2">Chargement...</span>
                        </div>
                      ) : certificatsList.length === 0 ? (
                        <Alert color="info">
                          <MdInfo className="me-2" />
                          {searchApplied 
                            ? `Aucun certificat trouvé pour "${searchApplied}"`
                            : 'Aucun certificat de prise de service généré pour le moment.'}
                        </Alert>
                      ) : (
                        <>
                          <div className="mb-3">
                            <small className="text-muted">
                              {totalCertificats > 0 
                                ? `Affichage de ${(currentPage - 1) * itemsPerPage + 1} à ${Math.min(currentPage * itemsPerPage, totalCertificats)} sur ${totalCertificats} certificat(s)`
                                : 'Aucun certificat'}
                            </small>
                          </div>
                          <div className="table-responsive">
                            <Table hover striped>
                              <thead>
                                <tr>
                                  <th>Agent</th>
                                  <th>Matricule</th>
                                  <th>Date de génération</th>
                                  <th>Numéro de document</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {certificatsList.map(certificat => (
                                  <tr key={certificat.id}>
                                    <td>
                                      <strong>
                                        {certificat.agent?.prenom || ''} {certificat.agent?.nom || ''}
                                      </strong>
                                    </td>
                                    <td>{certificat.agent?.matricule || 'N/A'}</td>
                                    <td>
                                      {certificat.date_generation 
                                        ? new Date(certificat.date_generation).toLocaleDateString('fr-FR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'N/A'}
                                    </td>
                                    <td>
                                      <small className="text-muted">
                                        {certificat.numero_document || 'N/A'}
                                      </small>
                                    </td>
                                    <td>
                                      <Button
                                        color="primary"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => handleViewPDF(certificat.id)}
                                      >
                                        <MdPictureAsPdf className="me-1" />
                                        Voir
                                      </Button>
                                      <Button
                                        color="success"
                                        size="sm"
                                        onClick={() => handlePrintPDF(certificat.id)}
                                      >
                                        <MdPrint className="me-1" />
                                        Imprimer
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </div>
                          {totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                              <div>
                                <span className="me-3">
                                  Page {currentPage} sur {totalPages}
                                </span>
                              </div>
                              <nav>
                                <ul className="pagination pagination-sm mb-0">
                                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                      className="page-link"
                                      disabled={currentPage === 1}
                                      onClick={() => {
                                        setCurrentPage(prev => Math.max(1, prev - 1));
                                      }}
                                    >
                                      Précédent
                                    </button>
                                  </li>
                                  
                                  {/* Affichage de toutes les pages */}
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                      <button
                                        className="page-link"
                                        onClick={() => setCurrentPage(page)}
                                      >
                                        {page}
                                      </button>
                                    </li>
                                  ))}
                                  
                                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button
                                      className="page-link"
                                      disabled={currentPage === totalPages}
                                      onClick={() => {
                                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
                                      }}
                                    >
                                      Suivant
                                    </button>
                                  </li>
                                </ul>
                              </nav>
                            </div>
                          )}
                        </>
                      )}
                    </CardBody>
                  </Card>
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CertificatsPriseServicePage;
