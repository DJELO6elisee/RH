import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    Button,
    Alert,
    Spinner,
    Col,
    Row,
    Card,
    CardBody
} from 'reactstrap';
import { MdPersonAdd, MdSave, MdClose, MdAddBox, MdDelete } from 'react-icons/md';
import { getApiUrl, getAuthHeaders } from '../../config/api';

const CreateBesoinAgentModal = ({ isOpen, toggle, agentId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [besoinsList, setBesoinsList] = useState([
        { poste_souhaite: '', nombre_agents: 1, description: '' }
    ]);

    // Réinitialiser le formulaire à chaque ouverture
    useEffect(() => {
        if (isOpen) {
            setBesoinsList([{ poste_souhaite: '', nombre_agents: 1, description: '' }]);
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    const handleAddBesoin = () => {
        setBesoinsList([...besoinsList, { poste_souhaite: '', nombre_agents: 1, description: '' }]);
    };

    const handleRemoveBesoin = (index) => {
        if (besoinsList.length === 1) return;
        const newList = [...besoinsList];
        newList.splice(index, 1);
        setBesoinsList(newList);
    };

    const handleChange = (index, e) => {
        const { name, value } = e.target;
        const newList = [...besoinsList];
        newList[index][name] = value;
        setBesoinsList(newList);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation basique
        for (let i = 0; i < besoinsList.length; i++) {
            const besoin = besoinsList[i];
            if (besoin.nombre_agents < 1) {
                setError(`Le nombre d'agents pour le besoin #${i + 1} doit être au moins 1.`);
                return;
            }
            if (!besoin.poste_souhaite.trim()) {
                setError(`Le poste souhaité pour le besoin #${i + 1} est obligatoire.`);
                return;
            }
        }

        try {
            setLoading(true);
            setError(null);

            // Soumettre tous les besoins en parallèle
            const promises = besoinsList.map(besoin => {
                const payload = {
                    type_demande: 'besoin_personnel',
                    description: besoin.description.trim(),
                    nombre_agents: parseInt(besoin.nombre_agents, 10),
                    poste_souhaite: besoin.poste_souhaite.trim(),
                    id_agent: agentId
                };

                return fetch(`${getApiUrl()}/api/demandes`, {
                    method: 'POST',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }).then(async (res) => {
                    const data = await res.json();
                    if (!res.ok || !data.success) {
                        throw new Error(data.message || data.error || 'Erreur lors de la création d\'un besoin.');
                    }
                    return data;
                });
            });

            await Promise.all(promises);

            // Tout a réussi
            if (onSuccess) onSuccess();
            toggle();
            
        } catch (err) {
            console.error('Erreur :', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} className="modal-dialog-centered modal-lg" style={{ backdropFilter: 'blur(5px)' }}>
            <ModalHeader toggle={toggle} className="bg-light text-primary border-bottom-0" style={{ borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}>
                <MdPersonAdd className="me-2" size={24} />
                <span className="fw-bold">Exprimer un ou plusieurs besoins en personnel</span>
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody className="p-4 bg-light">
                    {error && <Alert color="danger" className="mb-4">{error}</Alert>}
                    
                    <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                        Remplissez ce formulaire pour soumettre des demandes officielles de recrutement. Vous pouvez ajouter plusieurs postes avant de valider.
                    </p>

                    {besoinsList.map((besoin, index) => (
                        <Card key={index} className="shadow-sm border-0 mb-4" style={{ borderRadius: '10px' }}>
                            <CardBody className="position-relative p-4">
                                {besoinsList.length > 1 && (
                                    <Button 
                                        color="danger" 
                                        size="sm" 
                                        outline 
                                        onClick={() => handleRemoveBesoin(index)}
                                        className="position-absolute border-0"
                                        style={{ top: '10px', right: '10px', padding: '4px' }}
                                        title="Retirer ce besoin"
                                    >
                                        <MdClose size={20} />
                                    </Button>
                                )}
                                
                                <h6 className="text-primary mb-3 fw-bold d-flex align-items-center">
                                    <span className="badge bg-primary me-2">{index + 1}</span>
                                    Détails du besoin
                                </h6>

                                <Row>
                                    <Col md={8}>
                                        <FormGroup>
                                            <Label className="fw-bold text-muted small">Poste / Emploi souhaité <span className="text-danger">*</span></Label>
                                            <Input
                                                type="text"
                                                name="poste_souhaite"
                                                value={besoin.poste_souhaite}
                                                onChange={(e) => handleChange(index, e)}
                                                placeholder="Ex: Développeur Senior, Assistant Administratif..."
                                                required
                                                className="border-0 bg-light px-3 py-2"
                                                style={{ borderRadius: '8px' }}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={4}>
                                        <FormGroup>
                                            <Label className="fw-bold text-muted small">Nombre d'agents <span className="text-danger">*</span></Label>
                                            <Input
                                                type="number"
                                                name="nombre_agents"
                                                min="1"
                                                value={besoin.nombre_agents}
                                                onChange={(e) => handleChange(index, e)}
                                                required
                                                className="border-0 bg-light px-3 py-2"
                                                style={{ borderRadius: '8px' }}
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md={12}>
                                        <FormGroup className="mb-0">
                                            <Label className="fw-bold text-muted small">Justification (Optionnelle)</Label>
                                            <Input
                                                type="textarea"
                                                name="description"
                                                rows={2}
                                                value={besoin.description}
                                                onChange={(e) => handleChange(index, e)}
                                                placeholder="Précisez le contexte de ce besoin, les compétences attendues..."
                                                className="border-0 bg-light px-3 py-2"
                                                style={{ borderRadius: '8px', resize: 'none' }}
                                            />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    ))}

                    <div className="text-center mt-2">
                        <Button color="success" outline onClick={handleAddBesoin} className="px-4 shadow-sm" style={{ borderRadius: '20px' }}>
                            <MdAddBox className="me-2" size={18} />
                            Ajouter un autre poste
                        </Button>
                    </div>

                </ModalBody>
                <ModalFooter className="bg-white border-top-0 d-flex justify-content-between" style={{ borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
                    <Button color="light" onClick={toggle} className="text-danger px-4" style={{ borderRadius: '20px' }} disabled={loading}>
                        <MdClose className="me-1" /> Annuler
                    </Button>
                    <Button color="primary" type="submit" className="px-5 shadow-sm" style={{ borderRadius: '20px' }} disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner size="sm" className="me-2" /> Soumission en cours...
                            </>
                        ) : (
                            <>
                                <MdSave className="me-2" /> Soumettre {besoinsList.length} besoin{besoinsList.length > 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default CreateBesoinAgentModal;
