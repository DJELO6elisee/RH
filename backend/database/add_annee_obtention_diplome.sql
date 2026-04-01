-- Migration : ajouter la colonne annee_obtention_diplome à etude_diplome
-- La table utilise déjà date_diplome (INTEGER) pour l'année d'obtention.
-- Ce script ajoute annee_obtention_diplome (même signification) pour cohérence métier.

-- Ajouter la colonne si elle n'existe pas
ALTER TABLE etude_diplome 
ADD COLUMN IF NOT EXISTS annee_obtention_diplome INTEGER;

-- Renseigner à partir de date_diplome pour les lignes existantes
UPDATE etude_diplome 
SET annee_obtention_diplome = date_diplome 
WHERE annee_obtention_diplome IS NULL AND date_diplome IS NOT NULL;

COMMENT ON COLUMN etude_diplome.annee_obtention_diplome IS 'Année d''obtention du diplôme';

-- Optionnel : trigger pour garder les deux colonnes synchronisées à l'avenir
CREATE OR REPLACE FUNCTION sync_annee_obtention_diplome()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.date_diplome IS NOT NULL THEN
        NEW.annee_obtention_diplome := NEW.date_diplome;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_annee_obtention_diplome ON etude_diplome;
CREATE TRIGGER tr_sync_annee_obtention_diplome
    BEFORE INSERT OR UPDATE OF date_diplome ON etude_diplome
    FOR EACH ROW EXECUTE PROCEDURE sync_annee_obtention_diplome();
