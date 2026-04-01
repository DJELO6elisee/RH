import React, { useState, useEffect } from 'react';
import ManagementPage from 'components/ManagementPage';
import Page from 'components/Page';
import {
    Card,
    CardBody,
    Button,
    Row,
    Col,
    Input,
    FormGroup,
    Label,
    Table,
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
    Badge
} from 'reactstrap';
import { MdSchool, MdFilterList, MdAdd, MdArrowBack, MdFileDownload, MdPictureAsPdf, MdDescription, MdPrint, MdTableChart, MdSearch, MdVisibility } from 'react-icons/md';
import { useAuth } from 'contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

const DiplomesPage = () => {
    const { user } = useAuth();
    const [view, setView] = useState('menu'); // 'menu', 'create', 'filter'
    const [diplomes, setDiplomes] = useState([]);
    const [loadingDiplomes, setLoadingDiplomes] = useState(false);
    const [directions, setDirections] = useState([]);
    const [sousDirections, setSousDirections] = useState([]);
    const [services, setServices] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);
    
    // Filtres
    const [selectedDiplome, setSelectedDiplome] = useState('');
    const [selectedDirection, setSelectedDirection] = useState('');
    const [selectedSousDirection, setSelectedSousDirection] = useState('');
    const [selectedService, setSelectedService] = useState('');
    
    // Recherche d'agent spécifique
    const [searchAgent, setSearchAgent] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [agentDiplomes, setAgentDiplomes] = useState([]);
    const [loadingAgentDiplomes, setLoadingAgentDiplomes] = useState(false);
    const [showAgentDiplomesModal, setShowAgentDiplomesModal] = useState(false);

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && token !== 'null' && token !== 'undefined' && token.trim() !== '' && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Fonction pour obtenir l'URL de l'API
    const getApiUrl = () => {
        if (process.env.REACT_APP_API_URL) {
            return process.env.REACT_APP_API_URL;
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'https://tourisme.2ise-groupe.com';
        }
        return 'https://tourisme.2ise-groupe.com';
    };

    // Charger les diplômes
    useEffect(() => {
        if (view === 'filter') {
            loadDiplomes();
            loadDirections();
        }
    }, [view]);

    // Charger les sous-directions quand une direction est sélectionnée
    useEffect(() => {
        if (selectedDirection && view === 'filter') {
            loadSousDirections(selectedDirection);
        } else {
            setSousDirections([]);
            setSelectedSousDirection('');
        }
    }, [selectedDirection, view]);

    // Charger les services quand une sous-direction est sélectionnée ou quand une direction est sélectionnée (sans sous-direction)
    useEffect(() => {
        if (view === 'filter') {
            if (selectedSousDirection) {
                loadServices(null, selectedSousDirection);
            } else if (selectedDirection) {
                loadServices(selectedDirection, null);
            } else {
                setServices([]);
                setSelectedService('');
            }
        }
    }, [selectedSousDirection, selectedDirection, view]);

    // Filtrer les agents dynamiquement quand les filtres changent (avec debounce)
    useEffect(() => {
        if (view !== 'filter') {
            return;
        }

        // Si aucun filtre n'est sélectionné, vider la liste
        if (!selectedDiplome && !selectedDirection && !selectedSousDirection && !selectedService) {
            setAgents([]);
            return;
        }

        // Debounce pour éviter trop de requêtes (300ms de délai)
        const timeoutId = setTimeout(() => {
            filterAgents();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [selectedDiplome, selectedDirection, selectedSousDirection, selectedService, view]);

    const loadDiplomes = async () => {
        try {
            setLoadingDiplomes(true);
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/diplomes`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data) {
                setDiplomes(result.data);
            } else if (Array.isArray(result)) {
                setDiplomes(result);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des diplômes:', error);
        } finally {
            setLoadingDiplomes(false);
        }
    };

    const loadDirections = async () => {
        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/directions/select/all`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data) {
                setDirections(result.data);
            } else if (Array.isArray(result)) {
                setDirections(result);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des directions:', error);
        }
    };

    const loadSousDirections = async (directionId) => {
        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/sous-directions/select/all?direction_id=${directionId}`, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data) {
                setSousDirections(result.data);
            } else if (Array.isArray(result)) {
                setSousDirections(result);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des sous-directions:', error);
        }
    };

    const loadServices = async (directionId, sousDirectionId) => {
        try {
            const apiUrl = getApiUrl();
            let url = `${apiUrl}/api/services/select/all?`;
            if (sousDirectionId) {
                url += `sous_direction_id=${sousDirectionId}`;
            } else if (directionId) {
                url += `direction_id=${directionId}`;
            } else {
                setServices([]);
                return;
            }
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            if (result.success && result.data) {
                setServices(result.data);
            } else if (Array.isArray(result)) {
                setServices(result);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des services:', error);
        }
    };

    const filterAgents = async () => {
        try {
            setLoadingAgents(true);
            const apiUrl = getApiUrl();
            
            // Construire les paramètres de requête
            const params = new URLSearchParams();
            
            // Pour récupérer tous les agents du ministère (sans limite pour le filtrage)
            params.append('limit', '1000');
            params.append('page', '1');
            
            // Ajouter le filtre par ministère si l'utilisateur est DRH
            if (user && user.role && user.role.toLowerCase() === 'drh' && user.id_ministere) {
                params.append('id_ministere', user.id_ministere);
            }

            console.log('🔍 Récupération des agents avec params:', params.toString());
            const response = await fetch(`${apiUrl}/api/agents?${params.toString()}`, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                console.error('❌ Erreur HTTP:', response.status, response.statusText);
                throw new Error(`Erreur HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('🔍 Réponse API agents:', {
                success: result.success,
                hasData: !!result.data,
                dataIsArray: Array.isArray(result.data),
                dataLength: result.data?.length || 0,
                isArray: Array.isArray(result),
                resultKeys: Object.keys(result || {})
            });
            
            let allAgents = [];
            if (result.success && result.data) {
                allAgents = Array.isArray(result.data) ? result.data : [];
            } else if (Array.isArray(result)) {
                allAgents = result;
            } else if (result.data && Array.isArray(result.data)) {
                allAgents = result.data;
            }
            
            console.log('✅ Nombre d\'agents récupérés:', allAgents.length);
            
            // Appliquer les filtres de base (direction, sous-direction, service)
            let filtered = [...allAgents]; // Créer une copie pour éviter les mutations
            
            console.log('🔍 Application des filtres organisationnels:', {
                nombreAgentsAvantFiltres: filtered.length,
                selectedDirection,
                selectedSousDirection,
                selectedService
            });
            
            // Filtrer par direction
            if (selectedDirection) {
                const beforeCount = filtered.length;
                filtered = filtered.filter(agent => agent.id_direction === parseInt(selectedDirection));
                console.log(`🔍 Filtre direction: ${beforeCount} -> ${filtered.length} agents`);
            }
            
            // Filtrer par sous-direction
            if (selectedSousDirection) {
                const beforeCount = filtered.length;
                filtered = filtered.filter(agent => agent.id_sous_direction === parseInt(selectedSousDirection));
                console.log(`🔍 Filtre sous-direction: ${beforeCount} -> ${filtered.length} agents`);
            }
            
            // Filtrer par service
            if (selectedService) {
                const beforeCount = filtered.length;
                filtered = filtered.filter(agent => agent.id_service === parseInt(selectedService));
                console.log(`🔍 Filtre service: ${beforeCount} -> ${filtered.length} agents`);
            }
            
            console.log('🔍 Nombre d\'agents après filtres organisationnels:', filtered.length);
            
            // Récupérer le libellé du diplôme sélectionné pour la comparaison
            const selectedDiplomeObj = selectedDiplome ? diplomes.find(d => d.id === parseInt(selectedDiplome)) : null;
            const selectedDiplomeLibele = selectedDiplomeObj?.libele || selectedDiplomeObj?.libelle || selectedDiplomeObj?.nom || null;
            
            console.log('🔍 Filtrage par diplôme:', {
                selectedDiplome,
                selectedDiplomeLibele,
                nombreAgentsAvantFiltre: filtered.length
            });
            
            // Enrichir les agents avec les diplômes et filtrer par diplôme si nécessaire
            const agentsWithDiplomes = await Promise.all(
                filtered.map(async (agent) => {
                    let hasSelectedDiplome = false;
                    let agentDiplomeOptions = null;
                    let agentDiplomeNom = null;
                    
                    // Vérifier d'abord id_diplome dans l'agent (diplôme principal) - plus rapide
                    if (selectedDiplome && agent.id_diplome === parseInt(selectedDiplome)) {
                        hasSelectedDiplome = true;
                        const diplome = diplomes.find(d => d.id === agent.id_diplome);
                        if (diplome) {
                            agentDiplomeNom = diplome.libele || diplome.libelle || diplome.nom;
                        }
                        console.log(`✅ Agent ${agent.id} a le diplôme via id_diplome`);
                    }
                    
                    // Si pas trouvé via id_diplome, chercher dans etude_diplome
                    if (selectedDiplome && !hasSelectedDiplome) {
                        try {
                            const apiUrl = getApiUrl();
                            const diplomesResponse = await fetch(`${apiUrl}/api/agents/${agent.id}`, {
                                headers: getAuthHeaders()
                            });
                            const diplomesResult = await diplomesResponse.json();
                            
                            if (diplomesResult.success && diplomesResult.data) {
                                const agentData = diplomesResult.data;
                                
                                // Vérifier dans les diplômes de etude_diplome
                                if (agentData.diplomes && Array.isArray(agentData.diplomes) && agentData.diplomes.length > 0) {
                                    console.log(`🔍 Agent ${agent.id} a ${agentData.diplomes.length} diplôme(s) dans etude_diplome`);
                                    
                                    for (const diplome of agentData.diplomes) {
                                        if (diplome.diplome) {
                                            // Normaliser les chaînes pour la comparaison (supprimer espaces, mettre en minuscules)
                                            const diplomeLibeleNormalized = selectedDiplomeLibele ? selectedDiplomeLibele.trim().toLowerCase() : '';
                                            const agentDiplomeNormalized = diplome.diplome.trim().toLowerCase();
                                            
                                            // Comparaison flexible
                                            if (diplomeLibeleNormalized && agentDiplomeNormalized) {
                                                if (agentDiplomeNormalized === diplomeLibeleNormalized ||
                                                    agentDiplomeNormalized.includes(diplomeLibeleNormalized) ||
                                                    diplomeLibeleNormalized.includes(agentDiplomeNormalized)) {
                                                    hasSelectedDiplome = true;
                                                    agentDiplomeNom = diplome.diplome;
                                                    agentDiplomeOptions = diplome.options || null;
                                                    console.log(`✅ Agent ${agent.id} a le diplôme "${diplome.diplome}" qui correspond à "${selectedDiplomeLibele}"`);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                
                                // Si toujours pas trouvé et que l'agent a un id_diplome, vérifier aussi
                                if (!hasSelectedDiplome && agentData.id_diplome === parseInt(selectedDiplome)) {
                                    hasSelectedDiplome = true;
                                    const diplome = diplomes.find(d => d.id === agentData.id_diplome);
                                    if (diplome) {
                                        agentDiplomeNom = diplome.libele || diplome.libelle || diplome.nom;
                                    }
                                    console.log(`✅ Agent ${agent.id} a le diplôme via id_diplome (depuis API complète)`);
                                }
                            }
                        } catch (error) {
                            console.error(`❌ Erreur lors de la récupération des diplômes pour l'agent ${agent.id}:`, error);
                        }
                    }
                    
                    // Si aucun diplôme n'est sélectionné, récupérer le premier diplôme disponible
                    if (!selectedDiplome) {
                        // Utiliser id_diplome si disponible
                        if (agent.id_diplome) {
                            const diplome = diplomes.find(d => d.id === agent.id_diplome);
                            if (diplome) {
                                agentDiplomeNom = diplome.libele || diplome.libelle || diplome.nom;
                            }
                        } else {
                            // Sinon, récupérer depuis l'API
                            try {
                                const apiUrl = getApiUrl();
                                const diplomesResponse = await fetch(`${apiUrl}/api/agents/${agent.id}`, {
                                    headers: getAuthHeaders()
                                });
                                const diplomesResult = await diplomesResponse.json();
                                
                                if (diplomesResult.success && diplomesResult.data) {
                                    const agentData = diplomesResult.data;
                                    if (agentData.diplomes && Array.isArray(agentData.diplomes) && agentData.diplomes.length > 0) {
                                        agentDiplomeNom = agentData.diplomes[0].diplome;
                                        agentDiplomeOptions = agentData.diplomes[0].options || null;
                                    } else if (agentData.id_diplome) {
                                        const diplome = diplomes.find(d => d.id === agentData.id_diplome);
                                        if (diplome) {
                                            agentDiplomeNom = diplome.libele || diplome.libelle || diplome.nom;
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error(`Erreur lors de la récupération des diplômes pour l'agent ${agent.id}:`, error);
                            }
                        }
                    }
                    
                    // Si un diplôme est sélectionné et que l'agent ne l'a pas, retourner null pour le filtrer
                    if (selectedDiplome && !hasSelectedDiplome) {
                        console.log(`❌ Agent ${agent.id} (${agent.nom} ${agent.prenom}) n'a pas le diplôme sélectionné`);
                        return null;
                    }
                    
                    // Enrichir l'agent avec les informations de diplôme
                    agent.diplome_nom = agentDiplomeNom;
                    agent.diplome_options = agentDiplomeOptions;
                    
                    return agent;
                })
            );
            
            // Filtrer les null (agents qui n'ont pas le diplôme sélectionné)
            const finalAgents = agentsWithDiplomes.filter(agent => agent !== null);
            
            console.log('✅ Filtrage terminé:', {
                nombreAgentsApresFiltre: finalAgents.length
            });
            
            setAgents(finalAgents);
        } catch (error) {
            console.error('Erreur lors du filtrage des agents:', error);
            setAgents([]);
        } finally {
            setLoadingAgents(false);
        }
    };

    const resetFilters = () => {
        setSelectedDiplome('');
        setSelectedDirection('');
        setSelectedSousDirection('');
        setSelectedService('');
        setAgents([]);
        setSearchAgent('');
        setSearchResults([]);
        setShowSearchResults(false);
        setSelectedAgent(null);
        setAgentDiplomes([]);
    };

    // Rechercher des agents par nom, prénom ou matricule
    const searchAgentsByName = async (searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        try {
            const apiUrl = getApiUrl();
            const params = new URLSearchParams();
            params.append('search', searchTerm);
            params.append('limit', '10');
            
            // Ajouter le filtre par ministère si l'utilisateur est DRH
            if (user && user.role && user.role.toLowerCase() === 'drh' && user.id_ministere) {
                params.append('id_ministere', user.id_ministere);
            }

            const response = await fetch(`${apiUrl}/api/agents?${params.toString()}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                const agentsList = Array.isArray(result.data) ? result.data : (result.success && Array.isArray(result.data) ? result.data : []);
                setSearchResults(agentsList);
                setShowSearchResults(agentsList.length > 0);
            }
        } catch (error) {
            console.error('Erreur lors de la recherche d\'agents:', error);
            setSearchResults([]);
            setShowSearchResults(false);
        }
    };

    // Charger les diplômes d'un agent spécifique
    const loadAgentDiplomes = async (agentId) => {
        try {
            setLoadingAgentDiplomes(true);
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/agents/${agentId}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const diplomes = Array.isArray(result.data.diplomes) ? result.data.diplomes : [];
                    setAgentDiplomes(diplomes);
                    setShowAgentDiplomesModal(true);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des diplômes de l\'agent:', error);
            alert('Erreur lors du chargement des diplômes de l\'agent');
        } finally {
            setLoadingAgentDiplomes(false);
        }
    };

    // Fonction helper pour ouvrir le document d'un diplôme
    const handleViewDiplomeDocument = async (diplome) => {
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
                documentPath = `diplomes/document_${diplome.id_agent_document}.pdf`;
            }
            
            if (documentPath) {
                // Encoder le chemin en base64 pour l'endpoint API
                const encodedPath = btoa(documentPath);
                const url = `${getApiUrl()}/api/agents/diplome-document/${encodedPath}`;
                
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

    // Gérer le changement de recherche d'agent
    useEffect(() => {
        if (searchAgent && searchAgent.length >= 2) {
            const timeoutId = setTimeout(() => {
                searchAgentsByName(searchAgent);
            }, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchAgent]);

    // Fonction d'export Excel
    const handleExportExcel = () => {
        if (agents.length === 0) {
            alert('Aucun agent à exporter');
            return;
        }

        try {
            setLoadingExport(true);
            const headers = ['#', 'Matricule', 'Nom', 'Prénom', 'Diplôme', 'Options', 'Direction', 'Sous-direction', 'Service'];
            const rows = agents.map((agent, index) => [
                index + 1,
                agent.matricule || '-',
                agent.nom || '-',
                agent.prenom || '-',
                agent.diplome_nom || '-',
                agent.diplome_options || '-',
                agent.direction_libelle || '-',
                agent.sous_direction_libelle || '-',
                agent.service_libelle || '-'
            ]);

            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents par Diplôme');

            const today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Agents_par_Diplome_${today}.xlsx`);
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            alert('Erreur lors de l\'export Excel');
        } finally {
            setLoadingExport(false);
        }
    };

    // Fonction d'export Word
    const handleExportWord = () => {
        if (agents.length === 0) {
            alert('Aucun agent à exporter');
            return;
        }

        try {
            setLoadingExport(true);
            const today = new Date();
            const formattedDate = today.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const tableHeaders = `
                <tr>
                    <th>#</th>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Prénoms</th>
                    <th>Diplôme</th>
                    <th>Options</th>
                    <th>Direction</th>
                    <th>Sous-direction</th>
                    <th>Service</th>
                </tr>
            `;

            const tableRows = agents.map((agent, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${agent.matricule || '-'}</td>
                    <td>${agent.nom || '-'}</td>
                    <td>${agent.prenom || '-'}</td>
                    <td>${agent.diplome_nom || '-'}</td>
                    <td>${agent.diplome_options || '-'}</td>
                    <td>${agent.direction_libelle || '-'}</td>
                    <td>${agent.sous_direction_libelle || '-'}</td>
                    <td>${agent.service_libelle || '-'}</td>
                </tr>
            `).join('');

            const wordContent = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:w="urn:schemas-microsoft-com:office:word"
                      xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <title>Agents par Diplôme</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                        th, td { border: 1px solid #999; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        h1 { color: #333; text-align: center; }
                        .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; text-align: center; }
                    </style>
                </head>
                <body>
                    <h1>Agents par Diplôme</h1>
                    <div class="subtitle">
                        <strong>${agents.length} agent(s) trouvé(s)</strong><br>
                        Généré le ${formattedDate}
                    </div>
                    <table>
                        <thead>${tableHeaders}</thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
                </html>
            `;

            const blob = new Blob([wordContent], { type: 'application/msword' });
            const fileName = `Agents_par_Diplome_${today.toISOString().split('T')[0]}.doc`;
            saveAs(blob, fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export Word:', error);
            alert('Erreur lors de l\'export Word');
        } finally {
            setLoadingExport(false);
        }
    };

    // Fonction d'export PDF
    const handleExportPDF = () => {
        if (agents.length === 0) {
            alert('Aucun agent à exporter');
            return;
        }

        try {
            setLoadingExport(true);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yPosition = 20;
            const lineHeight = 7;
            const margin = 15;
            const colWidths = [10, 25, 30, 30, 40, 40, 35, 35, 30];
            let xPosition = margin;

            // Titre
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            const titleText = `Agents par Diplôme - ${agents.length} agent(s)`;
            const titleWidth = pdf.getTextWidth(titleText);
            pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
            yPosition += 10;

            // Date
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

            // En-têtes
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'bold');
            const headers = ['#', 'Matricule', 'Nom', 'Prénom', 'Diplôme', 'Options', 'Direction', 'Sous-dir.', 'Service'];
            xPosition = margin;
            headers.forEach((header, index) => {
                pdf.text(header, xPosition, yPosition);
                xPosition += colWidths[index];
            });
            yPosition += lineHeight;

            // Lignes de données
            pdf.setFont(undefined, 'normal');
            agents.forEach((agent, index) => {
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                }

                const rowData = [
                    (index + 1).toString(),
                    agent.matricule || '-',
                    agent.nom || '-',
                    agent.prenom || '-',
                    agent.diplome_nom || '-',
                    agent.diplome_options || '-',
                    agent.direction_libelle || '-',
                    agent.sous_direction_libelle || '-',
                    agent.service_libelle || '-'
                ];

                xPosition = margin;
                rowData.forEach((data, colIndex) => {
                    const text = pdf.splitTextToSize(data || '-', colWidths[colIndex] - 2);
                    pdf.text(text, xPosition, yPosition);
                    xPosition += colWidths[colIndex];
                });
                yPosition += lineHeight * Math.max(...rowData.map(d => pdf.splitTextToSize(d || '-', 30).length));
            });

            const fileName = `Agents_par_Diplome_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de l\'export PDF');
        } finally {
            setLoadingExport(false);
        }
    };

    // Fonction d'impression
    const handlePrint = () => {
        if (agents.length === 0) {
            alert('Aucun agent à imprimer');
            return;
        }

        try {
            setLoadingExport(true);
            const printWindow = window.open('', '_blank');
            const today = new Date();
            const formattedDate = today.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const tableHeaders = `
                <tr>
                    <th>#</th>
                    <th>Matricule</th>
                    <th>Nom</th>
                    <th>Prénoms</th>
                    <th>Diplôme</th>
                    <th>Options</th>
                    <th>Direction</th>
                    <th>Sous-direction</th>
                    <th>Service</th>
                </tr>
            `;

            const tableRows = agents.map((agent, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${agent.matricule || '-'}</td>
                    <td>${agent.nom || '-'}</td>
                    <td>${agent.prenom || '-'}</td>
                    <td>${agent.diplome_nom || '-'}</td>
                    <td>${agent.diplome_options || '-'}</td>
                    <td>${agent.direction_libelle || '-'}</td>
                    <td>${agent.sous_direction_libelle || '-'}</td>
                    <td>${agent.service_libelle || '-'}</td>
                </tr>
            `).join('');

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Agents par Diplôme</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        h1 { color: #333; text-align: center; }
                        .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; text-align: center; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Agents par Diplôme</h1>
                    <div class="subtitle">
                        <strong>${agents.length} agent(s) trouvé(s)</strong><br>
                        Généré le ${formattedDate}
                    </div>
                    <table>
                        <thead>${tableHeaders}</thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        } catch (error) {
            console.error('Erreur lors de l\'impression:', error);
            alert('Erreur lors de l\'impression');
        } finally {
            setLoadingExport(false);
        }
    };

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Formation', active: false },
        { name: 'Diplômes', active: true }
    ];

    // Vue menu principal avec deux boutons
    if (view === 'menu') {
        return (
            <Page title="Diplômes" breadcrumbs={breadcrumbs}>
                <div className="mt-4">
                    <Row>
                        <Col md={6} className="mb-4">
                            <Card className="h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setView('create')}>
                                <CardBody className="text-center p-5">
                                    <MdAdd size={60} className="text-primary mb-3" />
                                    <h4 className="mb-3">Créer un diplôme</h4>
                                    <p className="text-muted">
                                        Ajouter un nouveau diplôme à la liste des diplômes disponibles
                                    </p>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col md={6} className="mb-4">
                            <Card className="h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={() => setView('filter')}>
                                <CardBody className="text-center p-5">
                                    <MdFilterList size={60} className="text-success mb-3" />
                                    <h4 className="mb-3">Filtrer les agents par diplômes</h4>
                                    <p className="text-muted">
                                        Rechercher et filtrer les agents selon leur diplôme, direction, sous-direction et service
                                    </p>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Page>
        );
    }

    // Vue création de diplôme
    if (view === 'create') {
        const fields = [
            { name: 'libele', label: 'Saisir le diplôme', type: 'text', required: true, placeholder: 'SAISIR LE DIPLÔME' }
        ];

        const displayColumns = [
            { name: 'libele', label: 'Nom du diplôme' }
        ];

        const searchFields = ['libele'];

        return (
            <div>
                <div className="mb-3">
                    <Button color="secondary" onClick={() => setView('menu')}>
                        <MdArrowBack className="mr-2" /> Retour
                    </Button>
                </div>
                <ManagementPage
                    title="Diplômes"
                    description="Gestion des diplômes et certifications"
                    icon={MdSchool}
                    apiEndpoint="/api/diplomes"
                    fields={fields}
                    displayColumns={displayColumns}
                    searchFields={searchFields}
                    breadcrumbs={breadcrumbs}
                />
            </div>
        );
    }

    // Vue filtrage des agents
    if (view === 'filter') {
        return (
            <Page title="Filtrer les agents par diplômes" breadcrumbs={breadcrumbs}>
                <div className="mt-4">
                    <div className="mb-3">
                        <Button color="secondary" onClick={() => setView('menu')}>
                            <MdArrowBack className="mr-2" /> Retour
                        </Button>
                    </div>

                    <Card className="shadow-sm">
                        <CardBody>
                            <h5 className="mb-4">Critères de recherche</h5>
                            
                            {/* Recherche d'agent spécifique */}
                            <Row className="mb-4">
                                <Col md={12}>
                                    <FormGroup>
                                        <Label>
                                            <MdSearch className="me-2" />
                                            Rechercher un agent (nom, prénom ou matricule)
                                        </Label>
                                        <div className="position-relative">
                                            <Input
                                                type="text"
                                                placeholder="Tapez le nom, prénom ou matricule de l'agent..."
                                                value={searchAgent}
                                                onChange={(e) => {
                                                    setSearchAgent(e.target.value);
                                                    setSelectedAgent(null);
                                                }}
                                                onFocus={() => {
                                                    if (searchResults.length > 0) {
                                                        setShowSearchResults(true);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    setTimeout(() => {
                                                        setShowSearchResults(false);
                                                    }, 200);
                                                }}
                                            />
                                            {showSearchResults && searchResults.length > 0 && (
                                                <div 
                                                    className="position-absolute w-100 bg-white border rounded shadow-lg"
                                                    style={{ 
                                                        zIndex: 1000, 
                                                        maxHeight: '300px', 
                                                        overflowY: 'auto',
                                                        top: '100%',
                                                        marginTop: '2px'
                                                    }}
                                                >
                                                    {searchResults.map((agent) => (
                                                        <div
                                                            key={agent.id}
                                                            className="p-2 border-bottom cursor-pointer"
                                                            style={{ cursor: 'pointer' }}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setSelectedAgent(agent);
                                                                setSearchAgent(`${agent.prenom} ${agent.nom} (${agent.matricule})`);
                                                                setShowSearchResults(false);
                                                                loadAgentDiplomes(agent.id);
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'white';
                                                            }}
                                                        >
                                                            <div className="fw-bold">
                                                                {agent.prenom} {agent.nom}
                                                            </div>
                                                            <small className="text-muted">
                                                                Matricule: {agent.matricule}
                                                            </small>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <small className="text-muted">
                                            Recherchez un agent spécifique pour voir tous ses diplômes et leurs documents
                                        </small>
                                    </FormGroup>
                                </Col>
                            </Row>

                            <hr className="my-3" />
                            <h6 className="mb-3">Filtres par organisation</h6>
                            
                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>Diplôme</Label>
                                        {loadingDiplomes ? (
                                            <Spinner size="sm" />
                                        ) : (
                                            <Input
                                                type="select"
                                                value={selectedDiplome}
                                                onChange={(e) => setSelectedDiplome(e.target.value)}
                                            >
                                                <option value="">Sélectionner un diplôme</option>
                                                {diplomes.map((diplome) => (
                                                    <option key={diplome.id} value={diplome.id}>
                                                        {diplome.libele || diplome.libelle || diplome.nom}
                                                    </option>
                                                ))}
                                            </Input>
                                        )}
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>Direction</Label>
                                        <Input
                                            type="select"
                                            value={selectedDirection}
                                            onChange={(e) => {
                                                setSelectedDirection(e.target.value);
                                                setSelectedSousDirection('');
                                                setSelectedService('');
                                            }}
                                        >
                                            <option value="">Sélectionner une direction</option>
                                            {directions.map((direction) => (
                                                <option key={direction.id} value={direction.id}>
                                                    {direction.libelle || direction.libele || direction.nom}
                                                </option>
                                            ))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>Sous-direction</Label>
                                        <Input
                                            type="select"
                                            value={selectedSousDirection}
                                            onChange={(e) => {
                                                setSelectedSousDirection(e.target.value);
                                                setSelectedService('');
                                            }}
                                            disabled={!selectedDirection}
                                        >
                                            <option value="">Sélectionner une sous-direction</option>
                                            {sousDirections.map((sousDir) => (
                                                <option key={sousDir.id} value={sousDir.id}>
                                                    {sousDir.libelle || sousDir.libele || sousDir.nom}
                                                </option>
                                            ))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label>Service</Label>
                                        <Input
                                            type="select"
                                            value={selectedService}
                                            onChange={(e) => setSelectedService(e.target.value)}
                                            disabled={!selectedDirection}
                                        >
                                            <option value="">Sélectionner un service</option>
                                            {services.map((service) => (
                                                <option key={service.id} value={service.id}>
                                                    {service.libelle || service.libele || service.nom}
                                                </option>
                                            ))}
                                        </Input>
                                    </FormGroup>
                                </Col>
                            </Row>
                            <div className="mt-3">
                                <Button color="secondary" onClick={resetFilters} className="mr-2">
                                    Réinitialiser
                                </Button>
                            </div>
                        </CardBody>
                    </Card>

                    {loadingAgents ? (
                        <div className="text-center mt-4">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des agents...</p>
                        </div>
                    ) : agents.length > 0 ? (
                        <Card className="mt-4 shadow-sm">
                            <CardBody>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0">Résultats ({agents.length} agent(s) trouvé(s))</h5>
                                    <Dropdown isOpen={exportDropdownOpen} toggle={() => setExportDropdownOpen(!exportDropdownOpen)}>
                                        <DropdownToggle color="primary" caret disabled={loadingExport}>
                                            <MdFileDownload className="mr-2" />
                                            {loadingExport ? 'Export...' : 'Exporter'}
                                        </DropdownToggle>
                                        <DropdownMenu>
                                            <DropdownItem onClick={handlePrint} disabled={loadingExport}>
                                                <MdPrint className="mr-2" />
                                                Imprimer
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportPDF} disabled={loadingExport}>
                                                <MdPictureAsPdf className="mr-2" />
                                                PDF (.pdf)
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportWord} disabled={loadingExport}>
                                                <MdDescription className="mr-2" />
                                                Word (.doc)
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportExcel} disabled={loadingExport}>
                                                <MdTableChart className="mr-2" />
                                                Excel (.xlsx)
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                                <div className="table-responsive">
                                    <Table striped hover>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Matricule</th>
                                                <th>Nom</th>
                                                <th>Prénoms</th>
                                                <th>Diplôme</th>
                                                <th>Options</th>
                                                <th>Direction</th>
                                                <th>Sous-direction</th>
                                                <th>Service</th>
                                                <th style={{ width: '150px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agents.map((agent, index) => (
                                                <tr key={agent.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{agent.matricule || '-'}</td>
                                                    <td>{agent.nom || '-'}</td>
                                                    <td>{agent.prenom || '-'}</td>
                                                    <td>
                                                        {agent.diplome_nom || 
                                                         agent.diplome?.libele || 
                                                         agent.diplome?.libelle || 
                                                         (diplomes.find(d => d.id === agent.id_diplome)?.libele) ||
                                                         '-'}
                                                    </td>
                                                    <td>
                                                        {agent.diplome_options || '-'}
                                                    </td>
                                                    <td>
                                                        {agent.direction_libelle || 
                                                         agent.direction?.libelle || 
                                                         agent.direction?.libele || 
                                                         (directions.find(d => d.id === agent.id_direction)?.libelle || directions.find(d => d.id === agent.id_direction)?.libele) ||
                                                         '-'}
                                                    </td>
                                                    <td>
                                                        {agent.sous_direction_libelle || 
                                                         agent.sous_direction?.libelle || 
                                                         agent.sous_direction?.libele || 
                                                         (sousDirections.find(sd => sd.id === agent.id_sous_direction)?.libelle || sousDirections.find(sd => sd.id === agent.id_sous_direction)?.libele) ||
                                                         '-'}
                                                    </td>
                                                    <td>
                                                        {agent.service_libelle || 
                                                         agent.service?.libelle || 
                                                         agent.service?.libele || 
                                                         (services.find(s => s.id === agent.id_service)?.libelle || services.find(s => s.id === agent.id_service)?.libele) ||
                                                         '-'}
                                                    </td>
                                                    <td>
                                                        <Button 
                                                            color="info" 
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedAgent(agent);
                                                                loadAgentDiplomes(agent.id);
                                                            }}
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir diplômes
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </CardBody>
                        </Card>
                    ) : (selectedDiplome || selectedDirection || selectedSousDirection || selectedService) ? (
                        <Alert color="info" className="mt-4">
                            Aucun agent trouvé avec les critères de recherche sélectionnés.
                        </Alert>
                    ) : null}

                    {/* Modal pour afficher les diplômes d'un agent */}
                    <Modal isOpen={showAgentDiplomesModal} toggle={() => setShowAgentDiplomesModal(false)} size="lg">
                        <ModalHeader toggle={() => setShowAgentDiplomesModal(false)}>
                            <MdSchool className="me-2" />
                            Diplômes de {selectedAgent ? `${selectedAgent.prenom} ${selectedAgent.nom} (${selectedAgent.matricule})` : 'l\'agent'}
                        </ModalHeader>
                        <ModalBody>
                            {loadingAgentDiplomes ? (
                                <div className="text-center py-4">
                                    <Spinner color="primary" />
                                    <p className="mt-2">Chargement des diplômes...</p>
                                </div>
                            ) : agentDiplomes.length === 0 ? (
                                <Alert color="info">
                                    <i className="fa fa-info-circle me-2"></i>
                                    Cet agent n'a aucun diplôme enregistré.
                                </Alert>
                            ) : (
                                <div className="table-responsive">
                                    <Table striped hover>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Diplôme</th>
                                                <th>Options</th>
                                                <th>Année d'obtention</th>
                                                <th>École/Université</th>
                                                <th>Ville</th>
                                                <th>Pays</th>
                                                <th style={{ width: '150px' }}>Document</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agentDiplomes.map((diplome, index) => (
                                                <tr key={diplome.id || index}>
                                                    <td>{index + 1}</td>
                                                    <td><strong>{diplome.diplome || '-'}</strong></td>
                                                    <td>{diplome.options || '-'}</td>
                                                    <td>
                                                        {diplome.date_diplome 
                                                            ? diplome.date_diplome.toString()
                                                            : '-'}
                                                    </td>
                                                    <td>{diplome.ecole || '-'}</td>
                                                    <td>{diplome.ville || '-'}</td>
                                                    <td>{diplome.pays || '-'}</td>
                                                    <td>
                                                        {diplome.document_url || diplome.id_agent_document ? (
                                                            <Button
                                                                color="info"
                                                                size="sm"
                                                                onClick={() => handleViewDiplomeDocument(diplome)}
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
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button color="secondary" onClick={() => setShowAgentDiplomesModal(false)}>
                                Fermer
                            </Button>
                        </ModalFooter>
                    </Modal>
                </div>
            </Page>
        );
    }

    return null;
};

export default DiplomesPage;
