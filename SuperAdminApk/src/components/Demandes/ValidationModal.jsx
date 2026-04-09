import React, { useState, useEffect } from 'react';
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

const ValidationModal = ({ isOpen, toggle, demande, onValidate, defaultAction = null }) => {
    const [action, setAction] = useState(defaultAction || '');
    const [commentaire, setCommentaire] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Mettre à jour l'action lorsque defaultAction change (quand le modal s'ouvre)
    useEffect(() => {
        if (isOpen && defaultAction) {
            setAction(defaultAction);
        } else if (!isOpen) {
            // Réinitialiser quand le modal se ferme
            setAction('');
            setCommentaire('');
            setError(null);
        }
    }, [isOpen, defaultAction]);

    const handleSubmit = async () => {
        if (!action) {
            setError('Veuillez sélectionner une action');
            return;
        }

        // Vérifier que le motif est saisi si on rejette
        if (action === 'rejete' && (!commentaire || commentaire.trim() === '')) {
            setError('Le motif du rejet est obligatoire. Veuillez saisir un motif pour rejeter la demande.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await onValidate(demande.id, action, commentaire);
            setAction('');
            setCommentaire('');
            toggle();
        } catch (err) {
            setError(err.message || 'Erreur lors de la validation');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setAction('');
        setCommentaire('');
        setError(null);
        toggle();
    };

    return (
        <Modal isOpen={isOpen} toggle={handleClose} size="lg">
            <ModalHeader toggle={handleClose}>
                <i className={`fa fa-${defaultAction === 'rejete' ? 'times-circle' : 'check-circle'} me-2`}></i>
                {defaultAction === 'rejete' ? 'Rejet de la demande' : 'Validation de la demande'}
            </ModalHeader>
            <ModalBody>
                {demande && (
                    <div className="mb-3">
                        <h6>Détails de la demande :</h6>
                        <div className="bg-light p-3 rounded">
                            <p><strong>Agent :</strong> {demande.prenom} {demande.nom} ({demande.matricule})</p>
                            <p><strong>Type :</strong> {demande.type_demande}</p>
                            <p><strong>Motif :</strong> {demande.description}</p>
                            {demande.type_demande === 'certificat_reprise_service' && (
                                <>
                                    <p><strong>Date fin de congés :</strong> {demande.date_fin_conges || 'Non renseignée'}</p>
                                    <p><strong>Date de reprise :</strong> {demande.date_reprise_service || 'Non renseignée'}</p>
                                </>
                            )}
                            <p><strong>Phase :</strong> {demande.phase || 'aller'}</p>
                            <p><strong>Niveau actuel :</strong> {demande.niveau_evolution_demande}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <Alert color="danger">
                        <i className="fa fa-exclamation-triangle me-2"></i>
                        {error}
                    </Alert>
                )}

                <Form>
                    {defaultAction ? (
                        // Si l'action est prédéfinie, afficher un message et masquer le menu déroulant
                        <FormGroup>
                            <div className={`alert ${defaultAction === 'rejete' ? 'alert-danger' : 'alert-success'} mb-3`}>
                                <i className={`fa fa-${defaultAction === 'rejete' ? 'times-circle' : 'check-circle'} me-2`}></i>
                                <strong>Action : {defaultAction === 'rejete' ? 'Rejet' : 'Approbation'}</strong>
                                <p className="mb-0 mt-2">
                                    {defaultAction === 'rejete' 
                                        ? 'Vous allez rejeter cette demande. Veuillez saisir le motif du rejet (obligatoire).' 
                                        : 'Vous allez approuver cette demande. Vous pouvez ajouter un commentaire optionnel.'}
                                </p>
                            </div>
                        </FormGroup>
                    ) : (
                        // Si aucune action prédéfinie, afficher le menu déroulant (comportement par défaut)
                        <FormGroup>
                            <Label for="action">Action *</Label>
                            <Input
                                type="select"
                                id="action"
                                value={action}
                                onChange={(e) => setAction(e.target.value)}
                            >
                                <option value="">Sélectionner une action</option>
                                <option value="approuve">Approuver</option>
                                <option value="rejete">Rejeter</option>
                            </Input>
                        </FormGroup>
                    )}

                    <FormGroup>
                        <Label for="commentaire">
                            {action === 'rejete' ? 'Motif du rejet *' : 'Commentaire'}
                        </Label>
                        <Input
                            type="textarea"
                            id="commentaire"
                            rows="4"
                            value={commentaire}
                            onChange={(e) => setCommentaire(e.target.value)}
                            placeholder={action === 'rejete' ? 'Veuillez saisir le motif du rejet (obligatoire)' : 'Ajoutez un commentaire (optionnel)'}
                            required={action === 'rejete'}
                            invalid={action === 'rejete' && !commentaire.trim()}
                        />
                        {action === 'rejete' && (
                            <small className="text-muted d-block mt-1">
                                <i className="fa fa-exclamation-circle me-1"></i>
                                Le motif du rejet est obligatoire. L'agent verra ce motif dans sa boîte de réception.
                            </small>
                        )}
                    </FormGroup>
                </Form>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={handleClose} disabled={loading}>
                    Annuler
                </Button>
                <Button 
                    color={action === 'approuve' ? 'success' : action === 'rejete' ? 'danger' : 'primary'}
                    onClick={handleSubmit}
                    disabled={loading || !action || (action === 'rejete' && !commentaire.trim())}
                >
                    {loading ? (
                        <>
                            <Spinner size="sm" className="me-2" />
                            Traitement...
                        </>
                    ) : (
                        <>
                            <i className={`fa fa-${action === 'approuve' ? 'check' : action === 'rejete' ? 'times' : 'question'} me-2`}></i>
                            {action === 'approuve' ? 'Approuver' : action === 'rejete' ? 'Rejeter' : 'Valider'}
                        </>
                    )}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ValidationModal;
