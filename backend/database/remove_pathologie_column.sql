-- Script pour supprimer la colonne id_pathologie de la table agents
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- SUPPRESSION DE LA COLONNE ID_PATHOLOGIE
-- =====================================================

-- Supprimer la contrainte de clé étrangère si elle existe
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_id_pathologie_fkey;

-- Supprimer la colonne id_pathologie
ALTER TABLE agents DROP COLUMN IF EXISTS id_pathologie;

-- Afficher un message de confirmation
SELECT 'Colonne id_pathologie supprimée avec succès de la table agents' as status;
