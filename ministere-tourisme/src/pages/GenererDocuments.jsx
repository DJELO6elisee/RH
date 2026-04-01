import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Row,
    Col,
    Form,
    FormGroup,
    Label,
    Input,
    Button,
    Alert,
    Spinner
} from 'reactstrap';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const API_BASE_URL = 'https://tourisme.2ise-groupe.com';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

const GenererDocuments = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [selectedMotif, setSelectedMotif] = useState('');
    const [motifAutre, setMotifAutre] = useState('');
    const [dateCessation, setDateCessation] = useState('');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Options de motif de cessation
    const motifOptions = [
        'Départ pour la retraite',
        'Mise à disposition dans un autre Ministère',
        'Mise en Indisponibilité',
        'Décès de l\'agent',
        'Fin de contrat',
        'Autre'
    ];

    // Charger la liste des agents
    useEffect(() => {
        loadAgents();
    }, []);

    // Fonction pour obtenir le motif final (soit celui sélectionné, soit celui personnalisé)
    const getFinalMotif = () => {
        if (selectedMotif === 'Autre') {
            return motifAutre.trim();
        }
        return selectedMotif;
    };

    // Fonction pour vérifier si le formulaire est valide
    const isFormValid = () => {
        // Vérifier que selectedAgent est un nombre valide (pas null, undefined, '', ou 0)
        const agentValid = selectedAgent != null && 
                          selectedAgent !== '' && 
                          !isNaN(Number(selectedAgent)) && 
                          Number(selectedAgent) > 0;
        
        // Vérifier que le motif est sélectionné
        const motifSelected = selectedMotif && selectedMotif.trim().length > 0;
        
        // Si "Autre" est sélectionné, vérifier que le champ personnalisé est rempli
        const motifAutreValid = selectedMotif !== 'Autre' || (motifAutre && motifAutre.trim().length > 0);
        
        const motifValid = motifSelected && motifAutreValid;
        
        // Vérifier que la date n'est pas vide
        const dateValid = dateCessation && typeof dateCessation === 'string' && dateCessation.trim().length > 0;
        
        return agentValid && motifValid && dateValid;
    };

    const loadAgents = async () => {
        setLoadingAgents(true);
        setError(null);

        try {
            // Ajouter un paramètre de cache-busting pour éviter les réponses 304
            const cacheBuster = `_t=${Date.now()}`;
            const url = `${API_BASE_URL}/api/agents?limit=1000&page=1&${cacheBuster}`;
            
            console.log('🔍 Chargement des agents depuis:', url);
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            console.log('📡 Réponse API - Status:', response.status, response.statusText);

            // Si la réponse est 304, réessayer avec un nouveau cache-buster
            if (response.status === 304) {
                console.log('⚠️ Réponse 304, nouvelle tentative...');
                const newCacheBuster = `_t=${Date.now()}`;
                const retryUrl = `${API_BASE_URL}/api/agents?limit=1000&page=1&${newCacheBuster}`;
                const responseRetry = await fetch(retryUrl, {
                    headers: getAuthHeaders()
                });
                
                // Vérifier que la réponse a un body avant d'appeler json()
                if (responseRetry.status === 304 || responseRetry.status === 204) {
                    throw new Error('Aucune donnée disponible (réponse 304/204)');
                }
                
                if (!responseRetry.ok) {
                    const errorText = await responseRetry.text().catch(() => '');
                    console.error('❌ Erreur HTTP lors de la retry:', responseRetry.status, errorText);
                    throw new Error(`Erreur HTTP: ${responseRetry.status} - ${errorText}`);
                }
                
                const result = await responseRetry.json();
                console.log('📦 Résultat API (retry):', result);
                
                // L'API retourne { data: [...], pagination: {...} } sans champ success
                if (result.data && Array.isArray(result.data)) {
                    const agentsList = result.data.map(agent => ({
                        id: agent.id,
                        value: agent.id,
                        label: `${agent.prenom || ''} ${agent.nom || ''} - ${agent.matricule || ''}`.trim()
                    }));
                    console.log('✅ Agents chargés:', agentsList.length);
                    setAgents(agentsList);
                } else {
                    console.error('❌ Structure de réponse invalide (retry):', result);
                    throw new Error(result.error || result.message || 'Erreur lors du chargement des agents');
                }
            } else if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.error('❌ Erreur HTTP:', response.status, errorText);
                throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
            } else {
                const result = await response.json();
                console.log('📦 Résultat API:', result);

                // L'API retourne { data: [...], pagination: {...} } sans champ success
                if (result.data && Array.isArray(result.data)) {
                    const agentsList = result.data.map(agent => ({
                        id: agent.id,
                        value: agent.id,
                        label: `${agent.prenom || ''} ${agent.nom || ''} - ${agent.matricule || ''}`.trim()
                    }));
                    console.log('✅ Agents chargés:', agentsList.length);
                    setAgents(agentsList);
                } else {
                    console.error('❌ Structure de réponse invalide:', result);
                    throw new Error(result.error || result.message || 'Erreur lors du chargement des agents');
                }
            }
        } catch (err) {
            console.error('❌ Erreur lors du chargement des agents:', err);
            setError(err.message || 'Erreur lors du chargement des agents');
        } finally {
            setLoadingAgents(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        
        if (!selectedAgent) {
            setError('Veuillez sélectionner un agent');
            return;
        }

        const finalMotif = getFinalMotif();
        if (!finalMotif) {
            setError('Veuillez sélectionner ou saisir un motif');
            return;
        }

        if (!dateCessation) {
            setError('Veuillez sélectionner une date de cessation');
            return;
        }

        setGenerating(true);
        setError(null);
        setSuccess(null);

        try {
            const url = `${API_BASE_URL}/api/documents/generer-certificat-cessation`;
            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    id_agent: selectedAgent,
                    motif: finalMotif,
                    date_cessation: dateCessation
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setSuccess('Certificat de cessation généré avec succès !');
                
                // Télécharger le PDF si disponible avec authentification
                const downloadPDF = async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            headers: getAuthHeaders()
                        });

                        if (!response.ok) {
                            throw new Error('Erreur lors du téléchargement du PDF');
                        }

                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        window.open(blobUrl, '_blank');
                        
                        // Nettoyer l'URL après un délai
                        setTimeout(() => {
                            window.URL.revokeObjectURL(blobUrl);
                        }, 100);
                    } catch (err) {
                        console.error('Erreur lors du téléchargement du PDF:', err);
                        setError('Erreur lors du téléchargement du PDF. Vous pouvez le télécharger depuis la liste des documents.');
                    }
                };

                if (result.pdf_url) {
                    await downloadPDF(result.pdf_url);
                } else if (result.document_id) {
                    // Télécharger le document depuis l'ID
                    const downloadUrl = `${API_BASE_URL}/api/documents/${result.document_id}/pdf`;
                    await downloadPDF(downloadUrl);
                }

                // Réinitialiser le formulaire
                setSelectedAgent(null);
                setSelectedMotif('');
                setMotifAutre('');
                setDateCessation('');
            } else {
                throw new Error(result.error || 'Erreur lors de la génération du certificat');
            }
        } catch (err) {
            console.error('Erreur lors de la génération du certificat:', err);
            setError(err.message || 'Erreur lors de la génération du certificat');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="container-fluid py-4">
            <Card>
                <CardHeader>
                    <CardTitle>
                        <i className="fa fa-file-pdf me-2"></i>
                        Générer un Certificat de Cessation de Service
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    {error && (
                        <Alert color="danger" className="mb-4">
                            <i className="fa fa-exclamation-circle me-2"></i>
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert color="success" className="mb-4">
                            <i className="fa fa-check-circle me-2"></i>
                            {success}
                        </Alert>
                    )}

                    <Form onSubmit={handleGenerate}>
                        <Row>
                            <Col md="12">
                                <FormGroup>
                                    <Label for="agent">
                                        Agent <span className="text-danger">*</span>
                                    </Label>
                                    {loadingAgents ? (
                                        <div className="text-center py-3">
                                            <Spinner color="primary" size="sm" />
                                            <span className="ms-2">Chargement des agents...</span>
                                        </div>
                                    ) : (
                                        <SearchableSelect
                                            id="agent"
                                            value={selectedAgent || ''}
                                            options={agents}
                                            onChange={(value) => {
                                                // S'assurer que la valeur est un nombre valide ou null
                                                const agentId = value && value !== '' ? (typeof value === 'number' ? value : Number(value)) : null;
                                                console.log('🔄 Changement d\'agent:', { value, agentId });
                                                setSelectedAgent(agentId);
                                            }}
                                            placeholder="Sélectionner un agent"
                                            isRequired
                                        />
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row>
                            <Col md="12">
                                <FormGroup>
                                    <Label for="date_cessation">
                                        Date de cessation <span className="text-danger">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        id="date_cessation"
                                        value={dateCessation}
                                        onChange={(e) => setDateCessation(e.target.value)}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row>
                            <Col md="12">
                                <FormGroup>
                                    <Label for="motif">
                                        Motif de cessation <span className="text-danger">*</span>
                                    </Label>
                                    <Input
                                        type="select"
                                        id="motif"
                                        value={selectedMotif}
                                        onChange={(e) => {
                                            setSelectedMotif(e.target.value);
                                            // Réinitialiser le champ "Autre" si on change de sélection
                                            if (e.target.value !== 'Autre') {
                                                setMotifAutre('');
                                            }
                                        }}
                                        required
                                    >
                                        <option value="">Sélectionner un motif...</option>
                                        {motifOptions.map((option, index) => (
                                            <option key={index} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>

                        {selectedMotif === 'Autre' && (
                            <Row>
                                <Col md="12">
                                    <FormGroup>
                                        <Label for="motif_autre">
                                            Précisez le motif <span className="text-danger">*</span>
                                        </Label>
                                        <Input
                                            type="textarea"
                                            id="motif_autre"
                                            rows="3"
                                            value={motifAutre}
                                            onChange={(e) => setMotifAutre(e.target.value)}
                                            placeholder="Saisir le motif de cessation de service..."
                                            required
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        )}

                        <Row>
                            <Col md="12" className="text-end">
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={generating || !isFormValid()}
                                >
                                    {generating ? (
                                        <>
                                            <Spinner size="sm" className="me-2" />
                                            Génération en cours...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa fa-file-pdf me-2"></i>
                                            Générer le certificat
                                        </>
                                    )}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </CardBody>
            </Card>
        </div>
    );
};

export default GenererDocuments;

