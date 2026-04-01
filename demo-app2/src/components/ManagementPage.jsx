import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Button,
    Table,
    Row,
    Col,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    Badge,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Alert,
    Spinner,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'reactstrap';
import Page from './Page';
import Pagination from './Pagination';
import { getColor } from 'utils/colors';
import { useAuth } from 'contexts/AuthContext';
import { MdVisibility, MdPeople, MdSearch, MdEdit, MdFileDownload, MdPictureAsPdf, MdDescription, MdPrint, MdInfo } from 'react-icons/md';
import { useHistory } from 'react-router-dom';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

const ManagementPage = ({ 
    title, 
    description, 
    icon: Icon, 
    apiEndpoint, 
    fields = [],
    searchFields = [],
    breadcrumbs = [],
    displayColumns = null,
    user: userProp,
    customAddButton = null,
    onEditAgent = null
}) => {
    const { user: authUser } = useAuth();
    const user = userProp || authUser;
    const history = useHistory();
    
    // Fonction helper pour convertir en majuscules les valeurs textuelles
    const handleInputValueChange = (fieldName, value) => {
        let processedValue = value;
        // Ne pas convertir en majuscules pour les champs de sélection et email
        if (typeof value === 'string' && fieldName !== 'email' && fieldName !== 'type_service' && fieldName !== 'direction_id' && fieldName !== 'sous_direction_id' && fieldName !== 'responsable_id') {
            processedValue = value.toUpperCase();
        }
        return processedValue;
    };
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoadRef = useRef(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [directionGeneraleFilter, setDirectionGeneraleFilter] = useState('');
    const [directionGeneraleOptions, setDirectionGeneraleOptions] = useState([]);
    const [modal, setModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [dynamicOptions, setDynamicOptions] = useState({});
    const [agentsModal, setAgentsModal] = useState(false);
    const [directionAgents, setDirectionAgents] = useState([]);
    const [filteredAgents, setFilteredAgents] = useState([]);
    const [selectedDirection, setSelectedDirection] = useState(null);
    const [selectedDirectionGenerale, setSelectedDirectionGenerale] = useState(null);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [agentSearchTerm, setAgentSearchTerm] = useState('');
    
    // États pour les agents de sous-direction
    const [sousDirectionAgents, setSousDirectionAgents] = useState([]);
    const [selectedSousDirection, setSelectedSousDirection] = useState(null);
    
    // États pour la recherche d'agents avec autocomplétion
    const [agentSearchResults, setAgentSearchResults] = useState({});
    const [agentSearchLoading, setAgentSearchLoading] = useState({});
    const [agentSearchVisible, setAgentSearchVisible] = useState({});
    const [agentSearchValues, setAgentSearchValues] = useState({});
    const [scrollableSelectVisible, setScrollableSelectVisible] = useState({});
    const [scrollableSelectSearch, setScrollableSelectSearch] = useState({});
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    
    // États pour les modals de motif
    const [motifRetraitModal, setMotifRetraitModal] = useState(false);
    const [motifAfficherModal, setMotifAfficherModal] = useState(false);
    const [agentIdPourRetrait, setAgentIdPourRetrait] = useState(null);
    const [motifRetraitText, setMotifRetraitText] = useState('');
    const [agentMotifAfficher, setAgentMotifAfficher] = useState(null);
    const [historiqueMotifs, setHistoriqueMotifs] = useState([]);
    const [loadingHistorique, setLoadingHistorique] = useState(false);
    
    // États pour la pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [paginationInfo, setPaginationInfo] = useState({
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
        startIndex: 0,
        endIndex: 0
    });

    // Fonction pour déterminer si une table doit être filtrée par organisation
    const shouldFilterByOrganization = (tableName) => {
        // Les super_admin ne sont pas filtrés par organisation
        if (user && user.role === 'super_admin') {
            return false;
        }
        
        const tablesToFilter = [
            'agents', 'directions', 'directions-generales', 'directions-entites', 'entites', 'ministeres',
            'emplois', 'fonctions',
            'agents-institutions', 'enfants-institutions', 'entites-institutions',
            'services-institutions', 'type-seminaire-institutions', 'type-documents-institutions',
            'tiers-institutions', 'dossiers-institutions', 'classeurs-institutions',
            'agents-entites-institutions', 'affectations-temporaires-institutions',
            'permissions-entites-institutions'
        ];
        return tablesToFilter.includes(tableName);
    };

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Fonction pour charger les options dynamiques
    const loadDynamicOptions = async () => {
        console.log('🔍 DEBUG - loadDynamicOptions appelée');
        const options = {};
        
        // Mapper les champs qui ont besoin d'options dynamiques
        const dynamicFields = fields.filter(field => 
            field.type === 'select' && (field.dynamicTable || field.dynamicEndpoint)
        );
        
        console.log('🔍 DEBUG - dynamicFields trouvés:', dynamicFields.length);
        dynamicFields.forEach(field => {
            console.log(`🔍 DEBUG - Field: ${field.name}, dynamicTable: ${field.dynamicTable}`);
        });

        for (const field of dynamicFields) {
            try {
                // Construire l'URL - utiliser dynamicEndpoint si disponible, sinon dynamicTable
                let url;
                if (field.dynamicEndpoint) {
                    url = `https://tourisme.2ise-groupe.com${field.dynamicEndpoint}`;
                } else {
                    url = `https://tourisme.2ise-groupe.com/api/${field.dynamicTable}`;
                }
                
                // Pour les directions, ajouter le filtrage par ministère
                // Pour les directions, ajouter le filtrage par ministère et charger toutes les entrées (liste déroulante)
                if (field.dynamicTable === 'directions') {
                    const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : (user?.id_ministere || 1);
                    url += `?limit=1000&id_ministere=${ministereId}`;
                    console.log(`🔍 DEBUG DIRECTIONS - Filtrage par ministère ${ministereId}:`, url);
                }
                // Pour les sous-directions, ajouter le filtrage par ministère et charger toutes les entrées (liste déroulante)
                else if (field.dynamicTable === 'sous_directions') {
                    const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : (user?.id_ministere || 1);
                    url += `?limit=1000&id_ministere=${ministereId}`;
                    console.log(`🔍 DEBUG SOUS_DIRECTIONS - Filtrage par ministère ${ministereId}:`, url);
                }
                // Pour les directions générales, ajouter le filtrage par ministère
                else if (field.dynamicTable === 'directions-generales') {
                    const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : user?.id_ministere;
                    if (ministereId) {
                        url += `?limit=1000&id_ministere=${ministereId}`;
                    } else {
                        url += '?limit=1000';
                    }
                    console.log(`🔍 DEBUG DIRECTIONS_GENERALES - Filtrage par ministère:`, url);
                }
                // Pour emplois et fonctions, ajouter le filtrage par ministère (listes déroulantes)
                else if (field.dynamicTable === 'emplois' || field.dynamicTable === 'fonctions') {
                    const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : (user?.id_ministere || 1);
                    if (ministereId) {
                        url += (url.includes('?') ? '&' : '?') + `id_ministere=${ministereId}`;
                    }
                    if (field.dynamicTable === 'emplois' && !url.includes('limit')) {
                        url += (url.includes('?') ? '&' : '?') + 'limit=1000';
                    }
                    if (field.dynamicTable === 'fonctions' && !url.includes('limit')) {
                        url += (url.includes('?') ? '&' : '?') + 'limit=1000';
                    }
                }
                // Pour les nationalités et autres tables de référence, charger toutes les données sans pagination
                else if (field.dynamicTable === 'nationalites') {
                    url += '?limit=1000'; // Charger toutes les nationalités
                    console.log('🔍 DEBUG NATIONALITES - Chargement de toutes les nationalités:', url);
                } else if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                    console.log('🔍 DEBUG AGENTS - Début du filtrage');
                    console.log('🔍 DEBUG AGENTS - Route actuelle:', window.location.pathname);
                    console.log('🔍 DEBUG AGENTS - User object:', user);
                    console.log('🔍 DEBUG AGENTS - User id_agent:', user?.id_agent);
                    
                    // Déterminer le type de filtrage selon la route
                    const currentRoute = window.location.pathname;
                    let filterParam = '';
                    
                    console.log('🔍 DEBUG AGENTS - Route détectée:', currentRoute);
                    console.log('🔍 DEBUG AGENTS - Contient directions-entites:', currentRoute.includes('/directions-entites'));
                    console.log('🔍 DEBUG AGENTS - Contient services-entites-ministres:', currentRoute.includes('/services-entites-ministres'));
                    
                    // Déterminer le type de filtrage selon le contexte
                    if (currentRoute.includes('/services-entites-ministres')) {
                        // Pour les services d'entités, filtrer par entité de l'utilisateur
                        console.log('🔍 DEBUG AGENTS - Filtrage par ENTITÉ (services d\'entités)');
                        
                        if (user?.id_agent) {
                            try {
                                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                                    headers: getAuthHeaders()
                                });
                                if (agentResponse.ok) {
                                    const agentData = await agentResponse.json();
                                    const userEntiteId = agentData.data?.id_entite_principale;
                                    console.log('🔍 DEBUG AGENTS - Entité de l\'utilisateur:', userEntiteId);
                                    
                                    if (userEntiteId) {
                                        // Filtrer par entité spécifique (agents d'entités uniquement)
                                        filterParam = `id_entite=${userEntiteId}`;
                                    }
                                }
                            } catch (err) {
                                console.error('❌ DEBUG AGENTS - Erreur lors de la récupération de l\'entité:', err);
                            }
                        }
                    } else {
                        // Pour tous les autres contextes, filtrer par ministère (agents de ministère uniquement)
                        console.log('🔍 DEBUG AGENTS - Filtrage par MINISTÈRE (agents de ministère uniquement)');
                        
                        let userMinistereId = null;
                        
                        // Récupérer l'ID du ministère depuis l'organisation de l'utilisateur
                        if (user?.organization?.type === 'ministere') {
                            userMinistereId = user.organization.id;
                            console.log('🔍 DEBUG AGENTS - Ministère depuis organisation:', userMinistereId);
                        } else if (user?.id_agent) {
                            // Fallback: récupérer depuis l'agent si pas d'organisation
                            try {
                                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                                    headers: getAuthHeaders()
                                });
                                if (agentResponse.ok) {
                                    const agentData = await agentResponse.json();
                                    userMinistereId = agentData.data?.id_ministere;
                                    console.log('🔍 DEBUG AGENTS - Ministère récupéré depuis agent:', userMinistereId);
                                }
                            } catch (err) {
                                console.error('❌ DEBUG AGENTS - Erreur lors de la récupération du ministère:', err);
                            }
                        }
                        
                        if (userMinistereId) {
                            // Filtrer par ministère ET exclure les agents d'entités (id_entite_principale IS NULL)
                            // Ajouter for_select=true pour obtenir plus d'agents dans les listes déroulantes
                            filterParam = `id_ministere=${userMinistereId}&for_select=true`;
                        }
                    }
                    
                    if (filterParam) {
                        url += `?${filterParam}`;
                        console.log('🔍 DEBUG AGENTS - URL avec filtrage:', url);
                    } else {
                        console.log('⚠️ DEBUG AGENTS - Aucun filtre trouvé, URL sans filtrage:', url);
                    }
                }
                
                const fieldIdentifier = field.dynamicTable || field.dynamicEndpoint || field.name;
                console.log(`🔍 DEBUG ${fieldIdentifier?.toUpperCase()} - URL:`, url);
                console.log(`🔍 DEBUG ${fieldIdentifier?.toUpperCase()} - Headers:`, getAuthHeaders());
                
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                
                console.log(`🔍 DEBUG ${fieldIdentifier?.toUpperCase()} - Réponse API:`, response.status, response.statusText);
                
                if (!response.ok) {
                    console.error(`❌ Erreur API pour ${fieldIdentifier}:`, response.status, response.statusText);
                    
                    // Afficher plus de détails sur l'erreur
                    if (response.status === 401) {
                        console.error(`🔐 Erreur d'authentification - Token manquant ou invalide pour ${fieldIdentifier}`);
                        console.error(`   Vérifiez que l'utilisateur est bien connecté`);
                    }
                    
                    // En cas d'erreur, initialiser avec un tableau vide
                    options[field.name] = [];
                    setDynamicOptions({ ...options });
                    continue;
                }
                
                const result = await response.json();
                
                if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions' || field.dynamicEndpoint === '/api/user-accounts/available-agents') {
                    console.log('🔍 DEBUG AGENTS - Résultat:', result);
                }
                
                if (result.success || result.data) {
                    const data = result.data || result;
                    
                    // Vérifier que data est un tableau
                    if (!Array.isArray(data)) {
                        const fieldIdentifier = field.dynamicTable || field.dynamicEndpoint || field.name;
                        console.error(`❌ Données invalides pour ${fieldIdentifier}:`, data);
                        options[field.name] = [];
                        setDynamicOptions({ ...options });
                        continue;
                    }
                    
                    if (field.dynamicTable === 'nationalites') {
                        console.log('🔍 DEBUG NATIONALITES - Données reçues:', data.length, 'nationalités');
                        data.forEach((nationalite, index) => {
                            console.log(`   ${index + 1}. ${nationalite.libele || nationalite.libelle}`);
                        });
                    } else if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions' || field.dynamicEndpoint === '/api/user-accounts/available-agents') {
                        console.log('🔍 DEBUG AGENTS - Données reçues:', data.length, 'agents');
                        data.forEach((agent, index) => {
                            console.log(`   ${index + 1}. ${agent.nom} ${agent.prenom} (Ministère: ${agent.id_ministere})`);
                        });
                    }
                    
                    // Créer des objets avec id et label pour le mapping
                    const mappedData = data.map(item => {
                        // Utiliser dynamicValue si défini, sinon utiliser 'id'
                        const valueField = field.dynamicValue || 'id';
                        const value = item[valueField] || item.id;
                        
                        // Construire le label selon le champ dynamique
                        let label;
                        if (field.customLabel && typeof field.customLabel === 'function') {
                            // Utiliser la fonction customLabel si définie
                            label = field.customLabel(item);
                        } else if (field.dynamicField === 'display_name') {
                            // Pour les agents, construire display_name si non présent
                            label = item.display_name || `${item.nom || ''} ${item.prenom || ''} (${item.matricule || ''})`.trim();
                        } else {
                            label = item[field.dynamicField] || item.libele || item.libelle || item.code || item.nom || `${item.nom || ''} ${item.prenom || ''}`.trim();
                        }
                        
                        return {
                            id: value,
                            value: value,
                            label: label
                        };
                    });
                    options[field.name] = mappedData;
                    
                    if (field.dynamicTable === 'nationalites') {
                        console.log('🔍 DEBUG NATIONALITES - Options mappées:', mappedData.length, 'options');
                        mappedData.forEach((option, index) => {
                            console.log(`   ${index + 1}. ${option.label} (ID: ${option.id})`);
                        });
                    } else if (field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions') {
                        console.log('🔍 DEBUG AGENTS - Options mappées:', mappedData.length, 'options');
                    }
                } else {
                    console.error(`❌ Réponse API invalide pour ${field.dynamicTable}:`, result);
                    options[field.name] = [];
                }
            } catch (err) {
                console.error(`Erreur lors du chargement des options pour ${field.name}:`, err);
                options[field.name] = [];
            }
        }
        
        setDynamicOptions(options);
    };


    // Charger les agents d'une direction
    const loadDirectionAgents = async (directionId) => {
        try {
            setLoadingAgents(true);
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/directions/${directionId}/agents`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                setDirectionAgents(result.data.agents);
                setSelectedDirection(result.data.direction);
                setAgentsModal(true);
            } else {
                setError('Erreur lors du chargement des agents');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoadingAgents(false);
        }
    };

    // Charger les agents d'une direction générale (rattachés directement à la DG)
    const loadDirectionGeneraleAgents = async (dg) => {
        try {
            setLoadingAgents(true);
            setAgentSearchTerm('');
            setSelectedDirection(null);
            setSelectedSousDirection(null);
            setSelectedDirectionGenerale(dg);
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/directions-generales/${dg.id}/agents`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (result.success) {
                const formatted = (result.data || []).map(agent => ({
                    ...agent,
                    nom_complet: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
                    fonction_libele: agent.type_agent || '-',
                    statut_emploi_libelle: 'Actif'
                }));
                setDirectionAgents(formatted);
                setAgentsModal(true);
            } else {
                setError('Erreur lors du chargement des agents');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoadingAgents(false);
        }
    };

    const loadSousDirectionAgents = async (sousDirectionId) => {
        try {
            setLoadingAgents(true);
            setAgentSearchTerm(''); // Réinitialiser la recherche
            setSelectedDirection(null); // Réinitialiser la direction sélectionnée
            
            // Charger tous les agents avec pagination
            let allAgents = [];
            let page = 1;
            let hasMore = true;
            let sousDirectionData = null;
            
            while (hasMore) {
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/sous-directions/${sousDirectionId}/agents?page=${page}&limit=1000`, {
                    headers: getAuthHeaders()
                });
                const result = await response.json();
                
                if (result.success) {
                    if (!sousDirectionData) {
                        sousDirectionData = result.data.sous_direction;
                    }
                    const pageAgents = result.data.agents || [];
                    allAgents = [...allAgents, ...pageAgents];
                    
                    const pagination = result.pagination || {};
                    const totalPages = pagination.pages || pagination.total_pages || 1;
                    hasMore = page < totalPages;
                    page++;
                } else {
                    hasMore = false;
                }
            }
            
            // Formater les agents pour avoir nom_complet et fonction_libele
            const formattedAgents = allAgents.map(agent => ({
                ...agent,
                nom_complet: `${agent.prenom || ''} ${agent.nom || ''}`.trim(),
                fonction_libele: agent.fonction_libele || agent.fonction_actuelle || '-',
                statut_emploi_libelle: agent.statut_emploi === 'actif' ? 'Actif' : 'Inactif'
            }));
            
            setSousDirectionAgents(formattedAgents);
            setSelectedSousDirection(sousDirectionData || { id: sousDirectionId, libelle: 'Sous-direction' });
            setDirectionAgents(formattedAgents); // Utiliser le même état pour la modal
            setAgentsModal(true);
        } catch (err) {
            console.error('Erreur lors du chargement des agents de sous-direction:', err);
            setError('Erreur de connexion au serveur');
        } finally {
            setLoadingAgents(false);
        }
    };

    // Filtrer les agents par nom et matricule
    const filterAgents = (agents, searchTerm) => {
        if (!searchTerm) return agents;
        return agents.filter(agent => 
            agent.nom_complet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.matricule?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Fonction pour rechercher des agents avec autocomplétion
    const searchAgents = async (fieldName, searchTerm) => {
        console.log(`🔍 DEBUG - searchAgents appelé pour ${fieldName} avec:`, searchTerm);
        
        if (!searchTerm || searchTerm.length < 2) {
            setAgentSearchResults(prev => ({ ...prev, [fieldName]: [] }));
            return;
        }

        setAgentSearchLoading(prev => ({ ...prev, [fieldName]: true }));

        try {
            // URL simplifiée pour la recherche d'agents
            let url = 'https://tourisme.2ise-groupe.com/api/agents';
            
            // Force le filtrage par ministère du tourisme (ID: 1) pour simplifier
            const ministereId = 1;
            const searchParam = `search=${encodeURIComponent(searchTerm)}`;
            const params = `id_ministere=${ministereId}&for_select=true&${searchParam}`;
            
            url += `?${params}`;
            console.log(`🔍 DEBUG - URL de recherche agents:`, url);
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            const result = await response.json();

            if (result.success || result.data) {
                const data = result.data || result;
                const mappedData = data.map(item => ({
                    id: item.id,
                    value: item.id,
                    label: item.nom_prenom || `${item.prenom || ''} ${item.nom || ''}`.trim(),
                    matricule: item.matricule,
                    nom_complet: item.nom_complet
                }));
                
                setAgentSearchResults(prev => ({ ...prev, [fieldName]: mappedData }));
            }
        } catch (error) {
            console.error(`Erreur lors de la recherche d'agents pour ${fieldName}:`, error);
            setAgentSearchResults(prev => ({ ...prev, [fieldName]: [] }));
        } finally {
            setAgentSearchLoading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    // Fonction pour gérer le changement de recherche d'agent
    const handleAgentSearchChange = (fieldName, value) => {
        console.log(`🔍 DEBUG - handleAgentSearchChange appelé pour ${fieldName} avec:`, value);
        
        // Stocker la valeur de recherche pour l'affichage
        setAgentSearchValues(prev => ({ ...prev, [fieldName]: value }));
        
        // Rechercher des agents si la valeur change
        if (value && value.length >= 2) {
            console.log(`🔍 DEBUG - Lancement de la recherche pour:`, value);
            searchAgents(fieldName, value);
            setAgentSearchVisible(prev => ({ ...prev, [fieldName]: true }));
        } else {
            console.log(`🔍 DEBUG - Réinitialisation des résultats de recherche`);
            setAgentSearchResults(prev => ({ ...prev, [fieldName]: [] }));
            setAgentSearchVisible(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    // Fonction pour sélectionner un agent
    const selectAgent = (fieldName, agent) => {
        console.log(`🔍 DEBUG - selectAgent appelé pour ${fieldName} avec:`, agent);
        setFormData(prev => ({ ...prev, [fieldName]: agent.id }));
        setAgentSearchVisible(prev => ({ ...prev, [fieldName]: false }));
        setAgentSearchValues(prev => ({ ...prev, [fieldName]: '' }));
    };

    // Sélection pour listes scrollables (directions, sous-directions)
    const selectScrollableOption = (fieldName, value, field) => {
        setFormData(prev => {
            const next = { ...prev, [fieldName]: value };
            if (fieldName === 'direction_id' || fieldName === 'id_direction') {
                next.sous_direction_id = null;
                next.id_sous_direction = null;
            }
            return next;
        });
        setScrollableSelectVisible(prev => ({ ...prev, [fieldName]: false }));
        setScrollableSelectSearch(prev => ({ ...prev, [fieldName]: '' }));
        if (value && (fieldName === 'direction_id' || fieldName === 'id_direction')) {
            handleCascadeChange(fieldName, value);
        } else if (field.cascadeTrigger && value) {
            handleCascadeChange(fieldName, value);
        }
    };

    // Fonction pour gérer les changements en cascade
    const handleCascadeChange = async (fieldName, value) => {
        console.log(`🔍 DEBUG - handleCascadeChange appelé pour ${fieldName} avec:`, value);
        
        const newFormData = { ...formData, [fieldName]: value };
        
        // Si on change la direction, réinitialiser la sous-direction (supporter les deux noms de champs)
        if (fieldName === 'direction_id' || fieldName === 'id_direction') {
            newFormData.sous_direction_id = null;
            newFormData.id_sous_direction = null;
            
            // Charger les sous-directions de cette direction
            if (value) {
                try {
                    // Récupérer l'ID du ministère depuis l'organisation de l'utilisateur
                    let ministereId = null;
                    if (user?.organization?.type === 'ministere') {
                        ministereId = user.organization.id;
                        console.log('🔍 DEBUG - Ministère depuis organisation:', ministereId);
                    } else if (user?.id_agent) {
                        // Fallback: récupérer depuis l'agent si pas d'organisation
                        try {
                            const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                                headers: getAuthHeaders()
                            });
                            if (agentResponse.ok) {
                                const agentData = await agentResponse.json();
                                ministereId = agentData.data?.id_ministere;
                                console.log('🔍 DEBUG - Ministère récupéré depuis agent:', ministereId);
                            }
                        } catch (err) {
                            console.error('❌ DEBUG - Erreur lors de la récupération du ministère:', err);
                        }
                    }
                    
                    if (!ministereId) {
                        console.warn('⚠️ DEBUG - Aucun ministère trouvé pour l\'utilisateur, sous-directions non filtrées par ministère');
                    }
                    
                    const url = ministereId 
                        ? `https://tourisme.2ise-groupe.com/api/sous_directions?id_direction=${value}&id_ministere=${ministereId}`
                        : `https://tourisme.2ise-groupe.com/api/sous_directions?id_direction=${value}`;
                    console.log(`🔍 DEBUG - Chargement des sous-directions:`, url);
                    
                    const response = await fetch(url, {
                        headers: getAuthHeaders()
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            const mappedOptions = result.data.map(item => ({
                                id: item.id,
                                value: item.id,
                                label: item.libelle
                            }));
                            
                            // Supporter les deux noms de champs
                            setDynamicOptions(prev => ({
                                ...prev,
                                sous_direction_id: mappedOptions,
                                id_sous_direction: mappedOptions
                            }));
                            console.log(`✅ Sous-directions chargées:`, mappedOptions);
                        }
                    }
                } catch (error) {
                    console.error('❌ Erreur lors du chargement des sous-directions:', error);
                }
            } else {
                // Réinitialiser les options de sous-direction
                setDynamicOptions(prev => ({
                    ...prev,
                    sous_direction_id: [],
                    id_sous_direction: []
                }));
            }
        }
        
        setFormData(newFormData);
    };

    // Fonction pour gérer les changements de type de service
    const handleTypeServiceChange = async (value) => {
        const newFormData = { ...formData, type_service: value };
        
        // Si le type est "direction", récupérer automatiquement la direction de l'utilisateur
        if (value === 'direction' && user?.id_agent) {
            try {
                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                    headers: getAuthHeaders()
                });
                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();
                    const userDirectionId = agentData.data?.id_direction;
                    if (userDirectionId) {
                        newFormData.direction_id = userDirectionId;
                        console.log('🔧 Direction automatiquement assignée:', userDirectionId);
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération de la direction:', error);
            }
            // Vider le champ sous_direction_id car un service de direction n'a pas de sous-direction
            newFormData.sous_direction_id = '';
            console.log('🔧 Sous-direction vidée car service de direction');
        } else if (value === 'sous_direction' && user?.id_agent) {
            // Si c'est un service de sous-direction, assigner automatiquement la direction de l'utilisateur
            try {
                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                    headers: getAuthHeaders()
                });
                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();
                    const userDirectionId = agentData.data?.id_direction;
                    if (userDirectionId) {
                        newFormData.direction_id = userDirectionId;
                        console.log('🔧 Direction automatiquement assignée pour service de sous-direction:', userDirectionId);
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération de la direction pour sous-direction:', error);
            }
        }
        
        setFormData(newFormData);
    };

    // Rediriger vers la page des agents avec l'ID de l'agent
    const handleViewAgent = (agentId) => {
        history.push(`/agents?view=${agentId}`);
    };

    // Effet pour filtrer les agents quand le terme de recherche change
    useEffect(() => {
        const filtered = filterAgents(directionAgents, agentSearchTerm);
        setFilteredAgents(filtered);
    }, [directionAgents, agentSearchTerm]);

    // Réinitialiser la pagination quand on change d'endpoint API
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm(''); // Réinitialiser aussi la recherche
        setDebouncedSearchTerm(''); // Réinitialiser le debounce
        isInitialLoadRef.current = true; // Réinitialiser pour afficher le spinner au chargement initial
    }, [apiEndpoint]);

    // Fonction pour charger les données depuis l'API (mémorisée avec useCallback)
    const loadData = useCallback(async () => {
            try {
                // Ne mettre loading à true que lors du chargement initial
                if (isInitialLoadRef.current) {
                    setLoading(true);
                }
                setError(null);
                
                // Extraire le nom de la table depuis l'endpoint API
                const tableName = apiEndpoint.replace('/api/', '');
                
                // Construire l'URL avec filtrage par organisation si applicable
                let url = `https://tourisme.2ise-groupe.com/api/${tableName}`;
                
                // Pour les emplois, charger toutes les données sans pagination (filtrage côté client)
                if (tableName === 'emplois') {
                    url += '?limit=10000'; // Charger un grand nombre d'emplois
                } else {
                    // Ajouter des paramètres de pagination pour les autres tables
                    url += `?page=${currentPage}&limit=${itemsPerPage}`;
                }
                
                // Pour les agents, inclure ceux qui ont atteint l'âge de retraite et trier par ordre alphabétique
                if (tableName === 'agents') {
                    url += `&sortBy=nom&sortOrder=ASC`;
                }
                
                // Ajouter le paramètre de recherche si un terme de recherche est saisi (utiliser debouncedSearchTerm)
                // SAUF pour les emplois où le filtrage se fait côté client
                if (tableName !== 'emplois' && debouncedSearchTerm && debouncedSearchTerm.trim()) {
                    url += `&search=${encodeURIComponent(debouncedSearchTerm.trim())}`;
                }
                
                console.log('🔍 PAGINATION - URL avec pagination:', url);
                console.log('🔍 PAGINATION - Page:', currentPage);
                console.log('🔍 PAGINATION - SearchTerm (input):', searchTerm);
                console.log('🔍 PAGINATION - DebouncedSearchTerm (API):', debouncedSearchTerm);
                
                // Ajouter le filtrage par organisation pour certaines tables
                if (user?.organization && shouldFilterByOrganization(tableName)) {
                    const { organization } = user;
                    if (organization.type === 'ministere') {
                        url += `&id_ministere=${organization.id}`;
                    } else if (organization.type === 'institution') {
                        url += `&id_institution=${organization.id}`;
                    } else if (organization.type === 'entite' && tableName === 'directions') {
                        // Pour les entités, on ne filtre pas les directions car elles sont liées aux ministères
                        // Les entités n'ont pas leurs propres directions
                    }
                }

                // Ajouter le filtre par direction générale pour les directions
                if (tableName === 'directions' && directionGeneraleFilter) {
                    url += `&id_direction_generale=${directionGeneraleFilter}`;
                }
                
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                const result = await response.json();

                console.log('🔍 DEBUG - Réponse API pour', tableName, ':', result);
                console.log('🔍 DEBUG - Type de result:', typeof result);
                console.log('🔍 DEBUG - result.data:', result.data);
                console.log('🔍 DEBUG - Array.isArray(result.data):', Array.isArray(result.data));
                
                // Gérer différentes structures de réponse API
                let dataToSet = [];
                if (result.data && Array.isArray(result.data)) {
                    dataToSet = result.data;
                    console.log('🔍 DEBUG - Données extraites depuis result.data:', dataToSet.length, 'éléments');
                } else if (Array.isArray(result)) {
                    dataToSet = result;
                    console.log('🔍 DEBUG - Données extraites depuis result (array):', dataToSet.length, 'éléments');
                } else if (result.success && result.data) {
                    dataToSet = result.data;
                    console.log('🔍 DEBUG - Données extraites depuis result.success.data:', dataToSet.length, 'éléments');
                } else {
                    console.error('❌ DEBUG - Structure de réponse inattendue:', result);
                    setError('Structure de données inattendue');
                    return;
                }
                
                console.log('🔍 DEBUG - Données finales à afficher pour', tableName, ':', dataToSet);
                console.log('🔍 DEBUG - Premier élément:', dataToSet[0]);
                
                // Pour les agents, trier par ordre alphabétique (nom puis prénom) côté client
                // pour améliorer l'ordre même si l'API trie déjà par nom
                if (tableName === 'agents' && Array.isArray(dataToSet)) {
                    dataToSet.sort((a, b) => {
                        const nomA = (a.nom || '').toUpperCase().trim();
                        const nomB = (b.nom || '').toUpperCase().trim();
                        const prenomA = (a.prenom || '').toUpperCase().trim();
                        const prenomB = (b.prenom || '').toUpperCase().trim();
                        
                        // Comparer d'abord par nom
                        if (nomA < nomB) return -1;
                        if (nomA > nomB) return 1;
                        
                        // Si les noms sont égaux, comparer par prénom
                        if (prenomA < prenomB) return -1;
                        if (prenomA > prenomB) return 1;
                        
                        return 0;
                    });
                }
                
                // Mettre à jour les données (remplacer complètement pour la pagination numérotée)
                setData(dataToSet);
                
                // Pour les emplois, la pagination sera gérée côté client après filtrage
                if (tableName === 'emplois') {
                    // Les informations de pagination seront calculées après le filtrage côté client
                    setPaginationInfo({
                        totalPages: 1,
                        totalCount: dataToSet.length,
                        hasNextPage: false,
                        hasPrevPage: false,
                        startIndex: 1,
                        endIndex: dataToSet.length
                    });
                } else {
                    // Mettre à jour les informations de pagination pour les autres tables
                    if (result.pagination) {
                        const pagination = result.pagination;
                        const currentPageNum = pagination.currentPage || pagination.current_page || currentPage;
                        const totalCountNum = pagination.totalCount || pagination.total || pagination.totalCount || 0;
                        // Le backend retourne total_pages, pas totalPages
                        const totalPagesNum = pagination.total_pages || pagination.totalPages || Math.ceil((totalCountNum || 0) / (pagination.limit || itemsPerPage)) || 1;
                        const limitNum = pagination.limit || pagination.per_page || itemsPerPage;
                        
                        // Calculer startIndex et endIndex
                        const startIndex = (currentPageNum - 1) * limitNum + 1;
                        const endIndex = Math.min(startIndex + dataToSet.length - 1, totalCountNum);
                        
                        console.log('📄 ManagementPage Pagination - totalPages:', totalPagesNum, 'totalCount:', totalCountNum, 'pagination object:', pagination);
                        
                        setPaginationInfo({
                            totalPages: totalPagesNum,
                            totalCount: totalCountNum,
                            hasNextPage: currentPageNum < totalPagesNum,
                            hasPrevPage: currentPageNum > 1,
                            startIndex: startIndex,
                            endIndex: endIndex
                        });
                    } else {
                        // Fallback si pas de pagination dans la réponse
                        const startIndex = (currentPage - 1) * itemsPerPage + 1;
                        const endIndex = startIndex + dataToSet.length - 1;
                        setPaginationInfo({
                            totalPages: 1,
                            totalCount: dataToSet.length,
                            hasNextPage: false,
                            hasPrevPage: false,
                            startIndex: startIndex,
                            endIndex: endIndex
                        });
                    }
                }
            } catch (err) {
                setError('Erreur de connexion au serveur');
                console.error('Erreur:', err);
            } finally {
                setLoading(false);
                // Désactiver le chargement initial après le premier chargement réussi
                if (isInitialLoadRef.current) {
                    isInitialLoadRef.current = false;
                }
            }
        }, [apiEndpoint, currentPage, itemsPerPage, debouncedSearchTerm, user, directionGeneraleFilter]);

    // Fonction pour changer de page
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Debounce du terme de recherche (attendre 500ms après la dernière frappe)
    // SAUF pour les emplois où le filtrage est côté client et en temps réel
    useEffect(() => {
        const tableName = apiEndpoint.replace('/api/', '');
        // Pour les emplois, pas de debounce car filtrage côté client en temps réel
        if (tableName === 'emplois') {
            setDebouncedSearchTerm(searchTerm);
            return;
        }
        
        // Pour les autres tables, utiliser le debounce
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // Attendre 500ms après la dernière frappe

        return () => clearTimeout(timer);
    }, [searchTerm, apiEndpoint]);

    // Réinitialiser la page à 1 quand le terme de recherche change
    const prevSearchTermRef = useRef(searchTerm);
    
    useEffect(() => {
        // Si le terme de recherche a changé, réinitialiser la page à 1
        if (prevSearchTermRef.current !== searchTerm) {
            setCurrentPage(1);
            prevSearchTermRef.current = searchTerm;
        }
    }, [searchTerm]);

    // Réinitialiser la page à 1 quand le filtre de direction générale change
    useEffect(() => {
        if (apiEndpoint === '/api/directions') {
            setCurrentPage(1);
        }
    }, [directionGeneraleFilter, apiEndpoint]);

    // Charger les données depuis l'API
    // Pour les emplois, charger une seule fois au début (filtrage côté client)
    // Pour les autres tables, recharger quand debouncedSearchTerm change
    useEffect(() => {
        if (apiEndpoint) {
            const tableName = apiEndpoint.replace('/api/', '');
            // Pour les emplois, ne charger qu'une seule fois au début ou quand l'endpoint change
            if (tableName === 'emplois') {
                // Charger seulement si c'est le chargement initial ou si l'endpoint change
                if (isInitialLoadRef.current || !data.length) {
                    loadData();
                }
            } else {
                // Pour les autres tables, charger normalement avec debounce
                loadData();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiEndpoint, currentPage, itemsPerPage, debouncedSearchTerm, user, directionGeneraleFilter]);

    // Charger les options dynamiques séparément
    useEffect(() => {
        if (apiEndpoint) {
            loadDynamicOptions();
        }
    }, [apiEndpoint, fields]);

    // Charger les options de directions générales pour le filtre (uniquement pour /api/directions)
    useEffect(() => {
        const loadDirectionGeneraleOptions = async () => {
            if (apiEndpoint === '/api/directions') {
                try {
                    let url = 'https://tourisme.2ise-groupe.com/api/directions-generales?limit=1000';
                    if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                        url += `&id_ministere=${user.organization.id}`;
                    } else if (user?.id_ministere) {
                        url += `&id_ministere=${user.id_ministere}`;
                    }
                    const response = await fetch(url, {
                        headers: getAuthHeaders()
                    });
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success && result.data) {
                            setDirectionGeneraleOptions(result.data);
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors du chargement des directions générales:', error);
                }
            }
        };
        loadDirectionGeneraleOptions();
    }, [apiEndpoint, user?.organization?.type, user?.organization?.id, user?.id_ministere]);

    // Filtrer les données côté client pour les emplois (recherche en temps réel)
    // Pour les autres tables, utiliser directement les données de l'API
    const filteredData = React.useMemo(() => {
        // Si c'est la page des emplois, faire un filtrage côté client en temps réel
        if (apiEndpoint === '/api/emplois') {
            if (searchTerm && searchTerm.trim()) {
                const searchLower = searchTerm.toLowerCase().trim();
                return data.filter(item => {
                    // Rechercher dans libele et libele_court
                    const libele = (item.libele || '').toLowerCase();
                    const libeleCourt = (item.libele_court || '').toLowerCase();
                    
                    // Vérifier si le terme commence par la lettre OU contient la lettre
                    return libele.startsWith(searchLower) || 
                           libele.includes(searchLower) ||
                           libeleCourt.startsWith(searchLower) || 
                           libeleCourt.includes(searchLower);
                });
            }
            // Si pas de recherche, retourner toutes les données
            return data;
        }
        // Pour les autres tables, utiliser les données telles quelles (filtrage côté serveur)
        return data;
    }, [data, searchTerm, apiEndpoint]);
    
    // Mettre à jour les informations de pagination pour les emplois après filtrage
    React.useEffect(() => {
        if (apiEndpoint === '/api/emplois') {
            const totalCount = filteredData.length;
            const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
            const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
            const pageData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            const endIndex = totalCount > 0 ? startIndex + pageData.length - 1 : 0;
            
            setPaginationInfo({
                totalPages: totalPages,
                totalCount: totalCount,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                startIndex: startIndex,
                endIndex: endIndex
            });
        }
    }, [filteredData, currentPage, itemsPerPage, apiEndpoint]);
    
    // Paginer les données filtrées pour les emplois
    const paginatedData = React.useMemo(() => {
        if (apiEndpoint === '/api/emplois') {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            return filteredData.slice(startIndex, endIndex);
        }
        return filteredData;
    }, [filteredData, currentPage, itemsPerPage, apiEndpoint]);

    const handleAdd = () => {
        setEditingItem(null);
        setFormData({});
        setModal(true);
    };

    const handleEdit = (item) => {
        // Pour les agents, utiliser la callback onEditAgent si elle existe
        if (apiEndpoint === '/api/agents' && onEditAgent) {
            console.log('🔍 Appel de onEditAgent avec item.id:', item.id);
            onEditAgent(item.id);
            return;
        }
        
        // Fallback: pour les agents sans callback, utiliser l'événement personnalisé
        if (apiEndpoint === '/api/agents') {
            console.log('🔍 Fallback: utilisation de l\'événement personnalisé');
            const editEvent = new CustomEvent('editAgent', { 
                detail: { agentId: item.id, agentData: item } 
            });
            window.dispatchEvent(editEvent);
            return;
        }
        
        // Pour les autres entités, utiliser le modal simple
        setEditingItem(item);
        
        // Convertir les valeurs textuelles en majuscules lors du chargement pour modification
        const processedItem = { ...item };
        Object.keys(processedItem).forEach(key => {
            if (typeof processedItem[key] === 'string' && key !== 'email') {
                processedItem[key] = processedItem[key].toUpperCase();
            }
        });
        // Sous-directions : le backend renvoie id_direction, le formulaire utilise direction_id
        if (apiEndpoint === '/api/sous-directions' && (processedItem.id_direction != null || processedItem.direction_id != null)) {
            processedItem.direction_id = processedItem.direction_id ?? processedItem.id_direction;
        }
        setFormData(processedItem);
        setModal(true);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const tableName = apiEndpoint.replace('/api/', '');
            const url = editingItem 
                ? `https://tourisme.2ise-groupe.com/api/${tableName}/${editingItem.id}`
                : `https://tourisme.2ise-groupe.com/api/${tableName}`;

            const method = editingItem ? 'PUT' : 'POST';

            // Exclure les champs readOnly lors de la création
            let dataToSend = { ...formData };
            if (!editingItem) {
                const readOnlyFields = fields.filter(field => field.readOnly).map(field => field.name);
                readOnlyFields.forEach(fieldName => {
                    delete dataToSend[fieldName];
                });
            }

            // Conversion des types de données selon la configuration des champs
            fields.forEach(field => {
                if (dataToSend[field.name] !== undefined && dataToSend[field.name] !== null) {
                    if (field.type === 'number') {
                        dataToSend[field.name] = parseInt(dataToSend[field.name]) || 0;
                    } else if (field.type === 'checkbox') {
                        dataToSend[field.name] = Boolean(dataToSend[field.name]);
                    }
                }
            });

            // Sous-directions : envoyer id_ministere si absent (depuis l'utilisateur connecté)
            if (apiEndpoint === '/api/sous-directions' && !dataToSend.id_ministere && user) {
                const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : user?.id_ministere;
                if (ministereId) {
                    dataToSend.id_ministere = ministereId;
                }
            }
            // Emplois et fonctions : envoyer id_ministere si absent (pour les DRH)
            if ((apiEndpoint === '/api/emplois' || apiEndpoint === '/api/fonctions') && !dataToSend.id_ministere && user && user.role !== 'super_admin') {
                const ministereId = user?.organization?.type === 'ministere' ? user?.organization?.id : user?.id_ministere;
                if (ministereId) {
                    dataToSend.id_ministere = ministereId;
                }
            }

            console.log('🔍 DEBUG - Données à envoyer après conversion:', dataToSend);
            console.log('🔍 DEBUG - URL:', url);
            console.log('🔍 DEBUG - Method:', method);
            console.log('🔍 DEBUG - Headers:', getAuthHeaders());

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(dataToSend)
            });

            console.log('🔍 DEBUG - Response status:', response.status);
            console.log('🔍 DEBUG - Response headers:', response.headers);

            const result = await response.json();
            console.log('🔍 DEBUG - Response result:', result);

            // Vérifier si la requête a réussi (status 200-299) et si on a des données
            // Le BaseController retourne directement l'objet créé avec un id
            if (response.ok && (result.success || result.data || result.id)) {
                setModal(false);
                setError(null);
                setSuccessMessage(editingItem ? `${title} modifié avec succès` : `${title} créé avec succès`);
                
                // Réinitialiser la page à 1 pour voir le nouvel élément créé (pour les nouvelles créations)
                if (!editingItem) {
                    setCurrentPage(1);
                }
                
                // Recharger toutes les données pour s'assurer que les informations sont à jour
                // Attendre un peu pour que l'état currentPage soit mis à jour si on a changé la page
                await new Promise(resolve => setTimeout(resolve, 50));
                await loadData();
                
                // Recharger les options dynamiques après une sauvegarde réussie
                // pour s'assurer que les nouvelles données sont disponibles dans les listes déroulantes
                await loadDynamicOptions();
                
                // Masquer le message de succès après 3 secondes
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 3000);
            } else {
                setError(result.message || result.error || 'Erreur lors de la sauvegarde');
                setSuccessMessage(null);
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fonction d'export PDF pour les emplois
    const handleExportPDF = () => {
        if (apiEndpoint !== '/api/emplois') return;
        
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yPosition = 20;
            const lineHeight = 7;
            const margin = 20;
            const colWidth = (pageWidth - 2 * margin) / 3;
            
            // Titre
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            const titleText = `Liste des Emplois - ${filteredData.length} emploi(s)`;
            const titleWidth = pdf.getTextWidth(titleText);
            pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
            yPosition += 10;
            
            // Date de génération
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`;
            pdf.text(dateText, margin, yPosition);
            yPosition += 10;
            
            // En-têtes du tableau
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, lineHeight + 2);
            pdf.text('#', margin + 5, yPosition);
            pdf.text('Libellé', margin + colWidth, yPosition);
            pdf.text('Libellé court', margin + 2 * colWidth, yPosition);
            yPosition += lineHeight + 2;
            
            // Ligne de séparation
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 3;
            
            // Données - utiliser toutes les données filtrées, pas seulement la page actuelle
            pdf.setFont(undefined, 'normal');
            filteredData.forEach((item, index) => {
                // Vérifier si on doit ajouter une nouvelle page
                if (yPosition + lineHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                    
                    // Réafficher les en-têtes
                    pdf.setFont(undefined, 'bold');
                    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, lineHeight + 2);
                    pdf.text('#', margin + 5, yPosition);
                    pdf.text('Libellé', margin + colWidth, yPosition);
                    pdf.text('Libellé court', margin + 2 * colWidth, yPosition);
                    yPosition += lineHeight + 2;
                    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 3;
                    pdf.setFont(undefined, 'normal');
                }
                
                const lineNumber = index + 1; // Numérotation continue sur toutes les pages
                const libele = (item.libele || '-').substring(0, 40);
                const libeleCourt = (item.libele_court || '-').substring(0, 20);
                
                pdf.text(String(lineNumber), margin + 5, yPosition);
                pdf.text(libele, margin + colWidth, yPosition);
                pdf.text(libeleCourt, margin + 2 * colWidth, yPosition);
                yPosition += lineHeight;
            });
            
            // Télécharger le PDF
            const fileName = `Liste_Emplois_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de la génération du PDF');
        }
    };
    
    // Fonction d'export Word pour les emplois
    const handleExportWord = () => {
        if (apiEndpoint !== '/api/emplois') return;
        
        try {
            // Créer le contenu HTML pour Word
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Liste des Emplois</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                        }
                        .title { 
                            text-align: center; 
                            font-size: 18px; 
                            font-weight: bold; 
                            margin-bottom: 10px; 
                        }
                        .date { 
                            text-align: center; 
                            font-size: 12px; 
                            color: #666; 
                            margin-bottom: 20px; 
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-top: 20px; 
                        }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 10px; 
                            text-align: left; 
                        }
                        th { 
                            background-color: #366092; 
                            color: white; 
                            font-weight: bold; 
                        }
                        tr:nth-child(even) { 
                            background-color: #f2f2f2; 
                        }
                        .total {
                            font-weight: bold;
                            background-color: #E8F4FD;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="title">Liste des Emplois</div>
                    <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Libellé</th>
                                <th>Libellé court</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.map((item, index) => {
                                const lineNumber = index + 1; // Numérotation continue
                                return `
                                    <tr>
                                        <td>${lineNumber}</td>
                                        <td>${item.libele || '-'}</td>
                                        <td>${item.libele_court || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                            <tr class="total">
                                <td colspan="3">Total: ${filteredData.length} emploi(s)</td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            
            // Créer un blob et le télécharger
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const fileName = `Liste_Emplois_${new Date().toISOString().split('T')[0]}.doc`;
            saveAs(blob, fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export Word:', error);
            alert('Erreur lors de la génération du document Word');
        }
    };
    
    // Fonction d'impression pour les emplois
    const handlePrint = () => {
        if (apiEndpoint !== '/api/emplois') return;
        
        const printWindow = window.open('', '_blank');
        // Utiliser toutes les données (data) au lieu de filteredData pour avoir tous les emplois
        const allEmplois = data;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Liste des Emplois - Impression</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                    }
                    .title { 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-bottom: 20px; 
                    }
                    .content {
                        flex: 1;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 20px; 
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 10px; 
                        text-align: left; 
                    }
                    th { 
                        background-color: #366092; 
                        color: white; 
                        font-weight: bold; 
                    }
                    tr:nth-child(even) { 
                        background-color: #f2f2f2; 
                    }
                    .total {
                        font-weight: bold;
                        background-color: #E8F4FD;
                        text-align: center;
                    }
                    .date { 
                        text-align: center; 
                        font-size: 12px; 
                        color: #666; 
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #ddd;
                    }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                        .date {
                            position: fixed;
                            bottom: 20px;
                            left: 0;
                            right: 0;
                            margin-top: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="content">
                    <div class="title">Liste des Emplois</div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Libellé</th>
                                <th>Libellé court</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allEmplois.map((item, index) => {
                                const lineNumber = index + 1; // Numérotation continue
                                return `
                                    <tr>
                                        <td>${lineNumber}</td>
                                        <td>${item.libele || '-'}</td>
                                        <td>${item.libele_court || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                            <tr class="total">
                                <td colspan="3">Total: ${allEmplois.length} emploi(s)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}</div>
            </body>
            </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    const handleDelete = async (id) => {
        // Pour les agents, ouvrir le modal de saisie du motif
        if (apiEndpoint === '/api/agents') {
            setAgentIdPourRetrait(id);
            setMotifRetraitText('');
            setMotifRetraitModal(true);
            return;
        }

        // Pour les autres éléments, utiliser la confirmation classique
        const confirmMessage = 'Êtes-vous sûr de vouloir supprimer cet élément ?';
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const tableName = apiEndpoint.replace('/api/', '');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/${tableName}/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const result = await response.json();

            // Vérifier si la suppression a réussi (plusieurs formats de réponse possibles)
            if (response.ok && (result.success || result.data || result.message || !result.error)) {
                // Afficher un message de succès si disponible
                if (result.message) {
                    // Optionnel: afficher une notification de succès
                    console.log('✅', result.message);
                }
                
                // Supprimer l'élément de la liste localement
                setData(prevData => prevData.filter(item => item.id !== id));
                
                // Mettre à jour le total dans paginationInfo
                setPaginationInfo(prevInfo => ({
                    ...prevInfo,
                    totalCount: Math.max(0, prevInfo.totalCount - 1)
                }));
                
                // Recharger les options dynamiques après une suppression réussie
                await loadDynamicOptions();
                
                // Recharger les données pour s'assurer que la liste est à jour
                // (utile si la pagination ou le tri est affecté)
                await loadData();
            } else {
                // Gérer les erreurs de contrainte de clé étrangère
                if (result.error && result.details) {
                    setError(`${result.error}: ${result.details}`);
                } else if (result.error) {
                    setError(result.error);
                } else {
                    setError(result.message || 'Erreur lors de la suppression');
                }
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fonction pour confirmer le retrait avec motif
    const handleConfirmRetrait = async () => {
        if (!agentIdPourRetrait) return;

        if (!motifRetraitText.trim()) {
            setError('Veuillez saisir le motif de retrait');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            // Ne pas fermer le modal immédiatement, attendre la réponse
            
            const motifValue = motifRetraitText.trim();
            const url = `https://tourisme.2ise-groupe.com/api/agents/${agentIdPourRetrait}?motif_retrait=${encodeURIComponent(motifValue)}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            let result = {};
            try {
                const text = await response.text();
                result = text ? JSON.parse(text) : {};
            } catch (_) {
                if (!response.ok) {
                    setError(`Erreur serveur (${response.status}). Vérifiez la connexion ou réessayez.`);
                    return;
                }
            }

            if (response.ok && (result.success || result.message || !result.error)) {
                if (result.message) {
                    console.log('✅', result.message);
                }
                
                // Fermer le modal seulement en cas de succès
                setMotifRetraitModal(false);
                
                setData(prevData => prevData.filter(item => item.id !== agentIdPourRetrait));
                
                setPaginationInfo(prevInfo => ({
                    ...prevInfo,
                    totalCount: Math.max(0, prevInfo.totalCount - 1)
                }));
                
                await loadDynamicOptions();
                await loadData();
                setSuccessMessage('Agent retiré avec succès');
                
                // Réinitialiser les valeurs seulement après succès
                setAgentIdPourRetrait(null);
                setMotifRetraitText('');
                setError(null);
            } else {
                // Gérer les erreurs de validation du backend - le modal reste ouvert
                if (response.status === 400 && result.error) {
                    setError(result.details || result.error);
                } else if (result.error && result.details) {
                    setError(`${result.error}: ${result.details}`);
                } else if (result.error) {
                    setError(result.error);
                } else {
                    setError('Erreur lors du retrait de l\'agent');
                }
                // Le modal reste ouvert pour permettre à l'utilisateur de corriger
            }
        } catch (err) {
            console.error('Erreur lors du retrait:', err);
            const msg = err && err.message === 'Failed to fetch'
                ? 'Erreur réseau ou CORS. Vérifiez que le serveur est accessible et autorise les requêtes depuis cette origine.'
                : (err && err.message) || 'Erreur lors du retrait de l\'agent';
            setError('Erreur lors du retrait de l\'agent: ' + msg);
            // Le modal reste ouvert en cas d'erreur réseau
        } finally {
            setLoading(false);
            // Ne réinitialiser que si le modal est fermé (succès)
            if (!motifRetraitModal) {
                setAgentIdPourRetrait(null);
                setMotifRetraitText('');
            }
        }
    };

    // Fonction pour afficher le motif
    const handleViewMotif = async (item) => {
        setAgentMotifAfficher({
            ...item,
            nomComplet: `${item.nom || ''} ${item.prenom || ''}`.trim() || 'N/A'
        });
        setLoadingHistorique(true);
        setHistoriqueMotifs([]);
        setMotifAfficherModal(true);

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${item.id}/historique-retrait-restauration`, {
                headers: getAuthHeaders()
            });

            const result = await response.json();

            if (response.ok && result.success && result.data) {
                setHistoriqueMotifs(result.data);
            } else {
                console.error('Erreur lors du chargement de l\'historique:', result);
                setHistoriqueMotifs([]);
            }
        } catch (err) {
            console.error('Erreur lors du chargement de l\'historique:', err);
            setHistoriqueMotifs([]);
        } finally {
            setLoadingHistorique(false);
        }
    };

    const getStatusBadge = (status) => {
        const color = status === 'actif' ? 'success' : 'secondary';
        return <Badge color={color}>{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                <Spinner color="primary" />
            </div>
        );
    }

    return (
        <div style={{ 
            background: '#f8f9fa',
            minHeight: '100vh',
            padding: '20px 0'
        }}>
            {/* Styles CSS traditionnels */}
            <style jsx>{`
                .management-container {
                    background: white;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin: 20px;
                }
                .page-header {
                    background: #343a40;
                    color: white;
                    padding: 20px;
                    border-bottom: 3px solid #007bff;
                }
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0;
                }
                .page-description {
                    font-size: 0.9rem;
                    opacity: 0.9;
                    margin-top: 5px;
                }
                .content-section {
                    padding: 20px;
                }
                .search-section {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                .table-container {
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .table-header {
                    background: #f8f9fa;
                    border-bottom: 1px solid #dee2e6;
                    padding: 15px 20px;
                    font-weight: 600;
                    color: #495057;
                }
                .table-row {
                    border-bottom: 1px solid #f1f3f4;
                }
                .table-row:last-child {
                    border-bottom: none;
                }
                .table-cell {
                    padding: 12px 20px;
                    vertical-align: middle;
                }
                .action-buttons {
                    display: flex;
                    gap: 5px;
                }
                .btn-traditional {
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    border: 1px solid #dee2e6;
                }
                .btn-traditional:hover {
                    background-color: #e9ecef;
                }
                .empty-state {
                    text-align: center;
                    padding: 40px 20px;
                    color: #6c757d;
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                }
            `}</style>

            <div className="management-container">
                {/* En-tête de page traditionnel */}
                <div className="page-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h1 className="page-title">
                                {Icon && <Icon className="me-2" />}
                                {title}
                            </h1>
                            {description && (
                                <p className="page-description">{description}</p>
                            )}
                        </div>
                        <div className="d-flex gap-2">
                            {/* Boutons d'export pour les emplois uniquement */}
                            {apiEndpoint === '/api/emplois' && (
                                <Dropdown isOpen={exportDropdownOpen} toggle={() => setExportDropdownOpen(!exportDropdownOpen)}>
                                    <DropdownToggle color="success" caret className="btn-traditional">
                                        <MdFileDownload className="me-1" />
                                        Exporter
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem onClick={handlePrint}>
                                            <MdPrint className="me-2" />
                                            Imprimer
                                        </DropdownItem>
                                        <DropdownItem onClick={handleExportPDF}>
                                            <MdPictureAsPdf className="me-2" />
                                            PDF (.pdf)
                                        </DropdownItem>
                                        <DropdownItem onClick={handleExportWord}>
                                            <MdDescription className="me-2" />
                                            Word (.doc)
                                        </DropdownItem>
                                    </DropdownMenu>
                                </Dropdown>
                            )}
                            {/* Afficher le bouton Ajouter pour les super_admin, DRH (sauf pour ministères et entités) ou si customAddButton est défini */}
                            {(() => {
                                const isDRH = user && (user.role === 'DRH' || user.role === 'drh' || user.role?.toLowerCase() === 'drh');
                                const isSuperAdmin = user && user.role === 'super_admin';
                                const isRestrictedEndpoint = apiEndpoint === '/api/ministeres' || apiEndpoint === '/api/entites' || apiEndpoint === '/api/entites-administratives' || apiEndpoint === '/api/entites-institutions';
                                
                                // Les DRH ne peuvent pas créer de ministères ou d'entités
                                if (isDRH && isRestrictedEndpoint) {
                                    return customAddButton ? (
                                        <Button 
                                            color="primary" 
                                            onClick={customAddButton.onClick}
                                            className="btn-traditional"
                                        >
                                            {customAddButton.text || "Ajouter"}
                                        </Button>
                                    ) : null;
                                }
                                
                                // Pour tous les autres cas (super_admin, DRH sur autres endpoints, ou customAddButton)
                                return (isSuperAdmin || (isDRH && !isRestrictedEndpoint) || customAddButton) ? (
                                customAddButton ? (
                                    <Button 
                                        color="primary" 
                                        onClick={customAddButton.onClick}
                                        className="btn-traditional"
                                    >
                                        {customAddButton.text || "Ajouter"}
                                    </Button>
                                ) : (
                                    <Button 
                                        color="primary" 
                                        onClick={handleAdd}
                                        className="btn-traditional"
                                    >
                                        Ajouter
                                    </Button>
                                )
                            ) : null;
                            })()}
                        </div>
                    </div>
                </div>

                <div className="content-section">
                    {error && (
                        <Alert color="danger" style={{ marginBottom: '20px' }}>
                            {error}
                        </Alert>
                    )}
                    {successMessage && (
                        <Alert color="success" style={{ marginBottom: '20px' }}>
                            {successMessage}
                        </Alert>
                    )}

                    {/* Section de recherche traditionnelle */}
                    <div className="search-section">
                        <Row>
                            <Col md={apiEndpoint === '/api/directions' ? 4 : 6}>
                                <InputGroup>
                                    <InputGroupAddon addonType="prepend">
                                        <InputGroupText style={{ background: '#e9ecef', border: '1px solid #ced4da' }}>
                                            <i className="fa fa-search" />
                                        </InputGroupText>
                                    </InputGroupAddon>
                                    <Input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(handleInputValueChange('search', e.target.value))}
                                        style={{ border: '1px solid #ced4da', textTransform: 'uppercase' }}
                                    />
                                </InputGroup>
                            </Col>
                            {apiEndpoint === '/api/directions' && (
                                <Col md={4}>
                                    <Input
                                        type="select"
                                        value={directionGeneraleFilter}
                                        onChange={(e) => {
                                            setDirectionGeneraleFilter(e.target.value);
                                        }}
                                        style={{ border: '1px solid #ced4da' }}
                                    >
                                        <option value="">Toutes les directions générales</option>
                                        {directionGeneraleOptions.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.libelle}
                                            </option>
                                        ))}
                                    </Input>
                                </Col>
                            )}
                        </Row>
                    </div>

                    {/* Tableau traditionnel */}
                    <div className="table-container">
                        <div className="table-header">
                            Liste des {title.toLowerCase()}
                        </div>
                        <div className="table-responsive">
                            <Table hover style={{ margin: 0 }}>
                                <thead style={{ background: '#f8f9fa' }}>
                                    <tr>
                                        {/* Colonne de numérotation */}
                                        <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>#</th>
                                        {(displayColumns || fields.filter(field => field.name !== 'id')).map((field) => {
                                            const fieldName = typeof field === 'string' ? field : field.key || field.name;
                                            const fieldLabel = typeof field === 'string' ? field : field.label || field.name;
                                            return (
                                                <th key={fieldName} style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: '600' }}>
                                                    {fieldLabel}
                                                </th>
                                            );
                                        })}
                                        <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: '600' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {console.log('🔍 DEBUG RENDER - filteredData length:', filteredData.length)}
                                    {console.log('🔍 DEBUG RENDER - paginatedData length:', paginatedData.length)}
                                    {console.log('🔍 DEBUG RENDER - data length:', data.length)}
                                    {console.log('🔍 DEBUG RENDER - loading:', loading)}
                                    {console.log('🔍 DEBUG RENDER - error:', error)}
                                    {console.log('🔍 DEBUG RENDER - filteredData:', filteredData)}
                                    {paginatedData.map((item, index) => {
                                        // Calculer le numéro de ligne en tenant compte de la pagination
                                        let lineNumber;
                                        if (apiEndpoint === '/api/emplois') {
                                            // Pour les emplois, calculer basé sur la page actuelle et l'index
                                            lineNumber = (currentPage - 1) * itemsPerPage + index + 1;
                                        } else {
                                            // Pour les autres tables, utiliser paginationInfo.startIndex
                                            lineNumber = paginationInfo.startIndex > 0 
                                                ? paginationInfo.startIndex + index 
                                                : index + 1;
                                        }
                                        
                                        return (
                                        <tr key={item.id || index} className="table-row">
                                            {/* Cellule de numérotation - continue sur toutes les pages */}
                                            <td className="table-cell" style={{ border: '1px solid #dee2e6' }}>
                                                {lineNumber}
                                            </td>
                                            {(displayColumns || fields.filter(field => field.name !== 'id')).map((field) => {
                                                // Si on utilise displayColumns, convertir en format field
                                                const fieldConfig = typeof field === 'string' ? { name: field } : field;
                                                const fieldName = typeof field === 'string' ? field : field.key || field.name;
                                                
                                                // Si on utilise displayColumns, chercher la configuration complète dans fields
                                                let fullFieldConfig = fieldConfig;
                                                if (displayColumns && !fieldConfig.dynamicTable) {
                                                    const originalField = fields.find(f => f.name === fieldName);
                                                    if (originalField) {
                                                        fullFieldConfig = { ...fieldConfig, ...originalField };
                                                    }
                                                }
                                                
                                                return (
                                                    <td key={fieldName} className="table-cell" style={{ border: '1px solid #dee2e6' }}>
                                                        {(() => {
                                                            // Si le champ a une fonction render personnalisée (type custom)
                                                            if (fullFieldConfig.type === 'custom' && fullFieldConfig.render) {
                                                                return fullFieldConfig.render(item);
                                                            }
                                                            
                                                            let value = item[fieldName];
                                                        
                                                            // Gestion spéciale pour les champs de relation
                                                            // Vérifier si le champ a dynamicTable OU si c'est un champ qui commence par "id_" (probablement une relation)
                                                            if (fullFieldConfig.dynamicTable && fullFieldConfig.dynamicField) {
                                                                // Vérifier d'abord si le nom est déjà calculé (ex: responsable_nom, id_direction_generale_nom)
                                                                // Pour les champs qui commencent par "id_", ajouter "_nom" à la fin
                                                                // Pour les autres champs qui contiennent "_id", remplacer "_id" par "_nom"
                                                                let nomField;
                                                                if (fieldName.startsWith('id_')) {
                                                                    // Cas spécial: id_direction_generale -> id_direction_generale_nom
                                                                    nomField = fieldName + '_nom';
                                                                } else if (fieldName.includes('_id')) {
                                                                    // Cas général: responsable_id -> responsable_nom
                                                                    nomField = fieldName.replace('_id', '_nom');
                                                                } else {
                                                                    nomField = null;
                                                                }
                                                                
                                                                // Vérifier si le champ existe dans l'objet (même s'il est null ou undefined)
                                                                if (nomField && nomField in item && item[nomField] !== null && item[nomField] !== undefined && item[nomField] !== '') {
                                                                    value = item[nomField];
                                                                } else {
                                                                    // Sinon, essayer de trouver le libellé correspondant dans les options dynamiques
                                                                    const relatedItem = dynamicOptions[fieldName]?.find(option => 
                                                                        option.value === value || option.id === value
                                                                    );
                                                                    value = relatedItem ? relatedItem.label : value;
                                                                }
                                                            } else if (fieldName.startsWith('id_') && typeof value === 'number') {
                                                                // Fallback: si c'est un champ qui commence par "id_" et que la valeur est un nombre,
                                                                // essayer de trouver le champ _nom correspondant
                                                                const nomField = fieldName + '_nom';
                                                                if (nomField in item && item[nomField] !== null && item[nomField] !== undefined && item[nomField] !== '') {
                                                                    value = item[nomField];
                                                                }
                                                            }
                                                            
                                                            return fieldConfig.type === 'checkbox' ? (
                                                            <Badge color={value ? 'success' : 'secondary'} style={{ padding: '4px 8px', borderRadius: '3px' }}>
                                                                {value ? 'Oui' : 'Non'}
                                                            </Badge>
                                                        ) : fieldConfig.type === 'textarea' ? (
                                                            <span title={value}>
                                                                {value?.substring(0, 50)}
                                                                {value?.length > 50 ? '...' : ''}
                                                            </span>
                                                        ) : (
                                                            typeof value === 'object' && value !== null ? 
                                                                (value.label || value.name || value.nom || JSON.stringify(value)) : 
                                                                (value || '-')
                                                        );
                                                    })()}
                                                </td>
                                            );
                                        })}
                                            
                                            <td className="table-cell" style={{ border: '1px solid #dee2e6' }}>
                                                <div className="action-buttons">
                                                    {apiEndpoint === '/api/directions-generales' && (
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            className="btn-traditional"
                                                            onClick={() => loadDirectionGeneraleAgents({ id: item.id, libelle: item.libelle })}
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir les agents
                                                        </Button>
                                                    )}
                                                    {apiEndpoint === '/api/directions' && (
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            className="btn-traditional"
                                                            onClick={() => loadDirectionAgents(item.id)}
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir les agents
                                                        </Button>
                                                    )}
                                                    {apiEndpoint === '/api/sous-directions' && (
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            className="btn-traditional"
                                                            onClick={() => loadSousDirectionAgents(item.id)}
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir les agents
                                                        </Button>
                                                    )}
                                                    <Button
                                                        color="info"
                                                        size="sm"
                                                        className="btn-traditional"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        Modifier
                                                    </Button>
                                                    {/* Afficher le bouton Supprimer uniquement pour les super_admin pour les ministères */}
                                                    {(apiEndpoint === '/api/ministeres' && user && user.role !== 'super_admin') ? null : (
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            className="btn-traditional"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
                                                            {apiEndpoint === '/api/agents' ? 'Retirer' : 'Supprimer'}
                                                        </Button>
                                                    )}
                                                    {apiEndpoint === '/api/agents' && (
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            className="btn-traditional"
                                                            onClick={() => handleViewAgent(item.id)}
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir
                                                        </Button>
                                                    )}
                                                    {apiEndpoint === '/api/agents' && (item.motif_retrait || item.motif_restauration || item.retire) && (
                                                        <Button
                                                            color="info"
                                                            size="sm"
                                                            className="btn-traditional"
                                                            onClick={() => handleViewMotif(item)}
                                                            style={{
                                                                backgroundColor: '#17a2b8',
                                                                borderColor: '#17a2b8',
                                                                color: 'white',
                                                                fontWeight: '500',
                                                                minWidth: '140px'
                                                            }}
                                                        >
                                                            <MdInfo className="me-1" />
                                                            Voir le motif
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    </div>

                    {paginatedData.length === 0 && !loading && (
                        <div className="empty-state">
                            <p>{searchTerm ? 'Aucun élément trouvé' : 'Aucun élément'}</p>
                        </div>
                    )}
                    
                    {/* Pagination numérotée */}
                    {/* Pour les emplois, afficher la pagination si plus d'une page OU si on a des résultats */}
                    {((apiEndpoint === '/api/emplois' && paginationInfo.totalCount > itemsPerPage) || 
                      (apiEndpoint !== '/api/emplois' && paginationInfo.totalPages > 1)) && (
                        <>
                            {/* Informations de pagination */}
                            <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                                <small className="text-muted">
                                    Affichage de {paginationInfo.startIndex} à {paginationInfo.endIndex} sur {paginationInfo.totalCount} éléments
                                </small>
                            </div>
                            
                            {/* Composant de pagination */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={paginationInfo.totalPages}
                                onPageChange={handlePageChange}
                                showFirstLast={true}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Modal pour ajouter/modifier */}
            <Modal isOpen={modal} toggle={() => { setScrollableSelectVisible({}); setScrollableSelectSearch({}); setModal(false); }}>
                <ModalHeader toggle={() => { setScrollableSelectVisible({}); setScrollableSelectSearch({}); setModal(false); }}>
                    {editingItem ? 'Modifier' : 'Ajouter'} {title}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        {fields.map((field) => {
                            // Logique d'affichage conditionnel des champs
                            if (field.showWhen && !field.showWhen(formData)) {
                                return null;
                            }
                            
                            // Logique de masquage par défaut si showWhen n'est pas défini
                            if (!field.showWhen) {
                                // Masquer direction_id ou id_direction seulement sur les pages qui ont type_service (ex: services) et quand ce n'est pas "direction"
                                // Sur la page sous-directions (pas de type_service), afficher le champ Direction pour lier à la direction parente
                                if ((field.name === 'direction_id' || field.name === 'id_direction') && typeof formData.type_service !== 'undefined' && formData.type_service !== null && formData.type_service !== 'direction') {
                                    return null;
                                }
                                // Afficher sous_direction_id ou id_sous_direction seulement si type_service === 'sous_direction'
                                if ((field.name === 'sous_direction_id' || field.name === 'id_sous_direction') && formData.type_service !== 'sous_direction') {
                                    return null;
                                }
                            }
                            
                            return (
                                <FormGroup key={field.name}>
                                    <Label for={field.name}>{field.label}</Label>
                                {field.type === 'textarea' ? (
                                    <Input
                                        type="textarea"
                                        id={field.name}
                                        rows={3}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => {
                                            const textarea = e.target;
                                            const cursorPosition = textarea.selectionStart;
                                            const textareaValue = textarea.value;
                                            const newValue = handleInputValueChange(field.name, textareaValue);
                                            
                                            // Calculer la nouvelle position du curseur AVANT de mettre à jour le state
                                            let newCursorPos = cursorPosition;
                                            const lengthDiff = newValue.length - textareaValue.length;
                                            
                                            // Ajuster la position selon la différence de longueur
                                            if (lengthDiff !== 0) {
                                                newCursorPos = cursorPosition + lengthDiff;
                                            }
                                            
                                            // S'assurer que la position est dans les limites
                                            newCursorPos = Math.max(0, Math.min(newCursorPos, newValue.length));
                                            
                                            setFormData({ ...formData, [field.name]: newValue });
                                            
                                            // Restaurer la position du curseur après le re-render
                                            setTimeout(() => {
                                                const textareaElement = document.getElementById(field.name);
                                                if (textareaElement && document.activeElement === textareaElement) {
                                                    textareaElement.setSelectionRange(newCursorPos, newCursorPos);
                                                    textareaElement.focus();
                                                }
                                            }, 0);
                                        }}
                                        placeholder={field.placeholder || `Saisir ${field.label.toLowerCase()}`}
                                        disabled={field.disabled || field.readOnly || false}
                                        readOnly={field.readOnly || false}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                ) : field.type === 'select' ? (
                                    // Vérifier si c'est un champ d'agents pour utiliser la recherche
                                    field.dynamicTable === 'agents' || field.dynamicTable === 'agents-institutions' || field.dynamicEndpoint === '/api/user-accounts/available-agents' ? (
                                        <div className="position-relative">
                                            <Input
                                                type="text"
                                                id={field.name}
                                                value={(() => {
                                                    // Si on est en train de taper, afficher la valeur de recherche
                                                    if (agentSearchValues[field.name]) {
                                                        return agentSearchValues[field.name];
                                                    }
                                                    
                                                    // Sinon, afficher l'agent sélectionné
                                                    const selectedAgent = dynamicOptions[field.name]?.find(option => 
                                                        option.value === formData[field.name] || option.id === formData[field.name]
                                                    );
                                                    return selectedAgent ? selectedAgent.label : '';
                                                })()}
                                                onChange={(e) => handleAgentSearchChange(field.name, e.target.value)}
                                                placeholder={`Rechercher ${field.label.toLowerCase()}...`}
                                                disabled={field.disabled || field.readOnly || false}
                                                readOnly={field.readOnly || false}
                                                style={{ textTransform: 'uppercase' }}
                                            />
                                            
                                            {/* Liste de résultats de recherche */}
                                            {agentSearchVisible[field.name] && (
                                                <div 
                                                    className="position-absolute w-100 bg-white border rounded shadow-lg"
                                                    style={{ 
                                                        zIndex: 1000, 
                                                        maxHeight: '200px', 
                                                        overflowY: 'auto',
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0
                                                    }}
                                                >
                                                    {agentSearchLoading[field.name] ? (
                                                        <div className="p-3 text-center">
                                                            <Spinner size="sm" /> Recherche...
                                                        </div>
                                                    ) : agentSearchResults[field.name]?.length > 0 ? (
                                                        agentSearchResults[field.name].map((agent) => (
                                                            <div
                                                                key={agent.id}
                                                                className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                                onClick={() => selectAgent(field.name, agent)}
                                                                style={{ cursor: 'pointer' }}
                                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                                            >
                                                                <div className="fw-bold">{agent.label}</div>
                                                                <small className="text-muted">{agent.matricule}</small>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-muted">
                                                            Aucun agent trouvé
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Bouton pour afficher la liste complète */}
                                            <Button
                                                type="button"
                                                color="outline-secondary"
                                                size="sm"
                                                className="position-absolute"
                                                style={{ 
                                                    right: '5px', 
                                                    top: '50%', 
                                                    transform: 'translateY(-50%)',
                                                    zIndex: 999
                                                }}
                                                onClick={() => {
                                                    if (agentSearchVisible[field.name]) {
                                                        setAgentSearchVisible(prev => ({ ...prev, [field.name]: false }));
                                                    } else {
                                                        // Charger tous les agents disponibles
                                                        const allAgents = dynamicOptions[field.name] || [];
                                                        setAgentSearchResults(prev => ({ ...prev, [field.name]: allAgents }));
                                                        setAgentSearchVisible(prev => ({ ...prev, [field.name]: true }));
                                                    }
                                                }}
                                            >
                                                <MdSearch />
                                            </Button>
                                        </div>
                                    ) : (field.dynamicTable === 'directions' || field.dynamicTable === 'sous_directions') ? (
                                        // Liste déroulante scrollable et recherchable pour directions / sous-directions
                                        <div className="position-relative">
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => !field.disabled && !field.readOnly && setScrollableSelectVisible(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        if (!field.disabled && !field.readOnly) setScrollableSelectVisible(prev => ({ ...prev, [field.name]: !prev[field.name] }));
                                                    }
                                                }}
                                                className="form-control d-flex align-items-center justify-content-between"
                                                style={{
                                                    cursor: field.disabled || field.readOnly ? 'not-allowed' : 'pointer',
                                                    backgroundColor: field.disabled || field.readOnly ? '#e9ecef' : 'white',
                                                    minHeight: '38px'
                                                }}
                                            >
                                                <span className="text-truncate">
                                                    {(() => {
                                                        const val = formData[field.name];
                                                        if (!val) return `Sélectionner ${field.label.toLowerCase()}`;
                                                        const opt = dynamicOptions[field.name]?.find(o => (o.value ?? o.id) == val);
                                                        return opt?.label ?? val;
                                                    })()}
                                                </span>
                                                <MdSearch className="text-muted" style={{ flexShrink: 0 }} />
                                            </div>
                                            {scrollableSelectVisible[field.name] && (
                                                <div
                                                    className="border rounded bg-white shadow-sm"
                                                    style={{
                                                        position: 'absolute',
                                                        zIndex: 1050,
                                                        top: '100%',
                                                        left: 0,
                                                        right: 0,
                                                        marginTop: '2px',
                                                        maxHeight: '280px',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        flexDirection: 'column'
                                                    }}
                                                >
                                                    <div className="p-2 border-bottom bg-light">
                                                        <Input
                                                            type="text"
                                                            placeholder={`Rechercher ${field.label.toLowerCase()}...`}
                                                            value={scrollableSelectSearch[field.name] || ''}
                                                            onChange={(e) => setScrollableSelectSearch(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{ fontSize: '14px' }}
                                                        />
                                                    </div>
                                                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                                        {(() => {
                                                            const opts = dynamicOptions[field.name] || [];
                                                            const q = (scrollableSelectSearch[field.name] || '').toLowerCase().trim();
                                                            const filtered = q
                                                                ? opts.filter(o => (o.label || '').toLowerCase().includes(q))
                                                                : opts;
                                                            return filtered.length === 0 ? (
                                                                <div className="p-3 text-muted small">Aucun résultat</div>
                                                            ) : (
                                                                filtered.map((option) => {
                                                                    const v = option.value ?? option.id;
                                                                    const label = option.label ?? String(v);
                                                                    return (
                                                                        <div
                                                                            key={v}
                                                                            className="p-2 border-bottom"
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                                backgroundColor: (formData[field.name] == v) ? '#e7f1ff' : 'white'
                                                                            }}
                                                                            onClick={() => selectScrollableOption(field.name, v, field)}
                                                                            onMouseEnter={(e) => { if (formData[field.name] != v) e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                                                                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = (formData[field.name] == v) ? '#e7f1ff' : 'white'; }}
                                                                        >
                                                                            {label}
                                                                        </div>
                                                                    );
                                                                })
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Rendu normal pour les autres champs de sélection
                                        <Input
                                            type="select"
                                            id={field.name}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => {
                                                const value = handleInputValueChange(field.name, e.target.value);
                                                if (field.name === 'type_service') {
                                                    handleTypeServiceChange(value);
                                                } else if (field.cascadeTrigger) {
                                                    handleCascadeChange(field.name, value);
                                                } else {
                                                    setFormData({ ...formData, [field.name]: value });
                                                }
                                            }}
                                            disabled={field.disabled || field.readOnly || false}
                                            readOnly={field.readOnly || false}
                                        >
                                            <option value="">Sélectionner {field.label.toLowerCase()}</option>
                                            {/* Options statiques */}
                                            {field.options && field.options.map((option) => {
                                                // Si l'option est un objet avec value et label
                                                if (typeof option === 'object' && option.value !== undefined) {
                                                    return (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    );
                                                }
                                                // Si l'option est une chaîne simple
                                                return (
                                                    <option key={option} value={option}>{option}</option>
                                                );
                                            })}
                                            {/* Options dynamiques */}
                                            {dynamicOptions[field.name] && dynamicOptions[field.name].map((option) => {
                                                // Si l'option est un objet avec value et label (pour les agents)
                                                if (typeof option === 'object' && option.value !== undefined) {
                                                    return (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    );
                                                }
                                                // Si l'option est un objet avec id et label (pour MultiStepForm)
                                                if (typeof option === 'object' && option.id !== undefined) {
                                                    return (
                                                        <option key={option.id} value={option.id}>
                                                            {option.label}
                                                        </option>
                                                    );
                                                }
                                                // Sinon, utiliser la logique existante
                                                return (
                                                    <option key={option} value={option}>{option}</option>
                                                );
                                            })}
                                        </Input>
                                    )
                                ) : field.type === 'checkbox' ? (
                                    <div className="form-check">
                                        <Input
                                            type="checkbox"
                                            id={field.name}
                                            checked={formData[field.name] || false}
                                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                                        />
                                        <Label check for={field.name} className="form-check-label">
                                            {field.label}
                                        </Label>
                                    </div>
                                ) : field.type === 'date' ? (
                                    <Input
                                        type="date"
                                        id={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: handleInputValueChange(field.name, e.target.value) })}
                                        disabled={field.disabled || field.readOnly || false}
                                        readOnly={field.readOnly || false}
                                    />
                                ) : (
                                    <Input
                                        type={field.type}
                                        id={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => {
                                            const input = e.target;
                                            const cursorPosition = input.selectionStart;
                                            const inputValue = input.value;
                                            const newValue = handleInputValueChange(field.name, inputValue);
                                            
                                            // Calculer la nouvelle position du curseur AVANT de mettre à jour le state
                                            let newCursorPos = cursorPosition;
                                            const lengthDiff = newValue.length - inputValue.length;
                                            
                                            // Ajuster la position selon la différence de longueur
                                            if (lengthDiff !== 0) {
                                                newCursorPos = cursorPosition + lengthDiff;
                                            }
                                            
                                            // S'assurer que la position est dans les limites
                                            newCursorPos = Math.max(0, Math.min(newCursorPos, newValue.length));
                                            
                                            setFormData({ ...formData, [field.name]: newValue });
                                            
                                            // Restaurer la position du curseur après le re-render
                                            setTimeout(() => {
                                                const inputElement = document.getElementById(field.name);
                                                if (inputElement && document.activeElement === inputElement) {
                                                    inputElement.setSelectionRange(newCursorPos, newCursorPos);
                                                    inputElement.focus();
                                                }
                                            }, 0);
                                        }}
                                        placeholder={field.placeholder || `Saisir ${field.label.toLowerCase()}`}
                                        disabled={field.disabled || field.readOnly || false}
                                        readOnly={field.readOnly || false}
                                        min={field.type === 'number' ? 0 : undefined}
                                        step={field.type === 'number' ? 1 : undefined}
                                        style={{ textTransform: field.type === 'text' ? 'uppercase' : 'none' }}
                                    />
                                )}
                            </FormGroup>
                            );
                        })}
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleSave}>
                        Sauvegarder
                    </Button>
                    <Button color="secondary" onClick={() => { setScrollableSelectVisible({}); setScrollableSelectSearch({}); setModal(false); }}>
                        Annuler
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour afficher les agents de la direction / direction générale / sous-direction */}
            <Modal isOpen={agentsModal} toggle={() => {
                setAgentsModal(false);
                setSelectedDirectionGenerale(null);
                setSelectedSousDirection(null);
                setSousDirectionAgents([]);
            }} size="lg">
                <ModalHeader toggle={() => {
                    setAgentsModal(false);
                    setSelectedDirectionGenerale(null);
                    setSelectedSousDirection(null);
                    setSousDirectionAgents([]);
                }}>
                    <MdPeople className="me-2" />
                    {selectedDirectionGenerale ? `Agents de la direction générale: ${selectedDirectionGenerale.libelle}` : selectedDirection ? `Agents de la direction: ${selectedDirection.libelle}` : selectedSousDirection ? `Agents de la sous-direction: ${selectedSousDirection.libelle}` : 'Agents'}
                </ModalHeader>
                <ModalBody>
                    {loadingAgents ? (
                        <div className="d-flex justify-content-center">
                            <Spinner color="primary" />
                        </div>
                    ) : (
                        <div>
                            {directionAgents.length === 0 ? (
                                <Alert color="info">
                                    {selectedDirectionGenerale ? 'Aucun agent rattaché directement à cette direction générale.' : selectedDirection ? 'Aucun agent trouvé pour cette direction.' : selectedSousDirection ? 'Aucun agent trouvé pour cette sous-direction.' : 'Aucun agent trouvé.'}
                                </Alert>
                            ) : (
                                <div>
                                    {/* Barre de recherche */}
                                    <Row className="mb-3">
                                        <Col md="12">
                                            <InputGroup>
                                                <InputGroupAddon addonType="prepend">
                                                    <InputGroupText>
                                                        <MdSearch />
                                                    </InputGroupText>
                                                </InputGroupAddon>
                                                <Input
                                                    type="text"
                                                    placeholder="Rechercher par nom ou matricule..."
                                                    value={agentSearchTerm}
                                                    onChange={(e) => setAgentSearchTerm(e.target.value)}
                                                    style={{ textTransform: 'uppercase' }}
                                                />
                                            </InputGroup>
                                        </Col>
                                    </Row>

                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>N°</th>
                                                <th>Nom complet</th>
                                                <th>Matricule</th>
                                                <th>Fonction</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAgents.map((agent, index) => (
                                                <tr key={agent.id}>
                                                    <td>{index + 1}</td>
                                                    <td>
                                                        {agent.id === selectedDirection?.responsable_id ? (
                                                            <strong style={{ color: '#000', fontWeight: 'bold' }}>
                                                                {agent.nom_complet} (Chef de direction)
                                                            </strong>
                                                        ) : (
                                                            agent.nom_complet
                                                        )}
                                                    </td>
                                                    <td>{agent.matricule}</td>
                                                    <td>{agent.fonction_libele || '-'}</td>
                                                    <td>
                                                        <Badge color={agent.statut_emploi === 'actif' ? 'success' : 'secondary'}>
                                                            {agent.statut_emploi_libelle}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            onClick={() => handleViewAgent(agent.id)}
                                                        >
                                                            <MdEdit className="me-1" />
                                                            Voir
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>

                                    {filteredAgents.length === 0 && agentSearchTerm && (
                                        <Alert color="warning">
                                            Aucun agent trouvé pour la recherche "{agentSearchTerm}".
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => {
                        setAgentsModal(false);
                        setSelectedDirectionGenerale(null);
                        setSelectedSousDirection(null);
                        setSousDirectionAgents([]);
                    }}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour saisir le motif de retrait */}
            <Modal isOpen={motifRetraitModal} toggle={() => {
                setMotifRetraitModal(false);
                setAgentIdPourRetrait(null);
                setMotifRetraitText('');
            }} size="md">
                <ModalHeader toggle={() => {
                    setMotifRetraitModal(false);
                    setAgentIdPourRetrait(null);
                    setMotifRetraitText('');
                }}>
                    Motif de retrait
                </ModalHeader>
                <ModalBody>
                    <FormGroup>
                        <Label for="motifRetrait">Veuillez saisir le motif de retrait <span style={{ color: 'red' }}>*</span></Label>
                        <Input
                            type="textarea"
                            id="motifRetrait"
                            rows="5"
                            value={motifRetraitText}
                            onChange={(e) => setMotifRetraitText(e.target.value)}
                            placeholder="Saisissez le motif pour lequel cet agent est retiré..."
                            required
                        />
                    </FormGroup>
                    {error && (
                        <Alert color="danger" className="mt-3">
                            {error}
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handleConfirmRetrait} disabled={!motifRetraitText.trim()}>
                        Confirmer le retrait
                    </Button>
                    <Button color="secondary" onClick={() => {
                        setMotifRetraitModal(false);
                        setAgentIdPourRetrait(null);
                        setMotifRetraitText('');
                        setError(null);
                    }}>
                        Annuler
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour afficher le motif */}
            <Modal isOpen={motifAfficherModal} toggle={() => {
                setMotifAfficherModal(false);
                setAgentMotifAfficher(null);
                setHistoriqueMotifs([]);
                setLoadingHistorique(false);
            }} size="lg">
                <ModalHeader toggle={() => {
                    setMotifAfficherModal(false);
                    setAgentMotifAfficher(null);
                }}>
                    Motif - {agentMotifAfficher?.nomComplet || 'Agent'}
                </ModalHeader>
            <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {loadingHistorique ? (
                    <div className="d-flex justify-content-center">
                        <Spinner color="primary" />
                    </div>
                ) : historiqueMotifs.length > 0 ? (
                    <div>
                        <h6 style={{ fontWeight: 'bold', marginBottom: '20px' }}>Historique complet des retraits et restaurations :</h6>
                        {historiqueMotifs.map((paire, index) => (
                            <div key={index} className="mb-4" style={{ 
                                border: '2px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '15px',
                                marginBottom: '20px',
                                backgroundColor: '#ffffff'
                            }}>
                                <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #dee2e6' }}>
                                    <h6 style={{ 
                                        fontWeight: 'bold', 
                                        color: '#495057',
                                        margin: 0
                                    }}>
                                        Événement #{historiqueMotifs.length - index}/{historiqueMotifs.length}
                                    </h6>
                                </div>
                                
                                {/* Affichage du retrait */}
                                {paire.retrait && (
                                    <div style={{ 
                                        borderLeft: '4px solid #dc3545',
                                        paddingLeft: '15px',
                                        marginBottom: paire.restauration ? '15px' : '0'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <h6 style={{ 
                                                fontWeight: 'bold', 
                                                color: '#dc3545',
                                                margin: 0
                                            }}>
                                                🔴 Retrait
                                            </h6>
                                            <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                                                {paire.date_retrait ? new Date(paire.date_retrait).toLocaleString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'Date non disponible'}
                                            </small>
                                        </div>
                                        {paire.retrait.motif && (
                                            <p style={{ 
                                                whiteSpace: 'pre-wrap', 
                                                padding: '10px', 
                                                backgroundColor: '#fff5f5', 
                                                borderRadius: '4px',
                                                margin: 0
                                            }}>
                                                {paire.retrait.motif}
                                            </p>
                                        )}
                                        {!paire.retrait.motif && (
                                            <p style={{ 
                                                fontStyle: 'italic', 
                                                color: '#6c757d',
                                                margin: 0
                                            }}>
                                                Aucun motif enregistré
                                            </p>
                                        )}
                                    </div>
                                )}
                                
                                {/* Affichage de la restauration */}
                                {paire.restauration && (
                                    <div style={{ 
                                        borderLeft: '4px solid #28a745',
                                        paddingLeft: '15px',
                                        marginTop: paire.retrait ? '10px' : '0'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <h6 style={{ 
                                                fontWeight: 'bold', 
                                                color: '#28a745',
                                                margin: 0
                                            }}>
                                                🟢 Restauration
                                            </h6>
                                            <small className="text-muted" style={{ fontSize: '0.85rem' }}>
                                                {paire.date_restauration ? new Date(paire.date_restauration).toLocaleString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : 'Date non disponible'}
                                            </small>
                                        </div>
                                        {paire.restauration.motif && (
                                            <p style={{ 
                                                whiteSpace: 'pre-wrap', 
                                                padding: '10px', 
                                                backgroundColor: '#f0fff4', 
                                                borderRadius: '4px',
                                                margin: 0
                                            }}>
                                                {paire.restauration.motif}
                                            </p>
                                        )}
                                        {!paire.restauration.motif && (
                                            <p style={{ 
                                                fontStyle: 'italic', 
                                                color: '#6c757d',
                                                margin: 0
                                            }}>
                                                Aucun motif enregistré
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <Alert color="info">
                        Aucun historique de retrait ou de restauration enregistré pour cet agent.
                    </Alert>
                )}
            </ModalBody>
                <ModalFooter>
                <Button color="secondary" onClick={() => {
                    setMotifAfficherModal(false);
                    setAgentMotifAfficher(null);
                    setHistoriqueMotifs([]);
                    setLoadingHistorique(false);
                }}>
                    Fermer
                </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default ManagementPage;
