-- Script SQL pour ajouter les colonnes 'retire' et 'date_retrait' à la table agents
-- Date de création: 2024
-- Description: Ajoute les colonnes nécessaires pour gérer le retrait des agents

-- Vérifier et ajouter la colonne 'retire' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'retire'
    ) THEN
        ALTER TABLE agents ADD COLUMN retire BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Colonne "retire" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne "retire" existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter la colonne 'date_retrait' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agents' 
        AND column_name = 'date_retrait'
    ) THEN
        ALTER TABLE agents ADD COLUMN date_retrait TIMESTAMP;
        RAISE NOTICE 'Colonne "date_retrait" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne "date_retrait" existe déjà';
    END IF;
END $$;

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Script exécuté avec succès. Les colonnes retire et date_retrait sont maintenant disponibles dans la table agents.';
END $$;

