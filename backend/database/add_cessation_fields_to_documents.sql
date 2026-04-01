-- Migration: Ajouter les colonnes motif_cessation et date_cessation à documents_autorisation
-- Permet de stocker ces informations pour les documents générés sans demande

-- Ajouter la colonne motif_cessation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents_autorisation' 
        AND column_name = 'motif_cessation'
    ) THEN
        ALTER TABLE documents_autorisation ADD COLUMN motif_cessation TEXT DEFAULT NULL;
        RAISE NOTICE '✅ Colonne "motif_cessation" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne "motif_cessation" existe déjà';
    END IF;
END $$;

-- Ajouter la colonne date_cessation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents_autorisation' 
        AND column_name = 'date_cessation'
    ) THEN
        ALTER TABLE documents_autorisation ADD COLUMN date_cessation DATE DEFAULT NULL;
        RAISE NOTICE '✅ Colonne "date_cessation" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne "date_cessation" existe déjà';
    END IF;
END $$;

-- Ajouter les commentaires
COMMENT ON COLUMN documents_autorisation.motif_cessation IS 'Motif de cessation de service (pour les certificats de cessation générés sans demande)';
COMMENT ON COLUMN documents_autorisation.date_cessation IS 'Date de cessation de service (pour les certificats de cessation générés sans demande)';

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents_autorisation' 
AND column_name IN ('motif_cessation', 'date_cessation')
ORDER BY column_name;

