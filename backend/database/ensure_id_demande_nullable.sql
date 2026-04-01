-- Migration: S'assurer que id_demande est nullable dans documents_autorisation
-- Permet de générer des documents sans demande associée (ex: certificats de prise de service, certificats de cessation générés directement)

-- Vérifier et rendre id_demande nullable si nécessaire
DO $$
BEGIN
    -- Vérifier si la colonne est NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'documents_autorisation' 
        AND column_name = 'id_demande'
        AND is_nullable = 'NO'
    ) THEN
        -- Rendre id_demande nullable
        ALTER TABLE documents_autorisation 
        ALTER COLUMN id_demande DROP NOT NULL;
        
        RAISE NOTICE 'Colonne id_demande rendue nullable avec succès';
    ELSE
        RAISE NOTICE 'Colonne id_demande est déjà nullable';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la modification: %', SQLERRM;
END $$;

-- Vérification finale
SELECT 
    column_name, 
    is_nullable, 
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'documents_autorisation' 
AND column_name = 'id_demande';
