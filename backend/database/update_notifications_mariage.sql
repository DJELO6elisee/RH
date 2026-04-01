-- Script pour ajouter les types de notification de mariage à la table notifications_demandes
-- Ces types permettront d'envoyer des notifications automatiques pour les mariages

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE public.notifications_demandes 
DROP CONSTRAINT IF EXISTS notifications_demandes_type_notification_check;

-- Ajouter la nouvelle contrainte avec les types de notification de mariage
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
            'mariage_3_jours'::character varying
        ]::text[]
    )
);

-- Commentaire pour documenter les nouveaux types
COMMENT ON CONSTRAINT notifications_demandes_type_notification_check ON public.notifications_demandes IS 
'Types de notification incluant les notifications de mariage (30 jours, 7 jours, 3 jours avant)';

