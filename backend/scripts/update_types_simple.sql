-- ========================================
-- MISE À JOUR SIMPLE DES TYPES D'AGENTS
-- ========================================
-- 
-- Ce script met à jour IMMÉDIATEMENT les types d'agents
-- ATTENTION : Cette version valide automatiquement les changements
-- 
-- Pour une version avec transaction manuelle, utilisez : update_agent_types.sql
-- ========================================

-- Afficher le statut AVANT mise à jour
SELECT 
    'AVANT MISE À JOUR' as statut,
    COUNT(*) FILTER (WHERE id_type_d_agent = 1) as fonctionnaires,
    COUNT(*) FILTER (WHERE id_type_d_agent = 2) as contractuels,
    COUNT(*) FILTER (WHERE id_type_d_agent IS NULL) as sans_type,
    COUNT(*) as total
FROM agents;

-- 1. Mettre à jour les agents avec catégorie → FONCTIONNAIRE
UPDATE agents 
SET 
    id_type_d_agent = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE 
    id_categorie IN (5, 6, 8, 9)
    AND (id_type_d_agent IS NULL OR id_type_d_agent != 1);

-- 2. Mettre à jour les agents sans catégorie → CONTRACTUEL
UPDATE agents 
SET 
    id_type_d_agent = 2,
    updated_at = CURRENT_TIMESTAMP
WHERE 
    (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
    AND (id_type_d_agent IS NULL OR (id_type_d_agent != 2 AND id_type_d_agent != 16 AND id_type_d_agent != 17));

-- Afficher le statut APRÈS mise à jour
SELECT 
    'APRÈS MISE À JOUR' as statut,
    COUNT(*) FILTER (WHERE id_type_d_agent = 1) as fonctionnaires,
    COUNT(*) FILTER (WHERE id_type_d_agent = 2) as contractuels,
    COUNT(*) FILTER (WHERE id_type_d_agent IS NULL) as sans_type,
    COUNT(*) as total
FROM agents;

-- Résumé détaillé
SELECT 
    '========================================' as separation;

SELECT 
    c.libele as categorie,
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY c.libele, ta.libele, c.id, ta.id
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END,
    ta.libele;

SELECT '✅ Mise à jour terminée avec succès!' as resultat;

