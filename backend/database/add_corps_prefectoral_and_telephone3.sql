-- Script pour ajouter les colonnes du corps préfectoral et telephone3 à la table agents
-- Auteur: Système
-- Date: 2025-12-03

-- Ajouter la colonne telephone3 pour le deuxième numéro d'urgence
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS telephone3 VARCHAR(20);

-- Ajouter les colonnes pour le corps préfectoral
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS corps_prefectoral VARCHAR(50);

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS grade_prefectoral VARCHAR(50);

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS echelon_prefectoral INTEGER;

-- Ajouter la colonne pour la date de délivrance de l'acte de mariage
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS date_delivrance_acte_mariage DATE;

-- Commentaires sur les colonnes
COMMENT ON COLUMN agents.telephone3 IS 'Deuxième numéro d''urgence de l''agent';
COMMENT ON COLUMN agents.corps_prefectoral IS 'Corps préfectoral de l''agent (prefet_hors_grade, prefet, secretaire_general, sous_prefet)';
COMMENT ON COLUMN agents.grade_prefectoral IS 'Grade préfectoral automatique (HG, GI, GII, GIII)';
COMMENT ON COLUMN agents.echelon_prefectoral IS 'Échelon préfectoral (1, 2, 3)';
COMMENT ON COLUMN agents.date_delivrance_acte_mariage IS 'Date de délivrance de l''acte de mariage';

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Colonnes ajoutées avec succès :';
    RAISE NOTICE '- telephone3 (VARCHAR(20))';
    RAISE NOTICE '- corps_prefectoral (VARCHAR(50))';
    RAISE NOTICE '- grade_prefectoral (VARCHAR(50))';
    RAISE NOTICE '- echelon_prefectoral (INTEGER)';
    RAISE NOTICE '- date_delivrance_acte_mariage (DATE)';
END $$;

