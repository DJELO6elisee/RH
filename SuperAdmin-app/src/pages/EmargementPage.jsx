import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    Form,
    FormGroup,
    Label,
    Row,
    Spinner,
    Table
} from 'reactstrap';
import { useAuth } from '../contexts/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const sanitizeBaseUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return null;
    }
    return url.trim().replace(/\/+$/, '');
};

const API_BASE_URL =
    sanitizeBaseUrl(process.env.REACT_APP_API_URL) ||
    sanitizeBaseUrl(process.env.REACT_APP_API_BASE_URL) ||
    'https://tourisme.2ise-groupe.com';

const API_ROOT = (() => {
    if (!API_BASE_URL) {
        return '';
    }

    const trimmed = API_BASE_URL.replace(/\/+$/, '');
    if (trimmed.toLowerCase().endsWith('/api')) {
        return trimmed.slice(0, -4);
    }

    return trimmed;
})();

const buildSignaturePreviewUrl = (signature) => {
    if (!signature) {
        return null;
    }

    const baseUrl = API_ROOT || (typeof window !== 'undefined' ? window.location.origin : '');
    const src =
        signature.public_url ||
        signature.signature_public_url ||
        signature.url ||
        signature.signature_url;

    if (!src) {
        return null;
    }

    try {
        const url = new URL(src, baseUrl || undefined);
        const versionSource = signature.updated_at || signature.created_at;
        if (versionSource) {
            url.searchParams.set('v', new Date(versionSource).getTime());
        }
        return url.toString();
    } catch (error) {
        console.error('Impossible de construire l’URL de signature:', error);
        return src;
    }
};

const EmargementPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [signatures, setSignatures] = useState([]);
    const [signaturePreviewSources, setSignaturePreviewSources] = useState({});
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const authToken = useMemo(() => localStorage.getItem('token'), []);

    const fetchAgents = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emargement/agents`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { Authorization: `Bearer ${authToken}` })
                }
            });

            if (!response.ok) {
                throw new Error('Impossible de récupérer la liste des agents.');
            }

            const result = await response.json();
            if (result.success) {
                setAgents(result.data || []);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des agents:', err);
            setError(err.message || 'Erreur lors du chargement des agents.');
        }
    };

    const fetchSignatures = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emargement`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { Authorization: `Bearer ${authToken}` })
                }
            });

            if (!response.ok) {
                throw new Error('Impossible de récupérer les signatures.');
            }

            const result = await response.json();
            if (result.success) {
                setSignatures(result.data || []);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des signatures:', err);
            setError(err.message || 'Erreur lors du chargement des signatures.');
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);
        await Promise.all([fetchAgents(), fetchSignatures()]);
        setLoading(false);
    };

    const agentOptions = useMemo(() => {
        return agents.map((agentOption) => ({
            id: agentOption.id,
            label: [
                agentOption.prenom,
                agentOption.nom,
                agentOption.matricule ? `(${agentOption.matricule})` : null
            ]
                .filter(Boolean)
                .join(' ')
                .trim()
        }));
    }, [agents]);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const loadPreviews = async () => {
            const rows = signatures.flatMap((agent) => agent.signatures || []);
            if (rows.length === 0) {
                setSignaturePreviewSources((prev) => {
                    Object.values(prev).forEach((url) => URL.revokeObjectURL(url));
                    return {};
                });
                return;
            }

            const previews = await Promise.all(
                rows.map(async (signature) => {
                    const src = buildSignaturePreviewUrl(signature);
                    if (!src) {
                        return { id: signature.id, url: null };
                    }

                    try {
                        const response = await fetch(src, {
                            method: 'GET',
                            mode: 'cors',
                            credentials: 'omit',
                            signal: controller.signal
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}`);
                        }

                        const blob = await response.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        return { id: signature.id, url: objectUrl };
                    } catch (fetchError) {
                        console.error(`Erreur lors du chargement de la signature ${signature.id}:`, fetchError);
                        return { id: signature.id, url: null };
                    }
                })
            );

            setSignaturePreviewSources((prev) => {
                Object.entries(prev).forEach(([id, url]) => {
                    const keep = previews.find((preview) => String(preview.id) === String(id));
                    if (!keep && url) {
                        URL.revokeObjectURL(url);
                    }
                });

                return previews.reduce((acc, preview) => {
                    const key = String(preview.id);
                    const previousUrl = prev[key];
                    if (previousUrl && previousUrl !== preview.url) {
                        URL.revokeObjectURL(previousUrl);
                    }
                    if (!preview.url) {
                        return acc;
                    }
                    acc[key] = preview.url;
                    return acc;
                }, {});
            });
        };

        loadPreviews();

        return () => {
            controller.abort();
            setSignaturePreviewSources((prev) => {
                Object.values(prev).forEach((url) => {
                    if (url) {
                        URL.revokeObjectURL(url);
                    }
                });
                return {};
            });
        };
    }, [signatures]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        setSelectedFile(file || null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedAgentId) {
            setError('Veuillez sélectionner un agent.');
            return;
        }
        if (!selectedFile) {
            setError('Veuillez sélectionner un fichier de signature.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccessMessage('');

        try {
            const formData = new FormData();
            formData.append('agentId', selectedAgentId);
            formData.append('signature', selectedFile);

            const response = await fetch(`${API_BASE_URL}/api/emargement`, {
                method: 'POST',
                headers: {
                    ...(authToken && { Authorization: `Bearer ${authToken}` })
                },
                body: formData
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Échec de l’enregistrement de la signature.');
            }

            setSuccessMessage('Signature enregistrée avec succès.');
            setSelectedAgentId('');
            setSelectedFile(null);
            await fetchSignatures();
        } catch (err) {
            console.error('Erreur lors de l’enregistrement de la signature:', err);
            setError(err.message || 'Erreur lors de l’enregistrement de la signature.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleActivate = async (signatureId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emargement/${signatureId}/activate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { Authorization: `Bearer ${authToken}` })
                }
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Impossible d'activer la signature sélectionnée.");
            }

            setSuccessMessage('Signature activée avec succès.');
            await fetchSignatures();
        } catch (err) {
            console.error("Erreur lors de l'activation de la signature:", err);
            setError(err.message || "Erreur lors de l'activation de la signature.");
        }
    };

    const handleDeactivate = async (signatureId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/emargement/${signatureId}/deactivate`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { Authorization: `Bearer ${authToken}` })
                }
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Impossible de désactiver la signature sélectionnée.");
            }

            setSuccessMessage('Signature désactivée avec succès.');
            await fetchSignatures();
        } catch (err) {
            console.error('Erreur lors de la désactivation de la signature:', err);
            setError(err.message || 'Erreur lors de la désactivation de la signature.');
        }
    };

    const handleDelete = async (signatureId) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cette signature ?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/emargement/${signatureId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken && { Authorization: `Bearer ${authToken}` })
                }
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Impossible de supprimer la signature.');
            }

            setSuccessMessage('Signature supprimée avec succès.');
            await fetchSignatures();
        } catch (err) {
            console.error('Erreur lors de la suppression de la signature:', err);
            setError(err.message || 'Erreur lors de la suppression de la signature.');
        }
    };

    const signatureRows = useMemo(() => {
        return signatures.flatMap((agent) => {
            if (!agent.signatures || agent.signatures.length === 0) {
                return [];
            }

            return agent.signatures.map((signature) => ({
                agentId: agent.id,
                agentName: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
                matricule: agent.matricule,
                fonction: agent.fonction_libele || agent.role || '',
                previewUrl: buildSignaturePreviewUrl(signature),
                previewId: signature.id,
                ...signature
            }));
        });
    }, [signatures]);

    const canManageSignatures = useMemo(() => {
        if (!user || !user.role) {
            return false;
        }
        const role = (user.role || '').toLowerCase();
        return ['drh', 'super_admin', 'chef_service', 'directeur', 'dir_cabinet', 'chef_cabinet'].includes(role);
    }, [user]);

    return (
        <div className="emargement-page">
            <Row>
                <Col>
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle tag="h5" className="mb-0">
                                Gestion des signatures (Émargement)
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            <p className="text-muted mb-0">
                                Enregistrez et activez les signatures des agents pour les documents validés par la DRH.
                                Une seule signature peut être active par agent.
                            </p>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {!canManageSignatures && (
                <Row className="mb-4">
                    <Col>
                        <Alert color="warning">
                            Vous n&apos;avez pas les permissions nécessaires pour gérer les signatures.
                        </Alert>
                    </Col>
                </Row>
            )}

            {error && (
                <Row className="mb-3">
                    <Col>
                        <Alert color="danger" toggle={() => setError(null)}>
                            {error}
                        </Alert>
                    </Col>
                </Row>
            )}

            {successMessage && (
                <Row className="mb-3">
                    <Col>
                        <Alert color="success" toggle={() => setSuccessMessage('')}>
                            {successMessage}
                        </Alert>
                    </Col>
                </Row>
            )}

            <Row>
                <Col>
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle tag="h6" className="mb-0">
                                Ajouter une signature
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            <Form onSubmit={handleSubmit}>
                                <Row>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label for="agentSelect">Agent</Label>
                                            <SearchableSelect
                                                id="agentSelect"
                                                value={selectedAgentId}
                                                onChange={(value) => setSelectedAgentId(String(value))}
                                                options={agentOptions}
                                                placeholder="Rechercher par nom ou matricule..."
                                                disabled={!canManageSignatures || submitting}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md="4">
                                        <FormGroup>
                                            <Label for="signatureFile">Fichier de signature</Label>
                                            <input
                                                id="signatureFile"
                                                type="file"
                                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                                onChange={handleFileChange}
                                                disabled={!canManageSignatures || submitting}
                                                className="form-control"
                                            />
                                            <small className="text-muted d-block mt-1">
                                                Formats acceptés : PNG, JPG, WEBP. Taille maximale 10 Mo.
                                            </small>
                                        </FormGroup>
                                    </Col>
                                    <Col md="4" className="d-flex align-items-end">
                                        <Button
                                            color="primary"
                                            type="submit"
                                            disabled={!canManageSignatures || submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Enregistrement...
                                                </>
                                            ) : (
                                                'Enregistrer'
                                            )}
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <CardTitle tag="h6" className="mb-0">
                                Signatures enregistrées
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                </div>
                            ) : signatureRows.length === 0 ? (
                                <Alert color="info" className="mb-0">
                                    Aucune signature enregistrée pour le moment.
                                </Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover responsive>
                                        <thead>
                                            <tr>
                                                <th>Agent</th>
                                                <th>Signature</th>
                                                <th>Fichier</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {signatureRows.map((row) => (
                                                <tr key={`${row.agentId}-${row.id}`}>
                                                    <td>
                                                        <div className="fw-bold">{row.agentName || 'Agent'}</div>
                                                        <div className="text-muted">
                                                            Matricule : {row.matricule || 'N/A'}
                                                        </div>
                                                        {row.fonction && (
                                                            <div className="text-muted">{row.fonction}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ minWidth: '160px' }}>
                                                        {row.previewUrl ? (
                                                            <img
                                                                src={signaturePreviewSources[row.previewId] || row.previewUrl}
                                                                alt={`Signature de ${row.agentName}`}
                                                                style={{
                                                                    maxHeight: '80px',
                                                                    width: 'auto',
                                                                    objectFit: 'contain',
                                                                    border: '1px solid #dee2e6',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: '#fff'
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-muted">Non disponible</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div>{row.name || '—'}</div>
                                                        {row.size ? (
                                                            <small className="text-muted">
                                                                {(row.size / 1024).toFixed(1)} Ko
                                                            </small>
                                                        ) : null}
                                                        <div className="text-muted">
                                                            Ajoutée le{' '}
                                                            {row.created_at
                                                                ? new Date(row.created_at).toLocaleString('fr-FR')
                                                                : '—'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge color={row.is_active ? 'success' : 'secondary'}>
                                                            {row.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-2">
                                                            {row.is_active ? (
                                                                <Button
                                                                    color="warning"
                                                                    size="sm"
                                                                    disabled={!canManageSignatures}
                                                                    onClick={() => handleDeactivate(row.id)}
                                                                >
                                                                    Désactiver
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    color="primary"
                                                                    size="sm"
                                                                    disabled={!canManageSignatures}
                                                                    onClick={() => handleActivate(row.id)}
                                                                >
                                                                    Activer
                                                                </Button>
                                                            )}
                                                            <Button
                                                                color="danger"
                                                                size="sm"
                                                                outline
                                                                disabled={!canManageSignatures}
                                                                onClick={() => handleDelete(row.id)}
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </div>
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
        </div>
    );
};

export default EmargementPage;

