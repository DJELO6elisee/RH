-- Script pour ajouter les colonnes nécessaires pour les certificats de reprise de service
-- Date: 13 Janvier 2025
-- Description: Ajout des colonnes date_reprise_service et date_fin_conges pour le type de demande certificat_reprise_service

-- ========================================
-- 1. COLONNES POUR LE CERTIFICAT DE REPRISE DE SERVICE
-- ========================================

-- Date de reprise de service
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_reprise_service DATE DEFAULT NULL;

-- Date de fin de congés
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_fin_conges DATE DEFAULT NULL;

-- Commentaires sur les colonnes
COMMENT ON COLUMN demandes.date_reprise_service IS 'Date de reprise de service pour les certificats de reprise de service';
COMMENT ON COLUMN demandes.date_fin_conges IS 'Date de fin de congés pour les certificats de reprise de service';

-- ========================================
-- 2. INDEXES POUR OPTIMISER LES PERFORMANCES
-- ========================================

-- Index sur la date de reprise de service pour les rapports chronologiques
CREATE INDEX IF NOT EXISTS idx_demandes_date_reprise_service ON demandes(date_reprise_service);

-- Index sur la date de fin de congés pour les rapports chronologiques
CREATE INDEX IF NOT EXISTS idx_demandes_date_fin_conges ON demandes(date_fin_conges);

-- Index composite pour les certificats de reprise de service
CREATE INDEX IF NOT EXISTS idx_demandes_certificat_reprise_service ON demandes(type_demande, date_reprise_service) 
WHERE type_demande = 'certificat_reprise_service';

-- ========================================
-- 3. VÉRIFICATION DES COLONNES AJOUTÉES
-- ========================================

-- Afficher les nouvelles colonnes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'demandes'
AND column_name IN ('date_reprise_service', 'date_fin_conges')
ORDER BY column_name;

-- Compter les colonnes ajoutées
SELECT COUNT(*) as total_colonnes_reprise_service
FROM information_schema.columns
WHERE table_name = 'demandes'
AND column_name IN ('date_reprise_service', 'date_fin_conges');

-- ========================================
-- MESSAGE DE CONFIRMATION
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Colonnes pour certificat de reprise de service ajoutées avec succès !';
    RAISE NOTICE '';
    RAISE NOTICE 'Colonnes ajoutées:';
    RAISE NOTICE '  - date_reprise_service (DATE) : Date de reprise de service';
    RAISE NOTICE '  - date_fin_conges (DATE) : Date de fin de congés';
    RAISE NOTICE '';
    RAISE NOTICE 'Index créés:';
    RAISE NOTICE '  - idx_demandes_date_reprise_service';
    RAISE NOTICE '  - idx_demandes_date_fin_conges';
    RAISE NOTICE '  - idx_demandes_certificat_reprise_service (composite)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Prochaine étape: Tester la création de certificats de reprise de service';
END $$;

