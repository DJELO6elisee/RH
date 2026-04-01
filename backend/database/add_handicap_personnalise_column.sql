-- Script pour ajouter la colonne handicap_personnalise à la table agents
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- AJOUT DE LA COLONNE HANDICAP_PERSONNALISE
-- =====================================================

-- Ajouter la colonne handicap_personnalise si elle n'existe pas
ALTER TABLE agents ADD COLUMN IF NOT EXISTS handicap_personnalise VARCHAR(255);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN agents.handicap_personnalise IS 'Handicap personnalisé saisi par l''agent quand il choisit "Autre" comme handicap';

-- Afficher un message de confirmation
SELECT 'Colonne handicap_personnalise ajoutée avec succès à la table agents' as status;
