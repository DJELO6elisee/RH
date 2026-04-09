import React, { useState, useEffect, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Button,
    ButtonDropdown,
    Table,
    Row,
    Col,
    Input,
    FormGroup,
    Label,
    Alert,
    Spinner,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Badge,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter
} from 'reactstrap';
import { 
    MdFileDownload, 
    MdPictureAsPdf, 
    MdTableChart, 
    MdDescription,
    MdComputer,
    MdRefresh,
    MdExitToApp,
    MdTrendingUp,
    MdArrowBack
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import MinistereFilter from 'components/MinistereFilter';

const RetraitesPage = () => {
    const history = useHistory();
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMinistere, setSelectedMinistere] = useState(
        user?.organization?.type === 'ministere' && user?.organization?.id ? user.organization.id : ''
    );
    const [filterValues] = useState({ 
        statut_emploi: 'retraite',
        id_type_d_agent: '1' // Fixé sur FONCTIONNAIRE uniquement
    });
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [stats, setStats] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const [projectionYears, setProjectionYears] = useState(5);
    const [projection, setProjection] = useState(null);
    const [showProjection, setShowProjection] = useState(false);
    const [ministeres, setMinisteres] = useState([]);
    const [softwarePreviewOpen, setSoftwarePreviewOpen] = useState(false);
    const [softwarePreviewHtml, setSoftwarePreviewHtml] = useState('');

    const isDRH = user?.role?.toLowerCase() === 'drh';

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Charger les données
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `https://tourisme.2ise-groupe.com/api/agents`;
            const queryParams = [];

            // Ajouter les filtres
            Object.keys(filterValues).forEach(key => {
                if (filterValues[key]) {
                    queryParams.push(`${key}=${filterValues[key]}`);
                }
            });

            if (selectedMinistere) {
                queryParams.push(`id_ministere=${selectedMinistere}`);
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

            setData(dataToSet);
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Charger les statistiques
    const loadStats = async () => {
        try {
            const idMinistere = selectedMinistere;
            const url = idMinistere
                ? `https://tourisme.2ise-groupe.com/api/agents/retirement-stats?id_ministere=${encodeURIComponent(idMinistere)}`
                : 'https://tourisme.2ise-groupe.com/api/agents/retirement-stats';

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                setStats(result.data);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des statistiques:', err);
        }
    };

    // Charger la liste des ministères
    const loadMinisteres = async () => {
        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/ministeres?limit=100', {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            
            if (result.success && result.data) {
                setMinisteres(Array.isArray(result.data) ? result.data : []);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des ministères:', err);
        }
    };

    // Calculer en masse les dates de retraite
    const handleBatchCalculate = async () => {
        if (!window.confirm('Voulez-vous recalculer automatiquement les dates de retraite pour tous les agents actifs ?')) {
            return;
        }

        try {
            setCalculating(true);
            const idMinistere = selectedMinistere;
            const url = idMinistere
                ? `https://tourisme.2ise-groupe.com/api/agents/batch-calculate-retirement?id_ministere=${encodeURIComponent(idMinistere)}`
                : 'https://tourisme.2ise-groupe.com/api/agents/batch-calculate-retirement';

            const response = await fetch(url, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Calcul terminé avec succès !\n\n${result.data.updated} agents mis à jour sur ${result.data.total_agents}`);
                loadData();
                loadStats();
            } else {
                alert(`❌ Erreur : ${result.message}`);
            }
        } catch (err) {
            console.error('Erreur lors du calcul en masse:', err);
            alert('❌ Erreur lors du calcul en masse des retraites');
        } finally {
            setCalculating(false);
        }
    };

    // Calculer l'âge de retraite basé sur le grade
    const calculateRetirementAge = (gradeLibele) => {
        if (!gradeLibele) return 60;
        const gradesSpeciaux = ['A4', 'A5', 'A6', 'A7'];
        return gradesSpeciaux.includes(gradeLibele.toUpperCase()) ? 65 : 60;
    };

    // Charger la projection des retraites
    const loadProjection = async (years) => {
        try {
            const idMinistere = selectedMinistere;
            const baseUrl = `https://tourisme.2ise-groupe.com/api/agents/retirement-projection?years=${encodeURIComponent(years)}`;
            const url = idMinistere ? `${baseUrl}&id_ministere=${encodeURIComponent(idMinistere)}` : baseUrl;

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            const result = await response.json();
            
            if (result.success) {
                setProjection(result.data);
                setShowProjection(true);
            }
        } catch (err) {
            console.error('Erreur lors du chargement de la projection:', err);
        }
    };

    // Gérer le changement de période de projection
    const handleProjectionYearsChange = (years) => {
        setProjectionYears(years);
        loadProjection(years);
    };

    // Pré-calculer la répartition 60/65 ans par année
    const projectionAgeBreakdown = useMemo(() => {
        if (!projection || !projection.liste_agents || projection.liste_agents.length === 0) {
            return {};
        }

        return projection.liste_agents.reduce((acc, agent) => {
            const retirementDate = agent.date_retraite_calculee
                ? new Date(agent.date_retraite_calculee)
                : agent.date_retraite
                    ? new Date(agent.date_retraite)
                    : null;

            const year = agent.annee_retraite
                || (retirementDate ? retirementDate.getFullYear() : null);

            if (!year) {
                return acc;
            }

            const yearKey = String(year);
            if (!acc[yearKey]) {
                acc[yearKey] = { departs60: 0, departs65: 0 };
            }

            const retirementAge = calculateRetirementAge(agent.grade_libele);

            if (retirementAge === 65) {
                acc[yearKey].departs65 += 1;
            } else {
                acc[yearKey].departs60 += 1;
            }

            return acc;
        }, {});
    }, [projection]);

    const projectionTotals = useMemo(() => {
        if (!projection || !projection.projection_par_annee || projection.projection_par_annee.length === 0) {
            return { total60: 0, total65: 0 };
        }

        return projection.projection_par_annee.reduce((totals, yearData) => {
            const yearKey = String(yearData.annee_retraite);
            const yearBreakdown = projectionAgeBreakdown[yearKey] || {
                departs60: yearData.departs_60_ans ?? 0,
                departs65: yearData.departs_65_ans ?? 0
            };

            totals.total60 += yearBreakdown.departs60;
            totals.total65 += yearBreakdown.departs65;

            return totals;
        }, { total60: 0, total65: 0 });
    }, [projection, projectionAgeBreakdown]);

    // Charger les données au montage et quand les filtres changent
    useEffect(() => {
        loadData();
        loadStats();
        loadProjection(projectionYears); // Charger la projection par défaut (5 ans)
    }, [filterValues, selectedMinistere]);

    // Charger les ministères au montage du composant
    useEffect(() => {
        loadMinisteres();
    }, []);

    const escapeHtml = (value) => {
        if (value === null || value === undefined || value === '') {
            return '-';
        }

        return value
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const getAgentsForExport = useMemo(() => {
        if (data.length > 0) {
            return data;
        }

        if (projection?.liste_agents && projection.liste_agents.length > 0) {
            return projection.liste_agents;
        }

        return [];
    }, [data, projection]);

    const formatDateValue = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('fr-FR');
    };

    const getRetirementDate = (agent) => {
        const retirementDate = getRetirementDateValue(agent);
        if (retirementDate) {
            return formatDateValue(retirementDate);
        }
        return '-';
    };

    const getRetirementDateValue = (agent) => {
        const rawDate = agent.date_retraite || agent.date_retraite_calculee || agent.date_de_retraite;
        if (!rawDate) return null;
        const parsedDate = new Date(rawDate);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    };

    const getRetirementAgeLabel = (agent) => {
        if (agent.age_retraite) return agent.age_retraite;
        if (agent.age_retraite_calcule) return agent.age_retraite_calcule;
        return calculateRetirementAge(agent.grade_libele);
    };

    const getMinistereLabel = (agent) => {
        return (
            agent.ministere_nom ||
            agent.ministere_libelle ||
            agent.ministere ||
            agent.nom_ministere ||
            '-'
        );
    };

    const getDirectionLabel = (agent) => {
        return (
            agent.direction_libelle ||
            agent.direction ||
            agent.direction_libele ||
            agent.direction_nom ||
            '-'
        );
    };

    const getPhoneLabel = (agent) => {
        return (
            agent.telephone1 ||
            agent.telephone2 ||
            agent.telephone ||
            agent.portable ||
            '-'
        );
    };

    const getEmailLabel = (agent) => agent.email || agent.email_professionnel || '-';

    // Fonction d'export Excel
    const handleExportExcel = () => {
        const headers = [
            'Matricule',
            'Nom',
            'Prénoms',
            'Sexe',
            'Date de Naissance',
            'Date de Retraite',
            'Grade',
            'Catégorie',
            'Direction',
            'Téléphone'
        ];
        const generationDate = new Date();
        const horizonDate = new Date(generationDate);
        horizonDate.setFullYear(horizonDate.getFullYear() + 5);

        const agentsInNextFiveYears = getAgentsForExport.filter(agent => {
            const retirementDate = getRetirementDateValue(agent);
            if (!retirementDate) return false;
            return retirementDate >= generationDate && retirementDate <= horizonDate;
        });

        const agentsCount = agentsInNextFiveYears.length;
        const titleText = `Gestion des Retraites - ${agentsCount} agent${agentsCount > 1 ? 's' : ''} à la retraite d'ici 5 ans`;

        const columnCount = headers.length;
        const titleRow = [
            titleText,
            ...Array(Math.max(0, columnCount - 1)).fill('')
        ];
        const emptyRow = Array(columnCount).fill('');
        
        const allData = [titleRow, emptyRow, headers];
        
        getAgentsForExport.forEach(agent => {
            allData.push([
                agent.matricule || '-',
                agent.nom || '-',
                agent.prenom || '-',
                agent.sexe || '-',
                agent.date_de_naissance ? formatDateValue(agent.date_de_naissance) : '-',
                getRetirementDate(agent),
                agent.grade_libele || '-',
                agent.categorie_libele || '-',
                getDirectionLabel(agent),
                getPhoneLabel(agent)
            ]);
        });
        
        const worksheet = XLSX.utils.aoa_to_sheet(allData);
        worksheet['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: columnCount - 1 } }
        ];
        worksheet['!rows'] = [
            { hpt: 36, hidden: false },
            { hpt: 18, hidden: false }
        ];
        worksheet['!cols'] = [
            { wch: 18 }, // Matricule
            { wch: 24 }, // Nom
            { wch: 20 }, // Prénoms
            { wch: 10 }, // Sexe
            { wch: 18 }, // Date de Naissance
            { wch: 18 }, // Date de Retraite
            { wch: 12 }, // Grade
            { wch: 12 }, // Catégorie
            { wch: 35 }, // Direction
            { wch: 18 }  // Téléphone
        ];
        if (worksheet['A1']) {
            worksheet['A1'].s = {
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { bold: true, sz: 18, name: 'Segoe UI' }
            };
        }
        headers.forEach((_, index) => {
            const cellAddress = XLSX.utils.encode_cell({ r: 2, c: index });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    alignment: { horizontal: 'center', vertical: 'center' },
                    font: { bold: true, sz: 12, name: 'Segoe UI' }
                };
            }
        });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Retraites');
        
        const fileName = `Retraites_${generationDate.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    // Fonction d'export Word
    const handleExportWord = () => {
        const headers = [
            'Matricule',
            'Nom et Prénoms',
            'Date de Naissance',
            'Emploi',
            'Fonction',
            'Grade'
        ];

        const tableHeaders = headers
            .map(header => `<th>${escapeHtml(header)}</th>`)
            .join('');

        const tableRows = getAgentsForExport
            .map(agent => {
                const dateNaissance = agent.date_de_naissance
                    ? formatDateValue(agent.date_de_naissance)
                    : '-';
                const nomComplet = `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-';
                const emploi = agent.emploi_actuel_libele || agent.emploi_libele || '-';
                const fonction = agent.fonction_actuelle_libele || agent.fonction_libele || '-';

                return `
                    <tr>
                        <td>${escapeHtml(agent.matricule || '-')}</td>
                        <td>${escapeHtml(nomComplet)}</td>
                        <td>${escapeHtml(dateNaissance)}</td>
                        <td>${escapeHtml(emploi)}</td>
                        <td>${escapeHtml(fonction)}</td>
                        <td>${escapeHtml(agent.grade_libele || '-')}</td>
                    </tr>
                `;
            })
            .join('');

        const generationDate = new Date();
        const formattedDate = generationDate.toLocaleDateString('fr-FR');
        const formattedTime = generationDate.toLocaleTimeString('fr-FR');

        const wordContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:w="urn:schemas-microsoft-com:office:word"
                  xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8" />
                    <title>Liste des agents à la retraite</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            margin: 20px;
                            color: #000;
                        }
                        h1 {
                            text-align: center;
                            color: #000;
                            font-size: 1.6rem;
                            margin-bottom: 0.5rem;
                        }
                        .subtitle {
                            text-align: center;
                            margin-bottom: 16px;
                            font-size: 0.8rem;
                            color: #000;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 0.7rem;
                            table-layout: fixed;
                        }
                        th, td {
                            border: 1px solid #999;
                            padding: 4px;
                            text-align: left;
                            vertical-align: top;
                            white-space: normal;
                            word-wrap: break-word;
                            word-break: break-word;
                            line-height: 1.1;
                            color: #000;
                        }
                        th {
                            background-color: #f5f5f5;
                            font-weight: 600;
                            color: #000;
                        }
                        tr:nth-child(even) {
                            background-color: #fafafa;
                        }
                        .footer {
                            margin-top: 30px;
                            font-size: 0.7rem;
                            color: #000;
                            text-align: right;
                        }
                    </style>
                </head>
                <body>
                    <h1>Gestion des Retraites</h1>
                    <div class="subtitle">
                        Liste des agents à la retraite.<br />
                        Total des agents listés : ${getAgentsForExport.length}
                    </div>
                    <table>
                        <thead>
                            <tr>${tableHeaders}</tr>
                        </thead>
                        <tbody>
                            ${tableRows || '<tr><td colspan="6" style="text-align:center;">Aucun agent trouvé.</td></tr>'}
                        </tbody>
                    </table>
                    <div class="footer">
                        Généré le ${formattedDate} à ${formattedTime} par le Système d\'Information RH.
                    </div>
                </body>
            </html>
        `;

        const blob = new Blob([wordContent], { type: 'application/msword' });
        const fileName = `Retraites_${generationDate.toISOString().split('T')[0]}.doc`;
        saveAs(blob, fileName);
    };

    // Fonction d'export PDF pour la liste des agents
    const handleExportPDF = () => {
        const agents = getAgentsForExport;

        if (!agents || agents.length === 0) {
            alert('Aucun agent à exporter.');
            return;
        }

        const pdf = generateAgentsListPdf(agents, 'l');
        pdf.save(`Retraites_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleCloseSoftwarePreview = () => {
        setSoftwarePreviewOpen(false);
        setSoftwarePreviewHtml('');
    };

    const handlePrintSoftwarePreview = () => {
        if (!softwarePreviewHtml) {
            return;
        }

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`
                <!doctype html>
                <html lang="fr">
                    <head>
                        <meta charset="utf-8" />
                        <title>Impression des agents à la retraite</title>
                        <style>
                            body {
                                font-family: 'Segoe UI', Arial, sans-serif;
                                margin: 24px;
                                color: #000;
                            }
                            h2 {
                                text-align: center;
                                margin-bottom: 8px;
                            }
                            .subtitle {
                                text-align: center;
                                margin-bottom: 16px;
                                color: #555;
                                font-size: 14px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                font-size: 12px;
                            }
                            th, td {
                                border: 1px solid #ccc;
                                padding: 6px 8px;
                                text-align: left;
                            }
                            th {
                                background-color: #e9f2ff;
                                font-weight: 600;
                            }
                            tr:nth-child(even) {
                                background-color: #f9f9f9;
                            }
                        </style>
                    </head>
                    <body>
                        ${softwarePreviewHtml}
                    </body>
                </html>
            `);
            doc.close();
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
        }

        setTimeout(() => {
            document.body.removeChild(printFrame);
        }, 1000);
    };

    const generateAgentsListPdf = (agents, orientation = 'p') => {
        const doc = new jsPDF(orientation, 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const generationDate = new Date();

        const applyHeader = () => {
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(30, 30, 30);
            doc.text('Liste détaillée des agents à la retraite', pageWidth / 2, 18, { align: 'center' });

            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(80, 80, 80);
            doc.text(
                `Généré le ${generationDate.toLocaleDateString('fr-FR')} à ${generationDate.toLocaleTimeString('fr-FR')}`,
                pageWidth / 2,
                26,
                { align: 'center' }
            );

            doc.setLineWidth(0.4);
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 32, pageWidth - 20, 32);
        };

        const addFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(128, 128, 128);
                doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        };

        const renderTable = () => {
            let yPosition = 40;

            const addTableHeader = () => {
                doc.setFillColor(230, 240, 250);
                doc.rect(20, yPosition, pageWidth - 40, 8, 'F');

                doc.setFontSize(9);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('#', 22, yPosition + 6);
                doc.text('Matricule', 32, yPosition + 6);
                doc.text('Nom & Prénoms', 62, yPosition + 6);
                doc.text('Date Naissance', 110, yPosition + 6);
                doc.text('Emploi', 145, yPosition + 6);
                doc.text('Fonction', 175, yPosition + 6);
                doc.text('Grade', 205, yPosition + 6);

                doc.setDrawColor(180, 180, 180);
                doc.line(20, yPosition + 8, pageWidth - 20, yPosition + 8);

                yPosition += 12;
            };

            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(20, 20, 20);
            doc.text(`Liste détaillée des agents (${agents.length} agents)`, 20, yPosition);

            yPosition += 8;
            addTableHeader();

            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(50, 50, 50);

            agents.forEach((agent, index) => {
                if (yPosition > pageHeight - 30) {
                    doc.addPage();
                    applyHeader();
                    yPosition = 40;
                    addTableHeader();
                }

                const nomComplet = `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-';
                const dateNaissance = agent.date_de_naissance ? formatDateValue(agent.date_de_naissance) : '-';
                const emploi = agent.emploi_actuel_libele || agent.emploi_libele || '-';
                const fonction = agent.fonction_actuelle_libele || agent.fonction_libele || '-';

                doc.text(String(index + 1), 22, yPosition);
                doc.text((agent.matricule || '-').substring(0, 12), 32, yPosition);
                doc.text(nomComplet.substring(0, 30), 62, yPosition);
                doc.text(dateNaissance, 110, yPosition);
                doc.text(emploi.substring(0, 25), 145, yPosition);
                doc.text(fonction.substring(0, 25), 175, yPosition);
                doc.text((agent.grade_libele || '-').substring(0, 15), 205, yPosition);

                doc.setDrawColor(235, 235, 235);
                doc.line(20, yPosition + 2, pageWidth - 20, yPosition + 2);

                yPosition += 7;
            });
        };

        applyHeader();
        renderTable();
        addFooter();

        return doc;
    };

    const generateAgentsListHtml = (agents) => {
        const generatedAt = new Date();
        const formattedDate = generatedAt.toLocaleDateString('fr-FR');
        const formattedTime = generatedAt.toLocaleTimeString('fr-FR');

        const rows = agents.map((agent, index) => {
            const nomComplet = `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-';
            const dateNaissance = agent.date_de_naissance
                ? formatDateValue(agent.date_de_naissance)
                : '-';
            const emploi = agent.emploi_actuel_libele || agent.emploi_libele || '-';
            const fonction = agent.fonction_actuelle_libele || agent.fonction_libele || '-';
            const grade = agent.grade_libele || '-';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(agent.matricule || '-')}</td>
                    <td>${escapeHtml(nomComplet)}</td>
                    <td>${escapeHtml(dateNaissance)}</td>
                    <td>${escapeHtml(emploi)}</td>
                    <td>${escapeHtml(fonction)}</td>
                    <td>${escapeHtml(grade)}</td>
                </tr>
            `;
        }).join('');

        return `
            <style>
                .preview-container {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #1f2933;
                    max-height: 75vh;
                    display: flex;
                    flex-direction: column;
                }
                .preview-header {
                    text-align: center;
                    margin-bottom: 12px;
                }
                .preview-header h2 {
                    margin-bottom: 4px;
                }
                .preview-header .subtitle {
                    margin: 0;
                    color: #52606d;
                    font-size: 14px;
                }
                .preview-table-wrapper {
                    flex: 1;
                    overflow: auto;
                    border: 1px solid #d9e2ec;
                    border-radius: 6px;
                }
                .preview-table-wrapper table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                }
                .preview-table-wrapper th,
                .preview-table-wrapper td {
                    border: 1px solid #d9e2ec;
                    padding: 6px 8px;
                    text-align: left;
                    vertical-align: top;
                }
                .preview-table-wrapper th {
                    background-color: #e8f1ff;
                    font-weight: 600;
                    color: #102a43;
                }
                .preview-table-wrapper tr:nth-child(even) {
                    background-color: #f8fafc;
                }
                .preview-table-wrapper .empty {
                    text-align: center;
                    padding: 12px 0;
                    color: #9aa5b1;
                    font-style: italic;
                }
                .preview-footer {
                    margin-top: 12px;
                    text-align: right;
                    color: #52606d;
                    font-size: 13px;
                }
            </style>
            <div class="preview-container">
                <div class="preview-header">
                    <h2>Liste détaillée des agents à la retraite</h2>
                    <p class="subtitle">Total des agents listés : ${agents.length}</p>
                </div>
                <div class="preview-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Matricule</th>
                                <th>Nom &amp; Prénoms</th>
                                <th>Date de Naissance</th>
                                <th>Emploi</th>
                                <th>Fonction</th>
                                <th>Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="7" class="empty">Aucun agent trouvé.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div class="preview-footer">
                    Généré le ${formattedDate} à ${formattedTime}
                </div>
            </div>
        `;
    };

    // Export via le logiciel (impression intégrée)
    const handleExportSoftware = () => {
        const agents = getAgentsForExport;

        if (!agents || agents.length === 0) {
            alert('Aucun agent à exporter.');
            return;
        }

        const htmlContent = generateAgentsListHtml(agents);
        setSoftwarePreviewHtml(htmlContent);
        setSoftwarePreviewOpen(true);
    };

    // Fonction d'export PDF pour le tableau de projection
    const handleExportProjectionPDF = () => {
        if (!projection || !projection.liste_agents || projection.liste_agents.length === 0) {
            alert('Aucun agent à exporter pour cette projection');
            return;
        }

        const pdf = generateAgentsListPdf(projection.liste_agents, 'l');
        pdf.save(`Projection_Retraites_${projection.periode?.annees || projectionYears}ans_${new Date().toISOString().split('T')[0]}.pdf`);
    };

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
        <div className="retraites-page">
            <Modal
                isOpen={softwarePreviewOpen}
                toggle={handleCloseSoftwarePreview}
                size="xl"
                centered
            >
                <ModalHeader toggle={handleCloseSoftwarePreview}>
                    Impression via le logiciel
                </ModalHeader>
                <ModalBody style={{ minHeight: '75vh', padding: 0 }}>
                    {softwarePreviewHtml ? (
                        <div style={{ height: '100%', overflow: 'auto', padding: '24px' }}>
                            <div
                                dangerouslySetInnerHTML={{ __html: softwarePreviewHtml }}
                            />
                        </div>
                    ) : (
                        <div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
                            <Spinner color="primary" />
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={handlePrintSoftwarePreview}>
                        Imprimer
                    </Button>
                    <Button color="secondary" onClick={handleCloseSoftwarePreview}>
                        Retour
                    </Button>
                </ModalFooter>
            </Modal>

            <div className="mb-4">
                <MinistereFilter 
                    selectedMinistere={selectedMinistere} 
                    setSelectedMinistere={setSelectedMinistere} 
                />
            </div>

            {/* En-tête */}
            <div className="page-header mb-4">
                <Row className="align-items-center">
                    <Col>
                        <h1 className="page-title">
                            <MdExitToApp className="me-2" style={{ fontSize: '2.5rem', color: '#6c757d' }} />
                            Gestion des Retraites
                        </h1>
                        <p className="page-description">Liste complète des agents à la retraite et gestion des départs en retraite</p>
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
                            color="warning" 
                            onClick={handleBatchCalculate}
                            className="me-2"
                            disabled={calculating}
                        >
                            {calculating ? (
                                <>
                                    <Spinner size="sm" className="me-1" />
                                    Calcul en cours...
                                </>
                            ) : (
                                <>
                                    <MdRefresh className="me-1" />
                                    Calculer les dates de retraite
                                </>
                            )}
                        </Button>
                        <Button 
                            color="primary" 
                            onClick={() => { loadData(); loadStats(); }}
                            className="me-2"
                        >
                            <MdRefresh className="me-1" />
                            Actualiser
                        </Button>
                        <ButtonDropdown isOpen={exportDropdownOpen} toggle={() => setExportDropdownOpen(!exportDropdownOpen)}>
                            <Button 
                                color="success"
                                onClick={handleExportPDF}
                            >
                                <MdFileDownload className="me-1" />
                                Exporter
                            </Button>
                            <DropdownToggle split color="success" caret aria-label="Ouvrir le menu d'export">
                                Menu
                            </DropdownToggle>
                            <DropdownMenu end>
                                <DropdownItem onClick={handleExportWord}>
                                    <MdDescription className="me-2" />
                                    Word (.doc)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportExcel}>
                                    <MdTableChart className="me-2" />
                                    Excel (.xlsx)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportPDF}>
                                    <MdPictureAsPdf className="me-2" />
                                    PDF (.pdf)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportSoftware}>
                                    <MdComputer className="me-2" />
                                    Via le logiciel
                                </DropdownItem>
                            </DropdownMenu>
                        </ButtonDropdown>
                    </Col>
                </Row>
            </div>

            {/* Règles de calcul */}
            <Alert color="info" className="mb-4">
                <h5 className="alert-heading">📋 Règles de calcul de la retraite</h5>
                <hr />
                <Row>
                    <Col md={6}>
                        <p className="mb-2">
                            <strong>Grades A4, A5, A6, A7 :</strong> Retraite à{' '}
                            <Badge 
                                color="light" 
                                style={{ 
                                    color: '#dc3545', 
                                    backgroundColor: '#fdecea', 
                                    fontWeight: '700',
                                    fontSize: '1.1rem'
                                }}
                            >
                                65 ans
                            </Badge>
                        </p>
                    </Col>
                    <Col md={6}>
                        <p className="mb-2">
                            <strong>Autres grades (A3, B1-B3, C1-C2, D1) :</strong> Retraite à{' '}
                            <Badge 
                                color="light" 
                                style={{ 
                                    color: '#dc3545', 
                                    backgroundColor: '#fdecea', 
                                    fontWeight: '700',
                                    fontSize: '1.1rem'
                                }}
                            >
                                60 ans
                            </Badge>
                        </p>
                    </Col>
                </Row>
                <p className="mb-0 mt-2">
                    <small>
                        <strong>Note :</strong> La date de retraite est toujours fixée au <strong>31 décembre</strong> de l'année de retraite.
                    </small>
                </p>
            </Alert>

            {/* Statistiques */}
            {stats && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="text-center" style={{ borderTop: '3px solid #dc3545' }}>
                            <CardBody>
                                <MdExitToApp style={{ fontSize: '2rem', color: '#dc3545' }} />
                                <h3 className="text-danger mt-2">{stats.statistics.deja_retraites || 0}</h3>
                                <p className="text-muted mb-0">Déjà retraités</p>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center" style={{ borderTop: '3px solid #ffc107' }}>
                            <CardBody>
                                <MdExitToApp style={{ fontSize: '2rem', color: '#ffc107' }} />
                                <h3 className="text-warning mt-2">{stats.statistics.retraites_prochaine_annee || 0}</h3>
                                <p className="text-muted mb-0">Retraites cette année</p>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center" style={{ borderTop: '3px solid #17a2b8' }}>
                            <CardBody>
                                <MdExitToApp style={{ fontSize: '2rem', color: '#17a2b8' }} />
                                <h3 className="text-info mt-2">{stats.statistics.retraites_5_ans || 0}</h3>
                                <p className="text-muted mb-0">Retraites dans 5 ans</p>
                            </CardBody>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="text-center" style={{ borderTop: '3px solid #6c757d' }}>
                            <CardBody>
                                <MdRefresh style={{ fontSize: '2rem', color: '#6c757d' }} />
                                <h3 className="text-secondary mt-2">{stats.statistics.sans_date_retraite || 0}</h3>
                                <p className="text-muted mb-0">Sans date calculée</p>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Section Projection/Estimation */}
            <Card className="mb-4" style={{ borderLeft: '4px solid #17a2b8' }}>
                <CardHeader style={{ backgroundColor: '#e7f5ff' }}>
                    <Row className="align-items-center">
                        <Col>
                            <CardTitle className="mb-0">
                                <MdTrendingUp className="me-2" style={{ color: '#17a2b8' }} />
                                Projection des Retraites sur une Période
                            </CardTitle>
                        </Col>
                    </Row>
                </CardHeader>
                <CardBody>
                    <Row className="align-items-end">
                        <Col md={3}>
                            <FormGroup>
                                <Label>Sélectionnez la période (en années)</Label>
                                <Input
                                    type="select"
                                    value={projectionYears}
                                    onChange={(e) => handleProjectionYearsChange(parseInt(e.target.value))}
                                >
                                    <option value="1">1 an</option>
                                    <option value="2">2 ans</option>
                                    <option value="3">3 ans</option>
                                    <option value="5">5 ans</option>
                                    <option value="10">10 ans</option>
                                    <option value="15">15 ans</option>
                                    <option value="20">20 ans</option>
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md={3}>
                            <FormGroup>
                                <Label>Ou période personnalisée</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={projectionYears}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val >= 1 && val <= 50) {
                                            handleProjectionYearsChange(val);
                                        }
                                    }}
                                    placeholder="Nombre d'années"
                                />
                            </FormGroup>
                        </Col>
                        <Col md={6} className="text-end">
                            <Button 
                                color="info"
                                onClick={() => loadProjection(projectionYears)}
                                className="mb-3 me-2"
                            >
                                <MdRefresh className="me-1" />
                                Calculer la projection
                            </Button>
                            {showProjection && projection && (
                                <Button 
                                    color="danger"
                                    onClick={handleExportProjectionPDF}
                                    className="mb-3"
                                >
                                    <MdPictureAsPdf className="me-1" />
                                    Exporter en PDF
                                </Button>
                            )}
                        </Col>
                    </Row>

                    {/* Affichage de la projection */}
                    {showProjection && projection && (
                        <>
                            <hr />
                            <Alert color="info">
                                <h5 className="alert-heading">
                                    📊 Estimation pour les {projection.periode.annees} prochaine{projection.periode.annees > 1 ? 's' : ''} année{projection.periode.annees > 1 ? 's' : ''}
                                </h5>
                                <p className="mb-0">
                                    Période : {new Date(projection.periode.date_debut).toLocaleDateString('fr-FR')} 
                                    → {new Date(projection.periode.date_fin).toLocaleDateString('fr-FR')}
                                </p>
                            </Alert>

                            {/* Statistiques globales de la projection */}
                            <Row className="mb-3">
                                <Col md={4}>
                                    <Card className="text-center" style={{ borderTop: '3px solid #17a2b8' }}>
                                        <CardBody>
                                            <h2 className="text-info">{projection.statistiques_globales.total_departs_prevus}</h2>
                                            <p className="text-muted mb-0">
                                                <strong>Total de départs prévus</strong>
                                            </p>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="text-center" style={{ borderTop: '3px solid #007bff' }}>
                                        <CardBody>
                                            <h3 className="text-primary">{projection.statistiques_globales.departs_65_ans}</h3>
                                            <p className="text-muted mb-0">Départs à 65 ans</p>
                                            <small className="text-muted">(Grades A4-A7)</small>
                                        </CardBody>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="text-center" style={{ borderTop: '3px solid #6c757d' }}>
                                        <CardBody>
                                            <h3 className="text-secondary">{projection.statistiques_globales.departs_60_ans}</h3>
                                            <p className="text-muted mb-0">Départs à 60 ans</p>
                                            <small className="text-muted">(Autres grades)</small>
                                        </CardBody>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Projection année par année */}
                            {projection.projection_par_annee && projection.projection_par_annee.length > 0 && (
                                <>
                                    <h5 className="mt-4 mb-3">📈 Répartition par année</h5>
                                    <div className="table-responsive">
                                        <Table bordered>
                                            <thead style={{ backgroundColor: '#e7f5ff' }}>
                                                <tr>
                                                    <th className="text-center" style={{ width: '10%' }}>Année</th>
                                                    <th className="text-center" style={{ width: '15%' }}>
                                                        <strong>Nombre de départs</strong>
                                                    </th>
                                                    <th className="text-center" style={{ width: '12%' }}>Départs à 60 ans</th>
                                                    <th className="text-center" style={{ width: '13%' }}>Départs à 65 ans</th>
                                                    <th style={{ width: '25%' }}>Catégories</th>
                                                    <th style={{ width: '25%' }}>Grades</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projection.projection_par_annee.map((yearData, index) => {
                                                    // Conversion robuste du nombre d'agents
                                                    let nbAgents = 0;
                                                    if (yearData.nombre_agents !== null && yearData.nombre_agents !== undefined) {
                                                        nbAgents = parseInt(yearData.nombre_agents.toString());
                                                        if (isNaN(nbAgents)) nbAgents = 0;
                                                    }
                                                    
                                                    console.log('Année:', yearData.annee_retraite, 'Nombre agents:', yearData.nombre_agents, 'Converti:', nbAgents);
                                                    
                                                    const yearKey = String(yearData.annee_retraite);
                                                    const yearBreakdown = projectionAgeBreakdown[yearKey] || {
                                                        departs60: yearData.departs_60_ans ?? 0,
                                                        departs65: yearData.departs_65_ans ?? 0
                                                    };
                                                    
                                                    return (
                                                        <tr key={index}>
                                                            <td className="text-center">
                                                                <strong style={{ fontSize: '1.1rem', color: '#000000' }}>
                                                                    {yearData.annee_retraite}
                                                                </strong>
                                                            </td>
                                                            <td className="text-center" style={{ backgroundColor: '#f0f0f0', padding: '12px' }}>
                                                                <strong style={{ fontSize: '1.5rem', color: '#000', fontWeight: 'bold' }}>
                                                                    {nbAgents}
                                                                </strong>
                                                            </td>
                                                            <td className="text-center" style={{ backgroundColor: '#fff8f0', fontWeight: '600', color: '#000000' }}>
                                                                {yearBreakdown.departs60 > 0 ? (
                                                                    <span>
                                                                        {yearBreakdown.departs60} agent{yearBreakdown.departs60 > 1 ? 's' : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#6c757d', fontWeight: '400' }}>-</span>
                                                                )}
                                                            </td>
                                                            <td className="text-center" style={{ backgroundColor: '#fff0f3', fontWeight: '600', color: '#000000' }}>
                                                                {yearBreakdown.departs65 > 0 ? (
                                                                    <span>
                                                                        {yearBreakdown.departs65} agent{yearBreakdown.departs65 > 1 ? 's' : ''}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ color: '#6c757d', fontWeight: '400' }}>-</span>
                                                                )}
                                                            </td>
                                                            <td>{yearData.categories || '-'}</td>
                                                            <td>{yearData.grades || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                                                <tr>
                                                    <td className="text-center"><strong style={{ fontSize: '1.1rem' }}>TOTAL</strong></td>
                                                    <td className="text-center" style={{ backgroundColor: '#e0e0e0', padding: '12px' }}>
                                                        <strong style={{ fontSize: '1.6rem', color: '#000', fontWeight: 'bold' }}>
                                                            {parseInt(projection.statistiques_globales.total_departs_prevus?.toString() || '0') || 0}
                                                        </strong>
                                                    </td>
                                                    <td className="text-center" style={{ backgroundColor: '#fff8f0', fontSize: '1rem', color: '#000000', fontWeight: '600' }}>
                                                        {projectionTotals.total60} départ{projectionTotals.total60 > 1 ? 's' : ''}
                                                    </td>
                                                    <td className="text-center" style={{ backgroundColor: '#fff0f3', fontSize: '1rem', color: '#000000', fontWeight: '600' }}>
                                                        {projectionTotals.total65} départ{projectionTotals.total65 > 1 ? 's' : ''}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </>
                            )}

                            {/* Liste détaillée des agents qui partiront à la retraite */}
                            {projection.liste_agents && projection.liste_agents.length > 0 && (
                                <>
                                    <h5 className="mt-4 mb-3">👥 Liste détaillée des {projection.liste_agents.length} agents</h5>
                                    <div className="table-responsive">
                                        <Table striped hover>
                                            <thead style={{ backgroundColor: '#e7f5ff' }}>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Matricule</th>
                                                    <th>Nom et Prénoms</th>
                                                    <th>Date de Naissance</th>
                                                    <th>Emploi</th>
                                                    <th>Fonction</th>
                                                    <th>Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {projection.liste_agents.map((agent, index) => (
                                                    <tr key={agent.id}>
                                                        <td>{index + 1}</td>
                                                        <td><strong>{agent.matricule || '-'}</strong></td>
                                                        <td>
                                                            <strong>{`${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-'}</strong>
                                                        </td>
                                                        <td>
                                                            {agent.date_de_naissance ? 
                                                                new Date(agent.date_de_naissance).toLocaleDateString('fr-FR') 
                                                                : '-'}
                                                        </td>
                                                        <td>{agent.emploi_libele || '-'}</td>
                                                        <td>{agent.fonction_libele || '-'}</td>
                                                        <td>{agent.grade_libele || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                </>
                            )}

                            {/* Message si aucun agent */}
                            {projection.liste_agents && projection.liste_agents.length === 0 && (
                                <Alert color="info" className="mt-4 text-center">
                                    <MdExitToApp style={{ fontSize: '3rem', opacity: 0.5 }} />
                                    <p className="mt-2 mb-0">
                                        Aucun départ à la retraite prévu sur les {projection.periode.annees} prochaine{projection.periode.annees > 1 ? 's' : ''} année{projection.periode.annees > 1 ? 's' : ''}.
                                    </p>
                                </Alert>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            <style jsx>{`
                .retraites-page {
                    padding: 20px;
                }
                .page-title {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                }
                .page-description {
                    color: #666;
                    margin-bottom: 0;
                }
                @media print {
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default RetraitesPage;

