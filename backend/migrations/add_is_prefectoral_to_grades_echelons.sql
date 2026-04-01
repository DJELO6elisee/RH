-- Migration : Ajout de la colonne is_prefectoral aux tables grades et echelons
-- Date : 2025-01-XX
-- Description : Ajoute la colonne is_prefectoral (boolean) pour identifier les grades et échelons préfectoraux

-- Ajouter la colonne is_prefectoral à la table grades
ALTER TABLE grades 
ADD COLUMN IF NOT EXISTS is_prefectoral BOOLEAN DEFAULT FALSE;

-- Ajouter la colonne is_prefectoral à la table echelons
ALTER TABLE echelons 
ADD COLUMN IF NOT EXISTS is_prefectoral BOOLEAN DEFAULT FALSE;

-- Mettre à jour les grades préfectoraux existants (si vous avez déjà des données)
-- Vous pouvez ajuster ces conditions selon vos données existantes
-- UPDATE grades SET is_prefectoral = TRUE 
-- WHERE libele ILIKE '%HG%' OR libele ILIKE '%Hors grade%' 
--    OR libele ILIKE '%GI%' OR libele ILIKE '%Grade I%'
--    OR libele ILIKE '%GII%' OR libele ILIKE '%Grade II%'
--    OR libele ILIKE '%GIII%' OR libele ILIKE '%Grade III%';

-- Mettre à jour les échelons préfectoraux existants (si vous avez déjà des données)
-- UPDATE echelons SET is_prefectoral = TRUE 
-- WHERE libele ILIKE '%Échelon%' OR libele ILIKE '%Echelon%';

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN grades.is_prefectoral IS 'Indique si le grade est un grade préfectoral (HG, GI, GII, GIII)';
COMMENT ON COLUMN echelons.is_prefectoral IS 'Indique si l''échelon est un échelon préfectoral';

-- Insérer les grades préfectoraux s'ils n'existent pas déjà (utiliser uniquement les abréviations)
INSERT INTO grades (libele, is_prefectoral, created_at, updated_at)
SELECT 'HG', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE libele = 'HG' OR libele ILIKE '%Hors grade%');

INSERT INTO grades (libele, is_prefectoral, created_at, updated_at)
SELECT 'GI', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE libele = 'GI' OR (libele ILIKE '%Grade I%' AND libele NOT ILIKE '%Grade II%' AND libele NOT ILIKE '%Grade III%'));

INSERT INTO grades (libele, is_prefectoral, created_at, updated_at)
SELECT 'GII', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE libele = 'GII' OR (libele ILIKE '%Grade II%' AND libele NOT ILIKE '%Grade III%'));

INSERT INTO grades (libele, is_prefectoral, created_at, updated_at)
SELECT 'GIII', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM grades WHERE libele = 'GIII' OR libele ILIKE '%Grade III%');

-- Mettre à jour les grades préfectoraux existants pour marquer is_prefectoral = TRUE
-- Si le libellé contient les abréviations ou les libellés complets, on les marque comme préfectoraux
UPDATE grades SET is_prefectoral = TRUE 
WHERE (libele = 'HG' OR libele ILIKE '%Hors grade%' 
   OR libele = 'GI' OR (libele ILIKE '%Grade I%' AND libele NOT ILIKE '%Grade II%' AND libele NOT ILIKE '%Grade III%')
   OR libele = 'GII' OR (libele ILIKE '%Grade II%' AND libele NOT ILIKE '%Grade III%')
   OR libele = 'GIII' OR libele ILIKE '%Grade III%')
   AND (is_prefectoral IS NULL OR is_prefectoral = FALSE);

-- Optionnel : Mettre à jour les libellés des grades préfectoraux existants pour utiliser uniquement les abréviations
UPDATE grades SET libele = 'HG' 
WHERE (libele ILIKE '%Hors grade%' OR libele ILIKE '%HG%') 
   AND libele != 'HG' AND is_prefectoral = TRUE;

UPDATE grades SET libele = 'GI' 
WHERE (libele ILIKE '%Grade I%' AND libele NOT ILIKE '%Grade II%' AND libele NOT ILIKE '%Grade III%')
   AND libele != 'GI' AND is_prefectoral = TRUE;

UPDATE grades SET libele = 'GII' 
WHERE (libele ILIKE '%Grade II%' AND libele NOT ILIKE '%Grade III%')
   AND libele != 'GII' AND is_prefectoral = TRUE;

UPDATE grades SET libele = 'GIII' 
WHERE libele ILIKE '%Grade III%' AND libele != 'GIII' AND is_prefectoral = TRUE;

-- Mettre à jour les échelons préfectoraux existants (Échelon 1, 2, 3) pour marquer is_prefectoral = TRUE
-- Seuls les échelons 1, 2, 3 sont considérés comme préfectoraux
UPDATE echelons SET is_prefectoral = TRUE 
WHERE (libele = 'ÉCHELON 1' OR libele = 'Échelon 1' 
    OR libele = 'ÉCHELON 2' OR libele = 'Échelon 2'
    OR libele = 'ÉCHELON 3' OR libele = 'Échelon 3')
   AND (is_prefectoral IS NULL OR is_prefectoral = FALSE);
