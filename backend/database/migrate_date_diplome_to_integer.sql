-- Script SQL pour migrer date_diplome de DATE à INTEGER
-- Date de création: 2025
-- Description: Convertit le champ date_diplome pour stocker uniquement l'année (INTEGER) au lieu d'une date complète

-- Étape 1: Créer une colonne temporaire pour stocker l'année
ALTER TABLE etude_diplome 
ADD COLUMN IF NOT EXISTS date_diplome_temp INTEGER;

-- Étape 2: Extraire l'année des dates existantes et la stocker dans la colonne temporaire
UPDATE etude_diplome 
SET date_diplome_temp = EXTRACT(YEAR FROM date_diplome)::INTEGER
WHERE date_diplome IS NOT NULL;

-- Étape 3: Supprimer l'index sur date_diplome s'il existe
DROP INDEX IF EXISTS idx_etude_diplome_date;

-- Étape 4: Supprimer la contrainte NOT NULL temporairement (si elle existe)
ALTER TABLE etude_diplome 
ALTER COLUMN date_diplome DROP NOT NULL;

-- Étape 5: Supprimer l'ancienne colonne date_diplome
ALTER TABLE etude_diplome 
DROP COLUMN IF EXISTS date_diplome;

-- Étape 6: Renommer la colonne temporaire en date_diplome
ALTER TABLE etude_diplome 
RENAME COLUMN date_diplome_temp TO date_diplome;

-- Étape 7: Ajouter la contrainte NOT NULL
ALTER TABLE etude_diplome 
ALTER COLUMN date_diplome SET NOT NULL;

-- Étape 8: Recréer l'index sur date_diplome
CREATE INDEX IF NOT EXISTS idx_etude_diplome_date ON etude_diplome(date_diplome);

-- Étape 9: Mettre à jour le commentaire
COMMENT ON COLUMN etude_diplome.date_diplome IS 'Année d''obtention du diplôme';
