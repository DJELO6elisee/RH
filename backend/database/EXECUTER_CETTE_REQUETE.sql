-- ============================================
-- REQUÊTE À EXÉCUTER DANS VOTRE BASE DE DONNÉES
-- ============================================
-- Copiez et collez cette requête dans votre interface de base de données

ALTER TABLE historique_retrait_restauration 
ADD COLUMN motif TEXT;

-- ============================================
-- VÉRIFICATION (optionnel - pour confirmer)
-- ============================================
-- Exécutez cette requête après pour vérifier que la colonne existe :

SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
  AND column_name = 'motif';

