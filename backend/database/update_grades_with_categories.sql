-- Script pour mettre à jour les grades existants avec leurs catégories
-- Ce script associe les grades aux catégories appropriées selon leur libellé
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- ÉTAPE 1: Vérifier les catégories disponibles
-- =====================================================
-- Exécutez d'abord cette requête pour voir les catégories disponibles:
SELECT id, libele FROM categories ORDER BY id;

-- =====================================================
-- ÉTAPE 1.5: Créer la catégorie 'Préfectorale' si elle n'existe pas
-- =====================================================

-- Créer la catégorie 'Préfectorale' si elle n'existe pas déjà
INSERT INTO categories (libele)
SELECT 'Préfectorale'
WHERE NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE LOWER(libele) = 'préfectorale' 
       OR LOWER(libele) = 'prefectorale'
);

-- Afficher un message de confirmation
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM categories WHERE LOWER(libele) = 'préfectorale' OR LOWER(libele) = 'prefectorale') 
        THEN 'Catégorie Préfectorale créée ou déjà existante'
        ELSE 'Erreur: Catégorie Préfectorale non créée'
    END as status_categorie_prefectorale;

-- =====================================================
-- ÉTAPE 2: Mise à jour des grades avec leurs catégories
-- =====================================================

-- Mettre à jour les grades préfectoraux (GIII, GII, GI, HG)
-- Cherche d'abord une catégorie "G" ou "Préfectorale", sinon utilise la catégorie "G" si elle existe
UPDATE grades 
SET id_categorie = (
    SELECT id FROM categories 
    WHERE LOWER(libele) = 'g'
       OR LOWER(libele) LIKE '%préfectoral%'
       OR LOWER(libele) LIKE '%prefectoral%'
       OR LOWER(libele) LIKE '%général%'
       OR LOWER(libele) LIKE '%general%'
    ORDER BY 
        CASE 
            WHEN LOWER(libele) = 'g' THEN 1
            WHEN LOWER(libele) LIKE '%préfectoral%' OR LOWER(libele) LIKE '%prefectoral%' THEN 2
            ELSE 3
        END
    LIMIT 1
)
WHERE is_prefectoral = TRUE 
  AND id_categorie IS NULL
  AND libele IN ('GIII', 'GII', 'GI', 'HG');

-- Mettre à jour les grades de catégorie A (A3, A4, A5, A6, A7)
-- Cherche d'abord "Categorie A" puis "A"
UPDATE grades 
SET id_categorie = (
    SELECT id FROM categories 
    WHERE LOWER(libele) LIKE '%categorie a%'
       OR LOWER(libele) = 'a'
    ORDER BY 
        CASE 
            WHEN LOWER(libele) LIKE '%categorie a%' THEN 1
            WHEN LOWER(libele) = 'a' THEN 2
            ELSE 3
        END
    LIMIT 1
)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'A%'
  AND libele NOT LIKE 'A%/%';  -- Exclure les formats comme "A/B"

-- Mettre à jour les grades de catégorie B (B1, B2, B3)
-- Cherche d'abord "Categorie B" puis "B"
UPDATE grades 
SET id_categorie = (
    SELECT id FROM categories 
    WHERE LOWER(libele) LIKE '%categorie b%'
       OR LOWER(libele) = 'b'
    ORDER BY 
        CASE 
            WHEN LOWER(libele) LIKE '%categorie b%' THEN 1
            WHEN LOWER(libele) = 'b' THEN 2
            ELSE 3
        END
    LIMIT 1
)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'B%'
  AND libele NOT LIKE 'B%/%';  -- Exclure les formats comme "B/C"

-- Mettre à jour les grades de catégorie C (C1, C2)
-- Cherche d'abord "Categorie C" puis "C"
UPDATE grades 
SET id_categorie = (
    SELECT id FROM categories 
    WHERE LOWER(libele) LIKE '%categorie c%'
       OR LOWER(libele) = 'c'
    ORDER BY 
        CASE 
            WHEN LOWER(libele) LIKE '%categorie c%' THEN 1
            WHEN LOWER(libele) = 'c' THEN 2
            ELSE 3
        END
    LIMIT 1
)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'C%'
  AND libele NOT LIKE 'C%/%';  -- Exclure les formats comme "C/D"

-- Mettre à jour les grades de catégorie D (D1)
-- Cherche d'abord "Categorie D" puis "D"
UPDATE grades 
SET id_categorie = (
    SELECT id FROM categories 
    WHERE LOWER(libele) LIKE '%categorie d%'
       OR LOWER(libele) = 'd'
    ORDER BY 
        CASE 
            WHEN LOWER(libele) LIKE '%categorie d%' THEN 1
            WHEN LOWER(libele) = 'd' THEN 2
            ELSE 3
        END
    LIMIT 1
)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'D%'
  AND libele NOT LIKE 'D%/%';  -- Exclure les formats comme "D/E"

-- =====================================================
-- OPTION ALTERNATIVE: Mise à jour directe avec les IDs
-- =====================================================
-- Si vous connaissez les IDs exacts des catégories, décommentez et ajustez:

/*
-- Grades préfectoraux (GIII, GII, GI, HG) -> Catégorie G (id=11 si elle existe, sinon créer)
UPDATE grades 
SET id_categorie = (SELECT id FROM categories WHERE LOWER(libele) = 'g' LIMIT 1)
WHERE is_prefectoral = TRUE 
  AND id_categorie IS NULL
  AND libele IN ('GIII', 'GII', 'GI', 'HG');

-- Grades A (A3-A7) -> Catégorie A (id=5 ou 1 selon votre base)
UPDATE grades 
SET id_categorie = (SELECT id FROM categories WHERE LOWER(libele) = 'a' OR LOWER(libele) LIKE '%categorie a%' LIMIT 1)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'A%';

-- Grades B (B1-B3) -> Catégorie B (id=6 ou 2 selon votre base)
UPDATE grades 
SET id_categorie = (SELECT id FROM categories WHERE LOWER(libele) = 'b' OR LOWER(libele) LIKE '%categorie b%' LIMIT 1)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'B%';

-- Grades C (C1-C2) -> Catégorie C (id=7 ou 3 selon votre base)
UPDATE grades 
SET id_categorie = (SELECT id FROM categories WHERE LOWER(libele) = 'c' OR LOWER(libele) LIKE '%categorie c%' LIMIT 1)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'C%';

-- Grades D (D1) -> Catégorie D (id=8 ou 4 selon votre base)
UPDATE grades 
SET id_categorie = (SELECT id FROM categories WHERE LOWER(libele) = 'd' OR LOWER(libele) LIKE '%categorie d%' LIMIT 1)
WHERE is_prefectoral = FALSE 
  AND id_categorie IS NULL
  AND libele LIKE 'D%';
*/

-- =====================================================
-- ÉTAPE 3: Vérification des résultats
-- =====================================================

-- Afficher tous les grades avec leurs catégories
SELECT 
    g.id,
    g.libele as grade_libele,
    g.is_prefectoral,
    c.id as categorie_id,
    c.libele as categorie_libele,
    CASE 
        WHEN g.id_categorie IS NULL THEN '⚠️ Catégorie manquante'
        ELSE '✅ Catégorie assignée'
    END as statut
FROM grades g
LEFT JOIN categories c ON g.id_categorie = c.id
ORDER BY g.is_prefectoral DESC, g.libele;

-- Compter les grades par catégorie
SELECT 
    COALESCE(c.libele, 'Non assigné') as categorie,
    COUNT(g.id) as nombre_grades,
    STRING_AGG(g.libele, ', ' ORDER BY g.libele) as grades
FROM grades g
LEFT JOIN categories c ON g.id_categorie = c.id
GROUP BY c.id, c.libele
ORDER BY categorie;

-- Afficher uniquement les grades sans catégorie (si il y en a)
SELECT 
    g.id,
    g.libele,
    g.is_prefectoral,
    'Catégorie manquante - À assigner manuellement' as probleme
FROM grades g
WHERE g.id_categorie IS NULL;

-- Message de fin
SELECT 'Mise à jour des catégories terminée ! Vérifiez les résultats ci-dessus.' as message;
