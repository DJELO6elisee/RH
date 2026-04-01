-- Script pour ajouter la colonne date_depart_conges à la table agent_conges
-- Cette colonne stocke la date de départ en congés prévisionnelle pour chaque agent chaque année
-- Compatible avec PostgreSQL 10.23

-- Ajouter la colonne date_depart_conges si elle n'existe pas déjà
ALTER TABLE public.agent_conges 
ADD COLUMN IF NOT EXISTS date_depart_conges DATE;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN public.agent_conges.date_depart_conges IS 'Date de départ prévisionnelle en congés pour l''agent pour l''année de référence';

-- Créer un index pour améliorer les performances des requêtes de recherche par date
CREATE INDEX IF NOT EXISTS idx_agent_conges_date_depart 
ON public.agent_conges USING btree (date_depart_conges);

-- Créer un index composite pour les recherches par année et date de départ
CREATE INDEX IF NOT EXISTS idx_agent_conges_annee_date_depart 
ON public.agent_conges USING btree (annee, date_depart_conges);

