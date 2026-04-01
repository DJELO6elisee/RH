-- Fonction pour générer un texte de notification détaillé pour les demandes d'absence
CREATE OR REPLACE FUNCTION generer_texte_notification_absence(
    demande_id INTEGER
) RETURNS TEXT AS $$
DECLARE
    demande_info RECORD;
    agent_info RECORD;
    periode_jours INTEGER;
    periode_semaines INTEGER;
    periode_annees INTEGER;
    periode_texte TEXT;
    texte_notification TEXT;
BEGIN
    -- Récupérer les informations de la demande et de l'agent
    SELECT 
        d.id, d.type_demande, d.description, d.date_debut, d.date_fin, 
        d.lieu, d.priorite, d.date_creation,
        a.prenom, a.nom, a.matricule, a.email,
        s.libelle as service_nom, m.nom as ministere_nom
    INTO demande_info
    FROM demandes d
    LEFT JOIN agents a ON d.id_agent = a.id
    LEFT JOIN directions s ON a.id_direction = s.id
    LEFT JOIN ministeres m ON a.id_ministere = m.id
    WHERE d.id = demande_id;

    -- Calculer la période d'absence
    IF demande_info.date_debut IS NOT NULL AND demande_info.date_fin IS NOT NULL THEN
        periode_jours := (demande_info.date_fin - demande_info.date_debut) + 1;
        periode_semaines := FLOOR(periode_jours / 7);
        periode_annees := FLOOR(periode_jours / 365);
        
        -- Générer le texte de la période
        IF periode_annees > 0 THEN
            periode_texte := periode_annees || ' année' || CASE WHEN periode_annees > 1 THEN 's' ELSE '' END;
            IF periode_semaines > 0 AND (periode_semaines % 52) > 0 THEN
                periode_texte := periode_texte || ', ' || (periode_semaines % 52) || ' semaine' || CASE WHEN (periode_semaines % 52) > 1 THEN 's' ELSE '' END;
            END IF;
            IF (periode_jours % 7) > 0 THEN
                periode_texte := periode_texte || ' et ' || (periode_jours % 7) || ' jour' || CASE WHEN (periode_jours % 7) > 1 THEN 's' ELSE '' END;
            END IF;
        ELSIF periode_semaines > 0 THEN
            periode_texte := periode_semaines || ' semaine' || CASE WHEN periode_semaines > 1 THEN 's' ELSE '' END;
            IF (periode_jours % 7) > 0 THEN
                periode_texte := periode_texte || ' et ' || (periode_jours % 7) || ' jour' || CASE WHEN (periode_jours % 7) > 1 THEN 's' ELSE '' END;
            END IF;
        ELSE
            periode_texte := periode_jours || ' jour' || CASE WHEN periode_jours > 1 THEN 's' ELSE '' END;
        END IF;
    ELSE
        periode_jours := 0;
        periode_semaines := 0;
        periode_annees := 0;
        periode_texte := 'Période non définie';
    END IF;

    -- Générer le texte de notification détaillé
    texte_notification := '
📋 DEMANDE D''ABSENCE - ' || COALESCE(demande_info.prenom, '') || ' ' || COALESCE(demande_info.nom, '') || '

👤 INFORMATIONS DE L''AGENT :
• Nom complet : ' || COALESCE(demande_info.prenom, '') || ' ' || COALESCE(demande_info.nom, '') || '
• Matricule : ' || COALESCE(demande_info.matricule, 'Non renseigné') || '
• Email : ' || COALESCE(demande_info.email, 'Non renseigné') || '

📅 DÉTAILS DE L''ABSENCE :
• Date de début : ' || COALESCE(TO_CHAR(demande_info.date_debut, 'DD/MM/YYYY'), 'Non renseigné') || '
• Date de fin : ' || COALESCE(TO_CHAR(demande_info.date_fin, 'DD/MM/YYYY'), 'Non renseigné') || '
• Durée : ' || periode_texte || ' (' || periode_jours || ' jour' || CASE WHEN periode_jours > 1 THEN 's' ELSE '' END || ')
• Lieu : ' || COALESCE(demande_info.lieu, 'Non spécifié') || '

📝 MOTIF ET DESCRIPTION :
' || COALESCE(demande_info.description, 'Aucune description fournie') || '

⚡ PRIORITÉ : ' || COALESCE(UPPER(demande_info.priorite), 'NORMALE') || '

📊 RÉSUMÉ DE LA PÉRIODE :
• Total de jours : ' || periode_jours || '
• En semaines : ' || periode_semaines || ' semaine' || CASE WHEN periode_semaines > 1 THEN 's' ELSE '' END || '
• En années : ' || periode_annees || ' année' || CASE WHEN periode_annees > 1 THEN 's' ELSE '' END || '

🕐 DATE DE SOUMISSION : ' || TO_CHAR(demande_info.date_creation, 'DD/MM/YYYY à HH24:MI') || '

Cette demande nécessite votre validation en tant que chef de service.
Merci de traiter cette demande dans les plus brefs délais.

---
Système de Gestion des Ressources Humaines';

    RETURN texte_notification;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une notification détaillée pour les demandes d'absence
CREATE OR REPLACE FUNCTION creer_notification_absence_detaille(
    demande_id INTEGER,
    chef_service_id INTEGER
) RETURNS VOID AS $$
DECLARE
    agent_info RECORD;
    texte_notification TEXT;
BEGIN
    -- Récupérer les informations de l'agent
    SELECT a.prenom, a.nom
    INTO agent_info
    FROM demandes d
    LEFT JOIN agents a ON d.id_agent = a.id
    WHERE d.id = demande_id;

    -- Générer le texte de notification détaillé
    texte_notification := generer_texte_notification_absence(demande_id);

    -- Créer la notification détaillée
    INSERT INTO notifications_demandes (
        id_demande, 
        id_agent_destinataire, 
        type_notification, 
        titre, 
        message
    ) VALUES (
        demande_id,
        chef_service_id,
        'nouvelle_demande_absence',
        'Demande d''absence - ' || COALESCE(agent_info.prenom, '') || ' ' || COALESCE(agent_info.nom, ''),
        texte_notification
    );
END;
$$ LANGUAGE plpgsql;
