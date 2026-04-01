-- Script pour ajouter la colonne type_conge à la table agent_conges
-- Cette colonne permet de distinguer les congés groupés des congés individuels
-- 'grouped' = congés groupés, 'individual' = congés individuels, NULL = anciennes données

-- Ajouter la colonne type_conge si elle n'existe pas déjà
ALTER TABLE public.agent_conges 
ADD COLUMN IF NOT EXISTS type_conge VARCHAR(20) DEFAULT NULL;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN public.agent_conges.type_conge IS 'Type de congé: ''grouped'' pour congés groupés, ''individual'' pour congés individuels';

-- Créer un index pour améliorer les performances des requêtes de recherche par type
CREATE INDEX IF NOT EXISTS idx_agent_conges_type_conge ON public.agent_conges(type_conge);

-- Créer un index composite pour les recherches par année et type
CREATE INDEX IF NOT EXISTS idx_agent_conges_annee_type ON public.agent_conges(annee, type_conge);

