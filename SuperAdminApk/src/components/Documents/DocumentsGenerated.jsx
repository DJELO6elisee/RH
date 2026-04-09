import React, { useState, useEffect, useRef } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    Table,
    Badge,
    Button,
    Row,
    Col,
    Input,
    Alert,
    Spinner,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Pagination,
    PaginationItem,
    PaginationLink
} from 'reactstrap';
import { useAuth } from '../../contexts/AuthContext';

const DocumentsGenerated = ({ typeDemande = 'absence', forceAgentView = false, includeCertificatPriseService = false }) => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [filters, setFilters] = useState({
        statut: '',
        date_from: '',
        date_to: ''
    });
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return window.innerWidth < 768;
    });
    
    // Référence pour vérifier si le composant est monté
    const isMountedRef = useRef(true);

    useEffect(() => {
        loadDocuments();
    }, [user?.id, filters, typeDemande, includeCertificatPriseService]);

    // Nettoyage lors du démontage du composant
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const loadDocuments = async () => {
        // Vérifier si le composant est encore monté avant de commencer
        if (!isMountedRef.current) {
            console.log('🔍 Composant démonté, annulation de loadDocuments');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log('🔍 Chargement des documents...');
            console.log('👤 Utilisateur connecté:', user);
            console.log('🔑 Rôle:', user?.role);
            console.log('🆔 ID Agent:', user?.id_agent);

            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    queryParams.append(key, filters[key]);
                }
            });

            // Si includeCertificatPriseService est true, ne pas filtrer par type_demande pour inclure tous les documents
            // Sinon, utiliser le filtre type_demande normal
            if (!includeCertificatPriseService) {
                queryParams.append('type_demande', typeDemande);
            }
            // Note: Si includeCertificatPriseService est true, on ne filtre pas pour récupérer tous les documents générés

            // Déterminer l'URL selon le rôle de l'utilisateur
            let apiUrl;
            
            // Vérifier si l'utilisateur peut valider des demandes (DRH, chef de service, super admin)
            const canValidateDemandes = () => {
                if (!user?.role) return false;
                const validatingRoles = ['drh', 'chef_service', 'directeur', 'ministre', 'super_admin'];
                const userRole = user.role.toLowerCase();
                console.log('🔍 Rôle utilisateur:', user.role, '-> normalisé:', userRole);
                return validatingRoles.includes(userRole);
            };

            // Si forceAgentView est true, toujours utiliser l'endpoint agent (pour l'espace personnel)
            if (forceAgentView) {
                // Forcer l'utilisation de l'endpoint agent pour voir uniquement ses propres documents
                apiUrl = `https://tourisme.2ise-groupe.com/api/documents/agent/${user.id_agent}`;
                console.log('🔍 Utilisation forcée de l\'endpoint agent pour l\'espace personnel:', user.id_agent);
            } else if (canValidateDemandes()) {
                // Pour les validateurs : utiliser la route validateur
                apiUrl = `https://tourisme.2ise-groupe.com/api/documents/validateur/${user.id_agent}`;
                console.log('🔍 Utilisation de l\'endpoint validateur pour l\'utilisateur:', user.id_agent);
            } else {
                // Pour les agents : utiliser la route agent
                apiUrl = `https://tourisme.2ise-groupe.com/api/documents/agent/${user.id_agent}`;
                console.log('🔍 Utilisation de l\'endpoint agent pour l\'utilisateur:', user.id_agent);
            }

            console.log('🌐 URL API:', `${apiUrl}?${queryParams}`);
            console.log('🔑 Token présent:', !!token);

            const response = await fetch(
                `${apiUrl}?${queryParams}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('📡 Status de la réponse:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erreur de réponse:', errorText);
                throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('📊 Réponse API documents:', data);
            console.log('📋 Nombre de documents reçus:', data.data ? data.data.length : 0);
            
            if (data.data && data.data.length > 0) {
                console.log('📄 Premier document:', data.data[0]);
                console.log('📄 Propriétés disponibles:', Object.keys(data.data[0]));
            }
            
            // Vérifier si le composant est encore monté avant de mettre à jour l'état
            if (isMountedRef.current) {
                setDocuments(data.data || []);
                setCurrentPage(1); // Réinitialiser à la première page
            }

        } catch (err) {
            console.error('Erreur lors du chargement des documents:', err);
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

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleViewDocument = async (document) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/documents/${document.id}/html`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedDocument({
                    ...document,
                    htmlContent: data.data.html
                });
                setModalOpen(true);
            } else {
                console.error('Erreur lors de la récupération du document HTML');
                setSelectedDocument(document);
                setModalOpen(true);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération du document HTML:', error);
            setSelectedDocument(document);
            setModalOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (docItem) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/documents/${docItem.id}/pdf`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                
                // Méthode alternative plus robuste pour le téléchargement
                try {
                    // Vérifier si nous sommes dans un environnement navigateur
                    if (typeof window !== 'undefined' && window.navigator && window.navigator.msSaveOrOpenBlob) {
                        // Internet Explorer
                        window.navigator.msSaveOrOpenBlob(blob, `${docItem.titre || 'document'}.pdf`);
                    } else if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
                        // Navigateurs modernes
                        const url = window.URL.createObjectURL(blob);
                        const link = window.document.createElement('a');
                        link.href = url;
                        link.download = `${docItem.titre || 'document'}.pdf`;
                        link.style.display = 'none';
                        
                        // Ajouter au DOM temporairement
                        window.document.body.appendChild(link);
                        link.click();
                        
                        // Nettoyer
                        setTimeout(() => {
                            window.document.body.removeChild(link);
                            window.URL.revokeObjectURL(url);
                        }, 100);
                        
                        console.log('✅ PDF téléchargé avec succès');
                    } else {
                        // Fallback: ouvrir dans un nouvel onglet
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        console.log('✅ PDF ouvert dans un nouvel onglet');
                    }
                } catch (downloadError) {
                    console.error('❌ Erreur lors du téléchargement:', downloadError);
                    // Fallback final: ouvrir dans un nouvel onglet
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    console.log('✅ PDF ouvert dans un nouvel onglet (fallback)');
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Erreur HTTP:', response.status, errorText);
                alert(`Erreur lors du téléchargement du PDF (${response.status}): ${errorText}`);
            }
        } catch (error) {
            console.error('❌ Erreur lors du téléchargement:', error);
            alert(`Erreur lors du téléchargement du PDF: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    const getStatusBadge = (statut) => {
        const statusConfig = {
            'generé': { color: 'success', text: 'Généré' },
            'transmis': { color: 'info', text: 'Transmis' },
            'en_attente': { color: 'warning', text: 'En attente' },
            'rejete': { color: 'danger', text: 'Rejeté' },
            'approuve': { color: 'success', text: 'Approuvé' }
        };

        const badgeStyleByColor = {
            success: { backgroundColor: '#d1f2d1', borderColor: '#9bd79b' },
            info: { backgroundColor: '#d7ebff', borderColor: '#9fc5e8' },
            warning: { backgroundColor: '#fff3cd', borderColor: '#ffe8a1' },
            danger: { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' },
            secondary: { backgroundColor: '#e2e3e5', borderColor: '#d6d8db' }
        };

        const config = statusConfig[statut] || { color: 'secondary', text: statut };
        const badgeStyle = badgeStyleByColor[config.color] || badgeStyleByColor.secondary;

        return (
            <Badge
                color={config.color}
                style={{
                    ...badgeStyle,
                    color: '#000',
                    fontWeight: 600
                }}
            >
                {config.text}
            </Badge>
        );
    };

    const getDocumentTypeLabel = (type) => {
        if (!type) {
            return 'Document';
        }
        const normalized = type.toLowerCase();
        const typeLabels = {
            'autorisation_absence': 'Autorisation d\'Absence',
            'absence': 'Autorisation d\'Absence',
            'autorisation_sortie_territoire': 'Autorisation de Sortie du Territoire',
            'sortie_territoire': 'Autorisation de Sortie du Territoire',
            'attestation_travail': 'Attestation de Travail',
            'attestation_presence': 'Attestation de Présence',
            'certificat_cessation': 'Certificat de Cessation',
            'certificat_reprise_service': 'Certificat de Reprise de Service',
            'certificat_reprise_service': 'Autorisation de Reprise de Service',
            'autorisation_reprise_service': 'Autorisation de Reprise de Service',
            'certificat_non_jouissance_conge': 'Certificat de Non Jouissance de Congé',
            'autorisation_conges': 'Autorisation de Congé',
            'autorisation_retraite': 'Autorisation de Retraite',
            'mutation': 'Note de Service de Mutation',
            'note_service_mutation': 'Note de Service de Mutation',
            'certificat_prise_service': 'Certificat de Prise de Service'
        };
        return typeLabels[normalized] || type;
    };

    const buildLocalDateFromDbDate = (dateValue) => {
        if (!dateValue) return null;
        const raw = String(dateValue).trim();
        if (!raw) return null;

        // Si c'est une date pure (sans heure), on garde la date brute.
        const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            return new Date(Number(year), Number(month) - 1, Number(day));
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (dateString) => {
        const date = buildLocalDateFromDbDate(dateString);
        if (!date) return 'N/A';
        return date.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const renderPeriod = (document) => {
        if (!document) {
            return 'N/A';
        }
        const normalizedType = (document.type_document || document.type_demande || '').toLowerCase();
        if (['certificat_reprise_service', 'autorisation_reprise_service'].includes(normalizedType)) {
            const reprise =
                document.date_reprise_service ||
                document.date_debut ||
                document.date_fin ||
                document.date_fin_conges;
            const repriseLabel = reprise ? formatDate(reprise) : 'Non renseignée';
            return `Reprise : ${repriseLabel}`;
        }
        if (normalizedType === 'certificat_non_jouissance_conge') {
            // Pour le certificat de non jouissance de congé, afficher l'année
            const annee = document.annee_non_jouissance_conge || 
                         (document.description ? document.description.match(/année\s+(\d{4})/i)?.[1] : null) ||
                         'Non renseignée';
            return `Année : ${annee}`;
        }
        const debut = document.date_debut;
        const fin = document.date_fin;
        if (debut && fin) {
            const debutDate = formatDate(debut);
            const finDate = formatDate(fin);
            return `${debutDate} - ${finDate}`;
        }
        if (debut) {
            return formatDate(debut);
        }
        if (fin) {
            return formatDate(fin);
        }
        return 'N/A';
    };

    // Pagination
    const totalPages = Math.ceil(documents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentDocuments = documents.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
                <Spinner color="primary" />
                <span className="ml-2">Chargement des documents...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                <h4 className="alert-heading">Erreur</h4>
                <p>Une erreur est survenue lors du chargement des documents : {error}</p>
                <hr />
                <Button color="primary" onClick={loadDocuments}>
                    Réessayer
                </Button>
            </Alert>
        );
    }

    return (
        <div>
            <Card>
                <CardHeader>
                    <h4 className="mb-0">
                        {includeCertificatPriseService ? 'TOUS MES DOCUMENTS GÉNÉRÉS' : (
                            {
                                'absence': 'AUTORISATIONS D\'ABSENCE GÉNÉRÉES',
                                'autorisation_conges': 'AUTORISATIONS DE CONGÉ GÉNÉRÉES',
                                'certificat_reprise_service': 'AUTORISATIONS DE REPRISE DE SERVICE GÉNÉRÉES',
                                'sortie_territoire': 'AUTORISATIONS DE SORTIE GÉNÉRÉES',
                                'attestation_travail': 'ATTESTATIONS DE TRAVAIL GÉNÉRÉES',
                                'attestation_presence': 'ATTESTATIONS DE PRÉSENCE GÉNÉRÉES',
                                'certificat_cessation': 'CERTIFICATS DE CESSATION GÉNÉRÉS',
                                'certificat_reprise_service': 'CERTIFICATS DE REPRISE DE SERVICE GÉNÉRÉS',
                                'certificat_non_jouissance_conge': 'CERTIFICATS DE NON JOUISSANCE DE CONGÉ GÉNÉRÉS',
                                'autorisation_retraite': 'AUTORISATIONS DE RETRAITE GÉNÉRÉES',
                                'mutation': 'NOTES DE SERVICE DE MUTATION GÉNÉRÉES',
                                'note_service_mutation': 'NOTES DE SERVICE DE MUTATION GÉNÉRÉES'
                            }[typeDemande] || 'DOCUMENTS GÉNÉRÉS'
                        )}
                    </h4>
                </CardHeader>
                <CardBody>
                    {/* Filtres */}
                    <Row className="mb-3">
                        <Col xs="12" md={3} className="mb-2 mb-md-0">
                            <Input
                                type="select"
                                value={filters.statut}
                                onChange={(e) => handleFilterChange('statut', e.target.value)}
                            >
                                <option value="">Tous les statuts</option>
                                <option value="generé">Généré</option>
                                <option value="transmis">Transmis</option>
                                <option value="en_attente">En attente</option>
                                <option value="rejete">Rejeté</option>
                                <option value="approuve">Approuvé</option>
                            </Input>
                        </Col>
                        <Col xs="12" md={3} className="mb-2 mb-md-0">
                            <Input
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                placeholder="Date de début"
                            />
                        </Col>
                        <Col xs="12" md={3} className="mb-2 mb-md-0">
                            <Input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                placeholder="Date de fin"
                            />
                        </Col>
                        <Col xs="12" md={3}>
                            <Button color="primary" onClick={loadDocuments} className="w-100 w-md-auto">
                                Filtrer
                            </Button>
                        </Col>
                    </Row>

                    {/* Table des documents */}
                    {documents.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-muted">Aucun document généré</p>
                        </div>
                    ) : (
                        <>
                            {!isMobile ? (
                                <Table responsive striped>
                                    <thead>
                                        <tr>
                                            <th>Agent</th>
                                            <th>Type de Document</th>
                                            <th>Période</th>
                                            <th>Date de Génération</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentDocuments.map((document) => (
                                            <tr key={document.id}>
                                                <td>
                                                    {document.agent_prenom} {document.agent_nom}
                                                    <br />
                                                    <small className="text-muted">
                                                        Matricule: {document.agent_matricule}
                                                    </small>
                                                </td>
                                                <td>{getDocumentTypeLabel(document.type_document)}</td>
                                                <td>
                                                    {renderPeriod(document)}
                                                </td>
                                                <td>{formatDate(document.date_generation)}</td>
                                                <td>{getStatusBadge(document.statut)}</td>
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            color="info"
                                                            size="sm"
                                                            onClick={() => handleViewDocument(document)}
                                                        >
                                                            Voir
                                                        </Button>
                                                        <Button
                                                            color="success"
                                                            size="sm"
                                                            onClick={() => handleDownloadPDF(document)}
                                                        >
                                                            📄 PDF
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className="documents-mobile-list">
                                    {currentDocuments.map((document) => (
                                        <div className="document-mobile-card" key={document.id}>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <div>
                                                    <div className="document-mobile-type">
                                                        {getDocumentTypeLabel(document.type_document)}
                                                    </div>
                                                    <div className="document-mobile-agent text-muted">
                                                        {document.agent_prenom} {document.agent_nom} • {document.agent_matricule}
                                                    </div>
                                                </div>
                                                <span className="document-mobile-date">
                                                    {formatDate(document.date_generation)}
                                                </span>
                                            </div>

                                            <div className="document-mobile-row">
                                                <span className="document-mobile-label">Période</span>
                                                <span className="document-mobile-value">
                                                    {renderPeriod(document)}
                                                </span>
                                            </div>

                                            <div className="document-mobile-row">
                                                <span className="document-mobile-label">Statut</span>
                                                <span className="document-mobile-badge">
                                                    {getStatusBadge(document.statut)}
                                                </span>
                                            </div>

                                            <div className="document-mobile-actions">
                                                <Button
                                                    color="info"
                                                    size="sm"
                                                    className="me-2 flex-grow-1"
                                                    onClick={() => handleViewDocument(document)}
                                                >
                                                    <i className="fa fa-eye me-1"></i>
                                                    Voir
                                                </Button>
                                                <Button
                                                    color="success"
                                                    size="sm"
                                                    className="flex-grow-1"
                                                    onClick={() => handleDownloadPDF(document)}
                                                >
                                                    📄 PDF
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <Pagination>
                                    <PaginationItem disabled={currentPage === 1}>
                                        <PaginationLink
                                            previous
                                            onClick={() => handlePageChange(currentPage - 1)}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <PaginationItem key={page} active={page === currentPage}>
                                            <PaginationLink onClick={() => handlePageChange(page)}>
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem disabled={currentPage === totalPages}>
                                        <PaginationLink
                                            next
                                            onClick={() => handlePageChange(currentPage + 1)}
                                        />
                                    </PaginationItem>
                                </Pagination>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Modal de visualisation */}
            <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} size="xl">
                <ModalHeader toggle={() => setModalOpen(false)}>
                    {selectedDocument ? getDocumentTypeLabel(selectedDocument.type_document) : 'Document'}
                </ModalHeader>
                <ModalBody style={{ padding: 0 }}>
                    {selectedDocument && selectedDocument.htmlContent ? (
                        <div 
                            style={{ 
                                height: '70vh', 
                                overflow: 'auto',
                                border: '1px solid #dee2e6',
                                borderRadius: '0.375rem'
                            }}
                            dangerouslySetInnerHTML={{ __html: selectedDocument.htmlContent }}
                        />
                    ) : selectedDocument ? (
                        <div className="p-3">
                            <Row>
                                <Col md={6}>
                                    <strong>Agent:</strong> {selectedDocument.agent_prenom} {selectedDocument.agent_nom}
                                </Col>
                                <Col md={6}>
                                    <strong>Matricule:</strong> {selectedDocument.agent_matricule}
                                </Col>
                            </Row>
                            <Row className="mt-2">
                                <Col md={6}>
                                    <strong>Type:</strong> {getDocumentTypeLabel(selectedDocument.type_document)}
                                </Col>
                                <Col md={6}>
                                    <strong>Statut:</strong> {getStatusBadge(selectedDocument.statut)}
                                </Col>
                            </Row>
                            <Row className="mt-2">
                                <Col md={6}>
                                    <strong>Date de génération:</strong> {formatDate(selectedDocument.date_generation)}
                                </Col>
                                <Col md={6}>
                                    <strong>Période:</strong> {renderPeriod(selectedDocument)}
                                </Col>
                            </Row>
                            <Row className="mt-3">
                                <Col>
                                    <div className="d-flex gap-2">
                                        <Button
                                            color="success"
                                            size="sm"
                                            onClick={() => handleDownloadPDF(selectedDocument)}
                                        >
                                            📄 Télécharger PDF
                                        </Button>
                                        <Button
                                            color="primary"
                                            size="sm"
                                            onClick={() => {
                                                if (selectedDocument.htmlContent) {
                                                    const printWindow = window.open('', '_blank');
                                                    printWindow.document.write(`
                                                        <!DOCTYPE html>
                                                        <html lang="fr">
                                                        <head>
                                                            <meta charset="UTF-8">
                                                            <title>Imprimer - ${selectedDocument.titre || 'Document'}</title>
                                                            <style>
                                                                @media print { body { margin: 0; padding: 15px; font-size: 12pt; } }
                                                                body { font-family: 'Times New Roman', serif; line-height: 1.4; color: #000; }
                                                            </style>
                                                        </head>
                                                        <body>${selectedDocument.htmlContent}</body>
                                                        </html>
                                                    `);
                                                    printWindow.document.close();
                                                    printWindow.print();
                                                }
                                            }}
                                        >
                                            🖨️ Imprimer
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    ) : (
                        <div className="p-3 text-center">
                            <p>Aucun document sélectionné</p>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setModalOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

        </div>
    );
};

export default DocumentsGenerated;