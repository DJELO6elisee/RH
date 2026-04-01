import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    ListGroup,
    ListGroupItem,
    Badge,
    Button,
    Row,
    Col,
    Input,
    Alert,
    Spinner,
    Pagination,
    PaginationItem,
    PaginationLink,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Modal,
    ModalHeader,
    ModalBody
} from 'reactstrap';
import NoteServiceDocument from './NoteServiceDocument';

const NotificationsPanel = ({ agentId, onNotificationClick, selectedNotificationId }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        lu: '',
        type_notification: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({});
    const [nombreNonLues, setNombreNonLues] = useState(0);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedNoteService, setSelectedNoteService] = useState(null);
    const [showNoteServiceModal, setShowNoteServiceModal] = useState(false);
    const selectedNotificationRef = useRef(null);
    const [displayedCount, setDisplayedCount] = useState(5); // Nombre de notifications affichées
    
    // Référence pour vérifier si le composant est monté
    const isMountedRef = useRef(true);

    useEffect(() => {
        loadNotifications();
        loadNombreNonLues();
    }, [agentId, filters]);

    // Scroll vers la notification sélectionnée quand elle est chargée
    useEffect(() => {
        if (selectedNotificationId && selectedNotificationRef.current) {
            setTimeout(() => {
                selectedNotificationRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    }, [selectedNotificationId, notifications]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const loadNotifications = async () => {
        // Vérifier si le composant est encore monté avant de commencer
        if (!isMountedRef.current) {
            console.log('🔍 Composant démonté, annulation de loadNotifications');
            return;
        }

        try {
            setLoading(true);
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setError(null);
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }

            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key] !== '') {
                    queryParams.append(key, filters[key]);
                }
            });

            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/agent/${agentId}?${queryParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (result.success) {
                // Trier les notifications par date de création décroissante (plus récentes en premier)
                const sortedNotifications = (result.data || []).sort((a, b) => {
                    const dateA = new Date(a.date_creation || a.created_at || 0);
                    const dateB = new Date(b.date_creation || b.created_at || 0);
                    return dateB - dateA; // Décroissant
                });
                setNotifications(sortedNotifications);
                setPagination(result.pagination);
                // Réinitialiser le nombre de notifications affichées à 5 quand les notifications changent
                setDisplayedCount(5);
            } else {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setError(result.error || 'Erreur lors du chargement des notifications');
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
        } catch (err) {
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setError('Erreur de connexion au serveur');
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
        } finally {
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setLoading(false);
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
            }
        }
    };

    const loadNombreNonLues = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/agent/${agentId}/nombre-non-lues`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();
            if (result.success) {
                setNombreNonLues(result.data.nombre_non_lues);
            }
        } catch (err) {
            console.error('Erreur lors du chargement du nombre de notifications:', err);
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value,
            page: 1
        }));
    };

    const handlePageChange = (page) => {
        setFilters(prev => ({
            ...prev,
            page
        }));
    };

    const marquerCommeLue = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/${notificationId}/lire`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, lu: true, date_lecture: new Date().toISOString() }
                            : notif
                    )
                );
                loadNombreNonLues();
            }
        } catch (err) {
            console.error('Erreur lors du marquage de la notification:', err);
        }
    };

    const marquerToutesCommeLues = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/agent/${agentId}/toutes-lues`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                setNotifications(prev => 
                    prev.map(notif => ({ ...notif, lu: true, date_lecture: new Date().toISOString() }))
                );
                setNombreNonLues(0);
            }
        } catch (err) {
            console.error('Erreur lors du marquage des notifications:', err);
        }
    };

    const supprimerNotification = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/${notificationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
                loadNombreNonLues();
            }
        } catch (err) {
            console.error('Erreur lors de la suppression de la notification:', err);
        }
    };

    const getTypeNotificationIcon = (type, message) => {
        // Détecter les notes de service même avec le type 'demande_approuvee'
        if (type === 'note_service' || (type === 'demande_approuvee' && message && message.includes('note de service'))) {
            return 'fa-file-text';
        }
        
        const icons = {
            'nouvelle_demande': 'fa-plus-circle',
            'demande_approuvee': 'fa-check-circle',
            'demande_rejetee': 'fa-times-circle',
            'demande_en_cours': 'fa-clock',
            'demande_finalisee': 'fa-check-double',
            'rappel_validation': 'fa-bell',
            'note_service': 'fa-file-text',
            'anniversaire_aujourdhui': 'fa-birthday-cake',
            'anniversaire_avenir': 'fa-birthday-cake',
            'document_transmis': 'fa-paper-plane'
        };
        return icons[type] || 'fa-bell';
    };

    const getTypeNotificationColor = (type, message) => {
        // Détecter les notes de service même avec le type 'demande_approuvee'
        if (type === 'note_service' || (type === 'demande_approuvee' && message && message.includes('note de service'))) {
            return 'info';
        }
        
        const colors = {
            'nouvelle_demande': 'primary',
            'demande_approuvee': 'success',
            'demande_rejetee': 'danger',
            'demande_en_cours': 'info',
            'demande_finalisee': 'success',
            'rappel_validation': 'warning',
            'note_service': 'info',
            'anniversaire_aujourdhui': 'warning',
            'anniversaire_avenir': 'warning',
            'document_transmis': 'primary'
        };
        return colors[type] || 'secondary';
    };

    const getTypeNotificationLabel = (type, message) => {
        // Détecter les notes de service même avec le type 'demande_approuvee'
        if (type === 'note_service' || (type === 'demande_approuvee' && message && message.includes('note de service'))) {
            return 'Note de Service';
        }
        
        const labels = {
            'nouvelle_demande': 'Nouvelle demande',
            'demande_approuvee': 'Demande approuvée',
            'demande_rejetee': 'Demande rejetée',
            'demande_en_cours': 'Demande en cours',
            'demande_finalisee': 'Demande finalisée',
            'rappel_validation': 'Rappel validation',
            'note_service': 'Note de Service',
            'anniversaire_aujourdhui': 'Vœux d\'anniversaire',
            'anniversaire_avenir': 'Vœux d\'anniversaire',
            'document_transmis': 'Document transmis'
        };
        return labels[type] || type;
    };

    const handleNotificationClick = (notification) => {
        // Pour les notes de service, ouvrir le modal de note de service
        if (notification.type_notification === 'note_service' || 
            (notification.type_notification === 'demande_approuvee' && 
             notification.message && notification.message.includes('note de service'))) {
            setSelectedNoteService(notification);
            setShowNoteServiceModal(true);
        } else {
            // Pour toutes les autres notifications, appeler onNotificationClick qui redirigera vers la boîte de réception
            // et affichera le message dans un modal
            if (onNotificationClick) {
                onNotificationClick(notification);
            }
        }
    };

    const closeNoteServiceModal = () => {
        setShowNoteServiceModal(false);
        setSelectedNoteService(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Hier';
        if (diffDays < 7) return `Il y a ${diffDays} jours`;
        return date.toLocaleDateString('fr-FR');
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <Spinner color="primary" />
                <span className="ml-2">Chargement des notifications...</span>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <Row className="align-items-center">
                    <Col>
                        <h5 className="mb-0">
                            <i className="fa fa-bell me-2"></i>
                            Notifications
                            {nombreNonLues > 0 && (
                                <Badge color="danger" className="ms-2">
                                    {nombreNonLues}
                                </Badge>
                            )}
                        </h5>
                    </Col>
                    <Col md="auto">
                        <Dropdown isOpen={dropdownOpen} toggle={() => setDropdownOpen(!dropdownOpen)}>
                            <DropdownToggle caret color="outline-primary" size="sm">
                                <i className="fa fa-cog me-1"></i>
                                Actions
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem onClick={marquerToutesCommeLues}>
                                    <i className="fa fa-check-double me-2"></i>
                                    Marquer toutes comme lues
                                </DropdownItem>
                                <DropdownItem divider />
                                <DropdownItem onClick={() => handleFilterChange('lu', 'false')}>
                                    <i className="fa fa-eye-slash me-2"></i>
                                    Voir seulement non lues
                                </DropdownItem>
                                <DropdownItem onClick={() => handleFilterChange('lu', '')}>
                                    <i className="fa fa-list me-2"></i>
                                    Voir toutes
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                </Row>
            </CardHeader>
            <CardBody>
                {error && (
                    <Alert color="danger">
                        <i className="fa fa-exclamation-triangle me-2"></i>
                        {error}
                    </Alert>
                )}

                {/* Filtres */}
                <Row className="mb-3">
                    <Col md="4">
                        <Input
                            type="select"
                            value={filters.lu}
                            onChange={(e) => handleFilterChange('lu', e.target.value)}
                        >
                            <option value="">Toutes</option>
                            <option value="false">Non lues</option>
                            <option value="true">Lues</option>
                        </Input>
                    </Col>
                    <Col md="4">
                        <Input
                            type="select"
                            value={filters.type_notification}
                            onChange={(e) => handleFilterChange('type_notification', e.target.value)}
                        >
                            <option value="">Tous les types</option>
                            <option value="demande_approuvee">Demandes approuvées</option>
                            <option value="demande_rejetee">Demandes rejetées</option>
                            <option value="note_service">Notes de service</option>
                            <option value="anniversaire">Vœux d'anniversaire</option>
                            <option value="document_transmis">Documents transmis</option>
                        </Input>
                    </Col>
                    <Col md="4">
                        <Input
                            type="select"
                            value={filters.limit}
                            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                        >
                            <option value="20">20 par page</option>
                            <option value="50">50 par page</option>
                            <option value="100">100 par page</option>
                        </Input>
                    </Col>
                </Row>

                {/* Liste des notifications */}
                {notifications.length === 0 ? (
                    <Alert color="info" className="text-center">
                        <i className="fa fa-inbox fa-2x mb-2 d-block"></i>
                        Aucune notification trouvée
                    </Alert>
                ) : (
                    <>
                        <ListGroup>
                            {notifications.slice(0, displayedCount).map((notification) => {
                                const isSelected = selectedNotificationId === notification.id;
                                return (
                                <ListGroupItem
                                    key={notification.id}
                                    ref={isSelected ? selectedNotificationRef : null}
                                    className={`d-flex align-items-start ${!notification.lu ? 'bg-light' : ''} ${isSelected ? 'border-primary border-2' : ''}`}
                                    style={{ 
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#e3f2fd' : (!notification.lu ? '#f8f9fa' : 'transparent')
                                    }}
                                    onClick={() => {
                                        if (!notification.lu) {
                                            marquerCommeLue(notification.id);
                                        }
                                        handleNotificationClick(notification);
                                    }}
                                >
                                    <div className="me-3">
                                        <i className={`fa ${getTypeNotificationIcon(notification.type_notification, notification.message)} text-${getTypeNotificationColor(notification.type_notification, notification.message)}`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 className="mb-1" style={{ color: '#000', fontWeight: '600' }}>
                                                    {notification.titre || 'Notification'}
                                                    {!notification.lu && (
                                                        <Badge color="primary" className="ms-2">Nouveau</Badge>
                                                    )}
                                                </h6>
                                                <div className="mb-1" style={{ whiteSpace: 'pre-line', color: '#000', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                                    {notification.message || 'Aucun message'}
                                                </div>
                                                <small className="text-muted">
                                                    {getTypeNotificationLabel(notification.type_notification, notification.message)} • 
                                                    {formatDate(notification.date_creation)}
                                                </small>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                {/* Bouton Voir pour les notes de service */}
                                                {(notification.type_notification === 'note_service' || 
                                                  (notification.type_notification === 'demande_approuvee' && 
                                                   notification.message && notification.message.includes('note de service'))) && (
                                                    <Button
                                                        color="outline-info"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedNoteService(notification);
                                                            setShowNoteServiceModal(true);
                                                        }}
                                                        title="Voir la note de service"
                                                    >
                                                        👁️
                                                    </Button>
                                                )}
                                                {!notification.lu && (
                                                    <Button
                                                        color="outline-primary"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            marquerCommeLue(notification.id);
                                                        }}
                                                        title="Marquer comme lu"
                                                    >
                                                        ✓
                                                    </Button>
                                                )}
                                                {/* Bouton de suppression retiré pour les agents - ils ne peuvent que voir et marquer comme lu */}
                                            </div>
                                        </div>
                                    </div>
                                </ListGroupItem>
                                );
                            })}
                        </ListGroup>
                        
                        {/* Boutons "Voir plus" et "Voir moins" */}
                        <div className="text-center mt-3">
                            {displayedCount > 5 && (
                                <Button
                                    color="secondary"
                                    outline
                                    className="me-2"
                                    onClick={() => setDisplayedCount(prev => Math.max(prev - 5, 5))}
                                >
                                    <i className="fa fa-chevron-up me-2"></i>
                                    Voir moins
                                </Button>
                            )}
                            {displayedCount < notifications.length && (
                                <Button
                                    color="primary"
                                    outline
                                    onClick={() => setDisplayedCount(prev => Math.min(prev + 5, notifications.length))}
                                >
                                    <i className="fa fa-chevron-down me-2"></i>
                                    Voir plus ({notifications.length - displayedCount} restantes)
                                </Button>
                            )}
                        </div>
                    </>
                )}

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

                {/* Modal pour afficher les notes de service */}
                <Modal 
                    isOpen={showNoteServiceModal} 
                    toggle={closeNoteServiceModal}
                    size="xl"
                    style={{ maxWidth: '90vw' }}
                >
                    <ModalHeader toggle={closeNoteServiceModal}>
                        <i className="fa fa-file-text me-2"></i>
                        Note de Service
                    </ModalHeader>
                    <ModalBody style={{ padding: 0 }}>
                        {selectedNoteService && (
                            <NoteServiceDocument 
                                notification={selectedNoteService}
                                onClose={closeNoteServiceModal}
                            />
                        )}
                    </ModalBody>
                </Modal>
            </CardBody>
        </Card>
    );
};

export default NotificationsPanel;
