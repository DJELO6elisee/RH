-- Script pour ajouter les colonnes date_sortie aux tables fonction_agents et emploi_agents
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- AJOUT DES COLONNES DATE_SORTIE
-- =====================================================

-- Ajouter la colonne date_sortie à la table fonction_agents
ALTER TABLE fonction_agents ADD COLUMN IF NOT EXISTS date_sortie DATE;

-- Ajouter la colonne date_sortie à la table emploi_agents
ALTER TABLE emploi_agents ADD COLUMN IF NOT EXISTS date_sortie DATE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN fonction_agents.date_sortie IS 'Date de fin de fonction de l''agent';
COMMENT ON COLUMN emploi_agents.date_sortie IS 'Date de fin d''emploi de l''agent';

-- Afficher un message de confirmation
SELECT 'Colonnes date_sortie ajoutées avec succès aux tables fonction_agents et emploi_agents' as status;
