import React, { useState } from 'react';
import { Container, Row, Col, Card, CardBody, CardHeader, Form, FormGroup, Label, Input, Button, Alert } from 'reactstrap';
import Page from 'components/Page';
import { useAuth } from '../contexts/AuthContext';

const NoteServicePage = () => {
    const { user } = useAuth();
    
    // États pour le formulaire de saisie de note
    const [noteContent, setNoteContent] = useState('');
    const [dateEvenement, setDateEvenement] = useState('');
    const [dateDebut, setDateDebut] = useState('');
    const [dateFin, setDateFin] = useState('');
    const [lieu, setLieu] = useState('');
    const [scope, setScope] = useState('ministere'); // 'service' ou 'ministere'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    
    // Déterminer si l'utilisateur est un DRH ou un agent
    const isDRH = user && ['drh', 'chef_service', 'directeur', 'ministre', 'super_admin'].includes(user.role?.toLowerCase());
    

    const handleSubmitNote = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitMessage('');
        setSubmitSuccess(false);

        try {
            // Vérifier que la note n'est pas vide
            if (!noteContent.trim()) {
                setSubmitMessage('Veuillez saisir le contenu de la note.');
                setIsSubmitting(false);
                return;
            }

            // Vérifier que l'utilisateur est connecté
            if (!user || !user.id_agent) {
                setSubmitMessage('Erreur: Vous devez être connecté pour envoyer une note.');
                setIsSubmitting(false);
                return;
            }

            // Préparer les données
            const noteData = {
                contenu: noteContent,
                date_evenement: dateEvenement || null,
                date_debut: dateDebut || null,
                date_fin: dateFin || null,
                lieu: lieu || null,
                id_agent_createur: user.id_agent,
                type: 'note_service',
                scope: scope, // 'service' ou 'ministere'
                id_service: user.id_service || null,
                id_ministere: user.id_ministere || null
            };

            // Debug: Afficher les données envoyées
            console.log('Données utilisateur:', user);
            console.log('Données de la note:', noteData);
            
            // Vérifier que l'ID ministère est présent
            if (!noteData.id_ministere) {
                setSubmitMessage('Erreur: Impossible de déterminer votre ministère. Veuillez vous reconnecter.');
                setIsSubmitting(false);
                return;
            }

            // Appel API pour envoyer la note de service
            const response = await fetch('https://tourisme.2ise-groupe.com/api/demandes/notifications/note-service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(noteData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'envoi de la note');
            }

            const result = await response.json();
            console.log('Note de service envoyée:', result);
            
            setSubmitSuccess(true);
            const scopeMessage = scope === 'service' 
                ? 'à tous les agents du service' 
                : 'à tous les agents du ministère';
            setSubmitMessage(`Note de service envoyée ${scopeMessage} avec succès !`);
            
            // Réinitialiser le formulaire
            setNoteContent('');
            setDateEvenement('');
            setDateDebut('');
            setDateFin('');
            setLieu('');

        } catch (error) {
            console.error('Erreur lors de l\'envoi de la note:', error);
            setSubmitMessage(`Erreur lors de la création de la note: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    
    return (
        <Page title="Note de Service" breadcrumbs={[{ name: 'Note de Service', active: true }]}>
            <Container fluid>
                {isDRH && (
                    <Row className="mb-4">
                        <Col>
                            <Card>
                                <CardHeader>
                                    <h5 className="mb-0">
                                        <i className="fa fa-edit me-2"></i>
                                        Saisir une Note de Service
                                    </h5>
                                </CardHeader>
                                <CardBody>
                                    {submitMessage && (
                                        <Alert color={submitSuccess ? 'success' : 'danger'}>
                                            {submitMessage}
                                        </Alert>
                                    )}
                                    
                                    <Form onSubmit={handleSubmitNote}>
                                        <FormGroup>
                                            <Label for="noteContent">
                                                Contenu de la note <span className="text-danger">*</span>
                                            </Label>
                                            <Input
                                                type="textarea"
                                                id="noteContent"
                                                name="noteContent"
                                                rows="4"
                                                value={noteContent}
                                                onChange={(e) => setNoteContent(e.target.value)}
                                                placeholder="Saisissez le contenu de votre note de service..."
                                                required
                                                style={{ resize: 'vertical', textTransform: 'uppercase' }}
                                            />
                                        </FormGroup>

                                        <Row>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label for="dateEvenement">Date de l'événement</Label>
                                                    <Input
                                                        type="date"
                                                        id="dateEvenement"
                                                        name="dateEvenement"
                                                        value={dateEvenement}
                                                        onChange={(e) => setDateEvenement(e.target.value)}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label for="lieu">Lieu</Label>
                                                    <Input
                                                        type="text"
                                                        id="lieu"
                                                        name="lieu"
                                                        value={lieu}
                                                        onChange={(e) => setLieu(e.target.value)}
                                                        placeholder="Lieu de l'événement (optionnel)"
                                                    />
                                                </FormGroup>
                                            </Col>
                                        </Row>

                                        <Row>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label for="dateDebut">Date de début</Label>
                                                    <Input
                                                        type="date"
                                                        id="dateDebut"
                                                        name="dateDebut"
                                                        value={dateDebut}
                                                        onChange={(e) => setDateDebut(e.target.value)}
                                                    />
                                                </FormGroup>
                                            </Col>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label for="dateFin">Date de fin</Label>
                                                    <Input
                                                        type="date"
                                                        id="dateFin"
                                                        name="dateFin"
                                                        value={dateFin}
                                                        onChange={(e) => setDateFin(e.target.value)}
                                                    />
                                                </FormGroup>
                                            </Col>
                                        </Row>

                                        <Row>
                                            <Col md={12}>
                                                <FormGroup>
                                                    <Label for="scope">
                                                        <i className="fa fa-users me-2"></i>
                                                        Portée d'envoi
                                                    </Label>
                                                    <Input
                                                        type="select"
                                                        id="scope"
                                                        name="scope"
                                                        value={scope}
                                                        onChange={(e) => setScope(e.target.value)}
                                                    >
                                                        <option value="service">
                                                            Service uniquement - Agents de mon service
                                                        </option>
                                                        <option value="ministere">
                                                            Ministère entier - Tous les agents du ministère
                                                        </option>
                                                    </Input>
                                                    <small className="form-text text-muted">
                                                        {scope === 'service' 
                                                            ? 'La note sera envoyée uniquement aux agents de votre service'
                                                            : 'La note sera envoyée à tous les agents du ministère'
                                                        }
                                                    </small>
                                                </FormGroup>
                                            </Col>
                                        </Row>

                                        <div className="d-flex justify-content-center">
                                            <Button 
                                                type="submit" 
                                                color="success" 
                                                disabled={isSubmitting}
                                                className="d-flex align-items-center px-4 py-2"
                                                size="lg"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <i className="fa fa-spinner fa-spin me-2"></i>
                                                        Envoi en cours...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fa fa-paper-plane me-2"></i>
                                                        Envoyer la note
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </Form>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                )}

            </Container>
            
        </Page>
    );
};

export default NoteServicePage;
