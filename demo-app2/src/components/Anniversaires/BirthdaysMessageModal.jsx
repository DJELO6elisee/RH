import React, { useState } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Alert,
    Spinner
} from 'reactstrap';
import { MdMessage, MdSend } from 'react-icons/md';

const BirthdaysMessageModal = ({ isOpen, toggle, agents, title, type = 'today' }) => {
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSend = async () => {
        if (!message || message.trim() === '') {
            setError('Veuillez saisir un message');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('token');
            const agentIds = agents.map(agent => agent.id);
            
            const response = await fetch('https://tourisme.2ise-groupe.com/api/birthdays/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    agent_ids: agentIds,
                    message: message.trim(),
                    type: type // 'today' ou 'upcoming'
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                setMessage('');
                setTimeout(() => {
                    toggle();
                    setSuccess(false);
                }, 2000);
            } else {
                setError(result.error || 'Erreur lors de l\'envoi du message');
            }
        } catch (err) {
            console.error('Erreur lors de l\'envoi du message:', err);
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setMessage('');
        setError(null);
        setSuccess(false);
        toggle();
    };

    return (
        <Modal isOpen={isOpen} toggle={handleClose} size="lg">
            <ModalHeader toggle={handleClose}>
                <MdMessage className="me-2" />
                Envoyer un message - {title}
            </ModalHeader>
            <ModalBody>
                {success && (
                    <Alert color="success">
                        Message envoyé avec succès à {agents.length} agent(s) !
                    </Alert>
                )}
                {error && (
                    <Alert color="danger">
                        {error}
                    </Alert>
                )}
                
                <div className="mb-3">
                    <p className="text-muted">
                        Le message sera envoyé à <strong>{agents.length} agent(s)</strong> concerné(s).
                    </p>
                </div>

                <Form>
                    <FormGroup>
                        <Label for="message">Message *</Label>
                        <Input
                            type="textarea"
                            name="message"
                            id="message"
                            rows="6"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Saisissez votre message de félicitations ou de rappel pour les anniversaires..."
                            required
                            disabled={loading || success}
                        />
                        <small className="text-muted">
                            Ce message sera envoyé en notification et dans la boîte de réception de chaque agent concerné.
                        </small>
                    </FormGroup>
                </Form>

                <div className="mt-3 p-3 bg-light rounded">
                    <strong>Destinataires ({agents.length}):</strong>
                    <ul className="mb-0 mt-2">
                        {agents.slice(0, 5).map(agent => (
                            <li key={agent.id}>
                                {agent.civilite} {agent.nom} {agent.prenom}
                            </li>
                        ))}
                        {agents.length > 5 && (
                            <li className="text-muted">... et {agents.length - 5} autre(s)</li>
                        )}
                    </ul>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={handleClose} disabled={loading || success}>
                    Annuler
                </Button>
                <Button color="primary" onClick={handleSend} disabled={loading || success || !message.trim()}>
                    {loading ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Envoi...
                        </>
                    ) : (
                        <>
                            <MdSend className="me-2" />
                            Envoyer
                        </>
                    )}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default BirthdaysMessageModal;

