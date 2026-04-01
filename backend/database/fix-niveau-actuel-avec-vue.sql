-- ============================================================
-- Fix: niveau_actuel VARCHAR(20) → VARCHAR(50)
-- + recréation des vues qui dépendent de la colonne:
--   - public.v_demandes_en_attente
--   - public.v_notifications_non_lues
-- ============================================================

-- 1) Supprimer les vues qui dépendent de niveau_actuel
DROP VIEW IF EXISTS public.v_notifications_non_lues;
DROP VIEW IF EXISTS public.v_demandes_en_attente;

-- 2) Agrandir la colonne (corrige l'erreur "value too long for type character varying(20)")
ALTER TABLE public.demandes
    ALTER COLUMN niveau_actuel TYPE VARCHAR(50);

-- 3) Recréer la vue (tous les niveaux / rôles pris en compte pour id_validateur_actuel)
CREATE VIEW public.v_demandes_en_attente AS
SELECT d.id,
    d.id_agent,
    a.prenom,
    a.nom,
    a.matricule,
    d.type_demande,
    d.description,
    d.niveau_actuel,
    d.priorite,
    d.date_creation,
    CASE d.niveau_actuel
        WHEN 'chef_service'::text THEN d.id_chef_service
        WHEN 'sous_directeur'::text THEN d.id_validateur_sous_directeur
        WHEN 'directeur'::text THEN d.id_validateur_directeur
        WHEN 'drh'::text THEN d.id_drh
        WHEN 'dir_cabinet'::text THEN d.id_validateur_dir_cabinet
        WHEN 'chef_cabinet'::text THEN d.id_validateur_chef_cabinet
        WHEN 'directeur_central'::text THEN d.id_validateur_directeur_central
        WHEN 'directeur_general'::text THEN d.id_validateur_directeur_general
        WHEN 'directeur_service_exterieur'::text THEN d.id_validateur_directeur_service_exterieur
        WHEN 'ministre'::text THEN d.id_ministre
        ELSE NULL::integer
    END AS id_validateur_actuel
FROM public.demandes d
LEFT JOIN public.agents a ON d.id_agent = a.id
WHERE (d.status::text = 'en_attente') AND (d.niveau_actuel::text <> 'finalise'::text) AND (d.niveau_actuel::text <> 'rejete'::text);

-- 4) Recréer la vue des notifications non lues (dépend aussi de demandes.niveau_actuel)
CREATE VIEW public.v_notifications_non_lues AS
SELECT n.id,
    n.id_demande,
    n.type_notification,
    n.titre,
    n.message,
    n.date_creation,
    d.type_demande,
    d.description,
    d.niveau_actuel,
    d.status
FROM public.notifications_demandes n
LEFT JOIN public.demandes d ON n.id_demande = d.id
WHERE (n.lu = false)
ORDER BY n.date_creation DESC;

-- Optionnel : redonner le propriétaire si votre rôle est différent (ex: isegroup_tourisme)
-- ALTER VIEW public.v_demandes_en_attente OWNER TO isegroup_tourisme;
-- ALTER VIEW public.v_notifications_non_lues OWNER TO isegroup_tourisme;
