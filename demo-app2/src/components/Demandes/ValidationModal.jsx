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
    const [previewDocUrl, setPreviewDocUrl] = useState(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);

    useEffect(() => {
        if (previewDocUrl) {
            setIsLoadingPdf(true);
            const token = localStorage.getItem('token');
            // Construire l'URL complète si chemin relatif
            // Utiliser /api/uploads pour contourner les restrictions serveur
            let normalizedPath = previewDocUrl;
            if (!previewDocUrl.startsWith('http')) {
                // Remplacer /uploads/ par /api/uploads/ pour passer par le backend
                normalizedPath = previewDocUrl.startsWith('/uploads/')
                    ? previewDocUrl.replace('/uploads/', '/api/uploads/')
                    : previewDocUrl;
            }
            const fullUrl = normalizedPath.startsWith('http') 
                ? normalizedPath 
                : `https://tourisme.2ise-groupe.com${normalizedPath}`;
            fetch(fullUrl, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
                .then(res => {
                    if (!res.ok) throw new Error('Erreur serveur: ' + res.status);
                    const contentType = res.headers.get('content-type') || '';
                    if (contentType.includes('text/html')) {
                        throw new Error('Le serveur a renvoyé du HTML au lieu du fichier');
                    }
                    return res.blob();
                })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    setPreviewBlobUrl(url);
                    setIsLoadingPdf(false);
                })
                .catch(err => {
                    console.error("Erreur chargement PDF", err);
                    setIsLoadingPdf(false);
                    // Ouvrir dans un nouvel onglet comme fallback
                    window.open(fullUrl, '_blank');
                });
        } else {
            if (previewBlobUrl) {
                URL.revokeObjectURL(previewBlobUrl);
                setPreviewBlobUrl(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewDocUrl]);

    // Mettre à jour l'action lorsque defaultAction change (quand le modal s'ouvre)
    useEffect(() => {
        if (isOpen && defaultAction) {
            setAction(defaultAction);
        } else if (!isOpen) {
            // Réinitialiser quand le modal se ferme
            setAction('');
            setCommentaire('');
            setError(null);
            setPreviewDocUrl(null);
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
        <>
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
                            
                            {demande.documents_joints && demande.documents_joints.length > 0 && (
                                <div className="mt-3 p-2 bg-white rounded border">
                                    <p className="mb-2"><strong><i className="fa fa-paperclip me-2"></i>Documents joints :</strong></p>
                                    <ul className="mb-0 list-unstyled">
                                        {demande.documents_joints.map((doc, index) => (
                                            <li key={index} className="mb-1">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); setPreviewDocUrl(doc.chemin); }}
                                                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center"
                                                >
                                                    <i className="fa fa-file-pdf me-2"></i>
                                                    {doc.nom_original || `Document joint ${index + 1}`}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
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

        {/* Modal de prévisualisation du document */}
        <Modal isOpen={!!previewDocUrl} toggle={() => setPreviewDocUrl(null)} size="xl" style={{ maxWidth: '90vw' }}>
            <ModalHeader toggle={() => setPreviewDocUrl(null)}>
                Prévisualisation du document
            </ModalHeader>
            <ModalBody style={{ height: '80vh', padding: 0 }}>
                    {isLoadingPdf ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                    ) : (
                        previewBlobUrl && (
                            <iframe 
                                src={previewBlobUrl} 
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="Prévisualisation du document"
                            />
                        )
                    )}
            </ModalBody>
            <ModalFooter>
                <a href={previewDocUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" download>
                    <i className="fa fa-download me-2"></i>
                    Ouvrir / Télécharger
                </a>
                <Button color="secondary" onClick={() => setPreviewDocUrl(null)}>
                    Fermer
                </Button>
            </ModalFooter>
        </Modal>
        </>
    );
};

export default ValidationModal;
