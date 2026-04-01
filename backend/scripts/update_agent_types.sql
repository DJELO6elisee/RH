-- ========================================
-- Script de mise à jour des types d'agents
-- ========================================
-- 
-- Règle :
-- - Si l'agent a une catégorie (A, B, C, D) → FONCTIONNAIRE (id_type_d_agent = 1)
-- - Sinon → CONTRACTUEL (id_type_d_agent = 2)
--
-- Catégories dans la base :
-- id=5 → 'A'
-- id=6 → 'B'
-- id=8 → 'D'
-- id=9 → 'C'
--
-- Types d'agents :
-- id=1 → 'FONCTIONNAIRE'
-- id=2 → 'CONTRACTUEL'
-- id=16 → 'BNETD'
-- id=17 → 'CONTRACTUEL(ARTICLE 18)'
-- ========================================

-- Démarrer une transaction pour pouvoir annuler en cas d'erreur
BEGIN;

-- 1. Mettre à jour les agents avec catégorie → FONCTIONNAIRE
UPDATE agents 
SET 
    id_type_d_agent = 1,  -- FONCTIONNAIRE
    updated_at = CURRENT_TIMESTAMP
WHERE 
    id_categorie IN (5, 6, 8, 9)  -- Catégories A, B, C, D
    AND (id_type_d_agent IS NULL OR id_type_d_agent != 1);

-- Afficher le nombre d'agents mis à jour
DO $$
DECLARE
    fonctionnaires_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fonctionnaires_count
    FROM agents
    WHERE id_categorie IN (5, 6, 8, 9);
    
    RAISE NOTICE '✅ % agents mis à jour comme FONCTIONNAIRE (avec catégorie)', fonctionnaires_count;
END $$;

-- 2. Mettre à jour les agents sans catégorie → CONTRACTUEL
UPDATE agents 
SET 
    id_type_d_agent = 2,  -- CONTRACTUEL
    updated_at = CURRENT_TIMESTAMP
WHERE 
    (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
    AND (id_type_d_agent IS NULL OR id_type_d_agent = 1);

-- Afficher le nombre d'agents mis à jour
DO $$
DECLARE
    contractuels_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contractuels_count
    FROM agents
    WHERE (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9));
    
    RAISE NOTICE '✅ % agents mis à jour comme CONTRACTUEL (sans catégorie)', contractuels_count;
END $$;


-- 3. Afficher un résumé des types d'agents
DO $$
DECLARE
    total_agents INTEGER;
    total_fonctionnaires INTEGER;
    total_contractuels INTEGER;
    total_autres INTEGER;
    total_sans_type INTEGER;
BEGIN
    -- Total des agents
    SELECT COUNT(*) INTO total_agents FROM agents;
    
    -- Agents fonctionnaires
    SELECT COUNT(*) INTO total_fonctionnaires 
    FROM agents 
    WHERE id_type_d_agent = 1;
    
    -- Agents contractuels
    SELECT COUNT(*) INTO total_contractuels 
    FROM agents 
    WHERE id_type_d_agent = 2;
    
    -- Autres types (BNETD, CONTRACTUEL ARTICLE 18, etc.)
    SELECT COUNT(*) INTO total_autres 
    FROM agents 
    WHERE id_type_d_agent NOT IN (1, 2) AND id_type_d_agent IS NOT NULL;
    
    -- Agents sans type
    SELECT COUNT(*) INTO total_sans_type 
    FROM agents 
    WHERE id_type_d_agent IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RÉSUMÉ DES TYPES D''AGENTS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total agents : %', total_agents;
    RAISE NOTICE 'FONCTIONNAIRES : %', total_fonctionnaires;
    RAISE NOTICE 'CONTRACTUELS : %', total_contractuels;
    RAISE NOTICE 'Autres types : %', total_autres;
    RAISE NOTICE 'Sans type : %', total_sans_type;
    RAISE NOTICE '========================================';
END $$;

-- 4. Vérification finale : Afficher les agents par catégorie et type
SELECT 
    c.libele as categorie,
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY c.libele, ta.libele
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END,
    ta.libele;

-- Si tout est correct, valider la transaction
-- COMMIT;

-- Si vous voulez annuler les modifications, décommenter la ligne suivante :
-- ROLLBACK;

-- ⚠️ IMPORTANT : Par défaut, la transaction est ouverte mais non validée
-- Pour appliquer les changements, exécutez : COMMIT;
-- Pour annuler les changements, exécutez : ROLLBACK;

