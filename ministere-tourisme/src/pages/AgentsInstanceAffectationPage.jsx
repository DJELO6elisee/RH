import React, { useState, useEffect, useRef } from 'react';
import Page from 'components/Page';
import Typography from 'components/Typography';
import {
    Card,
    CardBody,
    Button,
    Table,
    Spinner,
    Badge,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
    FormGroup,
    Label,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    ListGroup,
    ListGroupItem
} from 'reactstrap';
import { MdAdd, MdPerson, MdSearch } from 'react-icons/md';
import NotificationSystem from 'react-notification-system';

const AgentsInstanceAffectationPage = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    
    // Modal state
    const [openModal, setOpenModal] = useState(false);
    const [searchAgentText, setSearchAgentText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [motif, setMotif] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchingAgents, setSearchingAgents] = useState(false);
    
    const notificationSystem = useRef(null);

    const fetchAgentsInstance = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/instance-affectation?page=${page}&limit=10&search=${search}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setAgents(data.data);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des agents:', error);
            showSnackbar('Erreur de connexion au serveur', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgentsInstance();
    }, [page, search]);

    const handleSearchAgent = async (e) => {
        const newInputValue = e.target.value;
        setSearchAgentText(newInputValue);
        if (newInputValue.length < 3) {
            setSearchResults([]);
            return;
        }
        
        setSearchingAgents(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents?search=${newInputValue}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.data) {
                setSearchResults(data.data);
            }
        } catch (error) {
            console.error('Erreur recherche agent:', error);
        } finally {
            setSearchingAgents(false);
        }
    };

    const handleSelectAgent = (agent) => {
        setSelectedAgent(agent);
        setSearchAgentText('');
        setSearchResults([]);
    };

    const handleSubmitMiseEnInstance = async () => {
        if (!selectedAgent) return;
        
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${selectedAgent.id}/instance-affectation`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ motif })
            });
            
            const data = await response.json();
            if (data.success) {
                showSnackbar("Agent mis en instance d'affectation avec succès", 'success');
                setOpenModal(false);
                setSelectedAgent(null);
                setMotif('');
                fetchAgentsInstance();
            } else {
                showSnackbar(data.message || "Erreur lors de l'opération", 'error');
            }
        } catch (error) {
            showSnackbar('Erreur serveur', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const showSnackbar = (message, level = 'success') => {
        if (notificationSystem.current) {
            notificationSystem.current.addNotification({
                title: level === 'success' ? 'Succès' : 'Erreur',
                message: message,
                level: level,
                position: 'tc'
            });
        }
    };

    return (
        <Page
            className="AgentsInstanceAffectationPage"
            title="Instance d'affectation"
            breadcrumbs={[{ name: 'Agents en instance d\'affectation', active: true }]}
        >
            <NotificationSystem ref={notificationSystem} />
            
            <div className="d-flex justify-content-between align-items-center mb-3">
                <Typography type="h5" className="mb-0 d-flex align-items-center">
                    <MdPerson size={28} className="mr-2" />
                    Gestion des agents en instance d'affectation
                </Typography>
                <Button 
                    color="primary"
                    onClick={() => setOpenModal(true)}
                >
                    <MdAdd className="mr-1" /> Mettre un agent en instance
                </Button>
            </div>

            <Card>
                <CardBody>
                    <div className="mb-3" style={{ maxWidth: '300px' }}>
                        <InputGroup>
                            <InputGroupAddon addonType="prepend">
                                <InputGroupText>
                                    <MdSearch />
                                </InputGroupText>
                            </InputGroupAddon>
                            <Input
                                placeholder="Rechercher par nom, prénom..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </InputGroup>
                    </div>

                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner color="primary" />
                        </div>
                    ) : agents.length === 0 ? (
                        <p className="text-center text-muted p-3">
                            Aucun agent en instance d'affectation trouvé.
                        </p>
                    ) : (
                        <>
                            <Table responsive hover bordered className="bg-white">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Matricule</th>
                                        <th>Nom et Prénoms</th>
                                        <th>Ministère</th>
                                        <th>Direction</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map((agent) => (
                                        <tr key={agent.id}>
                                            <td>{agent.matricule || '-'}</td>
                                            <td>{agent.nom} {agent.prenom}</td>
                                            <td>{agent.ministere_nom || '-'}</td>
                                            <td>{agent.direction_libelle || '-'}</td>
                                            <td>
                                                <Badge color="primary" pill>
                                                    {agent.statut_emploi || 'Actif'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            
                            {totalPages > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <ul className="pagination">
                                        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(page - 1)}>Précédent</button>
                                        </li>
                                        <li className="page-item active">
                                            <span className="page-link">{page} / {totalPages}</span>
                                        </li>
                                        <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(page + 1)}>Suivant</button>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            <Modal isOpen={openModal} toggle={() => !submitting && setOpenModal(false)} size="lg">
                <ModalHeader toggle={() => !submitting && setOpenModal(false)}>
                    Mettre un agent en instance d'affectation
                </ModalHeader>
                <ModalBody>
                    <p className="text-muted">
                        Recherchez un agent et saisissez un motif pour le mettre en instance d'affectation. Il ne sera plus comptabilisé dans les statistiques générales.
                    </p>
                    
                    <FormGroup className="position-relative">
                        <Label>Rechercher un agent</Label>
                        <InputGroup>
                            <InputGroupAddon addonType="prepend">
                                <InputGroupText>
                                    {searchingAgents ? <Spinner size="sm" /> : <MdSearch />}
                                </InputGroupText>
                            </InputGroupAddon>
                            <Input
                                placeholder="Tapez au moins 3 caractères..."
                                value={searchAgentText}
                                onChange={handleSearchAgent}
                            />
                        </InputGroup>
                        {searchResults.length > 0 && (
                            <ListGroup className="position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {searchResults.map(agent => (
                                    <ListGroupItem 
                                        key={agent.id} 
                                        tag="button" 
                                        action 
                                        onClick={() => handleSelectAgent(agent)}
                                    >
                                        <strong>{agent.nom} {agent.prenom}</strong> ({agent.matricule || 'Sans matricule'})
                                    </ListGroupItem>
                                ))}
                            </ListGroup>
                        )}
                    </FormGroup>

                    {selectedAgent && (
                        <div className="p-3 bg-light rounded mb-3">
                            <h6>Agent sélectionné :</h6>
                            <p className="mb-1"><strong>{selectedAgent.nom} {selectedAgent.prenom}</strong></p>
                            <small className="text-muted">
                                Actuellement: {selectedAgent.direction_libelle || 'Aucune direction'}
                            </small>
                            <div className="mt-2">
                                <Button size="sm" color="warning" onClick={() => setSelectedAgent(null)}>
                                    Changer d'agent
                                </Button>
                            </div>
                        </div>
                    )}

                    <FormGroup>
                        <Label>Motif de la mise en instance (Optionnel)</Label>
                        <Input
                            type="textarea"
                            rows="3"
                            value={motif}
                            onChange={(e) => setMotif(e.target.value)}
                        />
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setOpenModal(false)} disabled={submitting}>
                        Annuler
                    </Button>
                    <Button color="primary" onClick={handleSubmitMiseEnInstance} disabled={!selectedAgent || submitting}>
                        {submitting ? <Spinner size="sm" /> : 'Valider'}
                    </Button>
                </ModalFooter>
            </Modal>
        </Page>
    );
};

export default AgentsInstanceAffectationPage;
