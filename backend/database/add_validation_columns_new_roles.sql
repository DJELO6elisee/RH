-- Script pour ajouter les colonnes de validation pour les nouveaux rôles
-- Date: 12 Octobre 2025
-- Description: Ajout des colonnes pour sous-directeur, directeur et directeur de cabinet

-- ========================================
-- 1. COLONNES POUR LE SOUS-DIRECTEUR
-- ========================================

-- Statut de validation par le sous-directeur (approuve, rejete, en_attente)
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_sous_directeur VARCHAR(50) DEFAULT NULL;

-- Date de validation par le sous-directeur
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_sous_directeur TIMESTAMP DEFAULT NULL;

-- Commentaire du sous-directeur lors de la validation
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_sous_directeur TEXT DEFAULT NULL;

-- ID de l'agent sous-directeur qui a validé
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_sous_directeur INTEGER REFERENCES agents(id) ON DELETE SET NULL;

COMMENT ON COLUMN demandes.statut_sous_directeur IS 'Statut de la validation par le sous-directeur (approuve, rejete, en_attente)';
COMMENT ON COLUMN demandes.date_validation_sous_directeur IS 'Date et heure de validation par le sous-directeur';
COMMENT ON COLUMN demandes.commentaire_sous_directeur IS 'Commentaire du sous-directeur lors de la validation ou du rejet';
COMMENT ON COLUMN demandes.id_validateur_sous_directeur IS 'ID de l''agent sous-directeur qui a effectué la validation';

-- ========================================
-- 2. COLONNES POUR LE DIRECTEUR
-- ========================================

-- Statut de validation par le directeur (approuve, rejete, en_attente)
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_directeur VARCHAR(50) DEFAULT NULL;

-- Date de validation par le directeur
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_directeur TIMESTAMP DEFAULT NULL;

-- Commentaire du directeur lors de la validation
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_directeur TEXT DEFAULT NULL;

-- ID de l'agent directeur qui a validé
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_directeur INTEGER REFERENCES agents(id) ON DELETE SET NULL;

COMMENT ON COLUMN demandes.statut_directeur IS 'Statut de la validation par le directeur (approuve, rejete, en_attente)';
COMMENT ON COLUMN demandes.date_validation_directeur IS 'Date et heure de validation par le directeur';
COMMENT ON COLUMN demandes.commentaire_directeur IS 'Commentaire du directeur lors de la validation ou du rejet';
COMMENT ON COLUMN demandes.id_validateur_directeur IS 'ID de l''agent directeur qui a effectué la validation';

-- ========================================
-- 3. COLONNES POUR LE DIRECTEUR DE CABINET
-- ========================================

-- Statut de validation par le directeur de cabinet (approuve, rejete, en_attente)
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS statut_dir_cabinet VARCHAR(50) DEFAULT NULL;

-- Date de validation par le directeur de cabinet
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS date_validation_dir_cabinet TIMESTAMP DEFAULT NULL;

-- Commentaire du directeur de cabinet lors de la validation
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS commentaire_dir_cabinet TEXT DEFAULT NULL;

-- ID de l'agent directeur de cabinet qui a validé
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS id_validateur_dir_cabinet INTEGER REFERENCES agents(id) ON DELETE SET NULL;

COMMENT ON COLUMN demandes.statut_dir_cabinet IS 'Statut de la validation par le directeur de cabinet (approuve, rejete, en_attente)';
COMMENT ON COLUMN demandes.date_validation_dir_cabinet IS 'Date et heure de validation par le directeur de cabinet';
COMMENT ON COLUMN demandes.commentaire_dir_cabinet IS 'Commentaire du directeur de cabinet lors de la validation ou du rejet';
COMMENT ON COLUMN demandes.id_validateur_dir_cabinet IS 'ID de l''agent directeur de cabinet qui a effectué la validation';

-- ========================================
-- 4. INDEXES POUR OPTIMISER LES PERFORMANCES
-- ========================================

-- Index sur les statuts pour accélérer les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_demandes_statut_sous_directeur ON demandes(statut_sous_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_directeur ON demandes(statut_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_statut_dir_cabinet ON demandes(statut_dir_cabinet);

-- Index sur les dates de validation pour les rapports chronologiques
CREATE INDEX IF NOT EXISTS idx_demandes_date_validation_sous_directeur ON demandes(date_validation_sous_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_date_validation_directeur ON demandes(date_validation_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_date_validation_dir_cabinet ON demandes(date_validation_dir_cabinet);

-- Index sur les validateurs pour tracer les actions
CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_sous_directeur ON demandes(id_validateur_sous_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_directeur ON demandes(id_validateur_directeur);
CREATE INDEX IF NOT EXISTS idx_demandes_id_validateur_dir_cabinet ON demandes(id_validateur_dir_cabinet);

-- ========================================
-- 5. VÉRIFICATION DES COLONNES AJOUTÉES
-- ========================================

-- Afficher toutes les colonnes de la table demandes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'demandes'
AND column_name LIKE '%sous_directeur%' 
   OR column_name LIKE '%directeur%'
   OR column_name LIKE '%dir_cabinet%'
ORDER BY column_name;

-- Compter les colonnes ajoutées
SELECT COUNT(*) as total_colonnes_validation
FROM information_schema.columns
WHERE table_name = 'demandes'
AND (column_name LIKE '%sous_directeur%' 
   OR column_name LIKE '%_directeur%'
   OR column_name LIKE '%dir_cabinet%');

-- ========================================
-- MESSAGE DE CONFIRMATION
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '✅ Colonnes de validation ajoutées avec succès !';
    RAISE NOTICE '';
    RAISE NOTICE 'Colonnes ajoutées pour:';
    RAISE NOTICE '  - Sous-Directeur (4 colonnes)';
    RAISE NOTICE '  - Directeur (4 colonnes)';
    RAISE NOTICE '  - Directeur de Cabinet (4 colonnes)';
    RAISE NOTICE '';
    RAISE NOTICE 'Total: 12 nouvelles colonnes + 9 index pour optimisation';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Prochaine étape: Mettre à jour la logique de validation dans DemandesController.js';
END $$;

