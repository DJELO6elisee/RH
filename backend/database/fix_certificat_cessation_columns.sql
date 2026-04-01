-- Script pour corriger les colonnes des certificats de cessation
-- Date: 13 Janvier 2025
-- Description: Ajout des champs corrects pour la demande de Certificat de Cessation de Service

-- Vérifier et ajouter la colonne 'agree_motif' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' 
        AND column_name = 'agree_motif'
    ) THEN
        ALTER TABLE demandes ADD COLUMN agree_motif TEXT DEFAULT NULL;
        RAISE NOTICE '✅ Colonne "agree_motif" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne "agree_motif" existe déjà';
    END IF;
END $$;

-- Vérifier et ajouter la colonne 'agree_date_cessation' si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' 
        AND column_name = 'agree_date_cessation'
    ) THEN
        ALTER TABLE demandes ADD COLUMN agree_date_cessation DATE DEFAULT NULL;
        RAISE NOTICE '✅ Colonne "agree_date_cessation" ajoutée avec succès';
    ELSE
        RAISE NOTICE 'ℹ️  Colonne "agree_date_cessation" existe déjà';
    END IF;
END $$;

-- Ajouter les commentaires pour documenter les colonnes
COMMENT ON COLUMN demandes.agree_motif IS 'Motif de la demande de cessation de service pour les certificats de cessation';
COMMENT ON COLUMN demandes.agree_date_cessation IS 'Date de cessation de service pour le certificat de cessation';

-- Créer des index pour optimiser les requêtes si nécessaire
CREATE INDEX IF NOT EXISTS idx_demandes_agree_motif ON demandes(agree_motif) WHERE agree_motif IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandes_agree_date_cessation ON demandes(agree_date_cessation) WHERE agree_date_cessation IS NOT NULL;

-- Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'demandes' 
AND column_name IN ('agree_motif', 'agree_date_cessation')
ORDER BY column_name;

-- Message de confirmation final
DO $$
BEGIN
    RAISE NOTICE '🎉 Script de correction des colonnes de certificat de cessation terminé avec succès !';
    RAISE NOTICE '📋 Les colonnes agree_motif et agree_date_cessation sont maintenant disponibles';
    RAISE NOTICE '🔧 Redémarrez le serveur backend pour prendre en compte les modifications';
END $$;
