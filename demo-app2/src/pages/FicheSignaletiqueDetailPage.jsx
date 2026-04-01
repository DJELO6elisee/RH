import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Button,
    Row,
    Col,
    Badge,
    Spinner,
    Alert,
    Table
} from 'reactstrap';
import { 
    MdDownload, 
    MdPrint, 
    MdPerson, 
    MdWork, 
    MdSchool, 
    MdLanguage, 
    MdComputer,
    MdArrowBack
} from 'react-icons/md';
import Page from 'components/Page';
import { useParams, useHistory } from 'react-router-dom';

const FicheSignaletiqueDetailPage = () => {
    const { agentId } = useParams();
    const history = useHistory();
    const [agent, setAgent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (agentId) {
            fetchAgentDetails();
        }
    }, [agentId]);

    useEffect(() => {
        // Si c'est pour l'impression, déclencher l'impression automatiquement
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('print') === 'true') {
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    }, []);

    const fetchAgentDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}?t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                cache: 'no-cache'
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la récupération des détails de l\'agent');
            }

            const data = await response.json();
            console.log('🔍 Données agent reçues:', {
                date_embauche: data.data?.date_embauche,
                date_prise_service_au_ministere: data.data?.date_prise_service_au_ministere,
                fonctions_anterieures: data.data?.fonctions_anterieures?.length || 0,
                emplois_anterieurs: data.data?.emplois_anterieurs?.length || 0
            });
            console.log('📋 Emplois antérieurs:', data.data?.emplois_anterieurs);
            console.log('📋 Fonctions antérieures:', data.data?.fonctions_anterieures);
            setAgent(data.data);
        } catch (err) {
            console.error('Erreur:', err);
            setError('Erreur lors du chargement des détails de l\'agent');
        } finally {
            setLoading(false);
        }
    };

    const handleReturn = () => {
        if (history.length > 1) {
            history.goBack();
        } else {
            history.push('/fiche-signaletique');
        }
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}/fiche-signaletique/pdf-test`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la génération du PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `fiche-signaletique-${agent.nom}-${agent.prenom}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            alert('Erreur lors du téléchargement de la fiche');
        }
    };

    const handlePrint = async () => {
        try {
            // Générer le PDF depuis la base de données
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}/fiche-signaletique/pdf-test`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la génération du PDF pour impression');
            }

            // Créer un blob et l'ouvrir dans une nouvelle fenêtre pour impression
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const printWindow = window.open(url, '_blank');
            
            // Attendre que le PDF soit chargé puis déclencher l'impression
            printWindow.onload = () => {
                printWindow.print();
                // Nettoyer l'URL après impression
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                }, 1000);
            };
        } catch (err) {
            console.error('Erreur lors de l\'impression:', err);
            alert('Erreur lors de l\'impression de la fiche');
        }
    };

    if (loading) {
        return (
            <Page title="Fiche Signalétique">
                <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                    <Spinner color="primary" />
                </div>
            </Page>
        );
    }

    if (error || !agent) {
        return (
            <Page title="Fiche Signalétique">
                <Alert color="danger">
                    {error || 'Agent non trouvé'}
                </Alert>
            </Page>
        );
    }

    const resolveAgentStatutInfo = (agentData) => {
        if (!agentData || typeof agentData !== 'object') {
            return { label: '', isFonctionnaire: false };
        }

        const statutCandidates = [
            agentData.statut_agent,
            agentData.statut_agent_libele,
            agentData.statut_agent_libelle,
            agentData.statut_agent_libellé,
            agentData.statut_agent_label,
            agentData.statut_agent_nom,
            agentData?.statut_agent?.libele,
            agentData?.statut_agent?.libelle,
            agentData?.statut_agent?.libellé,
            agentData?.statut_agent?.nom,
            agentData?.statut_agent?.label,
            agentData?.statut?.libele,
            agentData?.statut?.libelle,
            agentData?.statut?.libellé,
            agentData?.statut?.nom
        ];

        for (const value of statutCandidates) {
            if (typeof value === 'string') {
                const trimmedValue = value.trim();
                if (trimmedValue !== '') {
                    const normalizedValue = trimmedValue.toLowerCase();
                    if (normalizedValue.includes('fonctionnaire')) {
                        return { label: trimmedValue, isFonctionnaire: true };
                    }
                    if (
                        normalizedValue.includes('contractuel') ||
                        normalizedValue.includes('vacataire') ||
                        normalizedValue.includes('stagiaire') ||
                        normalizedValue.includes('non fonctionnaire')
                    ) {
                        return { label: trimmedValue, isFonctionnaire: false };
                    }
                }
            }
        }

        const statutIdCandidates = [
            agentData.id_statut_agent,
            agentData.statut_agent_id,
            agentData?.statut_agent?.id,
            agentData?.statut?.id
        ];

        for (const rawId of statutIdCandidates) {
            if (rawId !== undefined && rawId !== null && rawId !== '') {
                const parsedId = Number(rawId);
                if (!Number.isNaN(parsedId)) {
                    if (parsedId === 1) {
                        return { label: 'Fonctionnaire', isFonctionnaire: true };
                    }
                    return { label: '', isFonctionnaire: false };
                }
            }
        }

        return { label: '', isFonctionnaire: false };
    };

    const resolveAgentTypeId = (agentData) => {
        if (!agentData || typeof agentData !== 'object') {
            return null;
        }

        const candidates = [
            agentData.id_type_d_agent,
            agentData.id_type_agent,
            agentData.type_agent_id,
            agentData?.type_agent?.id,
            agentData?.typeAgent?.id
        ];

        for (const candidate of candidates) {
            if (candidate !== undefined && candidate !== null && candidate !== '') {
                const parsed = Number(candidate);
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            }
        }

        return null;
    };

    const resolveAgentTypeLabel = (agentData) => {
        if (!agentData || typeof agentData !== 'object') {
            return '';
        }

        const possibleValues = [
            agentData.type_agent_libele,
            agentData.type_agent_libelle,
            agentData.type_agent_libellé,
            agentData.type_agent_label,
            agentData.statut_agent_libele,
            agentData.statut_agent_libelle,
            agentData.statut_agent,
            agentData.type_agent,
            agentData.type_agent_nom,
            agentData.statut_emploi_libele,
            agentData.statut_emploi,
            agentData.typeAgentLabel,
            agentData.typeAgent,
            agentData.statut_emploi_label,
            agentData?.type_agent?.libele,
            agentData?.type_agent?.libelle,
            agentData?.type_agent?.libellé,
            agentData?.type_agent?.nom
        ];

        for (const value of possibleValues) {
            if (typeof value === 'string') {
                const trimmedValue = value.trim();
                if (trimmedValue !== '' && /[a-zA-Z\u00C0-\u017F]/.test(trimmedValue)) {
                    return trimmedValue;
                }
            }
        }

        // Mapping basique pour les identifiants connus
        const typeId = resolveAgentTypeId(agentData);
        if (typeId !== null) {
            const mapping = {
                1: 'Fonctionnaire',
                2: 'Contractuel',
                3: 'Stagiaire',
                4: 'Vacataire'
            };
            if (mapping[typeId]) {
                return mapping[typeId];
            }
        }

        return '';
    };

    const { label: rawStatutLabel, isFonctionnaire } = resolveAgentStatutInfo(agent);
    const typeIdValue = resolveAgentTypeId(agent);
    const rawTypeAgent = resolveAgentTypeLabel(agent);
    const normalizedTypeAgent = rawTypeAgent.trim().toLowerCase();
    const derivedIsFonctionnaire = normalizedTypeAgent.includes('fonctionnaire');
    const derivedFromTypeId = typeIdValue === 1;
    const finalIsFonctionnaire = Boolean(isFonctionnaire || derivedIsFonctionnaire || derivedFromTypeId);
    const statutLabel = rawStatutLabel || (finalIsFonctionnaire ? 'Fonctionnaire' : rawTypeAgent);

    return (
        <div className="fiche-signaletique">
            {/* En-tête de la fiche */}
            <div className="fiche-header text-center mb-4" style={{ 
                border: '2px solid #000', 
                padding: '20px',
                backgroundColor: '#f8f9fa'
            }}>
                <Row>
                    <Col md={4} className="text-left">
                        <h5 className="mb-1">MINISTÈRE DU TOURISME</h5>
                        <h5 className="mb-1">ET DES LOISIRS</h5>
                        <hr style={{ borderTop: '1px dashed #000', width: '200px', margin: '10px 0' }} />
                        <h6 className="mb-1">DIRECTION DES RESSOURCES</h6>
                        <h6 className="mb-1">HUMAINES</h6>
                        <hr style={{ borderTop: '1px dashed #000', width: '200px', margin: '10px 0' }} />
                    </Col>
                    <Col md={4} className="text-center">
                        <div style={{ 
                            backgroundColor: '#e9ecef', 
                            padding: '15px', 
                            border: '1px solid #000',
                            margin: '0 auto',
                            maxWidth: '300px'
                        }}>
                            <h4 className="mb-1" style={{ fontWeight: 'bold' }}>FICHE SIGNALÉTIQUE</h4>
                            <h5 className="mb-0" style={{ fontWeight: 'bold' }}>
                                {finalIsFonctionnaire ? 'AGENT FONCTIONNAIRE' : 'AGENT NON FONCTIONNAIRE'}
                                {statutLabel && !finalIsFonctionnaire && (
                                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'normal' }}>{statutLabel}</span>
                                )}
                            </h5>
                        </div>
                    </Col>
                    <Col md={4} className="text-right">
                        <h5 className="mb-1">RÉPUBLIQUE DE CÔTE D'IVOIRE</h5>
                        <h6 className="mb-1">Union-Discipline-Travail</h6>
                        <hr style={{ borderTop: '1px dashed #000', width: '200px', margin: '10px 0' }} />
                    </Col>
                </Row>
            </div>

            {/* Boutons d'action (masqués lors de l'impression) */}
            <div className="no-print mb-3">
                <Button color="secondary" onClick={handleReturn} className="mr-2">
                    <MdArrowBack className="mr-1" />
                    Retour
                </Button>
                <Button color="success" onClick={handleDownload} className="mr-2">
                    <MdDownload className="mr-1" />
                    Télécharger PDF
                </Button>
                <Button color="warning" onClick={handlePrint}>
                    <MdPrint className="mr-1" />
                    Imprimer
                </Button>
            </div>

            {/* Photo de l'agent */}
            <Row className="mb-4">
                <Col md={9}>
                    {/* Informations de base */}
                    <Card>
                        <CardHeader>
                            <h5 className="mb-0">
                                <MdPerson className="mr-2" />
                                ÉTAT CIVIL
                            </h5>
                        </CardHeader>
                        <CardBody>
                            <Row>
                                <Col md={6}>
                                    <p><strong>Nom :</strong> {agent.nom || 'N/A'}</p>
                                    <p><strong>Prénoms :</strong> {agent.prenom || 'N/A'}</p>
                                    <p><strong>Date de naissance :</strong> {agent.date_de_naissance ? new Date(agent.date_de_naissance).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                    <p><strong>Lieu de naissance :</strong> {agent.lieu_de_naissance || 'N/A'}</p>
                                    <p><strong>Nationalité :</strong> {agent.nationalite_libele || 'N/A'}</p>
                                </Col>
                                <Col md={6}>
                                    <p><strong>Sexe :</strong> {agent.sexe || 'N/A'}</p>
                                    <p><strong>Nom du père :</strong> {agent.nom_du_pere || 'N/A'}</p>
                                    <p><strong>Nom de la mère :</strong> {agent.nom_de_la_mere || 'N/A'}</p>
                                    <p><strong>Situation matrimoniale :</strong> {agent.situation_matrimoniale_libele || 'N/A'}</p>
                                    <p><strong>Handicap :</strong> {
                                        (agent.id_handicap === 14 || agent.id_handicap === '14') && agent.handicap_personnalise 
                                            ? agent.handicap_personnalise 
                                            : (agent.handicap_nom || 'Aucun')
                                    }</p>
                                    <p><strong>Nombre d'enfants :</strong> {agent.nombre_enfant || '0'}</p>
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>

                    {/* Renseignements administratifs */}
                    <Card className="mb-4">
                        <CardHeader>
                            <h5 className="mb-0">
                                <MdWork className="mr-2" />
                                RENSEIGNEMENTS ADMINISTRATIFS
                            </h5>
                        </CardHeader>
                        <CardBody>
                            {finalIsFonctionnaire ? (
                                // Informations pour les fonctionnaires
                                <>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Matricule :</strong> {agent.matricule || 'N/A'}</p>
                                            <p><strong>Grade :</strong> {agent.grade_libele || 'N/A'}</p>
                                            <p><strong>Emploi :</strong> {agent.emploi_libele || 'N/A'}</p>
                                            <p><strong>Date de première prise de service :</strong> {agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>Ministère d'affectation :</strong> {agent.ministere_nom || 'N/A'}</p>
                                            <p><strong>Date de départ à la retraite :</strong> {agent.date_retraite ? new Date(agent.date_retraite).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                            <p><strong>Situation militaire :</strong> {agent.situation_militaire || 'N/A'}</p>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Date de première prise de service dans le ministère :</strong> {agent.date_prise_service_au_ministere ? new Date(agent.date_prise_service_au_ministere).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                            <p><strong>Adresse personnelle :</strong> {
                                                agent.ad_pri_rue || agent.ad_pri_ville || agent.ad_pri_batiment 
                                                    ? `${agent.ad_pri_rue || ''} ${agent.ad_pri_ville || ''} ${agent.ad_pri_batiment || ''}`.trim() 
                                                    : 'N/A'
                                            }</p>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>Téléphone :</strong> {agent.telephone1 || 'N/A'}</p>
                                            <p><strong>Personne à contacter en cas de besoin :</strong> {agent.telephone2 || 'N/A'}</p>
                                            <p><strong>Email :</strong> {agent.email || 'N/A'}</p>
                                        </Col>
                                    </Row>
                                </>
                            ) : (
                                // Informations spécifiques pour les agents non fonctionnaires
                                <>
                                    <Row>
                                        <Col md={6}>
                                            <p><strong>Type de contrat :</strong> {rawTypeAgent || rawStatutLabel || 'N/A'}</p>
                                            <p><strong>Matricule :</strong> {agent.matricule || 'N/A'}</p>
                                            <p><strong>Emploi :</strong> {agent.emploi_libele || 'N/A'}</p>
                                            <p><strong>Date de première prise de service :</strong> {agent.date_embauche ? new Date(agent.date_embauche).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                            <p><strong>Direction d'affectation :</strong> {agent.service_libelle || 'N/A'}</p>
                                        </Col>
                                        <Col md={6}>
                                            <p><strong>Numéro CNPS :</strong> {agent.numero_cnps || 'N/A'}</p>
                                            <p><strong>Date de déclaration :</strong> {agent.date_declaration_cnps ? new Date(agent.date_declaration_cnps).toLocaleDateString('fr-FR') : 'N/A'}</p>
                                            <p><strong>Adresse personnelle :</strong> {
                                                agent.ad_pri_rue || agent.ad_pri_ville || agent.ad_pri_batiment 
                                                    ? `${agent.ad_pri_rue || ''} ${agent.ad_pri_ville || ''} ${agent.ad_pri_batiment || ''}`.trim() 
                                                    : 'N/A'
                                            }</p>
                                            <p><strong>Téléphone :</strong> {agent.telephone1 || 'N/A'}</p>
                                            <p><strong>Email :</strong> {agent.email || 'N/A'}</p>
                                            <p><strong>Personne à contacter en cas de besoin :</strong> {agent.telephone2 || 'N/A'}</p>
                                        </Col>
                                    </Row>
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3} className="text-center">
                    <div style={{ 
                        border: '2px solid #000', 
                        padding: '10px',
                        display: 'inline-block',
                        backgroundColor: '#fff'
                    }}>
                        {agent.photos && agent.photos.length > 0 && agent.photos[0].id ? (
                            <img
                                src={`https://tourisme.2ise-groupe.com/api/images/public/photo/${agent.photos[0].id}`}
                                alt={`${agent.nom} ${agent.prenom}`}
                                style={{ 
                                    width: '150px', 
                                    height: '180px', 
                                    objectFit: 'cover',
                                    border: '1px solid #ccc'
                                }}
                                onError={(e) => {
                                    console.error('Erreur de chargement de l\'image:', e);
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <div
                                style={{ 
                                    width: '150px', 
                                    height: '180px', 
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #ccc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <MdPerson size={48} className="text-muted" />
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Expérience professionnelle */}
            <Card className="mb-4">
                <CardHeader>
                    <h5 className="mb-0">
                        <MdWork className="mr-2" />
                        EXPÉRIENCE PROFESSIONNELLE
                    </h5>
                </CardHeader>
                <CardBody>
                    <Row>
                        <Col md={6}>
                            <p><strong>Fonction actuelle :</strong> {agent.fonction_libele || agent.fonction_actuelle || 'N/A'}</p>
                        </Col>
                        <Col md={6}>
                            <p><strong>Formations professionnelles :</strong> N/A</p>
                        </Col>
                    </Row>
                    
                    {/* Fonctions antérieures */}
                    <div className="mt-3">
                        <h6><strong>Fonctions antérieures :</strong></h6>
                        {agent.fonctions_anterieures && agent.fonctions_anterieures.length > 0 ? (
                            <Table size="sm" striped responsive>
                                <thead>
                                    <tr>
                                        <th>Libellé du poste</th>
                                        <th>Structure</th>
                                        <th>Date début</th>
                                        <th>Date fin</th>
                                        <th>Position</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agent.fonctions_anterieures.map((fonction, index) => (
                                        <tr key={index}>
                                            <td>{fonction.libele_poste || 'N/A'}</td>
                                            <td>{fonction.structure || 'N/A'}</td>
                                            <td>{fonction.date_debut ? new Date(fonction.date_debut).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                            <td>{fonction.date_fin ? new Date(fonction.date_fin).toLocaleDateString('fr-FR') : 'En cours'}</td>
                                            <td>{fonction.id_position || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p className="text-muted">Aucune fonction antérieure renseignée</p>
                        )}
                    </div>

                    {/* Emplois antérieurs */}
                    <div className="mt-3">
                        <h6><strong>Emplois antérieurs :</strong></h6>
                        {agent.emplois_anterieurs && agent.emplois_anterieurs.length > 0 ? (
                            <Table size="sm" striped responsive>
                                <thead>
                                    <tr>
                                        <th>Emploi</th>
                                        <th>Structure</th>
                                        <th>Date emploi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agent.emplois_anterieurs.map((emploi, index) => (
                                        <tr key={index}>
                                            <td>{emploi.emploi || 'N/A'}</td>
                                            <td>{emploi.structure || 'N/A'}</td>
                                            <td>{emploi.date_emploi ? new Date(emploi.date_emploi).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p className="text-muted">Aucun emploi antérieur renseigné</p>
                        )}
                    </div>

                    {/* Stages */}
                    <div className="mt-3">
                        <h6><strong>Stages :</strong></h6>
                        {agent.stages && agent.stages.length > 0 ? (
                            <Table size="sm" striped responsive>
                                <thead>
                                    <tr>
                                        <th>Intitulé du stage</th>
                                        <th>Établissement</th>
                                        <th>Ville</th>
                                        <th>Pays</th>
                                        <th>Date stage</th>
                                        <th>Durée (jours)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agent.stages.map((stage, index) => (
                                        <tr key={index}>
                                            <td>{stage.intitule_stage || 'N/A'}</td>
                                            <td>{stage.etablissement || 'N/A'}</td>
                                            <td>{stage.ville || 'N/A'}</td>
                                            <td>{stage.pays || 'N/A'}</td>
                                            <td>{stage.date_stage ? new Date(stage.date_stage).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                            <td>{stage.duree_stage ? `${stage.duree_stage} jours` : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p className="text-muted">Aucun stage renseigné</p>
                        )}
                    </div>

                    {/* Titres et diplômes (diplomes ou etudes_diplomes selon l'API) */}
                    <div className="mt-3">
                        <h6><strong>Titres et diplômes :</strong></h6>
                        {(() => {
                            const diplomesList = Array.isArray(agent.etudes_diplomes) && agent.etudes_diplomes.length > 0
                                ? agent.etudes_diplomes
                                : (Array.isArray(agent.diplomes) && agent.diplomes.length > 0 ? agent.diplomes : []);
                            return diplomesList.length > 0 ? (
                                <Table size="sm" striped responsive>
                                    <thead>
                                        <tr>
                                            <th>Diplôme</th>
                                            <th>École</th>
                                            <th>Ville</th>
                                            <th>Pays</th>
                                            <th>Date d'obtention</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diplomesList.map((etude, index) => (
                                            <tr key={index}>
                                                <td>{etude.diplome || 'N/A'}</td>
                                                <td>{etude.ecole || 'N/A'}</td>
                                                <td>{etude.ville || 'N/A'}</td>
                                                <td>{etude.pays || 'N/A'}</td>
                                                <td>{etude.date_diplome ? (typeof etude.date_diplome === 'number' && etude.date_diplome >= 1900 && etude.date_diplome <= 2100 ? String(etude.date_diplome) : /^\d{4}$/.test(String(etude.date_diplome)) ? String(etude.date_diplome) : new Date(etude.date_diplome).toLocaleDateString('fr-FR')) : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <p className="text-muted">Aucun titre ou diplôme renseigné</p>
                            );
                        })()}
                    </div>
                </CardBody>
            </Card>

            {/* Connaissance des langues étrangères */}
            <Card className="mb-4">
                <CardHeader>
                    <h5 className="mb-0">
                        <MdLanguage className="mr-2" />
                        CONNAISSANCE ET MAÎTRISE DES LANGUES ÉTRANGÈRES
                    </h5>
                </CardHeader>
                <CardBody>
                    {agent.langues && agent.langues.length > 0 ? (
                        <Table>
                            <thead>
                                <tr>
                                    <th>Langue</th>
                                    <th>Niveau</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agent.langues.map((langue, index) => (
                                    <tr key={index}>
                                        <td>{langue.langue_nom || 'N/A'}</td>
                                        <td>{langue.niveau_libele || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p className="text-muted">Aucune langue étrangère renseignée</p>
                    )}
                </CardBody>
            </Card>

            {/* Connaissance des outils informatiques */}
            <Card className="mb-4">
                <CardHeader>
                    <h5 className="mb-0">
                        <MdComputer className="mr-2" />
                        CONNAISSANCE ET MAÎTRISE DE L'OUTIL INFORMATIQUE
                    </h5>
                </CardHeader>
                <CardBody>
                    {agent.logiciels && agent.logiciels.length > 0 ? (
                        <Table>
                            <thead>
                                <tr>
                                    <th>Logiciel/Outil</th>
                                    <th>Niveau</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agent.logiciels.map((logiciel, index) => (
                                    <tr key={index}>
                                        <td>{logiciel.logiciel_nom || 'N/A'}</td>
                                        <td>{logiciel.niveau_libele || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p className="text-muted">Aucun outil informatique renseigné</p>
                    )}
                </CardBody>
            </Card>

            {/* Pied de page */}
            <div className="text-center mt-4" style={{ 
                borderTop: '1px solid #000', 
                paddingTop: '20px',
                marginTop: '40px'
            }}>
                <p className="mb-1"><strong>Date d'établissement :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                <p className="mb-0"><strong>Signature et cachet :</strong> _________________________</p>
            </div>

            {/* Styles pour l'impression */}
            <style>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    
                    .fiche-signaletique {
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    
                    .card {
                        border: 1px solid #000 !important;
                        margin-bottom: 15px !important;
                    }
                    
                    .card-header {
                        background-color: #f8f9fa !important;
                        border-bottom: 1px solid #000 !important;
                        font-weight: bold;
                    }
                    
                    .table {
                        font-size: 11px;
                    }
                    
                    .table th,
                    .table td {
                        border: 1px solid #000 !important;
                        padding: 4px !important;
                    }
                    
                    .table thead th {
                        background-color: #f8f9fa !important;
                        font-weight: bold;
                    }
                }
            `}</style>
        </div>
    );
};

export default FicheSignaletiqueDetailPage;
