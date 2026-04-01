-- Script pour ajouter les colonnes nécessaires pour gérer les congés dans la table demandes
-- Ces colonnes permettent de stocker le motif de congé, le nombre de jours et la raison exceptionnelle

-- Ajouter la colonne motif_conge (si elle n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'motif_conge'
    ) THEN
        ALTER TABLE demandes ADD COLUMN motif_conge VARCHAR(100);
        RAISE NOTICE 'Colonne motif_conge ajoutée';
    ELSE
        RAISE NOTICE 'Colonne motif_conge existe déjà';
    END IF;
END $$;

-- Ajouter la colonne nombre_jours (si elle n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'nombre_jours'
    ) THEN
        ALTER TABLE demandes ADD COLUMN nombre_jours INTEGER;
        RAISE NOTICE 'Colonne nombre_jours ajoutée';
    ELSE
        RAISE NOTICE 'Colonne nombre_jours existe déjà';
    END IF;
END $$;

-- Ajouter la colonne raison_exceptionnelle (si elle n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'raison_exceptionnelle'
    ) THEN
        ALTER TABLE demandes ADD COLUMN raison_exceptionnelle TEXT;
        RAISE NOTICE 'Colonne raison_exceptionnelle ajoutée';
    ELSE
        RAISE NOTICE 'Colonne raison_exceptionnelle existe déjà';
    END IF;
END $$;

-- Ajouter la colonne jours_restants_apres_deduction (pour stocker le solde après déduction)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'jours_restants_apres_deduction'
    ) THEN
        ALTER TABLE demandes ADD COLUMN jours_restants_apres_deduction INTEGER;
        RAISE NOTICE 'Colonne jours_restants_apres_deduction ajoutée';
    ELSE
        RAISE NOTICE 'Colonne jours_restants_apres_deduction existe déjà';
    END IF;
END $$;

-- Commentaires sur les nouvelles colonnes
COMMENT ON COLUMN demandes.motif_conge IS 'Motif du congé: congé annuel, congé de paternité, congé de maternité, congé partiel, congé exceptionnel';
COMMENT ON COLUMN demandes.nombre_jours IS 'Nombre de jours de congé demandés (jours ouvrés)';
COMMENT ON COLUMN demandes.raison_exceptionnelle IS 'Raison justifiant le congé exceptionnel (si motif = congé exceptionnel)';
COMMENT ON COLUMN demandes.jours_restants_apres_deduction IS 'Jours restants après déduction de ce congé (peut être négatif pour congés exceptionnels)';

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'demandes' 
  AND column_name IN ('motif_conge', 'nombre_jours', 'raison_exceptionnelle', 'jours_restants_apres_deduction')
ORDER BY column_name;

