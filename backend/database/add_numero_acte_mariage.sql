-- Script pour ajouter le champ 'numero_acte_mariage' à la table agents
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- AJOUT DU CHAMP NUMERO DE L'ACTE DE MARIAGE
-- =====================================================

-- Ajouter la colonne numero_acte_mariage
ALTER TABLE agents ADD COLUMN IF NOT EXISTS numero_acte_mariage VARCHAR(255);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN agents.numero_acte_mariage IS 'Numéro de l''acte de mariage de l''agent';

-- Afficher un message de confirmation
SELECT 'Colonne numero_acte_mariage ajoutée avec succès à la table agents.' AS Message;
