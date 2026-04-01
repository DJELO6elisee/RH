-- Script pour ajouter la colonne date_delivrance_acte_mariage à la table agents
-- Auteur: Système
-- Date: 2025-01-XX

-- Ajouter la colonne pour la date de délivrance de l'acte de mariage
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS date_delivrance_acte_mariage DATE;

-- Commentaire sur la colonne
COMMENT ON COLUMN agents.date_delivrance_acte_mariage IS 'Date de délivrance de l''acte de mariage';

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Colonne date_delivrance_acte_mariage ajoutée avec succès à la table agents';
END $$;

