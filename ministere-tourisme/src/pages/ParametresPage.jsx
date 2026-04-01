import React, { useState, useEffect } from 'react';
import Page from 'components/Page';
import {
    Alert,
    Button,
    Card,
    CardBody,
    Form,
    FormGroup,
    Input,
    Label,
    Spinner,
    Row,
    Col,
    ListGroup,
    ListGroupItem
} from 'reactstrap';
import { useAuth } from 'contexts/AuthContext';
import { 
    registerFingerprint, 
    isWebAuthnSupported 
} from '../services/webauthnService';
import { MdFingerprint, MdDelete, MdCheckCircle, MdError } from 'react-icons/md';

const ParametresPage = () => {
    const { token, user } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // États pour l'empreinte digitale
    const [isRegisteringFingerprint, setIsRegisteringFingerprint] = useState(false);
    const [fingerprintError, setFingerprintError] = useState(null);
    const [fingerprintSuccess, setFingerprintSuccess] = useState(null);
    const [isWebAuthnAvailable, setIsWebAuthnAvailable] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [deviceName, setDeviceName] = useState('');

    // Vérifier si WebAuthn est disponible
    useEffect(() => {
        setIsWebAuthnAvailable(isWebAuthnSupported());
        loadCredentials();
    }, []);

    // Charger les credentials enregistrés
    const loadCredentials = async () => {
        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/auth/webauthn/credentials', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCredentials(data.data || []);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des credentials:', error);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRegisterFingerprint = async () => {
        if (!user || !user.username) {
            setFingerprintError('Utilisateur non connecté');
            return;
        }

        setIsRegisteringFingerprint(true);
        setFingerprintError(null);
        setFingerprintSuccess(null);

        try {
            const deviceNameToUse = deviceName.trim() || 
                `${navigator.userAgentData?.platform || 'Appareil'} - ${new Date().toLocaleDateString()}`;
            
            const result = await registerFingerprint(user.username, deviceNameToUse);
            
            if (result.success) {
                setFingerprintSuccess('Empreinte digitale enregistrée avec succès !');
                setDeviceName('');
                loadCredentials(); // Recharger la liste
            }
        } catch (error) {
            setFingerprintError(error.message || 'Erreur lors de l\'enregistrement de l\'empreinte digitale');
        } finally {
            setIsRegisteringFingerprint(false);
        }
    };

    const handleDeleteCredential = async (credentialId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette empreinte digitale ?')) {
            return;
        }

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/auth/webauthn/credentials/${credentialId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                setFingerprintSuccess('Empreinte digitale supprimée avec succès');
                loadCredentials();
            } else {
                setFingerprintError(data.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            setFingerprintError('Erreur lors de la suppression de l\'empreinte digitale');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setErrorMessage('Veuillez remplir tous les champs.');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setErrorMessage('Les nouveaux mots de passe ne correspondent pas.');
            return;
        }

        if (formData.newPassword.length < 8) {
            setErrorMessage('Le nouveau mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (formData.newPassword === formData.currentPassword) {
            setErrorMessage('Le nouveau mot de passe doit être différent de l’ancien.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword,
                    confirmPassword: formData.confirmPassword
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Une erreur est survenue lors de la mise à jour du mot de passe.');
            }

            setSuccessMessage(data.message || 'Mot de passe mis à jour avec succès.');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Page
            title="Paramètres"
            breadcrumbs={[
                { name: 'Paramètres', active: true }
            ]}
        >
            <Row>
                {/* Section Changement de mot de passe */}
                <Col md="6">
                    <Card className="mb-4">
                        <CardBody>
                            <h6 className="mb-4">
                                <MdFingerprint className="me-2" />
                                Modifier mon mot de passe
                            </h6>
                            {errorMessage && <Alert color="danger">{errorMessage}</Alert>}
                            {successMessage && <Alert color="success">{successMessage}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <FormGroup>
                                    <Label for="currentPassword">Mot de passe actuel</Label>
                                    <Input
                                        type="password"
                                        id="currentPassword"
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        placeholder="Saisissez votre mot de passe actuel"
                                        required
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label for="newPassword">Nouveau mot de passe</Label>
                                    <Input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        placeholder="Définissez un nouveau mot de passe"
                                        required
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label for="confirmPassword">Confirmer le nouveau mot de passe</Label>
                                    <Input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirmez votre nouveau mot de passe"
                                        required
                                    />
                                </FormGroup>

                                <Button color="primary" type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Spinner size="sm" className="me-2" />
                                            Mise à jour...
                                        </>
                                    ) : (
                                        'Mettre à jour mon mot de passe'
                                    )}
                                </Button>
                            </Form>
                        </CardBody>
                    </Card>
                </Col>

                {/* Section Empreinte digitale */}
                <Col md="6">
                    <Card className="mb-4">
                        <CardBody>
                            <h6 className="mb-4">
                                <MdFingerprint className="me-2" />
                                Authentification par empreinte digitale
                            </h6>
                            
                            {!isWebAuthnAvailable && (
                                <Alert color="warning">
                                    <MdError className="me-2" />
                                    L'authentification par empreinte digitale n'est pas supportée sur cet appareil ou navigateur.
                                </Alert>
                            )}

                            {isWebAuthnAvailable && (
                                <>
                                    {fingerprintError && <Alert color="danger">{fingerprintError}</Alert>}
                                    {fingerprintSuccess && <Alert color="success">{fingerprintSuccess}</Alert>}

                                    <FormGroup>
                                        <Label for="deviceName">Nom de l'appareil (optionnel)</Label>
                                        <Input
                                            type="text"
                                            id="deviceName"
                                            value={deviceName}
                                            onChange={(e) => setDeviceName(e.target.value)}
                                            placeholder="Ex: Ordinateur portable, Smartphone..."
                                        />
                                    </FormGroup>

                                    <Button 
                                        color="primary" 
                                        onClick={handleRegisterFingerprint}
                                        disabled={isRegisteringFingerprint}
                                        className="mb-3"
                                    >
                                        {isRegisteringFingerprint ? (
                                            <>
                                                <Spinner size="sm" className="me-2" />
                                                Enregistrement...
                                            </>
                                        ) : (
                                            <>
                                                <MdFingerprint className="me-2" />
                                                Enregistrer mon empreinte digitale
                                            </>
                                        )}
                                    </Button>

                                    {credentials.length > 0 && (
                                        <div className="mt-4">
                                            <h6>Empreintes digitales enregistrées</h6>
                                            <ListGroup>
                                                {credentials.map((cred) => (
                                                    <ListGroupItem key={cred.id} className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <div className="fw-bold">{cred.device_name || 'Appareil inconnu'}</div>
                                                            <small className="text-muted">
                                                                Enregistrée le {new Date(cred.created_at).toLocaleDateString()}
                                                                {cred.last_used_at && (
                                                                    <> • Dernière utilisation: {new Date(cred.last_used_at).toLocaleDateString()}</>
                                                                )}
                                                            </small>
                                                        </div>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteCredential(cred.id)}
                                                        >
                                                            <MdDelete />
                                                        </Button>
                                                    </ListGroupItem>
                                                ))}
                                            </ListGroup>
                                        </div>
                                    )}

                                    {credentials.length === 0 && (
                                        <Alert color="info" className="mt-3">
                                            <MdCheckCircle className="me-2" />
                                            Aucune empreinte digitale enregistrée. Cliquez sur le bouton ci-dessus pour enregistrer votre empreinte digitale.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Page>
    );
};

export default ParametresPage;

