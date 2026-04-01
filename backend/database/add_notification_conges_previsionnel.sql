-- Script pour ajouter le type de notification 'conges_previsionnel' à la table notifications_demandes
-- Ce type permet d'envoyer des notifications automatiques pour les congés prévisionnels

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE public.notifications_demandes 
DROP CONSTRAINT IF EXISTS notifications_demandes_type_notification_check;

-- Ajouter la nouvelle contrainte avec le type de notification de congés prévisionnels
ALTER TABLE public.notifications_demandes 
ADD CONSTRAINT notifications_demandes_type_notification_check 
CHECK (
    (type_notification)::text = ANY (
        ARRAY[
            'nouvelle_demande'::character varying,
            'demande_approuvee'::character varying,
            'demande_rejetee'::character varying,
            'demande_en_cours'::character varying,
            'demande_finalisee'::character varying,
            'rappel_validation'::character varying,
            'document_transmis'::character varying,
            'note_service'::character varying,
            'anniversaire_aujourdhui'::character varying,
            'anniversaire_avenir'::character varying,
            'mariage_30_jours'::character varying,
            'mariage_7_jours'::character varying,
            'mariage_3_jours'::character varying,
            'conges_previsionnel'::character varying
        ]::text[]
    )
);

-- Commentaire pour documenter le nouveau type
COMMENT ON CONSTRAINT notifications_demandes_type_notification_check ON public.notifications_demandes IS 
'Types de notification incluant les notifications de congés prévisionnels (1 mois avant la date de départ)';

