-- Script pour ajouter les champs de date de prise de service dans la table agents
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- AJOUT DES CHAMPS DE DATE DE PRISE DE SERVICE
-- =====================================================

-- Ajouter la colonne date_prise_service_au_ministere
ALTER TABLE agents ADD COLUMN IF NOT EXISTS date_prise_service_au_ministere DATE;

-- Ajouter la colonne date_prise_service_dans_la_direction
ALTER TABLE agents ADD COLUMN IF NOT EXISTS date_prise_service_dans_la_direction DATE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN agents.date_prise_service_au_ministere IS 'Date de prise de service au ministère';
COMMENT ON COLUMN agents.date_prise_service_dans_la_direction IS 'Date de prise de service dans la direction';

-- Afficher un message de confirmation
SELECT 'Colonnes date_prise_service_au_ministere et date_prise_service_dans_la_direction ajoutées avec succès à la table agents' as status;
