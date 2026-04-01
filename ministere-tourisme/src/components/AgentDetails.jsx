import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Row,
    Col,
    Badge,
    Spinner,
    Alert,
    Button
} from 'reactstrap';
import { 
    MdPerson, 
    MdArrowBack, 
    MdEdit, 
    MdEmail, 
    MdPhone, 
    MdLocationOn, 
    MdWork, 
    MdGroup, 
    MdSchool,
    MdAdminPanelSettings,
    MdCalendarToday,
    MdBadge,
    MdHome,
    MdBusiness,
    MdPhoto,
    MdAttachFile,
    MdVisibility,
    MdDownload,
    MdDescription
} from 'react-icons/md';
import { useHistory } from 'react-router-dom';

const AgentDetails = ({ agentId }) => {
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const history = useHistory();

    useEffect(() => {
        if (agentId) {
            loadAgentDetails();
        }
    }, [agentId]);

    const loadAgentDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('🔍 Données de l\'agent reçues:', result.data);
                console.log('🔍 Photos de l\'agent:', result.data.photos);
                console.log('🔍 Documents de l\'agent:', result.data.documents);
                setAgent(result.data);
            } else {
                setError('Agent non trouvé');
            }
        } catch (err) {
            setError('Erreur lors du chargement des détails de l\'agent');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        history.push('/agents');
    };

    const handleEdit = () => {
        history.push(`/agents?edit=${agentId}`);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                <Spinner color="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                {error}
            </Alert>
        );
    }

    if (!agent) {
        return (
            <Alert color="warning">
                Aucun agent trouvé avec cet ID.
            </Alert>
        );
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    // Pour les diplômes : date_diplome est une année (INTEGER), pas une date complète (évite 1970)
    const formatDiplomeYear = (value) => {
        if (value === null || value === undefined) return '-';
        const n = parseInt(value, 10);
        if (!Number.isNaN(n) && n >= 1900 && n <= 2100) return String(n);
        if (/^\d{4}$/.test(String(value))) return String(value);
        return formatDate(value);
    };

    const getStatusBadge = (status) => {
        const colorMap = {
            'actif': 'success',
            'inactif': 'secondary',
            'retraite': 'info',
            'demission': 'warning',
            'licencie': 'danger'
        };
        return (
            <Badge color={colorMap[status] || 'secondary'}>
                {status || 'Non spécifié'}
            </Badge>
        );
    };

    // Fonction pour obtenir la photo de profil
    const getProfilePhoto = () => {
        if (!agent.photos || agent.photos.length === 0) {
            console.log('🔍 Aucune photo trouvée pour l\'agent');
            return null;
        }
        const profilePhoto = agent.photos.find(photo => photo.is_profile_photo) || agent.photos[0];
        console.log('🔍 Photo de profil trouvée:', profilePhoto);
        return profilePhoto;
    };

    // Fonction pour formater la taille des fichiers
    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Fonction pour obtenir l'icône selon le type de document
    const getDocumentIcon = (documentType) => {
        const iconMap = {
            'diplome': <MdSchool />,
            'certificat_travail': <MdWork />,
            'attestation_formation': <MdSchool />,
            'autres_documents': <MdAttachFile />
        };
        return iconMap[documentType] || <MdAttachFile />;
    };

    // Fonction pour obtenir le nom du type de document
    const getDocumentTypeName = (documentType) => {
        const nameMap = {
            'diplome': 'Diplôme',
            'certificat_travail': 'Certificat de travail',
            'attestation_formation': 'Attestation de formation',
            'autres_documents': 'Autres documents'
        };
        return nameMap[documentType] || documentType;
    };

    // Fonction pour ouvrir/télécharger un document via l'API
    const openDocument = async (doc) => {
        if (!doc.id || !agentId) return;
        try {
            const token = localStorage.getItem('token');
            const url = `https://tourisme.2ise-groupe.com/api/agents/${agentId}/documents/${doc.id}/file`;
            
            console.log('🔍 Téléchargement du document:', { docId: doc.id, agentId, url });
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erreur HTTP:', response.status, errorData);
                alert(errorData.message || errorData.error || 'Impossible de télécharger le document. Veuillez réessayer.');
                return;
            }
            
            // Récupérer le Content-Type depuis les en-têtes
            let contentType = response.headers.get('Content-Type') || '';
            if (contentType.includes(';')) {
                contentType = contentType.split(';')[0].trim();
            }
            
            // Utiliser blob() directement
            let blob = await response.blob();
            
            // Détecter le type réel du fichier en lisant les premiers octets
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Détecter le type de fichier depuis la signature (magic bytes)
            let detectedMimeType = contentType;
            if (uint8Array.length >= 4) {
                // PDF: commence par %PDF
                if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
                    detectedMimeType = 'application/pdf';
                }
                // JPEG: commence par FF D8 FF
                else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
                    detectedMimeType = 'image/jpeg';
                }
                // PNG: commence par 89 50 4E 47
                else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
                    detectedMimeType = 'image/png';
                }
                // GIF: commence par GIF89a ou GIF87a
                else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
                    detectedMimeType = 'image/gif';
                }
            }
            
            // Recréer le blob avec le type MIME détecté
            if (detectedMimeType && detectedMimeType !== 'application/octet-stream') {
                blob = new Blob([arrayBuffer], { type: detectedMimeType });
            } else if (blob.type === 'application/octet-stream' && contentType) {
                blob = new Blob([arrayBuffer], { type: contentType });
            }
            
            const blobUrl = URL.createObjectURL(blob);
            
            // Utiliser le nom du document et corriger l'extension selon le type réel
            let fileName = doc.document_name || 'document';
            
            // Mapper le type MIME à l'extension
            const extensionMap = {
                'application/pdf': '.pdf',
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'application/vnd.ms-excel': '.xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
            };
            
            const finalMimeType = blob.type || detectedMimeType || contentType;
            const correctExtension = extensionMap[finalMimeType] || '';
            
            // Retirer l'ancienne extension et ajouter la bonne
            if (correctExtension) {
                const lastDotIndex = fileName.lastIndexOf('.');
                if (lastDotIndex !== -1) {
                    // Remplacer l'extension existante
                    fileName = fileName.substring(0, lastDotIndex) + correctExtension;
                } else {
                    // Ajouter l'extension si elle n'existe pas
                    fileName += correctExtension;
                }
            }
            
            // Créer un lien de téléchargement
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Nettoyer l'URL après 1 minute
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (err) {
            console.error('❌ Erreur lors du téléchargement du document:', err);
            alert('Erreur lors du téléchargement du document. Veuillez réessayer.');
        }
    };

    // Fonction pour télécharger un document via l'API
    const downloadDocument = async (doc) => {
        if (!doc.id || !agentId) return;
        try {
            const token = localStorage.getItem('token');
            const url = `https://tourisme.2ise-groupe.com/api/agents/${agentId}/documents/${doc.id}/file`;
            
            console.log('🔍 Téléchargement du document:', { docId: doc.id, agentId, url });
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Erreur HTTP:', response.status, errorData);
                alert(errorData.message || errorData.error || 'Impossible de télécharger le document. Veuillez réessayer.');
                return;
            }
            
            // Utiliser blob() directement
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // Utiliser le nom du document ou un nom par défaut
            const fileName = doc.document_name || 'document';
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Nettoyer l'URL après 1 minute
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (err) {
            console.error('❌ Erreur lors du téléchargement du document:', err);
            alert('Erreur lors du téléchargement du document. Veuillez réessayer.');
        }
    };

    return (
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
                {/* En-tête traditionnel */}
                <div style={{
                    background: '#343a40',
                    color: 'white',
                    padding: '20px',
                    borderBottom: '3px solid #007bff'
                }}>
                    <Row className="align-items-center">
                        <Col md="8">
                            <div className="d-flex align-items-center">
                                {getProfilePhoto() ? (
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '4px',
                                        background: '#6c757d',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '15px',
                                        border: '2px solid #495057',
                                        overflow: 'hidden'
                                    }}>
                                        <img 
                                            src={`https://tourisme.2ise-groupe.com/api/images/public/photo/${getProfilePhoto().id}?t=${Date.now()}`} 
                                            alt="Photo de profil"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                            onLoad={() => {
                                                console.log('✅ Photo de profil chargée avec succès');
                                            }}
                                            onError={(e) => {
                                                console.error('❌ Erreur de chargement de la photo de profil:', e.target.src);
                                                // Afficher l'icône de fallback
                                                e.target.style.display = 'none';
                                                const fallback = e.target.nextElementSibling;
                                                if (fallback) {
                                                    fallback.style.display = 'flex';
                                                }
                                            }}
                                        />
                                        <div style={{
                                            display: 'none',
                                            width: '100%',
                                            height: '100%',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <MdPerson size={30} />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '4px',
                                        background: '#6c757d',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '15px',
                                        border: '2px solid #495057'
                                    }}>
                                        <MdPerson size={30} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="mb-1" style={{ fontWeight: '600', fontSize: '1.5rem' }}>
                                        {agent.nom} {agent.prenom}
                                    </h3>
                                    <p className="mb-2" style={{ fontSize: '1rem', opacity: 0.9 }}>
                                        {agent.matricule}
                                    </p>
                                    <Badge 
                                        color={agent.statut_emploi === 'actif' ? 'success' : 'secondary'}
                                        style={{ padding: '4px 8px', borderRadius: '3px' }}
                                    >
                                        {agent.statut_emploi === 'actif' ? 'Actif' : agent.statut_emploi || 'Non spécifié'}
                                    </Badge>
                                </div>
                            </div>
                        </Col>
                        <Col md="4" className="text-end">
                            <Button 
                                color="light"
                                className="me-2"
                                onClick={handleBack}
                            >
                                <MdArrowBack className="me-1" />
                                Retour
                            </Button>
                            <Button 
                                color="primary"
                                onClick={handleEdit}
                            >
                                <MdEdit className="me-1" />
                                Modifier
                            </Button>
                        </Col>
                    </Row>
                </div>

                <div style={{ padding: '20px' }}>
                    {/* Informations personnelles */}
                    <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                        <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                <MdPerson className="me-2" />
                                Informations Personnelles
                            </CardTitle>
                        </CardHeader>
                        <CardBody style={{ padding: '0' }}>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Nom complet</div>
                                        <div style={{ color: '#212529' }}>{agent.nom} {agent.prenom}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Matricule</div>
                                        <div style={{ color: '#212529' }}>{agent.matricule || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Date de naissance</div>
                                        <div style={{ color: '#212529' }}>{formatDate(agent.date_de_naissance)}</div>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Lieu de naissance</div>
                                        <div style={{ color: '#212529' }}>{agent.lieu_de_naissance || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Sexe</div>
                                        <div style={{ color: '#212529' }}>{agent.sexe === 'M' ? 'Masculin' : agent.sexe === 'F' ? 'Féminin' : '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Nationalité</div>
                                        <div style={{ color: '#212529' }}>{agent.nationalite_libele || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Informations familiales */}
                    <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                        <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                <MdGroup className="me-2" />
                                Informations Familiales
                            </CardTitle>
                        </CardHeader>
                        <CardBody style={{ padding: '0' }}>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Nom de la mère</div>
                                        <div style={{ color: '#212529' }}>{agent.nom_de_la_mere || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Nom du père</div>
                                        <div style={{ color: '#212529' }}>{agent.nom_du_pere || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Situation matrimoniale</div>
                                        <div style={{ color: '#212529' }}>{agent.situation_matrimoniale_libele || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Date de mariage</div>
                                        <div style={{ color: '#212529' }}>{formatDate(agent.date_mariage)}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Nom de la conjointe</div>
                                        <div style={{ color: '#212529' }}>{agent.nom_conjointe || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Nombre d'enfants</div>
                                        <div style={{ color: '#212529' }}>{agent.nombre_enfant || 0}</div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Contact et adresses */}
                    <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                        <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                <MdPhone className="me-2" />
                                Contact et Adresses
                            </CardTitle>
                        </CardHeader>
                        <CardBody style={{ padding: '0' }}>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Téléphone principal</div>
                                        <div style={{ color: '#212529' }}>{agent.telephone1 || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Téléphone secondaire</div>
                                        <div style={{ color: '#212529' }}>{agent.telephone2 || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Email</div>
                                        <div style={{ color: '#212529' }}>{agent.email || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="6">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Adresse professionnelle</div>
                                        <div style={{ color: '#212529' }}>
                                            {agent.ad_pro_rue && (
                                                <div>
                                                    {agent.ad_pro_rue}<br />
                                                    {agent.ad_pro_ville && `${agent.ad_pro_ville}, `}
                                                    {agent.ad_pro_batiment && `Bâtiment ${agent.ad_pro_batiment}`}
                                                </div>
                                            )}
                                            {!agent.ad_pro_rue && '-'}
                                        </div>
                                    </div>
                                </Col>
                                <Col md="6">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Adresse privée</div>
                                        <div style={{ color: '#212529' }}>
                                            {agent.ad_pri_rue && (
                                                <div>
                                                    {agent.ad_pri_rue}<br />
                                                    {agent.ad_pri_ville && `${agent.ad_pri_ville}, `}
                                                    {agent.ad_pri_batiment && `Bâtiment ${agent.ad_pri_batiment}`}
                                                </div>
                                            )}
                                            {!agent.ad_pri_rue && '-'}
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Informations professionnelles */}
                    <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                        <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                <MdWork className="me-2" />
                                Informations Professionnelles
                            </CardTitle>
                        </CardHeader>
                        <CardBody style={{ padding: '0' }}>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Type d'agent</div>
                                        <div style={{ color: '#212529' }}>{agent.type_agent_libele || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Fonction</div>
                                        <div style={{ color: '#212529' }}>{agent.fonction_libele || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Emploi</div>
                                        <div style={{ color: '#212529' }}>{agent.emploi_libele || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Service</div>
                                        <div style={{ color: '#212529' }}>{agent.service_libelle || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Statut emploi</div>
                                        <div style={{ color: '#212529' }}>{getStatusBadge(agent.statut_emploi)}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Position</div>
                                        <div style={{ color: '#212529' }}>{agent.position_libele || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Date de première prise de service</div>
                                        <div style={{ color: '#212529' }}>{formatDate(agent.date_embauche)}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Date de fin de contrat</div>
                                        <div style={{ color: '#212529' }}>{formatDate(agent.date_fin_contrat)}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Mode d'entrée</div>
                                        <div style={{ color: '#212529' }}>{agent.mode_entree_libele || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Carrière et grade */}
                    <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                        <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                <MdSchool className="me-2" />
                                Carrière et Grade
                            </CardTitle>
                        </CardHeader>
                        <CardBody style={{ padding: '0' }}>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Catégorie</div>
                                        <div style={{ color: '#212529' }}>{agent.categorie_libele || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Grade</div>
                                        <div style={{ color: '#212529' }}>{agent.grade_libele || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Échelon</div>
                                        <div style={{ color: '#212529' }}>{agent.echelon_libele || '-'}</div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Informations administratives */}
                    <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                        <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                            <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                <MdAdminPanelSettings className="me-2" />
                                Informations Administratives
                            </CardTitle>
                        </CardHeader>
                        <CardBody style={{ padding: '0' }}>
                            <Row>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Ministère</div>
                                        <div style={{ color: '#212529' }}>{agent.ministere_nom || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Entité</div>
                                        <div style={{ color: '#212529' }}>{agent.entite_nom || '-'}</div>
                                    </div>
                                </Col>
                                <Col md="4">
                                    <div style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: '600', color: '#495057', fontSize: '0.9rem', marginBottom: '4px' }}>Date de création</div>
                                        <div style={{ color: '#212529' }}>{formatDate(agent.created_at)}</div>
                                    </div>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Photos de l'agent */}
                    {agent.photos && agent.photos.length > 0 && (
                        <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                            <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                    <MdPhoto className="me-2" />
                                    Photos ({agent.photos.length})
                                </CardTitle>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    {agent.photos.map((photo, index) => (
                                        <Col md="3" key={index} className="mb-3">
                                            <div style={{
                                                border: '1px solid #dee2e6',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                background: 'white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                <div style={{ position: 'relative' }}>
                                                    <img 
                                                        src={`https://tourisme.2ise-groupe.com/api/images/public/photo/${photo.id}?t=${Date.now()}`} 
                                                        alt={`Photo ${index + 1}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '150px',
                                                            objectFit: 'cover'
                                                        }}
                                                        onError={(e) => {
                                                            console.error('Erreur de chargement de la photo:', e.target.src);
                                                            // Ne pas cacher l'image, laisser le navigateur gérer l'erreur
                                                        }}
                                                    />
                                                    <div style={{
                                                        display: 'none',
                                                        width: '100%',
                                                        height: '150px',
                                                        background: '#f8f9fa',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#6c757d'
                                                    }}>
                                                        <MdPhoto size={40} />
                                                    </div>
                                                    {photo.is_profile_photo && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '8px',
                                                            right: '8px',
                                                            background: '#28a745',
                                                            color: 'white',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            Profil
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ padding: '8px' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                                        {photo.photo_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#adb5bd' }}>
                                                        {formatFileSize(photo.photo_size)}
                                                    </div>
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </CardBody>
                        </Card>
                    )}

                    {/* Documents de l'agent (excluant les diplômes qui ont leur propre section) */}
                    {agent.documents && agent.documents.filter(doc => doc.document_type !== 'diplome').length > 0 && (
                        <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                            <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                    <MdAttachFile className="me-2" />
                                    Documents ({agent.documents.filter(doc => doc.document_type !== 'diplome').length})
                                </CardTitle>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    {agent.documents.filter(doc => doc.document_type !== 'diplome').map((document, index) => (
                                        <Col md="6" key={index} className="mb-3">
                                            <div style={{
                                                border: '1px solid #dee2e6',
                                                borderRadius: '8px',
                                                padding: '15px',
                                                background: 'white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                            }}>
                                                <div className="d-flex align-items-center mb-2">
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        background: '#e9ecef',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px',
                                                        color: '#495057'
                                                    }}>
                                                        {getDocumentIcon(document.document_type)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#212529', marginBottom: '2px' }}>
                                                            {getDocumentTypeName(document.document_type)}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                                            {document.document_name}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: '#adb5bd', marginBottom: '10px' }}>
                                                    {formatFileSize(document.document_size)} • {new Date(document.uploaded_at).toLocaleDateString('fr-FR')}
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <Button 
                                                        color="primary" 
                                                        size="sm"
                                                        onClick={() => openDocument(document)}
                                                        style={{ fontSize: '0.8rem' }}
                                                    >
                                                        <MdVisibility className="me-1" />
                                                        Voir
                                                    </Button>
                                                </div>
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </CardBody>
                        </Card>
                    )}

                    {/* Diplômes de l'agent */}
                    {agent.diplomes && agent.diplomes.length > 0 && (
                        <Card style={{ marginBottom: '20px', border: '1px solid #dee2e6' }}>
                            <CardHeader style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
                                <CardTitle className="mb-0" style={{ fontWeight: 'bold' }}>
                                    <MdSchool className="me-2" />
                                    Diplômes ({agent.diplomes.length})
                                </CardTitle>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    {agent.diplomes.map((diplome, index) => (
                                        <Col md="6" key={index} className="mb-3">
                                            <div style={{
                                                border: '1px solid #dee2e6',
                                                borderRadius: '8px',
                                                padding: '15px',
                                                background: 'white',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                <div className="d-flex align-items-center mb-2">
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '8px',
                                                        background: '#e3f2fd',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px',
                                                        color: '#1976d2'
                                                    }}>
                                                        <MdSchool />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', color: '#212529', marginBottom: '2px' }}>
                                                            {diplome.diplome}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                                            {diplome.ecole} • {diplome.ville}, {diplome.pays}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginBottom: '10px' }}>
                                                    Obtenu le {formatDiplomeYear(diplome.date_diplome)}
                                                </div>
                                                {diplome.document_url && (
                                                    <div className="d-flex gap-2">
                                                        <Button 
                                                            color="primary" 
                                                            size="sm"
                                                            onClick={() => window.open(`https://tourisme.2ise-groupe.com${diplome.document_url}`, '_blank')}
                                                            style={{ fontSize: '0.8rem' }}
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir le diplôme
                                                        </Button>
                                                        <Button 
                                                            color="outline-secondary" 
                                                            size="sm"
                                                            onClick={() => {
                                                                const link = document.createElement('a');
                                                                link.href = `https://tourisme.2ise-groupe.com${diplome.document_url}`;
                                                                link.download = diplome.document_name || 'diplome.pdf';
                                                                link.click();
                                                            }}
                                                            style={{ fontSize: '0.8rem' }}
                                                        >
                                                            <MdDownload className="me-1" />
                                                            Télécharger
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </Col>
                                    ))}
                                </Row>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentDetails;
