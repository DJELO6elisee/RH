-- Script pour vérifier et corriger la structure de la table historique_retrait_restauration
-- Date: 2024
-- Description: Vérifie que toutes les colonnes nécessaires existent et les ajoute si nécessaire

-- ============================================
-- ÉTAPE 1: Vérifier la structure actuelle
-- ============================================
-- Exécutez cette requête pour voir les colonnes actuelles :
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
-- ÉTAPE 2: Colonnes requises
-- ============================================
-- La table DOIT avoir ces colonnes :
-- 1. id (SERIAL PRIMARY KEY)
-- 2. id_agent (INTEGER NOT NULL)
-- 3. type_action (VARCHAR(20) NOT NULL)
-- 4. motif (TEXT)
-- 5. date_action (TIMESTAMP NOT NULL)
-- 6. created_at (TIMESTAMP NOT NULL)
-- 7. updated_at (TIMESTAMP NOT NULL)

-- ============================================
-- ÉTAPE 3: Ajouter les colonnes manquantes
-- ============================================

-- Vérifier et ajouter id_agent si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'historique_retrait_restauration' 
          AND column_name = 'id_agent'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD COLUMN id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE;
        RAISE NOTICE 'Colonne id_agent ajoutée';
    ELSE
        RAISE NOTICE 'Colonne id_agent existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter type_action si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'historique_retrait_restauration' 
          AND column_name = 'type_action'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD COLUMN type_action VARCHAR(20) NOT NULL;
        -- Ajouter la contrainte CHECK
        ALTER TABLE historique_retrait_restauration 
        ADD CONSTRAINT check_type_action 
        CHECK (type_action IN ('retrait', 'restauration'));
        RAISE NOTICE 'Colonne type_action ajoutée avec contrainte';
    ELSE
        RAISE NOTICE 'Colonne type_action existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter motif si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'historique_retrait_restauration' 
          AND column_name = 'motif'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD COLUMN motif TEXT;
        RAISE NOTICE 'Colonne motif ajoutée';
    ELSE
        RAISE NOTICE 'Colonne motif existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter date_action si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'historique_retrait_restauration' 
          AND column_name = 'date_action'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD COLUMN date_action TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Colonne date_action ajoutée';
    ELSE
        RAISE NOTICE 'Colonne date_action existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter created_at si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'historique_retrait_restauration' 
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Colonne created_at ajoutée';
    ELSE
        RAISE NOTICE 'Colonne created_at existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter updated_at si manquant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'historique_retrait_restauration' 
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE historique_retrait_restauration 
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Colonne updated_at ajoutée';
    ELSE
        RAISE NOTICE 'Colonne updated_at existe déjà';
    END IF;
END $$;

-- ============================================
-- ÉTAPE 4: Créer les index si manquants
-- ============================================

CREATE INDEX IF NOT EXISTS idx_historique_agent 
ON historique_retrait_restauration(id_agent);

CREATE INDEX IF NOT EXISTS idx_historique_date 
ON historique_retrait_restauration(date_action);

CREATE INDEX IF NOT EXISTS idx_historique_type 
ON historique_retrait_restauration(type_action);

-- ============================================
-- ÉTAPE 5: Vérification finale
-- ============================================
-- Exécutez cette requête pour confirmer que toutes les colonnes sont présentes :
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
    RAISE NOTICE 'Vérification terminée!';
    RAISE NOTICE 'Vérifiez les résultats ci-dessus.';
    RAISE NOTICE 'Toutes les colonnes requises doivent être marquées comme ✅ REQUIS';
    RAISE NOTICE '========================================';
END $$;

