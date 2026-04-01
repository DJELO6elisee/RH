-- ===============================================================================
-- Script de vérification et correction des colonnes de la table agents
-- ===============================================================================
-- Ce script vérifie que toutes les colonnes nécessaires existent dans agents
-- et les crée si nécessaire
-- ===============================================================================

-- Afficher les colonnes actuelles de la table agents
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔍 Vérification des colonnes de la table agents...';
    RAISE NOTICE '';
    
    -- Vérifier affectation_direction
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'affectation_direction'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne affectation_direction manquante - création...';
        ALTER TABLE agents ADD COLUMN affectation_direction VARCHAR(200);
    ELSE
        RAISE NOTICE '✅ Colonne affectation_direction existe';
    END IF;
    
    -- Vérifier affectation_service
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'affectation_service'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne affectation_service manquante - création...';
        ALTER TABLE agents ADD COLUMN affectation_service VARCHAR(200);
    ELSE
        RAISE NOTICE '✅ Colonne affectation_service existe';
    END IF;
    
    -- Vérifier fonction_actuelle
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'fonction_actuelle'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne fonction_actuelle manquante - création...';
        ALTER TABLE agents ADD COLUMN fonction_actuelle VARCHAR(200);
    ELSE
        RAISE NOTICE '✅ Colonne fonction_actuelle existe';
    END IF;
    
    -- Vérifier id_direction_generale
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_direction_generale'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne id_direction_generale manquante - création...';
        ALTER TABLE agents ADD COLUMN id_direction_generale INTEGER;
    ELSE
        RAISE NOTICE '✅ Colonne id_direction_generale existe';
    END IF;
    
    -- Vérifier id_direction
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_direction'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne id_direction manquante - création...';
        ALTER TABLE agents ADD COLUMN id_direction INTEGER;
    ELSE
        RAISE NOTICE '✅ Colonne id_direction existe';
    END IF;
    
    -- Vérifier id_sous_direction
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_sous_direction'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne id_sous_direction manquante - création...';
        ALTER TABLE agents ADD COLUMN id_sous_direction INTEGER;
    ELSE
        RAISE NOTICE '✅ Colonne id_sous_direction existe';
    END IF;
    
    -- Vérifier id_service
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_service'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        RAISE NOTICE '⚠️  Colonne id_service manquante - création...';
        ALTER TABLE agents ADD COLUMN id_service INTEGER;
    ELSE
        RAISE NOTICE '✅ Colonne id_service existe';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Vérification terminée !';
END $$;

-- ===============================================================================
-- Si les données viennent du CSV, mapper les colonnes correctement
-- ===============================================================================

-- Le CSV a les colonnes suivantes (d'après le fichier):
-- - "Direction" qui correspond à l'affectation à une direction
-- - " fonction" (avec espace) qui correspond à la fonction de l'agent
-- - "Fonction" (colonne 25) qui peut contenir des Directions Générales

-- Créer une fonction pour nettoyer et mapper les données du CSV
CREATE OR REPLACE FUNCTION public.map_csv_to_agents()
RETURNS void AS $$
BEGIN
    -- Si les données ont été importées avec des noms de colonnes différents
    -- adapter ici selon les vrais noms de colonnes dans votre table agents
    
    RAISE NOTICE 'Mapping des colonnes CSV vers la table agents...';
    
    -- Exemple: si le CSV a une colonne "Direction" (nom différent)
    -- UPDATE agents SET affectation_direction = direction_csv WHERE direction_csv IS NOT NULL;
    
    RAISE NOTICE 'Mapping terminé';
END;
$$ LANGUAGE plpgsql;

-- Liste de toutes les colonnes de la table agents
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'agents'
ORDER BY ordinal_position;




















