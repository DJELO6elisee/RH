-- Script pour modifier la table echelons afin de rendre indice et salaire_net optionnels
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- MODIFICATION DE LA TABLE ECHELONS
-- =====================================================

-- Supprimer la contrainte NOT NULL sur la colonne indice
ALTER TABLE echelons ALTER COLUMN indice DROP NOT NULL;

-- Supprimer la contrainte UNIQUE sur la colonne indice
ALTER TABLE echelons DROP CONSTRAINT IF EXISTS echelons_indice_key;

-- Ajouter un commentaire pour documenter le changement
COMMENT ON COLUMN echelons.indice IS 'Indice de l''échelon (optionnel)';
COMMENT ON COLUMN echelons.salaire_net IS 'Salaire net de l''échelon (optionnel)';
COMMENT ON COLUMN echelons.libele IS 'Libellé de l''échelon (obligatoire)';

-- Afficher un message de confirmation
SELECT 'Table echelons modifiée avec succès - indice et salaire_net sont maintenant optionnels' as status;
