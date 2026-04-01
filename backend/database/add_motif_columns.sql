-- Script SQL pour ajouter les colonnes 'motif_retrait' et 'motif_restauration' à la table agents
-- Date de création: 2024
-- Description: Ajoute les colonnes nécessaires pour gérer les motifs de retrait et de restauration des agents

-- Vérifier et ajouter la colonne 'motif_retrait' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'motif_retrait'
    ) THEN
        ALTER TABLE agents ADD COLUMN motif_retrait TEXT;
        RAISE NOTICE 'Colonne "motif_retrait" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne "motif_retrait" existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter la colonne 'motif_restauration' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'motif_restauration'
    ) THEN
        ALTER TABLE agents ADD COLUMN motif_restauration TEXT;
        RAISE NOTICE 'Colonne "motif_restauration" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne "motif_restauration" existe déjà';
    END IF;
END $$;

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Script exécuté avec succès. Les colonnes motif_retrait et motif_restauration sont maintenant disponibles dans la table agents.';
END $$;

