-- Script pour ajouter les colonnes nécessaires pour les certificats de cessation de service
-- Date: 13 Janvier 2025
-- Description: Ajout des colonnes motif et date_cessation pour le type de demande certificat_cessation

-- ========================================
-- 1. COLONNES POUR LE CERTIFICAT DE CESSATION
-- ========================================

-- Motif de cessation de service (démission, retraite, licenciement, etc.)
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS motif TEXT DEFAULT NULL;

-- Date de cessation de service
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_cessation DATE DEFAULT NULL;

-- Commentaires sur les colonnes
COMMENT ON COLUMN demandes.motif IS 'Motif de cessation de service pour les certificats de cessation (démission, retraite, licenciement, etc.)';
COMMENT ON COLUMN demandes.date_cessation IS 'Date de cessation de service pour les certificats de cessation';

-- ========================================
-- 2. INDEXES POUR OPTIMISER LES PERFORMANCES
-- ========================================

-- Index sur le motif pour faciliter les recherches
CREATE INDEX IF NOT EXISTS idx_demandes_motif ON demandes(motif);

-- Index sur la date de cessation pour les rapports chronologiques
CREATE INDEX IF NOT EXISTS idx_demandes_date_cessation ON demandes(date_cessation);

-- Index composite pour les certificats de cessation
CREATE INDEX IF NOT EXISTS idx_demandes_certificat_cessation ON demandes(type_demande, date_cessation) 
WHERE type_demande = 'certificat_cessation';

-- ========================================
-- 3. VÉRIFICATION DES COLONNES AJOUTÉES
-- ========================================

-- Afficher les nouvelles colonnes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'demandes'
AND column_name IN ('motif', 'date_cessation')
ORDER BY column_name;

-- Compter les colonnes ajoutées
SELECT COUNT(*) as total_colonnes_certificat
FROM information_schema.columns
WHERE table_name = 'demandes'
AND column_name IN ('motif', 'date_cessation');

-- ========================================
-- 4. MISE À JOUR DES CONTRAINTES
-- ========================================

-- Ajouter une contrainte pour s'assurer que les champs motif et date_cessation sont requis pour les certificats de cessation
-- (Cette contrainte sera vérifiée au niveau applicatif pour plus de flexibilité)

-- ========================================
-- MESSAGE DE CONFIRMATION
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Colonnes pour certificat de cessation ajoutées avec succès !';
    RAISE NOTICE '';
    RAISE NOTICE 'Colonnes ajoutées:';
    RAISE NOTICE '  - motif (TEXT) : Motif de cessation de service';
    RAISE NOTICE '  - date_cessation (DATE) : Date de cessation de service';
    RAISE NOTICE '';
    RAISE NOTICE 'Index créés:';
    RAISE NOTICE '  - idx_demandes_motif';
    RAISE NOTICE '  - idx_demandes_date_cessation';
    RAISE NOTICE '  - idx_demandes_certificat_cessation (composite)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Prochaine étape: Tester la création de certificats de cessation';
END $$;
