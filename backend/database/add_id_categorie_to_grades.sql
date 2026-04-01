-- Script pour ajouter la colonne id_categorie à la table grades
-- Cette colonne permet d'associer chaque grade à une catégorie
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- AJOUT DE LA COLONNE id_categorie À LA TABLE grades
-- =====================================================

-- Ajouter la colonne id_categorie à la table grades
ALTER TABLE grades 
ADD COLUMN IF NOT EXISTS id_categorie INTEGER;

-- Ajouter la contrainte de clé étrangère vers la table categories
-- ON DELETE SET NULL : si une catégorie est supprimée, la valeur devient NULL
ALTER TABLE grades 
ADD CONSTRAINT fk_grades_id_categorie 
    FOREIGN KEY (id_categorie) 
    REFERENCES categories(id) 
    ON DELETE SET NULL;

-- Ajouter un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_grades_id_categorie ON grades(id_categorie);

-- Ajouter des commentaires pour documenter la colonne
COMMENT ON COLUMN grades.id_categorie IS 'Référence vers la catégorie associée au grade';

-- Afficher un message de confirmation
SELECT 'Colonne id_categorie ajoutée avec succès à la table grades' as status;

-- =====================================================
-- OPTIONNEL : Mettre à jour les grades existants
-- =====================================================
-- Si vous souhaitez associer des catégories aux grades existants,
-- vous pouvez exécuter des requêtes UPDATE manuellement, par exemple :
--
-- UPDATE grades SET id_categorie = 1 WHERE libele LIKE '%A%';
-- UPDATE grades SET id_categorie = 2 WHERE libele LIKE '%B%';
-- etc.

