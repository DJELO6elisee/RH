import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Table,
    Button,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    Row,
    Col,
    Badge,
    Spinner,
    Alert,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    FormGroup,
    Label
} from 'reactstrap';
import { MdHistory, MdSearch, MdRestore, MdVisibility, MdFileDownload, MdPictureAsPdf, MdDescription, MdTableChart, MdPrint, MdInfo } from 'react-icons/md';
import Page from 'components/Page';
import Pagination from 'components/Pagination';
import AgentDetails from 'components/AgentDetails';
import { useHistory, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

const HistoriqueAgentsPage = () => {
    const history = useHistory();
    const location = useLocation();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
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
    const [restoringId, setRestoringId] = useState(null);
    const [viewType, setViewType] = useState('retired'); // 'retired' ou 'retirement'
    const [motifRestorationModal, setMotifRestorationModal] = useState(false);
    const [motifRestorationText, setMotifRestorationText] = useState('');
    const [agentIdPourRestoration, setAgentIdPourRestoration] = useState(null);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [loadingExport, setLoadingExport] = useState(false);
    const [motifAfficherModal, setMotifAfficherModal] = useState(false);
    const [agentMotifAfficher, setAgentMotifAfficher] = useState(null);
    const [historiqueMotifs, setHistoriqueMotifs] = useState([]);
    const [loadingHistorique, setLoadingHistorique] = useState(false);

    // Vérifier si on doit afficher un agent spécifique
    const urlParams = new URLSearchParams(location.search);
    const viewAgentId = urlParams.get('view');

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Debounce du terme de recherche
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Réinitialiser la page à 1 quand debouncedSearchTerm change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    // Charger les agents selon le type sélectionné
    useEffect(() => {
        loadRetiredAgents();
    }, [currentPage, debouncedSearchTerm, viewType]);

    const loadRetiredAgents = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                sortBy: viewType === 'retired' ? 'date_retrait' : 'date_retraite',
                sortOrder: 'DESC'
            });

            if (debouncedSearchTerm.trim()) {
                params.append('search', debouncedSearchTerm.trim());
            }

            // Choisir l'endpoint selon le type
            const endpoint = viewType === 'retired' 
                ? '/api/agents/retired' 
                : '/api/agents/retired-by-retirement';

            const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}?${params}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(viewType === 'retired' 
                    ? 'Erreur lors du chargement des agents retirés' 
                    : 'Erreur lors du chargement des agents à la retraite');
            }

            const result = await response.json();

            if (result.data) {
                setAgents(result.data);
                if (result.pagination) {
                    setPaginationInfo({
                        totalPages: result.pagination.totalPages,
                        totalCount: result.pagination.totalCount,
                        hasNextPage: result.pagination.hasNextPage,
                        hasPrevPage: result.pagination.hasPrevPage,
                        startIndex: result.pagination.startIndex,
                        endIndex: result.pagination.endIndex
                    });
                }
            } else {
                setAgents([]);
            }
        } catch (err) {
            setError(viewType === 'retired' 
                ? 'Erreur lors du chargement des agents retirés' 
                : 'Erreur lors du chargement des agents à la retraite');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (agentId) => {
        // Ouvrir le modal de saisie du motif
        setAgentIdPourRestoration(agentId);
        setMotifRestorationText('');
        setMotifRestorationModal(true);
    };

    // Fonction pour confirmer la restauration avec motif
    const handleConfirmRestoration = async () => {
        if (!agentIdPourRestoration) return;

        if (!motifRestorationText.trim()) {
            setError('Veuillez saisir le motif de restauration');
            return;
        }

        try {
            setRestoringId(agentIdPourRestoration);
            setError(null);
            setMotifRestorationModal(false);

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentIdPourRestoration}/restore`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ motif_restauration: motifRestorationText.trim() })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Recharger la liste
                await loadRetiredAgents();
                alert('Agent restauré avec succès !');
            } else {
                setError(result.error || 'Erreur lors de la restauration de l\'agent');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setRestoringId(null);
            setAgentIdPourRestoration(null);
            setMotifRestorationText('');
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleViewAgent = (agentId) => {
        history.push(`/historique-des-agents?view=${agentId}`);
    };

    // Fonction pour afficher le motif
    const handleViewMotif = async (agent) => {
        setAgentMotifAfficher({
            ...agent,
            nomComplet: `${agent.nom || ''} ${agent.prenom || ''}`.trim() || 'N/A'
        });
        setLoadingHistorique(true);
        setHistoriqueMotifs([]);
        setMotifAfficherModal(true);

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agent.id}/historique-retrait-restauration`, {
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


    // Fonction d'export PDF
    const handleExportPDF = async () => {
        try {
            setLoadingExport(true);
            const endpoint = viewType === 'retired' 
                ? '/api/agents/retired' 
                : '/api/agents/retired-by-retirement';
            
            const params = new URLSearchParams({
                page: '1',
                limit: '10000',
                sortBy: viewType === 'retired' ? 'date_retrait' : 'date_retraite',
                sortOrder: 'DESC'
            });

            if (debouncedSearchTerm.trim()) {
                params.append('search', debouncedSearchTerm.trim());
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}?${params}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const result = await response.json();
            const agentsToExport = result.data && Array.isArray(result.data) ? result.data : [];
            
            if (agentsToExport.length === 0) {
                alert('Aucun agent à exporter');
                setLoadingExport(false);
                return;
            }

            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            let yPosition = 20;
            const lineHeight = 7;
            const margin = 15;
            
            // Titre
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            const titleText = viewType === 'retired' 
                ? `Liste des Agents Retirés - ${agentsToExport.length} agent(s)`
                : `Liste des Agents à la Retraite - ${agentsToExport.length} agent(s)`;
            const titleWidth = pdf.getTextWidth(titleText);
            pdf.text(titleText, (pageWidth - titleWidth) / 2, yPosition);
            yPosition += 10;

            // En-têtes du tableau
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            const colWidths = [10, 25, 50, 40, 40, 30, 30];
            const headers = ['#', 'Matricule', 'Nom Prénoms', 'Emploi', 'Fonction', 'Statut', viewType === 'retired' ? 'Date retrait' : 'Date retraite'];
            let xPosition = margin;
            
            headers.forEach((header, index) => {
                pdf.text(header, xPosition, yPosition);
                xPosition += colWidths[index];
            });
            yPosition += 5;
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 3;

            // Données
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);
            agentsToExport.forEach((agent, index) => {
                // Vérifier si on doit ajouter une nouvelle page
                if (yPosition + lineHeight > pageHeight - 30) {
                    pdf.addPage();
                    yPosition = 20;
                    
                    // Réafficher les en-têtes
                    pdf.setFont(undefined, 'bold');
                    pdf.setFontSize(9);
                    xPosition = margin;
                    headers.forEach((header, idx) => {
                        pdf.text(header, xPosition, yPosition);
                        xPosition += colWidths[idx];
                    });
                    yPosition += 5;
                    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
                    yPosition += 3;
                    pdf.setFont(undefined, 'normal');
                    pdf.setFontSize(8);
                }
                
                xPosition = margin;
                const lineNumber = index + 1;
                const matricule = (agent.matricule || '-').substring(0, 12);
                const nomPrenom = (agent.nom_complet || `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-').substring(0, 30);
                const emploi = (agent.emploi_actuel_libele || '-').substring(0, 25);
                const fonction = (agent.fonction_actuelle_libele || '-').substring(0, 25);
                const statut = (agent.type_agent_libele || '-').substring(0, 20);
                const date = viewType === 'retired' 
                    ? (agent.date_retrait ? new Date(agent.date_retrait).toLocaleDateString('fr-FR') : '-')
                    : (agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR') : '-');
                
                pdf.text(String(lineNumber), xPosition, yPosition);
                xPosition += colWidths[0];
                pdf.text(matricule, xPosition, yPosition);
                xPosition += colWidths[1];
                pdf.text(nomPrenom, xPosition, yPosition);
                xPosition += colWidths[2];
                pdf.text(emploi, xPosition, yPosition);
                xPosition += colWidths[3];
                pdf.text(fonction, xPosition, yPosition);
                xPosition += colWidths[4];
                pdf.text(statut, xPosition, yPosition);
                xPosition += colWidths[5];
                pdf.text(date, xPosition, yPosition);
                
                yPosition += lineHeight;
            });

            // Date de génération en bas
            const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`;
            pdf.setFontSize(8);
            pdf.setFont(undefined, 'normal');
            pdf.text(dateText, pageWidth / 2, pageHeight - 10, { align: 'center' });

            // Télécharger le PDF
            const fileName = viewType === 'retired' 
                ? `Liste_Agents_Retires_${new Date().toISOString().split('T')[0]}.pdf`
                : `Liste_Agents_Retraites_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de la génération du PDF');
        } finally {
            setLoadingExport(false);
        }
    };

    // Fonction d'export Word
    const handleExportWord = async () => {
        try {
            setLoadingExport(true);
            const endpoint = viewType === 'retired' 
                ? '/api/agents/retired' 
                : '/api/agents/retired-by-retirement';
            
            const params = new URLSearchParams({
                page: '1',
                limit: '10000',
                sortBy: viewType === 'retired' ? 'date_retrait' : 'date_retraite',
                sortOrder: 'DESC'
            });

            if (debouncedSearchTerm.trim()) {
                params.append('search', debouncedSearchTerm.trim());
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}?${params}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const result = await response.json();
            const agentsToExport = result.data && Array.isArray(result.data) ? result.data : [];
            
            if (agentsToExport.length === 0) {
                alert('Aucun agent à exporter');
                setLoadingExport(false);
                return;
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${viewType === 'retired' ? 'Liste des Agents Retirés' : 'Liste des Agents à la Retraite'}</title>
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
                    </style>
                </head>
                <body>
                    <div class="content">
                        <div class="title">${viewType === 'retired' ? 'Liste des Agents Retirés' : 'Liste des Agents à la Retraite'}</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Matricule</th>
                                    <th>Nom Prénoms</th>
                                    <th>Emploi</th>
                                    <th>Fonction</th>
                                    <th>Statut agent</th>
                                    <th>${viewType === 'retired' ? 'Date de retrait' : 'Date de retraite'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${agentsToExport.map((agent, index) => {
                                    const date = viewType === 'retired' 
                                        ? (agent.date_retrait ? new Date(agent.date_retrait).toLocaleDateString('fr-FR') : '-')
                                        : (agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR') : '-');
                                    return `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${agent.matricule || '-'}</td>
                                            <td>${agent.nom_complet || `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-'}</td>
                                            <td>${agent.emploi_actuel_libele || '-'}</td>
                                            <td>${agent.fonction_actuelle_libele || '-'}</td>
                                            <td>${agent.type_agent_libele || '-'}</td>
                                            <td>${date}</td>
                                        </tr>
                                    `;
                                }).join('')}
                                <tr class="total">
                                    <td colspan="7">Total: ${agentsToExport.length} agent(s)</td>
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
            
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const fileName = viewType === 'retired' 
                ? `Liste_Agents_Retires_${new Date().toISOString().split('T')[0]}.doc`
                : `Liste_Agents_Retraites_${new Date().toISOString().split('T')[0]}.doc`;
            saveAs(blob, fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export Word:', error);
            alert('Erreur lors de la génération du document Word');
        } finally {
            setLoadingExport(false);
        }
    };

    // Fonction d'export Excel
    const handleExportExcel = async () => {
        try {
            setLoadingExport(true);
            const endpoint = viewType === 'retired' 
                ? '/api/agents/retired' 
                : '/api/agents/retired-by-retirement';
            
            const params = new URLSearchParams({
                page: '1',
                limit: '10000',
                sortBy: viewType === 'retired' ? 'date_retrait' : 'date_retraite',
                sortOrder: 'DESC'
            });

            if (debouncedSearchTerm.trim()) {
                params.append('search', debouncedSearchTerm.trim());
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}?${params}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const result = await response.json();
            const agentsToExport = result.data && Array.isArray(result.data) ? result.data : [];
            
            if (agentsToExport.length === 0) {
                alert('Aucun agent à exporter');
                setLoadingExport(false);
                return;
            }

            // Préparer les données pour Excel
            const excelData = agentsToExport.map((agent, index) => ({
                '#': index + 1,
                'Matricule': agent.matricule || '-',
                'Nom Prénoms': agent.nom_complet || `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-',
                'Emploi': agent.emploi_actuel_libele || '-',
                'Fonction': agent.fonction_actuelle_libele || '-',
                'Statut agent': agent.type_agent_libele || '-',
                [viewType === 'retired' ? 'Date de retrait' : 'Date de retraite']: viewType === 'retired' 
                    ? (agent.date_retrait ? new Date(agent.date_retrait).toLocaleDateString('fr-FR') : '-')
                    : (agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR') : '-')
            }));

            // Créer le workbook
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            
            const sheetName = viewType === 'retired' ? 'Agents Retirés' : 'Agents Retraites';
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            // Générer le fichier Excel
            const fileName = viewType === 'retired' 
                ? `Liste_Agents_Retires_${new Date().toISOString().split('T')[0]}.xlsx`
                : `Liste_Agents_Retraites_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            alert('Erreur lors de la génération du fichier Excel');
        } finally {
            setLoadingExport(false);
        }
    };

    // Fonction d'impression
    const handlePrint = async () => {
        try {
            setLoadingExport(true);
            const endpoint = viewType === 'retired' 
                ? '/api/agents/retired' 
                : '/api/agents/retired-by-retirement';
            
            const params = new URLSearchParams({
                page: '1',
                limit: '10000',
                sortBy: viewType === 'retired' ? 'date_retrait' : 'date_retraite',
                sortOrder: 'DESC'
            });

            if (debouncedSearchTerm.trim()) {
                params.append('search', debouncedSearchTerm.trim());
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com${endpoint}?${params}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des agents');
            }

            const result = await response.json();
            const agentsToExport = result.data && Array.isArray(result.data) ? result.data : [];
            
            if (agentsToExport.length === 0) {
                alert('Aucun agent à imprimer');
                setLoadingExport(false);
                return;
            }

            const printWindow = window.open('', '_blank');
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${viewType === 'retired' ? 'Liste des Agents Retirés' : 'Liste des Agents à la Retraite'} - Impression</title>
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
                        <div class="title">${viewType === 'retired' ? 'Liste des Agents Retirés' : 'Liste des Agents à la Retraite'}</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Matricule</th>
                                    <th>Nom Prénoms</th>
                                    <th>Emploi</th>
                                    <th>Fonction</th>
                                    <th>Statut agent</th>
                                    <th>${viewType === 'retired' ? 'Date de retrait' : 'Date de retraite'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${agentsToExport.map((agent, index) => {
                                    const date = viewType === 'retired' 
                                        ? (agent.date_retrait ? new Date(agent.date_retrait).toLocaleDateString('fr-FR') : '-')
                                        : (agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR') : '-');
                                    return `
                                        <tr>
                                            <td>${index + 1}</td>
                                            <td>${agent.matricule || '-'}</td>
                                            <td>${agent.nom_complet || `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-'}</td>
                                            <td>${agent.emploi_actuel_libele || '-'}</td>
                                            <td>${agent.fonction_actuelle_libele || '-'}</td>
                                            <td>${agent.type_agent_libele || '-'}</td>
                                            <td>${date}</td>
                                        </tr>
                                    `;
                                }).join('')}
                                <tr class="total">
                                    <td colspan="7">Total: ${agentsToExport.length} agent(s)</td>
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
        } catch (error) {
            console.error('Erreur lors de l\'impression:', error);
            alert('Erreur lors de l\'impression');
        } finally {
            setLoadingExport(false);
        }
    };

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Gestion du Personnel', active: false },
        { name: 'Historique des Agents', active: true }
    ];

    // Si on doit afficher les détails d'un agent spécifique
    if (viewAgentId) {
        return (
            <>
                <AgentDetails agentId={viewAgentId} />
            </>
        );
    }

    return (
        <>
        <Page title="Historique des Agents" breadcrumbs={breadcrumbs}>
            <div style={{ 
                background: '#f8f9fa',
                minHeight: '100vh',
                padding: '20px 0'
            }}>
                <div style={{ 
                    background: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    margin: '20px'
                }}>
                    {/* En-tête */}
                    <div style={{
                        background: '#343a40',
                        color: 'white',
                        padding: '20px',
                        borderBottom: '3px solid #007bff'
                    }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
                            <MdHistory className="me-2" />
                            Historique des Agents
                        </h1>
                        <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '5px', margin: 0 }}>
                            Gestion des agents retirés et des agents à la retraite
                        </p>
                    </div>

                    <div style={{ padding: '20px' }}>
                        {error && (
                            <Alert color="danger" style={{ marginBottom: '20px' }}>
                                {error}
                            </Alert>
                        )}

                        {/* Boutons de sélection du type */}
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            marginBottom: '30px',
                            justifyContent: 'center'
                        }}>
                            <Button
                                color={viewType === 'retired' ? 'primary' : 'secondary'}
                                size="lg"
                                onClick={() => {
                                    setViewType('retired');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    flex: 1,
                                    maxWidth: '400px',
                                    padding: '20px',
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    boxShadow: viewType === 'retired' ? '0 4px 8px rgba(0,123,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Agents Retirés
                            </Button>
                            <Button
                                color={viewType === 'retirement' ? 'primary' : 'secondary'}
                                size="lg"
                                onClick={() => {
                                    setViewType('retirement');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    flex: 1,
                                    maxWidth: '400px',
                                    padding: '20px',
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    borderRadius: '8px',
                                    boxShadow: viewType === 'retirement' ? '0 4px 8px rgba(0,123,255,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Agents à la Retraite
                            </Button>
                        </div>

                        {/* Section de recherche et export */}
                        <div style={{
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            padding: '15px',
                            marginBottom: '20px'
                        }}>
                            <Row>
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroupAddon addonType="prepend">
                                            <InputGroupText style={{ background: '#e9ecef', border: '1px solid #ced4da' }}>
                                                <MdSearch />
                                            </InputGroupText>
                                        </InputGroupAddon>
                                        <Input
                                            type="text"
                                            placeholder="Rechercher par nom, prénoms ou matricule..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ border: '1px solid #ced4da', textTransform: 'uppercase' }}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md={6} className="d-flex justify-content-end">
                                    <Dropdown isOpen={exportDropdownOpen} toggle={() => setExportDropdownOpen(!exportDropdownOpen)}>
                                        <DropdownToggle color="success" caret style={{
                                            borderRadius: '4px',
                                            padding: '8px 16px',
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            border: '1px solid #dee2e6'
                                        }}>
                                            <MdFileDownload className="me-1" />
                                            Exporter
                                        </DropdownToggle>
                                        <DropdownMenu>
                                            <DropdownItem onClick={handlePrint} disabled={loadingExport}>
                                                <MdPrint className="me-2" />
                                                Imprimer
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportPDF} disabled={loadingExport}>
                                                <MdPictureAsPdf className="me-2" />
                                                PDF (.pdf)
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportWord} disabled={loadingExport}>
                                                <MdDescription className="me-2" />
                                                Word (.doc)
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportExcel} disabled={loadingExport}>
                                                <MdTableChart className="me-2" />
                                                Excel (.xlsx)
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                </Col>
                            </Row>
                        </div>

                        {/* Tableau */}
                        {loading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                                <Spinner color="primary" />
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    border: '1px solid #dee2e6',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        background: '#f8f9fa',
                                        borderBottom: '1px solid #dee2e6',
                                        padding: '15px 20px',
                                        fontWeight: 600,
                                        color: '#495057'
                                    }}>
                                        {viewType === 'retired' 
                                            ? 'Liste des agents retirés' 
                                            : 'Liste des agents à la retraite'}
                                    </div>
                                    <div className="table-responsive">
                                        <Table hover style={{ margin: 0 }}>
                                            <thead style={{ background: '#f8f9fa' }}>
                                                <tr>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px' }}>#</th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>Matricule</th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>Nom Prénoms</th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>Emploi</th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>Fonction</th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>Statut agent</th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>
                                                        {viewType === 'retired' ? 'Date de retrait' : 'Date de retraite'}
                                                    </th>
                                                    <th style={{ border: '1px solid #dee2e6', padding: '12px', fontWeight: 600 }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {agents.map((agent, index) => (
                                                    <tr key={agent.id}>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {paginationInfo.startIndex + index}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {agent.matricule || '-'}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {agent.nom_complet || `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-'}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {agent.emploi_actuel_libele || '-'}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {agent.fonction_actuelle_libele || '-'}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {agent.type_agent_libele || '-'}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            {viewType === 'retired' 
                                                                ? (agent.date_retrait 
                                                                    ? new Date(agent.date_retrait).toLocaleDateString('fr-FR')
                                                                    : '-')
                                                                : (agent.date_retraite 
                                                                    ? new Date(agent.date_retraite).toLocaleDateString('fr-FR')
                                                                    : '-')}
                                                        </td>
                                                        <td style={{ border: '1px solid #dee2e6', padding: '12px 20px' }}>
                                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                                <Button
                                                                    color="primary"
                                                                    size="sm"
                                                                    onClick={() => handleViewAgent(agent.id)}
                                                                    style={{
                                                                        borderRadius: '4px',
                                                                        padding: '6px 12px',
                                                                        fontSize: '0.875rem',
                                                                        fontWeight: 500,
                                                                        border: '1px solid #dee2e6'
                                                                    }}
                                                                >
                                                                    <MdVisibility className="me-1" />
                                                                    Voir
                                                                </Button>
                                                                {viewType === 'retired' && (
                                                                    <Button
                                                                        color="info"
                                                                        size="sm"
                                                                        onClick={() => handleViewMotif(agent)}
                                                                        style={{
                                                                            borderRadius: '4px',
                                                                            padding: '6px 12px',
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: 500,
                                                                            border: '1px solid #17a2b8',
                                                                            backgroundColor: '#17a2b8',
                                                                            color: 'white'
                                                                        }}
                                                                    >
                                                                        <MdInfo className="me-1" />
                                                                        Voir le motif
                                                                    </Button>
                                                                )}
                                                                {viewType === 'retired' && (
                                                                    <Button
                                                                        color="success"
                                                                        size="sm"
                                                                        onClick={() => handleRestore(agent.id)}
                                                                        disabled={restoringId === agent.id}
                                                                        style={{
                                                                            borderRadius: '4px',
                                                                            padding: '6px 12px',
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: 500,
                                                                            border: '1px solid #dee2e6'
                                                                        }}
                                                                    >
                                                                        {restoringId === agent.id ? (
                                                                            <>
                                                                                <Spinner size="sm" className="me-1" />
                                                                                Restauration...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <MdRestore className="me-1" />
                                                                                Restaurer
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </div>

                                {agents.length === 0 && !loading && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px 20px',
                                        color: '#6c757d',
                                        background: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '4px',
                                        marginTop: '20px'
                                    }}>
                                        <p>
                                            {viewType === 'retired' 
                                                ? 'Aucun agent retiré trouvé' 
                                                : 'Aucun agent à la retraite trouvé'}
                                        </p>
                                    </div>
                                )}

                                {/* Pagination */}
                                {paginationInfo.totalPages > 1 && (
                                    <>
                                        <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
                                            <small className="text-muted">
                                                Affichage de {paginationInfo.startIndex} à {paginationInfo.endIndex} sur {paginationInfo.totalCount} éléments
                                            </small>
                                        </div>
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={paginationInfo.totalPages}
                                            onPageChange={handlePageChange}
                                            showFirstLast={true}
                                            maxVisiblePages={5}
                                        />
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Page>
        
        {/* Modal pour saisir le motif de restauration */}
        <Modal isOpen={motifRestorationModal} toggle={() => {
            setMotifRestorationModal(false);
            setAgentIdPourRestoration(null);
            setMotifRestorationText('');
            setError(null);
        }} size="md">
            <ModalHeader toggle={() => {
                setMotifRestorationModal(false);
                setAgentIdPourRestoration(null);
                setMotifRestorationText('');
                setError(null);
            }}>
                Motif de restauration
            </ModalHeader>
            <ModalBody>
                <FormGroup>
                    <Label for="motifRestoration">Veuillez saisir le motif de restauration <span style={{ color: 'red' }}>*</span></Label>
                    <Input
                        type="textarea"
                        id="motifRestoration"
                        rows="5"
                        value={motifRestorationText}
                        onChange={(e) => setMotifRestorationText(e.target.value)}
                        placeholder="Saisissez le motif pour lequel cet agent est restauré..."
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
                <Button color="success" onClick={handleConfirmRestoration} disabled={!motifRestorationText.trim()}>
                    Confirmer la restauration
                </Button>
                <Button color="secondary" onClick={() => {
                    setMotifRestorationModal(false);
                    setAgentIdPourRestoration(null);
                    setMotifRestorationText('');
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
        </>
    );
};

export default HistoriqueAgentsPage;

