import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { normaliserConges, normaliserCongesArray, calculerJoursRestants } from '../utils/congesUtils';
// CongesYearDisplay n'est plus utilisé, import supprimé
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Row,
    Col,
    Badge,
    Button,
    Table,
    Alert,
    Spinner,
    Form,
    FormGroup,
    Label,
    Input,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Navbar,
    NavbarBrand,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    ListGroup,
    ListGroupItem,
} from 'reactstrap';
import { FaBell, FaSignOutAlt } from 'react-icons/fa';
import { MdFingerprint, MdDelete, MdInfo, MdError, MdCheckCircle } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { 
    isWebAuthnSupported 
} from '../services/webauthnService';
import FingerprintRegistrationModal from '../components/WebAuthn/FingerprintRegistrationModal';
import CreateDemandeModal from '../components/Demandes/CreateDemandeModal';
import DemandesList from '../components/Demandes/DemandesList';
import DemandesDRHList from '../components/Demandes/DemandesDRHList';
import DemandeDetails from '../components/Demandes/DemandeDetails';
import DemandeSuivi from '../components/Demandes/DemandeSuivi';
import ValidationModal from '../components/Demandes/ValidationModal';
import NotificationsPanel from '../components/Notifications/NotificationsPanel';
import DocumentsGenerated from '../components/Documents/DocumentsGenerated';
import HistoriqueDemandes from '../components/Demandes/HistoriqueDemandes';
import VersionChecker from '../components/VersionChecker';
import BirthdaysDetailsModal from '../components/Anniversaires/BirthdaysDetailsModal';
import BirthdaysMessageModal from '../components/Anniversaires/BirthdaysMessageModal';
import { backendRoutes } from '../config/routes';
import { getApiUrl, getAuthHeaders } from '../config/api';
import {
    MdPerson, MdBusiness, MdWork, MdAssignment, MdPlace, MdTrendingUp,
    MdGroup, MdCategory, MdSchool, MdEmojiEvents, MdScience, MdLanguage,
    MdComputer, MdEvent, MdDescription, MdMail, MdBuild, MdFolder, MdPeople,
    MdSecurity, MdFlight, MdNote, MdHistory, MdVisibility,
    MdDashboard, MdAccountBalance, MdBusinessCenter, MdCake, MdMessage, MdCalendarToday
} from 'react-icons/md';
import '../styles/agent-dashboard.css';

// Mapper les icônes pour les routes dynamiques
const iconMap = {
    'MdPerson': MdPerson,
    'MdBusiness': MdBusiness,
    'MdWork': MdWork,
    'MdAssignment': MdAssignment,
    'MdPlace': MdPlace,
    'MdTrendingUp': MdTrendingUp,
    'MdGroup': MdGroup,
    'MdCategory': MdCategory,
    'MdSchool': MdSchool,
    'MdEmojiEvents': MdEmojiEvents,
    'MdScience': MdScience,
    'MdLanguage': MdLanguage,
    'MdComputer': MdComputer,
    'MdEvent': MdEvent,
    'MdDescription': MdDescription,
    'MdMail': MdMail,
    'MdBuild': MdBuild,
    'MdFolder': MdFolder,
    'MdPeople': MdPeople,
    'MdSecurity': MdSecurity,
    'MdFlight': MdFlight,
    'MdCheckCircle': MdCheckCircle,
    'MdNote': MdNote,
    'MdHistory': MdHistory,
    'MdVisibility': MdVisibility,
    'MdDashboard': MdDashboard,
    'MdAccountBalance': MdAccountBalance,
    'MdBusinessCenter': MdBusinessCenter
};

// Log de vérification que le nouveau code est chargé - VERSION UNIQUE POUR FORCER LE RECHARGEMENT
const CODE_VERSION = 'v5.0-FORCE-RECALCUL-FINAL-' + new Date().toISOString();
window.FORCE_RECALCUL_VERSION = CODE_VERSION; // Stocker dans window pour forcer le rechargement

// ALERTE VISIBLE pour forcer le rechargement si l'ancien code est chargé
if (typeof window !== 'undefined') {
    setTimeout(() => {
        if (!window.FORCE_RECALCUL_VERSION || !window.FORCE_RECALCUL_VERSION.includes('v5.0')) {
            const message = '⚠️ ANCIEN CODE DÉTECTÉ!\n\nVeuillez:\n1. Vider le cache (Ctrl+Shift+Delete)\n2. Redémarrer le serveur React\n3. Recharger avec Ctrl+Shift+R';
            console.error('❌❌❌ ' + message);
            alert(message);
        }
    }, 2000);
}

// Logs de débogage supprimés
console.log('🚀 Vérification imports:', {
    normaliserConges: typeof normaliserConges,
    normaliserCongesArray: typeof normaliserCongesArray,
    calculerJoursRestants: typeof calculerJoursRestants
});

const AgentDashboard = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const history = useHistory();
    const [agentData, setAgentData] = useState(null);
    const [organizationData, setOrganizationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        // Récupérer l'onglet actif depuis localStorage ou utiliser '1' par défaut
        return localStorage.getItem('agentDashboardActiveTab') || '1';
    });
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [assignedRoutes, setAssignedRoutes] = useState([]);
    const [loadingAssignedRoutes, setLoadingAssignedRoutes] = useState(false);
    
    // États pour les demandes et notifications
    const [showCreateDemandeModal, setShowCreateDemandeModal] = useState(false);
    const [showDemandeDetails, setShowDemandeDetails] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [nombreNotificationsNonLues, setNombreNotificationsNonLues] = useState(0);
    const [selectedNotificationId, setSelectedNotificationId] = useState(null);
    const [selectedNotificationMessage, setSelectedNotificationMessage] = useState(null);
    const [showNotificationMessageModal, setShowNotificationMessageModal] = useState(false);
    const [validationSuccess, setValidationSuccess] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(null);
    
    // États pour l'empreinte digitale
    const [fingerprintError, setFingerprintError] = useState(null);
    const [fingerprintSuccess, setFingerprintSuccess] = useState(null);
    const [isWebAuthnAvailable, setIsWebAuthnAvailable] = useState(false);
    const [credentials, setCredentials] = useState([]);
    const [deviceName, setDeviceName] = useState('');
    const [showFingerprintModal, setShowFingerprintModal] = useState(false);
    const [isEditingBase, setIsEditingBase] = useState(false);
    const [baseSaving, setBaseSaving] = useState(false);
    const [baseError, setBaseError] = useState(null);
    const [baseSuccess, setBaseSuccess] = useState(null);
    const [baseForm, setBaseForm] = useState({
        maritalStatusId: '',
        nombreEnfant: '',
        photoFile: null,
        marriageDate: '',
        marriageCertificate: null,
        spouseLastName: '',
        spouseFirstName: '',
    });
    const [marriageCertificateName, setMarriageCertificateName] = useState('');
    const [existingMarriageCertificate, setExistingMarriageCertificate] = useState(null);
    const [childrenForm, setChildrenForm] = useState([]);
    const [basePhotoPreview, setBasePhotoPreview] = useState(null);
    const [maritalStatuses, setMaritalStatuses] = useState([]);
    const [civilites, setCivilites] = useState([]);
    const [nationalites, setNationalites] = useState([]);
    const [autoOpenPhoto, setAutoOpenPhoto] = useState(false);
    const basePhotoInputRef = useRef(null);
    const [profilePhotoUrls, setProfilePhotoUrls] = useState([]);
    const [profilePhotoIndex, setProfilePhotoIndex] = useState(0);
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [contactSaving, setContactSaving] = useState(false);
    const [contactError, setContactError] = useState(null);
    const [contactSuccess, setContactSuccess] = useState(null);
    const [contactForm, setContactForm] = useState({
        email: '',
        telephone1: '',
        telephone2: '',
        adresse: ''
    });
    const [functionHistory, setFunctionHistory] = useState([]);
    const [employmentHistory, setEmploymentHistory] = useState([]);
    const [isEditingOrganization, setIsEditingOrganization] = useState(false);
    const [organizationSaving, setOrganizationSaving] = useState(false);
    const [organizationError, setOrganizationError] = useState(null);
    const [organizationSuccess, setOrganizationSuccess] = useState(null);
    const [organizationForm, setOrganizationForm] = useState({
        id_direction: '',
        id_sous_direction: '',
        id_service: ''
    });
    const [directions, setDirections] = useState([]);
    const [sousDirections, setSousDirections] = useState([]);
    const [services, setServices] = useState([]);
    const [agentSeminaires, setAgentSeminaires] = useState([]);
    const [loadingSeminaires, setLoadingSeminaires] = useState(false);
    const [agentConges, setAgentConges] = useState(null);
    const [agentCongesPreviousYears, setAgentCongesPreviousYears] = useState([]);
    const [loadingConges, setLoadingConges] = useState(false);
    
    // États pour les anniversaires et congés (pour directeurs et sous-directeurs)
    const [birthdays, setBirthdays] = useState([]);
    const [birthdaysLoading, setBirthdaysLoading] = useState(false);
    const [detailsModalToday, setDetailsModalToday] = useState(false);
    const [detailsModalUpcoming, setDetailsModalUpcoming] = useState(false);
    const [messageModalToday, setMessageModalToday] = useState(false);
    const [messageModalUpcoming, setMessageModalUpcoming] = useState(false);
    const [congesAgents, setCongesAgents] = useState([]);
    const [congesLoading, setCongesLoading] = useState(false);
    const [agentsEnConges, setAgentsEnConges] = useState(null);
    const [agentsEnCongesLoading, setAgentsEnCongesLoading] = useState(false);
    const [showAgentsEnCongesModal, setShowAgentsEnCongesModal] = useState(false);
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [selectedCongesPeriod, setSelectedCongesPeriod] = useState(null);
    const [showCongesModal, setShowCongesModal] = useState(false);
    
    // États pour la gestion des diplômes
    const [diplomesOptions, setDiplomesOptions] = useState([]);
    const [loadingDiplomesOptions, setLoadingDiplomesOptions] = useState(false);
    const [isEditingDiplomes, setIsEditingDiplomes] = useState(false);
    const [diplomesSaving, setDiplomesSaving] = useState(false);
    const [diplomesError, setDiplomesError] = useState(null);
    const [diplomesSuccess, setDiplomesSuccess] = useState(null);
    const [nombreDiplomes, setNombreDiplomes] = useState(0);
    const [diplomesForm, setDiplomesForm] = useState([]);
    
    // SOLUTION FORCÉE: useEffect qui CORRIGE les valeurs après le chargement même si le cache est actif
    useEffect(() => {
        if (agentCongesPreviousYears.length > 0) {
            console.log('🔧🔧🔧 CORRECTION FORCÉE - Recalcul de tous les jours_restants');
            const corrige = agentCongesPreviousYears.map(c => {
                const jours_alloues = parseInt(c.jours_alloues, 10) || 30;
                const jours_pris = parseInt(c.jours_pris, 10) || 0;
                const jours_restants_corrige = Math.max(0, jours_alloues - jours_pris);
                
                // Si la valeur stockée est incorrecte, la corriger
                if (c.jours_restants !== jours_restants_corrige) {
                    console.log(`⚠️ CORRECTION: Année ${c.annee} - ${c.jours_restants} → ${jours_restants_corrige}`);
                    return {
                        ...c,
                        jours_alloues,
                        jours_pris,
                        jours_restants: jours_restants_corrige
                    };
                }
                return {
                    ...c,
                    jours_alloues,
                    jours_pris,
                    jours_restants: jours_restants_corrige
                };
            });
            
            // Vérifier si une correction est nécessaire
            const correctionNecessaire = corrige.some((c, i) => 
                c.jours_restants !== agentCongesPreviousYears[i]?.jours_restants
            );
            
            if (correctionNecessaire) {
                console.log('✅ CORRECTION APPLIQUÉE - Mise à jour de l\'état');
                setAgentCongesPreviousYears(corrige);
            }
        }
    }, [agentCongesPreviousYears]);
    
    // APPROCHE ROBUSTE: Calculer TOUJOURS jours_restants dynamiquement depuis les valeurs brutes
    // Ne JAMAIS utiliser agentConges.jours_restants ou agentCongesPreviousYears[].jours_restants directement
    const anneesPrecedentesNormalisees = useMemo(() => {
        // Log de débogage supprimé
        if (!agentCongesPreviousYears || !Array.isArray(agentCongesPreviousYears)) {
            return [];
        }
        return agentCongesPreviousYears.map(c => {
            // Extraire les valeurs brutes et recalculer TOUJOURS
            const jours_alloues = c.jours_alloues !== null && c.jours_alloues !== undefined 
                ? parseInt(c.jours_alloues, 10) 
                : 30;
            const jours_pris = c.jours_pris !== null && c.jours_pris !== undefined 
                ? parseInt(c.jours_pris, 10) 
                : 0;
            // RECALCUL FORCÉ - Ne jamais utiliser c.jours_restants
            const jours_restants = Math.max(0, jours_alloues - jours_pris);
            
            // Logs de débogage supprimés
            
            return {
                ...c,
                jours_alloues,
                jours_pris,
                jours_restants // VALEUR RECALCULÉE, ignore c.jours_restants
            };
        });
    }, [agentCongesPreviousYears]);
    
    // Calculer l'année en cours avec recalcul forcé
    const agentCongesNormalise = useMemo(() => {
        if (!agentConges) return null;
        const jours_alloues = agentConges.jours_alloues !== null && agentConges.jours_alloues !== undefined 
            ? parseInt(agentConges.jours_alloues, 10) 
            : 30;
        const jours_pris = agentConges.jours_pris !== null && agentConges.jours_pris !== undefined 
            ? parseInt(agentConges.jours_pris, 10) 
            : 0;
        const jours_restants = Math.max(0, jours_alloues - jours_pris);
        return {
            ...agentConges,
            jours_alloues,
            jours_pris,
            jours_restants // RECALCUL FORCÉ
        };
    }, [agentConges]);
    
    // Référence pour vérifier si le composant est monté
    const isMountedRef = useRef(true);

    // Récupérer les paramètres d'organisation depuis l'URL
    const urlParams = new URLSearchParams(location.search);
    const urlOrganizationType = urlParams.get('organization');
    const urlOrganizationId = urlParams.get('id');
    const urlNotificationId = urlParams.get('notificationId');
    const urlTab = urlParams.get('tab');

    // Gérer la notification sélectionnée depuis l'URL
    useEffect(() => {
        if (urlNotificationId) {
            setSelectedNotificationId(parseInt(urlNotificationId));
            // Ouvrir l'onglet boîte de réception (tab 6)
            if (urlTab === '6' || !urlTab) {
                setActiveTab('6');
            }
            // Charger le message de la notification depuis l'API
            loadNotificationMessage(parseInt(urlNotificationId));
            // Nettoyer l'URL après avoir récupéré le paramètre
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('notificationId');
            if (!urlTab) {
                newUrl.searchParams.set('tab', '6');
            }
            window.history.replaceState({}, '', newUrl);
        }
    }, [urlNotificationId, urlTab]);

    // Fonction pour charger le message d'une notification depuis l'API
    const loadNotificationMessage = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/${notificationId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    setSelectedNotificationMessage(result.data);
                    setShowNotificationMessageModal(true);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement du message de la notification:', error);
        }
    };

    // Sauvegarder l'onglet actif dans localStorage
    useEffect(() => {
        localStorage.setItem('agentDashboardActiveTab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (agentData) {
            setContactForm({
                email: agentData.email || '',
                telephone1: agentData.telephone1 || '',
                telephone2: agentData.telephone2 || '',
                adresse: agentData.ad_pri_rue || agentData.ad_pro_rue || ''
            });
            
            // Déterminer le nombre d'enfants : TOUJOURS utiliser nombre_enfant depuis la base de données
            // nombre_enfant = nombre saisi par l'utilisateur (peut être supérieur au nombre d'enfants créés)
            const existingChildren = Array.isArray(agentData.enfants) ? agentData.enfants : [];
            const childrenCount = agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null 
                ? agentData.nombre_enfant 
                : (existingChildren.length > 0 ? existingChildren.length : 0);
            
            // Récupérer l'acte de mariage existant depuis les documents
            const acteMariageDoc = agentData.documents?.find(doc => doc.document_type === 'acte_mariage') || null;
            setExistingMarriageCertificate(acteMariageDoc);
            
            setBaseForm({
                maritalStatusId: agentData.id_situation_matrimoniale ? String(agentData.id_situation_matrimoniale) : '',
                nombreEnfant: String(childrenCount),
                photoFile: null,
                marriageDate: agentData.date_mariage ? formatDateForInput(agentData.date_mariage) : '',
                marriageCertificate: null,
                spouseLastName: agentData.nom_conjointe || '',
                spouseFirstName: agentData.prenom_conjointe || '',
            });
            if (!isEditingBase) {
                // TOUJOURS utiliser nombre_enfant depuis la base de données
                // même s'il est supérieur au nombre d'enfants récupérés
                const initialCount = agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null 
                    ? agentData.nombre_enfant 
                    : (existingChildren.length > 0 ? existingChildren.length : 0);
                console.log('🔍 useEffect - Initialisation formulaire enfants:', {
                    existingChildren: existingChildren.length,
                    nombre_enfant: agentData.nombre_enfant,
                    initialCount,
                    enfants: existingChildren
                });
                setChildrenForm(prepareChildrenForm(initialCount, existingChildren));
            }
            setBasePhotoPreview(null);
            setMarriageCertificateName('');
            // Initialiser le formulaire d'organisation
            if (!isEditingOrganization) {
                setOrganizationForm({
                    id_direction: agentData.id_direction ? String(agentData.id_direction) : '',
                    id_sous_direction: agentData.id_sous_direction ? String(agentData.id_sous_direction) : '',
                    id_service: agentData.id_service ? String(agentData.id_service) : ''
                });
                
                // Charger les sous-directions et services si la direction est définie
                if (agentData.id_direction) {
                    // Charger uniquement les sous-directions de la direction de l'agent
                    loadSousDirections(agentData.id_direction);
                    
                    // Charger les services : si l'agent a une sous-direction, charger ses services
                    // Sinon, charger les services directs de la direction
                    if (agentData.id_sous_direction) {
                        loadServices(agentData.id_sous_direction, agentData.id_direction);
                    } else {
                        // Charger les services directement liés à la direction
                        loadServices(null, agentData.id_direction);
                    }
                }
            }
        }
    }, [agentData, isEditingBase, isEditingOrganization]);

    // useEffect spécifique pour mettre à jour le formulaire des enfants quand agentData.enfants change
    useEffect(() => {
        if (agentData && !isEditingBase) {
            const existingChildren = Array.isArray(agentData.enfants) ? agentData.enfants : [];
            // TOUJOURS utiliser nombre_enfant depuis la base de données
            const nombreEnfantFromDB = agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null 
                ? agentData.nombre_enfant 
                : (existingChildren.length > 0 ? existingChildren.length : 0);
            
            if (nombreEnfantFromDB > 0) {
                console.log('🔍 useEffect enfants - Mise à jour du formulaire avec', nombreEnfantFromDB, 'champ(s) (nombre_enfant:', agentData.nombre_enfant, ', enfants récupérés:', existingChildren.length, ')');
                const preparedForm = prepareChildrenForm(nombreEnfantFromDB, existingChildren);
                setChildrenForm(preparedForm);
                // Mettre à jour aussi le nombre d'enfants dans le formulaire de base avec la valeur de la base de données
                setBaseForm(prev => ({
                    ...prev,
                    nombreEnfant: String(nombreEnfantFromDB)
                }));
            } else {
                // Aucun enfant
                setChildrenForm([]);
                setBaseForm(prev => ({
                    ...prev,
                    nombreEnfant: '0'
                }));
            }
        }
    }, [agentData?.enfants, agentData?.nombre_enfant, isEditingBase]);

    useEffect(() => {
        const loadHistories = async () => {
            if (!user?.id_agent) {
                setFunctionHistory([]);
                setEmploymentHistory([]);
                return;
            }

            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            try {
                const [functionsRes, emploisRes] = await Promise.all([
                    fetch(`https://tourisme.2ise-groupe.com/api/agent-fonctions/agent/${user.id_agent}`, { headers }),
                    fetch(`https://tourisme.2ise-groupe.com/api/agent-emplois/agent/${user.id_agent}`, { headers })
                ]);

                const functionsData = await functionsRes.json().catch(() => ({}));
                const emploisData = await emploisRes.json().catch(() => ({}));

                if (functionsRes.ok && functionsData.success) {
                    setFunctionHistory(Array.isArray(functionsData.data) ? functionsData.data : []);
                } else {
                    setFunctionHistory([]);
                }

                if (emploisRes.ok && emploisData.success) {
                    setEmploymentHistory(Array.isArray(emploisData.data) ? emploisData.data : []);
                } else {
                    setEmploymentHistory([]);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des historiques:', error);
                setFunctionHistory([]);
                setEmploymentHistory([]);
            }
        };

        loadHistories();
    }, [user?.id_agent]);

    useEffect(() => {
        const fetchMaritalStatuses = async () => {
            try {
                const token = localStorage.getItem('token');
                
                // Utiliser le bon endpoint (pluriel avec tiret)
                const response = await fetch('https://tourisme.2ise-groupe.com/api/situation-matrimonials?limit=200', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        // Essayer l'autre format avec underscore
                        const altResponse = await fetch('https://tourisme.2ise-groupe.com/api/situation_matrimonials?limit=200', {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            }
                        });
                        
                        if (altResponse.ok) {
                            const altData = await altResponse.json();
                            // Continuer avec altData au lieu de data
                            const extractStatuses = (payload) => {
                                if (!payload) return [];
                                if (Array.isArray(payload)) return payload;
                                if (payload.data) return extractStatuses(payload.data);
                                if (payload.rows) return extractStatuses(payload.rows);
                                if (payload.items) return extractStatuses(payload.items);
                                return [];
                            };
                            
                            const statusesRaw = extractStatuses(altData);
                            const normalizeLabel = (label) => {
                                if (!label) return '';
                                const lower = label.toString().toLowerCase();
                                if (lower.includes('célib')) return 'Célibataire';
                                if (lower.includes('mari')) return 'Marié';
                                if (lower.includes('veuf')) return 'Veuf';
                                if (lower.includes('veuv')) return 'Veuve';
                                return label;
                            };
                            
                            const order = ['Célibataire', 'Marié', 'Veuf', 'Veuve'];
                            const mappedStatuses = statusesRaw
                                .map(status => ({
                                    ...status,
                                    libele: normalizeLabel(
                                        status.libele ||
                                        status.libelle ||
                                        status.name ||
                                        status.label ||
                                        status.value
                                    ),
                                }))
                                .sort((a, b) => {
                                    const indexA = order.indexOf(a.libele);
                                    const indexB = order.indexOf(b.libele);
                                    if (indexA === -1 && indexB === -1) return 0;
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                });
                            
                            setMaritalStatuses(mappedStatuses);
                            return;
                        }
                    }
                    throw new Error('Impossible de charger les statuts matrimoniaux.');
                }

                const data = await response.json();

                const extractStatuses = (payload) => {
                    if (!payload) return [];
                    if (Array.isArray(payload)) return payload;
                    if (payload.data) return extractStatuses(payload.data);
                    if (payload.rows) return extractStatuses(payload.rows);
                    if (payload.items) return extractStatuses(payload.items);
                    return [];
                };

                const statusesRaw = extractStatuses(data);

                const normalizeLabel = (label) => {
                    if (!label) return '';
                    const lower = label.toString().toLowerCase();
                    if (lower.includes('célib')) return 'Célibataire';
                    if (lower.includes('mari')) return 'Marié';
                    if (lower.includes('veuf')) return 'Veuf';
                    if (lower.includes('veuv')) return 'Veuve';
                    return label;
                };

                const order = ['Célibataire', 'Marié', 'Veuf', 'Veuve'];

                const mappedStatuses = statusesRaw
                    .map(status => ({
                        ...status,
                        libele: normalizeLabel(
                            status.libele ||
                            status.libelle ||
                            status.name ||
                            status.label ||
                            status.value
                        ),
                    }))
                    .filter(status => status.libele);

                const sortedStatuses = mappedStatuses.sort((a, b) => {
                    const indexA = order.indexOf(a.libele);
                    const indexB = order.indexOf(b.libele);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                });

                if (sortedStatuses.length > 0) {
                    setMaritalStatuses(sortedStatuses);
                } else {
                    setMaritalStatuses([
                        { id: 'celibataire', libele: 'Célibataire' },
                        { id: 'marie', libele: 'Marié' },
                        { id: 'veuf', libele: 'Veuf' },
                        { id: 'veuve', libele: 'Veuve' },
                    ]);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des statuts matrimoniaux:', error);
                setMaritalStatuses([
                    { id: 'celibataire', libele: 'Célibataire' },
                    { id: 'marie', libele: 'Marié' },
                    { id: 'veuf', libele: 'Veuf' },
                    { id: 'veuve', libele: 'Veuve' },
                ]);
            }
        };

        fetchMaritalStatuses();
    }, []);

    // Charger les civilités
    useEffect(() => {
        const fetchCivilites = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://tourisme.2ise-groupe.com/api/civilites?limit=200', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const extractItems = (payload) => {
                        if (!payload) return [];
                        if (Array.isArray(payload)) return payload;
                        if (payload.data) return extractItems(payload.data);
                        if (payload.rows) return extractItems(payload.rows);
                        if (payload.items) return extractItems(payload.items);
                        return [];
                    };
                    const items = extractItems(data);
                    setCivilites(items);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des civilités:', error);
            }
        };

        fetchCivilites();
    }, []);

    // Charger les nationalités
    useEffect(() => {
        const fetchNationalites = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://tourisme.2ise-groupe.com/api/nationalites?limit=200', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const extractItems = (payload) => {
                        if (!payload) return [];
                        if (Array.isArray(payload)) return payload;
                        if (payload.data) return extractItems(payload.data);
                        if (payload.rows) return extractItems(payload.rows);
                        if (payload.items) return extractItems(payload.items);
                        return [];
                    };
                    const items = extractItems(data);
                    setNationalites(items);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des nationalités:', error);
            }
        };

        fetchNationalites();
    }, []);

    // Mettre à jour le libellé du statut matrimonial lorsque maritalStatuses est chargé
    useEffect(() => {
        if (agentData && agentData.id_situation_matrimoniale && maritalStatuses.length > 0) {
            // Mettre à jour le libellé si absent ou si l'ID correspond
            const matchedStatus = maritalStatuses.find(status => 
                String(status.id || status.value) === String(agentData.id_situation_matrimoniale)
            );
            if (matchedStatus) {
                const libele = matchedStatus.libele || matchedStatus.name || matchedStatus.label || matchedStatus.value;
                // Mettre à jour seulement si le libellé est différent ou absent
                if (!agentData.situation_matrimoniale_libele || agentData.situation_matrimoniale_libele !== libele) {
                    setAgentData(prev => ({
                        ...prev,
                        situation_matrimoniale_libele: libele
                    }));
                }
            }
        }
    }, [maritalStatuses, agentData?.id_situation_matrimoniale]);

    // Mettre à jour le libellé de la civilité lorsque civilites est chargé
    useEffect(() => {
        if (agentData && agentData.id_civilite && civilites.length > 0) {
            const matchedCivilite = civilites.find(civilite => 
                String(civilite.id || civilite.value) === String(agentData.id_civilite)
            );
            if (matchedCivilite) {
                const libele = matchedCivilite.libele || matchedCivilite.name || matchedCivilite.label || matchedCivilite.value;
                if (!agentData.civilite_libele || agentData.civilite_libele !== libele) {
                    setAgentData(prev => ({
                        ...prev,
                        civilite_libele: libele
                    }));
                }
            }
        }
    }, [civilites, agentData?.id_civilite]);

    // Mettre à jour le libellé de la nationalité lorsque nationalites est chargé
    useEffect(() => {
        if (agentData && agentData.id_nationalite && nationalites.length > 0) {
            const matchedNationalite = nationalites.find(nationalite => 
                String(nationalite.id || nationalite.value) === String(agentData.id_nationalite)
            );
            if (matchedNationalite) {
                const libele = matchedNationalite.libele || matchedNationalite.name || matchedNationalite.label || matchedNationalite.value;
                if (!agentData.nationalite_libele || agentData.nationalite_libele !== libele) {
                    setAgentData(prev => ({
                        ...prev,
                        nationalite_libele: libele
                    }));
                }
            }
        }
    }, [nationalites, agentData?.id_nationalite]);

    useEffect(() => {
        if (isEditingBase && autoOpenPhoto) {
            const timer = setTimeout(() => {
                if (basePhotoInputRef.current) {
                    basePhotoInputRef.current.click();
                }
                setAutoOpenPhoto(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isEditingBase, autoOpenPhoto]);

    useEffect(() => {
        if (activeTab !== '11') {
            setPasswordError(null);
            setPasswordSuccess(null);
        }
    }, [activeTab]);

    // Détecter la taille de l'écran
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setSidebarOpen(false);
            }
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Fonction centralisée pour recharger toutes les données de l'agent
    const reloadAgentData = async () => {
        if (!user?.id_agent || !isMountedRef.current) {
            console.log('⚠️ reloadAgentData: user ou id_agent manquant, ou composant démonté');
            return;
        }

        try {
            console.log('🔄 Rechargement des données de l\'agent...');
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            };

            // Recharger les données complètes de l'agent avec un timestamp pour éviter le cache
            const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}?t=${Date.now()}`, {
                headers,
                cache: 'no-cache'
            });

            if (!agentResponse.ok) {
                console.error('❌ Erreur lors du rechargement:', agentResponse.status, agentResponse.statusText);
                return;
            }

            const agentResult = await agentResponse.json();
            console.log('✅ Données rechargées depuis l\'API:', agentResult);
            
            if (agentResult.success && agentResult.data) {
                const payload = agentResult.data;
                const computedAge = payload.age !== undefined && payload.age !== null
                    ? payload.age
                    : calculateAge(payload.date_de_naissance);
                
                // Récupérer l'acte de mariage existant depuis les documents
                const acteMariageDoc = payload.documents?.find(doc => doc.document_type === 'acte_mariage') || null;
                setExistingMarriageCertificate(acteMariageDoc);
                
                // Recharger les enfants si nécessaire
                let enfantsData = payload.enfants || [];
                if (payload.nombre_enfant && payload.nombre_enfant > 0 && (!enfantsData || enfantsData.length === 0)) {
                    try {
                        const enfantsResponse = await fetch(`https://tourisme.2ise-groupe.com/api/enfants/agent/${user.id_agent}?t=${Date.now()}`, {
                            headers,
                            cache: 'no-cache'
                        });
                        
                        if (enfantsResponse.ok) {
                            const enfantsResult = await enfantsResponse.json();
                            if (enfantsResult.success && enfantsResult.data && Array.isArray(enfantsResult.data)) {
                                enfantsData = enfantsResult.data;
                            }
                        }
                    } catch (err) {
                        console.error('Erreur lors de la récupération des enfants:', err);
                    }
                }
                
                // Mettre à jour l'état agentData avec toutes les nouvelles données
                // Créer un nouvel objet pour forcer React à détecter le changement
                const updatedAgentData = {
                    ...payload,
                    age: computedAge,
                    enfants: enfantsData,
                    _lastUpdate: Date.now() // Ajouter un timestamp pour forcer le re-render
                };
                
                console.log('📝 Mise à jour de l\'état agentData avec:', updatedAgentData);
                
                // Forcer la mise à jour en utilisant une fonction de callback pour s'assurer que React détecte le changement
                setAgentData(prev => {
                    // Comparer les valeurs importantes pour détecter les changements
                    const hasChanged = 
                        prev?.email !== updatedAgentData.email ||
                        prev?.telephone1 !== updatedAgentData.telephone1 ||
                        prev?.telephone2 !== updatedAgentData.telephone2 ||
                        prev?.ad_pri_rue !== updatedAgentData.ad_pri_rue ||
                        prev?.nom !== updatedAgentData.nom ||
                        prev?.prenom !== updatedAgentData.prenom ||
                        prev?.nombre_enfant !== updatedAgentData.nombre_enfant;
                    
                    if (hasChanged) {
                        console.log('🔄 Changements détectés, mise à jour de l\'état');
                    }
                    
                    return updatedAgentData;
                });
                
                // Mettre à jour les formulaires avec les nouvelles données
                setContactForm({
                    email: payload.email || '',
                    telephone1: payload.telephone1 || '',
                    telephone2: payload.telephone2 || '',
                    adresse: payload.ad_pri_rue || payload.ad_pro_rue || ''
                });
                
                const existingChildren = Array.isArray(enfantsData) ? enfantsData : [];
                const childrenCount = payload.nombre_enfant !== undefined && payload.nombre_enfant !== null 
                    ? payload.nombre_enfant 
                    : (existingChildren.length > 0 ? existingChildren.length : 0);
                
                if (!isEditingBase) {
                    setChildrenForm(prepareChildrenForm(childrenCount, existingChildren));
                    setBaseForm(prev => ({
                        ...prev,
                        nombreEnfant: String(childrenCount)
                    }));
                }
                
                // Mettre à jour le formulaire d'organisation
                if (!isEditingOrganization) {
                    setOrganizationForm({
                        id_direction: payload.id_direction ? String(payload.id_direction) : '',
                        id_sous_direction: payload.id_sous_direction ? String(payload.id_sous_direction) : '',
                        id_service: payload.id_service ? String(payload.id_service) : ''
                    });
                }
                
                console.log('✅ Données de l\'agent mises à jour avec succès');
            } else {
                console.error('❌ Réponse API invalide:', agentResult);
            }
            
        } catch (error) {
            console.error('❌ Erreur lors du rechargement des données:', error);
        }
    };

    // Charger les données de l'agent et de son organisation
    useEffect(() => {
        const loadAgentData = async () => {
            // Vérifier si le composant est encore monté avant de commencer
        if (!isMountedRef.current) {
            console.log('🔍 Composant démonté, annulation de loadAgentData');
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

                if (!user?.id_agent) {
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
                setError('Aucun agent associé à ce compte utilisateur');
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
                    return;
                }

                // Charger les données de l'agent
                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                    headers: getAuthHeaders()
                });

                if (!agentResponse.ok) {
                    const errorData = await agentResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Erreur lors du chargement des données de l\'agent');
                }

                const agentResult = await agentResponse.json();
                
                if (agentResult.success && agentResult.data) {
                    const payload = agentResult.data;
                    const computedAge = payload.age !== undefined && payload.age !== null
                        ? payload.age
                        : calculateAge(payload.date_de_naissance);
                    
                    // Log pour déboguer les enfants - Vérifier toute la réponse
                    console.log('🔍🔍🔍 RÉPONSE COMPLÈTE DE L\'API:', payload);
                    console.log('🔍 Enfants récupérés depuis l\'API:', payload.enfants);
                    console.log('🔍 Type de payload.enfants:', typeof payload.enfants, Array.isArray(payload.enfants));
                    console.log('🔍 Nombre d\'enfants:', payload.enfants ? payload.enfants.length : 0);
                    console.log('🔍 nombre_enfant:', payload.nombre_enfant);
                    console.log('🔍 Toutes les clés de payload:', Object.keys(payload));
                    console.log('🔍 Statut matrimonial - id:', payload.id_situation_matrimoniale, 'libele:', payload.situation_matrimoniale_libele);
                    console.log('🔍 Documents récupérés:', payload.documents);
                    console.log('🔍 Acte de mariage trouvé:', payload.documents?.find(doc => doc.document_type === 'acte_mariage'));
                    
                    // Récupérer l'acte de mariage existant depuis les documents
                    const acteMariageDoc = payload.documents?.find(doc => doc.document_type === 'acte_mariage') || null;
                    setExistingMarriageCertificate(acteMariageDoc);
                    
                    setAgentData({
                        ...payload,
                        age: computedAge
                    });
                    
                    // Initialiser le formulaire des enfants après le chargement des données
                    // TOUJOURS essayer de récupérer les enfants, même si payload.enfants est vide
                    // car il peut y avoir un problème avec la récupération dans getById
                    let enfantsData = null;
                    
                    // Utiliser les enfants du payload si disponibles
                    if (payload.enfants && Array.isArray(payload.enfants) && payload.enfants.length > 0) {
                        enfantsData = payload.enfants;
                        console.log('✅ Enfants trouvés dans payload, initialisation du formulaire avec', payload.enfants.length, 'enfant(s)');
                    }
                    
                    // TOUJOURS récupérer depuis l'API dédiée si :
                    // 1. Pas d'enfants dans le payload OU
                    // 2. nombre_enfant > 0 (pour s'assurer qu'on a tous les enfants)
                    if ((!enfantsData || enfantsData.length === 0) && payload.nombre_enfant && payload.nombre_enfant > 0) {
                        console.log('⚠️ Aucun enfant trouvé dans payload.enfants mais nombre_enfant =', payload.nombre_enfant);
                        console.log('🔍 Tentative de récupération des enfants depuis /api/enfants/agent/:agentId...');
                        
                        try {
                            const enfantsResponse = await fetch(`https://tourisme.2ise-groupe.com/api/enfants/agent/${user.id_agent}`, {
                                headers: getAuthHeaders()
                            });
                            
                            if (enfantsResponse.ok) {
                                const enfantsResult = await enfantsResponse.json();
                                console.log('🔍 Réponse API /api/enfants/agent/:agentId:', enfantsResult);
                                
                                if (enfantsResult.success && enfantsResult.data && Array.isArray(enfantsResult.data)) {
                                    enfantsData = enfantsResult.data;
                                    console.log('✅ Enfants récupérés depuis /api/enfants/agent/:agentId:', enfantsData.length);
                                    
                                    // Mettre à jour agentData avec les enfants récupérés
                                    setAgentData(prev => ({
                                        ...prev,
                                        enfants: enfantsData
                                    }));
                                } else {
                                    console.log('⚠️ Réponse API enfants sans données valides:', enfantsResult);
                                }
                            } else {
                                const errorText = await enfantsResponse.text();
                                console.log('⚠️ Réponse non-OK pour /api/enfants/agent/:agentId:', enfantsResponse.status, errorText);
                            }
                        } catch (err) {
                            console.error('❌ Erreur lors de la récupération des enfants depuis /api/enfants/agent/:agentId:', err);
                        }
                    }
                    
                    // Initialiser le formulaire avec les enfants récupérés ou avec le nombre d'enfants
                    // TOUJOURS utiliser nombre_enfant depuis payload (valeur dans la base de données)
                    // et non enfantsData.length (nombre d'enfants récupérés)
                    const nombreEnfantSaisi = payload.nombre_enfant && parseInt(payload.nombre_enfant) > 0
                        ? parseInt(payload.nombre_enfant)
                        : (enfantsData && enfantsData.length > 0 ? enfantsData.length : 0);
                    
                    if (enfantsData && enfantsData.length > 0) {
                        // Utiliser le nombre d'enfants saisi (nombre_enfant) même s'il est supérieur au nombre d'enfants récupérés
                        const preparedForm = prepareChildrenForm(nombreEnfantSaisi, enfantsData);
                        setChildrenForm(preparedForm);
                        setBaseForm(prev => ({
                            ...prev,
                            nombreEnfant: String(nombreEnfantSaisi)
                        }));
                        console.log('✅ Formulaire des enfants initialisé avec', nombreEnfantSaisi, 'champ(s) (nombre_enfant:', payload.nombre_enfant, '),', enfantsData.length, 'enfant(s) avec données');
                    } else if (nombreEnfantSaisi > 0) {
                        // Si on a un nombre d'enfants mais pas de données, initialiser avec des champs vides
                        const preparedForm = prepareChildrenForm(nombreEnfantSaisi, []);
                        setChildrenForm(preparedForm);
                        setBaseForm(prev => ({
                            ...prev,
                            nombreEnfant: String(nombreEnfantSaisi)
                        }));
                        console.log('⚠️ Formulaire des enfants initialisé avec', nombreEnfantSaisi, 'champ(s) vides (nombre_enfant:', payload.nombre_enfant, ', pas de données enfants)');
                    } else {
                        // Aucun enfant
                        setChildrenForm([]);
                        setBaseForm(prev => ({
                            ...prev,
                            nombreEnfant: '0'
                        }));
                        console.log('ℹ️ Aucun enfant à initialiser');
                    }
                } else {
                    throw new Error(agentResult.error || 'Erreur lors du chargement des données de l\'agent');
                }

                // Déterminer les données d'organisation
                let organizationInfo = null;
                
                // Priorité aux paramètres URL, puis aux données utilisateur
                if (urlOrganizationType && urlOrganizationId) {
                    organizationInfo = {
                        type: urlOrganizationType,
                        id: urlOrganizationId
                    };
                } else if (user?.organization) {
                    organizationInfo = user.organization;
                }

                if (organizationInfo) {
                    // Charger les données détaillées de l'organisation
                    let endpoint;
                    if (organizationInfo.type === 'ministere') {
                        endpoint = `/api/ministeres/${organizationInfo.id}`;
                    } else if (organizationInfo.type === 'entite') {
                        endpoint = `/api/entites/${organizationInfo.id}`;
                    }

                    if (endpoint) {
                        const orgResponse = await fetch(`https://tourisme.2ise-groupe.com${endpoint}`);
                        const orgResult = await orgResponse.json();
                        
                        if (orgResult.success) {
                            setOrganizationData({
                                type: organizationInfo.type,
                                id: organizationInfo.id,
                                ...orgResult.data
                            });
                        }
                    }
                }
            } catch (err) {
                console.error('Erreur lors du chargement des données:', err);
                console.error('Détails de l\'erreur:', {
                    message: err.message,
                    stack: err.stack,
                    agentId: user?.id_agent
                });
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

        loadAgentData();
    }, [user]);

    // Charger le nombre de notifications non lues
    useEffect(() => {
        if (user?.id_agent) {
            loadNombreNotificationsNonLues();
        }
    }, [user?.id_agent]);

    // Charger les directions, sous-directions, services et séminaires
    useEffect(() => {
        if (user?.id_agent && agentData) {
            loadDirections();
            loadSousDirections();
            loadServices();
            loadAgentSeminaires();
            loadAgentConges();
            
            // Charger les anniversaires et congés pour les directeurs et sous-directeurs
            const userRole = user.role?.toLowerCase();
            if (userRole === 'directeur' || userRole === 'sous_directeur' || userRole === 'sous-directeur') {
                loadBirthdays();
                loadCongesAgents();
                loadAgentsEnConges();
            }
        }
    }, [user?.id_agent, agentData?.id_direction, agentData?.id_sous_direction]);

    // Charger les options de diplômes
    useEffect(() => {
        const loadDiplomesOptions = async () => {
            try {
                setLoadingDiplomesOptions(true);
                const token = localStorage.getItem('token');
                const response = await fetch('https://tourisme.2ise-groupe.com/api/diplomes?limit=500', {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const extractItems = (payload) => {
                        if (!payload) return [];
                        if (Array.isArray(payload)) return payload;
                        if (payload.data) return extractItems(payload.data);
                        if (payload.rows) return extractItems(payload.rows);
                        if (payload.items) return extractItems(payload.items);
                        return [];
                    };
                    const items = extractItems(data);
                    setDiplomesOptions(items);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des options de diplômes:', error);
            } finally {
                setLoadingDiplomesOptions(false);
            }
        };

        loadDiplomesOptions();
    }, []);

    // Initialiser le formulaire des diplômes quand agentData change
    useEffect(() => {
        if (agentData && !isEditingDiplomes) {
            const existingDiplomes = Array.isArray(agentData.diplomes) ? agentData.diplomes : [];
            const count = existingDiplomes.length > 0 ? existingDiplomes.length : 0;
            setNombreDiplomes(count);
            
            if (existingDiplomes.length > 0) {
                const preparedForm = existingDiplomes.map(diplome => ({
                    id: diplome.id || null,
                    diplome: diplome.diplome || '',
                    options: diplome.options || '',
                    date_diplome: diplome.date_diplome ? formatDateForInput(diplome.date_diplome) : '',
                    ecole: diplome.ecole || '',
                    ville: diplome.ville || '',
                    pays: diplome.pays || '',
                    document: null,
                    existingDocument: diplome.id_agent_document ? {
                        id: diplome.id_agent_document,
                        document_url: diplome.document_url,
                        document_name: diplome.document_name,
                        document_size: diplome.document_size
                    } : null
                }));
                setDiplomesForm(preparedForm);
            } else {
                setDiplomesForm([]);
            }
        }
    }, [agentData?.diplomes, isEditingDiplomes]);

    // Fonction pour charger le nombre de notifications non lues
    const loadNombreNotificationsNonLues = async () => {
        if (!user?.id_agent) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/notifications/agent/${user.id_agent}/nombre-non-lues`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();
            if (result.success) {
                setNombreNotificationsNonLues(result.data.nombre_non_lues);
            }
        } catch (err) {
            console.error('Erreur lors du chargement du nombre de notifications:', err);
        }
    };

    // Charger les directions
    const loadDirections = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('https://tourisme.2ise-groupe.com/api/directions?limit=500', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const data = await response.json();
                const directionsList = Array.isArray(data) ? data : (data.data || data.rows || []);
                setDirections(directionsList);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des directions:', error);
        }
    };

    // Charger les sous-directions (filtrées par la direction de l'agent uniquement)
    const loadSousDirections = async (directionId = null) => {
        try {
            const token = localStorage.getItem('token');
            // Toujours utiliser la direction de l'agent pour filtrer les sous-directions
            const dirId = directionId || agentData?.id_direction;
            if (!dirId) {
                setSousDirections([]);
                return;
            }
            
            const url = `https://tourisme.2ise-groupe.com/api/sous-directions?limit=500&direction_id=${dirId}`;
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const data = await response.json();
                const sousDirectionsList = Array.isArray(data) ? data : (data.data || data.rows || []);
                setSousDirections(sousDirectionsList);
            } else {
                setSousDirections([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des sous-directions:', error);
            setSousDirections([]);
        }
    };

    // Charger les services (filtrés par sous-direction si disponible, sinon par direction pour les services directs)
    const loadServices = async (sousDirectionId = null, directionId = null) => {
        try {
            const token = localStorage.getItem('token');
            let url = 'https://tourisme.2ise-groupe.com/api/services?limit=500';
            
            // Définir les IDs en premier pour qu'ils soient accessibles partout
            const sousDirId = sousDirectionId || organizationForm.id_sous_direction;
            const dirId = directionId || agentData?.id_direction;
            
            // Si une sous-direction est fournie, charger uniquement les services de cette sous-direction
            if (sousDirId) {
                url += `&sous_direction_id=${sousDirId}`;
            } else {
                // Sinon, charger les services directement liés à la direction (sans sous-direction)
                if (dirId) {
                    url += `&direction_id=${dirId}`;
                } else {
                    setServices([]);
                    return;
                }
            }
            
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                }
            });

            if (response.ok) {
                const data = await response.json();
                let servicesList = Array.isArray(data) ? data : (data.data || data.rows || []);
                
                // Si aucune sous-direction n'est sélectionnée, filtrer pour ne garder que les services directs (sans sous-direction)
                if (!sousDirId) {
                    servicesList = servicesList.filter(service => {
                        const hasNoSousDirection = !service.id_sous_direction || service.id_sous_direction === null || service.id_sous_direction === undefined;
                        return hasNoSousDirection;
                    });
                    console.log(`🔍 AgentDashboard - Services directs de la direction ${dirId}:`, servicesList.length, 'services');
                } else {
                    console.log(`🔍 AgentDashboard - Services de la sous-direction ${sousDirId}:`, servicesList.length, 'services');
                }
                
                setServices(servicesList);
            } else {
                setServices([]);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des services:', error);
            setServices([]);
        }
    };

    // Charger les séminaires de l'agent
    const loadAgentSeminaires = async () => {
        if (!user?.id_agent) return;
        
        try {
            setLoadingSeminaires(true);
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/seminaire-participants/agent/${user.id_agent}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const seminaires = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
                setAgentSeminaires(seminaires);
                console.log(`✅ ${seminaires.length} séminaire(s) chargé(s) pour l'agent ${user.id_agent}`);
            } else if (response.status === 404) {
                // 404 est normal si l'agent n'a pas de séminaires, pas d'erreur
                console.log(`ℹ️ Aucun séminaire trouvé pour l'agent ${user.id_agent} (404 - normal, non bloquant)`);
                setAgentSeminaires([]);
            } else {
                // Autre erreur, logger mais ne pas bloquer
                console.warn(`⚠️ Erreur ${response.status} lors du chargement des séminaires (non bloquant)`);
                setAgentSeminaires([]);
            }
        } catch (error) {
            // Erreur réseau, logger mais ne pas bloquer
            console.warn('⚠️ Erreur réseau lors du chargement des séminaires (non bloquant):', error);
            setAgentSeminaires([]);
        } finally {
            setLoadingSeminaires(false);
        }
    };

    // Charger les anniversaires pour les directeurs et sous-directeurs
    const loadBirthdays = async () => {
        try {
            setBirthdaysLoading(true);
            const apiUrl = getApiUrl();
            const userRole = user?.role?.toLowerCase();
            
            // Construire l'URL avec les filtres appropriés
            let url = `${apiUrl}/api/agents/upcoming-birthdays?days=30`;
            
            if (userRole === 'directeur' && agentData?.id_direction) {
                url += `&id_direction=${agentData.id_direction}`;
            } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && agentData?.id_sous_direction) {
                url += `&id_sous_direction=${agentData.id_sous_direction}`;
                if (agentData?.id_direction) {
                    url += `&id_direction=${agentData.id_direction}`;
                }
            }
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setBirthdays(result.data || []);
                }
            }
        } catch (err) {
            console.error('Erreur lors du chargement des anniversaires:', err);
        } finally {
            setBirthdaysLoading(false);
        }
    };
    
    // Charger les congés prévisionnels pour les directeurs et sous-directeurs
    const loadCongesAgents = async () => {
        try {
            setCongesLoading(true);
            const apiUrl = getApiUrl();
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;
            const userRole = user?.role?.toLowerCase();
            
            // Construire les URLs avec les filtres appropriés
            let urlCurrent = `${apiUrl}/api/planning-previsionnel/annee/${currentYear}`;
            let urlNext = `${apiUrl}/api/planning-previsionnel/annee/${nextYear}`;
            
            if (userRole === 'directeur' && agentData?.id_direction) {
                urlCurrent += `?id_direction=${agentData.id_direction}`;
                urlNext += `?id_direction=${agentData.id_direction}`;
            } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && agentData?.id_sous_direction) {
                urlCurrent += `?id_sous_direction=${agentData.id_sous_direction}`;
                urlNext += `?id_sous_direction=${agentData.id_sous_direction}`;
                if (agentData?.id_direction) {
                    urlCurrent += `&id_direction=${agentData.id_direction}`;
                    urlNext += `&id_direction=${agentData.id_direction}`;
                }
            }
            
            const responses = await Promise.all([
                fetch(urlCurrent, { headers: getAuthHeaders() }),
                fetch(urlNext, { headers: getAuthHeaders() })
            ]);
            
            const results = await Promise.all(responses.map(r => r.json()));
            let allAgents = [];
            
            results.forEach(result => {
                if (result.success && result.data) {
                    allAgents = [...allAgents, ...result.data];
                }
            });
            
            setCongesAgents(allAgents);
        } catch (err) {
            console.error('Erreur lors du chargement des congés prévisionnels:', err);
        } finally {
            setCongesLoading(false);
        }
    };
    
    // Charger les agents actuellement en congés pour les directeurs et sous-directeurs
    const loadAgentsEnConges = async () => {
        try {
            setAgentsEnCongesLoading(true);
            const apiUrl = getApiUrl();
            const currentYear = new Date().getFullYear();
            const userRole = user?.role?.toLowerCase();
            
            // Construire l'URL avec les filtres appropriés
            let url = `${apiUrl}/api/planning-previsionnel/rapport-organisation/${currentYear}`;
            
            if (userRole === 'directeur' && agentData?.id_direction) {
                url += `?id_direction=${agentData.id_direction}`;
            } else if ((userRole === 'sous_directeur' || userRole === 'sous-directeur') && agentData?.id_sous_direction) {
                url += `?id_sous_direction=${agentData.id_sous_direction}`;
                if (agentData?.id_direction) {
                    url += `&id_direction=${agentData.id_direction}`;
                }
            }
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setAgentsEnConges(result.data);
                }
            }
        } catch (err) {
            console.error('Erreur lors du chargement des agents en congés:', err);
        } finally {
            setAgentsEnCongesLoading(false);
        }
    };
    
    // Fonction pour grouper les congés par période
    const groupCongesByPeriod = () => {
        const groups = {
            'Cette semaine': [],
            'Ce mois': [],
            'Dans 2 mois': [],
            'Dans 3 mois': [],
            'Plus tard': []
        };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        congesAgents.forEach(agent => {
            if (!agent.date_depart_conges) return;
            
            const dateDepart = new Date(agent.date_depart_conges);
            dateDepart.setHours(0, 0, 0, 0);
            const diffTime = dateDepart - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 7) {
                groups['Cette semaine'].push(agent);
            } else if (diffDays <= 30) {
                groups['Ce mois'].push(agent);
            } else if (diffDays <= 60) {
                groups['Dans 2 mois'].push(agent);
            } else if (diffDays <= 90) {
                groups['Dans 3 mois'].push(agent);
            } else {
                groups['Plus tard'].push(agent);
            }
        });
        
        return groups;
    };

    // Charger les congés de l'agent pour l'année en cours et les deux années précédentes
    const loadAgentConges = async () => {
        if (!user?.id_agent) {
            console.log('⚠️ Pas d\'ID agent, impossible de charger les congés');
            return;
        }
        
        try {
            setLoadingConges(true);
            const token = localStorage.getItem('token');
            console.log(`🔍 Chargement des congés pour l'agent ${user.id_agent}...`);
            
            const currentYear = new Date().getFullYear();
            const previousYear = currentYear - 1;
            const yearBeforePrevious = currentYear - 2;
            
            // Charger les congés pour les 3 années
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/conges/agent/${user.id_agent}/years?years=${yearBeforePrevious},${previousYear},${currentYear}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    }
                }
            );

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Congés récupérés:', result);
                
                // Logs de débogage supprimés
                
                if (result.success && result.data) {
                    console.log('🔧🔧🔧 NOUVEAU CODE CHARGÉ - Normalisation des données...');
                    console.log('🔧 Données brutes reçues du BACKEND:', result.data);
                    
                    // VÉRIFICATION CRITIQUE: Vérifier les données brutes pour 2023
                    const conges2023_BRUT_BACKEND = result.data.find(c => parseInt(c.annee, 10) === 2023);
                    if (conges2023_BRUT_BACKEND) {
                        console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
                        console.log('🔥 DONNÉES BRUTES 2023 RECUES DU BACKEND:', {
                            annee: conges2023_BRUT_BACKEND.annee,
                            jours_alloues: conges2023_BRUT_BACKEND.jours_alloues,
                            jours_pris: conges2023_BRUT_BACKEND.jours_pris,
                            jours_restants: conges2023_BRUT_BACKEND.jours_restants,
                            calcul_attendu: `${conges2023_BRUT_BACKEND.jours_alloues} - ${conges2023_BRUT_BACKEND.jours_pris} = ${Math.max(0, (parseInt(conges2023_BRUT_BACKEND.jours_alloues, 10) || 0) - (parseInt(conges2023_BRUT_BACKEND.jours_pris, 10) || 0))}`
                        });
                        console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥');
                    }
                    
                    // Créer un map indexé par année AVANT normalisation
                    const congesMapBrut = {};
                    result.data.forEach(c => {
                        congesMapBrut[c.annee] = c;
                    });
                    
                    // Fonction pour FORCER le recalcul et stocker SANS jours_restants
                    const preparerCongesPourEtat = (congesRaw, annee) => {
                        const jours_alloues = parseInt(congesRaw?.jours_alloues, 10) || 30;
                        const jours_pris = parseInt(congesRaw?.jours_pris, 10) || 0;
                        // Ne PAS stocker jours_restants - sera recalculé à l'affichage
                        return {
                            ...congesRaw,
                            annee: parseInt(annee, 10),
                            jours_alloues,
                            jours_pris,
                            jours_reportes: parseInt(congesRaw?.jours_reportes, 10) || 0
                            // jours_restants est INTENTIONNELLEMENT omis
                        };
                    };
                    
                    // Trouver l'année en cours
                    const currentCongesRaw = congesMapBrut[currentYear] || {
                        annee: currentYear,
                        jours_alloues: 30,
                        jours_pris: 0,
                        jours_reportes: 0
                    };
                    const currentConges = preparerCongesPourEtat(currentCongesRaw, currentYear);
                    console.log('📊 Année en cours stockée (SANS jours_restants):', currentConges);
                    setAgentConges(currentConges);
                    
                    // Récupérer les deux années précédentes SANS jours_restants
                    const previousYearsConges = [
                        preparerCongesPourEtat(congesMapBrut[yearBeforePrevious] || {
                            annee: yearBeforePrevious,
                            jours_alloues: 30,
                            jours_pris: 0,
                            jours_reportes: 0
                        }, yearBeforePrevious),
                        preparerCongesPourEtat(congesMapBrut[previousYear] || {
                            annee: previousYear,
                            jours_alloues: 30,
                            jours_pris: 0,
                            jours_reportes: 0
                        }, previousYear)
                    ];
                    
                    // Log spécifique pour 2023
                    const conges2023_STATE = previousYearsConges.find(c => parseInt(c.annee, 10) === 2023);
                    if (conges2023_STATE) {
                        const jours_restants_calcule = Math.max(0, conges2023_STATE.jours_alloues - conges2023_STATE.jours_pris);
                        console.log('🔥🔥🔥 SETSTATE 2023 - Stockage SANS jours_restants:', {
                            annee: conges2023_STATE.annee,
                            jours_alloues: conges2023_STATE.jours_alloues,
                            jours_pris: conges2023_STATE.jours_pris,
                            jours_restants_NON_STOCKE: 'sera recalculé à l\'affichage',
                            calcul_attendu: `${conges2023_STATE.jours_alloues} - ${conges2023_STATE.jours_pris} = ${jours_restants_calcule}`
                        });
                    }
                    
                    console.log('📊 Années précédentes stockées (SANS jours_restants):', previousYearsConges.map(c => ({
                        annee: c.annee,
                        alloues: c.jours_alloues,
                        pris: c.jours_pris,
                        jours_restants_OMIS: 'sera recalculé à l\'affichage'
                    })));
                    
                    setAgentCongesPreviousYears(previousYearsConges);
                } else {
                    console.error('⚠️ Données de congés invalides:', result);
                    setAgentConges(null);
                    setAgentCongesPreviousYears([]);
                }
            } else {
                // Fallback : charger uniquement l'année en cours
                const currentResponse = await fetch(
                    `https://tourisme.2ise-groupe.com/api/conges/current-year`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token && { 'Authorization': `Bearer ${token}` })
                        }
                    }
                );
                
                if (currentResponse.ok) {
                    const data = await currentResponse.json();
                    if (data && data.annee) {
                        setAgentConges(data);
                    }
                }
                
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erreur lors du chargement des congés:', response.status, errorData);
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement des congés:', error);
            setAgentConges(null);
            setAgentCongesPreviousYears([]);
        } finally {
            setLoadingConges(false);
        }
    };

    // Gérer les changements dans le formulaire d'organisation
    const handleOrganizationInputChange = (e) => {
        const { name, value } = e.target;
        setOrganizationForm(prev => ({
            ...prev,
            [name]: value
        }));

        // Si la sous-direction change, recharger les services et réinitialiser service
        if (name === 'id_sous_direction') {
            const newSousDirectionId = value || '';
            // Si une sous-direction est sélectionnée, charger ses services
            // Sinon, charger les services directs de la direction de l'agent
            if (newSousDirectionId) {
                loadServices(newSousDirectionId, agentData?.id_direction);
            } else {
                // Recharger les services directs de la direction
                loadServices(null, agentData?.id_direction);
            }
            setOrganizationForm(prev => ({
                ...prev,
                id_sous_direction: newSousDirectionId,
                id_service: ''
            }));
        }
    };

    // Sauvegarder les informations d'organisation
    const handleOrganizationSubmit = async (e) => {
        e.preventDefault();
        if (!user?.id_agent) return;

        try {
            setOrganizationSaving(true);
            setOrganizationError(null);
            setOrganizationSuccess(null);

            const token = localStorage.getItem('token');
            // S'assurer que la direction actuelle est utilisée (elle ne peut pas être modifiée)
            const updateData = {
                id_direction: agentData.id_direction || organizationForm.id_direction || null,
                id_sous_direction: organizationForm.id_sous_direction || null,
                id_service: organizationForm.id_service || null
            };

            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify(updateData)
                }
            );

            if (response.ok) {
                setOrganizationSuccess('Informations d\'organisation mises à jour avec succès');
                setIsEditingOrganization(false);
                
                // Recharger les sous-directions et services en fonction de la direction sélectionnée
                if (organizationForm.id_direction) {
                    loadSousDirections(organizationForm.id_direction);
                }
                if (organizationForm.id_sous_direction) {
                    loadServices(organizationForm.id_sous_direction, organizationForm.id_direction);
                }
                
                // Recharger toutes les données de l'agent depuis l'API
                await reloadAgentData();
                
                // Forcer un re-render en mettant à jour un état pour déclencher les useEffect
                setRefreshKey(prev => prev + 1);
                
                // Recharger les congés et séminaires après un court délai
                setTimeout(async () => {
                    if (user?.id_agent && isMountedRef.current) {
                        try {
                            await loadAgentConges();
                            await loadAgentSeminaires();
                        } catch (err) {
                            console.error('Erreur lors du rechargement des congés/séminaires:', err);
                        }
                    }
                }, 300);
            } else {
                const error = await response.json();
                setOrganizationError(error.error || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour:', error);
            setOrganizationError('Erreur de connexion au serveur');
        } finally {
            setOrganizationSaving(false);
        }
    };

    // Annuler l'édition de l'organisation
    const handleOrganizationCancel = () => {
        setIsEditingOrganization(false);
        setOrganizationError(null);
        setOrganizationSuccess(null);
        // Réinitialiser le formulaire avec les valeurs actuelles de l'agent
        if (agentData) {
            setOrganizationForm({
                id_direction: agentData.id_direction ? String(agentData.id_direction) : '',
                id_sous_direction: agentData.id_sous_direction ? String(agentData.id_sous_direction) : '',
                id_service: agentData.id_service ? String(agentData.id_service) : ''
            });
        }
    };

    // Recharger les sous-directions lorsque la direction de l'agent change
    useEffect(() => {
        if (agentData?.id_direction) {
            loadSousDirections(agentData.id_direction);
        }
    }, [agentData?.id_direction]);

    // Recharger les services lorsque la sous-direction change ou lorsque la direction de l'agent change
    useEffect(() => {
        if (agentData?.id_direction) {
            if (organizationForm.id_sous_direction) {
                // Si une sous-direction est sélectionnée, charger ses services
                loadServices(organizationForm.id_sous_direction, agentData.id_direction);
            } else {
                // Sinon, charger les services directs de la direction
                loadServices(null, agentData.id_direction);
            }
        }
    }, [organizationForm.id_sous_direction, agentData?.id_direction]);

    // Fonction pour gérer le clic sur une demande
    // Fonction pour vérifier si l'utilisateur peut valider les demandes
    const canValidateDemandes = () => {
        if (!user) return false;
        
        // Seuls les DRH, chefs de service, directeurs, sous-directeurs, directeurs de cabinet et ministres peuvent valider
        const authorizedRoles = ['drh', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'super_admin'];
        return authorizedRoles.includes(user.role?.toLowerCase());
    };

    // Fonction pour vérifier si l'utilisateur peut créer des demandes
    const canCreateDemandes = () => {
        if (!user) return false;
        
        // Tous les utilisateurs peuvent créer des demandes
        return true;
    };

    // Fonction pour obtenir le libellé des demandes selon le rôle
    const getDemandesServiceLabel = () => {
        if (!user || !user.role) return 'Demandes de Mon Service';
        
        const roleLower = user.role.toLowerCase();
        
        // Sous-directeur
        if (roleLower === 'sous_directeur' || roleLower === 'sous-directeur') {
            return 'Demandes de ma sous direction';
        }
        
        // Directeur
        if (roleLower === 'directeur') {
            return 'Demandes de ma direction';
        }
        
        // Par défaut : Demandes de Mon Service
        return 'Demandes de Mon Service';
    };

    const handleDemandeClick = (action, demande = null) => {
        if (action === 'create' && canCreateDemandes()) {
            setShowCreateDemandeModal(true);
        } else if (action === 'view' && demande) {
            setSelectedDemande(demande);
            setShowDemandeDetails(true);
        } else if (action === 'validate' && canValidateDemandes()) {
            setSelectedDemande(demande);
            setShowDemandeDetails(true);
        } else if (action === 'transmit' && demande) {
            handleTransmitDocument(demande);
        }
    };

    const handleValidationSuccess = () => {
        // Forcer le rechargement de la liste des demandes
        setRefreshKey(prev => prev + 1);
    };

    // Fonction pour transmettre un document à l'agent
    const handleTransmitDocument = async (demande) => {
        try {
            const token = localStorage.getItem('token');
            
            // Transmettre directement en utilisant l'ID de la demande
            // Le backend va gérer la génération automatique du document si nécessaire
            const transmitResponse = await fetch(`https://tourisme.2ise-groupe.com/api/documents/${demande.id}/transmit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    commentaire: `Document transmis par ${user.prenom} ${user.nom}`
                })
            });

            const transmitResult = await transmitResponse.json();

            if (transmitResult.success) {
                alert('Document transmis avec succès à l\'agent !');
                // Forcer le rechargement de la liste des demandes
                setRefreshKey(prev => prev + 1);
            } else {
                alert('Erreur lors de la transmission: ' + (transmitResult.error || transmitResult.message || 'Erreur inconnue'));
            }
        } catch (error) {
            console.error('Erreur lors de la transmission:', error);
            alert('Erreur lors de la transmission du document');
        }
    };
    // Fonction pour valider une demande
    const handleValidateDemande = async (demandeId, action, commentaire) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/demandes/valider/${demandeId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action, commentaire })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors de la validation');
            }

            // Afficher le message de succès
            setValidationSuccess(true);
            setValidationMessage(result.message);
            
            // Masquer le message après 5 secondes
            setTimeout(() => {
                setValidationSuccess(false);
                setValidationMessage('');
            }, 5000);

            return result;
        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            throw error;
        }
    };


    // Fonction pour gérer la création d'une demande
    const handleDemandeCreated = (nouvelleDemande) => {
        // Recharger les données si nécessaire
        loadNombreNotificationsNonLues();
        // Forcer le rafraîchissement de la liste des demandes en incrémentant refreshKey
        setRefreshKey(prev => prev + 1);
    };

    // Fonction pour gérer le clic sur une notification
    const handleNotificationClick = async (notification) => {
        console.log('Notification cliquée:', notification);
        
        // Marquer la notification comme lue si elle ne l'est pas déjà
        if (!notification.lu) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(
                    `https://tourisme.2ise-groupe.com/api/demandes/notifications/${notification.id}/lire`,
                    {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                );
                
                if (response.ok) {
                    // Recharger le nombre de notifications non lues
                    loadNombreNotificationsNonLues();
                }
            } catch (error) {
                console.error('Erreur lors de la mise à jour de la notification:', error);
            }
        }
        
        // Naviguer vers la boîte de réception avec la notification sélectionnée
        setSelectedNotificationId(notification.id);
        setSelectedNotificationMessage(notification);
        setActiveTab('6');
        
        // Afficher le modal avec le message complet
        setShowNotificationMessageModal(true);
        
        // Mettre à jour l'URL sans recharger la page
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('tab', '6');
        newUrl.searchParams.set('notificationId', notification.id);
        window.history.pushState({}, '', newUrl);
        
        // Fermer le panel de notifications
        setShowNotifications(false);
    };

    // Fonction de déconnexion
    const handleLogout = async () => {
        if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            try {
                await logout();
                // Redirection propre vers la page de login
                history.replace('/login');
            } catch (error) {
                console.error('Erreur lors de la déconnexion:', error);
                // Redirection même en cas d'erreur
                history.replace('/login');
            }
        }
    };
    
    const handlePasswordInputChange = (event) => {
        const { name, value } = event.target;
        setPasswordForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    // Vérifier si WebAuthn est disponible et charger les credentials
    useEffect(() => {
        setIsWebAuthnAvailable(isWebAuthnSupported());
        if (user && user.username) {
            loadCredentials();
        }
    }, [user]);

    // Charger les credentials enregistrés
    const loadCredentials = async () => {
        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/auth/webauthn/credentials', {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCredentials(data.data || []);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des credentials:', error);
        }
    };

    const handleOpenFingerprintModal = () => {
        if (!user || !user.username) {
            setFingerprintError('Utilisateur non connecté');
            return;
        }
        setFingerprintError(null);
        setFingerprintSuccess(null);
        setShowFingerprintModal(true);
    };

    const handleFingerprintSuccess = () => {
        setFingerprintSuccess('Empreinte digitale enregistrée avec succès ! Vous pouvez maintenant vous connecter avec votre empreinte digitale.');
        setDeviceName('');
        loadCredentials();
    };

    const handleDeleteCredential = async (credentialId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette empreinte digitale ?')) {
            return;
        }

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/auth/webauthn/credentials/${credentialId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            
            if (data.success) {
                setFingerprintSuccess('Empreinte digitale supprimée avec succès');
                loadCredentials();
            } else {
                setFingerprintError(data.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            setFingerprintError('Erreur lors de la suppression de l\'empreinte digitale');
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);

        const { currentPassword, newPassword, confirmPassword } = passwordForm;

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError('Veuillez remplir tous les champs.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Les nouveaux mots de passe ne correspondent pas.');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        if (currentPassword === newPassword) {
            setPasswordError('Le nouveau mot de passe doit être différent de l\'ancien.');
            return;
        }

        setIsChangingPassword(true);

        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/auth/change-password', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Une erreur est survenue lors de la mise à jour du mot de passe.');
            }

            setPasswordSuccess(data.message || 'Mot de passe mis à jour avec succès.');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            setPasswordError(error.message);
        } finally {
            setIsChangingPassword(false);
        }
    };
    
    const startContactEdition = () => {
        if (!agentData) {
            return;
        }
        setContactError(null);
        setContactSuccess(null);
        setContactForm({
            email: agentData.email || '',
            telephone1: agentData.telephone1 || '',
            telephone2: agentData.telephone2 || '',
            adresse: agentData.ad_pri_rue || agentData.ad_pro_rue || ''
        });
        setIsEditingContact(true);
    };

    const handleContactInputChange = (event) => {
        const { name, value } = event.target;
        setContactForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleContactCancel = () => {
        if (agentData) {
            setContactForm({
                email: agentData.email || '',
                telephone1: agentData.telephone1 || '',
                telephone2: agentData.telephone2 || '',
                adresse: agentData.ad_pri_rue || agentData.ad_pro_rue || ''
            });
        }
        setContactError(null);
        setContactSuccess(null);
        setIsEditingContact(false);
    };

    const handleContactSubmit = async (event) => {
        event.preventDefault();
        setContactError(null);
        setContactSuccess(null);

        if (!user?.id_agent) {
            setContactError('Impossible d’identifier votre compte agent.');
            return;
        }

        const trimmedData = {
            email: contactForm.email ? contactForm.email.trim() : '',
            telephone1: contactForm.telephone1 ? contactForm.telephone1.trim() : '',
            telephone2: contactForm.telephone2 ? contactForm.telephone2.trim() : '',
            adresse: contactForm.adresse ? contactForm.adresse.trim() : ''
        };

        if (!trimmedData.email) {
            setContactError('L’email est obligatoire.');
            return;
        }

        setContactSaving(true);

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    email: trimmedData.email,
                    telephone1: trimmedData.telephone1,
                    telephone2: trimmedData.telephone2,
                    ad_pri_rue: trimmedData.adresse
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success === false) {
                throw new Error(data.message || data.error || 'Erreur lors de la mise à jour de vos informations.');
            }

            setContactSuccess('Informations mises à jour avec succès.');
            setIsEditingContact(false);
            
            // Recharger toutes les données de l'agent depuis l'API
            await reloadAgentData();
            
            // Forcer un re-render en mettant à jour un état pour déclencher les useEffect
            setRefreshKey(prev => prev + 1);
            
            // Recharger les congés et séminaires après un court délai pour s'assurer que les données sont à jour
            setTimeout(async () => {
                if (user?.id_agent && isMountedRef.current) {
                    try {
                        await loadAgentConges();
                        await loadAgentSeminaires();
                    } catch (err) {
                        console.error('Erreur lors du rechargement des congés/séminaires:', err);
                    }
                }
            }, 300);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des informations de contact:', error);
            setContactError(error.message);
        } finally {
            setContactSaving(false);
        }
    };

    const startBaseEdition = () => {
        if (!agentData) {
            return;
        }
        setBaseError(null);
        setBaseSuccess(null);
        
        // Récupérer l'acte de mariage existant depuis les documents
        const acteMariageDoc = agentData.documents?.find(doc => doc.document_type === 'acte_mariage') || null;
        setExistingMarriageCertificate(acteMariageDoc);
        
        setBaseForm({
            maritalStatusId: agentData.id_situation_matrimoniale ? String(agentData.id_situation_matrimoniale) : '',
            nombreEnfant: agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null ? String(agentData.nombre_enfant) : '',
            photoFile: null,
            marriageDate: agentData.date_mariage ? formatDateForInput(agentData.date_mariage) : '',
            marriageCertificate: null,
        spouseLastName: agentData.nom_conjointe || '',
        spouseFirstName: agentData.prenom_conjointe || '',
        });
    if (basePhotoPreview) {
        URL.revokeObjectURL(basePhotoPreview);
        setBasePhotoPreview(null);
    }
    const existingChildren = Array.isArray(agentData.enfants) ? agentData.enfants : [];
    // TOUJOURS utiliser nombre_enfant depuis la base de données
    const initialCount = agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null 
        ? agentData.nombre_enfant 
        : (existingChildren.length > 0 ? existingChildren.length : 0);
    setChildrenForm(prepareChildrenForm(initialCount, existingChildren));
        setIsEditingBase(true);
        setMarriageCertificateName('');
    };

    const handlePhotoChangeClick = () => {
        startBaseEdition();
        setAutoOpenPhoto(true);
    };

    const handleBaseInputChange = (event) => {
        const { name, value } = event.target;
        if (name === 'nombreEnfant') {
            // Déterminer le nombre minimum d'enfants (ne peut pas être réduit si >= 1)
            const currentChildrenCount = childrenForm.length > 0 ? childrenForm.length : parseChildrenCount(baseForm.nombreEnfant);
            const minChildrenCount = currentChildrenCount >= 1 ? currentChildrenCount : 0;
            
            const sanitizedValue = value === '' ? '' : Math.max(minChildrenCount, parseInt(value, 10) || minChildrenCount);
            
            // Empêcher la réduction si le nombre actuel est >= 1
            if (currentChildrenCount >= 1 && parseInt(sanitizedValue, 10) < currentChildrenCount) {
                // Ne pas permettre la réduction, garder la valeur actuelle
                setBaseForm(prev => ({
                    ...prev,
                    [name]: String(currentChildrenCount),
                }));
                return;
            }
            
            setBaseForm(prev => ({
                ...prev,
                [name]: sanitizedValue === '' ? '' : String(sanitizedValue),
            }));
            if (sanitizedValue === '') {
                setChildrenForm([]);
            } else {
                const targetCount = parseInt(sanitizedValue, 10);
                setChildrenForm(prev => {
                    // Préserver toutes les données existantes
                    const currentForm = Array.isArray(prev) ? [...prev] : [];
                    
                    // Si le nombre augmente, ajouter seulement de nouveaux champs vides
                    if (currentForm.length < targetCount) {
                        const newForm = [...currentForm];
                        // Ajouter seulement les nouveaux champs vides nécessaires
                        while (newForm.length < targetCount) {
                            newForm.push(createEmptyChild());
                        }
                        return newForm;
                    } 
                    // Si le nombre diminue, garder seulement les premiers enfants (ne pas supprimer les données)
                    // MAIS cette logique ne devrait plus être atteinte car on empêche la réduction
                    else if (currentForm.length > targetCount) {
                        // Garder les données des premiers enfants
                        return currentForm.slice(0, targetCount);
                    }
                    // Si le nombre est identique, garder les données telles quelles
                    return currentForm;
                });
            }
            return;
        }

        setBaseForm(prev => ({
            ...prev,
            [name]: value,
        }));
        if (name === 'maritalStatusId') {
            if (!isStatusMarried(value)) {
                setBaseForm(prev => ({
                    ...prev,
                    marriageDate: '',
                    marriageCertificate: null,
                    spouseLastName: '',
                    spouseFirstName: '',
                }));
                setMarriageCertificateName('');
            }
            // Note: Les célibataires peuvent aussi avoir des enfants, donc on ne réinitialise plus
            // le nombre d'enfants lorsque le statut est "Célibataire"
        }
    };

    const handleChildFieldChange = (index, field, fieldValue) => {
        setChildrenForm(prev => {
            if (index < 0 || index >= prev.length) {
                return prev;
            }
            const next = [...prev];
            const current = { ...next[index] };
            switch (field) {
                case 'nom':
                    current.nom = fieldValue;
                    break;
                case 'prenom':
                    current.prenom = fieldValue;
                    break;
                case 'sexe':
                    current.sexe = normalizeChildSex(fieldValue);
                    break;
                case 'date_de_naissance':
                    current.date_de_naissance = fieldValue;
                    break;
                default:
                    break;
            }
            next[index] = current;
            return next;
        });
    };

    const handleBasePhotoChange = (event) => {
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        if (basePhotoPreview) {
            URL.revokeObjectURL(basePhotoPreview);
        }
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setBasePhotoPreview(previewUrl);
            setBaseForm(prev => ({
                ...prev,
                photoFile: file,
            }));
        } else {
            setBasePhotoPreview(null);
            setBaseForm(prev => ({
                ...prev,
                photoFile: null,
            }));
        }
    };

    const handleMarriageCertificateChange = (event) => {
        const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        if (file) {
            setBaseForm(prev => ({
                ...prev,
                marriageCertificate: file,
            }));
            setMarriageCertificateName(file.name);
        } else {
            setBaseForm(prev => ({
                ...prev,
                marriageCertificate: null,
            }));
            setMarriageCertificateName('');
        }
    };

    const handleBaseCancel = () => {
        if (agentData) {
            // Récupérer l'acte de mariage existant depuis les documents
            const acteMariageDoc = agentData.documents?.find(doc => doc.document_type === 'acte_mariage') || null;
            setExistingMarriageCertificate(acteMariageDoc);
            
            setBaseForm({
                maritalStatusId: agentData.id_situation_matrimoniale ? String(agentData.id_situation_matrimoniale) : '',
                nombreEnfant: agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null ? String(agentData.nombre_enfant) : '',
                photoFile: null,
                marriageDate: agentData.date_mariage ? formatDateForInput(agentData.date_mariage) : '',
                marriageCertificate: null,
                spouseLastName: agentData.nom_conjointe || '',
                spouseFirstName: agentData.prenom_conjointe || '',
            });
            const existingChildren = Array.isArray(agentData.enfants) ? agentData.enfants : [];
            // TOUJOURS utiliser nombre_enfant depuis la base de données
            const initialCount = agentData.nombre_enfant !== undefined && agentData.nombre_enfant !== null 
                ? agentData.nombre_enfant 
                : (existingChildren.length > 0 ? existingChildren.length : 0);
            setChildrenForm(prepareChildrenForm(initialCount, existingChildren));
        } else {
            setChildrenForm([]);
        }
        if (basePhotoPreview) {
            URL.revokeObjectURL(basePhotoPreview);
            setBasePhotoPreview(null);
        }
        setBaseError(null);
        setBaseSuccess(null);
        setIsEditingBase(false);
        setAutoOpenPhoto(false);
        setMarriageCertificateName('');
    };

    const handleBaseSubmit = async (event) => {
        event.preventDefault();
        setBaseError(null);
        setBaseSuccess(null);

        if (!user?.id_agent) {
            setBaseError('Impossible d’identifier votre compte agent.');
            return;
        }

        const formData = new FormData();
        const maritalStatusValue = baseForm.maritalStatusId ?? '';
        // Permettre aux célibataires d'avoir des enfants, donc ne plus forcer à 0
        const nombreValue = baseForm.nombreEnfant === '' ? 0 : Math.max(0, parseInt(baseForm.nombreEnfant, 10) || 0);
        const marriedStatusSelected = isStatusMarried(maritalStatusValue);
        let normalizedChildren = [];

        if (marriedStatusSelected && !baseForm.marriageDate) {
            setBaseError('Veuillez renseigner votre date de mariage.');
            return;
        }

        // Vérifier si un acte de mariage existe déjà ou si un nouveau fichier est fourni
        if (marriedStatusSelected && !baseForm.marriageCertificate && !existingMarriageCertificate) {
            setBaseError('Veuillez téléverser votre acte de mariage.');
            return;
        }

        if (marriedStatusSelected) {
            const spouseLast = (baseForm.spouseLastName || '').trim();
            const spouseFirst = (baseForm.spouseFirstName || '').trim();
            if (!spouseLast || !spouseFirst) {
                setBaseError('Veuillez renseigner le nom et les prénoms de votre conjoint(e).');
                return;
            }
        }

        if (nombreValue > 0) {
            // IMPORTANT: Envoyer TOUS les enfants jusqu'à nombreValue, même s'ils ne sont pas complètement remplis
            // Le backend se chargera de filtrer et valider les enfants valides
            // Cela permet de sauvegarder les enfants partiellement remplis
            normalizedChildren = childrenForm
                .slice(0, nombreValue)
                .map((child, index) => {
                    // Inclure l'ID de l'enfant s'il existe (pour les mises à jour)
                    const childData = {
                        nom: (child.nom || '').trim(),
                        prenom: (child.prenom || '').trim(),
                        sexe: normalizeChildSex(child.sexe),
                        date_de_naissance: child.date_de_naissance || '',
                        scolarise: child.scolarise !== null && child.scolarise !== undefined ? Boolean(child.scolarise) : false,
                        ayant_droit: child.ayant_droit !== null && child.ayant_droit !== undefined ? Boolean(child.ayant_droit) : false
                    };
                    
                    // Inclure l'ID si l'enfant existe déjà dans la base de données
                    if (child.id) {
                        childData.id = child.id;
                    }
                    
                    return childData;
                });
            
            console.log('🔍 Enfants normalisés à envoyer:', normalizedChildren);
            console.log('🔍 Nombre d\'enfants normalisés:', normalizedChildren.length);
        } else {
            normalizedChildren = [];
        }

        formData.append('id_situation_matrimoniale', maritalStatusValue);
        formData.append('nombre_enfant', String(nombreValue));
        formData.append('date_mariage', baseForm.marriageDate || '');
        
        // Envoyer les enfants - IMPORTANT: envoyer même s'ils ne sont pas complètement remplis
        const enfantsJson = JSON.stringify(normalizedChildren);
        console.log('🔍 Frontend - Envoi des enfants:', {
            nombreValue,
            normalizedChildrenLength: normalizedChildren.length,
            normalizedChildren,
            enfantsJson,
            childrenFormLength: childrenForm.length
        });
        formData.append('enfants', enfantsJson);
        
        formData.append('nom_conjointe', marriedStatusSelected ? (baseForm.spouseLastName || '').trim() : '');
        formData.append('prenom_conjointe', marriedStatusSelected ? (baseForm.spouseFirstName || '').trim() : '');

        if (baseForm.photoFile) {
            formData.append('photo_profil', baseForm.photoFile);
        }
        if (baseForm.marriageCertificate) {
            formData.append('acte_mariage', baseForm.marriageCertificate);
        }

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        setBaseSaving(true);

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                method: 'PUT',
                headers,
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success === false) {
                throw new Error(data.message || data.error || 'Erreur lors de la mise à jour de vos informations.');
            }

            const updatedAgent = data.data || {};
            const selectedStatus = maritalStatuses.find(status => String(status.id || status.value) === String(maritalStatusValue));

            setAgentData(prev => {
                const nextData = {
                    ...prev,
                    ...updatedAgent,
                    id_situation_matrimoniale: updatedAgent.id_situation_matrimoniale ?? (maritalStatusValue ? Number(maritalStatusValue) : null),
                    situation_matrimoniale_libele: updatedAgent.situation_matrimoniale_libele ?? (selectedStatus ? (selectedStatus.libele || selectedStatus.name || selectedStatus.label) : prev?.situation_matrimoniale_libele),
                    nombre_enfant: updatedAgent.nombre_enfant ?? nombreValue,
                    enfants: updatedAgent.enfants ?? normalizedChildren,
                    nom_conjointe: updatedAgent.nom_conjointe ?? (marriedStatusSelected ? (baseForm.spouseLastName || '').trim() : null),
                    prenom_conjointe: updatedAgent.prenom_conjointe ?? (marriedStatusSelected ? (baseForm.spouseFirstName || '').trim() : null),
                };
                const dateNaissanceSource = updatedAgent.date_de_naissance ?? prev?.date_de_naissance;
                const computedAge = updatedAgent.age !== undefined && updatedAgent.age !== null
                    ? updatedAgent.age
                    : calculateAge(dateNaissanceSource);
                nextData.age = computedAge;
                return nextData;
            });

            const resultingChildren = Array.isArray(updatedAgent.enfants) ? updatedAgent.enfants : normalizedChildren;
            const resultingCount = resultingChildren.length > 0 ? resultingChildren.length : nombreValue;
            setChildrenForm(prepareChildrenForm(resultingCount, resultingChildren));

            setBaseSuccess('Informations mises à jour avec succès.');
            setIsEditingBase(false);
            if (basePhotoPreview) {
                URL.revokeObjectURL(basePhotoPreview);
                setBasePhotoPreview(null);
            }
            
            setBaseForm(prev => ({
                ...prev,
                photoFile: null,
                marriageCertificate: null,
            }));
            setMarriageCertificateName('');
            setAutoOpenPhoto(false);

            // Recharger toutes les données de l'agent depuis l'API
            await reloadAgentData();
            
            // Forcer un re-render en mettant à jour un état pour déclencher les useEffect
            setRefreshKey(prev => prev + 1);
            
            // Recharger les congés et séminaires après un court délai pour s'assurer que les données sont à jour
            setTimeout(async () => {
                if (user?.id_agent && isMountedRef.current) {
                    try {
                        await loadAgentConges();
                        await loadAgentSeminaires();
                    } catch (err) {
                        console.error('Erreur lors du rechargement des congés/séminaires:', err);
                    }
                }
            }, 300);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des informations de base:', error);
            setBaseError(error.message);
        } finally {
            setBaseSaving(false);
            setAutoOpenPhoto(false);
        }
    };

    useEffect(() => {
        return () => {
            if (basePhotoPreview) {
                URL.revokeObjectURL(basePhotoPreview);
            }
        };
    }, [basePhotoPreview]);
    
    // Debugging des données de l'agent
    useEffect(() => {
        if (agentData) {
            console.log('Donnees de l\'agent:', agentData);
            console.log('Photos de l\'agent:', agentData.photos);
            if (agentData.photos && agentData.photos.length > 0) {
                agentData.photos.forEach((photo, index) => {
                    console.log(`Photo ${index + 1}:`, {
                        id: photo.id,
                        photo_url: photo.photo_url,
                        is_profile_photo: photo.is_profile_photo,
                        uploaded_at: photo.uploaded_at
                    });
                });
            }
        }
    }, [agentData]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Fonction pour formater la date
    const parseDateValue = (value) => {
        if (!value) return null;
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        const normalized = value.toString().trim();
        if (!normalized) return null;

        const directParse = new Date(normalized);
        if (!Number.isNaN(directParse.getTime())) {
            return directParse;
        }

        const localizedMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (localizedMatch) {
            const [, day, month, year] = localizedMatch;
            const isoString = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`;
            const parsed = new Date(isoString);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed;
            }
        }

        return null;
    };

    const formatDate = (dateString) => {
        const parsed = parseDateValue(dateString);
        if (!parsed) return 'Non renseigné';
        return parsed.toLocaleDateString('fr-FR');
    };

    const formatYearForDisplay = (value) => {
        if (value === null || value === undefined) return '-';
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n >= 1900 && n <= 2100) return String(n);
        if (/^\d{4}$/.test(String(value))) return String(value);
        return formatDate(value);
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().slice(0, 10);
    };

    const parseChildrenCount = (value) => {
        if (value === '' || value === null || value === undefined) return 0;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    const normalizeChildSex = (value) => {
        if (!value) return '';
        const upper = value.toString().trim().toUpperCase();
        if (upper.startsWith('M')) return 'M';
        if (upper.startsWith('F')) return 'F';
        return '';
    };

    const createEmptyChild = () => ({
        nom: '',
        prenom: '',
        sexe: '',
        date_de_naissance: '',
    });

    const prepareChildrenForm = (count, existing = []) => {
        const targetCount = parseChildrenCount(count);
        const prepared = [];
        console.log('🔍 prepareChildrenForm appelé avec:', { 
            count, 
            targetCount, 
            existingCount: existing.length, 
            existingData: existing,
            existingIsArray: Array.isArray(existing)
        });
        
        // Si on a des enfants existants, les utiliser
        if (Array.isArray(existing) && existing.length > 0) {
            console.log('✅ Utilisation des enfants existants:', existing);
            for (let i = 0; i < existing.length; i += 1) {
                const source = existing[i] || {};
                console.log(`🔍 Préparation enfant ${i + 1} depuis données existantes:`, source);
                const childData = {
                    nom: source.nom || '',
                    prenom: source.prenom || '',
                    sexe: normalizeChildSex(source.sexe),
                    date_de_naissance: source.date_de_naissance ? formatDateForInput(source.date_de_naissance) : '',
                };
                console.log(`✅ Enfant ${i + 1} préparé:`, childData);
                prepared.push(childData);
            }
            
            // Si le nombre cible est supérieur au nombre d'enfants existants, ajouter des champs vides
            if (targetCount > existing.length) {
                console.log(`➕ Ajout de ${targetCount - existing.length} champ(s) vide(s) supplémentaire(s)`);
                for (let i = existing.length; i < targetCount; i += 1) {
                    prepared.push(createEmptyChild());
                }
            }
        } else {
            // Sinon, créer des champs vides pour le nombre d'enfants spécifié
            console.log(`⚠️ Aucun enfant existant, création de ${targetCount} champ(s) vide(s)`);
            for (let i = 0; i < targetCount; i += 1) {
                prepared.push(createEmptyChild());
            }
        }
        console.log('✅ Formulaire enfants préparé:', prepared);
        return prepared;
    };

    const calculateAge = (dateString) => {
        if (!dateString) return null;
        const birthDate = new Date(dateString);
        if (Number.isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let ageValue = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            ageValue -= 1;
        }
        return ageValue >= 0 ? ageValue : null;
    };

    const getRetirementDate = () => {
        if (!agentData) return null;
        const dateCandidates = [
            agentData.date_retraite,
            agentData.date_retraite_calculee,
            agentData.date_de_retraite,
            agentData.retirement_date,
            agentData.retirementDate
        ];

        for (const candidate of dateCandidates) {
            const parsed = parseDateValue(candidate);
            if (parsed) {
                return parsed;
            }
        }

        return null;
    };

    const getRetirementYear = () => {
        if (!agentData) return null;
        const retirementDate = getRetirementDate();
        if (retirementDate) {
            return retirementDate.getFullYear();
        }

        const yearCandidates = [
            agentData.annee_depart_retraite,
            agentData.annee_retraite,
            agentData.annee_depart_retraite_prolongee,
            agentData.retirement_year,
            agentData.retirementYear
        ];

        for (const candidate of yearCandidates) {
            const parsedYear = parseInt(candidate, 10);
            if (!Number.isNaN(parsedYear)) {
                return parsedYear;
            }
        }

        return null;
    };

    const getRetirementAge = () => {
        if (!agentData) return null;
        const retirementDate = getRetirementDate();
        if (retirementDate && agentData.date_de_naissance) {
            const birthDate = parseDateValue(agentData.date_de_naissance);
            if (birthDate && !Number.isNaN(birthDate.getTime())) {
                return retirementDate.getFullYear() - birthDate.getFullYear();
            }
        }

        if (agentData.age_retraite_calcule) return agentData.age_retraite_calcule;

        const retirementYear = getRetirementYear();
        if (!retirementYear || !agentData.date_de_naissance) return null;
        const birthDate = parseDateValue(agentData.date_de_naissance);
        if (!birthDate) return null;
        return retirementYear - birthDate.getFullYear();
    };

    const isStatusMarried = useCallback((statusId) => {
        if (!statusId) return false;
        const matchedStatus = maritalStatuses.find(status => String(status.id || status.value) === String(statusId));
        const label = (matchedStatus?.libele || matchedStatus?.name || matchedStatus?.label || matchedStatus?.value || '').toString().toLowerCase();
        return label.includes('mari');
    }, [maritalStatuses]);

    const isStatusSingle = useCallback((statusId) => {
        if (!statusId) return false;
        const matchedStatus = maritalStatuses.find(status => String(status.id || status.value) === String(statusId));
        const label = (matchedStatus?.libele || matchedStatus?.name || matchedStatus?.label || matchedStatus?.value || '').toString().toLowerCase();
        return label.includes('célib') || label.includes('celib');
    }, [maritalStatuses]);

    const marriedSelected = isStatusMarried(baseForm.maritalStatusId);
    // Note: Les célibataires peuvent maintenant renseigner leurs enfants
    // singleSelected est défini à false pour permettre la saisie d'enfants pour tous les statuts
    const singleSelected = false;

    // Fonctions pour gérer les diplômes
    const createEmptyDiplome = () => ({
        id: null,
        diplome: '',
        diplome_autre: '', // Pour stocker le diplôme personnalisé si "Autre" est sélectionné
        options: '',
        date_diplome: '',
        ecole: '',
        ville: '',
        pays: '',
        document: null,
        existingDocument: null
    });

    const startDiplomesEdition = () => {
        if (!agentData) return;
        setDiplomesError(null);
        setDiplomesSuccess(null);
        const existingDiplomes = Array.isArray(agentData.diplomes) ? agentData.diplomes : [];
        const count = existingDiplomes.length > 0 ? existingDiplomes.length : 0;
        setNombreDiplomes(count);
        
            if (existingDiplomes.length > 0) {
                const preparedForm = existingDiplomes.map(diplome => {
                    const diplomeNom = diplome.diplome || '';
                    // Vérifier si le diplôme existe dans les options
                    const existsInOptions = diplomesOptions.some(opt => 
                        (opt.libele || opt.nom || opt.diplome || '') === diplomeNom
                    );
                    
                    // Si le diplôme n'existe pas dans les options, utiliser "Autre" et stocker le nom dans diplome_autre
                    const diplomeValue = existsInOptions ? diplomeNom : 'Autre';
                    const diplomeAutre = existsInOptions ? '' : diplomeNom;
                    
                    return {
                        id: diplome.id || null,
                        diplome: diplomeValue,
                        diplome_autre: diplomeAutre,
                        options: diplome.options || '',
                        date_diplome: diplome.date_diplome ? formatDateForInput(diplome.date_diplome) : '',
                        ecole: diplome.ecole || '',
                        ville: diplome.ville || '',
                        pays: diplome.pays || '',
                        document: null,
                        existingDocument: diplome.id_agent_document ? {
                            id: diplome.id_agent_document,
                            document_url: diplome.document_url,
                            document_name: diplome.document_name,
                            document_size: diplome.document_size
                        } : null
                    };
                });
                setDiplomesForm(preparedForm);
        } else {
            setDiplomesForm([]);
        }
        setIsEditingDiplomes(true);
    };

    const handleDiplomesCancel = () => {
        if (agentData) {
            const existingDiplomes = Array.isArray(agentData.diplomes) ? agentData.diplomes : [];
            const count = existingDiplomes.length > 0 ? existingDiplomes.length : 0;
            setNombreDiplomes(count);
            
            if (existingDiplomes.length > 0) {
                const preparedForm = existingDiplomes.map(diplome => ({
                    id: diplome.id || null,
                    diplome: diplome.diplome || '',
                    options: diplome.options || '',
                    date_diplome: diplome.date_diplome ? formatDateForInput(diplome.date_diplome) : '',
                    ecole: diplome.ecole || '',
                    ville: diplome.ville || '',
                    pays: diplome.pays || '',
                    document: null,
                    existingDocument: diplome.id_agent_document ? {
                        id: diplome.id_agent_document,
                        document_url: diplome.document_url,
                        document_name: diplome.document_name,
                        document_size: diplome.document_size
                    } : null
                }));
                setDiplomesForm(preparedForm);
            } else {
                setDiplomesForm([]);
            }
        }
        setDiplomesError(null);
        setDiplomesSuccess(null);
        setIsEditingDiplomes(false);
    };

    const handleNombreDiplomesChange = (e) => {
        const value = parseInt(e.target.value, 10) || 0;
        setNombreDiplomes(value);
        
        if (value === 0) {
            setDiplomesForm([]);
        } else if (value > diplomesForm.length) {
            // Ajouter des champs vides
            const newForm = [...diplomesForm];
            while (newForm.length < value) {
                newForm.push(createEmptyDiplome());
            }
            setDiplomesForm(newForm);
        } else if (value < diplomesForm.length) {
            // Réduire le nombre (garder les premiers)
            setDiplomesForm(diplomesForm.slice(0, value));
        }
    };

    const handleDiplomeFieldChange = (index, field, value) => {
        setDiplomesForm(prev => {
            if (index < 0 || index >= prev.length) return prev;
            const next = [...prev];
            const current = { ...next[index] };
            
            if (field === 'document') {
                current.document = value;
            } else {
                current[field] = value;
            }
            
            next[index] = current;
            return next;
        });
    };

    const handleDiplomesSubmit = async (e) => {
        e.preventDefault();
        setDiplomesError(null);
        setDiplomesSuccess(null);

        if (!user?.id_agent) {
            setDiplomesError('Impossible d\'identifier votre compte agent.');
            return;
        }

        // Valider les diplômes - inclure tous les diplômes qui ont un nom valide
        const diplomesToSave = diplomesForm.slice(0, nombreDiplomes).filter(d => {
            if (!d.diplome) return false;
            if (d.diplome === 'Autre') {
                return d.diplome_autre && d.diplome_autre.trim() !== '';
            }
            return d.diplome.trim() !== '';
        });
        
        for (let i = 0; i < diplomesToSave.length; i++) {
            const diplome = diplomesToSave[i];
            if (!diplome.diplome) {
                setDiplomesError(`Le nom du diplôme est obligatoire pour le diplôme ${i + 1}.`);
                return;
            }
            if (diplome.diplome === 'Autre' && !diplome.diplome_autre) {
                setDiplomesError(`Veuillez préciser le nom du diplôme pour le diplôme ${i + 1}.`);
                return;
            }
            if (!diplome.ecole) {
                setDiplomesError(`L'école/université est obligatoire pour le diplôme ${i + 1}.`);
                return;
            }
            if (!diplome.ville) {
                setDiplomesError(`La ville est obligatoire pour le diplôme ${i + 1}.`);
                return;
            }
            if (!diplome.pays) {
                setDiplomesError(`Le pays est obligatoire pour le diplôme ${i + 1}.`);
                return;
            }
        }

        setDiplomesSaving(true);

        try {
            const formData = new FormData();
            
            // Préparer les données des diplômes
            const diplomesData = diplomesToSave.map((diplome, index) => {
                // Si "Autre" est sélectionné, utiliser diplome_autre, sinon utiliser diplome
                const diplomeNom = diplome.diplome === 'Autre' && diplome.diplome_autre 
                    ? diplome.diplome_autre 
                    : diplome.diplome;
                
                return {
                    id: diplome.id || null,
                    diplome: diplomeNom,
                    options: diplome.options || null,
                    date_diplome: diplome.date_diplome || null,
                    ecole: diplome.ecole,
                    ville: diplome.ville,
                    pays: diplome.pays
                };
            });

            formData.append('diplomes', JSON.stringify(diplomesData));
            formData.append('nombre_diplomes', String(diplomesToSave.length));

            // Ajouter les fichiers de documents avec le nom de champ attendu par le backend
            diplomesToSave.forEach((diplome, index) => {
                if (diplome.document) {
                    // Utiliser 'diplome_documents' comme nom de champ (array attendu par le backend)
                    formData.append('diplome_documents', diplome.document);
                }
            });

            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                method: 'PUT',
                headers,
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.success === false) {
                throw new Error(data.message || data.error || 'Erreur lors de la sauvegarde des diplômes.');
            }

            setDiplomesSuccess('Diplômes enregistrés avec succès.');
            setIsEditingDiplomes(false);
            
            // Recharger toutes les données de l'agent depuis l'API
            await reloadAgentData();
            
            // Forcer un re-render en mettant à jour un état pour déclencher les useEffect
            setRefreshKey(prev => prev + 1);
            
            // Recharger les congés et séminaires après un court délai
            setTimeout(async () => {
                if (user?.id_agent && isMountedRef.current) {
                    try {
                        await loadAgentConges();
                        await loadAgentSeminaires();
                    } catch (err) {
                        console.error('Erreur lors du rechargement des congés/séminaires:', err);
                    }
                }
            }, 300);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des diplômes:', error);
            setDiplomesError(error.message);
        } finally {
            setDiplomesSaving(false);
        }
    };

    
    
    
    // Fonction pour obtenir la photo de profil de l'agent
    const buildProfilePhotoUrlList = useCallback((agent) => {
        if (!agent) return [];

        const urls = new Set();
        const baseApiUrl = 'https://tourisme.2ise-groupe.com';
        const cacheTimestamp = Date.now();

        // Ne pas ajouter l'URL de profil si l'agent n'a pas de photos
        // Cela évite les erreurs 404 inutiles
        if (agent.photos && Array.isArray(agent.photos) && agent.photos.length > 0) {
            // Chercher d'abord la photo de profil
            const profilePhoto = agent.photos.find(photo => photo.is_profile_photo);
            
            if (profilePhoto) {
                if (profilePhoto.id) {
                    urls.add(`${baseApiUrl}/api/images/public/photo/${profilePhoto.id}?v=${cacheTimestamp}`);
                }
                if (profilePhoto.photo_url || profilePhoto.url) {
                    const rawPath = profilePhoto.photo_url || profilePhoto.url;
                    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                    urls.add(`${baseApiUrl}${normalizedPath}?v=${cacheTimestamp}`);
                }
            }
            
            // Ajouter les autres photos
            agent.photos.forEach((photo) => {
                const updatedValue = photo.updated_at || photo.uploaded_at || cacheTimestamp;
                if (photo.id && (!profilePhoto || photo.id !== profilePhoto.id)) {
                    urls.add(`${baseApiUrl}/api/images/public/photo/${photo.id}?v=${updatedValue}`);
                }
                if ((photo.photo_url || photo.url) && (!profilePhoto || (photo.photo_url || photo.url) !== (profilePhoto.photo_url || profilePhoto.url))) {
                    const rawPath = photo.photo_url || photo.url;
                    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                    urls.add(`${baseApiUrl}${normalizedPath}?v=${updatedValue}`);
                }
            });
        }
        
        // Seulement si aucune photo n'est trouvée, essayer l'endpoint générique (mais cela peut retourner 404)
        // On ne l'ajoute pas par défaut pour éviter les 404 inutiles
        // if (agent.id && urls.size === 0) {
        //     urls.add(`${baseApiUrl}/api/images/public/profile/${agent.id}?v=${cacheTimestamp}`);
        // }

        return Array.from(urls);
    }, []);

    useEffect(() => {
        const urls = buildProfilePhotoUrlList(agentData);
        setProfilePhotoUrls(urls);
        setProfilePhotoIndex(0);
    }, [agentData, buildProfilePhotoUrlList]);

    // Charger les routes assignées par le DRH
    useEffect(() => {
        const loadAssignedRoutes = async () => {
            // Ne charger que pour les agents (pas DRH, pas super_admin)
            if (!user || !user.id) return;
            const isDRH = user.role === 'drh' || user.role === 'DRH' || user.role?.toLowerCase() === 'drh';
            const isSuperAdmin = user.role === 'super_admin';
            if (isDRH || isSuperAdmin) return;

            setLoadingAssignedRoutes(true);
            try {
                const apiBase = getApiUrl();
                const response = await fetch(`${apiBase}/api/agent-route-assignments/my-routes`, {
                    headers: getAuthHeaders()
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && Array.isArray(data.data)) {
                        // Récupérer les détails des routes depuis backendRoutes
                        const routeDetails = data.data
                            .map(routeId => backendRoutes.find(r => r.id === routeId))
                            .filter(route => route && route.id !== 'agent-dashboard' && route.id !== 'drh-dashboard');
                        setAssignedRoutes(routeDetails);
                    }
                }
            } catch (error) {
                console.error('Erreur lors du chargement des routes assignées:', error);
            } finally {
                setLoadingAssignedRoutes(false);
            }
        };

        loadAssignedRoutes();
    }, [user]);

    // Grouper les routes assignées par catégorie
    const assignedRoutesByCategory = useMemo(() => {
        const grouped = {};
        assignedRoutes.forEach(route => {
            const category = route.category || 'Autres';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(route);
        });
        return grouped;
    }, [assignedRoutes]);

    const profilePhotoUrl = profilePhotoUrls[profilePhotoIndex] || null;
    const retirementYear = getRetirementYear();
    const retirementAge = getRetirementAge();
    const retirementPlanningLabel = (() => {
        if (!retirementYear) {
            return 'Non';
        }
        const currentYear = new Date().getFullYear();
        if (agentData?.statut_emploi === 'retraite') {
            return 'Oui, déjà retraité';
        }
        if (retirementAge && agentData?.age && agentData.age >= retirementAge) {
            return 'Oui, éligible (âge atteint)';
        }
        if (retirementYear === currentYear) {
            return 'Oui, départ prévu cette année';
        }
        if (retirementYear < currentYear) {
            return `Oui, départ en ${retirementYear}`;
        }
        return `Oui, prévu en ${retirementYear}`;
    })();

    const handleProfilePhotoError = () => {
        if (profilePhotoIndex + 1 < profilePhotoUrls.length) {
            setProfilePhotoIndex(profilePhotoIndex + 1);
        } else {
            setProfilePhotoUrls([]);
            setProfilePhotoIndex(0);
        }
    };

    // Fonction pour obtenir le statut d'emploi avec couleur
    const getStatutBadge = (statut) => {
        const statuts = {
            'actif': { color: 'success', text: 'Actif' },
            'inactif': { color: 'secondary', text: 'Inactif' },
            'retraite': { color: 'info', text: 'Retraité' },
            'demission': { color: 'warning', text: 'Démission' },
            'licencie': { color: 'danger', text: 'Licencié' }
        };
        const statutInfo = statuts[statut] || { color: 'secondary', text: statut };
        return <Badge color={statutInfo.color}>{statutInfo.text}</Badge>;
    };

    // Fonction pour obtenir le sexe avec couleur
    const getSexeBadge = (sexe) => {
        const sexes = {
            M: { label: 'Masculin', bg: '#0d6efd' },
            F: { label: 'Féminin', bg: '#0dcaf0' }
        };
        const sexeInfo = sexes[sexe] || {
            label: sexe || 'Non renseigné',
            bg: '#6c757d'
        };

        return (
            <Badge
                style={{
                    backgroundColor: sexeInfo.bg,
                    color: '#fff',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.85rem',
                    letterSpacing: '0.4px'
                }}
            >
                {sexeInfo.label}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Spinner color="primary" />
                <span className="ml-2">Chargement de vos informations...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                <h4 className="alert-heading">Erreur</h4>
                <p>{error}</p>
            </Alert>
        );
    }

    if (!agentData) {
        return (
            <Alert color="warning">
                <h4 className="alert-heading">Aucune donnée</h4>
                <p>Aucune information d'agent trouvée pour votre compte.</p>
            </Alert>
        );
    }

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Détecteur de nouvelle version */}
            <VersionChecker checkInterval={3000} />
            
            {/* Navbar mobile */}
            {isMobile && (
                <Navbar color="primary" dark expand="md" className="d-md-none agent-mobile-nav">
                    <NavbarBrand className="text-white">
                        <i className="fa fa-user me-2"></i>
                        Espace Agent
                    </NavbarBrand>
                    <Button 
                        color="link" 
                        className="navbar-toggler"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ border: 'none', padding: '0.25rem 0.5rem' }}
                    >
                        <span className="navbar-toggler-icon"></span>
                    </Button>
                    <div className="d-flex align-items-center">
                        <Button 
                            color="danger" 
                            size="sm" 
                            onClick={handleLogout}
                            className="me-2"
                        >
                            <FaSignOutAlt className="me-1" />
                            Déconnexion
                        </Button>
                    </div>
                </Navbar>
            )}

            {/* Overlay pour mobile */}
            {isMobile && sidebarOpen && (
                <div 
                    className="agent-sidebar-overlay show" 
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar mobile qui glisse depuis la gauche */}
            {isMobile && (
                <div className={`agent-mobile-sidebar ${sidebarOpen ? 'show' : ''}`}>
                    <div className="agent-mobile-sidebar-header">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h5 className="text-white mb-0">
                                <i className="fa fa-user me-2"></i>
                                Menu
                            </h5>
                            <Button 
                                color="link" 
                                className="text-white p-0"
                                onClick={() => setSidebarOpen(false)}
                                style={{ fontSize: '1.5rem', lineHeight: '1' }}
                            >
                                <i className="fa fa-times"></i>
                            </Button>
                        </div>
                        {agentData && (
                            <div className="text-center mb-3">
                                {profilePhotoUrl ? (
                                    <img 
                                        src={profilePhotoUrl}
                                        onError={handleProfilePhotoError}
                                        alt="Photo de profil" 
                                        className="rounded-circle mb-2"
                                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div className="bg-white text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-2" 
                                         style={{ width: '50px', height: '50px' }}>
                                        <i className="fa fa-user"></i>
                                    </div>
                                )}
                                <h6 className="text-white mb-1">{agentData.prenom} {agentData.nom}</h6>
                                <small className="text-light">{agentData.matricule}</small>
                            </div>
                        )}
                    </div>
                    <Nav vertical className="agent-mobile-sidebar-nav">
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '1' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('1');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-user me-2"></i>
                                Informations personnelles
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '2' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('2');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-briefcase me-2"></i>
                                Informations professionnelles
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '3' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('3');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-home me-2"></i>
                                Informations familiales
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '4' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('4');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-child me-2"></i>
                                Enfants
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '13' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('13');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <MdSchool className="me-2" />
                                Diplômes
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '5' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('5');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-user me-2"></i>
                                Mes Demandes
                            </NavLink>
                            <NavLink 
                                className={`text-white ${activeTab === '8' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('8');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-history me-2"></i>
                                Historique des demandes
                            </NavLink>
                            {canValidateDemandes() && (
                                <NavLink 
                                    className={`text-white ${activeTab === '12' ? 'bg-white text-primary' : ''}`}
                                    onClick={() => {
                                        setActiveTab('12');
                                        setSidebarOpen(false);
                                    }}
                                    style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                                >
                                    <i className="fa fa-users me-2"></i>
                                    {getDemandesServiceLabel()}
                                </NavLink>
                            )}
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '7' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('7');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-file-text me-2"></i>
                                Mes Documents
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '11' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('11');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-cog me-2"></i>
                                Paramètres
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '6' ? 'bg-white text-primary' : ''}`}
                                onClick={() => {
                                    setActiveTab('6');
                                    setSidebarOpen(false);
                                }}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-inbox me-2"></i>
                                Boîte de réception
                                {nombreNotificationsNonLues > 0 && (
                                    <Badge color="danger" className="ms-2">{nombreNotificationsNonLues}</Badge>
                                )}
                            </NavLink>
                        </NavItem>
                        
                        {/* Routes assignées par le DRH - Mobile */}
                        {assignedRoutes.length > 0 && (
                            <>
                                <NavItem>
                                    <div className="text-light mt-3 mb-2 px-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                        Tâches Assignées
                                    </div>
                                </NavItem>
                                {Object.entries(assignedRoutesByCategory).map(([category, routes]) => (
                                    <React.Fragment key={category}>
                                        {routes.map((route) => {
                                            const IconComponent = route.icon ? iconMap[route.icon] : null;
                                            return (
                                                <NavItem key={route.id}>
                                                    <NavLink
                                                        href={route.path}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            // Naviguer vers la route assignée
                                                            // Les routes assignées sont accessibles car elles sont vérifiées par canAccessRoute
                                                            history.push(route.path);
                                                            setSidebarOpen(false);
                                                        }}
                                                        className="text-white"
                                                        style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                                                    >
                                                        {IconComponent ? (
                                                            <IconComponent className="me-2" style={{ fontSize: '18px', verticalAlign: 'middle' }} />
                                                        ) : (
                                                            <i className="fa fa-folder-open me-2"></i>
                                                        )}
                                                        <span>{route.name}</span>
                                                    </NavLink>
                                                </NavItem>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </Nav>
                    <div className="agent-mobile-sidebar-footer">
                        <Button 
                            color="danger" 
                            size="sm" 
                            onClick={handleLogout}
                            className="w-100"
                        >
                            <FaSignOutAlt className="me-1" />
                            Déconnexion
                        </Button>
                    </div>
                </div>
            )}

            <div className="d-flex" style={{ minHeight: isMobile ? 'calc(100vh - 56px)' : '100vh' }}>
                {/* Sidebar pour les agents - Desktop */}
                {!isMobile && (
                    <div className="agent-sidebar text-white" style={{ width: '250px' }}>
                        <div className="p-3">
                            {/* Logo et titre */}
                            <div className="d-flex align-items-center mb-4">
                                <div className="bg-white text-primary rounded p-2 me-2" style={{ width: '40px', height: '40px' }}>
                                    <i className="fa fa-user fa-lg"></i>
                                </div>
                                <div>
                                    <h5 className="mb-0 text-white">Espace Agent</h5>
                                    <small className="text-light">Tableau de bord personnel</small>
                                </div>
                            </div>

                    {/* Menu de navigation pour les agents */}
                    <Nav vertical>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '1' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('1')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-user me-2"></i>
                                Informations personnelles
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '2' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('2')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-briefcase me-2"></i>
                                Informations professionnelles
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '3' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('3')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-home me-2"></i>
                                Informations familiales
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '4' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('4')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-child me-2"></i>
                                Enfants
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '13' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('13')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <MdSchool className="me-2" />
                                Diplômes
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); setActiveTab('5'); }}
                                className="text-white"
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', background: 'transparent', border: 'none' }}
                            >
                                <i className="fa fa-user me-2"></i>
                                Mes Demandes
                            </NavLink>
                            <NavLink 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); setActiveTab('8'); }}
                                className={`text-white ${activeTab === '8' ? 'bg-white text-primary' : ''}`}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-history me-2"></i>
                                Historique des demandes
                            </NavLink>
                            {canValidateDemandes() && (
                                <NavLink 
                                    href="#" 
                                    onClick={(e) => { e.preventDefault(); setActiveTab('12'); }}
                                    className={`text-white ${activeTab === '12' ? 'bg-white text-primary' : ''}`}
                                    style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                                >
                                    <i className="fa fa-users me-2"></i>
                                    {getDemandesServiceLabel()}
                                </NavLink>
                            )}
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                href="#" 
                                onClick={(e) => { e.preventDefault(); setActiveTab('7'); }}
                                className="text-white"
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px', background: 'transparent', border: 'none' }}
                            >
                                <i className="fa fa-file-text me-2"></i>
                                Mes Documents
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '11' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('11')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-cog me-2"></i>
                                Paramètres
                            </NavLink>
                        </NavItem>
                        <NavItem>
                            <NavLink 
                                className={`text-white ${activeTab === '6' ? 'bg-white text-primary' : ''}`}
                                onClick={() => setActiveTab('6')}
                                style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                            >
                                <i className="fa fa-inbox me-2"></i>
                                Boîte de réception
                                {nombreNotificationsNonLues > 0 && (
                                    <span className="badge bg-danger ms-2">{nombreNotificationsNonLues}</span>
                                )}
                            </NavLink>
                        </NavItem>
                        
                        {/* Routes assignées par le DRH - Desktop */}
                        {assignedRoutes.length > 0 && (
                            <>
                                <NavItem>
                                    <div className="text-light mt-3 mb-2 px-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                        Tâches Assignées
                                    </div>
                                </NavItem>
                                {Object.entries(assignedRoutesByCategory).map(([category, routes]) => (
                                    <React.Fragment key={category}>
                                        {routes.map((route) => {
                                            const IconComponent = route.icon ? iconMap[route.icon] : null;
                                            return (
                                                <NavItem key={route.id}>
                                                    <NavLink
                                                        href={route.path}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            // Naviguer vers la route assignée
                                                            // Les routes assignées sont accessibles car elles sont vérifiées par canAccessRoute
                                                            history.push(route.path);
                                                        }}
                                                        className="text-white"
                                                        style={{ cursor: 'pointer', borderRadius: '5px', marginBottom: '5px' }}
                                                    >
                                                        {IconComponent ? (
                                                            <IconComponent className="me-2" style={{ fontSize: '18px', verticalAlign: 'middle' }} />
                                                        ) : (
                                                            <i className="fa fa-folder-open me-2"></i>
                                                        )}
                                                        <span>{route.name}</span>
                                                    </NavLink>
                                                </NavItem>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </Nav>

                            {/* Informations de l'agent dans la sidebar */}
                            {agentData && (
                                <div className="mt-4 pt-3 border-top border-light">
                                    <div className="text-center">
                                        
                        {profilePhotoUrl ? (
                            <div>
                                <img 
                                    src={profilePhotoUrl}
                                    onLoad={() => console.log('Photo chargee avec succes:', profilePhotoUrl)}
                                        onError={() => {
                                            console.log('Erreur de chargement de la photo:', profilePhotoUrl);
                                            handleProfilePhotoError();
                                        }} 
                                    alt="Photo de profil" 
                                    className="rounded-circle mb-2"
                                    style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                />
                                <div className="text-center">
                                    <small className="text-muted">Photo de profil</small>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-2" 
                                 style={{ width: '60px', height: '60px' }}>
                                <i className="fa fa-user fa-2x"></i>
                            </div>
                        )}
                                        <h6 className="text-white mb-1">{agentData.prenom} {agentData.nom}</h6>
                                        <small className="text-light">{agentData.matricule}</small>
                                    </div>
                                    
                                    {/* Bouton de déconnexion */}
                                    <div className="mt-3">
                                        <Button 
                                            color="danger" 
                                            size="sm" 
                                            onClick={handleLogout}
                                            className="w-100"
                                        >
                                            <FaSignOutAlt className="me-1" />
                                            Déconnexion
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Contenu principal */}
                <div className="agent-main-content flex-grow-1 p-3 p-md-4" style={{ 
                    maxWidth: '100%', 
                    overflowX: 'hidden',
                    boxSizing: 'border-box'
                }}>
                    {/* Message de succès pour la validation */}
                    {validationSuccess && (
                        <Alert color="success" className="mb-3">
                            <i className="fa fa-check-circle me-2"></i>
                            {validationMessage}
                        </Alert>
                    )}

                    {/* Icône de notification flottante - Version responsive */}
                    <div className="notification-bell">
                        <div style={{ position: 'relative' }}>
                            <FaBell
                                onClick={() => setShowNotifications(!showNotifications)}
                                title="Voir les notifications"
                                style={{ 
                                    fontSize: isMobile ? '1.25rem' : '1.5rem',
                                    color: '#6c757d',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            />
                            {nombreNotificationsNonLues > 0 && (
                                <div
                                    style={{ 
                                        position: 'absolute',
                                        top: '-8px',
                                        right: '-8px',
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        borderRadius: '50%',
                                        width: isMobile ? '16px' : '18px',
                                        height: isMobile ? '16px' : '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMobile ? '0.5rem' : '0.6rem',
                                        fontWeight: 'bold',
                                        border: '2px solid white',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        zIndex: 1
                                    }}
                                >
                                    {nombreNotificationsNonLues}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel de notifications - Version responsive */}
                    {showNotifications && (
                        <div className="notifications-panel">
                            <NotificationsPanel
                                agentId={user?.id_agent}
                                onNotificationClick={handleNotificationClick}
                                onClose={() => setShowNotifications(false)}
                            />
                        </div>
                    )}

                    {/* Contenu des onglets */}
                    <TabContent activeTab={activeTab}>
                        {/* Onglet 1: Informations personnelles - Version responsive */}
                        <TabPane tabId="1">
                            <div className="mb-4 agent-fade-in">
                                <div className={`d-flex align-items-center mb-4 ${isMobile ? 'flex-column text-center' : ''}`}>
                                    <div className={`d-flex flex-column ${isMobile ? 'align-items-center mb-3' : 'align-items-start me-3'}`}>
                                        {profilePhotoUrl ? (
                                            <img 
                                                src={profilePhotoUrl}
                                                onLoad={() => console.log('Photo chargee avec succes')}
                                                onError={() => {
                                                    console.log('Erreur de chargement de la photo:', profilePhotoUrl);
                                                    handleProfilePhotoError();
                                                }} 
                                                alt="Photo de profil" 
                                                className="rounded-circle"
                                                style={{ 
                                                    width: isMobile ? '60px' : '80px', 
                                                    height: isMobile ? '60px' : '80px', 
                                                    objectFit: 'cover' 
                                                }}
                                            />
                                        ) : null}
                                        {!profilePhotoUrl && (
                                            <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                                                 style={{ 
                                                     width: isMobile ? '60px' : '80px', 
                                                     height: isMobile ? '60px' : '80px' 
                                                 }}>
                                                <i className={`fa fa-user ${isMobile ? 'fa-2x' : 'fa-3x'}`}></i>
                                            </div>
                                        )}
                                        <Button
                                            color="secondary"
                                            outline
                                            size="sm"
                                            className="mt-2"
                                            onClick={handlePhotoChangeClick}
                                            disabled={isEditingBase}
                                        >
                                            Modifier ma photo
                                        </Button>
                                    </div>
                                    <div>
                                        <h2 className={`${isMobile ? 'h5' : 'h4'} mb-1`}>
                                            Bienvenue, {agentData.prenom} {agentData.nom}
                                        </h2>
                                        <p className="text-muted mb-0">Matricule: {agentData.matricule}</p>
                                    </div>
                                </div>
                                <p className="text-muted">Voici un aperçu de vos informations et de vos activités</p>
                        
                                {/* Affichage des informations d'organisation */}
                                {organizationData && (
                                    <div className="mt-3">
                                        {organizationData.type === 'entite' && (
                                            <div className="d-flex align-items-center">
                                                {organizationData.entite?.logo && (
                                                    <img 
                                                        src={organizationData.entite.logo} 
                                                        alt="Logo entité" 
                                                        style={{ width: '40px', height: '40px', marginRight: '10px' }}
                                                        className="rounded"
                                                    />
                                                )}
                                                <div>
                                                    <h5 className="mb-0 text-primary">{organizationData.entite?.nom}</h5>
                                                    <small className="text-muted">
                                                        Ministère: {organizationData.ministere?.nom}
                                                    </small>
                                                </div>
                                            </div>
                                        )}
                                        {organizationData.type === 'ministere' && (
                                            <div className="d-flex align-items-center">
                                                {organizationData.ministere?.logo && (
                                                    <img 
                                                        src={organizationData.ministere.logo} 
                                                        alt="Logo ministère" 
                                                        style={{ width: '40px', height: '40px', marginRight: '10px' }}
                                                        className="rounded"
                                                    />
                                                )}
                                                <div>
                                                    <h5 className="mb-0 text-primary">{organizationData.ministere?.nom}</h5>
                                                    <small className="text-muted">Ministère</small>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Informations générales - Version responsive améliorée */}
                            <div className="dashboard-cards mb-4">
                                <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12 mb-3">
                                    <Card className="text-center h-100 agent-fade-in">
                                        <CardBody className="p-3">
                                            <div className="mb-2">
                                                <i className="fa fa-user fa-lg fa-2x text-primary"></i>
                                            </div>
                                            <h6 className="mb-1">Matricule</h6>
                                            <h5 className="text-primary mb-0">{agentData.matricule}</h5>
                                        </CardBody>
                                    </Card>
                                </div>
                                <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12 mb-3">
                                    <Card className="text-center h-100 agent-fade-in">
                                        <CardBody className="p-3">
                                            <div className="mb-2">
                                                <i className="fa fa-briefcase fa-lg fa-2x text-success"></i>
                                            </div>
                                            <h6 className="mb-1">Statut</h6>
                                            <div>{getStatutBadge(agentData.statut_emploi)}</div>
                                        </CardBody>
                                    </Card>
                                </div>
                                <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12 mb-3">
                                    <Card className="text-center h-100 agent-fade-in">
                                        <CardBody className="p-3">
                                            <div className="mb-2">
                                                <i className="fa fa-calendar fa-lg fa-2x text-info"></i>
                                            </div>
                                            <h6 className="mb-1">Âge</h6>
                                            <h5 className="text-info mb-0">{agentData.age || 'N/A'} ans</h5>
                                        </CardBody>
                                    </Card>
                                </div>
                                <div className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12 mb-3">
                                    <Card className="text-center h-100 agent-fade-in">
                                        <CardBody className="p-3">
                                            <div className="mb-2">
                                                <i className="fa fa-users fa-lg fa-2x text-warning"></i>
                                            </div>
                                            <h6 className="mb-1">Enfants</h6>
                                            <h5 className="text-warning mb-0">{agentData.nombre_enfant || 0}</h5>
                                        </CardBody>
                                    </Card>
                                </div>
                            </div>

                            {/* Sections Anniversaires et Congés pour Directeurs et Sous-Directeurs */}
                            {(() => {
                                const userRole = user?.role?.toLowerCase();
                                const isDirecteur = userRole === 'directeur';
                                const isSousDirecteur = userRole === 'sous_directeur' || userRole === 'sous-directeur';
                                
                                if (!isDirecteur && !isSousDirecteur) return null;
                                
                                // Séparer les anniversaires d'aujourd'hui et ceux à venir
                                const anniversairesAujourdhui = birthdays.filter(agent => parseInt(agent.jours_restants) === 0);
                                const anniversairesAVenir = birthdays.filter(agent => parseInt(agent.jours_restants) > 0);
                                const congesGroups = groupCongesByPeriod();
                                const hasConges = Object.values(congesGroups).some(group => group.length > 0);
                                
                                return (
                                    <>
                                        {/* Section Anniversaires */}
                                        {birthdays.length > 0 && (
                                            <>
                                                {/* Section Anniversaires d'aujourd'hui */}
                                                {anniversairesAujourdhui.length > 0 && (
                                                    <Row className="mt-4">
                                                        <Col>
                                                            <Card className="birthdays-card fade-in-up">
                                                                <CardHeader style={{ background: '#007bff', color: 'white' }}>
                                                                    <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                                                                        <div className="d-flex align-items-center">
                                                                            <MdCake className="me-2" style={{ fontSize: '1.5rem' }} />
                                                                            <span style={{ fontWeight: 'bold' }}>🎂 ANNIVERSAIRES D'AUJOURD'HUI ({anniversairesAujourdhui.length})</span>
                                                                        </div>
                                                                        <div>
                                                                            <Button 
                                                                                color="light" 
                                                                                size="sm" 
                                                                                className="me-2"
                                                                                onClick={() => setDetailsModalToday(true)}
                                                                            >
                                                                                <MdVisibility className="me-1" />
                                                                                Voir les détails
                                                                            </Button>
                                                                            <Button 
                                                                                color="info" 
                                                                                size="sm"
                                                                                onClick={() => setMessageModalToday(true)}
                                                                            >
                                                                                <MdMessage className="me-1" />
                                                                                Envoi de message
                                                                            </Button>
                                                                        </div>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardBody>
                                                                    {birthdaysLoading ? (
                                                                        <div className="text-center py-3">
                                                                            <Spinner size="sm" color="primary" />
                                                                            <span className="ms-2">Chargement...</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-4">
                                                                            <h4 className="text-muted">{anniversairesAujourdhui.length} agent(s) fête(nt) leur anniversaire aujourd'hui</h4>
                                                                            <p className="text-muted mt-2">Cliquez sur "Voir les détails" pour voir la liste complète ou "Envoi de message" pour envoyer un message de félicitations</p>
                                                                        </div>
                                                                    )}
                                                                </CardBody>
                                                            </Card>
                                                        </Col>
                                                    </Row>
                                                )}

                                                {/* Section Anniversaires à venir */}
                                                {anniversairesAVenir.length > 0 && (
                                                    <Row className="mt-4">
                                                        <Col>
                                                            <Card className="birthdays-card fade-in-up">
                                                                <CardHeader style={{ background: '#495057', color: 'white' }}>
                                                                    <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                                                                        <div className="d-flex align-items-center">
                                                                            <MdCake className="me-2" style={{ fontSize: '1.5rem' }} />
                                                                            <span style={{ fontWeight: 'bold' }}>🎉 ANNIVERSAIRES À VENIR ({anniversairesAVenir.length})</span>
                                                                        </div>
                                                                        <div>
                                                                            <Button 
                                                                                color="light" 
                                                                                size="sm" 
                                                                                className="me-2"
                                                                                onClick={() => setDetailsModalUpcoming(true)}
                                                                            >
                                                                                <MdVisibility className="me-1" />
                                                                                Voir les détails
                                                                            </Button>
                                                                            <Button 
                                                                                color="info" 
                                                                                size="sm"
                                                                                onClick={() => setMessageModalUpcoming(true)}
                                                                            >
                                                                                <MdMessage className="me-1" />
                                                                                Envoi de message
                                                                            </Button>
                                                                        </div>
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardBody>
                                                                    {birthdaysLoading ? (
                                                                        <div className="text-center py-3">
                                                                            <Spinner size="sm" color="primary" />
                                                                            <span className="ms-2">Chargement...</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-4">
                                                                            <h4 className="text-muted">{anniversairesAVenir.length} agents fêtent leur anniversaire dans les prochains jours</h4>
                                                                            <p className="text-muted mt-2">Cliquez sur "Voir les détails" pour voir la liste complète ou "Envoi de message" pour envoyer un message de rappel</p>
                                                                        </div>
                                                                    )}
                                                                </CardBody>
                                                            </Card>
                                                        </Col>
                                                    </Row>
                                                )}
                                            </>
                                        )}

                                        {/* Section Agents actuellement en congés */}
                                        <Row className="mt-4">
                                            <Col>
                                                <Card className="fade-in-up">
                                                    <CardHeader style={{ background: '#007bff', color: 'white' }}>
                                                        <CardTitle className="mb-0 d-flex align-items-center justify-content-between">
                                                            <div className="d-flex align-items-center">
                                                                <MdWork className="me-2" style={{ fontSize: '1.5rem' }} />
                                                                <span style={{ fontWeight: 'bold' }}>👥 AGENTS ACTUELLEMENT EN CONGÉS</span>
                                                            </div>
                                                            {agentsEnConges && Object.keys(agentsEnConges).length > 0 && (
                                                                <Button 
                                                                    color="light" 
                                                                    size="sm"
                                                                    onClick={() => setShowAgentsEnCongesModal(true)}
                                                                >
                                                                    <MdVisibility className="me-1" />
                                                                    Voir tous les détails
                                                                </Button>
                                                            )}
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardBody>
                                                        {agentsEnCongesLoading ? (
                                                            <div className="text-center py-3">
                                                                <Spinner size="sm" color="primary" />
                                                                <span className="ms-2">Chargement...</span>
                                                            </div>
                                                        ) : !agentsEnConges || Object.keys(agentsEnConges).length === 0 ? (
                                                            <Alert color="info" className="mb-0">
                                                                <MdInfo className="me-2" />
                                                                Aucun agent actuellement en congés
                                                            </Alert>
                                                        ) : (
                                                            <Row>
                                                                {Object.values(agentsEnConges).slice(0, 6).map((direction, dirIndex) => (
                                                                    <Col md="6" lg="4" key={dirIndex} className="mb-3">
                                                                        <Card 
                                                                            className="h-100 clickable-card" 
                                                                            style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                                                                            onClick={() => {
                                                                                setSelectedStructure({ type: 'direction', data: direction, label: direction.libelle });
                                                                                setShowAgentsEnCongesModal(true);
                                                                            }}
                                                                        >
                                                                            <CardBody>
                                                                                <h6 className="mb-2" style={{ color: '#212529', fontWeight: 'bold' }}>
                                                                                    {direction.libelle}
                                                                                </h6>
                                                                                {Object.values(direction.sous_directions).slice(0, 2).map((sousDirection, sdIndex) => {
                                                                                    const totalAgents = Object.values(sousDirection.services).reduce(
                                                                                        (sum, service) => sum + service.agents.length, 0
                                                                                    );
                                                                                    return (
                                                                                        <div key={sdIndex} className="mb-2" style={{ fontSize: '0.9rem' }}>
                                                                                            <div style={{ color: '#495057', fontWeight: '600' }}>
                                                                                                {sousDirection.libelle}
                                                                                            </div>
                                                                                            <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                                                                                                {totalAgents} agent{totalAgents > 1 ? 's' : ''} en congés
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                                {Object.values(direction.sous_directions).length > 2 && (
                                                                                    <div style={{ color: '#6c757d', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                                                                        + {Object.values(direction.sous_directions).length - 2} autre(s) sous-direction(s)
                                                                                    </div>
                                                                                )}
                                                                                <div className="mt-2 pt-2" style={{ borderTop: '1px solid #e0e0e0' }}>
                                                                                    <Badge color="primary" style={{ fontSize: '0.9rem' }}>
                                                                                        {Object.values(direction.sous_directions).reduce(
                                                                                            (sum, sd) => sum + Object.values(sd.services).reduce(
                                                                                                (s, svc) => s + svc.agents.length, 0
                                                                                            ), 0
                                                                                        )} agent{Object.values(direction.sous_directions).reduce(
                                                                                            (sum, sd) => sum + Object.values(sd.services).reduce(
                                                                                                (s, svc) => s + svc.agents.length, 0
                                                                                            ), 0
                                                                                        ) > 1 ? 's' : ''} au total
                                                                                    </Badge>
                                                                                </div>
                                                                            </CardBody>
                                                                        </Card>
                                                                    </Col>
                                                                ))}
                                                                {Object.keys(agentsEnConges).length > 6 && (
                                                                    <Col md="12" className="text-center mt-3">
                                                                        <Button 
                                                                            color="primary" 
                                                                            onClick={() => setShowAgentsEnCongesModal(true)}
                                                                        >
                                                                            Voir toutes les directions ({Object.keys(agentsEnConges).length} au total)
                                                                        </Button>
                                                                    </Col>
                                                                )}
                                                            </Row>
                                                        )}
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                        </Row>

                                        {/* Section Congés prévisionnels */}
                                        {(() => {
                                            if (!hasConges && !congesLoading) return null;

                                            return (
                                                <Row className="mt-4">
                                                    <Col>
                                                        <Card className="fade-in-up">
                                                            <CardHeader style={{ background: '#28a745', color: 'white' }}>
                                                                <CardTitle className="mb-0 d-flex align-items-center">
                                                                    <MdCalendarToday className="me-2" style={{ fontSize: '1.5rem' }} />
                                                                    <span style={{ fontWeight: 'bold' }}>📅 DÉPARTS EN CONGÉS PRÉVISIONNELS</span>
                                                                </CardTitle>
                                                            </CardHeader>
                                                            <CardBody>
                                                                {congesLoading ? (
                                                                    <div className="text-center py-3">
                                                                        <Spinner size="sm" color="primary" />
                                                                        <span className="ms-2">Chargement...</span>
                                                                    </div>
                                                                ) : !hasConges ? (
                                                                    <Alert color="info" className="mb-0">
                                                                        <MdInfo className="me-2" />
                                                                        Aucun départ en congés programmé pour le moment
                                                                    </Alert>
                                                                ) : (
                                                                    <Row>
                                                                        {Object.entries(congesGroups).map(([period, agents]) => {
                                                                            if (agents.length === 0) return null;
                                                                            return (
                                                                                <Col md="6" lg="4" key={period} className="mb-3">
                                                                                    <Card 
                                                                                        className="h-100 clickable-card" 
                                                                                        style={{ cursor: 'pointer', border: '2px solid #e0e0e0' }}
                                                                                        onClick={() => {
                                                                                            setSelectedCongesPeriod({ period, agents, label: period });
                                                                                            setShowCongesModal(true);
                                                                                        }}
                                                                                    >
                                                                                        <CardBody>
                                                                                            <h6 className="mb-2" style={{ color: '#212529', fontWeight: 'bold' }}>
                                                                                                {period}
                                                                                            </h6>
                                                                                            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                                                                                                {agents.length} agent{agents.length > 1 ? 's' : ''} programmé{agents.length > 1 ? 's' : ''}
                                                                                            </div>
                                                                                        </CardBody>
                                                                                    </Card>
                                                                                </Col>
                                                                            );
                                                                        })}
                                                                    </Row>
                                                                )}
                                                            </CardBody>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            );
                                        })()}
                                    </>
                                );
                            })()}

                            <Row className="agent-fade-in">
                                <Col xs="12" lg="6" className="mb-4">
                                    <Card className="h-100">
                                        <CardHeader className="d-flex justify-content-between align-items-center">
                                            <CardTitle className="h6 mb-0">
                                                <i className="fa fa-user me-2"></i>
                                                Informations de base
                                            </CardTitle>
                                            {!isEditingBase && (
                                                <Button color="primary" size="sm" onClick={startBaseEdition}>
                                                    <i className="fa fa-edit me-2"></i>
                                                    Modifier
                                                </Button>
                                            )}
                                        </CardHeader>
                                        <CardBody>
                                            {isEditingBase ? (
                                                <Form onSubmit={handleBaseSubmit}>
                                                    {baseError && (
                                                        <Alert color="danger">
                                                            {baseError}
                                                        </Alert>
                                                    )}
                                                    <FormGroup className="mb-3">
                                                        <Label className="fw-bold d-block">Photo de profil</Label>
                                                        <div className="d-flex align-items-center">
                                                            <div className="me-3">
                                                                {basePhotoPreview || profilePhotoUrl ? (
                                                                    <img
                                                                        src={basePhotoPreview || profilePhotoUrl}
                                                                        alt="Aperçu"
                                                                        className="rounded-circle"
                                                                        style={{ width: 70, height: 70, objectFit: 'cover' }}
                                                                    />
                                                                ) : (
                                                                    <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 70, height: 70 }}>
                                                                        <i className="fa fa-user"></i>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-grow-1">
                                                                <Input
                                                                    type="file"
                                                                    id="agent-photo"
                                                                    name="photoFile"
                                                                    accept="image/*"
                                                                    innerRef={basePhotoInputRef}
                                                                    onChange={handleBasePhotoChange}
                                                                />
                                                                <small className="text-muted d-block mt-1">
                                                                    Formats acceptés : JPG, PNG.
                                                                </small>
                                                            </div>
                                                        </div>
                                                    </FormGroup>
                                                    <FormGroup className="mb-3">
                                                        <Label for="agent-marital-status">Statut matrimonial</Label>
                                                        <Input
                                                            type="select"
                                                            id="agent-marital-status"
                                                            name="maritalStatusId"
                                                            value={baseForm.maritalStatusId}
                                                            onChange={handleBaseInputChange}
                                                            required
                                                        >
                                                            <option value="">-- Sélectionner --</option>
                                                            {maritalStatuses && Array.isArray(maritalStatuses) && maritalStatuses.map(status => (
                                                                status ? (
                                                                    <option key={status.id || status.value} value={String(status.id || status.value)}>
                                                                        {status.libele || status.libelle || status.name || status.label}
                                                                    </option>
                                                                ) : null
                                                            ))}
                                                        </Input>
                                                    </FormGroup>
                                                    {marriedSelected && (
                                                        <>
                                                            <FormGroup className="mb-3">
                                                                <Label for="agent-marriage-date">Date de mariage</Label>
                                                                <Input
                                                                    type="date"
                                                                    id="agent-marriage-date"
                                                                    name="marriageDate"
                                                                    value={baseForm.marriageDate}
                                                                    onChange={handleBaseInputChange}
                                                                    required={marriedSelected}
                                                                />
                                                            </FormGroup>
                                                            <FormGroup className="mb-3">
                                                                <Label className="fw-bold d-block" htmlFor="agent-marriage-certificate">
                                                                    Acte de mariage
                                                                </Label>
                                                                <Input
                                                                    type="file"
                                                                    id="agent-marriage-certificate"
                                                                    name="marriageCertificate"
                                                                    accept="application/pdf,image/*"
                                                                    onChange={handleMarriageCertificateChange}
                                                                    required={marriedSelected && !existingMarriageCertificate}
                                                                />
                                                                {existingMarriageCertificate && (
                                                                    <div className="mt-2 p-2" style={{ 
                                                                        background: '#e3f2fd', 
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #bbdefb'
                                                                    }}>
                                                                        <small className="text-info d-flex align-items-center">
                                                                            <i className="fa fa-file me-2"></i>
                                                                            <strong>Document existant:</strong> {existingMarriageCertificate.document_name}
                                                                            {existingMarriageCertificate.document_size && (
                                                                                <span className="ms-2">
                                                                                    ({Math.round(existingMarriageCertificate.document_size / 1024)} KB)
                                                                                </span>
                                                                            )}
                                                                        </small>
                                                                    </div>
                                                                )}
                                                                <small className="text-muted d-block mt-1">
                                                                    {marriageCertificateName ? `Nouveau fichier sélectionné : ${marriageCertificateName}` : (existingMarriageCertificate ? 'Vous pouvez téléverser un nouveau fichier pour remplacer l\'existant.' : 'Formats acceptés : PDF, JPG, PNG.')}
                                                                </small>
                                                            </FormGroup>
                                                            <Row className="g-3 mb-3">
                                                                <Col md="6">
                                                                    <FormGroup>
                                                                        <Label htmlFor="agent-spouse-last-name">Nom du conjoint(e)</Label>
                                                                        <Input
                                                                            type="text"
                                                                            id="agent-spouse-last-name"
                                                                            name="spouseLastName"
                                                                            value={baseForm.spouseLastName}
                                                                            onChange={handleBaseInputChange}
                                                                            placeholder="Nom de famille"
                                                                            required={marriedSelected}
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col md="6">
                                                                    <FormGroup>
                                                                        <Label htmlFor="agent-spouse-first-name">Prénoms du conjoint(e)</Label>
                                                                        <Input
                                                                            type="text"
                                                                            id="agent-spouse-first-name"
                                                                            name="spouseFirstName"
                                                                            value={baseForm.spouseFirstName}
                                                                            onChange={handleBaseInputChange}
                                                                            placeholder="Prénoms"
                                                                            required={marriedSelected}
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                            </Row>
                                                        </>
                                                    )}
                                                    <FormGroup className="mb-4">
                                                        <Label for="agent-children">Nombre d'enfants</Label>
                                                        <Input
                                                            type="number"
                                                            id="agent-children"
                                                            name="nombreEnfant"
                                                            min={(() => {
                                                                const currentCount = childrenForm.length > 0 ? childrenForm.length : parseChildrenCount(baseForm.nombreEnfant);
                                                                return currentCount >= 1 ? currentCount : 0;
                                                            })()}
                                                            value={baseForm.nombreEnfant}
                                                            onChange={handleBaseInputChange}
                                                            disabled={false}
                                                        />
                                                        {(() => {
                                                            const currentCount = childrenForm.length > 0 ? childrenForm.length : parseChildrenCount(baseForm.nombreEnfant);
                                                            return currentCount >= 1;
                                                        })() && (
                                                            <small className="text-muted d-block mt-1">
                                                                <i className="fa fa-info-circle me-1"></i>
                                                                Le nombre d'enfants ne peut pas être réduit. Vous pouvez seulement l'augmenter.
                                                            </small>
                                                        )}
                                                    </FormGroup>
                                                    {parseChildrenCount(baseForm.nombreEnfant) > 0 && (
                                                        <div className="mb-4">
                                                            <h6 className="fw-bold">Informations des enfants</h6>
                                                            {childrenForm && Array.isArray(childrenForm) && childrenForm.map((child, index) => (
                                                                child ? (
                                                                    <div key={`child-${index}`} className="border rounded p-3 mb-3 bg-light">
                                                                    <h6 className="mb-3">Enfant {index + 1}</h6>
                                                                    <Row className="g-3">
                                                                        <Col md="6">
                                                                            <FormGroup>
                                                                                <Label>Nom</Label>
                                                                                <Input
                                                                                    type="text"
                                                                                    value={child.nom}
                                                                                    onChange={(e) => handleChildFieldChange(index, 'nom', e.target.value)}
                                                                                    placeholder="Nom de l'enfant"
                                                                                />
                                                                            </FormGroup>
                                                                        </Col>
                                                                        <Col md="6">
                                                                            <FormGroup>
                                                                                <Label>Prénoms</Label>
                                                                                <Input
                                                                                    type="text"
                                                                                    value={child.prenom}
                                                                                    onChange={(e) => handleChildFieldChange(index, 'prenom', e.target.value)}
                                                                                    placeholder="Prénoms de l'enfant"
                                                                                />
                                                                            </FormGroup>
                                                                        </Col>
                                                                    </Row>
                                                                    <Row className="g-3">
                                                                        <Col md="6">
                                                                            <FormGroup>
                                                                                <Label>Sexe</Label>
                                                                                <Input
                                                                                    type="select"
                                                                                    value={child.sexe}
                                                                                    onChange={(e) => handleChildFieldChange(index, 'sexe', e.target.value)}
                                                                                >
                                                                                    <option value="">-- Sélectionner --</option>
                                                                                    <option value="M">Masculin</option>
                                                                                    <option value="F">Féminin</option>
                                                                                </Input>
                                                                            </FormGroup>
                                                                        </Col>
                                                                        <Col md="6">
                                                                            <FormGroup>
                                                                                <Label>Date de naissance</Label>
                                                                                <Input
                                                                                    type="date"
                                                                                    value={child.date_de_naissance}
                                                                                    max={new Date().toISOString().slice(0, 10)}
                                                                                    onChange={(e) => handleChildFieldChange(index, 'date_de_naissance', e.target.value)}
                                                                                />
                                                                            </FormGroup>
                                                                        </Col>
                                                                    </Row>
                                                                </div>
                                                                ) : null
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="d-flex justify-content-end">
                                                        <Button
                                                            color="secondary"
                                                            type="button"
                                                            className="me-2"
                                                            onClick={handleBaseCancel}
                                                            disabled={baseSaving}
                                                        >
                                                            Annuler
                                                        </Button>
                                                        <Button color="primary" type="submit" disabled={baseSaving}>
                                                            {baseSaving ? (
                                                                <>
                                                                    <Spinner size="sm" className="me-2" />
                                                                    Enregistrement...
                                                                </>
                                                            ) : (
                                                                'Enregistrer'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </Form>
                                            ) : (
                                                <>
                                                    {baseSuccess && (
                                                        <Alert color="success">
                                                            {baseSuccess}
                                                        </Alert>
                                                    )}
                                                    <div className="row">
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Nom complet</small>
                                                            <p className="mb-1 agent-info-value">{agentData.prenom} {agentData.nom}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Matricule</small>
                                                            <p className="mb-1 agent-info-value">{agentData.matricule}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Date de naissance</small>
                                                            <p className="mb-1 agent-info-value">{formatDate(agentData.date_de_naissance)}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Lieu de naissance</small>
                                                            <p className="mb-1 agent-info-value">{agentData.lieu_de_naissance || 'Non renseigné'}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Sexe</small>
                                                            <p className="mb-1 agent-info-value">{getSexeBadge(agentData.sexe)}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Âge</small>
                                                            <p className="mb-1 agent-info-value">{agentData.age || 'N/A'} ans</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Statut matrimonial</small>
                                                            <p className="mb-1 agent-info-value">{agentData.situation_matrimoniale_libele || 'Non renseigné'}</p>
                                                        </div>
                                                        {isStatusMarried(agentData.id_situation_matrimoniale) && (
                                                            <>
                                                                <div className="col-12 mb-2">
                                                                    <small className="text-muted agent-info-label">Nom du conjoint(e)</small>
                                                                    <p className="mb-1 agent-info-value">{agentData.nom_conjointe || 'Non renseigné'}</p>
                                                                </div>
                                                                <div className="col-12 mb-2">
                                                                    <small className="text-muted agent-info-label">Prénoms du conjoint(e)</small>
                                                                    <p className="mb-1 agent-info-value">{agentData.prenom_conjointe || 'Non renseigné'}</p>
                                                                </div>
                                                                <div className="col-12 mb-2">
                                                                    <small className="text-muted agent-info-label">Date de mariage</small>
                                                                    <p className="mb-1 agent-info-value">{formatDate(agentData.date_mariage)}</p>
                                                                </div>
                                                            </>
                                                        )}
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Nombre d'enfants</small>
                                                            <p className="mb-1 agent-info-value">{agentData.nombre_enfant ?? '0'}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col xs="12" lg="6" className="mb-4">
                                    <Card className="h-100">
                                        <CardHeader className="d-flex justify-content-between align-items-center">
                                            <CardTitle className="h6 mb-0">
                                                <i className="fa fa-envelope me-2"></i>
                                                Contact
                                            </CardTitle>
                                            {!isEditingContact && (
                                                <Button color="primary" size="sm" onClick={startContactEdition}>
                                                    <i className="fa fa-edit me-2"></i>
                                                    Modifier
                                                </Button>
                                            )}
                                        </CardHeader>
                                        <CardBody>
                                            {isEditingContact ? (
                                                <Form onSubmit={handleContactSubmit}>
                                                    {contactError && (
                                                        <Alert color="danger">
                                                            {contactError}
                                                        </Alert>
                                                    )}
                                                    <FormGroup className="mb-3">
                                                        <Label for="agent-email">Email</Label>
                                                        <Input
                                                            type="email"
                                                            id="agent-email"
                                                            name="email"
                                                            value={contactForm.email}
                                                            onChange={handleContactInputChange}
                                                            placeholder="Saisissez votre email"
                                                            required
                                                        />
                                                    </FormGroup>
                                                    <FormGroup className="mb-3">
                                                        <Label for="agent-telephone1">Téléphone 1</Label>
                                                        <Input
                                                            type="text"
                                                            id="agent-telephone1"
                                                            name="telephone1"
                                                            value={contactForm.telephone1}
                                                            onChange={handleContactInputChange}
                                                            placeholder="Saisissez votre premier numéro"
                                                        />
                                                    </FormGroup>
                                                    <FormGroup className="mb-3">
                                                        <Label for="agent-telephone2">Téléphone 2</Label>
                                                        <Input
                                                            type="text"
                                                            id="agent-telephone2"
                                                            name="telephone2"
                                                            value={contactForm.telephone2}
                                                            onChange={handleContactInputChange}
                                                            placeholder="Saisissez votre second numéro"
                                                        />
                                                    </FormGroup>
                                                    <FormGroup className="mb-4">
                                                        <Label for="agent-adresse">Adresse</Label>
                                                        <Input
                                                            type="text"
                                                            id="agent-adresse"
                                                            name="adresse"
                                                            value={contactForm.adresse}
                                                            onChange={handleContactInputChange}
                                                            placeholder="Saisissez votre adresse"
                                                        />
                                                    </FormGroup>
                                                    <div className="d-flex justify-content-end">
                                                        <Button
                                                            color="secondary"
                                                            type="button"
                                                            className="me-2"
                                                            onClick={handleContactCancel}
                                                            disabled={contactSaving}
                                                        >
                                                            Annuler
                                                        </Button>
                                                        <Button color="primary" type="submit" disabled={contactSaving}>
                                                            {contactSaving ? (
                                                                <>
                                                                    <Spinner size="sm" className="me-2" />
                                                                    Enregistrement...
                                                                </>
                                                            ) : (
                                                                'Enregistrer'
                                                            )}
                                                        </Button>
                                                    </div>
                                                </Form>
                                            ) : (
                                                <>
                                                    {contactSuccess && (
                                                        <Alert color="success">
                                                            {contactSuccess}
                                                        </Alert>
                                                    )}
                                                    <div className="row">
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted agent-info-label">Email</small>
                                                            <p className="mb-1">{agentData.email || 'Non renseigné'}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted">Téléphone 1</small>
                                                            <p className="mb-1">{agentData.telephone1 || 'Non renseigné'}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted">Téléphone 2</small>
                                                            <p className="mb-1">{agentData.telephone2 || 'Non renseigné'}</p>
                                                        </div>
                                                        <div className="col-12 mb-2">
                                                            <small className="text-muted">Adresse</small>
                                                            <p className="mb-1">{agentData.ad_pri_rue || agentData.ad_pro_rue || 'Non renseigné'}</p>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>
                        </TabPane>

                {/* Onglet 2: Informations professionnelles */}
                <TabPane tabId="2">
                    {/* Carte des congés */}
                    <Row className="mb-4">
                        <Col md="12">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        <i className="fa fa-calendar me-2"></i>
                                        Mes congés
                                    </CardTitle>
                                </CardHeader>
                                <CardBody>
                                    {loadingConges ? (
                                        <div className="text-center">
                                            <Spinner color="primary" />
                                            <p className="mt-2">Chargement des informations de congés...</p>
                                        </div>
                                    ) : agentConges ? (
                                        <>
                                            {/* Année en cours */}
                                            <h5 className="mb-3">Année en cours ({agentConges.annee})</h5>
                                            <Row className="mb-4">
                                                {(() => {
                                                    // RECALCUL FORCÉ DIRECT - Ne JAMAIS utiliser agentConges.jours_restants
                                                    const jours_alloues_CURRENT = parseInt(agentConges.jours_alloues, 10) || 30;
                                                    const jours_pris_CURRENT = parseInt(agentConges.jours_pris, 10) || 0;
                                                    const jours_restants_CURRENT = Math.max(0, jours_alloues_CURRENT - jours_pris_CURRENT);
                                                    
                                                    return (
                                                        <>
                                                            <Col md="3">
                                                                <div className="text-center p-3 bg-info text-white rounded">
                                                                    <h6 className="mb-1">Année</h6>
                                                                    <h4 className="mb-0">{agentConges.annee}</h4>
                                                                </div>
                                                            </Col>
                                                            <Col md="3">
                                                                <div className="text-center p-3 bg-success text-white rounded">
                                                                    <h6 className="mb-1">Jours alloués</h6>
                                                                    <h4 className="mb-0">{jours_alloues_CURRENT}</h4>
                                                                    {agentConges.jours_reportes > 0 && (
                                                                        <small className="d-block mt-1">
                                                                            (30 de base + {agentConges.jours_reportes} reportés)
                                                                        </small>
                                                                    )}
                                                                </div>
                                                            </Col>
                                                            <Col md="3">
                                                                <div className="text-center p-3 bg-warning text-white rounded">
                                                                    <h6 className="mb-1">Jours pris</h6>
                                                                    <h4 className="mb-0">{jours_pris_CURRENT}</h4>
                                                                </div>
                                                            </Col>
                                                            <Col md="3">
                                                                <div className="text-center p-3 bg-primary text-white rounded" style={{ border: '2px solid #007bff' }}>
                                                                    <h6 className="mb-1">Jours restants</h6>
                                                                    <h2 className="mb-0" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                                                                        {/* CALCUL DIRECT - Ne JAMAIS utiliser agentConges.jours_restants */}
                                                                        {/* Recalcul forcé directement dans le JSX */}
                                                                        {(() => {
                                                                            const alloues = parseInt(agentConges.jours_alloues, 10) || 30;
                                                                            const pris = parseInt(agentConges.jours_pris, 10) || 0;
                                                                            const restants = Math.max(0, alloues - pris);
                                                                            return restants;
                                                                        })()}
                                                                    </h2>
                                                                    <small className="d-block mt-1">jours ouvrés</small>
                                                                </div>
                                                            </Col>
                                                        </>
                                                    );
                                                })()}
                                            </Row>

                                            {/* Années précédentes */}
                                            {anneesPrecedentesNormalisees && Array.isArray(anneesPrecedentesNormalisees) && anneesPrecedentesNormalisees.length > 0 && (
                                                <>
                                                    <h5 className="mb-3 mt-4">Années précédentes</h5>
                                                    <Row>
                                                        {(() => {
                                                            // SOLUTION ULTIME: Stocker les résultats dans une variable locale pour éviter tout problème de cache
                                                            if (!anneesPrecedentesNormalisees || !Array.isArray(anneesPrecedentesNormalisees)) {
                                                                return null;
                                                            }
                                                            
                                                            const resultatsAffichage = anneesPrecedentesNormalisees
                                                                .filter(congesAnnee => congesAnnee && congesAnnee.annee) // Filtrer les éléments invalides
                                                                .map((congesAnnee, index) => {
                                                                    // RECALCUL FORCÉ - Extraire directement depuis l'objet
                                                                    const jours_alloues = parseInt(congesAnnee.jours_alloues, 10) || 30;
                                                                    const jours_pris = parseInt(congesAnnee.jours_pris, 10) || 0;
                                                                    const jours_restants = Math.max(0, jours_alloues - jours_pris);
                                                                    
                                                                    // Logs de débogage supprimés pour éviter la pollution de la console
                                                                    
                                                                    return { congesAnnee, index, jours_alloues, jours_pris, jours_restants };
                                                                })
                                                                .filter(result => result && result.congesAnnee); // Filtrer les résultats invalides
                                                            
                                                            if (!resultatsAffichage || resultatsAffichage.length === 0) {
                                                                return null;
                                                            }
                                                            
                                                            // Retourner le JSX avec les valeurs calculées
                                                            return resultatsAffichage
                                                                .filter(({ congesAnnee }) => congesAnnee && congesAnnee.annee) // Filtrer les éléments invalides avant le map
                                                                .map(({ congesAnnee, index, jours_alloues, jours_pris, jours_restants }) => (
                                                                    <Col md="6" key={congesAnnee.annee} className="mb-3">
                                                                        <Card className="h-100">
                                                                            <CardHeader style={{ backgroundColor: index === 0 ? '#ffc107' : '#17a2b8', color: 'white' }}>
                                                                                <CardTitle className="mb-0 text-center">
                                                                                    Année {congesAnnee.annee}
                                                                                </CardTitle>
                                                                            </CardHeader>
                                                                            <CardBody>
                                                                                <Row>
                                                                                    <Col xs="4" className="text-center">
                                                                                        <div>
                                                                                            <small className="text-muted d-block">Alloués</small>
                                                                                            <strong className="text-success">{jours_alloues}</strong>
                                                                                        </div>
                                                                                    </Col>
                                                                                    <Col xs="4" className="text-center">
                                                                                        <div>
                                                                                            <small className="text-muted d-block">Pris</small>
                                                                                            <strong className="text-warning">{jours_pris}</strong>
                                                                                        </div>
                                                                                    </Col>
                                                                                    <Col xs="4" className="text-center">
                                                                                        <div>
                                                                                            <small className="text-muted d-block">Restants</small>
                                                                                            <strong className="text-primary" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                                                                {/* VALEUR CALCULÉE DIRECTEMENT - Ne JAMAIS utiliser congesAnnee.jours_restants */}
                                                                                                {jours_restants}
                                                                                            </strong>
                                                                                        </div>
                                                                                    </Col>
                                                                                </Row>
                                                                            </CardBody>
                                                                        </Card>
                                                                    </Col>
                                                                ));
                                                        })()}
                                                    </Row>
                                                </>
                                            )}

                                            {/* ANNÉES PRÉCÉDENTES - ANCIEN CODE SUPPRIMÉ */}
                                            {false && anneesPrecedentesNormalisees.length > 0 && (
                                                <>
                                                    <h5 className="mb-3 mt-4">Années précédentes (ANCIEN CODE - NE DOIT PAS S'AFFICHER)</h5>
                                                    <Row>
                                                        {anneesPrecedentesNormalisees.map((congesAnnee, index) => {
                                                            return (
                                                                <Col md="6" key={congesAnnee.annee} className="mb-3">
                                                                    <Card className="h-100">
                                                                        <CardHeader style={{ backgroundColor: index === 0 ? '#ffc107' : '#17a2b8', color: 'white' }}>
                                                                            <CardTitle className="mb-0 text-center">
                                                                                Année {congesAnnee.annee}
                                                                            </CardTitle>
                                                                        </CardHeader>
                                                                        <CardBody>
                                                                            <Row>
                                                                                <Col xs="4" className="text-center">
                                                                                    <div>
                                                                                        <small className="text-muted d-block">Alloués</small>
                                                                                        <strong className="text-success">{parseInt(congesAnnee.jours_alloues, 10) || 30}</strong>
                                                                                    </div>
                                                                                </Col>
                                                                                <Col xs="4" className="text-center">
                                                                                    <div>
                                                                                        <small className="text-muted d-block">Pris</small>
                                                                                        <strong className="text-warning">{parseInt(congesAnnee.jours_pris, 10) || 0}</strong>
                                                                                    </div>
                                                                                </Col>
                                                                                <Col xs="4" className="text-center">
                                                                                    <div>
                                                                                        <small className="text-muted d-block">Restants</small>
                                                                                        <strong className="text-primary" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                                                                            {/* CALCUL DIRECT - Ne JAMAIS utiliser congesAnnee.jours_restants */}
                                                                                            {/* Forcer le recalcul directement dans le JSX */}
                                                                                            {(() => {
                                                                                                // RECALCUL FORCÉ DIRECT dans le JSX
                                                                                                const alloues = parseInt(congesAnnee.jours_alloues, 10) || 30;
                                                                                                const pris = parseInt(congesAnnee.jours_pris, 10) || 0;
                                                                                                const restants = Math.max(0, alloues - pris);
                                                                                                
                                                                                                // Log pour 2023 - FORCE L'ALERTE
                                                                                                if (congesAnnee.annee === 2023 || parseInt(congesAnnee.annee, 10) === 2023) {
                                                                                                    console.error('🎯🎯🎯 CALCUL DIRECT DANS JSX 2023:', {
                                                                                                        annee: congesAnnee.annee,
                                                                                                        alloues: alloues,
                                                                                                        pris: pris,
                                                                                                        restants_calcule: restants,
                                                                                                        affiche: restants
                                                                                                    });
                                                                                                    // ALERTE visible pour confirmer que le nouveau code est chargé
                                                                                                    if (window.location.href.includes('dashboard')) {
                                                                                                        console.error('⚠️⚠️⚠️ VALEUR CALCULÉE POUR 2023:', restants, '⚠️⚠️⚠️');
                                                                                                    }
                                                                                                }
                                                                                                
                                                                                                // ALERTE VISIBLE pour 2023 si la valeur est incorrecte
                                                                                                if ((congesAnnee.annee === 2023 || parseInt(congesAnnee.annee, 10) === 2023) && restants !== 0) {
                                                                                                    console.error('❌❌❌ PROBLÈME DÉTECTÉ - 2023 devrait afficher 0 mais affiche:', restants);
                                                                                                    console.error('❌ Données reçues:', congesAnnee);
                                                                                                }
                                                                                                
                                                                                                return restants;
                                                                                            })()}
                                                                                        </strong>
                                                                                    </div>
                                                                                </Col>
                                                                            </Row>
                                                                        </CardBody>
                                                                    </Card>
                                                                </Col>
                                                            );
                                                        })}
                                                    </Row>
                                                </>
                                            )}

                                            <Alert color="info" className="mt-3 mb-0">
                                                <i className="fa fa-info-circle me-2"></i>
                                                <strong>Règles importantes :</strong> Un congé ne peut <strong>pas commencer</strong> un jour férié ou un weekend, et ne peut <strong>pas se terminer</strong> un jour férié ou un weekend.
                                                <br />
                                                <strong>Pour les demandes de cessation de service :</strong> Les jours sont déduits d'abord de la deuxième année précédente, puis de la première année précédente si nécessaire. Si les deux années précédentes sont épuisées, vous ne pouvez faire que des demandes exceptionnelles qui déduiront de l'année en cours.
                                            </Alert>
                                        </>
                                    ) : (
                                        <Alert color="info" className="mb-0">
                                            Aucune information de congés disponible pour l'année en cours.
                                        </Alert>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <Row>
                        <Col md="6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Poste et fonction</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <Table borderless>
                                        <tbody>
                                            <tr>
                                                <td><strong>Statut d'emploi:</strong></td>
                                                <td>{getStatutBadge(agentData.statut_emploi)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Date de première prise de service:</strong></td>
                                                <td>{formatDate(agentData.date_embauche)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Type d'agent:</strong></td>
                                                <td>{agentData.type_agent_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Fonction:</strong></td>
                                                <td>{agentData.fonction_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Emploi:</strong></td>
                                                <td>{agentData.emploi_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Position:</strong></td>
                                                <td>{agentData.position_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Année de départ à la retraite:</strong></td>
                                                <td>{retirementYear ? retirementYear : 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Agent prévu pour la retraite:</strong></td>
                                                <td>{retirementPlanningLabel}</td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col md="6">
                            <Card>
                                <CardHeader className="d-flex justify-content-between align-items-center">
                                    <CardTitle>Organisation</CardTitle>
                                    {!isEditingOrganization && (
                                        <Button
                                            color="primary"
                                            size="sm"
                                            onClick={() => setIsEditingOrganization(true)}
                                        >
                                            <i className="fa fa-edit me-1"></i>
                                            Modifier
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardBody>
                                    {isEditingOrganization ? (
                                        <Form onSubmit={handleOrganizationSubmit}>
                                            {organizationError && (
                                                <Alert color="danger" className="mb-3">
                                                    {organizationError}
                                                </Alert>
                                            )}
                                            {organizationSuccess && (
                                                <Alert color="success" className="mb-3">
                                                    {organizationSuccess}
                                                </Alert>
                                            )}
                                            <FormGroup className="mb-3">
                                                <Label for="id_direction">Direction</Label>
                                                <Input
                                                    type="select"
                                                    name="id_direction"
                                                    id="id_direction"
                                                    value={organizationForm.id_direction || agentData?.id_direction || ''}
                                                    onChange={handleOrganizationInputChange}
                                                    disabled={true}
                                                    readOnly={true}
                                                    style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                                                    title="La direction ne peut pas être modifiée par l'agent"
                                                >
                                                    <option value="">Sélectionner une direction</option>
                                                    {directions && Array.isArray(directions) && directions.map((direction) => (
                                                        direction ? (
                                                            <option key={direction.id} value={direction.id}>
                                                                {direction.libelle || direction.nom || direction.libele}
                                                            </option>
                                                        ) : null
                                                    ))}
                                                </Input>
                                                <small className="text-muted d-block mt-1">
                                                    <i className="fa fa-info-circle me-1"></i>
                                                    La direction ne peut pas être modifiée. Contactez l'administration pour toute modification.
                                                </small>
                                            </FormGroup>
                                            <FormGroup className="mb-3">
                                                <Label for="id_sous_direction">Sous-direction</Label>
                                                <Input
                                                    type="select"
                                                    name="id_sous_direction"
                                                    id="id_sous_direction"
                                                    value={organizationForm.id_sous_direction}
                                                    onChange={handleOrganizationInputChange}
                                                    disabled={!agentData?.id_direction}
                                                >
                                                    <option value="">Sélectionner une sous-direction (optionnel)</option>
                                                    {sousDirections && Array.isArray(sousDirections) && sousDirections.map((sousDirection) => (
                                                        sousDirection ? (
                                                            <option key={sousDirection.id} value={sousDirection.id}>
                                                                {sousDirection.libelle || sousDirection.nom || sousDirection.libele}
                                                            </option>
                                                        ) : null
                                                    ))}
                                                </Input>
                                                <small className="text-muted d-block mt-1">
                                                    <i className="fa fa-info-circle me-1"></i>
                                                    La sous-direction est optionnelle. Si vous n'en sélectionnez pas, vous pouvez choisir un service directement lié à votre direction.
                                                </small>
                                            </FormGroup>
                                            <FormGroup className="mb-3">
                                                <Label for="id_service">Service</Label>
                                                <Input
                                                    type="select"
                                                    name="id_service"
                                                    id="id_service"
                                                    value={organizationForm.id_service}
                                                    onChange={handleOrganizationInputChange}
                                                    disabled={!agentData?.id_direction}
                                                >
                                                    <option value="">Sélectionner un service</option>
                                                    {services && Array.isArray(services) && services.map((service) => (
                                                        service ? (
                                                            <option key={service.id} value={service.id}>
                                                                {service.libelle || service.nom || service.libele}
                                                            </option>
                                                        ) : null
                                                    ))}
                                                </Input>
                                                <small className="text-muted d-block mt-1">
                                                    <i className="fa fa-info-circle me-1"></i>
                                                    {organizationForm.id_sous_direction 
                                                        ? 'Services liés à la sous-direction sélectionnée.'
                                                        : 'Services directement liés à votre direction (sans sous-direction).'}
                                                </small>
                                            </FormGroup>
                                            <div className="d-flex justify-content-end">
                                                <Button
                                                    color="secondary"
                                                    type="button"
                                                    className="me-2"
                                                    onClick={handleOrganizationCancel}
                                                    disabled={organizationSaving}
                                                >
                                                    Annuler
                                                </Button>
                                                <Button color="primary" type="submit" disabled={organizationSaving}>
                                                    {organizationSaving ? (
                                                        <>
                                                            <Spinner size="sm" className="me-2" />
                                                            Enregistrement...
                                                        </>
                                                    ) : (
                                                        'Enregistrer'
                                                    )}
                                                </Button>
                                            </div>
                                        </Form>
                                    ) : (
                                        <>
                                            <Table borderless>
                                                <tbody>
                                                    <tr>
                                                        <td><strong>Ministère:</strong></td>
                                                        <td>{agentData.ministere_nom || 'Non renseigné'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Direction:</strong></td>
                                                        <td>{agentData.direction_libelle || agentData.direction || 'Non renseigné'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Sous-direction:</strong></td>
                                                        <td>{agentData.sous_direction_libelle || 'Non renseigné'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td><strong>Service:</strong></td>
                                                        <td>{agentData.service_libelle || 'Non renseigné'}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Col md="6" className="mb-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historique des fonctions</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    {functionHistory.length === 0 ? (
                                        <Alert color="light" className="mb-0">
                                            Aucune fonction antérieure enregistrée.
                                        </Alert>
                                    ) : (
                                        functionHistory && Array.isArray(functionHistory) && functionHistory.map((fonction, index) => {
                                            if (!fonction) return null;
                                            const isCurrent = index === 0 && (!fonction.date_sortie && !fonction.date_fin && !fonction.fin);
                                            return (
                                                <div key={fonction.id || index} className={index !== functionHistory.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}>
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <h6 className="mb-1">
                                                            {fonction.designation || fonction.fonction_nom || 'Fonction'}
                                                        </h6>
                                                        {isCurrent && (
                                                            <Badge color="success" pill className="ms-2">
                                                                Actuelle
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-muted small">
                                                        <div>Fonction : {fonction.fonction_nom || 'Non renseigné'}</div>
                                                        <div>Depuis : {formatDate(fonction.date_entree || fonction.date_debut)}</div>
                                                        {(fonction.date_sortie || fonction.date_fin) && (
                                                            <div>Jusqu'au : {formatDate(fonction.date_sortie || fonction.date_fin)}</div>
                                                        )}
                                                        {fonction.acte_nomination && (
                                                            <div>Acte de nomination : {fonction.acte_nomination}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                        <Col md="6" className="mb-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historique des emplois</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    {employmentHistory.length === 0 ? (
                                        <Alert color="light" className="mb-0">
                                            Aucun emploi antérieur enregistré.
                                        </Alert>
                                    ) : (
                                        employmentHistory && Array.isArray(employmentHistory) && employmentHistory.map((emploi, index) => {
                                            if (!emploi) return null;
                                            const isCurrent = index === 0 && (!emploi.date_fin_emploi && !emploi.date_fin);
                                            return (
                                                <div key={emploi.id || index} className={index !== employmentHistory.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}>
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <h6 className="mb-1">
                                                            {emploi.emploi_nom || emploi.libele || 'Emploi'}
                                                        </h6>
                                                        {isCurrent && (
                                                            <Badge color="success" pill className="ms-2">
                                                                Actuel
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-muted small">
                                                        <div>Nature : {emploi.nature_emploi || emploi.nature || 'Non renseigné'}</div>
                                                        <div>Depuis : {formatDate(emploi.date_nomination_emploi || emploi.date_debut)}</div>
                                                        {(emploi.date_fin_emploi || emploi.date_fin) && (
                                                            <div>Jusqu'au : {formatDate(emploi.date_fin_emploi || emploi.date_fin)}</div>
                                                        )}
                                                        {emploi.numero_acte_nomination && (
                                                            <div>Acte de nomination : {emploi.numero_acte_nomination}</div>
                                                        )}
                                                        {emploi.date_premiere_prise_service && (
                                                            <div>Première prise de service : {formatDate(emploi.date_premiere_prise_service)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                    <Row className="mt-4">
                        <Col md="12">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Séminaires et formations</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    {loadingSeminaires ? (
                                        <div className="text-center">
                                            <Spinner color="primary" />
                                            <p className="mt-2">Chargement des séminaires...</p>
                                        </div>
                                    ) : agentSeminaires.length === 0 ? (
                                        <Alert color="light" className="mb-0">
                                            Aucun séminaire ou formation enregistré.
                                        </Alert>
                                    ) : (
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Thème du séminaire</th>
                                                    <th>Date de début</th>
                                                    <th>Date de fin</th>
                                                    <th>Lieu</th>
                                                    <th>Organisation</th>
                                                    <th>Statut de participation</th>
                                                    <th>Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {agentSeminaires && Array.isArray(agentSeminaires) && agentSeminaires.map((seminaire) => (
                                                    seminaire ? (
                                                    <tr key={seminaire.participation_id || seminaire.id}>
                                                        <td>
                                                            <strong>{seminaire.theme_seminaire}</strong>
                                                        </td>
                                                        <td>{formatDate(seminaire.date_debut)}</td>
                                                        <td>{formatDate(seminaire.date_fin)}</td>
                                                        <td>{seminaire.lieu || 'Non renseigné'}</td>
                                                        <td>
                                                            {seminaire.organisme_nom || seminaire.ministere_nom || 'Non renseigné'}
                                                        </td>
                                                        <td>
                                                            <Badge
                                                                color={
                                                                    seminaire.statut_participation === 'present'
                                                                        ? 'success'
                                                                        : seminaire.statut_participation === 'absent'
                                                                        ? 'danger'
                                                                        : seminaire.statut_participation === 'excuse'
                                                                        ? 'warning'
                                                                        : 'info'
                                                                }
                                                            >
                                                                {seminaire.statut_participation === 'inscrit'
                                                                    ? 'Inscrit'
                                                                    : seminaire.statut_participation === 'present'
                                                                    ? 'Présent'
                                                                    : seminaire.statut_participation === 'absent'
                                                                    ? 'Absent'
                                                                    : seminaire.statut_participation === 'excuse'
                                                                    ? 'Excusé'
                                                                    : seminaire.statut_participation}
                                                            </Badge>
                                                        </td>
                                                        <td>{seminaire.notes || '-'}</td>
                                                    </tr>
                                                    ) : null
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>

                {/* Onglet 3: Informations familiales */}
                <TabPane tabId="3">
                    <Row>
                        <Col md="6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Situation familiale</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <Table borderless>
                                        <tbody>
                                            <tr>
                                                <td><strong>Situation matrimoniale:</strong></td>
                                                <td>{agentData.situation_matrimoniale_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Nom du conjoint(e):</strong></td>
                                                <td>{agentData.nom_conjointe || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Prénoms du conjoint(e):</strong></td>
                                                <td>{agentData.prenom_conjointe || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Date de mariage:</strong></td>
                                                <td>{formatDate(agentData.date_mariage)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Nombre d'enfants:</strong></td>
                                                <td>{agentData.nombre_enfant || 0}</td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col md="6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informations administratives</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <Table borderless>
                                        <tbody>
                                            <tr>
                                                <td><strong>Civilité:</strong></td>
                                                <td>{agentData.civilite_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Nationalité:</strong></td>
                                                <td>{agentData.nationalite_libele || 'Non renseigné'}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Date de création:</strong></td>
                                                <td>{formatDate(agentData.created_at)}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Dernière mise à jour:</strong></td>
                                                <td>{formatDate(agentData.updated_at)}</td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>

                {/* Onglet 4: Enfants */}
                <TabPane tabId="4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Enfants</CardTitle>
                        </CardHeader>
                        <CardBody>
                            {(() => {
                                const enfants = agentData.enfants || [];
                                console.log('🔍 Affichage onglet Enfants - Nombre d\'enfants:', enfants.length, 'Enfants:', enfants);
                                return enfants.length > 0 ? (
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>Nom complet</th>
                                                <th>Date de naissance</th>
                                                <th>Sexe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {enfants && Array.isArray(enfants) && enfants.map((enfant, index) => (
                                                enfant ? (
                                                    <tr key={index}>
                                                        <td>{enfant.prenom} {enfant.nom}</td>
                                                        <td>{formatDate(enfant.date_de_naissance)}</td>
                                                        <td>{getSexeBadge(enfant.sexe)}</td>
                                                    </tr>
                                                ) : null
                                            ))}
                                        </tbody>
                                    </Table>
                                ) : (
                                    <Alert color="info">
                                        <i className="fa fa-info-circle mr-2"></i>
                                        Aucun enfant enregistré.
                                    </Alert>
                                );
                            })()}
                        </CardBody>
                    </Card>
                </TabPane>
                <TabPane tabId="5">
                    {canCreateDemandes() ? (
                        <div>
                            {/* Suivi des demandes avec phases aller/retour */}
                            <Card className="mb-4">
                                <CardHeader>
                                    <CardTitle>
                                        <i className="fa fa-tasks me-2"></i>
                                        Suivi des Demandes
                                    </CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <DemandeSuivi 
                                        key={`demande-suivi-${refreshKey}`}
                                        agentId={user?.id_agent}
                                        onDemandeClick={handleDemandeClick}
                                    />
                                </CardBody>
                            </Card>

                            {/* Mes demandes personnelles */}
                            <Card className="mb-4">
                                <CardHeader>
                                    <CardTitle>
                                        <i className="fa fa-user me-2"></i>
                                        Mes Demandes
                                    </CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <DemandesList 
                                        key={`demandes-list-${refreshKey}`}
                                        agentId={user?.id_agent}
                                        onDemandeClick={handleDemandeClick}
                                    />
                                </CardBody>
                            </Card>

                            {/* Duplicate removed */}
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <Alert color="warning">
                                <h5>Accès restreint</h5>
                                <p>Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
                            </Alert>
                        </div>
                    )}
                </TabPane>
                <TabPane tabId="6">
                    <div className="container-fluid">
                        <Row>
                            <Col xs="12">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            <i className="fa fa-inbox me-2"></i>
                                            Boîte de réception
                                        </CardTitle>
                                    </CardHeader>
                                    <CardBody>
                                        <NotificationsPanel 
                                            agentId={user?.id_agent}
                                            onNotificationClick={handleNotificationClick}
                                            selectedNotificationId={selectedNotificationId}
                                        />
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                </TabPane>
                <TabPane tabId="8">
                    <div className="container-fluid">
                        <Row>
                            <Col xs="12">
                                <HistoriqueDemandes agentId={user?.id_agent} />
                            </Col>
                        </Row>
                    </div>
                </TabPane>
                <TabPane tabId="7">
                    <DocumentsGenerated typeDemande="absence" />
                </TabPane>
                <TabPane tabId="9">
                    <Card>
                        <CardHeader>
                            <CardTitle className="h6">
                                <i className="fa fa-sticky-note me-2"></i>
                                Note de service
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="text-center py-5">
                                <i className="fa fa-sticky-note fa-3x text-muted mb-3"></i>
                                <h5 className="text-muted">Note de service</h5>
                                <p className="text-muted mb-4">
                                    Rédigez et soumettez des notes de service pour vos rapports.
                                </p>
                                <Button color="primary" size="lg">
                                    <i className="fa fa-plus me-2"></i>
                                    Nouvelle note de service
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </TabPane>
                <TabPane tabId="10">
                    <Card>
                        <CardHeader>
                            <CardTitle className="h6">
                                <i className="fa fa-file-contract me-2"></i>
                                Certificat de cessation de service
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="text-center py-5">
                                <i className="fa fa-file-contract fa-3x text-muted mb-3"></i>
                                <h5 className="text-muted">Certificat de cessation de service</h5>
                                <p className="text-muted mb-4">
                                    Demandez un certificat de cessation de service pour vos démarches.
                                </p>
                                <Button color="primary" size="lg">
                                    <i className="fa fa-plus me-2"></i>
                                    Nouveau certificat
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </TabPane>
                <TabPane tabId="12">
                    {canValidateDemandes() ? (
                        <div>
                            <h3 className="mb-4">
                                <i className="fa fa-users me-2"></i>
                                {getDemandesServiceLabel()}
                            </h3>
                            <DemandesDRHList 
                                key={refreshKey}
                                typeDemande=""
                                onDemandeClick={handleDemandeClick}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <Alert color="warning">
                                <h5>Accès restreint</h5>
                                <p>Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
                            </Alert>
                        </div>
                    )}
                </TabPane>
                <TabPane tabId="11">
                    <Row className="justify-content-center">
                        <Col xs="12" md="8" lg="6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="h6">
                                        <i className="fa fa-cog me-2"></i>
                                        Paramètres du compte
                                    </CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <h6 className="mb-3">Modifier mon mot de passe</h6>
                                    {passwordError && (
                                        <Alert color="danger">
                                            {passwordError}
                                        </Alert>
                                    )}
                                    {passwordSuccess && (
                                        <Alert color="success">
                                            {passwordSuccess}
                                        </Alert>
                                    )}
                                    <Form onSubmit={handlePasswordSubmit}>
                                        <FormGroup>
                                            <Label for="agent-current-password">Mot de passe actuel</Label>
                                            <Input
                                                type="password"
                                                id="agent-current-password"
                                                name="currentPassword"
                                                value={passwordForm.currentPassword}
                                                onChange={handlePasswordInputChange}
                                                placeholder="Saisissez votre mot de passe actuel"
                                                required
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label for="agent-new-password">Nouveau mot de passe</Label>
                                            <Input
                                                type="password"
                                                id="agent-new-password"
                                                name="newPassword"
                                                value={passwordForm.newPassword}
                                                onChange={handlePasswordInputChange}
                                                placeholder="Définissez un nouveau mot de passe"
                                                required
                                                minLength={8}
                                            />
                                            <small className="text-muted d-block mt-1">
                                                <i className="fa fa-info-circle me-1"></i>
                                                Le mot de passe doit contenir au moins 8 caractères.
                                            </small>
                                        </FormGroup>
                                        <FormGroup>
                                            <Label for="agent-confirm-password">Confirmer le nouveau mot de passe</Label>
                                            <Input
                                                type="password"
                                                id="agent-confirm-password"
                                                name="confirmPassword"
                                                value={passwordForm.confirmPassword}
                                                onChange={handlePasswordInputChange}
                                                placeholder="Confirmez votre nouveau mot de passe"
                                                required
                                            />
                                        </FormGroup>
                                        <Button color="primary" type="submit" disabled={isChangingPassword}>
                                            {isChangingPassword ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Mise à jour...
                                                </>
                                            ) : (
                                                'Mettre à jour mon mot de passe'
                                            )}
                                        </Button>
                                    </Form>

                                    {/* Section Empreinte digitale */}
                                    <hr className="my-4" />
                                    <h6 className="mb-3">
                                        <MdFingerprint className="me-2" />
                                        Authentification par empreinte digitale
                                    </h6>
                                    
                                    {!isWebAuthnAvailable && (
                                        <Alert color="warning" className="d-flex align-items-center">
                                            <MdError className="me-2" />
                                            L'authentification par empreinte digitale n'est pas supportée sur cet appareil ou navigateur.
                                        </Alert>
                                    )}

                                    {isWebAuthnAvailable && (
                                        <>
                                            <Alert color="info" className="mb-4">
                                                <MdInfo className="me-2" />
                                                <strong>Deux moyens de connexion disponibles :</strong> Vous pouvez vous connecter avec votre mot de passe ou avec votre empreinte digitale. 
                                                Enregistrez votre empreinte digitale ci-dessous pour activer cette fonctionnalité.
                                            </Alert>

                                            {fingerprintError && (
                                                <Alert color="danger" className="d-flex align-items-center mb-3">
                                                    <MdError className="me-2" />
                                                    {fingerprintError}
                                                </Alert>
                                            )}
                                            {fingerprintSuccess && (
                                                <Alert color="success" className="d-flex align-items-center mb-3">
                                                    <MdCheckCircle className="me-2" />
                                                    {fingerprintSuccess}
                                                </Alert>
                                            )}

                                            <FormGroup>
                                                <Label for="deviceName">Nom de l'appareil (optionnel)</Label>
                                                <Input
                                                    type="text"
                                                    id="deviceName"
                                                    value={deviceName}
                                                    onChange={(e) => setDeviceName(e.target.value)}
                                                    placeholder="Ex: Ordinateur portable, Smartphone, Tablette..."
                                                />
                                                <small className="text-muted">
                                                    Donnez un nom à cet appareil pour le reconnaître facilement dans la liste
                                                </small>
                                            </FormGroup>

                                            <Button 
                                                color="primary" 
                                                onClick={handleOpenFingerprintModal}
                                                className="mb-4"
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <MdFingerprint style={{ fontSize: '1.2rem' }} />
                                                Enregistrer mon empreinte digitale
                                            </Button>

                                            <FingerprintRegistrationModal
                                                isOpen={showFingerprintModal}
                                                toggle={() => setShowFingerprintModal(false)}
                                                username={user?.username}
                                                deviceName={deviceName.trim() || `${navigator.userAgentData?.platform || 'Appareil'} - ${new Date().toLocaleDateString()}`}
                                                onSuccess={handleFingerprintSuccess}
                                            />

                                            {credentials.length > 0 && (
                                                <div className="mt-4">
                                                    <h6 className="mb-3">Empreintes digitales enregistrées</h6>
                                                    <ListGroup>
                                                        {credentials.map((cred) => (
                                                            <ListGroupItem 
                                                                key={cred.id} 
                                                                className="d-flex justify-content-between align-items-center"
                                                            >
                                                                <div>
                                                                    <div className="fw-bold">
                                                                        <MdFingerprint className="me-2" />
                                                                        {cred.device_name || 'Appareil inconnu'}
                                                                    </div>
                                                                    <small className="text-muted">
                                                                        Enregistrée le {new Date(cred.created_at).toLocaleDateString('fr-FR', {
                                                                            year: 'numeric',
                                                                            month: 'long',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                        {cred.last_used_at && (
                                                                            <> • Dernière utilisation: {new Date(cred.last_used_at).toLocaleDateString('fr-FR', {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}</>
                                                                        )}
                                                                    </small>
                                                                </div>
                                                                <Button
                                                                    color="danger"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteCredential(cred.id)}
                                                                    title="Supprimer cette empreinte digitale"
                                                                >
                                                                    <MdDelete />
                                                                </Button>
                                                            </ListGroupItem>
                                                        ))}
                                                    </ListGroup>
                                                </div>
                                            )}

                                            {credentials.length === 0 && (
                                                <Alert color="info" className="mt-3">
                                                    <MdInfo className="me-2" />
                                                    Aucune empreinte digitale enregistrée. Cliquez sur le bouton ci-dessus pour enregistrer votre empreinte digitale 
                                                    et activer la connexion par empreinte.
                                                </Alert>
                                            )}
                                        </>
                                    )}
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </TabPane>
                
                {/* Onglet 13: Diplômes */}
                <TabPane tabId="13">
                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <CardTitle>
                                <MdSchool className="me-2" />
                                Mes Diplômes
                            </CardTitle>
                            {!isEditingDiplomes && (
                                <Button color="primary" size="sm" onClick={startDiplomesEdition}>
                                    <i className="fa fa-edit me-2"></i>
                                    {agentData?.diplomes && agentData.diplomes.length > 0 ? 'Modifier' : 'Ajouter'}
                                </Button>
                            )}
                        </CardHeader>
                        <CardBody>
                            {isEditingDiplomes ? (
                                <Form onSubmit={handleDiplomesSubmit}>
                                    {diplomesError && (
                                        <Alert color="danger">
                                            {diplomesError}
                                        </Alert>
                                    )}
                                    {diplomesSuccess && (
                                        <Alert color="success">
                                            {diplomesSuccess}
                                        </Alert>
                                    )}
                                    
                                    <FormGroup className="mb-4">
                                        <Label for="nombre-diplomes">Nombre de diplômes</Label>
                                        <Input
                                            type="number"
                                            id="nombre-diplomes"
                                            min="0"
                                            max="20"
                                            value={nombreDiplomes}
                                            onChange={handleNombreDiplomesChange}
                                        />
                                        <small className="text-muted d-block mt-1">
                                            Indiquez le nombre de diplômes que vous souhaitez enregistrer.
                                        </small>
                                    </FormGroup>

                                    {nombreDiplomes > 0 && (
                                        <div className="mb-4">
                                            <h6 className="fw-bold mb-3">Informations des diplômes</h6>
                                            {diplomesForm.slice(0, nombreDiplomes).map((diplome, index) => (
                                                <Card key={`diplome-${index}`} className="mb-3 border">
                                                    <CardHeader style={{ backgroundColor: '#f8f9fa' }}>
                                                        <h6 className="mb-0">DIPLÔME {index + 1}</h6>
                                                    </CardHeader>
                                                    <CardBody>
                                                        <Row>
                                                            <Col md="6" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>
                                                                        Nom du diplôme <span className="text-danger">*</span>
                                                                    </Label>
                                                                    <Input
                                                                        type="select"
                                                                        value={diplome.diplome}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            handleDiplomeFieldChange(index, 'diplome', value);
                                                                        }}
                                                                        required
                                                                    >
                                                                        <option value="">Sélectionner un diplôme</option>
                                                                        {diplomesOptions.map((option) => (
                                                                            <option key={option.id} value={option.libele || option.nom || option.diplome || ''}>
                                                                                {option.libele || option.nom || option.diplome || ''}
                                                                            </option>
                                                                        ))}
                                                                        <option value="Autre">Autre</option>
                                                                    </Input>
                                                                    {diplome.diplome === 'Autre' && (
                                                                        <Input
                                                                            type="text"
                                                                            className="mt-2"
                                                                            placeholder="Précisez le nom du diplôme"
                                                                            value={diplome.diplome_autre || ''}
                                                                            onChange={(e) => handleDiplomeFieldChange(index, 'diplome_autre', e.target.value)}
                                                                            required
                                                                        />
                                                                    )}
                                                                </FormGroup>
                                                            </Col>
                                                            <Col md="6" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>Options du diplôme</Label>
                                                                    <Input
                                                                        type="text"
                                                                        value={diplome.options}
                                                                        onChange={(e) => handleDiplomeFieldChange(index, 'options', e.target.value)}
                                                                        placeholder="Options du diplôme"
                                                                    />
                                                                </FormGroup>
                                                            </Col>
                                                        </Row>
                                                        <Row>
                                                            <Col md="6" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>Date d'obtention</Label>
                                                                    <Input
                                                                        type="date"
                                                                        value={diplome.date_diplome}
                                                                        onChange={(e) => handleDiplomeFieldChange(index, 'date_diplome', e.target.value)}
                                                                    />
                                                                </FormGroup>
                                                            </Col>
                                                            <Col md="6" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>
                                                                        École/Université <span className="text-danger">*</span>
                                                                    </Label>
                                                                    <Input
                                                                        type="text"
                                                                        value={diplome.ecole}
                                                                        onChange={(e) => handleDiplomeFieldChange(index, 'ecole', e.target.value)}
                                                                        placeholder="Nom de l'établissement"
                                                                        required
                                                                    />
                                                                </FormGroup>
                                                            </Col>
                                                        </Row>
                                                        <Row>
                                                            <Col md="4" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>
                                                                        Ville <span className="text-danger">*</span>
                                                                    </Label>
                                                                    <Input
                                                                        type="text"
                                                                        value={diplome.ville}
                                                                        onChange={(e) => handleDiplomeFieldChange(index, 'ville', e.target.value)}
                                                                        placeholder="Ville de l'établissement"
                                                                        required
                                                                    />
                                                                </FormGroup>
                                                            </Col>
                                                            <Col md="4" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>
                                                                        Pays <span className="text-danger">*</span>
                                                                    </Label>
                                                                    <Input
                                                                        type="text"
                                                                        value={diplome.pays}
                                                                        onChange={(e) => handleDiplomeFieldChange(index, 'pays', e.target.value)}
                                                                        placeholder="Pays de l'établissement"
                                                                        required
                                                                    />
                                                                </FormGroup>
                                                            </Col>
                                                            <Col md="4" className="mb-3">
                                                                <FormGroup>
                                                                    <Label>Document du diplôme</Label>
                                                                    <Input
                                                                        type="file"
                                                                        accept="application/pdf,image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                                                            handleDiplomeFieldChange(index, 'document', file);
                                                                        }}
                                                                    />
                                                                    {diplome.existingDocument && (
                                                                        <div className="mt-2 p-2" style={{ 
                                                                            background: '#e3f2fd', 
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #bbdefb'
                                                                        }}>
                                                                            <small className="text-info d-flex align-items-center">
                                                                                <i className="fa fa-file me-2"></i>
                                                                                <strong>Document existant:</strong> {diplome.existingDocument.document_name}
                                                                                {diplome.existingDocument.document_size && (
                                                                                    <span className="ms-2">
                                                                                        ({Math.round(diplome.existingDocument.document_size / 1024)} KB)
                                                                                    </span>
                                                                                )}
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                    <small className="text-muted d-block mt-1">
                                                                        Formats acceptés : PDF, JPG, PNG. Vous pouvez téléverser un nouveau fichier pour remplacer l'existant.
                                                                    </small>
                                                                </FormGroup>
                                                            </Col>
                                                        </Row>
                                                    </CardBody>
                                                </Card>
                                            ))}
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-end">
                                        <Button
                                            color="secondary"
                                            type="button"
                                            className="me-2"
                                            onClick={handleDiplomesCancel}
                                            disabled={diplomesSaving}
                                        >
                                            Annuler
                                        </Button>
                                        <Button color="primary" type="submit" disabled={diplomesSaving}>
                                            {diplomesSaving ? (
                                                <>
                                                    <Spinner size="sm" className="me-2" />
                                                    Enregistrement...
                                                </>
                                            ) : (
                                                'Enregistrer'
                                            )}
                                        </Button>
                                    </div>
                                </Form>
                            ) : (
                                <>
                                    {(() => {
                                        const diplomes = agentData?.diplomes || [];
                                        
                                        // Fonction helper pour ouvrir le document
                                        const handleViewDocument = async (diplome) => {
                                            try {
                                                // Utiliser document_url si disponible
                                                let documentPath = '';
                                                
                                                if (diplome.document_url) {
                                                    // Le document_url est stocké comme /uploads/diplomes/filename
                                                    // Le serveur attend le chemin sans le préfixe /uploads/
                                                    documentPath = diplome.document_url;
                                                    
                                                    // Enlever le préfixe /uploads/ si présent
                                                    if (documentPath.startsWith('/uploads/')) {
                                                        documentPath = documentPath.substring('/uploads/'.length);
                                                    } else if (documentPath.startsWith('uploads/')) {
                                                        documentPath = documentPath.substring('uploads/'.length);
                                                    } else if (documentPath.startsWith('/')) {
                                                        documentPath = documentPath.substring(1);
                                                    }
                                                } else if (diplome.id_agent_document) {
                                                    // Si on a seulement l'ID, construire le chemin par défaut
                                                    // Le format attendu est diplomes/filename
                                                    documentPath = `diplomes/document_${diplome.id_agent_document}.pdf`;
                                                }
                                                
                                                if (documentPath) {
                                                    // Encoder le chemin en base64 pour l'endpoint API
                                                    const encodedPath = btoa(documentPath);
                                                    const url = `https://tourisme.2ise-groupe.com/api/agents/diplome-document/${encodedPath}`;
                                                    
                                                    // Récupérer le token d'authentification
                                                    const token = localStorage.getItem('token');
                                                    
                                                    if (!token) {
                                                        alert('Vous devez être connecté pour voir le document.');
                                                        return;
                                                    }
                                                    
                                                    // Faire une requête avec le token d'authentification
                                                    const response = await fetch(url, {
                                                        method: 'GET',
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Accept': 'application/pdf,application/octet-stream,*/*'
                                                        }
                                                    });
                                                    
                                                    if (!response.ok) {
                                                        const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
                                                        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
                                                    }
                                                    
                                                    // Récupérer le blob et créer une URL temporaire
                                                    const blob = await response.blob();
                                                    const blobUrl = window.URL.createObjectURL(blob);
                                                    
                                                    // Ouvrir le document dans un nouvel onglet
                                                    const newWindow = window.open(blobUrl, '_blank');
                                                    
                                                    // Nettoyer l'URL après un délai
                                                    if (newWindow) {
                                                        newWindow.addEventListener('beforeunload', () => {
                                                            window.URL.revokeObjectURL(blobUrl);
                                                        });
                                                    } else {
                                                        // Si la popup est bloquée, nettoyer après un délai
                                                        setTimeout(() => {
                                                            window.URL.revokeObjectURL(blobUrl);
                                                        }, 1000);
                                                    }
                                                } else {
                                                    alert('Impossible de déterminer le chemin du document.');
                                                }
                                            } catch (error) {
                                                console.error('Erreur lors de l\'ouverture du document:', error);
                                                alert('Erreur lors de l\'ouverture du document: ' + error.message);
                                            }
                                        };
                                        
                                        return diplomes.length > 0 ? (
                                            <>
                                                {/* Version mobile : Cartes individuelles */}
                                                <div className="d-block d-md-none">
                                                    {diplomes.map((diplome, index) => (
                                                        <Card key={diplome.id || index} className="mb-3">
                                                            <CardBody>
                                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                                    <div>
                                                                        <h6 className="mb-1">
                                                                            <strong>{diplome.diplome || 'Diplôme non spécifié'}</strong>
                                                                        </h6>
                                                                        {diplome.options && (
                                                                            <small className="text-muted d-block mb-1">
                                                                                Options: {diplome.options}
                                                                            </small>
                                                                        )}
                                                                    </div>
                                                                    <Badge color="primary" pill>{index + 1}</Badge>
                                                                </div>
                                                                
                                                                <hr className="my-2" />
                                                                
                                                                <Row className="g-2">
                                                                    <Col xs="6">
                                                                        <small className="text-muted d-block">Date d'obtention</small>
                                                                        <div className="fw-bold">{formatYearForDisplay(diplome.date_diplome)}</div>
                                                                    </Col>
                                                                    <Col xs="6">
                                                                        <small className="text-muted d-block">École/Université</small>
                                                                        <div className="fw-bold">{diplome.ecole || '-'}</div>
                                                                    </Col>
                                                                    <Col xs="6">
                                                                        <small className="text-muted d-block">Ville</small>
                                                                        <div className="fw-bold">{diplome.ville || '-'}</div>
                                                                    </Col>
                                                                    <Col xs="6">
                                                                        <small className="text-muted d-block">Pays</small>
                                                                        <div className="fw-bold">{diplome.pays || '-'}</div>
                                                                    </Col>
                                                                    <Col xs="12" className="mt-2">
                                                                        {diplome.document_url || diplome.id_agent_document ? (
                                                                            <Button
                                                                                color="info"
                                                                                size="sm"
                                                                                block
                                                                                onClick={() => handleViewDocument(diplome)}
                                                                                className="w-100"
                                                                            >
                                                                                <MdDescription className="me-1" />
                                                                                Voir le document
                                                                            </Button>
                                                                        ) : (
                                                                            <div className="text-muted text-center">
                                                                                <small>Aucun document</small>
                                                                            </div>
                                                                        )}
                                                                    </Col>
                                                                </Row>
                                                            </CardBody>
                                                        </Card>
                                                    ))}
                                                </div>
                                                
                                                {/* Version desktop : Tableau */}
                                                <div className="d-none d-md-block">
                                                    <div className="table-responsive">
                                                        <Table hover>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ width: '50px' }}>#</th>
                                                                    <th>Nom du diplôme</th>
                                                                    <th>Options</th>
                                                                    <th>Date d'obtention</th>
                                                                    <th>École/Université</th>
                                                                    <th>Ville</th>
                                                                    <th>Pays</th>
                                                                    <th style={{ width: '150px' }}>Document</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {diplomes.map((diplome, index) => (
                                                                    <tr key={diplome.id || index}>
                                                                        <td>{index + 1}</td>
                                                                        <td><strong>{diplome.diplome || '-'}</strong></td>
                                                                        <td>{diplome.options || '-'}</td>
<td>{formatYearForDisplay(diplome.date_diplome)}</td>
                                                <td>{diplome.ecole || '-'}</td>
                                                                        <td>{diplome.ville || '-'}</td>
                                                                        <td>{diplome.pays || '-'}</td>
                                                                        <td>
                                                                            {diplome.document_url || diplome.id_agent_document ? (
                                                                                <Button
                                                                                    color="info"
                                                                                    size="sm"
                                                                                    onClick={() => handleViewDocument(diplome)}
                                                                                >
                                                                                    <MdDescription className="me-1" />
                                                                                    Voir le document
                                                                                </Button>
                                                                            ) : (
                                                                                <span className="text-muted">Aucun document</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <Alert color="info">
                                                <i className="fa fa-info-circle me-2"></i>
                                                Aucun diplôme enregistré. Cliquez sur "Ajouter" pour enregistrer vos diplômes.
                                            </Alert>
                                        );
                                    })()}
                                </>
                            )}
                        </CardBody>
                    </Card>
                </TabPane>
                
                
                
                
                
            </TabContent>

                </div>
            </div>

            {/* Modales */}
            <CreateDemandeModal
                isOpen={showCreateDemandeModal}
                toggle={() => setShowCreateDemandeModal(!showCreateDemandeModal)}
                onDemandeCreated={handleDemandeCreated}
                agentId={user?.id_agent}
            />

            <DemandeDetails
                isOpen={showDemandeDetails}
                toggle={() => setShowDemandeDetails(!showDemandeDetails)}
                demande={selectedDemande}
                agentId={user?.id_agent}
                onValidationSuccess={handleValidationSuccess}
            />

            <ValidationModal
                isOpen={showValidationModal}
                toggle={() => setShowValidationModal(!showValidationModal)}
                demande={selectedDemande}
                onValidate={handleValidateDemande}
            />

            {/* Modal pour afficher le message complet de la notification */}
            {showNotificationMessageModal && selectedNotificationMessage && (
                <Modal 
                    isOpen={showNotificationMessageModal} 
                    toggle={() => {
                        setShowNotificationMessageModal(false);
                        setSelectedNotificationMessage(null);
                    }}
                    size="lg"
                >
                    <ModalHeader toggle={() => {
                        setShowNotificationMessageModal(false);
                        setSelectedNotificationMessage(null);
                    }}>
                        <i className="fa fa-bell me-2"></i>
                        {selectedNotificationMessage.titre || 'Notification'}
                    </ModalHeader>
                    <ModalBody>
                        <div>
                            <div className="mb-3">
                                <Badge 
                                    color={
                                        selectedNotificationMessage.type_notification === 'demande_approuvee' ? 'success' :
                                        selectedNotificationMessage.type_notification === 'demande_rejetee' ? 'danger' :
                                        selectedNotificationMessage.type_notification === 'note_service' ? 'info' :
                                        selectedNotificationMessage.type_notification === 'anniversaire_aujourdhui' || 
                                        selectedNotificationMessage.type_notification === 'anniversaire_avenir' ? 'warning' :
                                        'primary'
                                    }
                                    className="me-2"
                                >
                                    {selectedNotificationMessage.type_notification === 'demande_approuvee' ? 'Demande approuvée' :
                                     selectedNotificationMessage.type_notification === 'demande_rejetee' ? 'Demande rejetée' :
                                     selectedNotificationMessage.type_notification === 'note_service' ? 'Note de Service' :
                                     selectedNotificationMessage.type_notification === 'anniversaire_aujourdhui' || 
                                     selectedNotificationMessage.type_notification === 'anniversaire_avenir' ? 'Vœux d\'anniversaire' :
                                     selectedNotificationMessage.type_notification}
                                </Badge>
                                <small className="text-muted">
                                    {selectedNotificationMessage.date_creation ? 
                                        new Date(selectedNotificationMessage.date_creation).toLocaleString('fr-FR') : 
                                        'Date non disponible'}
                                </small>
                            </div>
                            <div 
                                style={{ 
                                    whiteSpace: 'pre-line', 
                                    color: '#000', 
                                    lineHeight: '1.8',
                                    fontSize: '1rem',
                                    padding: '15px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '5px',
                                    border: '1px solid #dee2e6'
                                }}
                            >
                                {selectedNotificationMessage.message || 'Aucun message disponible'}
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button 
                            color="secondary" 
                            onClick={() => {
                                setShowNotificationMessageModal(false);
                                setSelectedNotificationMessage(null);
                            }}
                        >
                            Fermer
                        </Button>
                    </ModalFooter>
                </Modal>
            )}

            {/* Modals pour les anniversaires (directeurs et sous-directeurs) */}
            {(() => {
                const userRole = user?.role?.toLowerCase();
                const isDirecteur = userRole === 'directeur';
                const isSousDirecteur = userRole === 'sous_directeur' || userRole === 'sous-directeur';
                
                if (!isDirecteur && !isSousDirecteur) return null;
                
                const anniversairesAujourdhui = birthdays.filter(agent => parseInt(agent.jours_restants) === 0);
                const anniversairesAVenir = birthdays.filter(agent => parseInt(agent.jours_restants) > 0);
                
                return (
                    <>
                        {/* Modal détails anniversaires d'aujourd'hui */}
                        {anniversairesAujourdhui.length > 0 && (
                            <BirthdaysDetailsModal
                                isOpen={detailsModalToday}
                                toggle={() => setDetailsModalToday(false)}
                                agents={anniversairesAujourdhui}
                                title={`🎂 Anniversaires d'aujourd'hui (${anniversairesAujourdhui.length})`}
                                type="today"
                            />
                        )}

                        {/* Modal détails anniversaires à venir */}
                        {anniversairesAVenir.length > 0 && (
                            <BirthdaysDetailsModal
                                isOpen={detailsModalUpcoming}
                                toggle={() => setDetailsModalUpcoming(false)}
                                agents={anniversairesAVenir}
                                title={`🎉 Anniversaires à venir (${anniversairesAVenir.length})`}
                                type="upcoming"
                            />
                        )}

                        {/* Modal message anniversaires d'aujourd'hui */}
                        {anniversairesAujourdhui.length > 0 && (
                            <BirthdaysMessageModal
                                isOpen={messageModalToday}
                                toggle={() => setMessageModalToday(false)}
                                agents={anniversairesAujourdhui}
                                title={`Anniversaires d'aujourd'hui (${anniversairesAujourdhui.length})`}
                                type="today"
                            />
                        )}

                        {/* Modal message anniversaires à venir */}
                        {anniversairesAVenir.length > 0 && (
                            <BirthdaysMessageModal
                                isOpen={messageModalUpcoming}
                                toggle={() => setMessageModalUpcoming(false)}
                                agents={anniversairesAVenir}
                                title={`Anniversaires à venir (${anniversairesAVenir.length})`}
                                type="upcoming"
                            />
                        )}
                    </>
                );
            })()}

            {/* Modal détails des congés par période */}
            <Modal isOpen={showCongesModal} toggle={() => setShowCongesModal(false)} size="lg">
                <ModalHeader toggle={() => setShowCongesModal(false)}>
                    <MdCalendarToday className="me-2" />
                    Départs en congés - {selectedCongesPeriod?.label}
                </ModalHeader>
                <ModalBody>
                    {selectedCongesPeriod && selectedCongesPeriod.agents && selectedCongesPeriod.agents.length > 0 ? (
                        <Table striped hover responsive>
                            <thead>
                                <tr>
                                    <th>Matricule</th>
                                    <th>Nom</th>
                                    <th>Prénoms</th>
                                    <th>Direction</th>
                                    <th>Sous-direction</th>
                                    <th>Date de départ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedCongesPeriod.agents.map((agent, index) => (
                                    <tr key={`${agent.id_agent}-${agent.annee}-${index}`}>
                                        <td>{agent.matricule || '-'}</td>
                                        <td>{agent.nom || '-'}</td>
                                        <td>{agent.prenom || '-'}</td>
                                        <td>{agent.direction_libelle || '-'}</td>
                                        <td>{agent.sous_direction_libelle || '-'}</td>
                                        <td>
                                            <Badge color="primary">
                                                {agent.date_depart_conges ? new Date(agent.date_depart_conges).toLocaleDateString('fr-FR') : '-'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <Alert color="info">
                            Aucun agent dans cette période
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowCongesModal(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal détails des agents en congés */}
            <Modal isOpen={showAgentsEnCongesModal} toggle={() => setShowAgentsEnCongesModal(false)} size="xl">
                <ModalHeader toggle={() => setShowAgentsEnCongesModal(false)}>
                    <MdWork className="me-2" />
                    Agents actuellement en congés
                </ModalHeader>
                <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {agentsEnConges && Object.keys(agentsEnConges).length > 0 ? (
                        <div>
                            {Object.values(agentsEnConges).map((direction, dirIndex) => (
                                <div key={dirIndex} className="mb-4">
                                    <h5 className="mb-3" style={{ color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #007bff', paddingBottom: '0.5rem' }}>
                                        Direction: {direction.libelle}
                                    </h5>
                                    {Object.values(direction.sous_directions).map((sousDirection, sdIndex) => (
                                        <div key={sdIndex} className="mb-3 ms-3">
                                            <h6 className="mb-2" style={{ color: '#495057', fontWeight: 'bold' }}>
                                                Sous-direction: {sousDirection.libelle}
                                            </h6>
                                            {Object.values(sousDirection.services).map((service, svcIndex) => {
                                                if (service.agents.length === 0) return null;
                                                return (
                                                    <div key={svcIndex} className="mb-2 ms-3">
                                                        <div className="mb-2" style={{ fontWeight: '600', color: '#6c757d' }}>
                                                            Service: {service.libelle} ({service.agents.length} agent{service.agents.length > 1 ? 's' : ''})
                                                        </div>
                                                        <Table striped hover responsive size="sm" className="ms-4">
                                                            <thead>
                                                                <tr>
                                                                    <th>Matricule</th>
                                                                    <th>Nom</th>
                                                                    <th>Prénoms</th>
                                                                    <th>Date de début</th>
                                                                    <th>Date de fin</th>
                                                                    <th>Rôle</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {service.agents.map((agent, agentIndex) => (
                                                                    <tr key={agentIndex}>
                                                                        <td>{agent.matricule || '-'}</td>
                                                                        <td>{agent.nom || '-'}</td>
                                                                        <td>{agent.prenom || '-'}</td>
                                                                        <td>
                                                                            <Badge color="primary">
                                                                                {agent.date_debut ? new Date(agent.date_debut).toLocaleDateString('fr-FR') : '-'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td>
                                                                            <Badge color={agent.date_fin && new Date(agent.date_fin) < new Date() ? 'secondary' : 'primary'}>
                                                                                {agent.date_fin ? new Date(agent.date_fin).toLocaleDateString('fr-FR') : 'En cours'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td>
                                                                            <Badge color="dark">
                                                                                {agent.role_agent || 'Agent'}
                                                                            </Badge>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </Table>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Alert color="info">
                            Aucun agent actuellement en congés
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setShowAgentsEnCongesModal(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default AgentDashboard;
