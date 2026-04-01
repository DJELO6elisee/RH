-- Script pour ajouter les colonnes lieu_mariage et lieu_reception à la table agents
-- Ces colonnes sont utilisées pour stocker les informations complémentaires sur le mariage

-- Vérifier et ajouter la colonne lieu_mariage si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agents' 
        AND column_name = 'lieu_mariage'
    ) THEN
        ALTER TABLE public.agents 
        ADD COLUMN lieu_mariage character varying(255);
        
        COMMENT ON COLUMN public.agents.lieu_mariage IS 'Lieu de mariage (mairie) de l''agent';
        
        RAISE NOTICE 'Colonne lieu_mariage ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La colonne lieu_mariage existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter la colonne lieu_reception si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'agents' 
        AND column_name = 'lieu_reception'
    ) THEN
        ALTER TABLE public.agents 
        ADD COLUMN lieu_reception character varying(255);
        
        COMMENT ON COLUMN public.agents.lieu_reception IS 'Lieu de réception du mariage de l''agent';
        
        RAISE NOTICE 'Colonne lieu_reception ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La colonne lieu_reception existe déjà';
    END IF;
END $$;

