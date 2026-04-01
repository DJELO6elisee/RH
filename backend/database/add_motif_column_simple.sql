-- Script SQL SIMPLIFIÉ pour ajouter la colonne motif à la table historique_retrait_restauration
-- Exécutez cette requête dans votre base de données PostgreSQL

-- Ajouter la colonne motif
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS motif TEXT;

-- Vérifier que la colonne a été ajoutée
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
  AND column_name = 'motif';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Colonne motif ajoutée avec succès à la table historique_retrait_restauration';
END $$;

