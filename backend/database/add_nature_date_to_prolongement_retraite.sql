-- Script SQL pour ajouter les champs "nature_acte" et "date_acte" à la table prolongements_retraite
-- Date de création: 2024
-- Compatible PostgreSQL

-- Ajouter la colonne "nature_acte" (VARCHAR pour stocker DÉCRET, ARRÊTÉ ou autres valeurs en majuscules)
ALTER TABLE prolongements_retraite
ADD COLUMN nature_acte VARCHAR(100) NULL;

-- Ajouter le commentaire pour la colonne nature_acte
COMMENT ON COLUMN prolongements_retraite.nature_acte IS 'Nature de l''acte (DÉCRET, ARRÊTÉ, AUTRES, etc.) - toujours en majuscules';

-- Ajouter la colonne "date_acte" (DATE pour stocker la date de l'acte)
ALTER TABLE prolongements_retraite
ADD COLUMN date_acte DATE NULL;

-- Ajouter le commentaire pour la colonne date_acte
COMMENT ON COLUMN prolongements_retraite.date_acte IS 'Date de l''acte de prolongement';

-- Optionnel: Ajouter des index pour améliorer les performances des requêtes
-- CREATE INDEX IF NOT EXISTS idx_prolongements_retraite_nature_acte ON prolongements_retraite(nature_acte);
-- CREATE INDEX IF NOT EXISTS idx_prolongements_retraite_date_acte ON prolongements_retraite(date_acte);

-- Optionnel: Mettre à jour les valeurs existantes si nécessaire (décommenter si besoin)
-- UPDATE prolongements_retraite 
-- SET nature_acte = 'DÉCRET', date_acte = CURRENT_DATE 
-- WHERE nature_acte IS NULL AND date_acte IS NULL;

-- Vérification: Afficher la structure de la table pour confirmer les modifications
-- DESCRIBE prolongement_retraite;

