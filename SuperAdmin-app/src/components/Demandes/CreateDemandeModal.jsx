import React, { useState, useEffect } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Row,
    Col,
    Alert,
    Spinner
} from 'reactstrap';

const CreateDemandeModal = ({ isOpen, toggle, onDemandeCreated, agentId }) => {
    const [formData, setFormData] = useState({
        type_demande: '',
        description: '',
        date_debut: '',
        date_fin: '',
        lieu: '',
        priorite: 'normale',
        documents_joints: [],
        agree_motif: '',
        agree_date_cessation: '',
        date_fin_conges: '',
        date_reprise_service: '',
        date_debut_conges: '',
        // Nouveaux champs pour les demandes d'absence
        motif_conge: '',
        nombre_jours: '',
        raison_exceptionnelle: '',
        // Champs pour les demandes de mutation
        id_direction_destination: '',
        // Champ pour le certificat de non jouissance de congé
        annee_non_jouissance_conge: ''
    });
    const [joursRestants, setJoursRestants] = useState(null);
    const [joursRestantsAnneesPrecedentes, setJoursRestantsAnneesPrecedentes] = useState(null);
    const [loadingConges, setLoadingConges] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [canCreateCessation, setCanCreateCessation] = useState(true);
    const [cessationEligibility, setCessationEligibility] = useState(null);
    const [directions, setDirections] = useState([]);
    const [loadingDirections, setLoadingDirections] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: value
            };
            
            // Définir automatiquement le nombre de jours pour maternité et paternité
            if (name === 'motif_conge') {
                if (value === 'congé de maternité') {
                    // 6 mois = environ 180 jours (en jours ouvrés)
                    newData.nombre_jours = '180';
                } else if (value === 'congé de paternité') {
                    // 1 mois = environ 30 jours (en jours ouvrés)
                    newData.nombre_jours = '30';
                } else if (prev.motif_conge === 'congé de maternité' || prev.motif_conge === 'congé de paternité') {
                    // Réinitialiser si on change de motif
                    newData.nombre_jours = '';
                }
            }
            
            // Validation en temps réel pour le nombre de jours
            if (name === 'nombre_jours' && value !== '') {
                const joursSaisis = parseInt(value) || 0;
                const isCongeExceptionnel = prev.motif_conge === 'congé exceptionnel';
                const isCongeMaternite = prev.motif_conge === 'congé de maternité';
                
                // Pour les congés autres qu'exceptionnel et maternité, limiter à 30 jours
                if (!isCongeExceptionnel && !isCongeMaternite && joursSaisis > 30) {
                    // Afficher une alerte
                    alert(`⚠️ Limite dépassée !\n\nVous ne pouvez pas demander plus de 30 jours pour ce type de congé.\nSeuls les congés exceptionnels et la maternité peuvent dépasser 30 jours.\n\nLe nombre de jours a été automatiquement ajusté à 30.`);
                    // Corriger automatiquement à 30 jours
                    newData.nombre_jours = '30';
                }
                // Vérifier aussi les jours disponibles dans les années précédentes
                else if (!isCongeExceptionnel && !isCongeMaternite && joursRestantsAnneesPrecedentes !== null) {
                    const totalDisponible = joursRestantsAnneesPrecedentes.total;
                    if (joursSaisis > totalDisponible) {
                        // Afficher une alerte
                        alert(`⚠️ Limite dépassée !\n\nVous n'avez que ${totalDisponible} jour(s) disponible(s) dans les années précédentes.\n\nLe nombre de jours a été automatiquement ajusté à ${totalDisponible}.`);
                        // Corriger automatiquement au maximum disponible
                        newData.nombre_jours = String(totalDisponible);
                    }
                }
                // Fallback : vérifier avec l'année en cours si les années précédentes ne sont pas chargées
                else if (!isCongeExceptionnel && !isCongeMaternite && joursRestants !== null && joursRestantsAnneesPrecedentes === null) {
                    if (joursSaisis > joursRestants) {
                        // Limiter aussi à 30 jours maximum même si joursRestants est supérieur
                        const limiteFinale = Math.min(joursRestants, 30);
                        if (joursSaisis > limiteFinale) {
                            alert(`⚠️ Limite dépassée !\n\nVous ne pouvez pas demander plus de ${limiteFinale} jour(s) pour ce type de congé.\nSeuls les congés exceptionnels et la maternité peuvent dépasser 30 jours.\n\nLe nombre de jours a été automatiquement ajusté à ${limiteFinale}.`);
                            newData.nombre_jours = String(limiteFinale);
                        }
                    }
                }
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            
            // Validation spécifique pour les certificats de cessation de service
            if (formData.type_demande === 'certificat_non_jouissance_conge') {
                if (!formData.annee_non_jouissance_conge) {
                    setError('Veuillez préciser l\'année pour laquelle vous n\'avez pas joui de vos congés');
                    setLoading(false);
                    return;
                }
            }
            
            if (formData.type_demande === 'certificat_cessation') {
                if (!formData.motif_conge) {
                    setError('Veuillez sélectionner un motif de congé');
                    setLoading(false);
                    return;
                }
                
                // Définir automatiquement le nombre de jours pour maternité et paternité
                let nombreJoursFinal = formData.nombre_jours;
                if (formData.motif_conge === 'congé de maternité') {
                    nombreJoursFinal = '180'; // 6 mois
                } else if (formData.motif_conge === 'congé de paternité') {
                    nombreJoursFinal = '30'; // 1 mois
                }
                
                // Validation du nombre de jours (sauf pour maternité et paternité qui sont automatiques)
                if (!isCongeAvecDureeAuto && (!nombreJoursFinal || parseInt(nombreJoursFinal) < 5)) {
                    setError('Le nombre minimum de jours pour une cessation de service est de 5 jours');
                    setLoading(false);
                    return;
                }

                // Validation des jours pour les congés normaux
                // Seuls les congés exceptionnels et la maternité peuvent dépasser 30 jours
                const joursDemandes = parseInt(nombreJoursFinal) || 0;
                const isCongeExceptionnel = formData.motif_conge === 'congé exceptionnel';
                const isCongeMaternite = formData.motif_conge === 'congé de maternité';
                
                // Pour les congés autres qu'exceptionnel et maternité, vérifier la limite de 30 jours
                if (!isCongeExceptionnel && !isCongeMaternite && !isCongeAvecDureeAuto) {
                    // Vérifier les jours disponibles dans les années précédentes
                    if (joursRestantsAnneesPrecedentes !== null) {
                        const totalDisponible = joursRestantsAnneesPrecedentes.total;
                        
                        if (joursDemandes > totalDisponible) {
                            const currentYear = new Date().getFullYear();
                            setError(`Vous n'avez que ${totalDisponible} jour(s) disponible(s) dans les années précédentes (${currentYear - 2}: ${joursRestantsAnneesPrecedentes.annee2 || 0} jours, ${currentYear - 1}: ${joursRestantsAnneesPrecedentes.annee1 || 0} jours). Vous ne pouvez pas demander ${joursDemandes} jour(s). Seuls les congés exceptionnels peuvent dépasser cette limite.`);
                            setLoading(false);
                            return;
                        }
                        
                        // Limiter à 30 jours maximum par congé (hors exceptionnel et maternité)
                        // Car normalement les années précédentes ne contiennent que 30 jours maximum chacune
                        if (joursDemandes > 30) {
                            setError(`Vous ne pouvez pas demander plus de 30 jours pour ce type de congé. Seuls les congés exceptionnels et la maternité peuvent dépasser 30 jours. Veuillez choisir un congé exceptionnel si vous souhaitez dépasser cette limite.`);
                            setLoading(false);
                            return;
                        }
                    } else if (joursRestants !== null) {
                        // Fallback : utiliser l'année en cours si les années précédentes ne sont pas chargées
                        if (joursDemandes > joursRestants) {
                            setError(`Vous n'avez que ${joursRestants} jour(s) de congé(s) restant(s). Vous ne pouvez pas demander ${nombreJoursFinal} jour(s). Seuls les congés exceptionnels peuvent dépasser cette limite.`);
                            setLoading(false);
                            return;
                        }
                        
                        // Limiter à 30 jours maximum par congé (hors exceptionnel et maternité)
                        if (joursDemandes > 30) {
                            setError(`Vous ne pouvez pas demander plus de 30 jours pour ce type de congé. Seuls les congés exceptionnels et la maternité peuvent dépasser 30 jours.`);
                            setLoading(false);
                            return;
                        }
                    } else {
                        // Si aucune donnée n'est disponible, limiter à 30 jours pour sécurité
                        if (joursDemandes > 30) {
                            setError(`Vous ne pouvez pas demander plus de 30 jours pour ce type de congé. Seuls les congés exceptionnels et la maternité peuvent dépasser 30 jours.`);
                            setLoading(false);
                            return;
                        }
                    }
                }

                // Validation de la raison pour les congés exceptionnels
                if (formData.motif_conge === 'congé exceptionnel' && !formData.raison_exceptionnelle) {
                    setError('Veuillez expliquer la raison du congé exceptionnel');
                    setLoading(false);
                    return;
                }
            }

            // Pour les demandes d'attestation de présence et de travail, utiliser des données par défaut
            const demandeData = (formData.type_demande === 'attestation_presence' || formData.type_demande === 'attestation_travail')
                ? {
                    type_demande: formData.type_demande,
                    description: formData.type_demande === 'attestation_presence' 
                        ? 'Demande d\'attestation de présence'
                        : 'Demande d\'attestation de travail',
                    date_debut: new Date().toISOString().split('T')[0],
                    date_fin: new Date().toISOString().split('T')[0],
                    lieu: 'Service',
                    priorite: 'normale',
                    documents_joints: []
                }
                : formData.type_demande === 'certificat_reprise_service'
                ? {
                    ...formData,
                    description: 'Demande de certificat de reprise de service',
                    date_fin_conges: formData.date_fin_conges || '',
                    date_reprise_service: formData.date_reprise_service || ''
                }
                : formData.type_demande === 'certificat_cessation' && formData.motif_conge
                ? {
                    ...formData,
                    agree_motif: formData.motif_conge, // Utiliser agree_motif pour compatibilité
                    // Définir automatiquement le nombre de jours pour maternité et paternité
                    nombre_jours: formData.motif_conge === 'congé de maternité' ? 180 : 
                                  formData.motif_conge === 'congé de paternité' ? 30 : 
                                  parseInt(formData.nombre_jours),
                    description: formData.motif_conge === 'congé de maternité' ? 
                                `${formData.motif_conge} - 6 mois` :
                                formData.motif_conge === 'congé de paternité' ?
                                `${formData.motif_conge} - 1 mois` :
                                `${formData.motif_conge} - ${formData.nombre_jours} jour(s)`,
                    // Stocker les informations supplémentaires dans les nouveaux champs
                    motif_conge: formData.motif_conge,
                    raison_exceptionnelle: formData.raison_exceptionnelle || null
                }
                : formData.type_demande === 'mutation'
                ? {
                    ...formData,
                    id_direction_destination: formData.id_direction_destination,
                    // La date d'effet sera déterminée par la DRH lors de la validation
                    date_debut: ''
                }
                : formData.type_demande === 'certificat_non_jouissance_conge'
                ? {
                    ...formData,
                    description: `Demande de certificat de non jouissance de congé pour l'année ${formData.annee_non_jouissance_conge}`,
                    annee_non_jouissance_conge: parseInt(formData.annee_non_jouissance_conge, 10)
                }
                : {
                    ...formData,
                    date_fin_conges: formData.date_fin_conges || '',
                    date_reprise_service: formData.date_reprise_service || ''
                };

            const response = await fetch('https://tourisme.2ise-groupe.com/api/demandes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(demandeData)
            });

            const result = await response.json();

            if (!result.success) {
                // Gérer les erreurs spécifiques, notamment pour les années de service
                if (result.error && result.error.includes('années de service')) {
                    setError(result.error);
                } else {
                    setError(result.error || 'Erreur lors de la création de la demande');
                }
                setLoading(false);
                return;
            }

            if (result.success) {
                // Message de succès spécifique pour les certificats de cessation
                if (formData.type_demande === 'certificat_cessation') {
                    alert('✅ Cessation de service créée avec succès !\n\nVotre demande a été transmise à votre supérieur hiérarchique pour validation.');
                } else {
                    alert('✅ Demande créée avec succès !');
                }
                
                onDemandeCreated(result.data);
                toggle();
                setFormData({
                    type_demande: '',
                    description: '',
                    date_debut: '',
                    date_fin: '',
                    lieu: '',
                    priorite: 'normale',
                    documents_joints: [],
                    agree_motif: '',
                    agree_date_cessation: '',
                    date_fin_conges: '',
                    date_reprise_service: '',
                    date_debut_conges: '',
                    motif_conge: '',
                    nombre_jours: '',
                    raison_exceptionnelle: '',
                    id_direction_destination: '',
                    annee_non_jouissance_conge: ''
                });
                setJoursRestants(null);
            } else {
                setError(result.error || 'Erreur lors de la création de la demande');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    const getTypeDemandeLabel = (type) => {
        const labels = {
            'absence': 'Demande d\'absence',
            'sortie_territoire': 'Demande de sortie du territoire',
            'attestation_travail': 'Demande d\'attestation de travail',
            'attestation_presence': 'Demande d\'attestation de présence',
            'certificat_cessation': 'Cessation de service',
            'certificat_reprise_service': 'Certificat de reprise de service',
            'mutation': 'Demande de mutation'
        };
        return labels[type] || type;
    };

    const isDateRequired = ['absence', 'sortie_territoire'].includes(formData.type_demande);
    const isLieuRequired = ['absence', 'sortie_territoire', 'attestation_presence'].includes(formData.type_demande);
    const isAttestationPresence = formData.type_demande === 'attestation_presence';
    const isAttestationTravail = formData.type_demande === 'attestation_travail';
    const isCertificatCessation = formData.type_demande === 'certificat_cessation';
    const isCertificatReprise = formData.type_demande === 'certificat_reprise_service';
    const isCertificatNonJouissanceConge = formData.type_demande === 'certificat_non_jouissance_conge';
    const isAbsence = formData.type_demande === 'absence';
    const isMutation = formData.type_demande === 'mutation';
    const isCongeExceptionnel = formData.motif_conge === 'congé exceptionnel';
    const isCongeMaternite = formData.motif_conge === 'congé de maternité';
    const isCongePaternite = formData.motif_conge === 'congé de paternité';
    const isCongeAvecDureeAuto = isCongeMaternite || isCongePaternite;

    // Vérifier l'éligibilité pour la cessation de service lorsque le modal s'ouvre
    useEffect(() => {
        if (isOpen && agentId) {
            const checkCessationEligibility = async () => {
                try {
                    const token = localStorage.getItem('token');
                    // Récupérer les données de l'agent pour vérifier les années de service
                    const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (agentResponse.ok) {
                        const agentResult = await agentResponse.json();
                        if (agentResult.success && agentResult.data) {
                            const agent = agentResult.data;
                            // Pour le congé annuel, priorité à la date de première prise de service (date_embauche)
                            // car l'agent peut avoir travaillé ailleurs avant de venir au ministère
                            // Pour les autres types de cessation, utiliser date_prise_service_au_ministere
                            const datePriseService = agent.date_embauche || agent.date_prise_service_au_ministere;
                            
                            if (datePriseService) {
                                const datePriseServiceObj = new Date(datePriseService);
                                const anneeActuelle = new Date().getFullYear();
                                const moisActuel = new Date().getMonth();
                                const jourActuel = new Date().getDate();
                                const anneePriseService = datePriseServiceObj.getFullYear();
                                const moisPriseService = datePriseServiceObj.getMonth();
                                const jourPriseService = datePriseServiceObj.getDate();
                                
                                // Calculer les années complètes de service
                                let anneesService = anneeActuelle - anneePriseService;
                                if (moisActuel < moisPriseService || (moisActuel === moisPriseService && jourActuel < jourPriseService)) {
                                    anneesService--;
                                }
                                
                                // L'agent doit avoir au moins 2 ans de service (être dans sa 3ème année)
                                const eligible = anneesService >= 2;
                                setCanCreateCessation(eligible);
                                setCessationEligibility({
                                    eligible,
                                    annees_service: anneesService,
                                    date_prise_service: datePriseService
                                });
                            } else {
                                setCanCreateCessation(false);
                                setCessationEligibility({
                                    eligible: false,
                                    annees_service: null,
                                    date_prise_service: null,
                                    message: 'La date de prise de service n\'est pas définie'
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Erreur lors de la vérification de l\'éligibilité:', err);
                    // En cas d'erreur, on laisse l'option activée (le backend validera)
                    setCanCreateCessation(true);
                }
            };

            checkCessationEligibility();
        }
    }, [isOpen, agentId]);

    // Charger les jours restants quand le type est "certificat_cessation"
    useEffect(() => {
        if (isCertificatCessation && agentId) {
            loadJoursRestants();
        } else {
            setJoursRestants(null);
            setJoursRestantsAnneesPrecedentes(null);
        }
    }, [isCertificatCessation, agentId]);

    // Charger les directions quand le type est "mutation"
    useEffect(() => {
        if (isMutation && isOpen) {
            loadDirections();
        }
    }, [isMutation, isOpen]);

    const loadDirections = async () => {
        try {
            setLoadingDirections(true);
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
        } finally {
            setLoadingDirections(false);
        }
    };

    const loadJoursRestants = async () => {
        try {
            setLoadingConges(true);
            const token = localStorage.getItem('token');
            
            const currentYear = new Date().getFullYear();
            const previousYear = currentYear - 1;
            const yearBeforePrevious = currentYear - 2;
            
            // Charger les congés pour les 3 années
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/conges/agent/${agentId}/years?years=${yearBeforePrevious},${previousYear},${currentYear}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const congesMap = {};
                    result.data.forEach(c => {
                        congesMap[c.annee] = c;
                    });
                    
                    // Année en cours
                    const congesCourante = congesMap[currentYear] || { jours_restants: 30 };
                    setJoursRestants(congesCourante.jours_restants || 30);
                    
                    // Années précédentes
                    const congesAnnee2 = congesMap[yearBeforePrevious] || { jours_restants: 30 };
                    const congesAnnee1 = congesMap[previousYear] || { jours_restants: 30 };
                    const totalDisponible = (congesAnnee2.jours_restants || 30) + (congesAnnee1.jours_restants || 30);
                    
                    setJoursRestantsAnneesPrecedentes({
                        annee2: congesAnnee2.jours_restants || 30,
                        annee1: congesAnnee1.jours_restants || 30,
                        total: totalDisponible,
                        annee2_label: yearBeforePrevious,
                        annee1_label: previousYear
                    });
                } else {
                    setJoursRestants(30);
                    setJoursRestantsAnneesPrecedentes({
                        annee2: 30,
                        annee1: 30,
                        total: 60,
                        annee2_label: yearBeforePrevious,
                        annee1_label: previousYear
                    });
                }
            } else {
                setJoursRestants(30);
                setJoursRestantsAnneesPrecedentes({
                    annee2: 30,
                    annee1: 30,
                    total: 60,
                    annee2_label: yearBeforePrevious,
                    annee1_label: previousYear
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des jours restants:', error);
            setJoursRestants(30);
            const currentYear = new Date().getFullYear();
            setJoursRestantsAnneesPrecedentes({
                annee2: 30,
                annee1: 30,
                total: 60,
                annee2_label: currentYear - 2,
                annee1_label: currentYear - 1
            });
        } finally {
            setLoadingConges(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} size="lg">
            <ModalHeader toggle={toggle}>
                <i className="fa fa-plus me-2"></i>
                Nouvelle demande
            </ModalHeader>
            <Form onSubmit={handleSubmit}>
                <ModalBody>
                    {error && (
                        <Alert color="danger">
                            <i className="fa fa-exclamation-triangle me-2"></i>
                            {error}
                        </Alert>
                    )}

                    <Row>
                        <Col md="6">
                            <FormGroup>
                                <Label for="type_demande">Type de demande *</Label>
                                <Input
                                    type="select"
                                    name="type_demande"
                                    id="type_demande"
                                    value={formData.type_demande}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Sélectionner un type</option>
                                    <option value="absence">Autorisation d'absence</option>
                                    <option value="sortie_territoire">Sortie du territoire</option>
                                    <option value="attestation_travail">Attestation de travail</option>
                                    <option value="attestation_presence">Attestation de présence</option>
                                    <option 
                                        value="certificat_cessation" 
                                        disabled={!canCreateCessation}
                                        style={{
                                            color: !canCreateCessation ? '#999' : 'inherit',
                                            fontStyle: !canCreateCessation ? 'italic' : 'normal'
                                        }}
                                    >
                                        {!canCreateCessation ? 'Cessation de service (non éligible)' : 'Cessation de service'}
                                    </option>
                                    <option value="certificat_reprise_service">Certificat de reprise de service</option>
                                    <option value="certificat_non_jouissance_conge">Demande de Certificat de non jouissance de congé</option>
                                    <option value="mutation">Demande de mutation</option>
                                </Input>
                                {!canCreateCessation && cessationEligibility && (
                                    <small className="text-muted d-block mt-1" style={{ fontStyle: 'italic', color: '#dc3545' }}>
                                        {cessationEligibility.message || 
                                            `Non éligible : Vous devez avoir au moins 2 ans de service pour effectuer une demande de cessation. 
                                            ${cessationEligibility.annees_service !== null 
                                                ? `Vous avez actuellement ${cessationEligibility.annees_service} année${cessationEligibility.annees_service > 1 ? 's' : ''} de service.` 
                                                : 'La date de prise de service n\'est pas définie.'}`
                                        }
                                    </small>
                                )}
                            </FormGroup>
                        </Col>
                        <Col md="6">
                            <FormGroup>
                                <Label for="priorite">Priorité</Label>
                                <Input
                                    type="select"
                                    name="priorite"
                                    id="priorite"
                                    value={formData.priorite}
                                    onChange={handleInputChange}
                                >
                                    <option value="normale">Normale</option>
                                    <option value="urgente">Urgente</option>
                                    <option value="critique">Exceptionnelle</option>
                                </Input>
                            </FormGroup>
                        </Col>
                    </Row>

                    {(isAttestationPresence || isAttestationTravail) ? (
                        <div className="text-center py-4">
                            <div className="alert alert-info">
                                <i className="fa fa-info-circle me-2"></i>
                                <strong>
                                    {isAttestationPresence ? 'Demande d\'attestation de présence' : 'Demande d\'attestation de travail'}
                                </strong>
                                <p className="mb-0 mt-2">
                                    Cette demande sera transmise à votre sous-directeur puis au directeur pour validation.
                                    Aucun formulaire supplémentaire n'est requis.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Formulaire pour les autres types de demandes */}
                            {!isCertificatCessation && !isCertificatReprise && !isCertificatNonJouissanceConge && (
                                <FormGroup>
                                    <Label for="description">Motif *</Label>
                                    <Input
                                        type="textarea"
                                        name="description"
                                        id="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows="4"
                                        placeholder={isMutation ? "Décrivez le motif de votre demande de mutation..." : "Décrivez le motif de votre demande..."}
                                        required
                                    />
                                </FormGroup>
                            )}

                            {isDateRequired && (
                                <Row>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="date_debut">Date de début *</Label>
                                            <Input
                                                type="date"
                                                name="date_debut"
                                                id="date_debut"
                                                value={formData.date_debut}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="date_fin">Date de fin *</Label>
                                            <Input
                                                type="date"
                                                name="date_fin"
                                                id="date_fin"
                                                value={formData.date_fin}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

                            {isLieuRequired && !isAttestationPresence && (
                                <FormGroup>
                                    <Label for="lieu">Lieu {isDateRequired ? '*' : ''}</Label>
                                    <Input
                                        type="text"
                                        name="lieu"
                                        id="lieu"
                                        value={formData.lieu}
                                        onChange={handleInputChange}
                                        placeholder="Indiquez le lieu concerné..."
                                        required={isDateRequired}
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                </FormGroup>
                            )}

                            {isCertificatReprise && (
                                <Row>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="date_fin_conges">Date de fin de congés *</Label>
                                            <Input
                                                type="date"
                                                name="date_fin_conges"
                                                id="date_fin_conges"
                                                value={formData.date_fin_conges}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </FormGroup>
                                    </Col>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="date_reprise_service">Date de reprise de service *</Label>
                                            <Input
                                                type="date"
                                                name="date_reprise_service"
                                                id="date_reprise_service"
                                                value={formData.date_reprise_service}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

                            {isCertificatNonJouissanceConge && (
                                <Row>
                                    <Col md="6">
                                        <FormGroup>
                                            <Label for="annee_non_jouissance_conge">Année pour laquelle vous n'avez pas joui de vos congés *</Label>
                                            <Input
                                                type="number"
                                                name="annee_non_jouissance_conge"
                                                id="annee_non_jouissance_conge"
                                                value={formData.annee_non_jouissance_conge}
                                                onChange={handleInputChange}
                                                min="2000"
                                                max={new Date().getFullYear()}
                                                placeholder={`Ex: ${new Date().getFullYear()}`}
                                                required
                                            />
                                            <small className="text-muted d-block mt-1">
                                                Précisez l'année pour laquelle vous n'avez pas pris vos congés
                                            </small>
                                        </FormGroup>
                                    </Col>
                                </Row>
                            )}

                            {isMutation && (
                                <>
                                    <FormGroup>
                                        <Label for="id_direction_destination">Direction de destination *</Label>
                                        <Input
                                            type="select"
                                            name="id_direction_destination"
                                            id="id_direction_destination"
                                            value={formData.id_direction_destination}
                                            onChange={handleInputChange}
                                            required
                                            disabled={loadingDirections}
                                        >
                                            <option value="">Sélectionner une direction</option>
                                            {directions.map(direction => (
                                                <option key={direction.id} value={direction.id}>
                                                    {direction.libelle}
                                                </option>
                                            ))}
                                        </Input>
                                        {loadingDirections && (
                                            <small className="text-muted d-block mt-1">
                                                <Spinner size="sm" className="me-2" />
                                                Chargement des directions...
                                            </small>
                                        )}
                                    </FormGroup>
                                    <Alert color="info" className="mt-3">
                                        <i className="fa fa-info-circle me-2"></i>
                                        <strong>Demande de mutation</strong>
                                        <p className="mb-0 mt-2">
                                            Votre demande de mutation sera transmise à votre sous-directeur puis au directeur pour validation, 
                                            puis au DRH pour approbation finale. La date d'effet de la mutation sera déterminée par la DRH lors de la validation. 
                                            Une note de service de mutation sera générée après validation.
                                        </p>
                                    </Alert>
                                </>
                            )}

                            {isCertificatCessation && (
                                <>
                                    <Row>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label for="motif_conge">Motif de congé *</Label>
                                                <Input
                                                    type="select"
                                                    name="motif_conge"
                                                    id="motif_conge"
                                                    value={formData.motif_conge}
                                                    onChange={handleInputChange}
                                                    required
                                                >
                                                    <option value="">Sélectionner un motif</option>
                                                    <option value="congé annuel">Congé annuel</option>
                                                    <option value="congé de paternité">Congé de paternité</option>
                                                    <option value="congé de maternité">Congé de maternité</option>
                                                    <option value="congé partiel">Congé partiel</option>
                                                    <option value="congé exceptionnel">Congé exceptionnel</option>
                                                </Input>
                                            </FormGroup>
                                        </Col>
                                        <Col md="6">
                                            {isCongeAvecDureeAuto ? (
                                                <FormGroup>
                                                    <Label for="nombre_jours">Durée du congé</Label>
                                                    <Input
                                                        type="text"
                                                        id="nombre_jours"
                                                        value={isCongeMaternite ? '6 mois (180 jours)' : '1 mois (30 jours)'}
                                                        disabled
                                                        readOnly
                                                        style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                                                    />
                                                    <small className="text-muted d-block mt-1">
                                                        <i className="fa fa-info-circle me-1"></i>
                                                        {isCongeMaternite 
                                                            ? 'La durée du congé de maternité est fixée à 6 mois par défaut.'
                                                            : 'La durée du congé de paternité est fixée à 1 mois par défaut.'}
                                                    </small>
                                                </FormGroup>
                                            ) : (
                                                <FormGroup>
                                                    <Label for="nombre_jours">Nombre de jours *</Label>
                                                    <Input
                                                        type="number"
                                                        name="nombre_jours"
                                                        id="nombre_jours"
                                                        value={formData.nombre_jours}
                                                        onChange={handleInputChange}
                                                        min="5"
                                                        placeholder="Ex: 5"
                                                        required
                                                    />
                                                    <small className="text-muted d-block mt-1">
                                                        Min: 5 jours {!isCongeExceptionnel && !isCongeMaternite && '| Max: 30 jours'}
                                                    </small>
                                                    {joursRestantsAnneesPrecedentes !== null && !isCongeExceptionnel && !isCongeMaternite && (
                                                        <small className={`d-block mt-1 ${joursRestantsAnneesPrecedentes.total >= parseInt(formData.nombre_jours || 0) ? 'text-success' : 'text-danger'}`}>
                                                            <strong>Disponible:</strong> {joursRestantsAnneesPrecedentes.total} jour(s) (Années {joursRestantsAnneesPrecedentes.annee2_label} + {joursRestantsAnneesPrecedentes.annee1_label})
                                                        </small>
                                                    )}
                                                    {isCongeExceptionnel && (
                                                        <small className="d-block mt-1 text-info">
                                                            <i className="fa fa-info-circle me-1"></i>
                                                            Pas de limite de jours
                                                        </small>
                                                    )}
                                                    {joursRestantsAnneesPrecedentes === null && joursRestants !== null && !isCongeExceptionnel && !isCongeMaternite && (
                                                        <small className={`d-block mt-1 ${joursRestants >= parseInt(formData.nombre_jours || 0) ? 'text-success' : 'text-danger'}`}>
                                                            Disponible: {joursRestants} jour(s)
                                                        </small>
                                                    )}
                                                </FormGroup>
                                            )}
                                        </Col>
                                    </Row>

                                    {isCongeExceptionnel && (
                                        <FormGroup>
                                            <Label for="raison_exceptionnelle">Raison du congé exceptionnel *</Label>
                                            <Input
                                                type="textarea"
                                                name="raison_exceptionnelle"
                                                id="raison_exceptionnelle"
                                                value={formData.raison_exceptionnelle}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Expliquez la raison de ce congé exceptionnel..."
                                                required
                                            />
                                        </FormGroup>
                                    )}

                                    <Row>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label for="agree_date_cessation">Date de cessation de service *</Label>
                                                <Input
                                                    type="date"
                                                    name="agree_date_cessation"
                                                    id="agree_date_cessation"
                                                    value={formData.agree_date_cessation}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                </>
                            )}

                            <FormGroup>
                                <Label for="documents_joints">Documents joints (optionnel)</Label>
                                <Input
                                    type="file"
                                    name="documents_joints"
                                    id="documents_joints"
                                    multiple
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        setFormData(prev => ({
                                            ...prev,
                                            documents_joints: files
                                        }));
                                    }}
                                />
                                <small className="text-muted">
                                    Formats acceptés: PDF, DOC, DOCX, JPG, PNG (max 10MB par fichier)
                                </small>
                            </FormGroup>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggle} disabled={loading}>
                        Annuler
                    </Button>
                    <Button color="primary" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                {(isAttestationPresence || isAttestationTravail) ? 'Envoi...' : 'Création...'}
                            </>
                        ) : (
                            <>
                                <i className="fa fa-check me-2"></i>
                                {(isAttestationPresence || isAttestationTravail) ? 'Envoyer la demande' : 'Créer la demande'}
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Form>
        </Modal>
    );
};

export default CreateDemandeModal;
