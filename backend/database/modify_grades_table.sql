-- Script pour modifier la table grades afin de rendre tous les champs optionnels sauf libele
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- MODIFICATION DE LA TABLE GRADES
-- =====================================================

-- Supprimer la contrainte NOT NULL sur la colonne numero_ordre
ALTER TABLE grades ALTER COLUMN numero_ordre DROP NOT NULL;

-- Supprimer la contrainte UNIQUE sur (id_categorie, numero_ordre)
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_id_categorie_numero_ordre_key;

-- Supprimer la contrainte de clé étrangère sur id_categorie
ALTER TABLE grades DROP CONSTRAINT IF EXISTS grades_id_categorie_fkey;

-- Supprimer la colonne id_categorie (elle n'est plus nécessaire)
ALTER TABLE grades DROP COLUMN IF EXISTS id_categorie;

-- Supprimer la colonne numero_ordre (elle n'est plus nécessaire)
ALTER TABLE grades DROP COLUMN IF EXISTS numero_ordre;

-- Supprimer la colonne age_de_retraite (elle n'est plus nécessaire)
ALTER TABLE grades DROP COLUMN IF EXISTS age_de_retraite;

-- Ajouter un commentaire pour documenter le changement
COMMENT ON COLUMN grades.libele IS 'Libellé du grade (obligatoire)';
COMMENT ON TABLE grades IS 'Table des grades simplifiée - ne contient que le libellé';

-- Afficher un message de confirmation
SELECT 'Table grades modifiée avec succès - seul le champ libele est conservé' as status;
