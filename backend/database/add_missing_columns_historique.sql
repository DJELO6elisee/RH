-- Script SQL pour ajouter toutes les colonnes manquantes à la table historique_retrait_restauration
-- Date: 2024
-- Description: Ajoute toutes les colonnes nécessaires pour stocker les motifs et autres informations

-- ============================================
-- ÉTAPE 1: Vérifier la structure actuelle
-- ============================================
-- Voir les colonnes actuelles de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
ORDER BY ordinal_position;

-- ============================================
-- ÉTAPE 2: Ajouter la colonne motif (PRIORITÉ)
-- ============================================
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS motif TEXT;

-- ============================================
-- ÉTAPE 3: Ajouter les autres colonnes si elles n'existent pas
-- ============================================

-- Ajouter id_agent si manquant
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS id_agent INTEGER;

-- Ajouter la contrainte FOREIGN KEY pour id_agent si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'historique_retrait_restauration_id_agent_fkey'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD CONSTRAINT historique_retrait_restauration_id_agent_fkey 
        FOREIGN KEY (id_agent) REFERENCES agents(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ajouter type_action si manquant
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS type_action VARCHAR(20);

-- Ajouter la contrainte CHECK pour type_action si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_type_action' 
        OR conname LIKE '%type_action%check%'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD CONSTRAINT check_type_action 
        CHECK (type_action IN ('retrait', 'restauration'));
    END IF;
END $$;

-- Ajouter date_action si manquant
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ajouter created_at si manquant
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ajouter updated_at si manquant
ALTER TABLE historique_retrait_restauration 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- ÉTAPE 4: Rendre les colonnes NOT NULL si nécessaire
-- ============================================
-- Note: On ne peut rendre NOT NULL que si la table est vide ou si les colonnes ont des valeurs

-- Vérifier si la table est vide
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM historique_retrait_restauration;
    
    IF row_count = 0 THEN
        -- Si la table est vide, on peut rendre les colonnes NOT NULL
        ALTER TABLE historique_retrait_restauration 
        ALTER COLUMN id_agent SET NOT NULL;
        
        ALTER TABLE historique_retrait_restauration 
        ALTER COLUMN type_action SET NOT NULL;
        
        ALTER TABLE historique_retrait_restauration 
        ALTER COLUMN date_action SET NOT NULL;
        
        ALTER TABLE historique_retrait_restauration 
        ALTER COLUMN created_at SET NOT NULL;
        
        ALTER TABLE historique_retrait_restauration 
        ALTER COLUMN updated_at SET NOT NULL;
        
        RAISE NOTICE 'Colonnes rendues NOT NULL (table vide)';
    ELSE
        RAISE NOTICE 'Table contient des données - colonnes laissées comme NULLABLE';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 5: Créer les index si manquants
-- ============================================
CREATE INDEX IF NOT EXISTS idx_historique_agent 
ON historique_retrait_restauration(id_agent);

CREATE INDEX IF NOT EXISTS idx_historique_date 
ON historique_retrait_restauration(date_action);

CREATE INDEX IF NOT EXISTS idx_historique_type 
ON historique_retrait_restauration(type_action);

-- ============================================
-- ÉTAPE 6: Vérification finale
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('id', 'id_agent', 'type_action', 'motif', 'date_action', 'created_at', 'updated_at') 
        THEN '✅ REQUIS'
        ELSE '⚠️ OPTIONNEL'
    END as statut
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
ORDER BY ordinal_position;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Script terminé avec succès!';
    RAISE NOTICE 'Toutes les colonnes nécessaires ont été ajoutées.';
    RAISE NOTICE 'La colonne motif est maintenant disponible.';
    RAISE NOTICE '========================================';
END $$;

