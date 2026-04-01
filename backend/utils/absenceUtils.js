/**
 * Utilitaires pour la gestion des demandes d'absence
 */

/**
 * Calcule la période d'absence entre deux dates
 * @param {string} dateDebut - Date de début (format YYYY-MM-DD)
 * @param {string} dateFin - Date de fin (format YYYY-MM-DD)
 * @returns {object} - Objet contenant la période calculée
 */
function calculerPeriodeAbsence(dateDebut, dateFin) {
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

    // Vérifier que les dates sont valides
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
        return {
            jours: 0,
            semaines: 0,
            annees: 0,
            periodeTexte: 'Dates invalides'
        };
    }

    // Calculer la différence en millisecondes
    const differenceMs = fin.getTime() - debut.getTime();

    // Convertir en jours
    const jours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le jour de début

    // Calculer les semaines et années
    const semaines = Math.floor(jours / 7);
    const annees = Math.floor(jours / 365);

    // Générer le texte de la période
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
}

/**
 * Génère un texte de notification détaillé pour une demande d'absence
 * @param {object} demande - Objet contenant les informations de la demande
 * @param {object} agent - Objet contenant les informations de l'agent
 * @returns {string} - Texte de notification formaté
 */
function genererTexteNotificationAbsence(demande, agent) {
    const periode = calculerPeriodeAbsence(demande.date_debut, demande.date_fin);

    const texte = `Objet : Demande d'autorisation d'absence

Cher Chef de Service,

Je sollicite par la présente une autorisation d'absence pour la période du ${new Date(demande.date_debut).toLocaleDateString('fr-FR')} au ${new Date(demande.date_fin).toLocaleDateString('fr-FR')}, pour des raisons personnelles.

${demande.description ? `Motif : ${demande.description}` : ''}
${demande.lieu ? `Lieu : ${demande.lieu}` : ''}
Durée : ${periode.periodeTexte} (${periode.jours} jour${periode.jours > 1 ? 's' : ''})

Je reste disponible pour toute précision et prends les dispositions nécessaires afin d'assurer la continuité du service.

Cordialement,  
${agent.prenom} ${agent.nom}  
Agent au ${agent.service_nom || 'Service'}

---
Matricule : ${agent.matricule}
Email : ${agent.email || 'Non renseigné'}
Date de soumission : ${new Date(demande.date_creation).toLocaleString('fr-FR')}
Priorité : ${demande.priorite ? demande.priorite.toUpperCase() : 'NORMALE'}`.trim();

    return texte;
}

/**
 * Génère un texte de notification détaillé pour une demande d'attestation de présence
 * @param {object} demande - Objet contenant les informations de la demande
 * @param {object} agent - Objet contenant les informations de l'agent
 * @param {object} validateur - Objet contenant les informations du validateur (chef de service)
 * @param {string} destinataire - Le rôle du destinataire ('chef_service', 'drh', 'agent')
 * @returns {string} - Texte de notification formaté
 */
function genererTexteNotificationAttestationPresence(demande, agent, validateur, destinataire = 'agent') {
    // Pour les attestations de présence, masquer lieu, période et durée si c'est un chef de service ou DRH
    const isChefService = destinataire === 'chef_service';
    const isDRH = destinataire === 'drh';
    const shouldHideDetails = isChefService || isDRH;

    let texte = `DEMANDE D'ATTESTATION DE PRÉSENCE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS SUR L'AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nom et Prénom : ${agent.prenom} ${agent.nom}
Matricule : ${agent.matricule}
Service : ${agent.service_nom || 'Non renseigné'}
Email : ${agent.email || 'Non renseigné'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÉTAILS DE LA DEMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type : ATTESTATION DE PRÉSENCE`;

    // Ne pas afficher la période et le lieu pour les chefs de service et DRH
    if (!shouldHideDetails) {
        texte += `
Période demandée : Du ${new Date(demande.date_debut).toLocaleDateString('fr-FR')} au ${new Date(demande.date_fin).toLocaleDateString('fr-FR')}
${demande.lieu ? `Lieu : ${demande.lieu}` : ''}`;
    }

    texte += `
${demande.description ? `\nDescription :\n${demande.description}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS COMPLÉMENTAIRES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Date de soumission : ${new Date(demande.date_creation).toLocaleString('fr-FR')}
Priorité : ${demande.priorite ? demande.priorite.toUpperCase() : 'NORMALE'}
Statut : ${demande.status || 'En attente'}`;

    // Afficher les informations de validation selon le destinataire
    if (destinataire === 'agent') {
        texte += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION PAR LE CHEF DE SERVICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Validateur : ${validateur.prenom} ${validateur.nom}
Date de validation : ${new Date().toLocaleString('fr-FR')}
${demande.commentaire_chef_service ? `Commentaire : ${demande.commentaire_chef_service}` : ''}

Cette attestation de présence a été validée par votre chef de service et transmise au DRH pour génération du document officiel.`;
    }

    return texte.trim();
}

/**
 * Génère le texte de notification pour les demandes de sortie du territoire
 * @param {Object} demande - Les données de la demande
 * @param {Object} agent - Les données de l'agent
 * @returns {string} - Le texte de notification formaté
 */
function genererTexteNotificationSortieTerritoire(demande, agent) {
    const { getAgentPosteOuEmploi } = require('../services/utils/agentFunction');
    const civilite = agent.sexe === 'F' ? 'Mme' : 'M.';
    const nomComplet = `${civilite} ${agent.nom} ${agent.prenom}`;
    const fonctionActuelle = getAgentPosteOuEmploi(agent);
    const serviceNom = agent.service_nom || 'Service non renseigné';
    const ministereNom = agent.ministere_nom || 'Ministère non renseigné';
    const echelonLibelle = agent.echelon_libelle || 'Échelon non renseigné';
    
    // Calculer la période de sortie
    const periode = calculerPeriodeAbsence(demande.date_debut, demande.date_fin);
    
    const texte = `Cher Sous-Directeur,

Je viens par le présent document vous demander de bien vouloir examiner la demande de sortie du territoire présentée par l'un de nos agents.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS SUR L'AGENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Nom et Prénoms : ${nomComplet}
• Matricule : ${agent.matricule || 'Non renseigné'}
• Fonction actuelle : ${fonctionActuelle}
• Échelon : ${echelonLibelle}
• Service : ${serviceNom}
• Ministère : ${ministereNom}
• Adresse email : ${agent.email || 'Non renseigné'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DÉTAILS DE LA DEMANDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Type de demande : Demande de sortie du territoire
• Période de sortie : ${periode.periodeTexte}
• Date de départ : ${formaterDateFrancaise(demande.date_debut)}
• Date de retour : ${formaterDateFrancaise(demande.date_fin)}
• Destination : ${demande.lieu || 'Non renseigné'}
• Motif/Description : ${demande.description || 'Aucune description fournie'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMATIONS ADMINISTRATIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Date de soumission : ${new Date(demande.date_creation).toLocaleString('fr-FR')}
• Priorité : ${demande.priorite ? demande.priorite.toUpperCase() : 'NORMALE'}
• Statut actuel : ${demande.status || 'En attente de validation'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEMANDE D'EXAMEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Je vous prie de bien vouloir examiner cette demande de sortie du territoire et de prendre la décision qui s'impose selon les dispositions réglementaires en vigueur.

Votre décision est attendue dans les plus brefs délais pour permettre à l'agent de finaliser ses préparatifs de voyage.

Je vous remercie par avance pour votre diligence et reste à votre disposition pour tout complément d'information.

Cordialement,
Le Système de Gestion des Ressources Humaines`;

    return texte.trim();
}

/**
 * Formate une date en français
 * @param {string} dateString - Date au format ISO
 * @returns {string} - Date formatée en français
 */
function formaterDateFrancaise(dateString) {
    if (!dateString) return 'Non renseigné';

    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

module.exports = {
    calculerPeriodeAbsence,
    genererTexteNotificationAbsence,
    genererTexteNotificationAttestationPresence,
    genererTexteNotificationSortieTerritoire,
    formaterDateFrancaise
};