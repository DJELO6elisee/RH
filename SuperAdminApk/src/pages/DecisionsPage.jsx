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
import SearchableSelect from '../components/SearchableSelect';

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
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [decisions, setDecisions] = useState([]);
    const [loadingDecisions, setLoadingDecisions] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    
    // États pour les décisions collectives
    const [selectionType, setSelectionType] = useState(''); // 'direction' ou 'sous_direction'
    const [idDirection, setIdDirection] = useState('');
    const [idSousDirection, setIdSousDirection] = useState('');
    const [directions, setDirections] = useState([]);
    const [sousDirections, setSousDirections] = useState([]);
    const [loadingDirections, setLoadingDirections] = useState(false);
    const [loadingSousDirections, setLoadingSousDirections] = useState(false);
    
    // États pour les décisions individuelles
    const [selectedDirectionForIndividuelle, setSelectedDirectionForIndividuelle] = useState('');
    const [selectedDirecteur, setSelectedDirecteur] = useState('');
    const [directeurs, setDirecteurs] = useState([]);
    const [loadingDirecteurs, setLoadingDirecteurs] = useState(false);

    // Année pour la génération du numéro de décision (année en cours ou 2 années précédentes)
    const currentYear = new Date().getFullYear();
    const allowedYears = [currentYear, currentYear - 1, currentYear - 2];
    const [selectedYear, setSelectedYear] = useState(currentYear);

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
        if (decisionType === 'collective') {
            loadDirections();
        } else if (decisionType === 'individuelle') {
            loadDirections();
        }
    }, [decisionType]);

    // Récupérer l'ID du ministère pour le filtrage
    const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : user?.id_ministere;

    // Charger les directions
    const loadDirections = async () => {
        setLoadingDirections(true);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/directions?limit=1000`;
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
                const directionsList = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);
                setDirections(directionsList);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des directions:', err);
        } finally {
            setLoadingDirections(false);
        }
    };

    // Charger les sous-directions d'une direction
    const loadSousDirections = async (directionId) => {
        if (!directionId) {
            setSousDirections([]);
            return;
        }

        setLoadingSousDirections(true);
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/sous-directions?limit=1000&direction_id=${directionId}`;
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
                setSousDirections(sousDirectionsList);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des sous-directions:', err);
        } finally {
            setLoadingSousDirections(false);
        }
    };

    // Charger les directeurs d'une direction (pour décisions individuelles)
    const loadDirecteurs = async (directionId) => {
        if (!directionId) {
            setDirecteurs([]);
            setSelectedDirecteur('');
            return;
        }

        setLoadingDirecteurs(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/directions/${directionId}/directeurs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const directeursList = data.success ? (data.data || []) : (Array.isArray(data) ? data : []);
                setDirecteurs(directeursList.map(d => ({
                    id: d.id,
                    label: d.libelle
                })));
            }
        } catch (err) {
            console.error('Erreur lors du chargement des directeurs:', err);
        } finally {
            setLoadingDirecteurs(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation pour les décisions collectives
        if (decisionType === 'collective') {
            if (!selectionType) {
                setError('Veuillez choisir si la décision s\'applique à une Direction ou une Sous-direction');
                return;
            }
            if (selectionType === 'direction' && !idDirection) {
                setError('Veuillez sélectionner une direction');
                return;
            }
            if (selectionType === 'sous_direction' && !idSousDirection) {
                setError('Veuillez sélectionner une sous-direction');
                return;
            }
        }

        // Validation pour les décisions individuelles
        if (decisionType === 'individuelle') {
            if (selectedDirectionForIndividuelle && !selectedDirecteur) {
                setError('Veuillez sélectionner un directeur');
                return;
            }
        }

        // Le document de décision n'est pas obligatoire ; le numéro peut être saisi ou généré automatiquement
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('type', decisionType);
            formData.append('year', String(selectedYear));
            if (decisionType === 'collective') {
                if (selectionType === 'direction' && idDirection) {
                    formData.append('id_direction', idDirection);
                }
                if (selectionType === 'sous_direction' && idSousDirection) {
                    formData.append('id_sous_direction', idSousDirection);
                }
            }
            if (decisionType === 'individuelle' && selectedDirecteur) {
                formData.append('id_agent', selectedDirecteur);
                if (selectedDirectionForIndividuelle) {
                    formData.append('id_direction', selectedDirectionForIndividuelle);
                }
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
                setSelectionType('');
                setIdDirection('');
                setIdSousDirection('');
                setSousDirections([]);
                setSelectedDirectionForIndividuelle('');
                setSelectedDirecteur('');
                setDirecteurs([]);
                setSelectedYear(currentYear);
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
        setSelectionType('');
        setIdDirection('');
        setIdSousDirection('');
        setSousDirections([]);
        setSelectedDirectionForIndividuelle('');
        setSelectedDirecteur('');
        setDirecteurs([]);
        setSelectedYear(currentYear);
        setError(null);
        setSuccess(null);
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
                                                Cette décision s'appliquera automatiquement à tous les agents simples d'une direction ou d'une sous-direction
                                                (hors directeurs et sous-directeurs). Un numéro de décision sera généré automatiquement pour chaque agent.
                                            </p>
                                        )}
                                        {decisionType === 'individuelle' && (
                                            <p className="mb-0 mt-2">
                                                Cette décision s'appliquera aux directeurs, DRH, sous-directeurs, directeurs généraux, directeurs centraux et autres directeurs.
                                                Vous pouvez choisir un directeur spécifique d'une direction pour générer son numéro de décision.
                                            </p>
                                        )}
                                    </Alert>
                                </Col>
                            </Row>

                            <Row>
                                <Col md="12" lg="4">
                                    <FormGroup>
                                        <Label for="decision_year">Année du numéro de décision *</Label>
                                        <Input
                                            type="select"
                                            id="decision_year"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                                        >
                                            {allowedYears.map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </Input>
                                        <small className="form-text text-muted">
                                            Année utilisée pour générer le numéro de décision.
                                        </small>
                                    </FormGroup>
                                </Col>
                            </Row>

                            {decisionType === 'collective' && (
                                <Row>
                                    <Col md="12">
                                        <FormGroup>
                                            <Label>Choisir le périmètre d'application *</Label>
                                            <Row>
                                                <Col md="6">
                                                    <Button
                                                        type="button"
                                                        color={selectionType === 'direction' ? 'primary' : 'outline-primary'}
                                                        block
                                                        onClick={() => {
                                                            setSelectionType('direction');
                                                            setIdSousDirection('');
                                                            setSousDirections([]);
                                                        }}
                                                    >
                                                        <i className="fa fa-building me-2"></i>
                                                        Direction
                                                    </Button>
                                                </Col>
                                                <Col md="6">
                                                    <Button
                                                        type="button"
                                                        color={selectionType === 'sous_direction' ? 'primary' : 'outline-primary'}
                                                        block
                                                        onClick={() => {
                                                            setSelectionType('sous_direction');
                                                            setIdDirection('');
                                                            setIdSousDirection('');
                                                            setSousDirections([]);
                                                        }}
                                                    >
                                                        <i className="fa fa-sitemap me-2"></i>
                                                        Sous-direction
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

                            {decisionType === 'collective' && selectionType === 'direction' && (
                                <Row>
                                    <Col md="12">
                                        <FormGroup>
                                            <Label for="id_direction">Direction *</Label>
                                            {loadingDirections ? (
                                                <Input type="text" disabled value="Chargement des directions..." />
                                            ) : (
                                                <SearchableSelect
                                                    id="id_direction"
                                                    value={idDirection || ''}
                                                    onChange={(value) => {
                                                        setIdDirection(value);
                                                        setIdSousDirection('');
                                                        setSousDirections([]);
                                                    }}
                                                    options={directions.map(direction => ({
                                                        id: direction.id,
                                                        label: direction.libelle
                                                    }))}
                                                    placeholder="Rechercher une direction..."
                                                    invalid={false}
                                                    disabled={false}
                                                />
                                            )}
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

                            {decisionType === 'collective' && selectionType === 'sous_direction' && (
                                <Row>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="id_direction_for_sous">Direction *</Label>
                                            {loadingDirections ? (
                                                <Input type="text" disabled value="Chargement des directions..." />
                                            ) : (
                                                <SearchableSelect
                                                    id="id_direction_for_sous"
                                                    value={idDirection || ''}
                                                    onChange={(value) => {
                                                        setIdDirection(value);
                                                        loadSousDirections(value);
                                                        setIdSousDirection('');
                                                    }}
                                                    options={directions.map(direction => ({
                                                        id: direction.id,
                                                        label: direction.libelle
                                                    }))}
                                                    placeholder="Rechercher une direction..."
                                                    invalid={false}
                                                    disabled={false}
                                                />
                                            )}
                                        </FormGroup>
                                    </Col>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="id_sous_direction">Sous-direction *</Label>
                                            {loadingSousDirections ? (
                                                <Input type="text" disabled value="Chargement des sous-directions..." />
                                            ) : (
                                                <SearchableSelect
                                                    id="id_sous_direction"
                                                    value={idSousDirection || ''}
                                                    onChange={(value) => setIdSousDirection(value)}
                                                    options={sousDirections.map(sd => ({
                                                        id: sd.id,
                                                        label: sd.libelle
                                                    }))}
                                                    placeholder={idDirection ? "Rechercher une sous-direction..." : "Sélectionnez d'abord une direction"}
                                                    invalid={false}
                                                    disabled={!idDirection}
                                                />
                                            )}
                                            {!idDirection && (
                                                <small className="text-muted d-block mt-1">
                                                    Veuillez d'abord sélectionner une direction
                                                </small>
                                            )}
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

                            {decisionType === 'individuelle' && (
                                <Row>
                                    <Col md="12">
                                        <FormGroup>
                                            <Label>Choisir un directeur spécifique (optionnel)</Label>
                                            <Row>
                                                <Col md="6">
                                                    <FormGroup>
                                                        <Label for="direction_for_individuelle">Direction</Label>
                                                        {loadingDirections ? (
                                                            <Input type="text" disabled value="Chargement des directions..." />
                                                        ) : (
                                                            <SearchableSelect
                                                                id="direction_for_individuelle"
                                                                value={selectedDirectionForIndividuelle || ''}
                                                                onChange={(value) => {
                                                                    setSelectedDirectionForIndividuelle(value);
                                                                    loadDirecteurs(value);
                                                                    setSelectedDirecteur('');
                                                                }}
                                                                options={directions.map(direction => ({
                                                                    id: direction.id,
                                                                    label: direction.libelle
                                                                }))}
                                                                placeholder="Sélectionner une direction..."
                                                                invalid={false}
                                                                disabled={false}
                                                            />
                                                        )}
                                                        <small className="form-text text-muted">
                                                            Sélectionnez une direction pour voir ses directeurs et sous-directeurs
                                                        </small>
                                                    </FormGroup>
                                                </Col>
                                                <Col md="6">
                                                    <FormGroup>
                                                        <Label for="selected_directeur">Directeur / Sous-directeur</Label>
                                                        {loadingDirecteurs ? (
                                                            <Input type="text" disabled value="Chargement des directeurs..." />
                                                        ) : (
                                                            <SearchableSelect
                                                                id="selected_directeur"
                                                                value={selectedDirecteur || ''}
                                                                onChange={(value) => setSelectedDirecteur(value)}
                                                                options={directeurs.map(d => ({
                                                                    id: d.id,
                                                                    label: d.label
                                                                }))}
                                                                placeholder={selectedDirectionForIndividuelle ? "Sélectionner un directeur..." : "Sélectionnez d'abord une direction"}
                                                                invalid={false}
                                                                disabled={!selectedDirectionForIndividuelle}
                                                            />
                                                        )}
                                                        {!selectedDirectionForIndividuelle && (
                                                            <small className="form-text text-muted">
                                                                Veuillez d'abord sélectionner une direction
                                                            </small>
                                                        )}
                                                    </FormGroup>
                                                </Col>
                                            </Row>
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

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
                                        disabled={uploading}
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

