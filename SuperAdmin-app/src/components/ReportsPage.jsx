import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
    FormGroup,
    Label,
    Alert,
    Spinner,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup as FormGroupCheckbox,
    CustomInput,
    Pagination,
    PaginationItem,
    PaginationLink
} from 'reactstrap';
import { 
    MdPrint, 
    MdFileDownload, 
    MdPictureAsPdf, 
    MdTableChart, 
    MdDescription,
    MdFilterList,
    MdSearch,
    MdRefresh,
    MdSettings,
    MdArrowBack
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { useHistory } from 'react-router-dom';

const ReportsPage = ({ 
    title, 
    description, 
    apiEndpoint, 
    fields = [],
    searchFields = [],
    filters = [],
    user
}) => {
    const history = useHistory();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterValues, setFilterValues] = useState({});
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [printModal, setPrintModal] = useState(false);
    const [printData, setPrintData] = useState([]);
    const [fieldSelectionModal, setFieldSelectionModal] = useState(false);
    const [selectedFields, setSelectedFields] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);
    const [showOnlySelectedFields, setShowOnlySelectedFields] = useState(false);
    const [pendingExportAction, setPendingExportAction] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const calculateRetirementAgeFromGrade = (gradeLabel = '') => {
        if (!gradeLabel) return 60;
        const normalized = gradeLabel.toUpperCase().trim();
        const grades65 = ['A4', 'A5', 'A6', 'A7'];
        return grades65.includes(normalized) ? 65 : 60;
    };

    const parseDateValue = (value) => {
        if (!value) return null;
        const normalized = value.toString().trim();
        if (!normalized) return null;

        const direct = new Date(normalized);
        if (!Number.isNaN(direct.getTime())) return direct;

        const match = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match) {
            const [, day, month, year] = match;
            const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`;
            const parsed = new Date(iso);
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
        return null;
    };

    const calculateAge = (dateString) => {
        const birthDate = parseDateValue(dateString);
        if (!birthDate) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age -= 1;
        }
        return age >= 0 ? age : null;
    };

    const getRetirementDate = (agent) => {
        const candidates = [
            agent.date_retraite,
            agent.date_retraite_calculee,
            agent.retirement_date
        ];
        for (const candidate of candidates) {
            const parsed = parseDateValue(candidate);
            if (parsed) return parsed;
        }
        return null;
    };

    const getRetirementAgeForAgent = (agent) => {
        if (agent.age_retraite_calcule) return agent.age_retraite_calcule;
        if (agent.age_retraite) return agent.age_retraite;
        return calculateRetirementAgeFromGrade(agent.grade_libele || agent.grade_libelle || '');
    };

    const hasReachedRetirement = (agent) => {
        const today = new Date();
        const retirementDate = getRetirementDate(agent);
        if (retirementDate && retirementDate <= today) {
            return true;
        }

        const retirementAge = getRetirementAgeForAgent(agent);
        const currentAge = calculateAge(agent.date_de_naissance);
        if (retirementAge && currentAge && currentAge >= retirementAge) {
            return true;
        }

        return false;
    };

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Générer un titre dynamique basé sur les filtres appliqués
    const getDynamicTitle = () => {
        let dynamicTitle = title;
        const filterDescriptions = [];

        // Parcourir les filtres actifs
        Object.keys(filterValues).forEach(key => {
            if (filterValues[key]) {
                const filter = filters.find(f => f.name === key);
                if (filter) {
                    const selectedOption = filter.options?.find(opt => opt.value === filterValues[key]);
                    if (selectedOption && selectedOption.value !== '') {
                        // Adapter le texte selon le type de filtre
                        if (key === 'sexe') {
                            filterDescriptions.push(`de sexe ${selectedOption.label.toLowerCase()}`);
                        } else if (key === 'type_agent') {
                            filterDescriptions.push(`de type ${selectedOption.label}`);
                        } else if (key === 'statut_emploi') {
                            filterDescriptions.push(`au statut ${selectedOption.label}`);
                        } else if (key === 'id_categorie') {
                            filterDescriptions.push(`de catégorie ${selectedOption.label}`);
                        } else if (key === 'id_grade') {
                            filterDescriptions.push(`de grade ${selectedOption.label}`);
                        } else {
                            filterDescriptions.push(`${filter.label}: ${selectedOption.label}`);
                        }
                    }
                }
            }
        });

        // Ajouter les descriptions au titre
        if (filterDescriptions.length > 0) {
            dynamicTitle += ' ' + filterDescriptions.join(', ');
        }

        return dynamicTitle;
    };

    // Charger les données
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `https://tourisme.2ise-groupe.com/api/${apiEndpoint}`;
            const queryParams = [];

            // Ajouter les filtres
            Object.keys(filterValues).forEach(key => {
                if (filterValues[key]) {
                    queryParams.push(`${key}=${filterValues[key]}`);
                }
            });

            // Pour les rapports d'agents, si aucun filtre include_entites n'est défini, 
            // inclure les agents des entités par défaut
            if (apiEndpoint === 'agents' && !filterValues.include_entites) {
                queryParams.push('include_entites=true');
            }

            // Ajouter la recherche
            if (searchTerm) {
                queryParams.push(`search=${searchTerm}`);
            }

            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            let dataToSet = [];

            if (result.data && Array.isArray(result.data)) {
                dataToSet = result.data;
            } else if (Array.isArray(result)) {
                dataToSet = result;
            } else if (result.success && result.data) {
                dataToSet = result.data;
            }

            // Filtrer pour exclure les agents à la retraite ET les agents retirés manuellement
            const filtered = dataToSet.filter(agent => 
                !hasReachedRetirement(agent) && 
                (!agent.retire || agent.retire === false)
            );
            setData(filtered);
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Nouvelle fonction pour charger les données hiérarchiques
    const loadHierarchicalData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Récupérer l'ID du ministère de l'utilisateur
            const userMinistereId = await getUserMinistereId();
            console.log('🔍 ReportsPage - getUserMinistereId result:', userMinistereId);
            console.log('🔍 ReportsPage - user object:', user);
            
            let url = `https://tourisme.2ise-groupe.com/api/agents/hierarchical-report`;
            const queryParams = [];

            // Ajouter le filtre par ministère
            if (userMinistereId) {
                queryParams.push(`id_ministere=${userMinistereId}`);
                console.log('🔍 ReportsPage - Ajout du filtre par ministère:', userMinistereId);
            } else {
                console.log('⚠️ ReportsPage - Aucun ID de ministère trouvé, pas de filtrage appliqué');
            }

            // Ajouter les filtres
            Object.keys(filterValues).forEach(key => {
                if (filterValues[key]) {
                    queryParams.push(`${key}=${filterValues[key]}`);
                }
            });

            // Pour les rapports d'agents, si aucun filtre include_entites n'est défini, 
            // inclure les agents des entités par défaut
            if (!filterValues.include_entites) {
                queryParams.push('include_entites=true');
            }

            // Ajouter la recherche
            if (searchTerm) {
                queryParams.push(`search=${searchTerm}`);
            }

            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            console.log('🔍 Chargement des données hiérarchiques depuis:', url);

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('🔍 Données hiérarchiques reçues:', result);

            let dataToSet = [];

            if (result.success && result.data && Array.isArray(result.data)) {
                dataToSet = result.data;
                console.log('🔍 Nombre d\'agents récupérés:', dataToSet.length);
                console.log('🔍 Échantillon des agents:', dataToSet.slice(0, 3).map(agent => ({
                    nom: agent.nom_complet,
                    direction: agent.direction_libelle,
                    sous_direction: agent.sous_direction_libelle,
                    service: agent.service_libelle,
                    statut: agent.statut_emploi
                })));
            } else {
                console.error('❌ Format de réponse inattendu:', result);
                dataToSet = [];
            }

            // Filtrer pour exclure les agents à la retraite ET les agents retirés manuellement
            const filtered = dataToSet.filter(agent => 
                !hasReachedRetirement(agent) && 
                (!agent.retire || agent.retire === false)
            );
            setData(filtered);
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('❌ Erreur lors du chargement des données hiérarchiques:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les données selon les filtres appliqués et le terme de recherche
    const filteredData = data.filter(item => {
        // 1. Filtrage par terme de recherche (recherche textuelle dans les champs)
        if (searchTerm) {
            const matchesSearch = searchFields.some(field => 
                item[field] && item[field].toString().toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (!matchesSearch) return false;
        }
        
        // 2. Filtrage par les filtres dropdown (type_agent, sexe, grade, etc.)
        // Application locale des filtres pour s'assurer qu'ils fonctionnent même si le backend ne les applique pas correctement
        for (const filterName in filterValues) {
            const filterValue = filterValues[filterName];
            
            // Ignorer les filtres vides
            if (!filterValue || filterValue === '') continue;
            
            // Ignorer le filtre include_entites (filtre spécial pour le backend)
            if (filterName === 'include_entites') continue;
            
            // Vérifier si l'item correspond au filtre
            const itemValue = item[filterName];
            
            // Pour type_agent, comparer avec type_agent_libele (en majuscules pour être insensible à la casse)
            if (filterName === 'type_agent') {
                const typeAgentLibele = (item.type_agent_libele || item.type_agent || '').toUpperCase();
                const filterValueUpper = filterValue.toUpperCase();
                if (typeAgentLibele !== filterValueUpper) {
                    return false;
                }
            }
            // Pour les autres filtres (id_categorie, id_grade, sexe, statut_emploi, etc.)
            else {
                // Utiliser == pour comparaison souple (string vs number)
                if (itemValue != filterValue) {
                    return false;
                }
            }
        }
        
        return true;
    })
    // Trier par ordre alphabétique (nom puis prénom)
    .sort((a, b) => {
        const nomA = (a.nom || '').toLowerCase();
        const nomB = (b.nom || '').toLowerCase();
        if (nomA !== nomB) {
            return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
        }
        const prenomA = (a.prenom || '').toLowerCase();
        const prenomB = (b.prenom || '').toLowerCase();
        return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
    });

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Réinitialiser la page courante si elle dépasse le nombre total de pages ou si les filtres changent
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    // Réinitialiser la page quand les filtres ou la recherche changent
    useEffect(() => {
        setCurrentPage(1);
    }, [filterValues, searchTerm]);

    // Fonction d'impression avec sélection de champs
    const handlePrint = () => {
        setPendingExportAction('print');
        setFieldSelectionModal(true);
    };

    // Confirmer l'impression avec les champs sélectionnés
    const confirmPrint = () => {
        setPrintData(filteredData);
        setPrintModal(true);
        setFieldSelectionModal(false);
        setPendingExportAction(null);
    };

    // Fonction générique pour ouvrir la modal de sélection des champs
    const openFieldSelectionModal = (exportType) => {
        setPendingExportAction(exportType);
        setFieldSelectionModal(true);
    };

    // Gestion de la sélection des champs
    const handleFieldSelection = (fieldName, isSelected) => {
        if (isSelected) {
            setSelectedFields(prev => [...prev, fieldName]);
        } else {
            setSelectedFields(prev => prev.filter(name => name !== fieldName));
        }
    };

    // Sélectionner/désélectionner tous les champs
    const toggleAllFields = (selectAll) => {
        if (selectAll) {
            setSelectedFields(availableFields.map(field => field.name));
        } else {
            setSelectedFields([]);
        }
    };

    // Obtenir les champs sélectionnés pour l'affichage
    const getSelectedFieldsForDisplay = () => {
        const selectedFieldsList = availableFields.filter(field => selectedFields.includes(field.name));
        
        // Séparer les champs normaux des champs de direction
        const normalFields = selectedFieldsList.filter(field => field.type !== 'direction');
        const directionFields = selectedFieldsList.filter(field => field.type === 'direction');
        
        return {
            normalFields,
            directionFields
        };
    };

    // Grouper les agents par direction (inclure tous les agents)
    const groupAgentsByDirection = (data) => {
        const groups = {};
        
        data.forEach(agent => {
            const directionId = agent.id_direction;
            
            // Agents avec direction spécifiée
            if (directionId && agent.direction_libelle && agent.direction_libelle.trim() !== '') {
                const directionName = agent.direction_libelle;
                const groupKey = `direction_${directionId}`;
                
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        directionName,
                        agents: []
                    };
                }
                groups[groupKey].agents.push(agent);
            } else {
                // Agents sans direction - les inclure dans un groupe spécial
                const groupKey = 'agents_sans_direction';
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        directionName: 'Agents sans service spécifique',
                        agents: []
                    };
                }
                groups[groupKey].agents.push(agent);
            }
        });
        
        return groups;
    };

    // Fonction helper pour formater les dates sans problème de fuseau horaire
    const formatDateSafe = (dateString) => {
        if (!dateString) return '-';
        try {
            // Extraire seulement la partie date (YYYY-MM-DD) sans l'heure
            const datePart = dateString.split('T')[0];
            const [year, month, day] = datePart.split('-');
            
            // Retourner au format français DD/MM/YYYY
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Erreur lors du formatage de la date:', dateString, error);
            return '-';
        }
    };

    // Fonction pour formater une valeur de champ (détecte et formate les dates automatiquement)
    const formatFieldValue = (value, fieldName) => {
        if (!value || value === '-') return '-';
        
        // Liste des noms de champs qui contiennent des dates
        const dateFieldNames = [
            'date_de_naissance', 'date_naissance', 'date_embauche', 'date_prise_service_au_ministere',
            'date_prise_service_dans_la_direction', 'date_fin_contrat', 'date_retraite',
            'date_signature_nomination', 'date_nomination_emploi', 'date_mariage',
            'date_entree', 'date_entree_fonction', 'date_entree_emploi', 'fonction_date_entree', 'emploi_date_entree'
        ];
        
        // Vérifier si c'est un champ de date par son nom
        if (dateFieldNames.some(dateField => fieldName.includes(dateField))) {
            return formatDateSafe(value);
        }
        
        // Vérifier si la valeur ressemble à une date ISO (format: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...)
        const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/;
        if (typeof value === 'string' && datePattern.test(value.trim())) {
            return formatDateSafe(value);
        }
        
        return value;
    };

    // Fonction helper pour récupérer l'ID du ministère de l'utilisateur
    const getUserMinistereId = async () => {
        console.log('🔍 getUserMinistereId - user:', user);
        console.log('🔍 getUserMinistereId - user?.organization:', user?.organization);
        
        if (user?.organization?.type === 'ministere' && user?.organization?.id) {
            console.log('🔍 getUserMinistereId - Ministère trouvé dans organization:', user.organization.id);
            return user.organization.id;
        } else if (user?.id_agent) {
            console.log('🔍 getUserMinistereId - Recherche via agent ID:', user.id_agent);
            try {
                const token = localStorage.getItem('token');
                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();
                    console.log('🔍 getUserMinistereId - Agent data:', agentData);
                    return agentData.data?.id_ministere;
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération du ministère de l\'agent:', error);
            }
        } else {
            console.log('⚠️ getUserMinistereId - Aucune organisation ou agent trouvé');
        }
        return null;
    };

    // Nouvelle fonction pour grouper hiérarchiquement : Direction Générale → Direction → Sous-directions → Services → Agents
    const groupAgentsHierarchically = async (data) => {
        const token = localStorage.getItem('token');
        
        console.log('🚀 Début du groupement hiérarchique - Nombre d\'agents:', data.length);
        
        // Récupérer l'ID du ministère
        const userMinistereId = await getUserMinistereId();
        console.log('🔍 userMinistereId récupéré:', userMinistereId);
        
        // OPTIMISATION : Récupérer TOUTES les entités hiérarchiques EN UNE FOIS
        console.log('🔄 Récupération de toutes les entités hiérarchiques...');
        
        // Récupérer toutes les directions générales
        let directionsGeneralesUrl = `https://tourisme.2ise-groupe.com/api/directions-generales?limit=1000`;
        if (userMinistereId) directionsGeneralesUrl += `&ministere_id=${userMinistereId}`;
        
        // Récupérer toutes les directions
        let directionsUrl = `https://tourisme.2ise-groupe.com/api/directions?limit=1000`;
        if (userMinistereId) directionsUrl += `&id_ministere=${userMinistereId}`;
        
        // Récupérer tous les services
        let servicesUrl = `https://tourisme.2ise-groupe.com/api/services?limit=1000`;
        if (userMinistereId) servicesUrl += `&id_ministere=${userMinistereId}`;
        
        // Récupérer toutes les sous-directions
        let sousDirectionsUrl = `https://tourisme.2ise-groupe.com/api/sous_directions?limit=1000`;
        if (userMinistereId) sousDirectionsUrl += `&id_ministere=${userMinistereId}`;
        
        // Faire toutes les requêtes en parallèle
        const [directionsGeneralesResponse, directionsResponse, servicesResponse, sousDirectionsResponse] = await Promise.all([
            fetch(directionsGeneralesUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(directionsUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(servicesUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(sousDirectionsUrl, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const [directionsGeneralesResult, directionsResult, servicesResult, sousDirectionsResult] = await Promise.all([
            directionsGeneralesResponse.json(),
            directionsResponse.json(),
            servicesResponse.json(),
            sousDirectionsResponse.json()
        ]);
        
        const allDirectionsGenerales = directionsGeneralesResult.success ? directionsGeneralesResult.data : [];
        const allDirections = directionsResult.success ? directionsResult.data : [];
        const allServices = servicesResult.success ? servicesResult.data : [];
        const allSousDirections = sousDirectionsResult.success ? sousDirectionsResult.data : [];
        
        console.log(`✅ Entités récupérées - Directions Générales: ${allDirectionsGenerales.length}, Directions: ${allDirections.length}, Services: ${allServices.length}, Sous-directions: ${allSousDirections.length}`);
        
        // console.log('🔍 DEBUG - Directions récupérées:', allDirections.length);
        
        // Si le filtre par ministère n'a pas fonctionné, filtrer manuellement
        let filteredDirections = allDirections;
        if (!userMinistereId && allDirections.length > 0) {
            // Récupérer le ministère depuis le premier agent
            const firstAgent = data.find(agent => agent.id_ministere);
            if (firstAgent && firstAgent.id_ministere) {
                const targetMinistereId = firstAgent.id_ministere;
                filteredDirections = allDirections.filter(direction => 
                    direction.id_ministere === targetMinistereId
                );
                console.log(`🔧 Filtrage manuel - Ministère ${targetMinistereId}: ${filteredDirections.length} directions`);
            }
        }
        
        // Exclure explicitement les directions qui sont en fait des services
        const invalidDirections = ['Service Informatique', 'SERVICE INFORMATIQUE'];
        filteredDirections = filteredDirections.filter(direction => 
            !invalidDirections.includes(direction.libelle)
        );
        
        // Créer les mappings pour faciliter l'accès
        const directionMapping = {};
        const directionGeneraleMapping = {};
        const sousDirectionMapping = {};
        const serviceMapping = {};
        
        filteredDirections.forEach(d => {
            directionMapping[d.id] = d;
            if (d.id_direction_generale) {
                if (!directionGeneraleMapping[d.id_direction_generale]) {
                    directionGeneraleMapping[d.id_direction_generale] = [];
                }
                directionGeneraleMapping[d.id_direction_generale].push(d);
            }
        });
        
        allSousDirections.forEach(sd => {
            sousDirectionMapping[sd.id] = sd;
        });
        
        allServices.forEach(s => {
            serviceMapping[s.id] = s;
        });
        
        // Créer la structure hiérarchique : Direction Générale → Directions
        const hierarchicalStructure = {};
        
        // Grouper par Direction Générale d'abord
        allDirectionsGenerales.forEach(dg => {
            if (!hierarchicalStructure[dg.id]) {
                hierarchicalStructure[dg.id] = {
                    directionGeneraleName: dg.libelle,
                    directionGeneraleId: dg.id,
                    directions: {}
                };
            }
        });
        
        // Si certaines directions n'ont pas de direction générale, créer un groupe "Sans Direction Générale"
        filteredDirections.forEach(direction => {
            if (!direction.id_direction_generale) {
                if (!hierarchicalStructure['no_dg']) {
                    hierarchicalStructure['no_dg'] = {
                        directionGeneraleName: 'Directions sans Direction Générale',
                        directionGeneraleId: 'no_dg',
                        directions: {}
                    };
                }
            }
        });
        
        console.log('🔍 Agents reçus pour le rapport:', data.length);
        
        // D'abord, identifier quelles directions ont des agents
        const directionsWithAgents = new Set();
        data.forEach(agent => {
            if (agent.id_direction) {
                directionsWithAgents.add(agent.id_direction);
            }
        });
        
        // Créer les groupes de directions dans leur Direction Générale respective
        filteredDirections.forEach(direction => {
            if (!directionsWithAgents.has(direction.id)) {
                return; // Ignorer les directions sans agents
            }
            
            const dgId = direction.id_direction_generale || 'no_dg';
            
            if (!hierarchicalStructure[dgId]) {
                hierarchicalStructure[dgId] = {
                    directionGeneraleName: direction.direction_generale_libelle || 'Directions sans Direction Générale',
                    directionGeneraleId: dgId,
                    directions: {}
                };
            }
            
            hierarchicalStructure[dgId].directions[direction.id] = {
                directionName: direction.libelle,
                directionId: direction.id,
                directionCode: direction.code || '',
                sousDirections: {},
                directServices: {},
                directAgents: [], // Agents directs de la direction (id_direction mais PAS id_sous_direction ni id_service)
                totalAgents: 0
            };
        });
        
        console.log(`🔍 ${Object.keys(hierarchicalStructure).length} directions générales configurées`);
        console.log('🔄 Traitement des données en mémoire (sans requêtes supplémentaires)...');
        
        // Pour chaque Direction Générale
        for (const dgId in hierarchicalStructure) {
            const dg = hierarchicalStructure[dgId];
            
            // Pour chaque Direction dans cette Direction Générale
            for (const directionId in dg.directions) {
                const direction = dg.directions[directionId];
                
                // Récupérer TOUS les agents de cette direction (peu importe sous-direction/service)
                const allDirectionAgents = data.filter(agent => agent.id_direction === parseInt(directionId));
                
                if (allDirectionAgents.length === 0) {
                    continue;
                }
                
                // 1. AGENTS DIRECTS DE LA DIRECTION (id_direction mais PAS id_sous_direction ni id_service)
                const directAgents = allDirectionAgents.filter(agent => 
                    !agent.id_sous_direction && !agent.id_service
                );
                
                if (directAgents.length > 0) {
                    direction.directAgents = directAgents;
                    direction.totalAgents += directAgents.length;
                }
                
                // 2. SERVICES DIRECTS DE LA DIRECTION (id_direction et id_service mais PAS id_sous_direction)
                const directServices = allServices.filter(s => 
                    s.id_direction === parseInt(directionId) && !s.id_sous_direction
                );
                
                if (directServices.length > 0) {
                    direction.directServices = {};
                    
                    for (const service of directServices) {
                        // Agents avec ce service ET cette direction MAIS PAS de sous-direction
                        const serviceAgents = allDirectionAgents.filter(agent => 
                            (agent.id_service === service.id || agent.service_libelle === service.libelle) &&
                            !agent.id_sous_direction
                        );
                        
                        if (serviceAgents.length > 0) {
                            direction.directServices[service.id] = {
                                serviceName: service.libelle,
                                serviceId: service.id,
                                agents: serviceAgents,
                                agentCount: serviceAgents.length
                            };
                            direction.totalAgents += serviceAgents.length;
                        }
                    }
                }
                
                // 3. SOUS-DIRECTIONS (id_sous_direction)
                const sousDirections = allSousDirections.filter(sd => 
                    sd.id_direction === parseInt(directionId)
                );
                
                for (const sousDirection of sousDirections) {
                    // Agents de cette sous-direction
                    const sousDirectionAgents = allDirectionAgents.filter(agent => 
                        agent.id_sous_direction === sousDirection.id
                    );
                    
                    if (sousDirectionAgents.length === 0) {
                        continue; // Ignorer les sous-directions sans agents
                    }
                    
                    // 3a. AGENTS DIRECTS DE SOUS-DIRECTION (id_sous_direction mais PAS id_service)
                    const directSousDirectionAgents = sousDirectionAgents.filter(agent => 
                        !agent.id_service
                    );
                    
                    // 3b. SERVICES DE SOUS-DIRECTION (id_sous_direction ET id_service)
                    const sousDirectionServices = allServices.filter(s => 
                        s.id_sous_direction === sousDirection.id
                    );
                    
                    const servicesWithAgents = {};
                    
                    for (const service of sousDirectionServices) {
                        const serviceAgents = sousDirectionAgents.filter(agent => 
                            agent.id_service === service.id || agent.service_libelle === service.libelle
                        );
                        
                        if (serviceAgents.length > 0) {
                            servicesWithAgents[service.id] = {
                                serviceName: service.libelle,
                                serviceId: service.id,
                                agents: serviceAgents,
                                agentCount: serviceAgents.length
                            };
                        }
                    }
                    
                    // Créer la sous-direction si elle a des agents directs OU des services
                    if (directSousDirectionAgents.length > 0 || Object.keys(servicesWithAgents).length > 0) {
                        direction.sousDirections[sousDirection.id] = {
                            sousDirectionName: sousDirection.libelle,
                            sousDirectionId: sousDirection.id,
                            directAgents: directSousDirectionAgents, // NOUVEAU : Agents directs de sous-direction
                            services: servicesWithAgents,
                            totalAgents: directSousDirectionAgents.length + 
                                        Object.values(servicesWithAgents).reduce((sum, s) => sum + s.agentCount, 0)
                        };
                        direction.totalAgents += direction.sousDirections[sousDirection.id].totalAgents;
                    }
                }
            }
        }

        // Ajouter les agents sans direction
        const agentsWithoutDirection = data.filter(agent => 
            !agent.id_direction || !agent.direction_libelle || agent.direction_libelle.trim() === ''
        );
        
        if (agentsWithoutDirection.length > 0) {
            console.log(`🔍 Agents sans direction trouvés:`, agentsWithoutDirection.length);
            // Ajouter dans "no_dg" ou créer si nécessaire
            if (!hierarchicalStructure['no_dg']) {
                hierarchicalStructure['no_dg'] = {
                    directionGeneraleName: 'Directions sans Direction Générale',
                    directionGeneraleId: 'no_dg',
                    directions: {}
                };
            }
            hierarchicalStructure['no_dg'].directions['agents_sans_direction'] = {
                directionName: 'Agents sans direction',
                directionId: 'agents_sans_direction',
                directionCode: '',
                sousDirections: {},
                directServices: {},
                directAgents: agentsWithoutDirection,
                totalAgents: agentsWithoutDirection.length
            };
        }

        // Aplatir la structure pour retour (Direction Générale → Directions)
        // On garde la structure hiérarchique complète pour l'export
        const totalAgents = Object.values(hierarchicalStructure).reduce((sum, dg) => {
            return sum + Object.values(dg.directions).reduce((dirSum, dir) => dirSum + dir.totalAgents, 0);
        }, 0);
        
        const totalDirections = Object.values(hierarchicalStructure).reduce((sum, dg) => 
            sum + Object.keys(dg.directions).length, 0
        );
        
        console.log(`✅ Rapport hiérarchique généré - ${Object.keys(hierarchicalStructure).length} directions générales, ${totalDirections} directions, ${totalAgents} agents`);
        
        // Retourner la structure hiérarchique complète (Direction Générale → Directions)
        return hierarchicalStructure;
    };

    // Obtenir les champs à afficher dans le tableau principal
    const getFieldsToDisplay = () => {
        if (showOnlySelectedFields) {
            const { normalFields } = getSelectedFieldsForDisplay();
            return normalFields;
        }
        return fields.filter(field => field.name !== 'id');
    };

    // Exécuter l'action d'export selon le type
    const executePendingAction = () => {
        if (!pendingExportAction) return;

        switch (pendingExportAction) {
            case 'print':
                confirmPrint();
                break;
            case 'excel':
                executeExportExcel();
                break;
            case 'pdf':
                executeExportPDF();
                break;
            case 'word':
                executeExportWord();
                break;
            default:
                break;
        }
    };

    // Fonction d'export Excel
    const handleExportExcel = () => {
        openFieldSelectionModal('excel');
    };

    // Nouvelle fonction d'export Excel hiérarchique améliorée
    const handleExportExcelHierarchical = async () => {
        try {
            setLoading(true);
            
            // Ordre hiérarchique des structures du MTL
            const directionOrder = [
                'CABINET',
                'INSPECTION  GENERALE DU TOURISME ET DES LOISIRS',
                'DIRECTION DE LA COMMUNICATION ET LA DOCUMENTATION',
                'DIRECTION DU GUICHET UNIQUE',
                'DIRECTION DES AFFAIRES JURIDIQUES ET DU CONTENTIEUX',
                'DIRECTION DES AFFAIRES FINANCIERES',
                'DIRECTION DES RESSOURCES HUMAINES',
                'DIRECTION DE LA PLANIFICATION, DES STATISTIQUES ET DES PROJETS',
                'DIRECTION DE LA SECURITE TOURISTIQUE ET DES LOISIRS',
                'DIRECTION DE L\' INFORMATIQUE, DE LA DIGITALISATION ET DU DEVELOPPEMENT DES STARTUPS',
                'CELLULE DE PASSATION DES MARCHES PUBLICS',
                'GESTIONNAIRE DU PATRIMOINE',
                'DG INDUSTRIE TOURISTIQUE ET HOTELIERE',
                'DIRECTION DES ACTIVITES TOURISTIQUES',
                'DIR. COOPERATION ET PROFESSIONNALISATION',
                'DIRECTION DES SERVICES EXTERIEURS',
                'DIRECTION GENERALE DES LOISIRS',
                'DIRECTION DES PARCS DE LOISIRS, D\'ATTRACTION ET DES JEUX NUMERIQUES',
                'DIRECTION DE LA  VALORISATION, DE LA FORMATION ET DE LA PROMOTION DES JEUX TRADITIONNELS',
                'DIRECTION REGIONALE D\'ABIDJAN NORD',
                'DIRECTION DEPARTEMENTALE ABJ NORD 1',
                'DIRECTION DEPARTEMENTALE  DE DABOU',
                'DIRECTION REGIONALE ABIDJAN SUD',
                'DIRECTION DEPARTEMENTALE ABJ SUD 1',
                'DIRECTION REGIONALE DE GRAND-BASSAM',
                'DIRECTION DEPARTEMENTALE  ADZOPE',
                'DIRECTION DEPARTEMENTALE  AGBOVILLE',
                'DIRECTION REGIONALE D\'ABENGOUROU',
                'DIRECTION DEPARTEMENTALE DE DAOUKRO',
                'DIRECTION REGIONALE DE BOUAKE',
                'DIRECTION DEPARTEMENTALE KATIOLA',
                'DIRECTION REGIONALE DE BONDOUKOU',
                'DIRECTION DEPARTEMENTALE  BOUNA',
                'DIRECTION REGIONALE DE DALOA',
                'DIRECTION DEPARTEMENTALE  GAGNOA',
                'DIRECTION DEPARTEMENTALE DIVO',
                'DIRECTION REGIONALE DE MAN',
                'DIRECTION DEPARTEMENTALE GUIGLO',
                'DIRECTION DEPARTEMENTALE  DANANE',
                'DIRECTION REGIONALE DE SAN-PEDRO',
                'DIRECTION DEPARTEMENTALE  SOUBRE',
                'DIRECTION DEPARTEMENTALE  SASSANDRA',
                'DIRECTION REGIONALE DE KORHOGO',
                'DIRECTION DEPARTEMENTALE  BOUNDIALI',
                'DIRECTION DEPARTEMENTALE  FERKE',
                'DIRECTION REGIONALE D\'ODIENNE',
                'DIRECTION DEPARTEMENTALE TOUBA',
                'DIRECTION REGIONALE DE YAMOUSSOUKRO',
                'DIRECTION DEPARTEMENTALE  DIMBOKRO',
                'DIRECTION DEPARTEMENTALE  BOUAFLE',
                'DIRECTION REGIONALE DE SEGUELA',
                'DIRECTION DEPARTEMENTALE MANKONO',
                'BUREAU DE PARIS',
                'BUREAU DE MILAN',
                'BUREAU DE LONDRES (ROYAUME UNI)',
                'BUREAU DE BERLIN',
                'BUREAU DE GENEVE (SUISSE)',
                'BUREAU DE MADRID',
                'BUREAU DE WASHINGTON',
                'BUREAU DE LAGOS (NIGERIA)',
                'BUREAU DE BEIJING',
                'BUREAU DE PRETORIA',
                'BUREAU DE RIO DE JANEIRO',
                'BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N',
                'BUREAU DE OTTAWA (CANADA)',
                'BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN',
                'CONSEIL NATIONAL DU TOURISME',
                'FONDS DE DEVELOPPEMNT TOURISTIQUE',
                'DIRECT° GENERALE COTE D\'IVOIRE TOURISME',
                'DIRECT° RESSOURCES HUM. & MOY.GENERAUX',
                'DIRECT° DU BUDGET, DES FINANCES & DES MG',
                'DIRECT° MARKETING,COMMUNICAT° ET DES TIC',
                'DIRECT° DES RELATIONS EXTERIEURES',
                'INSTANCE D\'AFFECTATION'
            ];
            
            // Fonction pour normaliser le nom d'une direction pour la comparaison
            const normalizeDirectionName = (name) => {
                if (!name) return '';
                return name.toUpperCase()
                    .trim()
                    .replace(/\s+/g, ' ')
                    .replace(/°/g, '°')
                    .replace(/'/g, '\'');
            };
            
            // Créer un mapping de l'ordre
            const directionOrderMap = new Map();
            directionOrder.forEach((dirName, index) => {
                directionOrderMap.set(normalizeDirectionName(dirName), index);
            });
            
            // Fonction pour obtenir l'ordre d'une direction
            const getDirectionOrder = (directionName) => {
                const normalized = normalizeDirectionName(directionName);
                // Essayer une correspondance exacte
                if (directionOrderMap.has(normalized)) {
                    return directionOrderMap.get(normalized);
                }
                // Essayer une correspondance partielle (contient)
                for (const [key, value] of directionOrderMap.entries()) {
                    if (normalized.includes(key) || key.includes(normalized)) {
                        return value;
                    }
                }
                // Si pas trouvé, mettre à la fin
                return 99999;
            };
            
            // Grouper les données hiérarchiquement
            const groupedData = await groupAgentsHierarchically(filteredData);
            
            // Créer les en-têtes de colonnes - Même ordre que l'état des agents
            const headers = [
                '#', 'Matricule', 'Nom', 'Prénoms', 'Emploi', 'Grade', 'Echelon', 'Fonction',
                'Date de naissance', 'Date de Première prise de service', 'Date prise service Ministère', 'Date entree fonction',
                'Catégorie', 'Position', 'Adresse', 'Lieu de naissance',
                'Téléphone 1', 'Téléphone 2', 'Email', 'Nationalité', 'Statut agent', 'Statut emploi',
                'Situation Matrimoniale', 'Date de Mariage', 'Numéro acte de mariage', 'Nom de la conjointe', 'Nombre d\'enfants',
                'Entité', 'Direction', 'Date entree emploi', 'Date fin contrat', 'Date retraite',
                'Handicap', 'Pathologie'
            ];
            
            // Préparer toutes les données
            const allData = [];
            const mergeRanges = [];
            let globalIndex = 1;
            let totalAgentsMinistère = 0;
            
            // Titre principal
            allData.push(['ÉTAT DES AGENTS - RAPPORT HIÉRARCHIQUE']);
            allData.push([`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`]);
            allData.push([]);
            
            // Fonction helper pour construire une ligne d'agent dans l'ordre spécifié
            const buildAgentRow = (agent) => {
                const row = [globalIndex++];
                // Ordre exact des champs de l'état des agents
                row.push(agent.matricule || '-');
                row.push(agent.nom || '-');
                row.push(agent.prenom || '-');
                row.push(agent.emploi_libele || '-');
                row.push(agent.grade_libele || '-');
                row.push(agent.echelon_libelle || agent.echelon_libele || '-');
                row.push(agent.fonction_actuelle_libele || '-');
                row.push(formatDateSafe(agent.date_de_naissance));
                row.push(formatDateSafe(agent.date_prise_service_dans_la_direction));
                row.push(formatDateSafe(agent.date_prise_service_au_ministere));
                row.push(formatDateSafe(agent.fonction_date_entree));
                row.push(agent.categorie_libele || '-');
                row.push(agent.position_libelle || agent.position_libele || '-');
                row.push(agent.adresse || '-');
                row.push(agent.lieu_de_naissance || '-');
                row.push(agent.telephone1 || '-');
                row.push(agent.telephone2 || '-');
                row.push(agent.email || '-');
                row.push(agent.nationalite_libele || '-');
                row.push(agent.type_agent_libele || '-');
                row.push(agent.statut_emploi_libelle || agent.statut_emploi || '-');
                row.push(agent.situation_matrimoniale_libele || '-');
                row.push(formatDateSafe(agent.date_mariage));
                row.push(agent.numero_acte_mariage || '-');
                row.push(agent.nom_conjointe || '-');
                row.push(agent.nombre_enfants || agent.nombre_enfant || '-');
                row.push(agent.entite_nom || '-');
                row.push(agent.direction_libelle || '-');
                row.push(formatDateSafe(agent.emploi_date_entree));
                row.push(formatDateSafe(agent.date_fin_contrat));
                row.push(formatDateSafe(agent.date_retraite));
                row.push(agent.handicap_nom || agent.handicap || '-');
                row.push(agent.pathologie || '-');
                return row;
            };

            // Fonction pour exporter une direction et ses sous-éléments
            const exportDirection = (direction, indent = '') => {
                let totalAgentsDirection = 0;
                
                // 1. AGENTS DIRECTS DE LA DIRECTION (sans service ni sous-direction)
                if (direction.directAgents && direction.directAgents.length > 0) {
                    allData.push(headers);
                    
                    direction.directAgents.forEach(agent => {
                        allData.push(buildAgentRow(agent));
                    });
                    
                    totalAgentsDirection += direction.directAgents.length;
                    
                    // Total des agents directs de la direction
                    allData.push([]);
                    const directAgentsTotalRow = [`${indent}Total agents directs direction: ${direction.directAgents.length} agents`];
                    for (let i = 1; i < headers.length; i++) {
                        directAgentsTotalRow.push('');
                    }
                    allData.push(directAgentsTotalRow);
                    mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                    allData.push([]);
                }
                
                // 2. SERVICES DIRECTS DE LA DIRECTION
                if (direction.directServices && Object.keys(direction.directServices).length > 0) {
                    const realServices = Object.keys(direction.directServices).filter(serviceId => 
                        direction.directServices[serviceId].serviceName !== 'Agents sans service spécifique'
                    );
                    
                    const sortedServiceIds = realServices.sort((a, b) => {
                        const serviceA = direction.directServices[a];
                        const serviceB = direction.directServices[b];
                        return serviceA.serviceName.localeCompare(serviceB.serviceName);
                    });
                    
                    sortedServiceIds.forEach(serviceId => {
                        const service = direction.directServices[serviceId];
                        
                        allData.push([`${indent}  SERVICE DIRECT: ${service.serviceName}`]);
                        allData.push(headers);
                        
                        service.agents.forEach(agent => {
                            allData.push(buildAgentRow(agent));
                        });
                        
                        allData.push([]);
                        const serviceTotalRow = [`${indent}  Total Service Direct: ${service.agentCount} agents`];
                        for (let i = 1; i < headers.length; i++) {
                            serviceTotalRow.push(' ');
                        }
                        allData.push(serviceTotalRow);
                        allData.push([]);
                        
                        totalAgentsDirection += service.agentCount;
                    });
                }
                
                // 3. SOUS-DIRECTIONS
                if (direction.sousDirections && Object.keys(direction.sousDirections).length > 0) {
                    allData.push([`${indent}  Sous-Directions:`]);
                    allData.push([]);
                    
                    Object.keys(direction.sousDirections).forEach(sousDirectionId => {
                        const sousDirection = direction.sousDirections[sousDirectionId];
                        
                        allData.push([`${indent}    SOUS-DIRECTION: ${sousDirection.sousDirectionName}`]);
                        allData.push([]);
                        
                        let totalAgentsSousDirection = 0;
                        
                        // 3a. AGENTS DIRECTS DE SOUS-DIRECTION
                        if (sousDirection.directAgents && sousDirection.directAgents.length > 0) {
                            allData.push(headers);
                            
                            sousDirection.directAgents.forEach(agent => {
                                allData.push(buildAgentRow(agent));
                            });
                            
                            totalAgentsSousDirection += sousDirection.directAgents.length;
                            allData.push([]);
                        }
                        
                        // 3b. SERVICES DE SOUS-DIRECTION
                        if (sousDirection.services && Object.keys(sousDirection.services).length > 0) {
                            Object.keys(sousDirection.services).forEach(serviceId => {
                                const service = sousDirection.services[serviceId];
                                
                                allData.push([`${indent}      SERVICE: ${service.serviceName}`]);
                                allData.push(headers);
                                
                                service.agents.forEach(agent => {
                                    allData.push(buildAgentRow(agent));
                                });
                                
                                allData.push([]);
                                const serviceTotalRow = [`${indent}      Total Service: ${service.agentCount} agents`];
                                for (let i = 1; i < headers.length; i++) {
                                    serviceTotalRow.push(' ');
                                }
                                allData.push(serviceTotalRow);
                                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                                allData.push([]);
                                
                                totalAgentsSousDirection += service.agentCount;
                            });
                        }
                        
                        // Total sous-direction
                        allData.push([]);
                        const sousDirectionTotalRow = [`${indent}    TOTAL S/D: ${totalAgentsSousDirection} agents`];
                        for (let i = 1; i < headers.length; i++) {
                            sousDirectionTotalRow.push('');
                        }
                        allData.push(sousDirectionTotalRow);
                        mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                        allData.push([]);
                        
                        totalAgentsDirection += totalAgentsSousDirection;
                    });
                }
                
                return totalAgentsDirection;
            };

            

            // Collecter toutes les directions de toutes les Directions Générales avec leur contexte
            const allDirectionsWithContext = [];
            Object.keys(groupedData).forEach(dgId => {
                const directionGenerale = groupedData[dgId];
                Object.keys(directionGenerale.directions).forEach(directionId => {
                    const direction = directionGenerale.directions[directionId];
                    allDirectionsWithContext.push({
                        direction,
                        directionGenerale,
                        dgId
                    });
                });
            });
            
            // Trier toutes les directions selon l'ordre spécifié
            allDirectionsWithContext.sort((a, b) => {
                const orderA = getDirectionOrder(a.direction.directionName);
                const orderB = getDirectionOrder(b.direction.directionName);
                
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                
                // Si même ordre, trier alphabétiquement
                return a.direction.directionName.localeCompare(b.direction.directionName);
            });
            
            // Parcourir les directions triées
            let currentDgId = null;
            let totalAgentsDG = 0;
            let currentDgName = null;
            
            allDirectionsWithContext.forEach(({ direction, directionGenerale, dgId }) => {
                // Si on change de Direction Générale, afficher le total de la précédente et le titre de la nouvelle
                if (currentDgId !== dgId) {
                    // Afficher le total de la Direction Générale précédente (si elle existe)
                    if (currentDgId !== null && currentDgName !== 'Directions sans Direction Générale') {
                        allData.push([]);
                        const dgTotalRow = [`TOTAL DG ${currentDgName}: ${totalAgentsDG} agents`];
                        for (let i = 1; i < headers.length; i++) {
                            dgTotalRow.push('');
                        }
                        allData.push(dgTotalRow);
                        mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                        allData.push([]);
                        allData.push([]);
                    }
                    
                    // Initialiser pour la nouvelle Direction Générale
                    currentDgId = dgId;
                    currentDgName = directionGenerale.directionGeneraleName;
                    totalAgentsDG = 0;
                    
                    // Afficher le titre de la Direction Générale (sauf pour "Directions sans Direction Générale")
                    if (currentDgName !== 'Directions sans Direction Générale') {
                        allData.push([`DIRECTION GÉNÉRALE: ${currentDgName}`]);
                        allData.push([]);
                    }
                }
                
                // Titre de la direction
                const directionTitle = direction.directionCode 
                    ? `DIRECTION: ${direction.directionName} (${direction.directionCode})`
                    : `DIRECTION: ${direction.directionName}`;
                allData.push([directionTitle]);
                allData.push([]);
                
                const totalAgentsDirection = exportDirection(direction);
                totalAgentsDG += totalAgentsDirection;
                
                // Total de la direction
                allData.push([]);
                const directionTotalRow = [`TOTAL DIRECTION: ${totalAgentsDirection} agents`];
                for (let i = 1; i < headers.length; i++) {
                    directionTotalRow.push('');
                }
                allData.push(directionTotalRow);
                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                allData.push([]);
            });
            
            // Afficher le total de la dernière Direction Générale
            if (currentDgId !== null && currentDgName !== 'Directions sans Direction Générale') {
                allData.push([]);
                const dgTotalRow = [`TOTAL DG ${currentDgName}: ${totalAgentsDG} agents`];
                for (let i = 1; i < headers.length; i++) {
                    dgTotalRow.push('');
                }
                allData.push(dgTotalRow);
                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                allData.push([]);
                allData.push([]);
            }
            
            // Calculer le total du ministère en additionnant tous les totaux de directions
            // On recalcule en parcourant toutes les directions
            totalAgentsMinistère = 0;
            let tempDgId = null;
            let tempTotalDG = 0;
            allDirectionsWithContext.forEach(({ direction, dgId }) => {
                const totalAgentsDir = direction.totalAgents || 0;
                if (tempDgId !== dgId) {
                    if (tempDgId !== null) {
                        totalAgentsMinistère += tempTotalDG;
                    }
                    tempDgId = dgId;
                    tempTotalDG = totalAgentsDir;
                } else {
                    tempTotalDG += totalAgentsDir;
                }
            });
            // Ajouter le dernier total de DG
            if (tempDgId !== null) {
                totalAgentsMinistère += tempTotalDG;
            }
            
            // Total général du ministère
            allData.push([]);
            allData.push([]);
            
            const ministryTotalRow = [`TOTAL MIN: ${totalAgentsMinistère} agents`];
            // Remplir avec des espaces vides pour les autres colonnes
            for (let i = 1; i < headers.length; i++) {
                ministryTotalRow.push('');
            }
            allData.push(ministryTotalRow);
            mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
            
            // Créer le worksheet
            const worksheet = XLSX.utils.aoa_to_sheet(allData);
            
            // Définir les largeurs de colonnes optimisées
            // Définir les largeurs de colonnes - Même que l'état des agents
            const columnWidths = [
                5,   // # (numérotation)
                15,  // Matricule
                20,  // Nom
                25,  // Prénoms
                25,  // Emploi
                15,  // Grade
                15,  // Echelon
                25,  // Fonction
                15,  // Date de naissance
                15,  // Date de Première prise de service
                15,  // Date prise service Ministère
                15,  // Date entree fonction
                15,  // Catégorie
                15,  // Position
                30,  // Adresse
                25,  // Lieu de naissance
                15,  // Téléphone 1
                15,  // Téléphone 2
                30,  // Email
                15,  // Nationalité
                15,  // Statut agent
                15,  // Statut emploi
                20,  // Situation Matrimoniale
                15,  // Date de Mariage
                20,  // Numéro acte de mariage
                25,  // Nom de la conjointe
                15,  // Nombre d'enfants
                20,  // Entité
                25,  // Direction
                15,  // Date entree emploi
                15,  // Date fin contrat
                15,  // Date retraite
                15,  // Handicap
                15   // Pathologie
            ];
            
            // Appliquer les largeurs de colonnes
            worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));

            // Appliquer les fusions pour les lignes de totaux pour préserver la lisibilité
            if (mergeRanges.length > 0) {
                worksheet['!merges'] = [
                    ...(worksheet['!merges'] || []),
                    ...mergeRanges
                ];
            }
            
            // Créer le workbook et ajouter le worksheet
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport Hiérarchique');
            
            // Télécharger le fichier
            const fileName = `Rapport_Hierarchique_Agents_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            alert('Rapport hiérarchique exporté avec succès !');
            
        } catch (error) {
            console.error('Erreur lors de l\'export hiérarchique:', error);
            alert('Erreur lors de la génération du rapport hiérarchique');
        } finally {
            setLoading(false);
        }
    };

    // Fonction d'export Excel avec champs sélectionnés
    const executeExportExcel = () => {
        const dynamicTitle = getDynamicTitle();
        const { normalFields, directionFields } = getSelectedFieldsForDisplay();
        
        // Filtrer le champ "nom_complet" des champs normaux
        const filteredFields = normalFields.filter(field => 
            field.name !== 'nom_complet' && field.label !== 'Nom complet'
        );
        
        // Créer les en-têtes de colonnes pour les champs normaux (sans nom_complet)
        const headers = ['#', ...filteredFields.map(field => field.label)];
        
        // Ordre hiérarchique des structures du MTL
        const directionOrder = [
            'CABINET',
            'INSPECTION  GENERALE DU TOURISME ET DES LOISIRS',
            'DIRECTION DE LA COMMUNICATION ET LA DOCUMENTATION',
            'DIRECTION DU GUICHET UNIQUE',
            'DIRECTION DES AFFAIRES JURIDIQUES ET DU CONTENTIEUX',
            'DIRECTION DES AFFAIRES FINANCIERES',
            'DIRECTION DES RESSOURCES HUMAINES',
            'DIRECTION DE LA PLANIFICATION, DES STATISTIQUES ET DES PROJETS',
            'DIRECTION DE LA SECURITE TOURISTIQUE ET DES LOISIRS',
            'DIRECTION DE L\' INFORMATIQUE, DE LA DIGITALISATION ET DU DEVELOPPEMENT DES STARTUPS',
            'CELLULE DE PASSATION DES MARCHES PUBLICS',
            'GESTIONNAIRE DU PATRIMOINE',
            'DG INDUSTRIE TOURISTIQUE ET HOTELIERE',
            'DIRECTION DES ACTIVITES TOURISTIQUES',
            'DIR. COOPERATION ET PROFESSIONNALISATION',
            'DIRECTION DES SERVICES EXTERIEURS',
            'DIRECTION GENERALE DES LOISIRS',
            'DIRECTION DES PARCS DE LOISIRS, D\'ATTRACTION ET DES JEUX NUMERIQUES',
            'DIRECTION DE LA  VALORISATION, DE LA FORMATION ET DE LA PROMOTION DES JEUX TRADITIONNELS',
            'DIRECTION REGIONALE D\'ABIDJAN NORD',
            'DIRECTION DEPARTEMENTALE ABJ NORD 1',
            'DIRECTION DEPARTEMENTALE  DE DABOU',
            'DIRECTION REGIONALE ABIDJAN SUD',
            'DIRECTION DEPARTEMENTALE ABJ SUD 1',
            'DIRECTION REGIONALE DE GRAND-BASSAM',
            'DIRECTION DEPARTEMENTALE  ADZOPE',
            'DIRECTION DEPARTEMENTALE  AGBOVILLE',
            'DIRECTION REGIONALE D\'ABENGOUROU',
            'DIRECTION DEPARTEMENTALE DE DAOUKRO',
            'DIRECTION REGIONALE DE BOUAKE',
            'DIRECTION DEPARTEMENTALE KATIOLA',
            'DIRECTION REGIONALE DE BONDOUKOU',
            'DIRECTION DEPARTEMENTALE  BOUNA',
            'DIRECTION REGIONALE DE DALOA',
            'DIRECTION DEPARTEMENTALE  GAGNOA',
            'DIRECTION DEPARTEMENTALE DIVO',
            'DIRECTION REGIONALE DE MAN',
            'DIRECTION DEPARTEMENTALE GUIGLO',
            'DIRECTION DEPARTEMENTALE  DANANE',
            'DIRECTION REGIONALE DE SAN-PEDRO',
            'DIRECTION DEPARTEMENTALE  SOUBRE',
            'DIRECTION DEPARTEMENTALE  SASSANDRA',
            'DIRECTION REGIONALE DE KORHOGO',
            'DIRECTION DEPARTEMENTALE  BOUNDIALI',
            'DIRECTION DEPARTEMENTALE  FERKE',
            'DIRECTION REGIONALE D\'ODIENNE',
            'DIRECTION DEPARTEMENTALE TOUBA',
            'DIRECTION REGIONALE DE YAMOUSSOUKRO',
            'DIRECTION DEPARTEMENTALE  DIMBOKRO',
            'DIRECTION DEPARTEMENTALE  BOUAFLE',
            'DIRECTION REGIONALE DE SEGUELA',
            'DIRECTION DEPARTEMENTALE MANKONO',
            'BUREAU DE PARIS',
            'BUREAU DE MILAN',
            'BUREAU DE LONDRES (ROYAUME UNI)',
            'BUREAU DE BERLIN',
            'BUREAU DE GENEVE (SUISSE)',
            'BUREAU DE MADRID',
            'BUREAU DE WASHINGTON',
            'BUREAU DE LAGOS (NIGERIA)',
            'BUREAU DE BEIJING',
            'BUREAU DE PRETORIA',
            'BUREAU DE RIO DE JANEIRO',
            'BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N',
            'BUREAU DE OTTAWA (CANADA)',
            'BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN',
            'CONSEIL NATIONAL DU TOURISME',
            'FONDS DE DEVELOPPEMNT TOURISTIQUE',
            'DIRECT° GENERALE COTE D\'IVOIRE TOURISME',
            'DIRECT° RESSOURCES HUM. & MOY.GENERAUX',
            'DIRECT° DU BUDGET, DES FINANCES & DES MG',
            'DIRECT° MARKETING,COMMUNICAT° ET DES TIC',
            'DIRECT° DES RELATIONS EXTERIEURES',
            'INSTANCE D\'AFFECTATION'
        ];
        
        // Fonction pour normaliser le nom d'une direction pour la comparaison
        const normalizeDirectionName = (name) => {
            if (!name) return '';
            return name.toUpperCase()
                .trim()
                .replace(/\s+/g, ' ')
                .replace(/°/g, '°')
                .replace(/'/g, '\'');
        };
        
        // Créer un mapping de l'ordre
        const directionOrderMap = new Map();
        directionOrder.forEach((dirName, index) => {
            directionOrderMap.set(normalizeDirectionName(dirName), index);
        });
        
        // Fonction pour obtenir l'ordre d'une direction
        const getDirectionOrder = (directionName) => {
            const normalized = normalizeDirectionName(directionName);
            // Essayer une correspondance exacte
            if (directionOrderMap.has(normalized)) {
                return directionOrderMap.get(normalized);
            }
            // Essayer une correspondance partielle (contient)
            for (const [key, value] of directionOrderMap.entries()) {
                if (normalized.includes(key) || key.includes(normalized)) {
                    return value;
                }
            }
            // Si pas trouvé, mettre à la fin
            return 99999;
        };
        
        // Grouper les agents par direction
        const groupedData = groupAgentsByDirection(filteredData);
        
        // Trier les directions selon l'ordre spécifié
        const sortedDirectionIds = Object.keys(groupedData).sort((a, b) => {
            const groupA = groupedData[a];
            const groupB = groupedData[b];
            
            // Les agents sans direction vont à la fin
            if (a === 'agents_sans_direction') return 1;
            if (b === 'agents_sans_direction') return -1;
            
            const orderA = getDirectionOrder(groupA.directionName);
            const orderB = getDirectionOrder(groupB.directionName);
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            // Si même ordre, trier alphabétiquement
            return groupA.directionName.localeCompare(groupB.directionName);
        });
        
        // Préparer toutes les données
        const allData = [];
        let globalIndex = 1;
        let totalAgents = 0;
        
        // Parcourir chaque direction dans l'ordre trié
        sortedDirectionIds.forEach(directionId => {
            const group = groupedData[directionId];
            const agentsCount = group.agents.length;
            totalAgents += agentsCount;
            
            // Ajouter le titre de la direction - commencer à la colonne 1 (pas 0) pour ne pas affecter la colonne #
            const directionTitleRow = [''];
            directionTitleRow.push(group.directionName);
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                directionTitleRow.push('');
            }
            allData.push(directionTitleRow);
            allData.push([]); // Ligne vide
            
            // Ajouter les en-têtes pour cette direction
            allData.push(headers);
            
            // Ajouter les agents de cette direction
            group.agents.forEach(agent => {
                const row = [globalIndex++];
                filteredFields.forEach(field => {
                    // Gérer les variantes de noms de champs (ex: echelon_libele vs echelon_libelle)
                    let fieldValue = agent[field.name];
                    
                    // Gestion spéciale pour l'échelon (peut être echelon_libele ou echelon_libelle)
                    if (field.name === 'echelon_libele' && !fieldValue) {
                        fieldValue = agent.echelon_libelle || agent.echelon_libele;
                    }
                    
                    // Gestion spéciale pour position (peut être position_libelle ou position_libele)
                    if (field.name === 'position_libelle' && !fieldValue) {
                        fieldValue = agent.position_libele || agent.position_libelle;
                    }
                    
                    // Formater les dates avant de les ajouter
                    if (fieldValue && (
                        field.name.includes('date') || 
                        field.name.includes('Date') ||
                        field.name === 'date_naissance' ||
                        field.name === 'date_de_naissance' ||
                        field.name === 'date_embauche' ||
                        field.name === 'date_prise_service_au_ministere' ||
                        field.name === 'date_prise_service_dans_la_direction' ||
                        field.name === 'date_fin_contrat' ||
                        field.name === 'date_retraite' ||
                        field.name === 'date_mariage' ||
                        field.name === 'date_entree' ||
                        field.name === 'fonction_date_entree' ||
                        field.name === 'emploi_date_entree'
                    )) {
                        row.push(formatDateSafe(fieldValue));
                    } else {
                        row.push(fieldValue || '-');
                    }
                });
                allData.push(row);
            });
            
            // Ajouter le total pour cette direction
            allData.push([]); // Ligne vide
            // Le total commence à la colonne 1, la colonne 0 reste vide
            const totalRow = [''];
            totalRow.push(`Total - Nombre d'agents: ${agentsCount}`);
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                totalRow.push('');
            }
            allData.push(totalRow);
            allData.push([]); // Ligne vide entre les directions
        });
        
        // Ajouter le total général à la fin
        if (Object.keys(groupedData).length > 0) {
            // Le titre "TOTAL GÉNÉRAL" commence aussi à la colonne 1
            const grandTotalTitleRow = [''];
            grandTotalTitleRow.push('TOTAL GÉNÉRAL');
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                grandTotalTitleRow.push('');
            }
            allData.push(grandTotalTitleRow);
            allData.push([]); // Ligne vide
            // Le total général commence aussi à la colonne 1
            const grandTotalRow = [''];
            grandTotalRow.push(`Nombre total d'agents: ${totalAgents}`);
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                grandTotalRow.push('');
            }
            allData.push(grandTotalRow);
        }
        
        // Créer le worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(allData);
        
        // Définir les largeurs de colonnes optimisées
        const columnWidths = [];
        columnWidths.push(5); // N° (colonne étroite pour les numéros uniquement)
        filteredFields.forEach(field => {
            // Définir des largeurs appropriées selon le type de champ pour afficher toutes les informations
            switch(field.name) {
                case 'matricule':
                    columnWidths.push(15); // Réduit de 25 à 15
                    break;
                case 'email':
                    columnWidths.push(30); // Augmenté pour afficher les emails complets
                    break;
                case 'nom':
                    columnWidths.push(18); // Augmenté pour les noms complets
                    break;
                case 'prenom':
                    columnWidths.push(25); // Augmenté pour les prénoms complets
                    break;
                case 'lieu_naissance':
                    columnWidths.push(25); // Augmenté pour les lieux de naissance complets
                    break;
                case 'adresse':
                    columnWidths.push(30); // Augmenté pour les adresses complètes
                    break;
                case 'fonction_actuelle_libele':
                case 'emploi_libele':
                    columnWidths.push(25); // Augmenté pour les fonctions et emplois complets
                    break;
                case 'direction_libelle':
                case 'sous_direction_libelle':
                case 'service_libelle':
                    columnWidths.push(25); // Augmenté pour les noms complets
                    break;
                case 'ministere_nom':
                case 'entite_nom':
                    columnWidths.push(20); // Augmenté pour les noms complets
                    break;
                case 'telephone1':
                case 'telephone2':
                case 'telephone':
                    columnWidths.push(15); // Augmenté pour les numéros complets
                    break;
                case 'date_naissance':
                case 'date_embauche':
                case 'date_prise_service_au_ministere':
                case 'date_prise_service_dans_la_direction':
                case 'date_fin_contrat':
                case 'date_retraite':
                    columnWidths.push(15); // Augmenté pour les dates complètes
                    break;
                case 'nationalite_libele':
                case 'civilite':
                case 'civilité':
                    columnWidths.push(15); // Augmenté pour les libellés complets
                    break;
                case 'type_agent_libele':
                case 'statut_emploi':
                case 'statut_emploi_libelle':
                case 'mode_entree_libele':
                    columnWidths.push(15); // Augmenté pour les libellés complets
                    break;
                case 'situation_matrimoniale_libele':
                    columnWidths.push(20); // Augmenté pour les libellés complets
                    break;
                case 'grade_libele':
                case 'echelon_libelle':
                case 'echelon_libele':
                case 'categorie_libele':
                case 'position_libelle':
                case 'position_libele':
                    columnWidths.push(15); // Augmenté pour les libellés complets
                    break;
                case 'sexe':
                    columnWidths.push(8); // Colonne étroite pour M/F
                    break;
                case 'nombre_enfants':
                    columnWidths.push(12); // Colonne pour les nombres
                    break;
                default:
                    columnWidths.push(15); // Largeur par défaut augmentée
            }
        });
        
        // Ajouter des styles et bordures pour le tableau
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        let currentRow = 0;
        Object.keys(groupedData).forEach(directionId => {
            const group = groupedData[directionId];
            
            // Style pour le titre de la direction - fusionner uniquement sur les colonnes de données (pas sur la colonne #)
            // Le titre commence à la colonne 1, la colonne 0 reste vide
            const titleCellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[titleCellAddress]) {
                worksheet[titleCellAddress].s = {
                    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2E5984" } },
                    alignment: { horizontal: "left", vertical: "center", indent: 0, wrapText: false }
                };
                // Fusionner le titre de la direction uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                // La colonne 0 (#) reste indépendante et vide
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[titleCellAddress].s;
                    }
                }
            }
            currentRow += 2; // Titre + ligne vide
            
            // Style pour les en-têtes de cette direction
            for (let col = 0; col < headers.length; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "366092" } },
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                }
            }
            currentRow++;
            
            // Style pour les données de cette direction
            for (let i = 0; i < group.agents.length; i++) {
                for (let col = 0; col < headers.length; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
                    if (worksheet[cellAddress]) {
                        worksheet[cellAddress].s = {
                            border: {
                                top: { style: "thin", color: { rgb: "000000" } },
                                bottom: { style: "thin", color: { rgb: "000000" } },
                                left: { style: "thin", color: { rgb: "000000" } },
                                right: { style: "thin", color: { rgb: "000000" } }
                            },
                            alignment: { vertical: "center" }
                        };
                        
                        // Alternance de couleurs pour les lignes
                        if (i % 2 === 0) {
                            worksheet[cellAddress].s.fill = { fgColor: { rgb: "F8F9FA" } };
                        }
                    }
                }
                currentRow++;
            }
            
            // Style pour la ligne de total de cette direction - fusionner uniquement sur les colonnes de données
            currentRow++; // Ligne vide avant le total
            const totalCellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[totalCellAddress]) {
                worksheet[totalCellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "E8F4FD" } },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { horizontal: "center", vertical: "center" }
                };
                // Fusionner le total uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[totalCellAddress].s;
                    }
                }
            }
            currentRow += 2; // Total + ligne vide entre les directions
        });
        
        // Style pour le total général
        if (Object.keys(groupedData).length > 0) {
            // Style pour le titre "TOTAL GÉNÉRAL" - fusionner uniquement sur les colonnes de données
            // Le titre commence à la colonne 1, la colonne 0 reste vide
            const grandTotalTitleCell = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[grandTotalTitleCell]) {
                worksheet[grandTotalTitleCell].s = {
                    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "D32F2F" } },
                    alignment: { horizontal: "left", vertical: "center", indent: 0, wrapText: false }
                };
                // Fusionner le titre "TOTAL GÉNÉRAL" uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[grandTotalTitleCell].s;
                    }
                }
            }
            currentRow += 2; // Titre + ligne vide
            
            // Style pour la ligne de total général - fusionner uniquement sur les colonnes de données
            const grandTotalCellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[grandTotalCellAddress]) {
                worksheet[grandTotalCellAddress].s = {
                    font: { bold: true, size: 12 },
                    fill: { fgColor: { rgb: "FFCDD2" } },
                    border: {
                        top: { style: "medium", color: { rgb: "D32F2F" } },
                        bottom: { style: "medium", color: { rgb: "D32F2F" } },
                        left: { style: "medium", color: { rgb: "D32F2F" } },
                        right: { style: "medium", color: { rgb: "D32F2F" } }
                    },
                    alignment: { horizontal: "center", vertical: "center" }
                };
                // Fusionner le total général uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[grandTotalCellAddress].s;
                    }
                }
            }
        }
        
        // Appliquer les largeurs de colonnes APRÈS toutes les fusions pour éviter qu'elles soient affectées
        // Utiliser les largeurs définies explicitement plutôt que le calcul automatique
        worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
        
        
        
        // Créer le workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'États des Agents');
        
        // Générer le fichier Excel
        const fileName = `${dynamicTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        setFieldSelectionModal(false);
        setPendingExportAction(null);
    };

    // Fonction d'export PDF
    const handleExportPDF = () => {
        openFieldSelectionModal('pdf');
    };

    // Fonction d'export PDF avec champs sélectionnés
    const executeExportPDF = async () => {
        try {
            const pdf = new jsPDF('l', 'mm', 'a4');
            const dynamicTitle = getDynamicTitle();
            const { normalFields } = getSelectedFieldsForDisplay();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Ajouter le titre avec le nombre d'agents (centré)
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            const titleText = `${dynamicTitle} - ${filteredData.length} agent(s) trouvé(s)`;
            const titleWidth = pdf.getTextWidth(titleText);
            const titleX = (pageWidth - titleWidth) / 2;
            pdf.text(titleText, titleX, 20);
            
            // Ajouter la date (centrée)
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`;
            const dateWidth = pdf.getTextWidth(dateText);
            const dateX = (pageWidth - dateWidth) / 2;
            pdf.text(dateText, dateX, 30);

            // Créer le tableau directement dans le PDF sans html2canvas
            let yPosition = 45;
            const lineHeight = 8;
            const colWidth = (pageWidth - 40) / (normalFields.length + 1); // +1 pour le numéro
            
            // En-têtes du tableau
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            
            // Numéro
            pdf.text('#', 20, yPosition);
            
            // En-têtes des colonnes
            normalFields.forEach((field, index) => {
                const xPos = 20 + (index + 1) * colWidth;
                // Tronquer le texte si trop long
                const headerText = field.label.length > 15 ? field.label.substring(0, 15) + '...' : field.label;
                pdf.text(headerText, xPos, yPosition);
            });
            
            yPosition += lineHeight;
            
            // Ligne de séparation
            pdf.line(20, yPosition, pageWidth - 20, yPosition);
            yPosition += 3;
            
            // Données du tableau
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);
            
            filteredData.forEach((item, index) => {
                // Vérifier si on a besoin d'une nouvelle page
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                // Numéro de ligne
                pdf.text((index + 1).toString(), 20, yPosition);
                
                // Données des colonnes
                normalFields.forEach((field, colIndex) => {
                    const xPos = 20 + (colIndex + 1) * colWidth;
                    let cellValue = '-';
                    
                    if (field.isDirectionCount) {
                        // Pour les champs de direction, afficher "Oui" si l'agent appartient à cette direction
                        const belongsToDirection = item.id_direction === field.directionId;
                        cellValue = belongsToDirection ? 'Oui' : 'Non';
                    } else {
                        cellValue = formatFieldValue(item[field.name], field.name);
                    }
                    
                    // Tronquer le texte si trop long
                    const displayText = cellValue.toString().length > 20 ? 
                        cellValue.toString().substring(0, 20) + '...' : 
                        cellValue.toString();
                    
                    pdf.text(displayText, xPos, yPosition);
                });
                
                yPosition += lineHeight;
                
                // Ligne de séparation tous les 5 lignes
                if ((index + 1) % 5 === 0) {
                    pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
                    yPosition += 3;
                }
            });

            // Sauvegarder le PDF
            pdf.save(`${title}_${filteredData.length}_agents_${new Date().toISOString().split('T')[0]}.pdf`);
            setFieldSelectionModal(false);
            setPendingExportAction(null);
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
            setFieldSelectionModal(false);
            setPendingExportAction(null);
        }
    };

    // Fonction d'export Word (HTML)
    const handleExportWord = () => {
        openFieldSelectionModal('word');
    };

    // Nouvelle fonction d'export PDF hiérarchique
    const handleExportPDFHierarchical = async () => {
        try {
            setLoading(true);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const dynamicTitle = getDynamicTitle();
            const { normalFields } = getSelectedFieldsForDisplay();
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // Grouper les données hiérarchiquement
            const hierarchicalData = await groupAgentsHierarchically(filteredData);
            
            let yPosition = 20;
            const lineHeight = 7;
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Fonction pour ajouter une nouvelle page si nécessaire
            const checkPageBreak = (requiredSpace = 20) => {
                if (yPosition + requiredSpace > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                    return true;
                }
                return false;
            };
            
            // Titre principal
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text(`${dynamicTitle} - Rapport Hiérarchique`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;
            
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 20;
            
            let globalIndex = 1;
            let totalAgentsMinistère = 0;
            
            // Parcourir les Directions Générales, puis leurs Directions
            Object.keys(hierarchicalData).forEach(dgId => {
                const directionGenerale = hierarchicalData[dgId];
                
                // Titre Direction Générale (ne pas afficher pour "Directions sans Direction Générale")
                if (directionGenerale.directionGeneraleName !== 'Directions sans Direction Générale') {
                    checkPageBreak(15);
                    pdf.setFontSize(16);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`DIRECTION GÉNÉRALE: ${directionGenerale.directionGeneraleName}`, 20, yPosition);
                    yPosition += 12;
                }
                
                let totalAgentsDG = 0;
                
                // Parcourir les directions de cette Direction Générale
                Object.keys(directionGenerale.directions).forEach(directionId => {
                    const direction = directionGenerale.directions[directionId];
                    
                    checkPageBreak(15);
                    
                    // Titre de la direction
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`DIRECTION: ${direction.directionName}`, 20, yPosition);
                    yPosition += 10;
                
                let totalAgentsDirection = 0;
                
                // Agents directs de la direction (sans service ni sous-direction) EN PREMIER
                if (direction.directAgents && direction.directAgents.length > 0) {
                    checkPageBreak(20);
                    
                    // En-têtes pour les agents directs
                    pdf.setFontSize(8);
                    pdf.setFont(undefined, 'bold');
                    let xPosition = 40;
                    const colWidth = (pageWidth - 100) / normalFields.length;
                    
                    normalFields.forEach((field, index) => {
                        pdf.text(field.label.substring(0, 12), xPosition + (index * colWidth), yPosition);
                    });
                    yPosition += 5;
                    
                    // Ligne de séparation
                    pdf.line(40, yPosition, pageWidth - 40, yPosition);
                    yPosition += 3;
                    
                    // Agents directs de la direction
                    pdf.setFont(undefined, 'normal');
                    direction.directAgents.forEach(agent => {
                        checkPageBreak(10);
                        xPosition = 40;
                        normalFields.forEach((field, index) => {
                            const value = agent[field.name] || '-';
                            pdf.text(String(value).substring(0, 15), xPosition + (index * colWidth), yPosition);
                        });
                        yPosition += 5;
                    });
                    
                    totalAgentsDirection += direction.directAgents.length;
                    
                    // Total des agents directs de la direction
                    checkPageBreak(8);
                    pdf.setFont(undefined, 'bold');
                    pdf.setFontSize(10);
                    pdf.text(`Total agents directs direction: ${direction.directAgents.length} agents`, 30, yPosition);
                    yPosition += 12; // Espace après le total
                }
                
                // Services directs de la direction (sans sous-direction)
                if (direction.directServices) {
                    // Filtrer les services pour exclure le service virtuel "Agents sans service spécifique"
                    const realServices = Object.keys(direction.directServices).filter(serviceId => 
                        direction.directServices[serviceId].serviceName !== 'Agents sans service spécifique'
                    );
                    
                    // Trier les services par ordre alphabétique
                    const sortedServiceIds = realServices.sort((a, b) => {
                        const serviceA = direction.directServices[a];
                        const serviceB = direction.directServices[b];
                        return serviceA.serviceName.localeCompare(serviceB.serviceName);
                    });
                    
                    sortedServiceIds.forEach(serviceId => {
                        const service = direction.directServices[serviceId];
                        
                        checkPageBreak(20);
                        
                        // Titre du service direct
                        pdf.setFontSize(11);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`  SERVICE DIRECT: ${service.serviceName}`, 30, yPosition);
                        yPosition += 6;
                        
                        // En-têtes
                        pdf.setFontSize(8);
                        pdf.setFont(undefined, 'bold');
                        let xPosition = 40;
                        const colWidth = (pageWidth - 100) / normalFields.length;
                        
                        normalFields.forEach((field, index) => {
                            pdf.text(field.label.substring(0, 12), xPosition + (index * colWidth), yPosition);
                        });
                        yPosition += 5;
                        
                        // Ligne de séparation
                        pdf.line(40, yPosition, pageWidth - 40, yPosition);
                        yPosition += 3;
                        
                        // Agents
                        pdf.setFont(undefined, 'normal');
                        service.agents.forEach(agent => {
                            checkPageBreak(10);
                            xPosition = 40;
                            normalFields.forEach((field, index) => {
                                const value = agent[field.name] || '-';
                                pdf.text(String(value).substring(0, 15), xPosition + (index * colWidth), yPosition);
                            });
                            yPosition += 5;
                        });
                        
                        // Total du service direct
                        checkPageBreak(8);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`  Total Service Direct: ${service.agentCount} agents`, 50, yPosition);
                        yPosition += 10;
                        
                        totalAgentsDirection += service.agentCount;
                    });
                }
                
                // Parcourir les sous-directions
                Object.keys(direction.sousDirections).forEach(sousDirectionId => {
                    const sousDirection = direction.sousDirections[sousDirectionId];
                    
                    checkPageBreak(15);
                    
                    // Titre de la sous-direction
                    pdf.setFontSize(12);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`  SOUS-DIRECTION: ${sousDirection.sousDirectionName}`, 30, yPosition);
                    yPosition += 8;
                    
                    let totalAgentsSousDirection = 0;
                    
                    // Parcourir les services
                    Object.keys(sousDirection.services).forEach(serviceId => {
                        const service = sousDirection.services[serviceId];
                        
                        checkPageBreak(20);
                        
                        // Titre du service
                        pdf.setFontSize(11);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`    SERVICE: ${service.serviceName}`, 40, yPosition);
                        yPosition += 6;
                        
                        // En-têtes
                        pdf.setFontSize(8);
                        pdf.setFont(undefined, 'bold');
                        let xPosition = 50;
                        const colWidth = (pageWidth - 100) / normalFields.length;
                        
                        normalFields.forEach((field, index) => {
                            pdf.text(field.label.substring(0, 12), xPosition + (index * colWidth), yPosition);
                        });
                        yPosition += 5;
                        
                        // Ligne de séparation
                        pdf.line(50, yPosition, pageWidth - 50, yPosition);
                        yPosition += 3;
                        
                        // Agents
                        pdf.setFont(undefined, 'normal');
                        service.agents.forEach(agent => {
                            checkPageBreak(10);
                            xPosition = 50;
                            normalFields.forEach((field, index) => {
                                const value = agent[field.name] || '-';
                                pdf.text(String(value).substring(0, 15), xPosition + (index * colWidth), yPosition);
                            });
                            yPosition += 5;
                        });
                        
                        // Total du service
                        checkPageBreak(8);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`    Total Service: ${service.agentCount} agents`, 60, yPosition);
                        yPosition += 8;
                        
                        totalAgentsSousDirection += service.agentCount;
                    });
                    
                    // Total de la sous-direction
                    checkPageBreak(8);
                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`  TOTAL SOUS-DIRECTION: ${totalAgentsSousDirection} agents`, 40, yPosition);
                    yPosition += 10;
                    
                    totalAgentsDirection += totalAgentsSousDirection;
                });
                
                    // Total de la direction
                    checkPageBreak(10);
                    pdf.setFontSize(12);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`TOTAL DIRECTION: ${totalAgentsDirection} agents`, 30, yPosition);
                    yPosition += 15;
                    
                    totalAgentsDG += totalAgentsDirection;
                });
                
                // Total Direction Générale (ne pas afficher pour "Directions sans Direction Générale")
                if (directionGenerale.directionGeneraleName !== 'Directions sans Direction Générale') {
                    checkPageBreak(12);
                    pdf.setFontSize(14);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`TOTAL DG ${directionGenerale.directionGeneraleName}: ${totalAgentsDG} agents`, 20, yPosition);
                    yPosition += 15;
                }
                
                totalAgentsMinistère += totalAgentsDG;
            });
            
            // Total général
            checkPageBreak(15);
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(`TOTAL GÉNÉRAL DU MINISTÈRE: ${totalAgentsMinistère} agents`, pageWidth / 2, yPosition, { align: 'center' });
            
            // Télécharger le PDF
            const fileName = `${dynamicTitle}_Rapport_Hierarchique_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF hiérarchique:', error);
            alert('Erreur lors de la génération du rapport PDF hiérarchique');
        } finally {
            setLoading(false);
        }
    };

    // Nouvelle fonction d'export Word hiérarchique
    const handleExportWordHierarchical = async () => {
        try {
            setLoading(true);
            const dynamicTitle = getDynamicTitle();
            const { normalFields } = getSelectedFieldsForDisplay();
            
            // Grouper les données hiérarchiquement
            const hierarchicalData = await groupAgentsHierarchically(filteredData);
            
            let globalIndex = 1;
            let totalAgentsMinistère = 0;
            
            // Construire le HTML hiérarchique
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${dynamicTitle} - Rapport Hiérarchique</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                        .direction { font-size: 16px; font-weight: bold; margin: 15px 0 10px 0; color: #2E5984; }
                        .sous-direction { font-size: 14px; font-weight: bold; margin: 12px 0 8px 20px; color: #366092; }
                        .service { font-size: 12px; font-weight: bold; margin: 10px 0 5px 40px; color: #2F4F4F; }
                        .total { font-weight: bold; background-color: #E8F4FD; padding: 5px; margin: 5px 0; }
                        .grand-total { font-size: 16px; font-weight: bold; background-color: #D4EDDA; padding: 10px; margin: 15px 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #366092; color: white; font-weight: bold; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                        .agent-count { font-weight: bold; color: #2E5984; }
                    </style>
                </head>
                <body>
                    <div class="title">${dynamicTitle} - Rapport Hiérarchique</div>
                    <div style="text-align: center; margin-bottom: 30px;">Généré le: ${new Date().toLocaleDateString('fr-FR')}</div>
            `;
            
            // Parcourir les Directions Générales, puis leurs Directions
            Object.keys(hierarchicalData).forEach(dgId => {
                const directionGenerale = hierarchicalData[dgId];
                
                // Titre Direction Générale (ne pas afficher pour "Directions sans Direction Générale")
                if (directionGenerale.directionGeneraleName !== 'Directions sans Direction Générale') {
                    htmlContent += `<div class="direction" style="font-size: 18px; margin-top: 20px;">DIRECTION GÉNÉRALE: ${directionGenerale.directionGeneraleName}</div>`;
                }
                
                let totalAgentsDG = 0;
                
                // Parcourir les directions de cette Direction Générale
                Object.keys(directionGenerale.directions).forEach(directionId => {
                    const direction = directionGenerale.directions[directionId];
                    
                    htmlContent += `<div class="direction">DIRECTION: ${direction.directionName}</div>`;
                    
                    let totalAgentsDirection = 0;
                
                // Agents directs de la direction (sans service ni sous-direction) EN PREMIER
                if (direction.directAgents && direction.directAgents.length > 0) {
                    // Tableau des agents directs
                    htmlContent += `
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    ${normalFields.map(field => `<th>${field.label}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    direction.directAgents.forEach(agent => {
                        htmlContent += `<tr><td>${globalIndex++}</td>`;
                        normalFields.forEach(field => {
                            htmlContent += `<td>${agent[field.name] || '-'}</td>`;
                        });
                        htmlContent += '</tr>';
                    });
                    
                    htmlContent += '</tbody></table>';
                    totalAgentsDirection += direction.directAgents.length;
                    
                    // Total des agents directs de la direction
                    htmlContent += `<div class="total">Total agents directs direction: <span class="agent-count">${direction.directAgents.length} agents</span></div>`;
                }
                
                // Services directs de la direction (sans sous-direction)
                if (direction.directServices) {
                    // Filtrer les services pour exclure le service virtuel "Agents sans service spécifique"
                    const realServices = Object.keys(direction.directServices).filter(serviceId => 
                        direction.directServices[serviceId].serviceName !== 'Agents sans service spécifique'
                    );
                    
                    // Trier les services par ordre alphabétique
                    const sortedServiceIds = realServices.sort((a, b) => {
                        const serviceA = direction.directServices[a];
                        const serviceB = direction.directServices[b];
                        return serviceA.serviceName.localeCompare(serviceB.serviceName);
                    });
                    
                    sortedServiceIds.forEach(serviceId => {
                        const service = direction.directServices[serviceId];
                        
                        htmlContent += `<div class="service">SERVICE DIRECT: ${service.serviceName}</div>`;
                        
                        // Tableau des agents
                        if (service.agents.length > 0) {
                            htmlContent += `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            ${normalFields.map(field => `<th>${field.label}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;
                            
                            service.agents.forEach(agent => {
                                htmlContent += `<tr><td>${globalIndex++}</td>`;
                                normalFields.forEach(field => {
                                    htmlContent += `<td>${agent[field.name] || '-'}</td>`;
                                });
                                htmlContent += '</tr>';
                            });
                            
                            htmlContent += '</tbody></table>';
                        }
                        
                        // Total du service direct
                        htmlContent += `<div class="total">Total Service Direct: <span class="agent-count">${service.agentCount} agents</span></div>`;
                        
                        totalAgentsDirection += service.agentCount;
                    });
                }
                
                // Parcourir les sous-directions
                Object.keys(direction.sousDirections).forEach(sousDirectionId => {
                    const sousDirection = direction.sousDirections[sousDirectionId];
                    
                    htmlContent += `<div class="sous-direction">SOUS-DIRECTION: ${sousDirection.sousDirectionName}</div>`;
                    
                    let totalAgentsSousDirection = 0;
                    
                    // Parcourir les services
                    Object.keys(sousDirection.services).forEach(serviceId => {
                        const service = sousDirection.services[serviceId];
                        
                        htmlContent += `<div class="service">SERVICE: ${service.serviceName}</div>`;
                        
                        // Tableau des agents
                        if (service.agents.length > 0) {
                            htmlContent += `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            ${normalFields.map(field => `<th>${field.label}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;
                            
                            service.agents.forEach(agent => {
                                htmlContent += `<tr><td>${globalIndex++}</td>`;
                                normalFields.forEach(field => {
                                    htmlContent += `<td>${agent[field.name] || '-'}</td>`;
                                });
                                htmlContent += '</tr>';
                            });
                            
                            htmlContent += '</tbody></table>';
                        }
                        
                        // Total du service
                        htmlContent += `<div class="total">Total Service: <span class="agent-count">${service.agentCount} agents</span></div>`;
                        
                        totalAgentsSousDirection += service.agentCount;
                    });
                    
                    // Total de la sous-direction
                    htmlContent += `<div class="total">TOTAL SOUS-DIRECTION: <span class="agent-count">${totalAgentsSousDirection} agents</span></div>`;
                    
                    totalAgentsDirection += totalAgentsSousDirection;
                });
                
                    // Total de la direction
                    htmlContent += `<div class="total">TOTAL DIRECTION: <span class="agent-count">${totalAgentsDirection} agents</span></div>`;
                    
                    totalAgentsDG += totalAgentsDirection;
                });
                
                // Total Direction Générale (ne pas afficher pour "Directions sans Direction Générale")
                if (directionGenerale.directionGeneraleName !== 'Directions sans Direction Générale') {
                    htmlContent += `<div class="total" style="font-size: 14px; margin: 15px 0;">TOTAL DG ${directionGenerale.directionGeneraleName}: <span class="agent-count">${totalAgentsDG} agents</span></div>`;
                }
                
                totalAgentsMinistère += totalAgentsDG;
            });
            
            // Total général
            htmlContent += `<div class="grand-total">TOTAL GÉNÉRAL DU MINISTÈRE: ${totalAgentsMinistère} agents</div>`;
            
            htmlContent += '</body></html>';
            
            // Créer et télécharger le fichier Word
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const fileName = `${dynamicTitle}_Rapport_Hierarchique_${new Date().toISOString().split('T')[0]}.doc`;
            saveAs(blob, fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'export Word hiérarchique:', error);
            alert('Erreur lors de la génération du rapport Word hiérarchique');
        } finally {
            setLoading(false);
        }
    };

    // Fonction d'export Word avec champs sélectionnés
    const executeExportWord = () => {
        const dynamicTitle = getDynamicTitle();
        const { normalFields } = getSelectedFieldsForDisplay();

        // Créer le tableau HTML avec les champs sélectionnés
        const tableHTML = `
            <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">#</th>
                        ${normalFields.map(field => 
                            `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${field.label}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map((item, index) => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                            ${normalFields.map(field => {
                                let cellValue = '-';
                                if (field.isDirectionCount) {
                                    // Pour les champs de direction, afficher "Oui" si l'agent appartient à cette direction
                                    const belongsToDirection = item.id_direction === field.directionId;
                                    cellValue = belongsToDirection ? 'Oui' : 'Non';
                                } else {
                                    cellValue = formatFieldValue(item[field.name], field.name);
                                }
                                return `<td style="border: 1px solid #ddd; padding: 8px;">${cellValue}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${dynamicTitle} - ${filteredData.length} agent(s) trouvé(s)</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { color: #333; margin-bottom: 10px; text-align: center; }
                    .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>${dynamicTitle}</h1>
                <div class="subtitle">
                    <strong>${filteredData.length} agent(s) trouvé(s)</strong><br>
                    Généré le ${new Date().toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
                ${tableHTML}
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'application/msword' });
        saveAs(blob, `${title}_${filteredData.length}_agents_${new Date().toISOString().split('T')[0]}.doc`);
        setFieldSelectionModal(false);
        setPendingExportAction(null);
    };

    // Fonction de rafraîchissement
    const handleRefresh = () => {
        loadData();
    };

    // Gestion des filtres
    const handleFilterChange = (filterName, value) => {
        setFilterValues(prev => ({
            ...prev,
            [filterName]: value
        }));
        
        // Exécuter la fonction onChange personnalisée si elle existe
        const filter = filters.find(f => f.name === filterName);
        if (filter && filter.onChange) {
            filter.onChange(value);
        }
    };

    // Initialiser les champs disponibles et sélectionnés
    useEffect(() => {
        const allFields = fields.filter(field => field.name !== 'id');
        setAvailableFields(allFields);
        setSelectedFields(allFields.map(field => field.name));
    }, [fields]);

    // Effet pour charger les données
    useEffect(() => {
        if (apiEndpoint === 'agents') {
            // Utiliser la fonction de chargement hiérarchique pour les agents
            loadHierarchicalData();
        } else {
            // Utiliser la fonction de chargement normale pour les autres endpoints
            loadData();
        }
    }, [apiEndpoint, filterValues]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
                <Spinner color="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                Erreur: {error}
            </Alert>
        );
    }

    return (
        <div className="reports-page">
            <div className="container-fluid">
                {/* En-tête */}
                <div className="page-header mb-4">
                    <Row className="align-items-center">
                    <Col>
                        <h1 className="page-title">{title}</h1>
                        {description && <p className="page-description">{description}</p>}
                    </Col>
                    <Col className="text-end">
                        <Button
                            color="secondary"
                            outline
                            onClick={() => history.goBack()}
                            className="me-2"
                        >
                            <MdArrowBack className="me-1" />
                            Retour
                        </Button>
                        <Button 
                            color="primary" 
                            onClick={handleRefresh}
                            className="me-2"
                        >
                            <MdRefresh className="me-1" />
                            Actualiser
                        </Button>
                        <Button 
                            color="info" 
                            onClick={() => setFieldSelectionModal(true)}
                            className="me-2"
                            title="Sélectionner les champs à imprimer"
                        >
                            <MdSettings className="me-1" />
                            Champs
                        </Button>
                        <Dropdown isOpen={exportDropdownOpen} toggle={() => setExportDropdownOpen(!exportDropdownOpen)}>
                            <DropdownToggle color="success" caret>
                                <MdFileDownload className="me-1" />
                                Exporter
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem onClick={handlePrint}>
                                    <MdPrint className="me-2" />
                                    Imprimer
                                </DropdownItem>
                                <DropdownItem onClick={handleExportExcel}>
                                    <MdTableChart className="me-2" />
                                    Excel (.xlsx)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportExcelHierarchical}>
                                    <MdTableChart className="me-2" />
                                    Excel Hiérarchique (.xlsx)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportPDF}>
                                    <MdPictureAsPdf className="me-2" />
                                    PDF (.pdf)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportPDFHierarchical}>
                                    <MdPictureAsPdf className="me-2" />
                                    PDF Hiérarchique (.pdf)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportWord}>
                                    <MdDescription className="me-2" />
                                    Word (.doc)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportWordHierarchical}>
                                    <MdDescription className="me-2" />
                                    Word Hiérarchique (.doc)
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                </Row>
            </div>

            {/* Filtres et recherche */}
            <Card className="mb-4">
                <CardHeader>
                    <CardTitle>
                        <MdFilterList className="me-2" />
                        Filtres et Recherche
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <Row>
                        <Col md={6}>
                            <InputGroup>
                                <InputGroupAddon addonType="prepend">
                                    <InputGroupText>
                                        <MdSearch />
                                    </InputGroupText>
                                </InputGroupAddon>
                                <Input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        {filters.map((filter, index) => (
                            <Col md={3} key={index}>
                                <FormGroup>
                                    <Label>{filter.label}</Label>
                                    <Input
                                        type={filter.type || 'select'}
                                        value={filterValues[filter.name] || ''}
                                        onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                                    >
                                        {filter.options && filter.options.map((option, optIndex) => (
                                            <option key={optIndex} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                        ))}
                    </Row>
                </CardBody>
            </Card>

            {/* Tableau des données */}
            <Card>
                <CardHeader>
                    <Row className="align-items-center">
                        <Col>
                            <CardTitle>
                                Données ({filteredData.length} éléments)
                            </CardTitle>
                        </Col>
                        <Col className="text-end">
                            <FormGroupCheckbox className="mb-0">
                                <Label className="mb-0">
                                    <CustomInput
                                        type="checkbox"
                                        id="show-only-selected"
                                        checked={showOnlySelectedFields}
                                        onChange={(e) => setShowOnlySelectedFields(e.target.checked)}
                                    />
                                    Afficher seulement les champs sélectionnés pour l'impression
                                </Label>
                            </FormGroupCheckbox>
                        </Col>
                    </Row>
                </CardHeader>
                <CardBody style={{ padding: '15px', width: '100%', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ 
                        maxWidth: '100%', 
                        overflowX: 'scroll', 
                        overflowY: 'visible',
                        width: '100%',
                        display: 'block',
                        position: 'relative'
                    }}>
                        <Table 
                            hover 
                            id="report-table" 
                            className="table table-bordered table-striped"
                            style={{ 
                                width: '100%', 
                                tableLayout: 'auto',
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                                display: 'table',
                                margin: 0,
                                minWidth: 'max-content'
                            }}
                        >
                            <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ 
                                        whiteSpace: 'nowrap', 
                                        padding: '10px 8px',
                                        border: '1px solid #dee2e6',
                                        backgroundColor: '#f8f9fa',
                                        fontWeight: 'bold',
                                        textAlign: 'left',
                                        minWidth: '50px',
                                        width: '50px'
                                    }}>#</th>
                                    {getFieldsToDisplay().map((field, index) => (
                                        <th 
                                            key={index} 
                                            style={{ 
                                                whiteSpace: 'nowrap', 
                                                padding: '10px 8px',
                                                border: '1px solid #dee2e6',
                                                backgroundColor: '#f8f9fa',
                                                fontWeight: 'bold',
                                                textAlign: 'left',
                                                minWidth: '120px'
                                            }}
                                        >
                                            {field.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((item, index) => (
                                    <tr key={startIndex + index} style={{ borderBottom: '1px solid #dee2e6' }}>
                                        <td style={{ 
                                            whiteSpace: 'nowrap', 
                                            padding: '8px',
                                            border: '1px solid #dee2e6',
                                            textAlign: 'center',
                                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                            width: '50px'
                                        }}>
                                            {startIndex + index + 1}
                                        </td>
                                        {getFieldsToDisplay().map((field, fieldIndex) => (
                                            <td 
                                                key={fieldIndex} 
                                                style={{ 
                                                    whiteSpace: 'normal', 
                                                    wordBreak: 'break-word', 
                                                    overflowWrap: 'break-word',
                                                    padding: '8px',
                                                    border: '1px solid #dee2e6',
                                                    verticalAlign: 'top',
                                                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                                    maxWidth: '300px',
                                                    minWidth: '120px'
                                                }}
                                            >
                                                {formatFieldValue(item[field.name], field.name)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <div>
                                <span className="text-muted">
                                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} agent(s)
                                </span>
                            </div>
                            <Pagination>
                                <PaginationItem disabled={currentPage === 1}>
                                    <PaginationLink previous onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} />
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                    // Afficher seulement les pages proches de la page courante
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 2 && page <= currentPage + 2)
                                    ) {
                                        return (
                                            <PaginationItem key={page} active={page === currentPage}>
                                                <PaginationLink onClick={() => setCurrentPage(page)}>
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    } else if (
                                        page === currentPage - 3 ||
                                        page === currentPage + 3
                                    ) {
                                        return (
                                            <PaginationItem key={page} disabled>
                                                <PaginationLink>...</PaginationLink>
                                            </PaginationItem>
                                        );
                                    }
                                    return null;
                                })}
                                <PaginationItem disabled={currentPage === totalPages}>
                                    <PaginationLink next onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} />
                                </PaginationItem>
                            </Pagination>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal de sélection des champs pour l'impression */}
            <Modal isOpen={fieldSelectionModal} toggle={() => setFieldSelectionModal(false)} size="lg">
                <ModalHeader toggle={() => setFieldSelectionModal(false)}>
                    <MdSettings className="me-2" />
                    {pendingExportAction === 'print' && 'Sélection des champs à imprimer'}
                    {pendingExportAction === 'excel' && 'Sélection des champs pour Excel'}
                    {pendingExportAction === 'pdf' && 'Sélection des champs pour PDF'}
                    {pendingExportAction === 'word' && 'Sélection des champs pour Word'}
                    {!pendingExportAction && 'Sélection des champs'}
                </ModalHeader>
                <ModalBody>
                    <Alert color="info" className="mb-3">
                        <strong>
                            {pendingExportAction === 'print' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'impression :'}
                            {pendingExportAction === 'excel' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'export Excel :'}
                            {pendingExportAction === 'pdf' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'export PDF :'}
                            {pendingExportAction === 'word' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'export Word :'}
                            {!pendingExportAction && 'Sélectionnez les champs que vous souhaitez afficher :'}
                        </strong>
                    </Alert>
                    
                    <Row>
                        <Col md={6}>
                            <FormGroupCheckbox>
                                <Label>
                                    <CustomInput
                                        type="checkbox"
                                        id="select-all"
                                        checked={selectedFields.length === availableFields.length}
                                        onChange={(e) => toggleAllFields(e.target.checked)}
                                    />
                                    <strong>Sélectionner tout</strong>
                                </Label>
                            </FormGroupCheckbox>
                        </Col>
                        <Col md={6} className="text-end">
                            <small className="text-muted">
                                {selectedFields.length} champ(s) sélectionné(s) sur {availableFields.length}
                            </small>
                        </Col>
                    </Row>

                    <hr />

                    <Row>
                        {availableFields.map((field, index) => (
                            <Col md={6} key={index}>
                                <FormGroupCheckbox>
                                    <Label>
                                        <CustomInput
                                            type="checkbox"
                                            id={`field-${field.name}`}
                                            checked={selectedFields.includes(field.name)}
                                            onChange={(e) => handleFieldSelection(field.name, e.target.checked)}
                                        />
                                        {field.label}
                                    </Label>
                                </FormGroupCheckbox>
                            </Col>
                        ))}
                    </Row>

                    {selectedFields.length === 0 && (
                        <Alert color="warning" className="mt-3">
                            <strong>Attention :</strong> Aucun champ n'est sélectionné. Veuillez sélectionner au moins un champ.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="success" 
                        onClick={() => {
                            setShowOnlySelectedFields(true);
                            setFieldSelectionModal(false);
                        }}
                        className="me-2"
                        disabled={selectedFields.length === 0}
                    >
                        <MdSettings className="me-1" />
                        Appliquer au tableau
                    </Button>
                    <Button 
                        color="primary" 
                        onClick={executePendingAction}
                        disabled={selectedFields.length === 0}
                        className="me-2"
                    >
                        {pendingExportAction === 'print' && <MdPrint className="me-1" />}
                        {pendingExportAction === 'excel' && <MdTableChart className="me-1" />}
                        {pendingExportAction === 'pdf' && <MdPictureAsPdf className="me-1" />}
                        {pendingExportAction === 'word' && <MdDescription className="me-1" />}
                        {pendingExportAction === 'print' && 'Continuer vers l\'impression'}
                        {pendingExportAction === 'excel' && 'Exporter en Excel'}
                        {pendingExportAction === 'pdf' && 'Exporter en PDF'}
                        {pendingExportAction === 'word' && 'Exporter en Word'}
                    </Button>
                    <Button color="secondary" onClick={() => setFieldSelectionModal(false)}>
                        Annuler
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal d'impression */}
            <Modal isOpen={printModal} toggle={() => setPrintModal(false)} size="lg">
                <ModalHeader toggle={() => setPrintModal(false)}>
                    Aperçu avant impression
                </ModalHeader>
                <ModalBody>
                    <div className="print-preview">
                        <h2 style={{ textAlign: 'center' }}>{getDynamicTitle()}</h2>
                        <p style={{ textAlign: 'center' }}><strong>{printData.length} agent(s) trouvé(s)</strong></p>
                        <p style={{ textAlign: 'center' }}>Généré le {new Date().toLocaleDateString('fr-FR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                        <Table hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    {getSelectedFieldsForDisplay().normalFields.map((field, index) => (
                                        <th key={index}>{field.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {printData.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        {getSelectedFieldsForDisplay().normalFields.map((field, fieldIndex) => (
                                            <td key={fieldIndex}>
                                                {formatFieldValue(item[field.name], field.name)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => window.print()}>
                        <MdPrint className="me-1" />
                        Imprimer
                    </Button>
                    <Button color="secondary" onClick={() => setPrintModal(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <style>{`
                .reports-page {
                    padding: 20px;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                .reports-page .container-fluid {
                    width: 100%;
                    max-width: 100%;
                    padding-left: 15px;
                    padding-right: 15px;
                    box-sizing: border-box;
                    margin: 0 auto;
                }
                .page-title {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                .page-description {
                    color: #666;
                    margin-bottom: 0;
                }
                .print-preview {
                    max-height: 70vh;
                    overflow-y: auto;
                }
                #report-table {
                    width: 100% !important;
                    table-layout: auto !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    display: table !important;
                    margin: 0 !important;
                    min-width: max-content !important;
                }
                #report-table thead {
                    display: table-header-group !important;
                }
                #report-table tbody {
                    display: table-row-group !important;
                }
                #report-table tr {
                    display: table-row !important;
                }
                #report-table th,
                #report-table td {
                    display: table-cell !important;
                    padding: 8px !important;
                    vertical-align: top !important;
                    border: 1px solid #dee2e6 !important;
                    box-sizing: border-box !important;
                }
                #report-table th {
                    background-color: #f8f9fa !important;
                    font-weight: bold !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 10 !important;
                }
                .table-responsive {
                    display: block !important;
                    width: 100% !important;
                    overflow-x: scroll !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                .table-responsive::-webkit-scrollbar {
                    height: 12px;
                }
                .table-responsive::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 6px;
                }
                .table-responsive::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 6px;
                }
                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .table-responsive {
                        overflow-x: visible !important;
                    }
                }
            `}</style>
            </div>
        </div>
    );
};

export default ReportsPage;
