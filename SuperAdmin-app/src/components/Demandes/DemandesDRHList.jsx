import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    Table,
    Badge,
    Button,
    Row,
    Col,
    Input,
    Label,
    Alert,
    Spinner,
    Pagination,
    PaginationItem,
    PaginationLink,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'reactstrap';
import { useAuth } from '../../contexts/AuthContext';

const DemandesDRHList = ({ onDemandeClick, typeDemande = '' }) => {
    const { user } = useAuth();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        niveau_actuel: '',
        priorite: '',
        statut: 'en_attente', // Par défaut, afficher les autorisations en attente
        page: 1,
        limit: 10,
        agent_search: '',
        service_id: '',
        type_demande: typeDemande || '' // Ajout du filtre par type de demande
    });
    const [pagination, setPagination] = useState({});
    const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
    const [agents, setAgents] = useState([]);
    const [services, setServices] = useState([]);
    
    // Référence pour vérifier si le composant est monté
    const isMountedRef = useRef(true);
    const isTypeLocked = !!typeDemande;

    useEffect(() => {
        console.log('🔍 DemandesDRHList - useEffect déclenché');
        console.log('🔍 DemandesDRHList - User changé:', user);
        console.log('🔍 DemandesDRHList - User ID Agent:', user?.id_agent);
        console.log('🔍 DemandesDRHList - User Role:', user?.role);
        console.log('🔍 DemandesDRHList - Filtres actuels:', filters);
        
        // Ne charger les autorisations que si l'utilisateur est défini et le composant est monté
        if (user?.id && isMountedRef.current) {
            console.log('🔍 Utilisateur défini, chargement des autorisations...');
            loadDemandes();
        } else {
            console.log('🔍 Utilisateur non défini ou composant démonté, attente...');
        }
    }, [user?.id, filters, filters.type_demande]);

    // Synchroniser le prop typeDemande avec le filtre interne lorsqu'il change
    useEffect(() => {
        if (typeof typeDemande === 'string') {
            setFilters(prev => ({ ...prev, type_demande: typeDemande || '' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [typeDemande]);

    useEffect(() => {
        if (user?.id_agent && isMountedRef.current) {
            loadAgents();
            loadServices();
        }
    }, [user?.id_agent]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadDemandes = async () => {
        // Vérifier si le composant est encore monté avant de commencer
        if (!isMountedRef.current) {
            console.log('🔍 Composant démonté, annulation du chargement des autorisations');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            
            console.log('🔍 loadDemandes appelé avec filtres:', filters);
            
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    // Eviter d'ajouter deux fois type_demande
                    if (key === 'type_demande') {
                        queryParams.set('type_demande', filters[key]);
                    } else {
                        queryParams.append(key, filters[key]);
                    }
                    console.log(`🔍 Paramètre ajouté: ${key} = ${filters[key]}`);
                }
            });

            // IMPORTANT : Cet endpoint récupère UNIQUEMENT les demandes créées par D'AUTRES agents
            // qui nécessitent validation par le validateur connecté (sous-directeur, directeur, DRH, etc.)
            // Les demandes créées par l'agent validateur lui-même sont gérées par DemandesList
            // Ces deux listes ne doivent JAMAIS afficher les mêmes demandes
            const isValidator = !!(user?.role);
            let endpoint;
            
            if (filters.statut === 'en_attente') {
                endpoint = isValidator
                    ? `https://tourisme.2ise-groupe.com/api/demandes/en-attente/${user?.id_agent}?${queryParams}`
                    : `https://tourisme.2ise-groupe.com/api/working/demandes-working?${queryParams}`;
            } else if (filters.statut === 'historique') {
                // Pour l'historique, ajouter le paramètre statut=historique
                queryParams.set('statut', 'historique');
                endpoint = isValidator
                    ? `https://tourisme.2ise-groupe.com/api/demandes/historique/${user?.id_agent}?${queryParams}`
                    : `https://tourisme.2ise-groupe.com/api/working/demandes-working?${queryParams}`;
            } else {
                // Pour les autres statuts, utiliser l'endpoint par défaut
                endpoint = `https://tourisme.2ise-groupe.com/api/demandes/historique/${user?.id_agent}?${queryParams}`;
            }
            
            console.log('🔍 Endpoint final:', endpoint);
            console.log('🔍 Query params:', queryParams.toString());
            console.log('🔍 User ID:', user?.id_agent);
            
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('🔍 Réponse API autorisations en attente:', data);
            console.log('🔍 Nombre d\'autorisations reçues:', data.data?.length || 0);
            console.log('🔍 Données des autorisations (brutes):', data.data);

            // Normaliser la forme des données pour inclure toujours un objet agent
            let normalizedItems = (data.data || []).map((d) => {
                if (!d) return d;
                if (!d.agent && (d.prenom || d.nom || d.matricule || d.email)) {
                    const agentObj = {
                        id: d.id_agent,
                        prenom: d.prenom || d.agent_prenom || '',
                        nom: d.nom || d.agent_nom || '',
                        matricule: d.matricule || d.agent_matricule || '',
                        email: d.email || d.agent_email || ''
                    };
                    return { ...d, agent: agentObj };
                }
                return d;
            });

            // FILTRE CRITIQUE : Exclure les demandes créées par le validateur lui-même
            // Ces demandes doivent apparaître uniquement dans "Mes Demandes" (DemandesList)
            // et JAMAIS dans "Demandes de ma sous direction" (DemandesDRHList)
            normalizedItems = normalizedItems.filter(d => {
                const demandeAgentId = d.id_agent || d.agent?.id || d.agent_id;
                const validateurAgentId = user?.id_agent;
                
                // Exclure si la demande appartient au validateur lui-même
                if (demandeAgentId && validateurAgentId && demandeAgentId === validateurAgentId) {
                    console.log('🔍 Filtre : Demande exclue car créée par le validateur lui-même', {
                        demande_id: d.id,
                        agent_id: demandeAgentId,
                        validateur_id: validateurAgentId
                    });
                    return false;
                }
                return true;
            });

            // Filtre de sécurité côté client: n'afficher que le type sélectionné
            let filteredItems = normalizedItems || [];
            if (filters.type_demande && filters.type_demande !== '') {
                filteredItems = filteredItems.filter(d =>
                    (d.type_demande || '').toLowerCase() === filters.type_demande.toLowerCase()
                );
            }
            
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setDemandes(filteredItems);
                setPagination(data.pagination || {});
                console.log('🔍 setDemandes appelé avec:', filteredItems);
            } else {
                console.log('🔍 Composant démonté, mise à jour de l\'état annulée');
            }

        } catch (err) {
            console.error('Erreur lors du chargement des autorisations:', err);
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setError(err.message);
            }
        } finally {
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const loadAgents = async () => {
        if (!isMountedRef.current) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/demandes/agents/${user?.id_agent}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok && isMountedRef.current) {
                const data = await response.json();
                setAgents(data.data || []);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des agents:', err);
        }
    };

    const loadServices = async () => {
        if (!isMountedRef.current) return;
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/demandes/services/${user?.id_agent}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok && isMountedRef.current) {
                const data = await response.json();
                setServices(data.data || []);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des services:', err);
        }
    };

    const handleFilterChange = (key, value) => {
        console.log(`🔍 Filtre changé: ${key} = ${value}`);
        
        // Convertir en majuscules pour les champs de recherche textuels
        let processedValue = value;
        if (typeof value === 'string' && key === 'agent_search') {
            processedValue = value.toUpperCase();
        }
        
        setFilters(prev => {
            const newFilters = {
                ...prev,
                [key]: processedValue,
                page: 1
            };
            console.log('🔍 Nouveaux filtres:', newFilters);
            return newFilters;
        });
    };

    // Fonction pour forcer le rechargement des données
    const forceReload = () => {
        console.log('🔄 Rechargement forcé des autorisations...');
        if (isMountedRef.current) {
            loadDemandes();
        }
    };

    const handlePageChange = (page) => {
        setFilters(prev => ({
            ...prev,
            page
        }));
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'en_attente': { color: 'warning', text: 'En attente', style: { color: '#000', fontWeight: 'bold' } },
            'approuve': { color: 'success', text: 'Approuvée', style: { color: '#fff', fontWeight: 'bold' } },
            'rejete': { color: 'danger', text: 'Rejetée', style: { color: '#fff', fontWeight: 'bold' } }
        };
        const config = statusConfig[status] || { color: 'secondary', text: status, style: { color: '#000', fontWeight: 'bold' } };
        return <Badge color={config.color} style={config.style}>{config.text}</Badge>;
    };

    const getNiveauEvolutionBadge = (niveau, phase) => {
        const niveaux = {
            'soumis': { color: 'info', text: 'Soumis', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#e3f2fd' } },
            'en_cours_traitement': { color: 'primary', text: 'En cours', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#e3f2fd' } },
            'valide_par_superieur': { color: 'success', text: 'Validé supérieur', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#d4edda' } },
            'valide_par_drh': { color: 'success', text: 'Validé DRH', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#d4edda' } },
            'valide_par_ministre': { color: 'success', text: 'Validé ministre', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#d4edda' } },
            'retour_ministre': { color: 'warning', text: 'Retour ministre', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#fff3cd' } },
            'retour_drh': { color: 'warning', text: 'Retour DRH', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#fff3cd' } },
            'retour_chef_service': { color: 'warning', text: 'Retour chef service', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#fff3cd' } },
            'finalise': { color: 'success', text: 'Finalisé', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#d4edda' } }
        };
        const config = niveaux[niveau] || { color: 'secondary', text: niveau, style: { color: '#000', fontWeight: 'bold', backgroundColor: '#f8f9fa' } };
        return <Badge color={config.color} style={config.style}>{config.text}</Badge>;
    };

    const getPhaseBadge = (phase) => {
        const phases = {
            'aller': { color: 'primary', text: 'Phase aller', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#e3f2fd' } },
            'retour': { color: 'warning', text: 'Phase retour', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#fff3cd' } }
        };
        const config = phases[phase] || { color: 'secondary', text: phase || 'Inconnue', style: { color: '#000', fontWeight: 'bold', backgroundColor: '#f8f9fa' } };
        return <Badge color={config.color} style={config.style}>{config.text}</Badge>;
    };

    const getTypeDemandeLabel = (type) => {
        const types = {
            'absence': 'Demande d\'Absence',
            'sortie_territoire': 'Sortie du Territoire',
            'attestation_travail': 'Attestation de Travail',
            'attestation_presence': 'Attestation de Présence',
            'certificat_non_jouissance_conge': 'Certificat de Non Jouissance de Congé',
            'certificat_cessation': 'Certificat de Cessation',
            'certificat_reprise_service': 'Autorisation de Reprise de Service',
            'autorisation_conges': 'Autorisation de Congé',
            'autorisation_retraite': 'Autorisation de Retraite'
        };
        return types[type] || type;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Non renseigné';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <Spinner color="primary" />
                <p className="mt-2">Chargement des autorisations...</p>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <h5 className="mb-0">
                    <i className="fa fa-list me-2"></i>
                    {filters.statut === 'en_attente' ? 'Autorisations en attente de validation' : 'Historique des autorisations'}
                </h5>
            </CardHeader>
            <CardBody>
                {error && (
                    <Alert color="danger">
                        <strong>Erreur:</strong> {error}
                    </Alert>
                )}

                {/* Filtres */}
                <Row className="mb-3">
                    <Col md="3">
                        <Label>Statut</Label>
                        <Input
                            type="select"
                            value={filters.statut}
                            onChange={(e) => handleFilterChange('statut', e.target.value)}
                        >
                            <option value="en_attente">En attente</option>
                            <option value="historique">Historique</option>
                        </Input>
                    </Col>
                    <Col md="3">
                        <Input
                            type="select"
                            value={filters.niveau_actuel}
                            onChange={(e) => handleFilterChange('niveau_actuel', e.target.value)}
                        >
                            <option value="">Tous les niveaux</option>
                            <option value="soumis">Soumis</option>
                            <option value="en_cours_traitement">En cours</option>
                            <option value="valide_par_superieur">Validé supérieur</option>
                            <option value="valide_par_drh">Validé DRH</option>
                            <option value="valide_par_direction">Validé direction</option>
                            <option value="finalise">Finalisé</option>
                        </Input>
                    </Col>
                    <Col md="3">
                        <Input
                            type="select"
                            value={filters.priorite}
                            onChange={(e) => handleFilterChange('priorite', e.target.value)}
                        >
                            <option value="">Toutes les priorités</option>
                            <option value="normale">Normale</option>
                            <option value="urgente">Urgente</option>
                            <option value="critique">Exceptionnelle</option>
                        </Input>
                    </Col>
                    <Col md="3">
                        <Input
                            type="select"
                            value={filters.limit}
                            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        >
                            <option value="10">10 par page</option>
                            <option value="25">25 par page</option>
                            <option value="50">50 par page</option>
                        </Input>
                    </Col>
                    <Col md="3">
                        <Dropdown isOpen={sortDropdownOpen} toggle={() => setSortDropdownOpen(!sortDropdownOpen)}>
                            <DropdownToggle caret color="outline-secondary" size="sm">
                                <i className="fa fa-sort me-1"></i>
                                Trier
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem>Date (plus récent)</DropdownItem>
                                <DropdownItem>Date (plus ancien)</DropdownItem>
                                <DropdownItem>Statut</DropdownItem>
                                <DropdownItem>Priorité</DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                </Row>

                {/* Nouveaux filtres pour DRH */}
                <Row className="mb-3">
                    <Col md="4">
                        <Label>Rechercher par Agent</Label>
                        <Input
                            type="text"
                            placeholder="Nom, prénoms ou matricule de l'agent..."
                            value={filters.agent_search || ''}
                            onChange={(e) => handleFilterChange('agent_search', e.target.value)}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </Col>
                    <Col md="4">
                        <Label>Rechercher par Service</Label>
                        <Input
                            type="select"
                            value={filters.service_id}
                            onChange={(e) => handleFilterChange('service_id', e.target.value)}
                        >
                            <option value="">Tous les services</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.libelle}
                                </option>
                            ))}
                        </Input>
                    </Col>
                </Row>
                
                <Row className="mb-3">
                    <Col md="4">
                        <Label>Filtrer par Type de Demande</Label>
                        <Input
                            type="select"
                            value={filters.type_demande}
                            onChange={(e) => handleFilterChange('type_demande', e.target.value)}
                            disabled={isTypeLocked}
                            style={isTypeLocked ? { backgroundColor: '#f1f3f5', cursor: 'not-allowed' } : undefined}
                        >
                            {isTypeLocked ? (
                                <option value={filters.type_demande}>
                                    {getTypeDemandeLabel(filters.type_demande) || 'Type sélectionné'}
                                </option>
                            ) : (
                                <>
                            <option value="">Tous les types</option>
                            <option value="certificat_cessation">Certificat de Cessation</option>
                            <option value="certificat_non_jouissance_conge">Certificat de Non Jouissance de Congé</option>
                            <option value="absence">Absence</option>
                            <option value="sortie_territoire">Sortie du Territoire</option>
                            <option value="attestation_travail">Attestation de Travail</option>
                            <option value="attestation_presence">Attestation de Présence</option>
                            <option value="certificat_reprise_service">Autorisation de Reprise de Service</option>
                            <option value="autorisation_conges">Autorisation de Congé</option>
                            <option value="autorisation_retraite">Autorisation de Retraite</option>
                            <option value="formation">Formation</option>
                            <option value="mission">Mission</option>
                                </>
                            )}
                        </Input>
                    </Col>
                    <Col md="4">
                        <div className="d-flex align-items-end">
                            <Button 
                                color="secondary" 
                                onClick={() => setFilters(prev => ({
                                    ...prev,
                                    agent_search: '',
                                    service_id: '',
                                    niveau_actuel: '',
                                    priorite: '',
                                    page: 1
                                }))}
                                className="me-2"
                            >
                                <i className="fa fa-refresh me-1"></i>
                                Réinitialiser
                            </Button>
                        </div>
                    </Col>
                </Row>

                {/* Table des autorisations */}
                <div className="table-responsive" style={{
                    maxHeight: '600px',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '100%'
                }}>
                    <Table hover style={{ 
                        width: '100%',
                        tableLayout: 'fixed',
                        minWidth: '100%'
                    }}>
                        <thead>
                            <tr>
                                <th style={{ width: '10%' }}>Agent</th>
                                <th style={{ width: '10%' }}>Type</th>
                                <th style={{ width: '13%' }}>Motif</th>
                                <th style={{ width: '13%' }}>{
                                    (filters.type_demande || '').toLowerCase() === 'certificat_cessation'
                                        ? 'Motif / Date cessation'
                                        : (filters.type_demande || '').toLowerCase() === 'certificat_reprise_service'
                                            ? 'Fin congés / Reprise'
                                            : (filters.type_demande || '').toLowerCase() === 'certificat_non_jouissance_conge'
                                                ? 'Année'
                                                : 'Période'
                                }</th>
                                <th style={{ width: '6%' }}>Statut</th>
                                <th style={{ width: '6%' }}>Phase</th>
                                <th style={{ width: '12%' }}>Niveau</th>
                                <th style={{ width: '10%' }}>Priorité</th>
                                <th style={{ width: '8%' }}>Date création</th>
                                <th style={{ width: '12%', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demandes.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="text-center text-muted py-4">
                                        <i className="fa fa-inbox fa-2x mb-2 d-block"></i>
                                        {filters.statut === 'historique' 
                                            ? 'Aucune autorisation dans l\'historique' 
                                            : 'Aucune autorisation en attente'
                                        }
                                    </td>
                                </tr>
                            ) : (
                                (filters.type_demande
                                    ? demandes.filter(d => (d.type_demande || '').toLowerCase() === filters.type_demande.toLowerCase())
                                    : demandes
                                ).map((demande) => (
                                    <tr key={demande.id} style={{ cursor: 'pointer' }}>
                                        <td>
                                            <div style={{ 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <div className="text-truncate" title={`${demande.agent ? `${demande.agent.prenom} ${demande.agent.nom}` : 'Agent non trouvé'}`}>
                                                    <strong>{demande.agent ? `${demande.agent.prenom} ${demande.agent.nom}` : 'Agent non trouvé'}</strong>
                                                </div>
                                                <small className="text-muted">{demande.agent ? demande.agent.matricule : 'N/A'}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <Badge color="info" style={{ 
                                                    color: '#000', 
                                                    fontWeight: 'bold', 
                                                    backgroundColor: '#e3f2fd',
                                                    fontSize: '0.65rem',
                                                    padding: '2px 4px',
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }} title={getTypeDemandeLabel(demande.type_demande)}>
                                                    {getTypeDemandeLabel(demande.type_demande)}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                padding: '2px 0'
                                            }} title={demande.description || 'Aucun motif'}>
                                                <span style={{ fontSize: '0.8rem' }}>
                                                    {demande.description || 'Aucun motif'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            {(demande.type_demande || '').toLowerCase() === 'certificat_cessation' ? (
                                                <div>
                                                    <div><strong>Motif:</strong> {demande.agree_motif || 'Non renseigné'}</div>
                                                    <div className="text-muted"><strong>Date:</strong> {demande.agree_date_cessation ? formatDate(demande.agree_date_cessation) : 'Non renseignée'}</div>
                                                </div>
                                            ) : (demande.type_demande || '').toLowerCase() === 'certificat_reprise_service' ? (
                                                <div>
                                                    <div><strong>Fin congés:</strong> {demande.date_fin_conges ? formatDate(demande.date_fin_conges) : 'Non renseignée'}</div>
                                                    <div className="text-muted"><strong>Reprise:</strong> {demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}</div>
                                                </div>
                                            ) : (
                                                demande.date_debut && demande.date_fin ? (
                                                    <div>
                                                        <div>{formatDate(demande.date_debut)}</div>
                                                        <div className="text-muted">au {formatDate(demande.date_fin)}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">Non renseigné</span>
                                                )
                                            )}
                                        </td>
                                        <td>
                                            {filters.statut === 'historique' && demande.statut_libelle ? (
                                                <Badge color={getStatusBadge(demande.status).color}>
                                                    {demande.statut_libelle}
                                                </Badge>
                                            ) : (
                                                getStatusBadge(demande.status)
                                            )}
                                        </td>
                                        <td>{getPhaseBadge(demande.phase)}</td>
                                        <td>
                                            <div style={{ 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {filters.statut === 'historique' && demande.niveau_libelle ? (
                                                    <Badge 
                                                        color={getNiveauEvolutionBadge(demande.niveau_evolution_demande, demande.phase).color}
                                                        style={{ 
                                                            fontSize: '0.65rem',
                                                            padding: '2px 4px',
                                                            maxWidth: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            display: 'inline-block'
                                                        }}
                                                        title={demande.niveau_libelle}
                                                    >
                                                        {demande.niveau_libelle}
                                                    </Badge>
                                                ) : (
                                                    <div style={{ 
                                                        fontSize: '0.65rem',
                                                        padding: '2px 4px',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }} title={demande.niveau_evolution_demande}>
                                                        {getNiveauEvolutionBadge(demande.niveau_evolution_demande, demande.phase)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ 
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                <Badge 
                                                    color={demande.priorite === 'urgente' ? 'warning' : demande.priorite === 'critique' ? 'danger' : 'secondary'}
                                                    style={{ 
                                                        color: demande.priorite === 'urgente' ? '#000' : demande.priorite === 'critique' ? '#fff' : '#000', 
                                                        fontWeight: 'bold',
                                                        fontSize: '0.65rem',
                                                        padding: '2px 4px',
                                                        maxWidth: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'inline-block'
                                                    }}
                                                    title={demande.priorite || 'normale'}
                                                >
                                                    {demande.priorite === 'critique' 
                                                        ? 'Exceptionnelle' 
                                                        : demande.priorite === 'urgente' 
                                                            ? 'Urgente' 
                                                            : (demande.priorite === 'normale' || !demande.priorite) 
                                                                ? 'Normale' 
                                                                : demande.priorite}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td>{formatDate(demande.date_creation)}</td>
                                        <td>
                                            <div style={{ 
                                                width: '100%',
                                                display: 'flex', 
                                                flexDirection: 'row', 
                                                gap: '3px',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexWrap: 'nowrap',
                                                padding: '2px'
                                            }}>
                                                <Button
                                                    color="outline-primary"
                                                    size="sm"
                                                    data-demande-id={demande.id}
                                                    onClick={() => onDemandeClick('view', demande)}
                                                    title="Voir les détails"
                                                    style={{ 
                                                        fontSize: '0.7rem', 
                                                        padding: '2px 4px',
                                                        minWidth: '45px',
                                                        height: '26px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <i className="fa fa-eye me-1"></i>
                                                    Voir
                                                </Button>
                                                {filters.statut === 'en_attente' && (
                                                    <>
                                                        {/* Bouton Transmettre pour les autorisations en phase retour */}
                                                        {demande.phase === 'retour' && demande.niveau_evolution_demande === 'retour_drh' ? (
                                                            <Button
                                                                color="outline-info"
                                                                size="sm"
                                                                onClick={() => onDemandeClick('transmit', demande)}
                                                                title="Transmettre le document à l'agent"
                                                                style={{ 
                                                                    fontSize: '0.7rem', 
                                                                    padding: '2px 4px',
                                                                    minWidth: '50px',
                                                                    height: '26px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <i className="fa fa-paper-plane me-1"></i>
                                                                Trans
                                                            </Button>
                                                        ) : (
                                                            /* Bouton Valider pour les autres cas */
                                                            <Button
                                                                color="outline-success"
                                                                size="sm"
                                                                onClick={() => onDemandeClick('validate', demande)}
                                                                title="Valider la demande"
                                                                style={{ 
                                                                    fontSize: '0.7rem', 
                                                                    padding: '2px 4px',
                                                                    minWidth: '45px',
                                                                    height: '26px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <i className="fa fa-check me-1"></i>
                                                                OK
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="d-flex justify-content-center mt-3">
                        <Pagination>
                            <PaginationItem disabled={pagination.current_page === 1}>
                                <PaginationLink
                                    previous
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                />
                            </PaginationItem>
                            
                            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(page => (
                                <PaginationItem key={page} active={page === pagination.current_page}>
                                    <PaginationLink onClick={() => handlePageChange(page)}>
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}
                            
                            <PaginationItem disabled={pagination.current_page === pagination.total_pages}>
                                <PaginationLink
                                    next
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                />
                            </PaginationItem>
                        </Pagination>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default DemandesDRHList;
