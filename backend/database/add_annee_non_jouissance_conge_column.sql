-- Script pour ajouter la colonne annee_non_jouissance_conge à la table demandes
-- Cette colonne permet de stocker l'année pour laquelle l'agent n'a pas joui de ses congés

-- Ajouter la colonne annee_non_jouissance_conge (si elle n'existe pas déjà)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'demandes' AND column_name = 'annee_non_jouissance_conge'
    ) THEN
        ALTER TABLE demandes ADD COLUMN annee_non_jouissance_conge INTEGER;
        RAISE NOTICE 'Colonne annee_non_jouissance_conge ajoutée';
    ELSE
        RAISE NOTICE 'Colonne annee_non_jouissance_conge existe déjà';
    END IF;
END $$;

-- Commentaire sur la nouvelle colonne
COMMENT ON COLUMN demandes.annee_non_jouissance_conge IS 'Année pour laquelle l''agent n''a pas joui de ses congés (pour les demandes de type certificat_non_jouissance_conge)';

-- Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'demandes' 
  AND column_name = 'annee_non_jouissance_conge';
