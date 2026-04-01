-- ========================================
-- CORRECTION COMPLÈTE DES CATÉGORIES ET TYPES
-- ========================================
-- 
-- Ce script corrige le problème en 2 étapes :
-- 1. Importe les catégories manquantes depuis le CSV
-- 2. Met à jour les types d'agents selon leur catégorie
--
-- ATTENTION : Vous devez remplacer les UPDATE ci-dessous
-- par ceux générés depuis votre CSV
-- 
-- Pour générer automatiquement ce script :
-- node generateUpdateCategoriesSQL.js
-- ========================================

BEGIN;

-- =============================================
-- ÉTAPE 1 : CORRECTION DES CATÉGORIES
-- =============================================

-- Mettre à jour les catégories pour les agents du CSV
-- Format : UPDATE agents SET id_categorie = X WHERE matricule = 'XXXXXX';

-- Exemples (vous devez les remplacer par la liste complète) :
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '201957B'; -- A
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '272129B'; -- A
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '434689Y'; -- A
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '313044S'; -- A
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '366249Z'; -- A
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '460997T'; -- A
UPDATE agents SET id_categorie = 5, updated_at = CURRENT_TIMESTAMP WHERE matricule = '861964X'; -- A
UPDATE agents SET id_categorie = 6, updated_at = CURRENT_TIMESTAMP WHERE matricule = '855878B'; -- B
UPDATE agents SET id_categorie = 6, updated_at = CURRENT_TIMESTAMP WHERE matricule = '826255V'; -- B
UPDATE agents SET id_categorie = 6, updated_at = CURRENT_TIMESTAMP WHERE matricule = '889566V'; -- B
UPDATE agents SET id_categorie = 6, updated_at = CURRENT_TIMESTAMP WHERE matricule = '468207P'; -- B
UPDATE agents SET id_categorie = 6, updated_at = CURRENT_TIMESTAMP WHERE matricule = '889425Q'; -- B
UPDATE agents SET id_categorie = 6, updated_at = CURRENT_TIMESTAMP WHERE matricule = '821007L'; -- B
UPDATE agents SET id_categorie = 8, updated_at = CURRENT_TIMESTAMP WHERE matricule = '856634X'; -- D
UPDATE agents SET id_categorie = 8, updated_at = CURRENT_TIMESTAMP WHERE matricule = '360923B'; -- D

-- ⚠️ IMPORTANT : Ceci n'est qu'un échantillon !
-- Pour obtenir la liste complète, exécutez :
-- node generateUpdateCategoriesSQL.js

-- =============================================
-- ÉTAPE 2 : MISE À JOUR DES TYPES
-- =============================================

-- Mettre à jour les types selon la catégorie
-- Agents avec catégorie → FONCTIONNAIRE (id=1)
UPDATE agents 
SET 
    id_type_d_agent = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE 
    id_categorie IN (5, 6, 8, 9)
    AND (id_type_d_agent IS NULL OR id_type_d_agent != 1);

-- Agents sans catégorie → CONTRACTUEL (id=2)
UPDATE agents 
SET 
    id_type_d_agent = 2,
    updated_at = CURRENT_TIMESTAMP
WHERE 
    (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
    AND (id_type_d_agent IS NULL OR (id_type_d_agent != 2 AND id_type_d_agent != 16 AND id_type_d_agent != 17));

-- =============================================
-- VÉRIFICATION FINALE
-- =============================================

SELECT '========================================' as separation;
SELECT 'RÉSULTATS APRÈS CORRECTION' as titre;
SELECT '========================================' as separation;

-- Répartition par catégorie
SELECT 
    COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
GROUP BY c.libele
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END;

-- Répartition par type
SELECT 
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele
ORDER BY nombre DESC;

-- Vérification des incohérences (devrait retourner 0)
SELECT 
    'Agents avec catégorie mais CONTRACTUEL (erreur)' as verification,
    COUNT(*) as nombre
FROM agents
WHERE id_categorie IN (5, 6, 8, 9)
  AND id_type_d_agent IN (2, 16, 17);

SELECT 
    'Agents sans catégorie mais FONCTIONNAIRE (erreur)' as verification,
    COUNT(*) as nombre
FROM agents
WHERE (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
  AND id_type_d_agent = 1;

SELECT '✅ Correction terminée!' as resultat;

-- DÉCOMMENTEZ pour VALIDER :
-- COMMIT;

-- OU DÉCOMMENTEZ pour ANNULER :
-- ROLLBACK;

