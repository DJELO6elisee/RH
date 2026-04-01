import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardTitle,
    Button,
    Table,
    Alert,
    Spinner,
    Input,
    Label,
    Badge
} from 'reactstrap';
import { MdInfo } from 'react-icons/md';
import {
    MdList,
    MdRefresh,
    MdFileDownload,
    MdPictureAsPdf,
    MdPrint,
    MdClose,
    MdExpandMore,
    MdExpandLess
} from 'react-icons/md';
import { getAuthHeaders, getApiUrl } from '../../config/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const apiUrl = getApiUrl();

const RapportCongesOrganisation = ({ selectedYear, onClose }) => {
    const [rapportData, setRapportData] = useState(null);
    const [loadingRapport, setLoadingRapport] = useState(false);
    const [expandedStructures, setExpandedStructures] = useState({});

    useEffect(() => {
        loadRapport();
    }, [selectedYear]);

    const loadRapport = async () => {
        setLoadingRapport(true);
        try {
            const response = await fetch(`${apiUrl}/api/planning-previsionnel/rapport-organisation/${selectedYear}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}`);
            }

            const result = await response.json();
            if (result.success) {
                setRapportData(result.data);
            } else {
                console.error('Erreur lors du chargement du rapport:', result.error);
            }
        } catch (error) {
            console.error('Erreur lors du chargement du rapport:', error);
        } finally {
            setLoadingRapport(false);
        }
    };

    const toggleStructure = (directionKey, sousDirectionKey, serviceKey) => {
        const key = `${directionKey}_${sousDirectionKey}_${serviceKey}`;
        setExpandedStructures(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR');
        } catch (e) {
            return dateString;
        }
    };

    const handleExportExcel = () => {
        if (!rapportData) return;

        const data = [];
        
        // En-têtes
        data.push(['Direction', 'Sous-direction', 'Service', 'Matricule', 'Nom', 'Prénoms', 'Date de début', 'Date de fin', 'Rôle']);

        // Parcourir la structure
        Object.values(rapportData).forEach(direction => {
            Object.values(direction.sous_directions).forEach(sousDirection => {
                Object.values(sousDirection.services).forEach(service => {
                    service.agents.forEach(agent => {
                        const dateDebut = agent.date_debut 
                            ? new Date(agent.date_debut).toLocaleDateString('fr-FR')
                            : '-';
                        const dateFin = agent.date_fin 
                            ? new Date(agent.date_fin).toLocaleDateString('fr-FR')
                            : '-';
                        
                        data.push([
                            direction.libelle,
                            sousDirection.libelle,
                            service.libelle,
                            agent.matricule || '-',
                            agent.nom || '-',
                            agent.prenom || '-',
                            dateDebut,
                            dateFin,
                            agent.role_agent || 'Agent'
                        ]);
                    });
                });
            });
        });

        // Créer le workbook
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Agents en congés');

        // Ajuster les largeurs des colonnes
        const colWidths = [
            { wch: 25 }, // Direction
            { wch: 25 }, // Sous-direction
            { wch: 25 }, // Service
            { wch: 15 }, // Matricule
            { wch: 20 }, // Nom
            { wch: 20 }, // Prénoms
            { wch: 15 }, // Date début
            { wch: 15 }, // Date fin
            { wch: 20 }  // Rôle
        ];
        worksheet['!cols'] = colWidths;

        // Générer le fichier
        const fileName = `Rapport_Conges_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const handleExportPDF = async () => {
        if (!rapportData) return;

        const pdf = new jsPDF('l', 'mm', 'a4'); // Paysage
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let yPosition = 20;
        const margin = 10;
        const lineHeight = 7;

        // Titre
        pdf.setFontSize(16);
        pdf.text(`Rapport des agents en congés - Année ${selectedYear}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;

        pdf.setFontSize(10);
        let currentPage = 1;

        // Parcourir la structure
        Object.values(rapportData).forEach((direction, dirIndex) => {
            // Vérifier si on doit ajouter une nouvelle page
            if (yPosition > pageHeight - 30) {
                pdf.addPage();
                currentPage++;
                yPosition = 20;
            }

            // Direction
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(`Direction: ${direction.libelle}`, margin, yPosition);
            yPosition += lineHeight;

            Object.values(direction.sous_directions).forEach((sousDirection, sdIndex) => {
                if (yPosition > pageHeight - 30) {
                    pdf.addPage();
                    currentPage++;
                    yPosition = 20;
                }

                // Sous-direction
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'bold');
                pdf.text(`  Sous-direction: ${sousDirection.libelle}`, margin + 5, yPosition);
                yPosition += lineHeight;

                Object.values(sousDirection.services).forEach((service, svcIndex) => {
                    if (yPosition > pageHeight - 30) {
                        pdf.addPage();
                        currentPage++;
                        yPosition = 20;
                    }

                    // Service
                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`    Service: ${service.libelle}`, margin + 10, yPosition);
                    yPosition += lineHeight;

                    // Agents
                    pdf.setFontSize(9);
                    pdf.setFont(undefined, 'normal');
                    service.agents.forEach(agent => {
                        if (yPosition > pageHeight - 30) {
                            pdf.addPage();
                            currentPage++;
                            yPosition = 20;
                        }

                        const dateDebut = agent.date_debut 
                            ? new Date(agent.date_debut).toLocaleDateString('fr-FR')
                            : '-';
                        const dateFin = agent.date_fin 
                            ? new Date(agent.date_fin).toLocaleDateString('fr-FR')
                            : '-';
                        const role = agent.role_agent || 'Agent';
                        
                        const text = `      ${agent.matricule || '-'} - ${agent.nom || '-'} ${agent.prenom || '-'} - Du ${dateDebut} au ${dateFin} (${role})`;
                        pdf.text(text, margin + 15, yPosition);
                        yPosition += lineHeight;
                    });
                });
            });
        });

        // Générer le fichier
        const fileName = `Rapport_Conges_${selectedYear}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card>
            <CardBody>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <CardTitle tag="h5" className="mb-0" style={{ color: '#212529' }}>
                        <MdList className="me-2" style={{ color: '#007bff' }} />
                        Rapport des agents en congés par organisation - Année {selectedYear}
                    </CardTitle>
                    <div className="d-flex gap-2">
                        <Button
                            color="secondary"
                            size="sm"
                            onClick={loadRapport}
                            disabled={loadingRapport}
                        >
                            <MdRefresh className={loadingRapport ? 'spinning' : ''} />
                        </Button>
                        <Button
                            color="primary"
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={!rapportData || loadingRapport}
                        >
                            <MdFileDownload className="me-1" />
                            Excel
                        </Button>
                        <Button
                            color="primary"
                            size="sm"
                            onClick={handleExportPDF}
                            disabled={!rapportData || loadingRapport}
                        >
                            <MdPictureAsPdf className="me-1" />
                            PDF
                        </Button>
                        <Button
                            color="primary"
                            size="sm"
                            onClick={handlePrint}
                            disabled={!rapportData || loadingRapport}
                        >
                            <MdPrint className="me-1" />
                            Imprimer
                        </Button>
                        <Button
                            color="secondary"
                            size="sm"
                            onClick={onClose}
                        >
                            <MdClose />
                        </Button>
                    </div>
                </div>

                {/* Note informative pour la DRH */}
                <Alert color="info" className="mb-4">
                    <div className="d-flex align-items-start">
                        <MdInfo className="me-2 mt-1" style={{ fontSize: '1.2rem' }} />
                        <div>
                            <strong>Note importante - Logique de détermination des agents en congés :</strong>
                            <ul className="mb-0 mt-2" style={{ paddingLeft: '1.5rem' }}>
                                <li>
                                    <strong>Types de congés considérés :</strong> 
                                    Les demandes de type <strong>'conges'</strong>, <strong>'absence'</strong> et <strong>'conge'</strong> sont prises en compte dans ce rapport.
                                </li>
                                <li>
                                    <strong>Agent simple :</strong> Un agent est considéré en congés si sa demande de congés est validée par la DRH.
                                </li>
                                <li>
                                    <strong>Agents DRH, Directeur, Sous-directeur, Directeur Général, Directeur Central :</strong> 
                                    Ces agents sont en congés si leur demande est validée par le Directeur de Cabinet.
                                </li>
                                <li>
                                    <strong>Directeur de Cabinet, Chef de Cabinet :</strong> 
                                    Ces agents sont en congés si leur demande est validée par le Ministre.
                                </li>
                                <li>
                                    <strong>Durée du congé :</strong> 
                                    Un agent reste en congés tant qu'il n'a pas effectué une demande de reprise de service validée, 
                                    même si sa date de fin de congés est arrivée.
                                </li>
                                <li>
                                    <strong>Période :</strong> 
                                    Seuls les agents dont la date de début de congés est égale ou antérieure à aujourd'hui sont affichés.
                                </li>
                            </ul>
                        </div>
                    </div>
                </Alert>

                {loadingRapport ? (
                    <div className="text-center py-4">
                        <Spinner color="primary" />
                        <p className="mt-2">Chargement du rapport...</p>
                    </div>
                ) : !rapportData || Object.keys(rapportData).length === 0 ? (
                    <Alert color="info">
                        Aucun agent en congés trouvé pour l'année {selectedYear}
                    </Alert>
                ) : (
                    <div id="rapport-content">
                        {Object.values(rapportData).map((direction, dirIndex) => (
                            <div key={dirIndex} className="mb-4">
                                <Card className="mb-2">
                                    <CardBody>
                                        <h5 className="mb-3" style={{ color: '#212529', fontWeight: 'bold' }}>
                                            Direction: {direction.libelle}
                                        </h5>
                                        {Object.values(direction.sous_directions).map((sousDirection, sdIndex) => (
                                            <div key={sdIndex} className="mb-3 ms-3">
                                                <h6 className="mb-2" style={{ color: '#495057', fontWeight: 'bold' }}>
                                                    Sous-direction: {sousDirection.libelle}
                                                </h6>
                                                {Object.values(sousDirection.services).map((service, svcIndex) => {
                                                    const structureKey = `${dirIndex}_${sdIndex}_${svcIndex}`;
                                                    const isExpanded = expandedStructures[structureKey];
                                                    return (
                                                        <div key={svcIndex} className="mb-2 ms-3">
                                                            <div 
                                                                className="d-flex align-items-center mb-2"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => toggleStructure(dirIndex, sdIndex, svcIndex)}
                                                            >
                                                                {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
                                                                <span className="ms-2" style={{ fontWeight: '600', color: '#212529' }}>
                                                                    Service: {service.libelle} ({service.agents.length} agent{service.agents.length > 1 ? 's' : ''})
                                                                </span>
                                                            </div>
                                                            {isExpanded && (
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
                                                                                        {formatDateShort(agent.date_debut)}
                                                                                    </Badge>
                                                                                </td>
                                                                                <td>
                                                                                    <Badge color={agent.date_fin && new Date(agent.date_fin) < new Date() ? 'secondary' : 'primary'}>
                                                                                        {formatDateShort(agent.date_fin) || 'En cours'}
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
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </CardBody>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default RapportCongesOrganisation;

