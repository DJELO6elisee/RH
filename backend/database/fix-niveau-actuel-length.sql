--
-- Fix: niveau_actuel trop court (VARCHAR(20))
-- Certains niveaux (ex: 'directeur_service_exterieur') dépassent 20 caractères.
--

ALTER TABLE public.demandes
    ALTER COLUMN niveau_actuel TYPE VARCHAR(50);

