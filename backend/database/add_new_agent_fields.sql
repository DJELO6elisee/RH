-- Script pour ajouter les nouveaux champs à la table agents
-- Date de retraite, Fonction actuelle, Fonction antérieure, Situation militaire

-- Ajouter la colonne date_retraite
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS date_retraite DATE;

-- Ajouter la colonne fonction_actuelle
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS fonction_actuelle VARCHAR(200);

-- Ajouter la colonne fonction_anterieure
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS fonction_anterieure VARCHAR(200);

-- Ajouter la colonne situation_militaire
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS situation_militaire VARCHAR(50) 
CHECK (situation_militaire IN ('Exempté', 'Réformé', 'Bon pour le service', 'Dispensé', 'Non concerné') OR situation_militaire IS NULL);

-- Ajouter des commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN agents.date_retraite IS 'Date de retraite de l''agent';
COMMENT ON COLUMN agents.fonction_actuelle IS 'Fonction actuelle de l''agent';
COMMENT ON COLUMN agents.fonction_anterieure IS 'Fonction antérieure de l''agent';
COMMENT ON COLUMN agents.situation_militaire IS 'Situation militaire de l''agent';

-- Afficher un message de confirmation
SELECT 'Nouveaux champs ajoutés avec succès à la table agents' as message;
