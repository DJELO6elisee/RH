import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Row,
    Col,
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Alert,
    Spinner,
    Table
} from 'reactstrap';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'https://tourisme.2ise-groupe.com';

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

const DecisionsPage = () => {
    const { user } = useAuth();
    const [decisionType, setDecisionType] = useState(null); // 'collective' ou 'individuelle'
    const [numeroActe, setNumeroActe] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [decisions, setDecisions] = useState([]);
    const [loadingDecisions, setLoadingDecisions] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [activatingDecision, setActivatingDecision] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Fonction pour charger les décisions depuis la base de données
    const fetchDecisions = async () => {
        setLoadingDecisions(true);
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/decisions`, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setDecisions(result.data || []);
            } else {
                throw new Error(result.error || 'Erreur lors de la récupération des décisions');
            }
        } catch (err) {
            console.error('Erreur lors de la récupération des décisions:', err);
            setError(err.message || 'Erreur lors de la récupération des décisions');
        } finally {
            setLoadingDecisions(false);
        }
    };

    // Charger les décisions au montage du composant
    useEffect(() => {
        fetchDecisions();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation : au moins un des deux (numéro d'acte ou fichier) doit être fourni
        if (!numeroActe.trim() && !file) {
            setError('Veuillez saisir un numéro d\'acte ou uploader un document (ou les deux)');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('type', decisionType);
            if (numeroActe.trim()) {
                formData.append('numero_acte', numeroActe.trim());
            }
            if (file) {
                formData.append('document', file);
            }

            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/decisions`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setSuccess(`Décision ${decisionType === 'collective' ? 'collective' : 'individuelle'} enregistrée avec succès !`);
                // Réinitialiser le formulaire
                setNumeroActe('');
                setFile(null);
                // Recharger les décisions
                await fetchDecisions();
                // Réinitialiser le type de décision après 2 secondes
                setTimeout(() => {
                    setDecisionType(null);
                }, 2000);
            } else {
                throw new Error(result.error || 'Erreur lors de l\'enregistrement de la décision');
            }
        } catch (err) {
            console.error('Erreur lors de l\'enregistrement de la décision:', err);
            setError(err.message || 'Erreur lors de l\'enregistrement de la décision');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setDecisionType(null);
        setNumeroActe('');
        setFile(null);
        setError(null);
        setSuccess(null);
    };

    // Fonction pour activer/désactiver une décision
    const handleToggleActive = async (decisionId, currentStatus) => {
        setActivatingDecision(decisionId);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/decisions/${decisionId}/activate`, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setSuccess(`Décision ${!currentStatus ? 'activée' : 'désactivée'} avec succès !`);
                await fetchDecisions();
            } else {
                throw new Error(result.error || 'Erreur lors de l\'activation/désactivation');
            }
        } catch (err) {
            console.error('Erreur lors de l\'activation/désactivation:', err);
            setError(err.message || 'Erreur lors de l\'activation/désactivation de la décision');
        } finally {
            setActivatingDecision(null);
        }
    };

    // Fonction pour uploader un fichier pour une décision existante
    const handleUploadFile = async (decisionId, fileInput) => {
        if (!fileInput.files || !fileInput.files[0]) {
            setError('Veuillez sélectionner un fichier');
            return;
        }

        setUploadingFile(decisionId);
        setError(null);
        setSuccess(null);

        try {
            const formData = new FormData();
            formData.append('document', fileInput.files[0]);

            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/api/decisions/${decisionId}/upload`, {
                method: 'POST',
                headers: headers,
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setSuccess('Document uploadé avec succès !');
                await fetchDecisions();
                // Réinitialiser l'input file
                fileInput.value = '';
            } else {
                throw new Error(result.error || 'Erreur lors de l\'upload du document');
            }
        } catch (err) {
            console.error('Erreur lors de l\'upload:', err);
            setError(err.message || 'Erreur lors de l\'upload du document');
        } finally {
            setUploadingFile(null);
        }
    };

    return (
        <div className="container-fluid py-4">
            <Card>
                <CardHeader>
                    <CardTitle>
                        <i className="fa fa-gavel me-2"></i>
                        Gestion des Décisions
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

                    {!decisionType ? (
                        <Row>
                            <Col md="12" className="text-center">
                                <h4 className="mb-4">Sélectionner le type de décision</h4>
                                <Row>
                                    <Col md="6" className="mb-3">
                                        <Button
                                            color="primary"
                                            size="lg"
                                            block
                                            onClick={() => setDecisionType('collective')}
                                            style={{ minHeight: '150px' }}
                                        >
                                            <i className="fa fa-users me-2"></i>
                                            <div className="mt-2">
                                                <strong>Décision Collective</strong>
                                                <p className="mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                                                    S'applique à tous les agents simples<br />
                                                    (hors directeurs et sous-directeurs)
                                                </p>
                                            </div>
                                        </Button>
                                    </Col>
                                    <Col md="6" className="mb-3">
                                        <Button
                                            color="info"
                                            size="lg"
                                            block
                                            onClick={() => setDecisionType('individuelle')}
                                            style={{ minHeight: '150px' }}
                                        >
                                            <i className="fa fa-user me-2"></i>
                                            <div className="mt-2">
                                                <strong>Décision Individuelle</strong>
                                                <p className="mt-2 mb-0" style={{ fontSize: '0.9rem' }}>
                                                    Pour les directeurs et sous-directeurs
                                                </p>
                                            </div>
                                        </Button>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                    ) : (
                        <Form onSubmit={handleSubmit}>
                            <Row>
                                <Col md="12">
                                    <Alert color="info" className="mb-4">
                                        <i className="fa fa-info-circle me-2"></i>
                                        <strong>Décision {decisionType === 'collective' ? 'Collective' : 'Individuelle'}</strong>
                                        {decisionType === 'collective' && (
                                            <p className="mb-0 mt-2">
                                                Cette décision s'appliquera automatiquement à toutes les demandes de cessation de service 
                                                des agents simples (hors directeurs et sous-directeurs), quel que soit le motif.
                                            </p>
                                        )}
                                        {decisionType === 'individuelle' && (
                                            <p className="mb-0 mt-2">
                                                Cette décision s'appliquera aux directeurs et sous-directeurs. 
                                                Le numéro d'acte sera utilisé pour toutes leurs demandes de cessation.
                                            </p>
                                        )}
                                    </Alert>
                                </Col>
                            </Row>

                            <Row>
                                <Col md="12">
                                    <FormGroup>
                                        <Label for="numero_acte">
                                            Numéro de l'acte de décision
                                        </Label>
                                        <Input
                                            type="text"
                                            id="numero_acte"
                                            value={numeroActe}
                                            onChange={(e) => setNumeroActe(e.target.value)}
                                            placeholder="Ex: DÉCISION N° 123/2024"
                                        />
                                        <small className="form-text text-muted">
                                            Saisissez le numéro de l'acte de décision (optionnel si un document est uploadé)
                                        </small>
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md="12">
                                    <FormGroup>
                                        <Label for="document">
                                            Document de décision
                                        </Label>
                                        <Input
                                            type="file"
                                            id="document"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                            onChange={handleFileChange}
                                        />
                                        <small className="form-text text-muted">
                                            Uploader le document de décision (optionnel si un numéro d'acte est saisi)
                                        </small>
                                        {file && (
                                            <div className="mt-2">
                                                <Alert color="info" className="mb-0 py-2">
                                                    <i className="fa fa-file me-2"></i>
                                                    Fichier sélectionné : {file.name}
                                                </Alert>
                                            </div>
                                        )}
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row>
                                <Col md="12" className="text-end">
                                    <Button
                                        type="button"
                                        color="secondary"
                                        className="me-2"
                                        onClick={handleReset}
                                        disabled={uploading}
                                    >
                                        <i className="fa fa-arrow-left me-2"></i>
                                        Retour
                                    </Button>
                                    <Button
                                        type="submit"
                                        color="primary"
                                        disabled={uploading || (!numeroActe.trim() && !file)}
                                    >
                                        {uploading ? (
                                            <>
                                                <Spinner size="sm" className="me-2" />
                                                Enregistrement en cours...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fa fa-save me-2"></i>
                                                Enregistrer la décision
                                            </>
                                        )}
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    )}

                    {/* Tableau des décisions */}
                    <Row className="mt-5">
                        <Col md="12">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <i className="fa fa-list me-2"></i>
                                        Liste des Décisions
                                    </CardTitle>
                                </CardHeader>
                                <CardBody>
                                    {loadingDecisions ? (
                                        <div className="text-center py-4">
                                            <Spinner color="primary" />
                                            <p className="mt-2">Chargement des décisions...</p>
                                        </div>
                                    ) : decisions.length === 0 ? (
                                        <Alert color="info" className="mb-0">
                                            <i className="fa fa-info-circle me-2"></i>
                                            Aucune décision enregistrée pour le moment.
                                        </Alert>
                                    ) : (
                                        <div className="table-responsive">
                                            <Table striped hover>
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '60px' }}>N°</th>
                                                        <th>Type</th>
                                                        <th>Numéro d'acte</th>
                                                        <th>Date de décision</th>
                                                        <th>Document</th>
                                                        <th>Date de création</th>
                                                        <th style={{ width: '150px' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {decisions.map((decision, index) => (
                                                        <tr key={decision.id}>
                                                            <td>
                                                                <strong>{index + 1}</strong>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${decision.type === 'collective' ? 'bg-primary' : 'bg-info'}`}>
                                                                    {decision.type === 'collective' ? 'Collective' : 'Individuelle'}
                                                                </span>
                                                                {decision.is_active && (
                                                                    <span className="badge bg-success ms-2">Active</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {decision.numero_acte ? (
                                                                    <strong>{decision.numero_acte}</strong>
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {decision.date_decision ? (
                                                                    new Date(decision.date_decision).toLocaleDateString('fr-FR', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric'
                                                                    })
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {decision.chemin_document ? (
                                                                    <Button
                                                                        size="sm"
                                                                        color="primary"
                                                                        outline
                                                                        onClick={async () => {
                                                                            try {
                                                                                const token = localStorage.getItem('token');
                                                                                const headers = {};
                                                                                if (token) {
                                                                                    headers['Authorization'] = `Bearer ${token}`;
                                                                                }

                                                                                const response = await fetch(`${API_BASE_URL}/api/decisions/${decision.id}/document`, {
                                                                                    method: 'GET',
                                                                                    headers: headers
                                                                                });

                                                                                if (!response.ok) {
                                                                                    throw new Error('Erreur lors du téléchargement du document');
                                                                                }

                                                                                const blob = await response.blob();
                                                                                const url = window.URL.createObjectURL(blob);
                                                                                const a = document.createElement('a');
                                                                                a.href = url;
                                                                                a.target = '_blank';
                                                                                a.rel = 'noopener noreferrer';
                                                                                
                                                                                // Déterminer le nom du fichier depuis le Content-Disposition ou utiliser un nom par défaut
                                                                                const contentDisposition = response.headers.get('Content-Disposition');
                                                                                if (contentDisposition) {
                                                                                    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                                                                                    if (filenameMatch) {
                                                                                        a.download = filenameMatch[1];
                                                                                    }
                                                                                }
                                                                                
                                                                                document.body.appendChild(a);
                                                                                a.click();
                                                                                window.URL.revokeObjectURL(url);
                                                                                document.body.removeChild(a);
                                                                            } catch (err) {
                                                                                console.error('Erreur lors de l\'ouverture du document:', err);
                                                                                setError('Erreur lors de l\'ouverture du document');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <i className="fa fa-file me-1"></i>
                                                                        Voir le document
                                                                    </Button>
                                                                ) : (
                                                                    <div>
                                                                        <Input
                                                                            type="file"
                                                                            id={`file-${decision.id}`}
                                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                            onChange={(e) => {
                                                                                if (e.target.files && e.target.files[0]) {
                                                                                    handleUploadFile(decision.id, e.target);
                                                                                }
                                                                            }}
                                                                            disabled={uploadingFile === decision.id}
                                                                            style={{ display: 'none' }}
                                                                        />
                                                                        <Button
                                                                            size="sm"
                                                                            color="secondary"
                                                                            onClick={() => document.getElementById(`file-${decision.id}`).click()}
                                                                            disabled={uploadingFile === decision.id}
                                                                        >
                                                                            {uploadingFile === decision.id ? (
                                                                                <>
                                                                                    <Spinner size="sm" className="me-1" />
                                                                                    Upload...
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <i className="fa fa-upload me-1"></i>
                                                                                    Uploader
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {decision.created_at ? (
                                                                    new Date(decision.created_at).toLocaleDateString('fr-FR', {
                                                                        year: 'numeric',
                                                                        month: 'long',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <Button
                                                                    size="sm"
                                                                    color={decision.is_active ? 'warning' : 'success'}
                                                                    onClick={() => handleToggleActive(decision.id, decision.is_active)}
                                                                    disabled={activatingDecision === decision.id}
                                                                >
                                                                    {activatingDecision === decision.id ? (
                                                                        <>
                                                                            <Spinner size="sm" className="me-1" />
                                                                            ...
                                                                        </>
                                                                    ) : decision.is_active ? (
                                                                        <>
                                                                            <i className="fa fa-times me-1"></i>
                                                                            Désactiver
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="fa fa-check me-1"></i>
                                                                            Activer
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </div>
    );
};

export default DecisionsPage;

