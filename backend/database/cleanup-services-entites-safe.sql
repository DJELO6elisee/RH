-- Script de nettoyage sécurisé de la table services_entites
-- =========================================================
-- Ce script nettoie les données avant de modifier la structure

-- 1. Vérifier la structure actuelle
SELECT 'Structure actuelle de services_entites:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'services_entites' 
ORDER BY ordinal_position;

-- 2. Vérifier les données problématiques
SELECT 'Données avec libelle NULL:' as info;
SELECT COUNT(*) as count_null_libelle FROM services_entites WHERE libelle IS NULL;

SELECT 'Données avec id_entite NULL:' as info;
SELECT COUNT(*) as count_null_entite FROM services_entites WHERE id_entite IS NULL;

-- 3. Nettoyer les données NULL
DO $$
BEGIN
    -- Mettre à jour les libelle NULL avec une valeur par défaut
    UPDATE services_entites 
    SET libelle = 'Service ' || id::text 
    WHERE libelle IS NULL;
    
    RAISE NOTICE 'Libellés NULL mis à jour';
    
    -- Supprimer les enregistrements avec id_entite NULL (ils ne sont pas utilisables)
    DELETE FROM services_entites WHERE id_entite IS NULL;
    
    RAISE NOTICE 'Enregistrements avec id_entite NULL supprimés';
END $$;

-- 4. Supprimer les colonnes obsolètes si elles existent
DO $$
BEGIN
    -- Supprimer la colonne nom si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'services_entites' AND column_name = 'nom') THEN
        ALTER TABLE services_entites DROP COLUMN nom;
        RAISE NOTICE 'Colonne nom supprimée';
    END IF;
    
    -- Supprimer la colonne nom_chef si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'services_entites' AND column_name = 'nom_chef') THEN
        ALTER TABLE services_entites DROP COLUMN nom_chef;
        RAISE NOTICE 'Colonne nom_chef supprimée';
    END IF;
END $$;

-- 5. S'assurer que libelle est NOT NULL
ALTER TABLE services_entites ALTER COLUMN libelle SET NOT NULL;

-- 6. S'assurer que id_entite est NOT NULL
ALTER TABLE services_entites ALTER COLUMN id_entite SET NOT NULL;

-- 7. Ajouter une contrainte d'unicité globale sur le code si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                   WHERE conname = 'uk_services_entites_code' 
                   AND conrelid = 'services_entites'::regclass) THEN
        ALTER TABLE services_entites 
        ADD CONSTRAINT uk_services_entites_code UNIQUE (code);
        RAISE NOTICE 'Contrainte d''unicité sur le code ajoutée';
    ELSE
        RAISE NOTICE 'Contrainte d''unicité sur le code existe déjà';
    END IF;
END $$;

-- 8. Créer un index sur le code pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_services_entites_code ON services_entites(code);

-- 9. Vérifier la structure finale
SELECT 'Structure finale de services_entites:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'services_entites' 
ORDER BY ordinal_position;

-- 10. Vérifier les contraintes
SELECT 'Contraintes de services_entites:' as info;
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'services_entites'
ORDER BY constraint_name;

-- 11. Afficher un résumé
SELECT 
    'Nettoyage terminé' as status,
    (SELECT COUNT(*) FROM services_entites) as total_services,
    (SELECT COUNT(DISTINCT code) FROM services_entites WHERE code IS NOT NULL) as codes_uniques,
    (SELECT COUNT(DISTINCT id_entite) FROM services_entites) as entites_utilisees;
