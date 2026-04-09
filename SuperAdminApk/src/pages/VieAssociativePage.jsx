import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Table,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    Row,
    Col,
    Alert,
    Spinner,
    Badge,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'reactstrap';
import { MdGroupWork, MdBusiness, MdPrint, MdFileDownload, MdPictureAsPdf, MdTableChart } from 'react-icons/md';
import classnames from 'classnames';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import Page from '../components/Page';
import ManagementPage from '../components/ManagementPage';
import { useAuth } from '../contexts/AuthContext';
import '../styles/table-styles.css';

const VieAssociativePage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('1'); // '1' pour Relations Associations, '2' pour Relations Syndicats, '3' pour Gérer Associations, '4' pour Gérer Syndicats
    
    // États pour les Associations
    const [agentsAssociations, setAgentsAssociations] = useState([]);
    const [associations, setAssociations] = useState([]);
    const [loadingAssociations, setLoadingAssociations] = useState(true);
    const [errorAssociations, setErrorAssociations] = useState(null);
    const [successAssociations, setSuccessAssociations] = useState(null);
    const [modalAssociation, setModalAssociation] = useState(false);
    const [modalViewAssociations, setModalViewAssociations] = useState(false);
    const [modalEditAssociation, setModalEditAssociation] = useState(false);
    const [selectedAgentAssociation, setSelectedAgentAssociation] = useState(null);
    const [selectedAgentAssociationsList, setSelectedAgentAssociationsList] = useState([]);
    const [selectedAssociationItem, setSelectedAssociationItem] = useState(null);
    const [formDataAssociation, setFormDataAssociation] = useState({
        id_association: '',
        date_adhesion: '',
        date_fin: '',
        role: '',
        statut: 'actif'
    });
    const [fichierAttestationAssociation, setFichierAttestationAssociation] = useState(null);
    const [editFormDataAssociation, setEditFormDataAssociation] = useState({
        id_association: '',
        date_adhesion: '',
        date_fin: '',
        role: '',
        statut: 'actif'
    });
    const [editFichierAttestationAssociation, setEditFichierAttestationAssociation] = useState(null);
    const [existingFichierAttestationAssociation, setExistingFichierAttestationAssociation] = useState(null);
    
    // États pour les Syndicats
    const [agentsSindicats, setAgentsSindicats] = useState([]);
    const [sindicats, setSindicats] = useState([]);
    const [loadingSindicats, setLoadingSindicats] = useState(true);
    const [errorSindicats, setErrorSindicats] = useState(null);
    const [successSindicats, setSuccessSindicats] = useState(null);
    const [modalSindicat, setModalSindicat] = useState(false);
    const [modalViewSindicats, setModalViewSindicats] = useState(false);
    const [modalEditSindicat, setModalEditSindicat] = useState(false);
    const [selectedAgentSindicat, setSelectedAgentSindicat] = useState(null);
    const [selectedAgentSindicatsList, setSelectedAgentSindicatsList] = useState([]);
    const [selectedSindicatItem, setSelectedSindicatItem] = useState(null);
    const [formDataSindicat, setFormDataSindicat] = useState({
        id_sindicat: '',
        date_adhesion: '',
        date_fin: '',
        role: '',
        statut: 'actif'
    });
    const [fichierAttestationSindicat, setFichierAttestationSindicat] = useState(null);
    const [editFormDataSindicat, setEditFormDataSindicat] = useState({
        id_sindicat: '',
        date_adhesion: '',
        date_fin: '',
        role: '',
        statut: 'actif'
    });
    const [editFichierAttestationSindicat, setEditFichierAttestationSindicat] = useState(null);
    const [existingFichierAttestationSindicat, setExistingFichierAttestationSindicat] = useState(null);
    
    // Fonction pour télécharger un fichier via l'API
    const downloadFile = async (associationId, fileName, isSindicat = false) => {
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_API_URL || 'https://tourisme.2ise-groupe.com';
            
            // Utiliser la route API dédiée pour télécharger le fichier
            const endpoint = isSindicat 
                ? `/api/agent-sindicats/${associationId}/attestation`
                : `/api/agent-associations/${associationId}/attestation`;
            
            const fullUrl = `${apiUrl}${endpoint}`;
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Erreur lors du téléchargement du fichier' }));
                throw new Error(errorData.message || 'Erreur lors du téléchargement du fichier');
            }
            
            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fileName || 'attestation';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
            if (isSindicat) {
                setErrorSindicats(error.message || 'Impossible de télécharger le fichier. Veuillez réessayer.');
            } else {
                setErrorAssociations(error.message || 'Impossible de télécharger le fichier. Veuillez réessayer.');
            }
        }
    };
    
    // États communs
    const isInitialLoadRef = useRef(true);
    const [currentPageAssociations, setCurrentPageAssociations] = useState(1);
    const [totalPagesAssociations, setTotalPagesAssociations] = useState(1);
    const [totalItemsAssociations, setTotalItemsAssociations] = useState(0);
    const [currentPageSindicats, setCurrentPageSindicats] = useState(1);
    const [totalPagesSindicats, setTotalPagesSindicats] = useState(1);
    const [totalItemsSindicats, setTotalItemsSindicats] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTermAssociations, setSearchTermAssociations] = useState('');
    const [searchTermSindicats, setSearchTermSindicats] = useState('');
    const [debouncedSearchAssociations, setDebouncedSearchAssociations] = useState('');
    const [debouncedSearchSindicats, setDebouncedSearchSindicats] = useState('');
    const [exportDropdownOpenAssociations, setExportDropdownOpenAssociations] = useState(false);
    const [exportDropdownOpenSindicats, setExportDropdownOpenSindicats] = useState(false);
    const [selectedAssociationFilter, setSelectedAssociationFilter] = useState('all');
    const [selectedSindicatFilter, setSelectedSindicatFilter] = useState('all');

    // Debounce pour les recherches
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchAssociations(searchTermAssociations);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTermAssociations]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchSindicats(searchTermSindicats);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTermSindicats]);

    // Charger les associations et syndicats (tables de référence)
    useEffect(() => {
        fetchAssociations();
        fetchSindicats();
    }, []);

    const fetchAssociations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/associations?limit=10000', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                const associationsList = data.data || [];
                setAssociations(associationsList);
                console.log('Associations chargées:', associationsList.length);
            } else {
                console.error('Erreur lors du chargement des associations:', response.status);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des associations:', error);
        }
    };

    const fetchSindicats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/sindicats?limit=10000', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                const sindicatsList = data.data || [];
                setSindicats(sindicatsList);
                console.log('Syndicats chargés:', sindicatsList.length);
            } else {
                console.error('Erreur lors du chargement des syndicats:', response.status);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des syndicats:', error);
        }
    };

    // Fonctions pour les Associations
    const fetchAgentsAssociations = useCallback(async () => {
        try {
            if (isInitialLoadRef.current) {
                setLoadingAssociations(true);
            }
            setErrorAssociations(null);
            const token = localStorage.getItem('token');
            const searchParam = debouncedSearchAssociations ? `&search=${encodeURIComponent(debouncedSearchAssociations)}` : '';
            const associationParam = selectedAssociationFilter && selectedAssociationFilter !== 'all' ? `&association_id=${selectedAssociationFilter}` : '';
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/agents?page=${currentPageAssociations}&limit=${itemsPerPage}${searchParam}${associationParam}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const data = await response.json();
            setAgentsAssociations(data.data);
            setTotalPagesAssociations(data.pagination.total_pages);
            setTotalItemsAssociations(data.pagination.total);
        } catch (error) {
            setErrorAssociations(error.message);
        } finally {
            setLoadingAssociations(false);
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [currentPageAssociations, debouncedSearchAssociations, itemsPerPage, selectedAssociationFilter]);

    useEffect(() => {
        if (activeTab === '1') {
            fetchAgentsAssociations();
        }
    }, [fetchAgentsAssociations, activeTab]);

    // Fonctions pour les Syndicats
    const fetchAgentsSindicats = useCallback(async () => {
        try {
            if (isInitialLoadRef.current) {
                setLoadingSindicats(true);
            }
            setErrorSindicats(null);
            const token = localStorage.getItem('token');
            const searchParam = debouncedSearchSindicats ? `&search=${encodeURIComponent(debouncedSearchSindicats)}` : '';
            const sindicatParam = selectedSindicatFilter && selectedSindicatFilter !== 'all' ? `&sindicat_id=${selectedSindicatFilter}` : '';
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-sindicats/agents?page=${currentPageSindicats}&limit=${itemsPerPage}${searchParam}${sindicatParam}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const data = await response.json();
            setAgentsSindicats(data.data);
            setTotalPagesSindicats(data.pagination.total_pages);
            setTotalItemsSindicats(data.pagination.total);
        } catch (error) {
            setErrorSindicats(error.message);
        } finally {
            setLoadingSindicats(false);
            if (isInitialLoadRef.current) {
                isInitialLoadRef.current = false;
            }
        }
    }, [currentPageSindicats, debouncedSearchSindicats, itemsPerPage, selectedSindicatFilter]);

    useEffect(() => {
        if (activeTab === '2') {
            fetchAgentsSindicats();
        }
    }, [fetchAgentsSindicats, activeTab]);

    // Fonctions utilitaires communes
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const getStatutBadge = (statut) => {
        const statuts = {
            'actif': { color: 'success', label: 'Actif' },
            'inactif': { color: 'warning', label: 'Inactif' },
            'resigne': { color: 'danger', label: 'Démissionné' }
        };
        const s = statuts[statut] || { color: 'secondary', label: statut || 'N/A' };
        return <Badge color={s.color}>{s.label}</Badge>;
    };

    // Fonctions pour gérer les Associations
    const toggleModalAssociation = (agent = null) => {
        setSelectedAgentAssociation(agent);
        setModalAssociation(!modalAssociation);
        if (!modalAssociation && agent) {
            setFormDataAssociation({
                id_association: '',
                date_adhesion: '',
                date_fin: '',
                role: '',
                statut: 'actif'
            });
            setFichierAttestationAssociation(null);
        }
    };

    const toggleModalViewAssociations = async (agent = null) => {
        if (agent && !modalViewAssociations) {
            setLoadingAssociations(true);
            setErrorAssociations(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentAssociationsList(data.data || []);
                } else {
                    const errorData = await response.json();
                    setErrorAssociations(errorData.message || 'Erreur lors du chargement des associations');
                }
            } catch (error) {
                setErrorAssociations('Erreur lors du chargement des associations');
            } finally {
                setLoadingAssociations(false);
            }
        }
        setSelectedAgentAssociation(agent);
        setModalViewAssociations(!modalViewAssociations);
        if (modalViewAssociations && !agent) {
            setSelectedAgentAssociationsList([]);
        }
    };

    const handleSubmitAssociation = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Utiliser FormData si un fichier est présent, sinon JSON
            const hasFile = fichierAttestationAssociation && fichierAttestationAssociation instanceof File;
            
            let response;
            if (hasFile) {
                const formData = new FormData();
                formData.append('id_agent', selectedAgentAssociation.id);
                formData.append('id_association', formDataAssociation.id_association);
                formData.append('date_adhesion', formDataAssociation.date_adhesion);
                if (formDataAssociation.date_fin) {
                    formData.append('date_fin', formDataAssociation.date_fin);
                }
                if (formDataAssociation.role) {
                    formData.append('role', formDataAssociation.role);
                }
                formData.append('statut', formDataAssociation.statut);
                formData.append('fichier_attestation', fichierAttestationAssociation);
                
                response = await fetch('https://tourisme.2ise-groupe.com/api/agent-associations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Ne pas mettre Content-Type pour FormData, le navigateur le fait automatiquement
                    },
                    body: formData
                });
            } else {
                response = await fetch('https://tourisme.2ise-groupe.com/api/agent-associations', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...formDataAssociation,
                        id_agent: selectedAgentAssociation.id
                    })
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de l\'attribution de l\'association');
            }

            setSuccessAssociations('Association attribuée avec succès');
            setModalAssociation(false);
            setFichierAttestationAssociation(null);
            fetchAgentsAssociations();
            if (modalViewAssociations && selectedAgentAssociation) {
                toggleModalViewAssociations(selectedAgentAssociation);
            }
        } catch (error) {
            setErrorAssociations(error.message);
        }
    };

    const toggleModalEditAssociation = (association = null) => {
        const willOpen = !modalEditAssociation;
        setSelectedAssociationItem(association);
        setModalEditAssociation(willOpen);
        
        if (willOpen && association) {
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };
            
            setEditFormDataAssociation({
                id_association: String(association.id_association || association.association_id || ''),
                date_adhesion: formatDateForInput(association.date_adhesion || association.created_at),
                date_fin: formatDateForInput(association.date_fin),
                role: association.role || '',
                statut: association.statut || 'actif'
            });
            
            // Stocker les informations du fichier existant
            if (association.fichier_attestation_url) {
                setExistingFichierAttestationAssociation({
                    url: association.fichier_attestation_url,
                    nom: association.fichier_attestation_nom,
                    taille: association.fichier_attestation_taille
                });
            } else {
                setExistingFichierAttestationAssociation(null);
            }
            setEditFichierAttestationAssociation(null);
        } else if (!willOpen) {
            setEditFormDataAssociation({
                id_association: '',
                date_adhesion: '',
                date_fin: '',
                role: '',
                statut: 'actif'
            });
            setExistingFichierAttestationAssociation(null);
            setEditFichierAttestationAssociation(null);
        }
    };

    const handleEditSubmitAssociation = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Utiliser FormData si un nouveau fichier est présent, sinon JSON
            const hasNewFile = editFichierAttestationAssociation && editFichierAttestationAssociation instanceof File;
            
            let response;
            if (hasNewFile) {
                const formData = new FormData();
                formData.append('id_association', editFormDataAssociation.id_association);
                formData.append('date_adhesion', editFormDataAssociation.date_adhesion);
                if (editFormDataAssociation.date_fin) {
                    formData.append('date_fin', editFormDataAssociation.date_fin);
                } else {
                    formData.append('date_fin', '');
                }
                if (editFormDataAssociation.role) {
                    formData.append('role', editFormDataAssociation.role);
                } else {
                    formData.append('role', '');
                }
                formData.append('statut', editFormDataAssociation.statut);
                formData.append('fichier_attestation', editFichierAttestationAssociation);
                
                response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/${selectedAssociationItem.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Ne pas mettre Content-Type pour FormData
                    },
                    body: formData
                });
            } else {
                // Si pas de nouveau fichier, envoyer les données en JSON
                // Si on veut supprimer le fichier existant, on peut envoyer fichier_attestation_url: null
                const dataToSend = { ...editFormDataAssociation };
                // Si on veut garder le fichier existant, ne rien envoyer pour les champs de fichier
                // Le backend gardera les valeurs existantes
                
                response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/${selectedAssociationItem.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dataToSend)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification de l\'association');
            }

            setSuccessAssociations('Association modifiée avec succès');
            setModalEditAssociation(false);
            setEditFichierAttestationAssociation(null);
            setExistingFichierAttestationAssociation(null);
            fetchAgentsAssociations();
            if (modalViewAssociations && selectedAgentAssociation) {
                toggleModalViewAssociations(selectedAgentAssociation);
            }
        } catch (error) {
            setErrorAssociations(error.message);
        }
    };

    const handleDeleteAssociation = async (associationId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette association ?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-associations/${associationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la suppression de l\'association');
            }

            setSuccessAssociations('Association supprimée avec succès');
            fetchAgentsAssociations();
            if (modalViewAssociations && selectedAgentAssociation) {
                toggleModalViewAssociations(selectedAgentAssociation);
            }
        } catch (error) {
            setErrorAssociations(error.message);
        }
    };

    // Fonctions pour gérer les Syndicats (similaires aux associations)
    const toggleModalSindicat = (agent = null) => {
        setSelectedAgentSindicat(agent);
        setModalSindicat(!modalSindicat);
        if (!modalSindicat && agent) {
            setFormDataSindicat({
                id_sindicat: '',
                date_adhesion: '',
                date_fin: '',
                role: '',
                statut: 'actif'
            });
            setFichierAttestationSindicat(null);
        }
    };

    const toggleModalViewSindicats = async (agent = null) => {
        if (agent && !modalViewSindicats) {
            setLoadingSindicats(true);
            setErrorSindicats(null);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-sindicats/agent/${agent.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setSelectedAgentSindicatsList(data.data || []);
                } else {
                    const errorData = await response.json();
                    setErrorSindicats(errorData.message || 'Erreur lors du chargement des syndicats');
                }
            } catch (error) {
                setErrorSindicats('Erreur lors du chargement des syndicats');
            } finally {
                setLoadingSindicats(false);
            }
        }
        setSelectedAgentSindicat(agent);
        setModalViewSindicats(!modalViewSindicats);
        if (modalViewSindicats && !agent) {
            setSelectedAgentSindicatsList([]);
        }
    };

    const handleSubmitSindicat = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Utiliser FormData si un fichier est présent, sinon JSON
            const hasFile = fichierAttestationSindicat && fichierAttestationSindicat instanceof File;
            
            let response;
            if (hasFile) {
                const formData = new FormData();
                formData.append('id_agent', selectedAgentSindicat.id);
                formData.append('id_sindicat', formDataSindicat.id_sindicat);
                formData.append('date_adhesion', formDataSindicat.date_adhesion);
                if (formDataSindicat.date_fin) {
                    formData.append('date_fin', formDataSindicat.date_fin);
                }
                if (formDataSindicat.role) {
                    formData.append('role', formDataSindicat.role);
                }
                formData.append('statut', formDataSindicat.statut);
                formData.append('fichier_attestation', fichierAttestationSindicat);
                
                response = await fetch('https://tourisme.2ise-groupe.com/api/agent-sindicats', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Ne pas mettre Content-Type pour FormData, le navigateur le fait automatiquement
                    },
                    body: formData
                });
            } else {
                response = await fetch('https://tourisme.2ise-groupe.com/api/agent-sindicats', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ...formDataSindicat,
                        id_agent: selectedAgentSindicat.id
                    })
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de l\'attribution du syndicat');
            }

            setSuccessSindicats('Syndicat attribué avec succès');
            setModalSindicat(false);
            setFichierAttestationSindicat(null);
            fetchAgentsSindicats();
            if (modalViewSindicats && selectedAgentSindicat) {
                toggleModalViewSindicats(selectedAgentSindicat);
            }
        } catch (error) {
            setErrorSindicats(error.message);
        }
    };

    const toggleModalEditSindicat = (sindicat = null) => {
        const willOpen = !modalEditSindicat;
        setSelectedSindicatItem(sindicat);
        setModalEditSindicat(willOpen);
        
        if (willOpen && sindicat) {
            const formatDateForInput = (dateString) => {
                if (!dateString) return '';
                const date = new Date(dateString);
                return date.toISOString().split('T')[0];
            };
            
            setEditFormDataSindicat({
                id_sindicat: String(sindicat.id_sindicat || sindicat.sindicat_id || ''),
                date_adhesion: formatDateForInput(sindicat.date_adhesion || sindicat.created_at),
                date_fin: formatDateForInput(sindicat.date_fin),
                role: sindicat.role || '',
                statut: sindicat.statut || 'actif'
            });
            
            // Stocker les informations du fichier existant
            if (sindicat.fichier_attestation_url) {
                setExistingFichierAttestationSindicat({
                    url: sindicat.fichier_attestation_url,
                    nom: sindicat.fichier_attestation_nom,
                    taille: sindicat.fichier_attestation_taille
                });
            } else {
                setExistingFichierAttestationSindicat(null);
            }
            setEditFichierAttestationSindicat(null);
        } else if (!willOpen) {
            setEditFormDataSindicat({
                id_sindicat: '',
                date_adhesion: '',
                date_fin: '',
                role: '',
                statut: 'actif'
            });
            setExistingFichierAttestationSindicat(null);
            setEditFichierAttestationSindicat(null);
        }
    };

    const handleEditSubmitSindicat = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            
            // Utiliser FormData si un nouveau fichier est présent, sinon JSON
            const hasNewFile = editFichierAttestationSindicat && editFichierAttestationSindicat instanceof File;
            
            let response;
            if (hasNewFile) {
                const formData = new FormData();
                formData.append('id_sindicat', editFormDataSindicat.id_sindicat);
                formData.append('date_adhesion', editFormDataSindicat.date_adhesion);
                if (editFormDataSindicat.date_fin) {
                    formData.append('date_fin', editFormDataSindicat.date_fin);
                } else {
                    formData.append('date_fin', '');
                }
                if (editFormDataSindicat.role) {
                    formData.append('role', editFormDataSindicat.role);
                } else {
                    formData.append('role', '');
                }
                formData.append('statut', editFormDataSindicat.statut);
                formData.append('fichier_attestation', editFichierAttestationSindicat);
                
                response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-sindicats/${selectedSindicatItem.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Ne pas mettre Content-Type pour FormData
                    },
                    body: formData
                });
            } else {
                // Si pas de nouveau fichier, envoyer les données en JSON
                // Le backend gardera les valeurs existantes pour les champs de fichier
                response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-sindicats/${selectedSindicatItem.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(editFormDataSindicat)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la modification du syndicat');
            }

            setSuccessSindicats('Syndicat modifié avec succès');
            setModalEditSindicat(false);
            setEditFichierAttestationSindicat(null);
            setExistingFichierAttestationSindicat(null);
            fetchAgentsSindicats();
            if (modalViewSindicats && selectedAgentSindicat) {
                toggleModalViewSindicats(selectedAgentSindicat);
            }
        } catch (error) {
            setErrorSindicats(error.message);
        }
    };

    const handleDeleteSindicat = async (sindicatId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce syndicat ?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agent-sindicats/${sindicatId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erreur lors de la suppression du syndicat');
            }

            setSuccessSindicats('Syndicat supprimé avec succès');
            fetchAgentsSindicats();
            if (modalViewSindicats && selectedAgentSindicat) {
                toggleModalViewSindicats(selectedAgentSindicat);
            }
        } catch (error) {
            setErrorSindicats(error.message);
        }
    };

    // Composant pour le tableau des agents (Associations)
    const renderAgentsTableAssociations = () => (
        <div className="table-responsive">
            <Table hover>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Prénoms</th>
                        <th>Nb. Associations</th>
                        <th>Dernière Association</th>
                        <th>Date d'adhésion</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {agentsAssociations.map((agent, index) => (
                        <tr key={agent.id}>
                            <td className="fw-bold text-center">
                                {((currentPageAssociations - 1) * itemsPerPage) + index + 1}
                            </td>
                            <td className="fw-bold">{agent.matricule || 'N/A'}</td>
                            <td className="fw-bold">{agent.nom}</td>
                            <td>{agent.prenom}</td>
                            <td className="fw-bold text-center">{agent.nb_associations || 0}</td>
                            <td>
                                {(() => {
                                    const nb = parseInt(agent.nb_associations) || 0;
                                    if (nb >= 1) {
                                        return (
                                            <div className="d-flex align-items-center gap-2">
                                                <span>{agent.derniere_association_nom || '-'}</span>
                                                <Button
                                                    color="info"
                                                    size="sm"
                                                    onClick={() => toggleModalViewAssociations(agent)}
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                >
                                                    {nb > 1 ? 'Voir' : 'Voir/Modifier'}
                                                </Button>
                                            </div>
                                        );
                                    } else {
                                        return <span className="text-muted">Aucune association</span>;
                                    }
                                })()}
                            </td>
                            <td>{agent.derniere_association_date ? formatDate(agent.derniere_association_date) : '-'}</td>
                            <td>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    onClick={() => toggleModalAssociation(agent)}
                                    style={{ backgroundColor: 'black', borderColor: 'black', color: 'white' }}
                                >
                                    Attribuer Association
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );

    // Composant pour le tableau des agents (Syndicats)
    const renderAgentsTableSindicats = () => (
        <div className="table-responsive">
            <Table hover>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Matricule</th>
                        <th>Nom</th>
                        <th>Prénoms</th>
                        <th>Nb. Syndicats</th>
                        <th>Dernier Syndicat</th>
                        <th>Date d'adhésion</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {agentsSindicats.map((agent, index) => (
                        <tr key={agent.id}>
                            <td className="fw-bold text-center">
                                {((currentPageSindicats - 1) * itemsPerPage) + index + 1}
                            </td>
                            <td className="fw-bold">{agent.matricule || 'N/A'}</td>
                            <td className="fw-bold">{agent.nom}</td>
                            <td>{agent.prenom}</td>
                            <td className="fw-bold text-center">{agent.nb_sindicats || 0}</td>
                            <td>
                                {(() => {
                                    const nb = parseInt(agent.nb_sindicats) || 0;
                                    if (nb >= 1) {
                                        return (
                                            <div className="d-flex align-items-center gap-2">
                                                <span>{agent.dernier_sindicat_nom || '-'}</span>
                                                <Button
                                                    color="info"
                                                    size="sm"
                                                    onClick={() => toggleModalViewSindicats(agent)}
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                >
                                                    {nb > 1 ? 'Voir' : 'Voir/Modifier'}
                                                </Button>
                                            </div>
                                        );
                                    } else {
                                        return <span className="text-muted">Aucun syndicat</span>;
                                    }
                                })()}
                            </td>
                            <td>{agent.dernier_sindicat_date ? formatDate(agent.dernier_sindicat_date) : '-'}</td>
                            <td>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    onClick={() => toggleModalSindicat(agent)}
                                    style={{ backgroundColor: 'black', borderColor: 'black', color: 'white' }}
                                >
                                    Attribuer Syndicat
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );

    // Fonction d'export Excel pour les associations
    const handleExportExcelAssociations = () => {
        try {
            const headers = ['N°', 'Matricule', 'Nom', 'Prénoms', 'Nb. Associations', 'Dernière Association', 'Date d\'adhésion'];
            const data = agentsAssociations.map((agent, index) => [
                ((currentPageAssociations - 1) * itemsPerPage) + index + 1,
                agent.matricule || 'N/A',
                agent.nom || '',
                agent.prenom || '',
                agent.nb_associations || 0,
                agent.derniere_association_nom || 'Aucune association',
                agent.derniere_association_date ? formatDate(agent.derniere_association_date) : '-'
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents Associations');
            
            const fileName = `Liste_Agents_Associations_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            setSuccessAssociations('Export Excel généré avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            setErrorAssociations('Erreur lors de l\'export Excel');
        }
    };

    // Fonction d'export PDF pour les associations
    const handleExportPDFAssociations = () => {
        try {
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Titre
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text('Liste des Agents - Associations', pageWidth / 2, 15, { align: 'center' });
            
            // Date
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR')} - ${totalItemsAssociations} agent(s)`;
            pdf.text(dateText, pageWidth / 2, 22, { align: 'center' });

            // En-têtes du tableau
            let yPosition = 30;
            const lineHeight = 7;
            const colWidths = [15, 30, 40, 50, 30, 50, 35];
            const headers = ['N°', 'Matricule', 'Nom', 'Prénoms', 'Nb. Ass.', 'Dernière Association', 'Date'];
            let xPosition = 15;

            // Dessiner les en-têtes
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            pdf.setFillColor(66, 139, 202);
            headers.forEach((header, index) => {
                pdf.rect(xPosition, yPosition - 5, colWidths[index], lineHeight + 2, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.text(header, xPosition + colWidths[index] / 2, yPosition, { align: 'center' });
                xPosition += colWidths[index];
            });

            yPosition += lineHeight + 2;
            pdf.setTextColor(0, 0, 0);
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);

            // Données du tableau
            agentsAssociations.forEach((agent, index) => {
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                }

                xPosition = 15;
                const rowData = [
                    ((currentPageAssociations - 1) * itemsPerPage) + index + 1,
                    agent.matricule || 'N/A',
                    agent.nom || '',
                    agent.prenom || '',
                    agent.nb_associations || 0,
                    agent.derniere_association_nom || 'Aucune',
                    agent.derniere_association_date ? formatDate(agent.derniere_association_date) : '-'
                ];

                rowData.forEach((cell, colIndex) => {
                    const cellText = String(cell).length > 20 ? String(cell).substring(0, 20) + '...' : String(cell);
                    pdf.text(cellText, xPosition + colWidths[colIndex] / 2, yPosition, { align: 'center', maxWidth: colWidths[colIndex] - 2 });
                    xPosition += colWidths[colIndex];
                });

                yPosition += lineHeight;
            });

            const fileName = `Liste_Agents_Associations_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            setSuccessAssociations('Export PDF généré avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            setErrorAssociations('Erreur lors de l\'export PDF');
        }
    };

    // Fonction d'impression pour les associations
    const handlePrintAssociations = () => {
        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Liste des Agents - Associations</title>
                    <style>
                        @media print {
                            @page { margin: 2cm; }
                        }
                        body { font-family: Arial, sans-serif; font-size: 12px; }
                        h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
                        .date { text-align: center; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #428BCA; color: white; font-weight: bold; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Liste des Agents - Associations</h1>
                    <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR')} - ${totalItemsAssociations} agent(s)</div>
                    <table>
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Prénoms</th>
                                <th>Nb. Associations</th>
                                <th>Dernière Association</th>
                                <th>Date d'adhésion</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${agentsAssociations.map((agent, index) => `
                                <tr>
                                    <td>${((currentPageAssociations - 1) * itemsPerPage) + index + 1}</td>
                                    <td>${agent.matricule || 'N/A'}</td>
                                    <td>${agent.nom || ''}</td>
                                    <td>${agent.prenom || ''}</td>
                                    <td>${agent.nb_associations || 0}</td>
                                    <td>${agent.derniere_association_nom || 'Aucune association'}</td>
                                    <td>${agent.derniere_association_date ? formatDate(agent.derniere_association_date) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    // Fonction d'export Excel pour les syndicats
    const handleExportExcelSindicats = () => {
        try {
            const headers = ['N°', 'Matricule', 'Nom', 'Prénoms', 'Nb. Syndicats', 'Dernier Syndicat', 'Date d\'adhésion'];
            const data = agentsSindicats.map((agent, index) => [
                ((currentPageSindicats - 1) * itemsPerPage) + index + 1,
                agent.matricule || 'N/A',
                agent.nom || '',
                agent.prenom || '',
                agent.nb_sindicats || 0,
                agent.dernier_sindicat_nom || 'Aucun syndicat',
                agent.dernier_sindicat_date ? formatDate(agent.dernier_sindicat_date) : '-'
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents Syndicats');
            
            const fileName = `Liste_Agents_Syndicats_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            setSuccessSindicats('Export Excel généré avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            setErrorSindicats('Erreur lors de l\'export Excel');
        }
    };

    // Fonction d'export PDF pour les syndicats
    const handleExportPDFSindicats = () => {
        try {
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Titre
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text('Liste des Agents - Syndicats', pageWidth / 2, 15, { align: 'center' });
            
            // Date
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR')} - ${totalItemsSindicats} agent(s)`;
            pdf.text(dateText, pageWidth / 2, 22, { align: 'center' });

            // En-têtes du tableau
            let yPosition = 30;
            const lineHeight = 7;
            const colWidths = [15, 30, 40, 50, 30, 50, 35];
            const headers = ['N°', 'Matricule', 'Nom', 'Prénoms', 'Nb. Synd.', 'Dernier Syndicat', 'Date'];
            let xPosition = 15;

            // Dessiner les en-têtes
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            pdf.setFillColor(66, 139, 202);
            headers.forEach((header, index) => {
                pdf.rect(xPosition, yPosition - 5, colWidths[index], lineHeight + 2, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.text(header, xPosition + colWidths[index] / 2, yPosition, { align: 'center' });
                xPosition += colWidths[index];
            });

            yPosition += lineHeight + 2;
            pdf.setTextColor(0, 0, 0);
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);

            // Données du tableau
            agentsSindicats.forEach((agent, index) => {
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                }

                xPosition = 15;
                const rowData = [
                    ((currentPageSindicats - 1) * itemsPerPage) + index + 1,
                    agent.matricule || 'N/A',
                    agent.nom || '',
                    agent.prenom || '',
                    agent.nb_sindicats || 0,
                    agent.dernier_sindicat_nom || 'Aucun',
                    agent.dernier_sindicat_date ? formatDate(agent.dernier_sindicat_date) : '-'
                ];

                rowData.forEach((cell, colIndex) => {
                    const cellText = String(cell).length > 20 ? String(cell).substring(0, 20) + '...' : String(cell);
                    pdf.text(cellText, xPosition + colWidths[colIndex] / 2, yPosition, { align: 'center', maxWidth: colWidths[colIndex] - 2 });
                    xPosition += colWidths[colIndex];
                });

                yPosition += lineHeight;
            });

            const fileName = `Liste_Agents_Syndicats_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            setSuccessSindicats('Export PDF généré avec succès');
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            setErrorSindicats('Erreur lors de l\'export PDF');
        }
    };

    // Fonction d'impression pour les syndicats
    const handlePrintSindicats = () => {
        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Liste des Agents - Syndicats</title>
                    <style>
                        @media print {
                            @page { margin: 2cm; }
                        }
                        body { font-family: Arial, sans-serif; font-size: 12px; }
                        h1 { text-align: center; font-size: 18px; margin-bottom: 10px; }
                        .date { text-align: center; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #428BCA; color: white; font-weight: bold; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>Liste des Agents - Syndicats</h1>
                    <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR')} - ${totalItemsSindicats} agent(s)</div>
                    <table>
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Matricule</th>
                                <th>Nom</th>
                                <th>Prénoms</th>
                                <th>Nb. Syndicats</th>
                                <th>Dernier Syndicat</th>
                                <th>Date d'adhésion</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${agentsSindicats.map((agent, index) => `
                                <tr>
                                    <td>${((currentPageSindicats - 1) * itemsPerPage) + index + 1}</td>
                                    <td>${agent.matricule || 'N/A'}</td>
                                    <td>${agent.nom || ''}</td>
                                    <td>${agent.prenom || ''}</td>
                                    <td>${agent.nb_sindicats || 0}</td>
                                    <td>${agent.dernier_sindicat_nom || 'Aucun syndicat'}</td>
                                    <td>${agent.dernier_sindicat_date ? formatDate(agent.dernier_sindicat_date) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    // Composant de pagination réutilisable
    const renderPagination = (currentPage, totalPages, totalItems, setCurrentPage, itemsPerPage) => (
        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" style={{ width: '100%' }}>
            <div className="d-flex align-items-center" style={{ flexShrink: 0 }}>
                <span className="me-2">Afficher</span>
                <select 
                    className="form-select form-select-sm me-2" 
                    style={{width: '70px'}}
                    value={itemsPerPage}
                    onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                    }}
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
                <span>éléments par page</span>
            </div>
            
            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ 
                flex: '1 1 auto', 
                justifyContent: 'flex-end', 
                minWidth: 0
            }}>
                <span className="text-nowrap" style={{ flexShrink: 0, marginRight: '1rem' }}>
                    Affichage de {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} éléments
                </span>
                
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
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                <button
                                    className="page-link"
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Précédent
                                </button>
                            </li>
                            
                            {/* Affichage de toutes les pages */}
                            {totalPages > 0 ? (
                                Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`} style={{ flexShrink: 0 }}>
                                        <button 
                                            className="page-link" 
                                            onClick={() => setCurrentPage(page)}
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
                            
                            <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                <button
                                    className="page-link"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    Suivant
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    );

    return (
        <Page title="Vie Associative - Syndicats et Associations">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <div className="d-flex justify-content-between align-items-center">
                                <h4 className="mb-0">Gestion de la Vie Associative</h4>
                            </div>
                        </CardHeader>
                        <CardBody>
                            {/* Onglets */}
                            <Nav tabs className="mb-3">
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={() => {
                                            setActiveTab('1');
                                            setCurrentPageAssociations(1);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <MdGroupWork className="me-2" />
                                        Assignations des Associations aux Agents
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '2' })}
                                        onClick={() => {
                                            setActiveTab('2');
                                            setCurrentPageSindicats(1);
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <MdBusiness className="me-2" />
                                        Assignations des Syndicats aux Agents
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '3' })}
                                        onClick={() => {
                                            setActiveTab('3');
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <MdGroupWork className="me-2" />
                                        Gérer les Associations
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: activeTab === '4' })}
                                        onClick={() => {
                                            setActiveTab('4');
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <MdBusiness className="me-2" />
                                        Gérer les Syndicats
                                    </NavLink>
                                </NavItem>
                            </Nav>

                            <TabContent activeTab={activeTab}>
                                {/* Onglet 1 : Associations */}
                                <TabPane tabId="1">
                                    {errorAssociations && (
                                        <Alert color="danger" className="mb-3" onDismiss={() => setErrorAssociations(null)}>
                                            {errorAssociations}
                                        </Alert>
                                    )}
                                    {successAssociations && (
                                        <Alert color="success" className="mb-3" onDismiss={() => setSuccessAssociations(null)}>
                                            {successAssociations}
                                        </Alert>
                                    )}
                                    
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <Dropdown isOpen={exportDropdownOpenAssociations} toggle={() => setExportDropdownOpenAssociations(!exportDropdownOpenAssociations)}>
                                                <DropdownToggle color="success" caret>
                                                    <MdFileDownload className="me-1" />
                                                    Exporter
                                                </DropdownToggle>
                                                <DropdownMenu>
                                                    <DropdownItem onClick={() => {
                                                        setExportDropdownOpenAssociations(false);
                                                        handlePrintAssociations();
                                                    }}>
                                                        <MdPrint className="me-2" />
                                                        Imprimer
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => {
                                                        setExportDropdownOpenAssociations(false);
                                                        handleExportExcelAssociations();
                                                    }}>
                                                        <MdTableChart className="me-2" />
                                                        Excel (.xlsx)
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => {
                                                        setExportDropdownOpenAssociations(false);
                                                        handleExportPDFAssociations();
                                                    }}>
                                                        <MdPictureAsPdf className="me-2" />
                                                        PDF (.pdf)
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <Label className="me-2 mb-0" style={{ whiteSpace: 'nowrap' }}>Filtrer par association:</Label>
                                            <Input
                                                type="select"
                                                value={selectedAssociationFilter}
                                                onChange={(e) => {
                                                    setSelectedAssociationFilter(e.target.value);
                                                    setCurrentPageAssociations(1);
                                                }}
                                                className="form-control-sm"
                                                style={{ width: '250px' }}
                                            >
                                                <option value="all">Toutes les associations</option>
                                                {associations && associations.length > 0 ? (
                                                    associations.map(assoc => (
                                                        <option key={assoc.id} value={assoc.id}>
                                                            {assoc.libele}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>Chargement...</option>
                                                )}
                                            </Input>
                                            <Input
                                                type="text"
                                                placeholder="Rechercher un agent..."
                                                value={searchTermAssociations}
                                                onChange={(e) => {
                                                    setSearchTermAssociations(e.target.value);
                                                    setCurrentPageAssociations(1);
                                                }}
                                                className="form-control-sm"
                                                style={{ width: '250px', textTransform: 'uppercase' }}
                                            />
                                        </div>
                                    </div>

                                    {loadingAssociations ? (
                                        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                                            <Spinner color="primary" />
                                        </div>
                                    ) : (
                                        <>
                                            {renderAgentsTableAssociations()}
                                            {renderPagination(currentPageAssociations, totalPagesAssociations, totalItemsAssociations, setCurrentPageAssociations, itemsPerPage)}
                                        </>
                                    )}
                                </TabPane>

                                {/* Onglet 2 : Syndicats */}
                                <TabPane tabId="2">
                                    {errorSindicats && (
                                        <Alert color="danger" className="mb-3" onDismiss={() => setErrorSindicats(null)}>
                                            {errorSindicats}
                                        </Alert>
                                    )}
                                    {successSindicats && (
                                        <Alert color="success" className="mb-3" onDismiss={() => setSuccessSindicats(null)}>
                                            {successSindicats}
                                        </Alert>
                                    )}
                                    
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <Dropdown isOpen={exportDropdownOpenSindicats} toggle={() => setExportDropdownOpenSindicats(!exportDropdownOpenSindicats)}>
                                                <DropdownToggle color="success" caret>
                                                    <MdFileDownload className="me-1" />
                                                    Exporter
                                                </DropdownToggle>
                                                <DropdownMenu>
                                                    <DropdownItem onClick={() => {
                                                        setExportDropdownOpenSindicats(false);
                                                        handlePrintSindicats();
                                                    }}>
                                                        <MdPrint className="me-2" />
                                                        Imprimer
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => {
                                                        setExportDropdownOpenSindicats(false);
                                                        handleExportExcelSindicats();
                                                    }}>
                                                        <MdTableChart className="me-2" />
                                                        Excel (.xlsx)
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => {
                                                        setExportDropdownOpenSindicats(false);
                                                        handleExportPDFSindicats();
                                                    }}>
                                                        <MdPictureAsPdf className="me-2" />
                                                        PDF (.pdf)
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <Label className="me-2 mb-0" style={{ whiteSpace: 'nowrap' }}>Filtrer par syndicat:</Label>
                                            <Input
                                                type="select"
                                                value={selectedSindicatFilter}
                                                onChange={(e) => {
                                                    setSelectedSindicatFilter(e.target.value);
                                                    setCurrentPageSindicats(1);
                                                }}
                                                className="form-control-sm"
                                                style={{ width: '250px' }}
                                            >
                                                <option value="all">Tous les syndicats</option>
                                                {sindicats && sindicats.length > 0 ? (
                                                    sindicats.map(sind => (
                                                        <option key={sind.id} value={sind.id}>
                                                            {sind.libele}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>Chargement...</option>
                                                )}
                                            </Input>
                                            <Input
                                                type="text"
                                                placeholder="Rechercher un agent..."
                                                value={searchTermSindicats}
                                                onChange={(e) => {
                                                    setSearchTermSindicats(e.target.value);
                                                    setCurrentPageSindicats(1);
                                                }}
                                                className="form-control-sm"
                                                style={{ width: '250px', textTransform: 'uppercase' }}
                                            />
                                        </div>
                                    </div>

                                    {loadingSindicats ? (
                                        <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                                            <Spinner color="primary" />
                                        </div>
                                    ) : (
                                        <>
                                            {renderAgentsTableSindicats()}
                                            {renderPagination(currentPageSindicats, totalPagesSindicats, totalItemsSindicats, setCurrentPageSindicats, itemsPerPage)}
                                        </>
                                    )}
                                </TabPane>

                                {/* Onglet 3 : Gérer les Associations (entités de référence) */}
                                <TabPane tabId="3">
                                    <ManagementPage
                                        title="Gestion des Associations"
                                        description="Créer, modifier, supprimer et lister les associations"
                                        icon={MdGroupWork}
                                        apiEndpoint="/api/associations"
                                        fields={[
                                            { name: 'libele', label: 'Libellé', type: 'text', required: true },
                                            { name: 'description', label: 'Description', type: 'textarea', required: false }
                                        ]}
                                        searchFields={['libele', 'description']}
                                        breadcrumbs={[
                                            { name: 'Dashboard', active: false, link: '/' },
                                            { name: 'Vie Associative', active: false },
                                            { name: 'Associations', active: true }
                                        ]}
                                    />
                                </TabPane>

                                {/* Onglet 4 : Gérer les Syndicats (entités de référence) */}
                                <TabPane tabId="4">
                                    <ManagementPage
                                        title="Gestion des Syndicats"
                                        description="Créer, modifier, supprimer et lister les syndicats"
                                        icon={MdBusiness}
                                        apiEndpoint="/api/sindicats"
                                        fields={[
                                            { name: 'libele', label: 'Libellé', type: 'text', required: true }
                                        ]}
                                        searchFields={['libele']}
                                        breadcrumbs={[
                                            { name: 'Dashboard', active: false, link: '/' },
                                            { name: 'Vie Associative', active: false },
                                            { name: 'Syndicats', active: true }
                                        ]}
                                    />
                                </TabPane>
                            </TabContent>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modals pour les Associations */}
            <Modal isOpen={modalAssociation} toggle={toggleModalAssociation} size="lg">
                <ModalHeader toggle={toggleModalAssociation}>
                    Attribuer une association à {selectedAgentAssociation?.nom} {selectedAgentAssociation?.prenom}
                </ModalHeader>
                <Form onSubmit={handleSubmitAssociation}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="id_association">Association *</Label>
                                    <Input
                                        type="select"
                                        name="id_association"
                                        id="id_association"
                                        value={formDataAssociation.id_association}
                                        onChange={(e) => setFormDataAssociation({...formDataAssociation, id_association: e.target.value})}
                                        required
                                    >
                                        <option value="">Sélectionner une association</option>
                                        {associations.map(assoc => (
                                            <option key={assoc.id} value={assoc.id}>
                                                {assoc.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_adhesion">Date d'adhésion *</Label>
                                    <Input
                                        type="date"
                                        name="date_adhesion"
                                        id="date_adhesion"
                                        value={formDataAssociation.date_adhesion}
                                        onChange={(e) => setFormDataAssociation({...formDataAssociation, date_adhesion: e.target.value})}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_fin">Date de fin (optionnel)</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="date_fin"
                                        value={formDataAssociation.date_fin}
                                        onChange={(e) => setFormDataAssociation({...formDataAssociation, date_fin: e.target.value})}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="statut">Statut *</Label>
                                    <Input
                                        type="select"
                                        name="statut"
                                        id="statut"
                                        value={formDataAssociation.statut}
                                        onChange={(e) => setFormDataAssociation({...formDataAssociation, statut: e.target.value})}
                                        required
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="resigne">Démissionné</option>
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="role">Rôle dans l'association (optionnel)</Label>
                                    <Input
                                        type="text"
                                        name="role"
                                        id="role"
                                        value={formDataAssociation.role}
                                        onChange={(e) => setFormDataAssociation({...formDataAssociation, role: e.target.value})}
                                        placeholder="Ex: Membre, Secrétaire, Président..."
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="fichier_attestation_association">Fichier d'attestation d'adhésion (optionnel)</Label>
                                    <Input
                                        type="file"
                                        name="fichier_attestation"
                                        id="fichier_attestation_association"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Vérifier la taille du fichier (max 10MB)
                                                if (file.size > 10 * 1024 * 1024) {
                                                    setErrorAssociations('Le fichier est trop volumineux. Taille maximale : 10MB');
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setFichierAttestationAssociation(file);
                                                setErrorAssociations(null);
                                            } else {
                                                setFichierAttestationAssociation(null);
                                            }
                                        }}
                                    />
                                    {fichierAttestationAssociation && (
                                        <small className="text-muted d-block mt-1">
                                            Fichier sélectionné : {fichierAttestationAssociation.name} ({(fichierAttestationAssociation.size / 1024).toFixed(2)} KB)
                                        </small>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB)
                                    </small>
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModalAssociation}>Annuler</Button>
                        <Button color="primary" type="submit">Attribuer l'association</Button>
                    </ModalFooter>
                </Form>
            </Modal>

            <Modal isOpen={modalViewAssociations} toggle={toggleModalViewAssociations} size="lg">
                <ModalHeader toggle={toggleModalViewAssociations}>
                    Associations de {selectedAgentAssociation?.nom} {selectedAgentAssociation?.prenom}
                </ModalHeader>
                <ModalBody>
                    {loadingAssociations ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des associations...</p>
                        </div>
                    ) : selectedAgentAssociationsList.length > 0 ? (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Association</th>
                                    <th>Date d'adhésion</th>
                                    <th>Date de fin</th>
                                    <th>Rôle</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentAssociationsList.map((assoc, index) => (
                                    <tr key={assoc.id}>
                                        <td className="fw-bold">{index + 1}</td>
                                        <td className="fw-bold">{assoc.association_nom || 'N/A'}</td>
                                        <td>{formatDate(assoc.date_adhesion || assoc.created_at)}</td>
                                        <td>{formatDate(assoc.date_fin)}</td>
                                        <td>{assoc.role || '-'}</td>
                                        <td>{getStatutBadge(assoc.statut)}</td>
                                        <td>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                onClick={() => toggleModalEditAssociation(assoc)}
                                                style={{ marginRight: '5px' }}
                                            >
                                                <i className="fa fa-edit me-1"></i>
                                                Modifier
                                            </Button>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() => handleDeleteAssociation(assoc.id)}
                                            >
                                                <i className="fa fa-trash me-1"></i>
                                                Supprimer
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert color="info" className="mb-0">
                            Aucune association trouvée pour cet agent.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleModalViewAssociations}>Fermer</Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={modalEditAssociation} toggle={toggleModalEditAssociation} size="lg">
                <ModalHeader toggle={toggleModalEditAssociation}>
                    Modifier l'association de {selectedAgentAssociation?.nom} {selectedAgentAssociation?.prenom}
                </ModalHeader>
                <Form onSubmit={handleEditSubmitAssociation}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_id_association">Association *</Label>
                                    <Input
                                        type="select"
                                        name="id_association"
                                        id="edit_id_association"
                                        value={editFormDataAssociation.id_association}
                                        onChange={(e) => setEditFormDataAssociation({...editFormDataAssociation, id_association: e.target.value})}
                                        required
                                    >
                                        <option value="">Sélectionner une association</option>
                                        {associations.map(assoc => (
                                            <option key={assoc.id} value={String(assoc.id)}>
                                                {assoc.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_adhesion">Date d'adhésion *</Label>
                                    <Input
                                        type="date"
                                        name="date_adhesion"
                                        id="edit_date_adhesion"
                                        value={editFormDataAssociation.date_adhesion}
                                        onChange={(e) => setEditFormDataAssociation({...editFormDataAssociation, date_adhesion: e.target.value})}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_fin">Date de fin (optionnel)</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="edit_date_fin"
                                        value={editFormDataAssociation.date_fin}
                                        onChange={(e) => setEditFormDataAssociation({...editFormDataAssociation, date_fin: e.target.value})}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_statut">Statut *</Label>
                                    <Input
                                        type="select"
                                        name="statut"
                                        id="edit_statut"
                                        value={editFormDataAssociation.statut}
                                        onChange={(e) => setEditFormDataAssociation({...editFormDataAssociation, statut: e.target.value})}
                                        required
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="resigne">Démissionné</option>
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="edit_role">Rôle dans l'association (optionnel)</Label>
                                    <Input
                                        type="text"
                                        name="role"
                                        id="edit_role"
                                        value={editFormDataAssociation.role}
                                        onChange={(e) => setEditFormDataAssociation({...editFormDataAssociation, role: e.target.value})}
                                        placeholder="Ex: Membre, Secrétaire, Président..."
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="edit_fichier_attestation_association">Fichier d'attestation d'adhésion</Label>
                                    {existingFichierAttestationAssociation && (
                                        <div className="mb-2 p-2 bg-light rounded">
                                            <small className="text-muted d-block">
                                                <i className="fa fa-file me-1"></i>
                                                Fichier actuel : {existingFichierAttestationAssociation.nom}
                                                {existingFichierAttestationAssociation.taille && (
                                                    <span> ({(existingFichierAttestationAssociation.taille / 1024).toFixed(2)} KB)</span>
                                                )}
                                            </small>
                                            {existingFichierAttestationAssociation.url && (
                                                <button
                                                    type="button"
                                                    onClick={() => downloadFile(
                                                        selectedAssociationItem.id,
                                                        existingFichierAttestationAssociation.nom || 'attestation',
                                                        false
                                                    )}
                                                    className="btn btn-sm btn-link p-0 mt-1 text-decoration-none"
                                                    style={{ border: 'none', background: 'none', padding: 0 }}
                                                >
                                                    <i className="fa fa-download me-1"></i>
                                                    Télécharger le fichier actuel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <Input
                                        type="file"
                                        name="fichier_attestation"
                                        id="edit_fichier_attestation_association"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Vérifier la taille du fichier (max 10MB)
                                                if (file.size > 10 * 1024 * 1024) {
                                                    setErrorAssociations('Le fichier est trop volumineux. Taille maximale : 10MB');
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setEditFichierAttestationAssociation(file);
                                                setErrorAssociations(null);
                                            } else {
                                                setEditFichierAttestationAssociation(null);
                                            }
                                        }}
                                    />
                                    {editFichierAttestationAssociation && (
                                        <small className="text-success d-block mt-1">
                                            <i className="fa fa-check me-1"></i>
                                            Nouveau fichier sélectionné : {editFichierAttestationAssociation.name} ({(editFichierAttestationAssociation.size / 1024).toFixed(2)} KB)
                                        </small>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        {existingFichierAttestationAssociation 
                                            ? 'Sélectionner un nouveau fichier pour remplacer le fichier actuel' 
                                            : 'Sélectionner un fichier pour ajouter une attestation'}
                                        . Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB)
                                    </small>
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModalEditAssociation}>Annuler</Button>
                        <Button color="primary" type="submit">Enregistrer les modifications</Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modals pour les Syndicats (similaires aux associations) */}
            <Modal isOpen={modalSindicat} toggle={toggleModalSindicat} size="lg">
                <ModalHeader toggle={toggleModalSindicat}>
                    Attribuer un syndicat à {selectedAgentSindicat?.nom} {selectedAgentSindicat?.prenom}
                </ModalHeader>
                <Form onSubmit={handleSubmitSindicat}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="id_sindicat">Syndicat *</Label>
                                    <Input
                                        type="select"
                                        name="id_sindicat"
                                        id="id_sindicat"
                                        value={formDataSindicat.id_sindicat}
                                        onChange={(e) => setFormDataSindicat({...formDataSindicat, id_sindicat: e.target.value})}
                                        required
                                    >
                                        <option value="">Sélectionner un syndicat</option>
                                        {sindicats.map(sind => (
                                            <option key={sind.id} value={sind.id}>
                                                {sind.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_adhesion_sindicat">Date d'adhésion *</Label>
                                    <Input
                                        type="date"
                                        name="date_adhesion"
                                        id="date_adhesion_sindicat"
                                        value={formDataSindicat.date_adhesion}
                                        onChange={(e) => setFormDataSindicat({...formDataSindicat, date_adhesion: e.target.value})}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_fin_sindicat">Date de fin (optionnel)</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="date_fin_sindicat"
                                        value={formDataSindicat.date_fin}
                                        onChange={(e) => setFormDataSindicat({...formDataSindicat, date_fin: e.target.value})}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="statut_sindicat">Statut *</Label>
                                    <Input
                                        type="select"
                                        name="statut"
                                        id="statut_sindicat"
                                        value={formDataSindicat.statut}
                                        onChange={(e) => setFormDataSindicat({...formDataSindicat, statut: e.target.value})}
                                        required
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="resigne">Démissionné</option>
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="role_sindicat">Rôle dans le syndicat (optionnel)</Label>
                                    <Input
                                        type="text"
                                        name="role"
                                        id="role_sindicat"
                                        value={formDataSindicat.role}
                                        onChange={(e) => setFormDataSindicat({...formDataSindicat, role: e.target.value})}
                                        placeholder="Ex: Membre, Secrétaire, Président..."
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="fichier_attestation_sindicat">Fichier d'attestation d'adhésion (optionnel)</Label>
                                    <Input
                                        type="file"
                                        name="fichier_attestation"
                                        id="fichier_attestation_sindicat"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Vérifier la taille du fichier (max 10MB)
                                                if (file.size > 10 * 1024 * 1024) {
                                                    setErrorSindicats('Le fichier est trop volumineux. Taille maximale : 10MB');
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setFichierAttestationSindicat(file);
                                                setErrorSindicats(null);
                                            } else {
                                                setFichierAttestationSindicat(null);
                                            }
                                        }}
                                    />
                                    {fichierAttestationSindicat && (
                                        <small className="text-muted d-block mt-1">
                                            Fichier sélectionné : {fichierAttestationSindicat.name} ({(fichierAttestationSindicat.size / 1024).toFixed(2)} KB)
                                        </small>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB)
                                    </small>
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModalSindicat}>Annuler</Button>
                        <Button color="primary" type="submit">Attribuer le syndicat</Button>
                    </ModalFooter>
                </Form>
            </Modal>

            <Modal isOpen={modalViewSindicats} toggle={toggleModalViewSindicats} size="lg">
                <ModalHeader toggle={toggleModalViewSindicats}>
                    Syndicats de {selectedAgentSindicat?.nom} {selectedAgentSindicat?.prenom}
                </ModalHeader>
                <ModalBody>
                    {loadingSindicats ? (
                        <div className="text-center py-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des syndicats...</p>
                        </div>
                    ) : selectedAgentSindicatsList.length > 0 ? (
                        <Table hover responsive>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Syndicat</th>
                                    <th>Date d'adhésion</th>
                                    <th>Date de fin</th>
                                    <th>Rôle</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAgentSindicatsList.map((sind, index) => (
                                    <tr key={sind.id}>
                                        <td className="fw-bold">{index + 1}</td>
                                        <td className="fw-bold">{sind.sindicat_nom || 'N/A'}</td>
                                        <td>{formatDate(sind.date_adhesion || sind.created_at)}</td>
                                        <td>{formatDate(sind.date_fin)}</td>
                                        <td>{sind.role || '-'}</td>
                                        <td>{getStatutBadge(sind.statut)}</td>
                                        <td>
                                            <Button
                                                color="warning"
                                                size="sm"
                                                onClick={() => toggleModalEditSindicat(sind)}
                                                style={{ marginRight: '5px' }}
                                            >
                                                <i className="fa fa-edit me-1"></i>
                                                Modifier
                                            </Button>
                                            <Button
                                                color="danger"
                                                size="sm"
                                                onClick={() => handleDeleteSindicat(sind.id)}
                                            >
                                                <i className="fa fa-trash me-1"></i>
                                                Supprimer
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert color="info" className="mb-0">
                            Aucun syndicat trouvé pour cet agent.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleModalViewSindicats}>Fermer</Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={modalEditSindicat} toggle={toggleModalEditSindicat} size="lg">
                <ModalHeader toggle={toggleModalEditSindicat}>
                    Modifier le syndicat de {selectedAgentSindicat?.nom} {selectedAgentSindicat?.prenom}
                </ModalHeader>
                <Form onSubmit={handleEditSubmitSindicat}>
                    <ModalBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_id_sindicat">Syndicat *</Label>
                                    <Input
                                        type="select"
                                        name="id_sindicat"
                                        id="edit_id_sindicat"
                                        value={editFormDataSindicat.id_sindicat}
                                        onChange={(e) => setEditFormDataSindicat({...editFormDataSindicat, id_sindicat: e.target.value})}
                                        required
                                    >
                                        <option value="">Sélectionner un syndicat</option>
                                        {sindicats.map(sind => (
                                            <option key={sind.id} value={String(sind.id)}>
                                                {sind.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_adhesion_sindicat">Date d'adhésion *</Label>
                                    <Input
                                        type="date"
                                        name="date_adhesion"
                                        id="edit_date_adhesion_sindicat"
                                        value={editFormDataSindicat.date_adhesion}
                                        onChange={(e) => setEditFormDataSindicat({...editFormDataSindicat, date_adhesion: e.target.value})}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_date_fin_sindicat">Date de fin (optionnel)</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="edit_date_fin_sindicat"
                                        value={editFormDataSindicat.date_fin}
                                        onChange={(e) => setEditFormDataSindicat({...editFormDataSindicat, date_fin: e.target.value})}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="edit_statut_sindicat">Statut *</Label>
                                    <Input
                                        type="select"
                                        name="statut"
                                        id="edit_statut_sindicat"
                                        value={editFormDataSindicat.statut}
                                        onChange={(e) => setEditFormDataSindicat({...editFormDataSindicat, statut: e.target.value})}
                                        required
                                    >
                                        <option value="actif">Actif</option>
                                        <option value="inactif">Inactif</option>
                                        <option value="resigne">Démissionné</option>
                                    </Input>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="edit_role_sindicat">Rôle dans le syndicat (optionnel)</Label>
                                    <Input
                                        type="text"
                                        name="role"
                                        id="edit_role_sindicat"
                                        value={editFormDataSindicat.role}
                                        onChange={(e) => setEditFormDataSindicat({...editFormDataSindicat, role: e.target.value})}
                                        placeholder="Ex: Membre, Secrétaire, Président..."
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="edit_fichier_attestation_sindicat">Fichier d'attestation d'adhésion</Label>
                                    {existingFichierAttestationSindicat && (
                                        <div className="mb-2 p-2 bg-light rounded">
                                            <small className="text-muted d-block">
                                                <i className="fa fa-file me-1"></i>
                                                Fichier actuel : {existingFichierAttestationSindicat.nom}
                                                {existingFichierAttestationSindicat.taille && (
                                                    <span> ({(existingFichierAttestationSindicat.taille / 1024).toFixed(2)} KB)</span>
                                                )}
                                            </small>
                                            {existingFichierAttestationSindicat.url && (
                                                <button
                                                    type="button"
                                                    onClick={() => downloadFile(
                                                        selectedSindicatItem.id,
                                                        existingFichierAttestationSindicat.nom || 'attestation',
                                                        true
                                                    )}
                                                    className="btn btn-sm btn-link p-0 mt-1 text-decoration-none"
                                                    style={{ border: 'none', background: 'none', padding: 0 }}
                                                >
                                                    <i className="fa fa-download me-1"></i>
                                                    Télécharger le fichier actuel
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <Input
                                        type="file"
                                        name="fichier_attestation"
                                        id="edit_fichier_attestation_sindicat"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                // Vérifier la taille du fichier (max 10MB)
                                                if (file.size > 10 * 1024 * 1024) {
                                                    setErrorSindicats('Le fichier est trop volumineux. Taille maximale : 10MB');
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setEditFichierAttestationSindicat(file);
                                                setErrorSindicats(null);
                                            } else {
                                                setEditFichierAttestationSindicat(null);
                                            }
                                        }}
                                    />
                                    {editFichierAttestationSindicat && (
                                        <small className="text-success d-block mt-1">
                                            <i className="fa fa-check me-1"></i>
                                            Nouveau fichier sélectionné : {editFichierAttestationSindicat.name} ({(editFichierAttestationSindicat.size / 1024).toFixed(2)} KB)
                                        </small>
                                    )}
                                    <small className="text-muted d-block mt-1">
                                        {existingFichierAttestationSindicat 
                                            ? 'Sélectionner un nouveau fichier pour remplacer le fichier actuel' 
                                            : 'Sélectionner un fichier pour ajouter une attestation'}
                                        . Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG (max 10MB)
                                    </small>
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModalEditSindicat}>Annuler</Button>
                        <Button color="primary" type="submit">Enregistrer les modifications</Button>
                    </ModalFooter>
                </Form>
            </Modal>
        </Page>
    );
};

export default VieAssociativePage;

