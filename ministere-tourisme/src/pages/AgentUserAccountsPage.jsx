import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Pagination,
    PaginationItem,
    PaginationLink,
    Row,
    Spinner,
    Table
} from 'reactstrap';
import {
    MdAdd,
    MdEdit,
    MdLockReset,
    MdRefresh,
    MdSearch,
    MdSecurity,
    MdToggleOff,
    MdToggleOn
} from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';

const REMOTE_API_BASE_URL = 'https://tourisme.2ise-groupe.com/api';
const LOCAL_API_BASE_URL = 'https://tourisme.2ise-groupe.com/api';

const resolveApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return LOCAL_API_BASE_URL;
        }
    }
    return REMOTE_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl();

const AgentUserAccountsPage = () => {
    const { user } = useAuth(); // réservé pour une future gestion fine des permissions
    const normalizedRole = (user?.role || '').toLowerCase();
    const userMinistereId =
        user?.id_ministere ||
        user?.ministere_id ||
        user?.ministere?.id ||
        user?.organization?.id ||
        null;
    const shouldRestrictByMinistere = normalizedRole === 'drh' && Boolean(userMinistereId);
    const [accounts, setAccounts] = useState([]);
    const [roles, setRoles] = useState([]);
    const [availableAgents, setAvailableAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState(null);
    const [resetInfo, setResetInfo] = useState(null);
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [paginationMeta, setPaginationMeta] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        id_role: '',
        id_agent: '',
        password: ''
    });

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
    };

    const fetchJSON = useCallback(async (url, options = {}) => {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...(options.headers || {})
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
            throw new Error(data.message || 'Erreur lors de la communication avec le serveur.');
        }
        return data;
    }, []);

    const loadAccounts = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            if (shouldRestrictByMinistere && userMinistereId) {
                params.append('id_ministere', userMinistereId);
            }
            params.append('page', currentPage);
            params.append('limit', pageSize);
            const query = `?${params.toString()}`;
            const data = await fetchJSON(`${API_BASE_URL}/user-accounts${query}`);
            setAccounts(Array.isArray(data.data) ? data.data : []);
            // Gérer différentes structures de réponse API
            const metaData = data.meta || data.pagination || {};
            const meta = metaData && Object.keys(metaData).length > 0
                ? {
                      page: metaData.page || metaData.current_page || currentPage,
                      limit: metaData.limit || metaData.per_page || pageSize,
                      total: metaData.total ?? metaData.totalCount ?? metaData.totalItems ?? 0,
                      // Le backend retourne total_pages, pas totalPages
                      totalPages: metaData.total_pages || metaData.totalPages || Math.ceil((metaData.total ?? metaData.totalCount ?? metaData.totalItems ?? 0) / (metaData.limit || metaData.per_page || pageSize)) || 1
                  }
                : {
                      page: currentPage,
                      limit: pageSize,
                      total: Array.isArray(data.data) ? data.data.length : 0,
                      totalPages: 1
                  };
            console.log('📄 AgentUserAccounts Pagination - totalPages:', meta.totalPages, 'total:', meta.total, 'meta object:', metaData);
            setPaginationMeta(meta);
            if (meta.totalPages > 0 && currentPage > meta.totalPages) {
                setCurrentPage(meta.totalPages);
            }
        } catch (error) {
            console.error('loadAccounts error:', error);
            setNotification({ type: 'danger', message: error.message });
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchTerm, currentPage, pageSize, shouldRestrictByMinistere, userMinistereId, fetchJSON]);

    const loadRoles = useCallback(async () => {
        try {
            const data = await fetchJSON(`${API_BASE_URL}/user-accounts/roles`);
            setRoles(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
            console.error('loadRoles error:', error);
            setNotification({ type: 'danger', message: 'Impossible de charger les rôles.' });
        }
    }, [fetchJSON]);

    const loadAvailableAgents = useCallback(async () => {
        try {
            const data = await fetchJSON(`${API_BASE_URL}/user-accounts/available-agents`);
            setAvailableAgents(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
            console.error('loadAvailableAgents error:', error);
            setNotification({ type: 'danger', message: 'Impossible de charger les agents disponibles.' });
        }
    }, [fetchJSON]);

    useEffect(() => {
        loadRoles();
        loadAvailableAgents();
    }, [loadRoles, loadAvailableAgents]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    const filteredAccounts = useMemo(() => accounts, [accounts]);

    const paginationRange = useMemo(() => {
        const totalPages = paginationMeta.totalPages || 1;
        // Afficher toutes les pages
        return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }, [paginationMeta.totalPages]);

    const openModal = (account = null) => {
        if (account) {
            setIsEditing(true);
            setSelectedAccount(account);
            setFormData({
                username: account.username || '',
                email: account.email || '',
                id_role: account.id_role || '',
                id_agent: account.id_agent || '',
                password: ''
            });
        } else {
            setIsEditing(false);
            setSelectedAccount(null);
            setFormData({
                username: '',
                email: '',
                id_role: '',
                id_agent: '',
                password: ''
            });
        }
        setModalOpen(true);
        setNotification(null);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSaving(false);
        setSelectedAccount(null);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setNotification(null);
        try {
            if (isEditing && selectedAccount) {
                await fetchJSON(`${API_BASE_URL}/user-accounts/${selectedAccount.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        username: formData.username,
                        email: formData.email,
                        id_role: formData.id_role
                    })
                });
                setNotification({ type: 'success', message: 'Compte mis à jour avec succès.' });
            } else {
                const payload = {
                    username: formData.username,
                    email: formData.email,
                    id_role: formData.id_role,
                    id_agent: formData.id_agent,
                    password: formData.password
                };
                const data = await fetchJSON(`${API_BASE_URL}/user-accounts`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (data.data?.plainPassword) {
                    setResetInfo({
                        username: data.data.username,
                        password: data.data.plainPassword
                    });
                }
                await loadAvailableAgents();
                setNotification({ type: 'success', message: 'Compte créé avec succès.' });
            }
            await loadAccounts();
            closeModal();
        } catch (error) {
            console.error('handleSubmit error:', error);
            setNotification({ type: 'danger', message: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (account) => {
        try {
            await fetchJSON(`${API_BASE_URL}/user-accounts/${account.id}/toggle-active`, {
                method: 'PATCH'
            });
            setNotification({
                type: 'success',
                message: `Compte ${account.username} ${account.is_active ? 'désactivé' : 'activé'}.`
            });
            await loadAccounts();
        } catch (error) {
            console.error('handleToggleActive error:', error);
            setNotification({ type: 'danger', message: error.message });
        }
    };

    const handleResetPassword = async (account) => {
        try {
            const data = await fetchJSON(`${API_BASE_URL}/user-accounts/${account.id}/reset-password`, {
                method: 'POST'
            });
            if (data.data?.plainPassword) {
                setResetInfo({
                    username: data.data.username,
                    password: data.data.plainPassword
                });
            }
            setNotification({
                type: 'success',
                message: `Mot de passe réinitialisé pour ${account.username}.`
            });
        } catch (error) {
            console.error('handleResetPassword error:', error);
            setNotification({ type: 'danger', message: error.message });
        }
    };

    return (
        <div className="agent-user-accounts-page">
            <Card className="mb-4">
                <CardHeader className="d-flex justify-content-between align-items-center">
                    <div>
                        <CardTitle tag="h5" className="mb-0 d-flex align-items-center gap-2">
                            <MdSecurity size={22} />
                            Gestion des comptes utilisateur des agents
                        </CardTitle>
                        <small className="text-muted">
                            Créez, réinitialisez ou désactivez les comptes associés aux agents.
                        </small>
                    </div>
                    <div className="d-flex gap-2">
                        <Button color="secondary" onClick={loadAccounts}>
                            <MdRefresh className="me-1" />
                            Actualiser
                        </Button>
                        <Button
                            color="primary"
                            onClick={() => openModal(null)}
                            disabled={!availableAgents.length}
                        >
                            <MdAdd className="me-1" />
                            Nouveau compte
                        </Button>
                    </div>
                </CardHeader>
                <CardBody>
                    {notification && (
                        <Alert color={notification.type} toggle={() => setNotification(null)}>
                            {notification.message}
                        </Alert>
                    )}

                    {resetInfo && (
                        <Alert color="info" toggle={() => setResetInfo(null)}>
                            <strong>Nouveau mot de passe pour {resetInfo.username} :</strong>{' '}
                            <code>{resetInfo.password}</code>
                        </Alert>
                    )}

                    <Row className="g-3 mb-4">
                        <Col md="6">
                            <Label>Recherche</Label>
                            <div className="d-flex align-items-center">
                                <MdSearch className="me-2 text-muted" />
                                <Input
                                    placeholder="Nom, matricule, email..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>
                        </Col>
                        <Col md="3">
                            <FormGroup>
                                <Label>Statut</Label>
                                <Input
                                    type="select"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">Tous</option>
                                    <option value="active">Actifs</option>
                                    <option value="inactive">Inactifs</option>
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md="3">
                            <FormGroup>
                                <Label>Résultats par page</Label>
                                <Input
                                    type="select"
                                    value={pageSize}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value, 10);
                                        setPageSize(Number.isNaN(value) ? 20 : value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    {[10, 20, 50, 100].map(size => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                    </Row>

                    <div className="table-responsive">
                        {loading ? (
                            <div className="text-center p-5">
                                <Spinner color="primary" />
                            </div>
                        ) : filteredAccounts.length === 0 ? (
                            <Alert color="light" className="text-center">
                                Aucun compte ne correspond aux filtres sélectionnés.
                            </Alert>
                        ) : (
                            <Table hover className="align-middle">
                                <thead>
                                    <tr>
                                        <th>Agent</th>
                                        <th>Compte</th>
                                        <th>Rôle</th>
                                        <th>Statut</th>
                                        <th>Dernière connexion</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAccounts.map(account => (
                                        <tr key={account.id}>
                                            <td>
                                                <div className="fw-bold text-uppercase">
                                                    {account.agent_nom || 'Non lié'} {account.agent_prenom || ''}
                                                </div>
                                                <div className="text-muted small">
                                                    Matricule: {account.matricule || 'N/A'}
                                                </div>
                                                <div className="text-muted small">
                                                    Ministère: {account.ministere_nom || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="fw-semibold">{account.username}</div>
                                                <div className="text-muted small">{account.email}</div>
                                            </td>
                                            <td>{account.role_nom || 'N/A'}</td>
                                            <td>
                                                <Badge
                                                    pill
                                                    style={{
                                                        backgroundColor: account.is_active ? '#198754' : '#adb5bd',
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        minWidth: '72px',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {account.is_active ? 'Actif' : 'Inactif'}
                                                </Badge>
                                            </td>
                                            <td className="text-muted small">
                                                {account.last_login
                                                    ? new Date(account.last_login).toLocaleString('fr-FR')
                                                    : 'Jamais'}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        color="light"
                                                        size="sm"
                                                        onClick={() => openModal(account)}
                                                        title="Modifier le compte"
                                                    >
                                                        <MdEdit />
                                                    </Button>
                                                    <Button
                                                        color="warning"
                                                        size="sm"
                                                        onClick={() => handleResetPassword(account)}
                                                        title="Réinitialiser le mot de passe"
                                                    >
                                                        <MdLockReset />
                                                    </Button>
                                                    <Button
                                                        color={account.is_active ? 'secondary' : 'success'}
                                                        size="sm"
                                                        onClick={() => handleToggleActive(account)}
                                                        title={account.is_active ? 'Désactiver le compte' : 'Activer le compte'}
                                                    >
                                                        {account.is_active ? <MdToggleOff /> : <MdToggleOn />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>

                    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-center gap-3 mt-3 flex-wrap" style={{ width: '100%' }}>
                        <div className="text-muted small" style={{ flexShrink: 0 }}>
                            {paginationMeta.total > 0 ? (
                                <>
                                    Affichage{' '}
                                    <strong>
                                        {(paginationMeta.page - 1) * paginationMeta.limit + 1}-
                                        {Math.min(
                                            paginationMeta.page * paginationMeta.limit,
                                            paginationMeta.total
                                        )}
                                    </strong>{' '}
                                    sur <strong>{paginationMeta.total}</strong> comptes
                                </>
                            ) : (
                                'Aucun compte à afficher'
                            )}
                        </div>
                        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ 
                            flex: '1 1 auto', 
                            justifyContent: 'flex-end', 
                            minWidth: 0
                        }}>
                            <div style={{ 
                                maxWidth: '100%', 
                                overflowX: 'auto', 
                                overflowY: 'hidden',
                                WebkitOverflowScrolling: 'touch',
                                flexShrink: 1,
                                minWidth: 0
                            }}>
                                <nav>
                                    <ul className="pagination pagination-sm mb-0" style={{ 
                                        margin: 0, 
                                        flexWrap: 'nowrap', 
                                        display: 'flex',
                                        width: 'max-content'
                                    }}>
                                        <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                            <button
                                                className="page-link"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    if (currentPage > 1) {
                                                        setCurrentPage(currentPage - 1);
                                                    }
                                                }}
                                                disabled={currentPage <= 1}
                                            >
                                                Précédent
                                            </button>
                                        </li>
                                        
                                        {/* Affichage de toutes les pages */}
                                        {paginationMeta.totalPages > 0 ? (
                                            paginationRange.map(page => (
                                                <li 
                                                    key={page} 
                                                    className={`page-item ${page === currentPage ? 'active' : ''}`} 
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    <button
                                                        className="page-link"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            if (page !== currentPage) {
                                                                setCurrentPage(page);
                                                            }
                                                        }}
                                                        style={{ minWidth: '40px', cursor: 'pointer' }}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="page-item active" style={{ flexShrink: 0 }}>
                                                <span className="page-link">1</span>
                                            </li>
                                        )}
                                        
                                        <li className={`page-item ${currentPage >= (paginationMeta.totalPages || 1) ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                            <button
                                                className="page-link"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    if (currentPage < (paginationMeta.totalPages || 1)) {
                                                        setCurrentPage(currentPage + 1);
                                                    }
                                                }}
                                                disabled={currentPage >= (paginationMeta.totalPages || 1)}
                                            >
                                                Suivant
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Modal isOpen={modalOpen} toggle={closeModal} size="lg">
                <ModalHeader toggle={closeModal}>
                    {isEditing ? 'Modifier le compte' : 'Nouveau compte utilisateur'}
                </ModalHeader>
                <ModalBody>
                    <Form onSubmit={handleSubmit}>
                        <Row className="g-3">
                            {!isEditing && (
                                <Col md="12">
                                    <FormGroup>
                                        <Label>Agent</Label>
                                        <Input
                                            type="select"
                                            name="id_agent"
                                            value={formData.id_agent}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">-- Sélectionner un agent --</option>
                                            {availableAgents.map(agent => (
                                                <option key={agent.id} value={agent.id}>
                                                    {agent.nom} {agent.prenom} - {agent.matricule || 'N/A'}
                                                </option>
                                            ))}
                                        </Input>
                                        {availableAgents.length === 0 && (
                                            <small className="text-danger">
                                                Aucun agent disponible sans compte. Vérifiez les agents existants.
                                            </small>
                                        )}
                                    </FormGroup>
                                </Col>
                            )}
                            <Col md="6">
                                <FormGroup>
                                    <Label>Nom d'utilisateur</Label>
                                    <Input
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        placeholder="Nom d'utilisateur"
                                        required
                                        disabled={isEditing}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Email professionnel"
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col md="6">
                                <FormGroup>
                                    <Label>Rôle</Label>
                                    <Input
                                        type="select"
                                        name="id_role"
                                        value={formData.id_role}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">-- Sélectionner un rôle --</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.nom}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            {!isEditing && (
                                <Col md="6">
                                    <FormGroup>
                                        <Label>Mot de passe (facultatif)</Label>
                                        <Input
                                            type="text"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Laisser vide pour générer automatiquement"
                                        />
                                    </FormGroup>
                                </Col>
                            )}
                        </Row>
                        <div className="text-end">
                            <Button
                                color="primary"
                                type="submit"
                                disabled={saving || (!isEditing && availableAgents.length === 0)}
                            >
                                {saving ? <Spinner size="sm" color="light" className="me-2" /> : null}
                                {isEditing ? 'Mettre à jour' : 'Créer le compte'}
                           </Button>
                        </div>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={closeModal} disabled={saving}>
                        Annuler
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default AgentUserAccountsPage;

