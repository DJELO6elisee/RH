-- Script SQL pour ajouter la colonne "options" à la table etude_diplome
-- Date de création: 2025
-- Description: Ajoute un champ "options" pour stocker des informations supplémentaires sur les diplômes

-- Ajouter la colonne "options" à la table etude_diplome
ALTER TABLE etude_diplome 
ADD COLUMN IF NOT EXISTS options VARCHAR(255) NULL;

-- Commentaire sur la colonne
COMMENT ON COLUMN etude_diplome.options IS 'Options ou informations supplémentaires sur le diplôme';

