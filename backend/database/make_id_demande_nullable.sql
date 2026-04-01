-- Migration: Rendre id_demande nullable dans documents_autorisation
-- Permet de générer des documents sans demande associée (ex: certificats de cessation générés directement)

-- Vérifier si la colonne existe et est NOT NULL
DO $$
BEGIN
    -- Rendre id_demande nullable
    ALTER TABLE documents_autorisation 
    ALTER COLUMN id_demande DROP NOT NULL;
    
    RAISE NOTICE 'Colonne id_demande rendue nullable avec succès';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la modification: %', SQLERRM;
END $$;

-- Vérification
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'documents_autorisation' 
AND column_name = 'id_demande';

