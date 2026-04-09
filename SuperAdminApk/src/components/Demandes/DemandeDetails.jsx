import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Card,
    CardHeader,
    CardBody,
    Row,
    Col,
    Badge,
    Table,
    Alert,
    Spinner,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane
} from 'reactstrap';
import { useAuth } from '../../contexts/AuthContext';
import ValidationModal from './ValidationModal';

const formatDate = (dateString, options) => {
    if (!dateString) return 'N/A';
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options || defaultOptions);
};

// Fonction pour calculer la période d'absence
const calculerPeriodeAbsence = (dateDebut, dateFin) => {
    if (!dateDebut || !dateFin) {
        return {
            jours: 0,
            semaines: 0,
            annees: 0,
            periodeTexte: 'Période non définie'
        };
    }

    const debut = new Date(dateDebut);
    const fin = new Date(dateFin);
    
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
        return {
            jours: 0,
            semaines: 0,
            annees: 0,
            periodeTexte: 'Dates invalides'
        };
    }

    const differenceMs = fin.getTime() - debut.getTime();
    const jours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1;
    const semaines = Math.floor(jours / 7);
    const annees = Math.floor(jours / 365);
    
    let periodeTexte = '';
    
    if (annees > 0) {
        periodeTexte += `${annees} année${annees > 1 ? 's' : ''}`;
        if (semaines > 0 && semaines % 52 > 0) {
            const semainesRestantes = semaines % 52;
            periodeTexte += `, ${semainesRestantes} semaine${semainesRestantes > 1 ? 's' : ''}`;
        }
        if (jours % 7 > 0) {
            const joursRestants = jours % 7;
            periodeTexte += ` et ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;
        }
    } else if (semaines > 0) {
        periodeTexte += `${semaines} semaine${semaines > 1 ? 's' : ''}`;
        if (jours % 7 > 0) {
            const joursRestants = jours % 7;
            periodeTexte += ` et ${joursRestants} jour${joursRestants > 1 ? 's' : ''}`;
        }
    } else {
        periodeTexte += `${jours} jour${jours > 1 ? 's' : ''}`;
    }

    return {
        jours,
        semaines,
        annees,
        periodeTexte
    };
};

// Fonction pour générer le texte de notification détaillée pour les absences

    const genererTexteNotificationAbsence = (demande, agent, destinataire = 'chef_service') => {
        const dateDebut = new Date(demande.date_debut).toLocaleDateString('fr-FR');
        const dateFin = new Date(demande.date_fin).toLocaleDateString('fr-FR');
        
        // Déterminer l'en-tête selon le destinataire
        let enTete = 'Cher Chef de Service';
        let signature = 'Cher Chef de Service';
        
        if (destinataire === 'drh') {
            enTete = 'Cher DRH';
            signature = 'Cher DRH';
        } else if (destinataire === 'sous_directeur') {
            enTete = 'Cher Sous-directeur';
            signature = 'Cher Sous-directeur';
        }
        
        return `Objet : Demande d'autorisation d'absence

${enTete},

Je viens par la présente solliciter votre bienveillance pour une autorisation d'absence couvrant la période du ${dateDebut} au ${dateFin}. Cette demande s'inscrit dans le cadre d'une démarche personnelle importante nécessitant ma disponibilité pendant ces jours.

Conscient des exigences liées à mes fonctions, je prends les dispositions nécessaires afin d'assurer la continuité du service durant mon absence.

Je reste à votre disposition pour toute information complémentaire et vous remercie par avance pour votre compréhension et l'attention portée à ma demande.

Veuillez agréer, ${signature}, l'expression de ma considération distinguée.

${agent.prenom} ${agent.nom}
Agent au sein du ${agent.service_nom || 'service'}`;
    };

    // Fonction générique pour générer le texte de notification pour tous types de demandes
    const genererTexteNotificationGenerique = (demande, agent, destinataire = 'chef_service') => {
        const periode = calculerPeriodeAbsence(demande.date_debut, demande.date_fin);
        const typeDemande = demande.type_demande || 'demande';
        // Formatter le titre selon le type de demande
        const titresDemandes = {
            'absence': 'AUTORISATION D\'ABSENCE',
            'sortie_territoire': 'SORTIE DU TERRITOIRE',
            'attestation_travail': 'ATTESTATION DE TRAVAIL',
            'attestation_presence': 'ATTESTATION DE PRÉSENCE',
            'certificat_cessation': 'CERTIFICAT DE CESSATION DE SERVICE',
            'certificat_reprise_service': 'CERTIFICAT DE REPRISE DE SERVICE',
            'certificat_non_jouissance_conge': 'CERTIFICAT DE NON JOUISSANCE DE CONGÉ',
            'autorisation_conges': 'AUTORISATION DE CONGÉ',
            'autorisation_retraite': 'AUTORISATION DE RETRAITE'
        };
        let titreDemande = titresDemandes[typeDemande] || typeDemande.toUpperCase().replace(/_/g, ' ');
        
        // Pour les attestations de présence, masquer lieu, période et durée si c'est un chef de service ou DRH
        const isAttestationPresence = typeDemande === 'attestation_presence';
        const isChefService = destinataire === 'chef_service';
        const isDRH = destinataire === 'drh';
        const shouldHideDetails = isAttestationPresence && (isChefService || isDRH);
        
        // Gestion spécifique pour les certificats de cessation et reprise de service
        let detailsSection = '';
        if (typeDemande === 'certificat_cessation') {
            detailsSection = `Type : ${typeDemande.replace(/_/g, ' ').toUpperCase()}
Date de cessation de service : ${demande.agree_date_cessation ? new Date(demande.agree_date_cessation).toLocaleDateString('fr-FR') : 'Non spécifiée'}
Motif de cessation : ${demande.agree_motif || 'Non spécifié'}`;
        } else if (typeDemande === 'certificat_reprise_service') {
            detailsSection = `Type : ${typeDemande.replace(/_/g, ' ').toUpperCase()}
Date de reprise de service : ${demande.date_reprise_service || demande.date_fin_conges || demande.date_fin ? new Date(demande.date_reprise_service || demande.date_fin_conges || demande.date_fin).toLocaleDateString('fr-FR') : 'Non spécifiée'}
Motif de reprise : ${demande.description || demande.motif || 'Non spécifié'}`;
        } else if (typeDemande === 'certificat_non_jouissance_conge') {
            const annee = demande.annee_non_jouissance_conge || (demande.description ? demande.description.match(/année\s+(\d{4})/i)?.[1] : null) || 'Non spécifiée';
            detailsSection = `Type : ${typeDemande.replace(/_/g, ' ').toUpperCase()}
Année de non jouissance de congé : ${annee}`;
        } else {
            // Formatter le type de demande pour l'affichage
            const typesLabels = {
                'absence': 'Autorisation d\'absence',
                'sortie_territoire': 'Sortie du territoire',
                'attestation_travail': 'Attestation de travail',
                'attestation_presence': 'Attestation de présence',
                'certificat_cessation': 'Certificat de cessation de service',
                'certificat_reprise_service': 'Certificat de reprise de service',
                'certificat_non_jouissance_conge': 'Certificat de non jouissance de congé',
                'autorisation_conges': 'Autorisation de congé',
                'autorisation_retraite': 'Autorisation de retraite'
            };
            let typeLabel = typesLabels[typeDemande] || typeDemande.replace(/_/g, ' ').toUpperCase();
            detailsSection = `Type : ${typeLabel}
${!shouldHideDetails ? `Période demandée : Du ${new Date(demande.date_debut).toLocaleDateString('fr-FR')} au ${new Date(demande.date_fin).toLocaleDateString('fr-FR')}
Durée : ${periode.periodeTexte} (${periode.jours} jour${periode.jours > 1 ? 's' : ''})` : ''}
${!shouldHideDetails && demande.lieu ? `Lieu : ${demande.lieu}` : ''}`;
        }

        // Format simplifié pour le DRH
        if (isDRH) {
            return `DEMANDE DE ${titreDemande}

INFORMATIONS SUR L'AGENT
─────────────────────────
Nom et Prénoms : ${agent.prenom} ${agent.nom}
Matricule : ${agent.matricule}
Email : ${agent.email || 'Non renseigné'}
Service : ${agent.service_nom || 'Non renseigné'}

DÉTAILS DE LA DEMANDE
─────────────────────────
${detailsSection}
${demande.description ? `\nMotif :\n${demande.description}` : ''}
${demande.type_demande === 'certificat_reprise_service' ? `\nFin de congés : ${demande.date_fin_conges ? formatDate(demande.date_fin_conges) : 'Non renseignée'}\nReprise de service : ${demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}` : ''}
${demande.type_demande !== 'certificat_non_jouissance_conge' && demande.date_debut ? `\nDate de début : ${formatDate(demande.date_debut)}` : ''}
${demande.type_demande !== 'certificat_non_jouissance_conge' && demande.date_fin ? `\nDate de fin : ${formatDate(demande.date_fin)}` : ''}
${demande.lieu ? `\nLieu : ${demande.lieu}` : ''}

INFORMATIONS COMPLÉMENTAIRES
─────────────────────────
Date de soumission : ${new Date(demande.date_creation).toLocaleString('fr-FR')}
Priorité : ${demande.priorite ? demande.priorite.toUpperCase() : 'NORMALE'}
Statut : ${demande.statut || 'En attente'}`.trim();
        }

        // Format avec séparateurs pour les autres rôles (chef de service, etc.)
        return `DEMANDE DE ${titreDemande}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS SUR L'AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nom et Prénoms : ${agent.prenom} ${agent.nom}
Matricule : ${agent.matricule}
Email : ${agent.email || 'Non renseigné'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÉTAILS DE LA DEMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${detailsSection}
${demande.description ? `\nMotif :\n${demande.description}` : ''}
${demande.type_demande === 'certificat_reprise_service' ? `\nFin de congés : ${demande.date_fin_conges ? formatDate(demande.date_fin_conges) : 'Non renseignée'}\nReprise de service : ${demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}` : ''}
${demande.type_demande !== 'certificat_non_jouissance_conge' && demande.date_debut ? `\nDate de début : ${formatDate(demande.date_debut)}` : ''}
${demande.type_demande !== 'certificat_non_jouissance_conge' && demande.date_fin ? `\nDate de fin : ${formatDate(demande.date_fin)}` : ''}
${demande.lieu ? `\nLieu : ${demande.lieu}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS COMPLÉMENTAIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date de soumission : ${new Date(demande.date_creation).toLocaleString('fr-FR')}
Priorité : ${demande.priorite ? demande.priorite.toUpperCase() : 'NORMALE'}
Statut : ${demande.statut || 'En attente'}`.trim();
    };


const DemandeDetails = ({ isOpen, toggle, demande, agentId, onValidationSuccess }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('1');
    const [historique, setHistorique] = useState([]);
    const [loadingHistorique, setLoadingHistorique] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationAction, setValidationAction] = useState(null); // 'approuve' ou 'rejete'

    const loadHistorique = useCallback(async () => {
        if (!demande) return;
        try {
            setLoadingHistorique(true);
            const token = localStorage.getItem('token');
            const response = await fetch(
                `https://tourisme.2ise-groupe.com/api/demandes/${demande.id}/historique`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();
            if (result.success) {
                setHistorique(result.data);
            }
        } catch (err) {
            console.error('Erreur lors du chargement de l\'historique:', err);
        } finally {
            setLoadingHistorique(false);
        }
    }, [demande]);

    useEffect(() => {
        if (isOpen && demande) {
            loadHistorique();
        }
    }, [isOpen, demande, loadHistorique]);

    // Quand la modal est ouverte mais aucune demande n'est encore sélectionnée : afficher une modal de chargement (évite qu'aucune modal ne s'ouvre)
    if (isOpen && !demande) {
        return (
            <Modal isOpen={isOpen} toggle={toggle} size="lg">
                <ModalHeader toggle={toggle}>
                    <i className="fa fa-file-text me-2"></i>
                    Détails de la demande
                </ModalHeader>
                <ModalBody>
                    <div className="text-center py-4">
                        <Spinner color="primary" />
                        <p className="mt-2 mb-0">Chargement des détails...</p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggle}>Fermer</Button>
                </ModalFooter>
            </Modal>
        );
    }

    // Modal fermée et pas de demande : ne rien rendre
    if (!demande) {
        return null;
    }

    const getStatusBadge = (status) => {
        const statusConfig = {
            'en_attente': { color: 'warning', text: 'En attente' },
            'approuve': { color: 'success', text: 'Approuvée' },
            'rejete': { color: 'danger', text: 'Rejetée' }
        };
        const config = statusConfig[status] || { color: 'secondary', text: status };
        return <Badge color={config.color}>{config.text}</Badge>;
    };

    const getNiveauEvolutionBadge = (niveau) => {
        const niveaux = {
            'soumis': { color: 'info', text: 'Soumis' },
            'en_cours_traitement': { color: 'primary', text: 'En cours' },
            'valide_par_superieur': { color: 'warning', text: 'En attente supérieur' },
            'valide_par_sous_directeur': { color: 'warning', text: 'En attente sous-directeur' },
            'valide_par_directeur': { color: 'warning', text: 'En attente directeur' },
            'valide_par_drh': { color: 'warning', text: 'En attente DRH' },
            'valide_par_direction': { color: 'warning', text: 'En attente direction' },
            'valide_par_dir_cabinet': { color: 'warning', text: 'En attente Dir Cabinet' },
            'valide_par_chef_cabinet': { color: 'warning', text: 'En attente Chef Cabinet' },
            'valide_par_directeur_central': { color: 'warning', text: 'En attente Dir Central' },
            'valide_par_directeur_general': { color: 'warning', text: 'En attente Dir Général' },
            'valide_par_ministre': { color: 'warning', text: 'En attente ministre' },
            'valide_par_directeur_service_exterieur': { color: 'warning', text: 'En attente Dir. service ext.' },
            'retour_dir_cabinet': { color: 'info', text: 'Retour Dir Cabinet' },
            'retour_drh': { color: 'info', text: 'Retour DRH' },
            'retour_chef_service': { color: 'info', text: 'Retour chef service' },
            'retour_ministre': { color: 'info', text: 'Retour ministre' },
            'finalise': { color: 'success', text: 'Finalisé' }
        };
        const config = niveaux[niveau] || { color: 'secondary', text: niveau };
        return <Badge color={config.color}>{config.text}</Badge>;
    };

    const getTypeDemandeLabel = (type) => {
        const labels = {
            'absence': 'Demande d\'absence',
            'sortie_territoire': 'Demande de sortie du territoire',
            'attestation_travail': 'Demande d\'attestation de travail',
            'attestation_presence': 'Demande d\'attestation de présence',
            'certificat_cessation': 'Certificat de cessation de service',
            'certificat_reprise_service': 'Certificat de reprise de service',
            'certificat_reprise_service': 'Autorisation de reprise de service',
            'autorisation_conges': 'Autorisation de congé',
            'autorisation_retraite': 'Autorisation de retraite'
        };
        return labels[type] || type;
    };

    const getActionBadge = (action) => {
        const actions = {
            'approuve': { color: 'success', text: 'Approuvé' },
            'rejete': { color: 'danger', text: 'Rejeté' },
            'transfere': { color: 'info', text: 'Transféré' }
        };
        const config = actions[action] || { color: 'secondary', text: action };
        return <Badge color={config.color}>{config.text}</Badge>;
    };

    
    
    // Vérifier si l'agent consulte sa propre demande
    const isOwnDemand = demande && demande.id_agent && agentId && demande.id_agent === parseInt(agentId);
    
    // Niveau d'évolution et statut de la demande
    const niveauEvolution = (demande.niveau_evolution_demande || demande.niveau_actuel || '').toLowerCase();
    const statutDemande = (demande.status || '').toLowerCase();
    
    // DRH qui consulte sa propre demande : en attente de finalisation (retour Dir Cabinet / retour DRH) pour afficher les boutons Valider/Transmettre
    const isDRHViewingOwnDemandeForFinalisation = isOwnDemand &&
        user?.role?.toLowerCase() === 'drh' &&
        (['retour_dir_cabinet', 'retour_drh'].includes(niveauEvolution));
    
    // Pour tout agent (y compris DRH) : propre demande déjà approuvée / document généré → afficher le succès au lieu de "en cours de traitement"
    const isOwnDemandAlreadyApproved = isOwnDemand &&
        (niveauEvolution === 'valide_par_drh' || niveauEvolution === 'finalise' || statutDemande === 'approuve');
    
    // Si c'est sa propre demande (non approuvée et pas le cas DRH en finalisation), afficher la vue simplifiée "en cours de traitement"
    if (isOwnDemand && !isDRHViewingOwnDemandeForFinalisation && !isOwnDemandAlreadyApproved) {
        return (
            <Modal isOpen={isOpen} toggle={toggle} size="lg">
                <ModalHeader toggle={toggle}>
                    <i className="fa fa-file-text me-2"></i>
                    Notification d'absence
                </ModalHeader>
                <ModalBody>
                    <div style={{ padding: '20px' }}>
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Georgia, serif',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            backgroundColor: '#ffffff',
                            padding: '30px',
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            margin: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#333',
                            maxHeight: '70vh',
                            overflowY: 'auto'
                        }}>
                            {genererTexteNotificationGenerique(demande, {
                                prenom: demande.prenom || 'Agent',
                                nom: demande.nom || 'Inconnu',
                                matricule: demande.matricule || 'N/A',
                                email: demande.email || 'Non renseigné',
                                service_nom: demande.service_nom || 'Service'
                            }, 
                            // Déterminer le destinataire selon le niveau d'évolution de la demande et la hiérarchie
                            (() => {
                                // Si la demande est validée par le supérieur, c'est pour le DRH
                                if (demande.niveau_evolution_demande === 'valide_par_superieur' || demande.niveau_evolution_demande === 'valide_par_drh') {
                                    return 'drh';
                                }
                                // Si l'agent a un sous-directeur assigné (id_validateur_sous_directeur), c'est pour le sous-directeur
                                if (demande.id_validateur_sous_directeur || (demande.niveau_evolution_demande === 'soumis' && user?.role?.toLowerCase() === 'agent')) {
                                    return 'sous_directeur';
                                }
                                // Sinon, c'est pour le chef de service ou DRH selon le rôle
                                return user?.role?.toLowerCase() === 'drh' ? 'drh' : 'chef_service';
                            })()
                            )}
                        </pre>
                        
                        {/* Message informatif pour l'agent */}
                        <div style={{ 
                            marginTop: '20px', 
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '8px',
                            border: '1px solid #2196f3'
                        }}>
                            <h6 style={{ marginBottom: '10px', color: '#1976d2' }}>
                                <i className="fa fa-info-circle me-2"></i>
                                Votre demande d'absence
                            </h6>
                            <p style={{ margin: 0, color: '#424242', fontSize: '14px' }}>
                                Cette demande est en cours de traitement par votre hiérarchie. 
                                Vous serez notifié dès qu'une décision sera prise.
                            </p>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggle}>
                        <i className="fa fa-arrow-left me-2"></i>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    // Pour les demandes à valider : demandes d'autres agents OU propre demande du DRH en phase de finalisation OU propre demande déjà approuvée (tous agents)
    if (!isOwnDemand || isDRHViewingOwnDemandeForFinalisation || isOwnDemandAlreadyApproved) {
        // Vue "Demande approuvée - document généré" pour tout agent (y compris DRH) qui consulte sa propre demande déjà validée
        if (isOwnDemandAlreadyApproved) {
            return (
                <Modal isOpen={isOpen} toggle={toggle} size="lg">
                    <ModalHeader toggle={toggle}>
                        <i className="fa fa-file-text me-2"></i>
                        Détails de la demande
                    </ModalHeader>
                    <ModalBody>
                        <div style={{ padding: '20px' }}>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'Georgia, serif',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                backgroundColor: '#ffffff',
                                padding: '30px',
                                borderRadius: '8px',
                                border: '2px solid #e9ecef',
                                margin: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                color: '#333',
                                maxHeight: '50vh',
                                overflowY: 'auto'
                            }}>
                                {genererTexteNotificationGenerique(demande, {
                                    prenom: demande.prenom || 'Agent',
                                    nom: demande.nom || 'Inconnu',
                                    matricule: demande.matricule || 'N/A',
                                    email: demande.email || 'Non renseigné',
                                    service_nom: demande.service_nom || 'Service'
                                }, 'drh')}
                            </pre>
                            <div style={{
                                marginTop: '20px',
                                textAlign: 'center',
                                padding: '20px',
                                backgroundColor: '#d4edda',
                                borderRadius: '8px',
                                border: '1px solid #28a745'
                            }}>
                                <h6 style={{ marginBottom: '10px', color: '#155724' }}>
                                    <i className="fa fa-check-circle me-2"></i>
                                    Demande approuvée
                                </h6>
                                <p style={{ margin: 0, color: '#155724', fontSize: '14px' }}>
                                    Votre demande a été approuvée et le document a été généré. Vous pouvez le consulter dans l'onglet <strong>Mes Documents</strong>.
                                </p>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggle}>
                            <i className="fa fa-arrow-left me-2"></i>
                            Fermer
                        </Button>
                    </ModalFooter>
                </Modal>
            );
        }

        const handleValidation = async (demandeId, action, commentaire) => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('Token d\'authentification manquant. Veuillez vous reconnecter.');
                }

                const requestBody = { 
                    action: action || 'approuve', // Action par défaut si non fournie
                    commentaire: commentaire || '',
                    generate_document: (action === 'approuve' || action === 'valider' || !action) // Générer automatiquement le document si approuvé
                };

                console.log('📤 Envoi de la requête de validation:', {
                    demandeId,
                    action: requestBody.action,
                    commentaire: requestBody.commentaire,
                    url: `https://tourisme.2ise-groupe.com/api/demandes/${demandeId}/valider`
                });

                const response = await fetch(`https://tourisme.2ise-groupe.com/api/demandes/${demandeId}/valider`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(requestBody)
                });
                
                console.log('📥 Réponse du serveur (en-têtes):', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // 🔍 LOGS DÉTAILLÉS POUR DÉBOGUER
                    console.log('🔍 ========== RÉPONSE COMPLÈTE DU BACKEND ==========');
                    console.log('📋 Résultat complet (JSON):', JSON.stringify(result, null, 2));
                    console.log('📋 Résultat (objet):', result);
                    console.log('✅ Success:', result.success);
                    console.log('📝 Message:', result.message);
                    console.log('📄 Document généré:', result.document_generated);
                    console.log('🆔 Document ID:', result.document_id);
                    console.log('📊 État de la demande (finale):', {
                        status: result.demande?.status,
                        niveau_actuel: result.demande?.niveau_actuel,
                        niveau_evolution_demande: result.demande?.niveau_evolution_demande,
                        phase: result.demande?.phase,
                        statut_drh: result.demande?.statut_drh
                    });
                    
                    // Afficher les informations de débogage si disponibles
                    if (result.debug) {
                        console.log('🔍 ========== INFORMATIONS DE DÉBOGAGE ==========');
                        console.log('👤 Validateur:', {
                            role: result.debug.validateurRole,
                            roleLower: result.debug.validateurRoleLower
                        });
                        console.log('🔄 Workflow:', {
                            niveauValidation: result.debug.niveauValidation,
                            nextNiveau: result.debug.nextNiveau,
                            nextEvolutionNiveau: result.debug.nextEvolutionNiveau,
                            shouldFinalize: result.debug.shouldFinalize
                        });
                        console.log('📄 Document:', result.debug.documentGenerated);
                        console.log('📊 Demande initiale:', result.debug.demandeInitiale);
                        console.log('📊 Demande finale:', result.debug.demandeFinale);
                        
                        // Vérification critique
                        if (result.debug.niveauValidation === 'drh') {
                            if (result.debug.nextNiveau !== 'finalise') {
                                console.error('❌ ERREUR: DRH valide mais nextNiveau n\'est pas "finalise"!', {
                                    nextNiveau: result.debug.nextNiveau,
                                    shouldFinalize: result.debug.shouldFinalize
                                });
                            }
                            if (!result.debug.shouldFinalize) {
                                console.error('❌ ERREUR: DRH valide mais shouldFinalize est false!');
                            }
                            if (result.debug.demandeFinale?.niveau_evolution_demande !== 'valide_par_drh' && 
                                result.debug.demandeFinale?.niveau_evolution_demande !== 'finalise') {
                                console.error('❌ ERREUR: DRH valide mais demande non finalisée!', {
                                    niveau_evolution_demande: result.debug.demandeFinale?.niveau_evolution_demande,
                                    status: result.debug.demandeFinale?.status
                                });
                            }
                        }
                        console.log('🔍 ================================================');
                    }
                    console.log('🔍 ================================================');
                    
                    const isDRH = user?.role?.toLowerCase() === 'drh';
                    
                    if (action === 'valider' || action === 'approuve' || !action) {
                        if (isDRH) {
                            // Pour le DRH : rediriger vers la page des documents générés
                            const confirmed = window.confirm('Demande validée avec succès ! Un document a été généré automatiquement.\n\nVoulez-vous consulter les documents générés maintenant ?');
                            if (confirmed) {
                                window.location.href = '/documents-generes';
                            }
                        } else {
                            // Pour tous les autres rôles : afficher un message de succès
                            alert('✅ Demande validée avec succès !');
                        }
                    } else if (action === 'rejeter' || action === 'rejete') {
                        alert('Demande rejetée avec succès. L\'agent a été notifié du motif du rejet.');
                    }
                    
                    // Fermer les modals
                    setShowValidationModal(false);
                    toggle(); // Fermer la modal DemandeDetails
                    
                    // Appeler la fonction de callback pour mettre à jour la liste
                    if (onValidationSuccess) {
                        onValidationSuccess();
                    }
                    
                    // Retourner le résultat pour utilisation dans les appels directs
                    return result;
                } else {
                    // Gérer les erreurs HTTP
                    let errorMessage = 'Erreur lors de la validation';
                    let errorData = {};
                    
                    try {
                        errorData = await response.json();
                        // Utiliser errorMessage du serveur s'il est disponible, sinon error ou message
                        errorMessage = errorData.errorMessage || errorData.error || errorData.message || errorMessage;
                        
                        // Ajouter les détails si disponibles (en développement)
                        if (errorData.details && process.env.NODE_ENV === 'development') {
                            console.error('Détails de l\'erreur:', errorData.details);
                            if (typeof errorData.details === 'string') {
                                errorMessage += `\n\nDétails: ${errorData.details}`;
                            } else if (errorData.details.message) {
                                errorMessage += `\n\nDétails: ${errorData.details.message}`;
                            }
                        }
                    } catch (jsonError) {
                        // Si la réponse n'est pas du JSON, utiliser le statut HTTP
                        if (response.status === 503) {
                            errorMessage = 'Service temporairement indisponible. Le serveur est peut-être surchargé. Veuillez réessayer dans quelques instants.';
                        } else if (response.status === 500) {
                            errorMessage = 'Erreur interne du serveur. Veuillez contacter l\'administrateur.';
                        } else if (response.status === 404) {
                            errorMessage = 'Demande non trouvée.';
                        } else if (response.status === 401) {
                            errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                        } else if (response.status === 403) {
                            errorMessage = 'Vous n\'avez pas les permissions pour effectuer cette action.';
                        } else {
                            errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`;
                        }
                    }
                    
                    console.error('❌ Erreur lors de la validation:', {
                        status: response.status,
                        statusText: response.statusText,
                        errorData,
                        errorMessage
                    });
                    
                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error('❌ Erreur lors de la validation:', error);
                
                // Si c'est une erreur réseau (Failed to fetch)
                if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion internet ou réessayez plus tard.');
                }
                
                throw error;
            }
        };

        const handleTransmitDocument = async (demande) => {
            try {
                console.log('📤 Tentative de transmission du document pour la demande:', demande);
                console.log('📤 ID de la demande:', demande.id);
                console.log('📤 État de la demande:', {
                    niveau_evolution_demande: demande.niveau_evolution_demande,
                    phase: demande.phase,
                    statut_drh: demande.statut_drh
                });

                const response = await fetch(`https://tourisme.2ise-groupe.com/api/documents/${demande.id}/transmit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ 
                        commentaire: 'Document transmis par le chef de service'
                    })
                });
                
                console.log('📤 Réponse du serveur:', response.status, response.statusText);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('📤 Résultat de la transmission:', result);
                    alert('Document transmis avec succès à l\'agent !');
                    toggle(); // Fermer la modal
                    // Appeler la fonction de callback pour mettre à jour la liste
                    if (onValidationSuccess) {
                        onValidationSuccess();
                    }
                } else {
                    const errorData = await response.json();
                    console.error('📤 Erreur de transmission:', errorData);
                    alert(`Erreur lors de la transmission: ${errorData.error || 'Erreur inconnue'}`);
                }
            } catch (error) {
                console.error('📤 Erreur lors de la transmission:', error);
                alert(`Erreur lors de la transmission du document: ${error.message}`);
            }
        };

        return (
            <Modal isOpen={isOpen} toggle={toggle} size="lg">
                <ModalHeader toggle={toggle}>
                    <i className="fa fa-file-text me-2"></i>
                    Détails de la demande - Validation
                </ModalHeader>
                <ModalBody>
                    <div style={{ padding: '20px' }}>
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'Georgia, serif',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            backgroundColor: '#ffffff',
                            padding: '30px',
                            borderRadius: '8px',
                            border: '2px solid #e9ecef',
                            margin: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#333',
                            maxHeight: '60vh',
                            overflowY: 'auto'
                        }}>
                            {genererTexteNotificationGenerique(demande, {
                                prenom: demande.prenom || 'Agent',
                                nom: demande.nom || 'Inconnu',
                                matricule: demande.matricule || 'N/A',
                                email: demande.email || 'Non renseigné',
                                service_nom: demande.service_nom || 'Service'
                            }, 
                            // Déterminer le destinataire selon le niveau d'évolution de la demande et la hiérarchie
                            (() => {
                                // Si la demande est validée par le supérieur, c'est pour le DRH
                                if (demande.niveau_evolution_demande === 'valide_par_superieur' || demande.niveau_evolution_demande === 'valide_par_drh') {
                                    return 'drh';
                                }
                                // Si l'agent a un sous-directeur assigné (id_validateur_sous_directeur), c'est pour le sous-directeur
                                if (demande.id_validateur_sous_directeur || (demande.niveau_evolution_demande === 'soumis' && user?.role?.toLowerCase() === 'agent')) {
                                    return 'sous_directeur';
                                }
                                // Sinon, c'est pour le chef de service ou DRH selon le rôle
                                return user?.role?.toLowerCase() === 'drh' ? 'drh' : 'chef_service';
                            })()
                            )}
                        </pre>
                        
                        {/* Boutons d'action */}
                        <div style={{ 
                            marginTop: '20px', 
                            textAlign: 'center',
                            padding: '15px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                        }}>
                            <h6 style={{ marginBottom: '15px', color: '#495057' }}>
                                <i className="fa fa-cogs me-2"></i>
                                Actions de validation
                            </h6>
                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                {/* Afficher le bouton Transmettre si la demande a été validée par le DRH et retourne chez le chef de service */}
                                {(() => {
                                    console.log('🔍 État de la demande pour affichage du bouton:', {
                                        niveau_evolution_demande: demande.niveau_evolution_demande,
                                        phase: demande.phase,
                                        statut_drh: demande.statut_drh,
                                        shouldShowTransmit: demande.niveau_evolution_demande === 'retour_drh' && demande.phase === 'retour'
                                    });
                                    return demande.niveau_evolution_demande === 'retour_drh' && demande.phase === 'retour';
                                })() ? (
                                    <Button 
                                        color="primary" 
                                        size="lg"
                                        onClick={() => handleTransmitDocument(demande)}
                                        style={{ 
                                            minWidth: '150px',
                                            fontWeight: 'bold',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        <i className="fa fa-paper-plane me-2"></i>
                                        Transmettre
                                    </Button>
                                ) : (
                                    <>
                                        <Button 
                                            color="success" 
                                            size="lg"
                                            onClick={async () => {
                                                // Validation automatique pour tous les utilisateurs (pas de modal)
                                                try {
                                                    console.log('✅ Validation automatique pour la demande:', demande.id);
                                                    const result = await handleValidation(demande.id, 'approuve', '');
                                                    console.log('✅ Résultat de la validation automatique:', result);
                                                    // La modal se fermera automatiquement dans handleValidation
                                                } catch (error) {
                                                    console.error('❌ Erreur lors de la validation automatique:', error);
                                                    alert(`Erreur lors de la validation: ${error.message || 'Erreur inconnue'}`);
                                                }
                                            }}
                                            style={{ 
                                                minWidth: '120px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <i className="fa fa-check me-2"></i>
                                            Valider
                                        </Button>
                                        <Button 
                                            color="danger" 
                                            size="lg"
                                            onClick={() => {
                                                // Ouvrir le modal directement avec l'action "rejeter"
                                                setValidationAction('rejete');
                                                setShowValidationModal(true);
                                            }}
                                            style={{ 
                                                minWidth: '120px',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <i className="fa fa-times me-2"></i>
                                            Rejeter
                                        </Button>
                                        <ValidationModal
                                            isOpen={showValidationModal}
                                            toggle={() => {
                                                setShowValidationModal(false);
                                                setValidationAction(null);
                                            }}
                                            demande={demande}
                                            onValidate={handleValidation}
                                            defaultAction={validationAction}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggle}>
                        <i className="fa fa-arrow-left me-2"></i>
                        Retour
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    // Pour les autres types de demandes, affichage normal avec informations générales
    return (
        <Modal isOpen={isOpen} toggle={toggle} size="lg">
            <ModalHeader toggle={toggle}>
                <i className="fa fa-file-text me-2"></i>
                Détails de la demande
            </ModalHeader>
            <ModalBody>
                <Nav tabs>
                    <NavItem>
                        <NavLink
                            className={activeTab === '1' ? 'active' : ''}
                            onClick={() => setActiveTab('1')}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="fa fa-info-circle me-1"></i>
                            Informations
                        </NavLink>
                    </NavItem>
                    <NavItem>
                        <NavLink
                            className={activeTab === '2' ? 'active' : ''}
                            onClick={() => setActiveTab('2')}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="fa fa-history me-1"></i>
                            Historique
                        </NavLink>
                    </NavItem>
                </Nav>

                <TabContent activeTab={activeTab}>
                    <TabPane tabId="1">
                        <Row className="mt-3">
                            {/* Informations générales */}
                            <Col md="6">
                                <Card>
                                    <CardHeader>
                                        <h6 className="mb-0">INFORMATIONS GÉNÉRALES</h6>
                                    </CardHeader>
                                    <CardBody>
                                        <div className="mb-3">
                                            <strong>Type:</strong>
                                            <p className="mt-1">{getTypeDemandeLabel(demande.type_demande)}</p>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <strong>Statut:</strong>
                                            <p className="mt-1">{getStatusBadge(demande.status)}</p>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <strong>Niveau:</strong>
                                            <p className="mt-1">{getNiveauEvolutionBadge(demande.niveau_evolution_demande)}</p>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <strong>Priorité:</strong>
                                            <p className="mt-1">
                                                <Badge color={
                                                    demande.priorite === 'urgente'
                                                        ? 'danger'
                                                        : demande.priorite === 'critique'
                                                            ? 'dark'
                                                            : 'primary'
                                                }>
                                                    {demande.priorite === 'critique'
                                                        ? 'Exceptionnelle'
                                                        : demande.priorite === 'urgente'
                                                            ? 'Urgente'
                                                            : 'Normale'}
                                                </Badge>
                                            </p>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <strong>Date création:</strong>
                                            <p className="mt-1">{formatDate(demande.date_creation)}</p>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <strong>Dernière modification:</strong>
                                            <p className="mt-1">{formatDate(demande.updated_at || demande.date_creation)}</p>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Détails de la demande */}
                            <Col md="6">
                                <Card>
                                    <CardHeader>
                                        <h6 className="mb-0">DÉTAILS DE LA DEMANDE</h6>
                                    </CardHeader>
                                    <CardBody>
                                        <div className="mb-3">
                                            <strong>Motif:</strong>
                                            <p className="mt-1">{demande.description}</p>
                                        </div>
                                        
                                        {demande.type_demande === 'certificat_reprise_service' ? (
                                            <>
                                                <div className="mb-3">
                                                    <strong>Date de fin de congés:</strong>
                                                    <p className="mt-1">{demande.date_fin_conges ? formatDate(demande.date_fin_conges) : 'Non renseignée'}</p>
                                                </div>
                                                <div className="mb-3">
                                                    <strong>Date de reprise de service:</strong>
                                                    <p className="mt-1">{demande.date_reprise_service ? formatDate(demande.date_reprise_service) : 'Non renseignée'}</p>
                                                </div>
                                            </>
                                        ) : demande.type_demande === 'certificat_non_jouissance_conge' ? (
                                            <div className="mb-3">
                                                <strong>Année de non jouissance de congé:</strong>
                                                <p className="mt-1">
                                                    {demande.annee_non_jouissance_conge || (demande.description ? demande.description.match(/année\s+(\d{4})/i)?.[1] : null) || 'Non renseignée'}
                                                </p>
                                            </div>
                                        ) : (
                                            demande.date_debut && demande.date_fin && !(demande.type_demande === 'attestation_presence' && (user?.role?.toLowerCase() === 'chef_service' || user?.role?.toLowerCase() === 'drh')) && (
                                                <div className="mb-3">
                                                    <strong>Période:</strong>
                                                    <p className="mt-1">
                                                        Du {formatDate(demande.date_debut)} au {formatDate(demande.date_fin)}
                                                    </p>
                                                </div>
                                            )
                                        )}

                                        {demande.lieu && !(demande.type_demande === 'attestation_presence' && (user?.role?.toLowerCase() === 'chef_service' || user?.role?.toLowerCase() === 'drh')) && (
                                            <div className="mb-3">
                                                <strong>Lieu:</strong>
                                                <p className="mt-1">{demande.lieu}</p>
                                            </div>
                                        )}

                                        {demande.type_demande === 'certificat_reprise_service' && (
                                            <div className="mb-3">
                                                <strong>Informations supplémentaires:</strong>
                                                <p className="mt-1">Fin de congés et reprise de service communiquées ci-dessus.</p>
                                            </div>
                                        )}

                                        {/* Section spécifique pour les certificats de cessation */}
                                        {demande.type_demande === 'certificat_cessation' && (
                                            <>
                                                {(demande.date_cessation || demande.agree_date_cessation) && (
                                                    <div className="mb-3">
                                                        <strong>Date de cessation de service:</strong>
                                                        <p className="mt-1">
                                                            <i className="fa fa-calendar-alt text-primary me-2"></i>
                                                            {formatDate(demande.date_cessation || demande.agree_date_cessation)}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {(demande.motif || demande.agree_motif) && (
                                                    <div className="mb-3">
                                                        <strong>Motif de cessation:</strong>
                                                        <p className="mt-1">
                                                            <i className="fa fa-file-alt text-info me-2"></i>
                                                            {demande.motif || demande.agree_motif}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Section spécifique pour les certificats de reprise de service */}
                                        {demande.type_demande === 'certificat_reprise_service' && (
                                            <>
                                                {(demande.date_reprise_service || demande.date_fin_conges || demande.date_fin) && (
                                                    <div className="mb-3">
                                                        <strong>Date de reprise de service:</strong>
                                                        <p className="mt-1">
                                                            <i className="fa fa-calendar-check text-success me-2"></i>
                                                            {formatDate(demande.date_reprise_service || demande.date_fin_conges || demande.date_fin)}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {(demande.description || demande.motif) && (
                                                    <div className="mb-3">
                                                        <strong>Motif de reprise:</strong>
                                                        <p className="mt-1">
                                                            <i className="fa fa-file-alt text-info me-2"></i>
                                                            {demande.description || demande.motif}
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        
                                        {demande.commentaires && (
                                            <div className="mb-3">
                                                <strong>Commentaires:</strong>
                                                <p className="mt-1">{demande.commentaires}</p>
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>

                        {/* Processus de validation */}
                        <Card className="mt-3">
                            <CardHeader>
                                <h6 className="mb-0">PROCESSUS DE VALIDATION</h6>
                            </CardHeader>
                            <CardBody>
                                <Row>
                                    {/* Sous-directeur */}
                                    <Col md="2" sm="4" xs="6" className="mb-3">
                                        <div className="text-center">
                                            <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                                                demande.statut_sous_directeur === 'approuve' ? 'bg-success text-white' :
                                                demande.statut_sous_directeur === 'rejete' ? 'bg-danger text-white' :
                                                demande.niveau_evolution_demande === 'soumis' ? 'bg-warning text-white' :
                                                'bg-light text-dark'
                                            }`} style={{ width: '40px', height: '40px' }}>
                                                <i className="fa fa-user-tie"></i>
                                            </div>
                                            <small>Sous-directeur</small>
                                            <br />
                                            <Badge color={
                                                demande.statut_sous_directeur === 'approuve' ? 'success' :
                                                demande.statut_sous_directeur === 'rejete' ? 'danger' : 
                                                demande.niveau_evolution_demande === 'soumis' ? 'warning' : 'secondary'
                                            }>
                                                {demande.statut_sous_directeur ? 
                                                    (demande.statut_sous_directeur === 'approuve' ? 'Approuvé' : 'Rejeté') : 
                                                    (demande.niveau_evolution_demande === 'soumis' ? 'En cours' : 'En attente')
                                                }
                                            </Badge>
                                        </div>
                                    </Col>
                                    {/* Directeur */}
                                    <Col md="2" sm="4" xs="6" className="mb-3">
                                        <div className="text-center">
                                            <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                                                demande.statut_directeur === 'approuve' ? 'bg-success text-white' :
                                                demande.statut_directeur === 'rejete' ? 'bg-danger text-white' :
                                                demande.niveau_evolution_demande === 'valide_par_sous_directeur' || demande.niveau_evolution_demande === 'soumis' ? 'bg-warning text-white' :
                                                'bg-light text-dark'
                                            }`} style={{ width: '40px', height: '40px' }}>
                                                <i className="fa fa-user-md"></i>
                                            </div>
                                            <small>Directeur</small>
                                            <br />
                                            <Badge color={
                                                demande.statut_directeur === 'approuve' ? 'success' :
                                                demande.statut_directeur === 'rejete' ? 'danger' : 
                                                (demande.niveau_evolution_demande === 'valide_par_sous_directeur' || demande.niveau_evolution_demande === 'soumis') ? 'warning' : 'secondary'
                                            }>
                                                {demande.statut_directeur ? 
                                                    (demande.statut_directeur === 'approuve' ? 'Approuvé' : 'Rejeté') : 
                                                    (demande.niveau_evolution_demande === 'valide_par_sous_directeur' || demande.niveau_evolution_demande === 'soumis') ? 'En cours' : 'En attente'
                                                }
                                            </Badge>
                                        </div>
                                    </Col>
                                    {/* DRH */}
                                    <Col md="2" sm="4" xs="6" className="mb-3">
                                        <div className="text-center">
                                            <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                                                demande.statut_drh === 'approuve' ? 'bg-success text-white' :
                                                demande.statut_drh === 'rejete' ? 'bg-danger text-white' :
                                                demande.niveau_evolution_demande === 'valide_par_directeur' ? 'bg-warning text-white' :
                                                'bg-light text-dark'
                                            }`} style={{ width: '40px', height: '40px' }}>
                                                <i className="fa fa-users"></i>
                                            </div>
                                            <small>DRH</small>
                                            <br />
                                            <Badge color={
                                                demande.statut_drh === 'approuve' ? 'success' :
                                                demande.statut_drh === 'rejete' ? 'danger' : 
                                                demande.niveau_evolution_demande === 'valide_par_directeur' ? 'warning' : 'secondary'
                                            }>
                                                {demande.statut_drh ? 
                                                    (demande.statut_drh === 'approuve' ? 'Approuvé' : 'Rejeté') : 
                                                    (demande.niveau_evolution_demande === 'valide_par_directeur' ? 'En cours' : 'En attente')
                                                }
                                            </Badge>
                                        </div>
                                    </Col>
                                    {/* Dir Cabinet (si applicable) */}
                                    {(demande.niveau_evolution_demande === 'valide_par_dir_cabinet' || 
                                      demande.niveau_evolution_demande === 'valide_par_chef_cabinet' ||
                                      demande.statut_dir_cabinet) && (
                                        <Col md="2" sm="4" xs="6" className="mb-3">
                                            <div className="text-center">
                                                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                                                    demande.statut_dir_cabinet === 'approuve' ? 'bg-success text-white' :
                                                    demande.statut_dir_cabinet === 'rejete' ? 'bg-danger text-white' :
                                                    demande.niveau_evolution_demande === 'valide_par_directeur' ? 'bg-warning text-white' :
                                                    'bg-light text-dark'
                                                }`} style={{ width: '40px', height: '40px' }}>
                                                    <i className="fa fa-briefcase"></i>
                                                </div>
                                                <small>Dir Cabinet</small>
                                                <br />
                                                <Badge color={
                                                    demande.statut_dir_cabinet === 'approuve' ? 'success' :
                                                    demande.statut_dir_cabinet === 'rejete' ? 'danger' : 
                                                    demande.niveau_evolution_demande === 'valide_par_directeur' ? 'warning' : 'secondary'
                                                }>
                                                    {demande.statut_dir_cabinet ? 
                                                        (demande.statut_dir_cabinet === 'approuve' ? 'Approuvé' : 'Rejeté') : 
                                                        (demande.niveau_evolution_demande === 'valide_par_directeur' ? 'En cours' : 'En attente')
                                                    }
                                                </Badge>
                                            </div>
                                        </Col>
                                    )}
                                    {/* Ministre (si applicable) */}
                                    {(demande.niveau_evolution_demande === 'valide_par_ministre' || 
                                      demande.statut_ministre) && (
                                        <Col md="2" sm="4" xs="6" className="mb-3">
                                            <div className="text-center">
                                                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                                                    demande.statut_ministre === 'approuve' ? 'bg-success text-white' :
                                                    demande.statut_ministre === 'rejete' ? 'bg-danger text-white' :
                                                    demande.niveau_evolution_demande === 'valide_par_dir_cabinet' || demande.niveau_evolution_demande === 'valide_par_chef_cabinet' ? 'bg-warning text-white' :
                                                    'bg-light text-dark'
                                                }`} style={{ width: '40px', height: '40px' }}>
                                                    <i className="fa fa-crown"></i>
                                                </div>
                                                <small>Ministre</small>
                                                <br />
                                                <Badge color={
                                                    demande.statut_ministre === 'approuve' ? 'success' :
                                                    demande.statut_ministre === 'rejete' ? 'danger' : 
                                                    (demande.niveau_evolution_demande === 'valide_par_dir_cabinet' || demande.niveau_evolution_demande === 'valide_par_chef_cabinet') ? 'warning' : 'secondary'
                                                }>
                                                    {demande.statut_ministre ? 
                                                        (demande.statut_ministre === 'approuve' ? 'Approuvé' : 'Rejeté') : 
                                                        (demande.niveau_evolution_demande === 'valide_par_dir_cabinet' || demande.niveau_evolution_demande === 'valide_par_chef_cabinet') ? 'En cours' : 'En attente'
                                                    }
                                                </Badge>
                                            </div>
                                        </Col>
                                    )}
                                    {/* Finalisé */}
                                    <Col md="2" sm="4" xs="6" className="mb-3">
                                        <div className="text-center">
                                            <div className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-2 ${
                                                demande.status === 'approuve' ? 'bg-success text-white' :
                                                demande.status === 'rejete' ? 'bg-danger text-white' :
                                                (demande.niveau_evolution_demande === 'finalise' || demande.niveau_actuel === 'finalise') ? 'bg-success text-white' :
                                                'bg-light text-dark'
                                            }`} style={{ width: '40px', height: '40px' }}>
                                                <i className="fa fa-check-double"></i>
                                            </div>
                                            <small>Finalisé</small>
                                            <br />
                                            <Badge color={
                                                demande.status === 'approuve' ? 'success' :
                                                demande.status === 'rejete' ? 'danger' : 
                                                (demande.niveau_evolution_demande === 'finalise' || demande.niveau_actuel === 'finalise') ? 'success' : 'secondary'
                                            }>
                                                {demande.status === 'approuve' ? 'Approuvé' : 
                                                 demande.status === 'rejete' ? 'Rejeté' : 
                                                 (demande.niveau_evolution_demande === 'finalise' || demande.niveau_actuel === 'finalise') ? 'Finalisé' : 'En attente'}
                                            </Badge>
                                        </div>
                                    </Col>
                                </Row>
                            </CardBody>
                        </Card>
                    </TabPane>

                    <TabPane tabId="2">
                        <div className="mt-3">
                            <h6>Historique des actions</h6>
                            {loadingHistorique ? (
                                <div className="text-center py-3">
                                    <Spinner size="sm" />
                                    <span className="ml-2">Chargement de l'historique...</span>
                                </div>
                            ) : historique.length === 0 ? (
                                <Alert color="info">
                                    <i className="fa fa-info-circle me-2"></i>
                                    Aucun historique disponible pour cette demande.
                                </Alert>
                            ) : (
                                <div className="timeline">
                                    {historique.map((action, index) => (
                                        <div key={index} className="timeline-item d-flex mb-3">
                                            <div className="timeline-marker bg-primary rounded-circle me-3" 
                                                 style={{ width: '12px', height: '12px', marginTop: '6px' }}></div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <strong>{action.prenom} {action.nom}</strong>
                                                        <span className="text-muted ms-2">({action.matricule})</span>
                                                    </div>
                                                    <small className="text-muted">
                                                        {formatDate(action.date_action)}
                                                    </small>
                                                </div>
                                                <div className="mt-1">
                                                    {getActionBadge(action.action)} - Niveau: {action.niveau_validation}
                                                </div>
                                                {action.commentaire && (
                                                    <div className="mt-2 p-2 bg-light rounded">
                                                        <small>{action.commentaire}</small>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabPane>
                </TabContent>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    Fermer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default DemandeDetails;
