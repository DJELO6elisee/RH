-- Migration: Ajouter les colonnes pour le fichier d'attestation d'adhésion à la table agents_sindicats
-- Date: 2025-01-XX
-- Description: Permet de joindre un fichier qui atteste qu'un agent appartient vraiment à un syndicat

-- Ajouter les colonnes pour le fichier d'attestation
ALTER TABLE agents_sindicats 
ADD COLUMN IF NOT EXISTS fichier_attestation_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS fichier_attestation_nom VARCHAR(255),
ADD COLUMN IF NOT EXISTS fichier_attestation_taille INTEGER,
ADD COLUMN IF NOT EXISTS fichier_attestation_type VARCHAR(100);

-- Ajouter les commentaires
COMMENT ON COLUMN agents_sindicats.fichier_attestation_url IS 'URL ou chemin du fichier d''attestation d''adhésion';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_nom IS 'Nom original du fichier d''attestation';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_taille IS 'Taille du fichier d''attestation en octets';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_type IS 'Type MIME du fichier d''attestation';

-- Message de confirmation
SELECT 'Colonnes pour fichier d''attestation ajoutées avec succès à la table agents_sindicats' as message;

