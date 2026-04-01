-- ========================================
-- Script d'analyse des types d'agents
-- ========================================
-- 
-- Ce script analyse les agents dans la base de données
-- et affiche un rapport détaillé par type
-- ========================================

-- 1. Résumé global des agents
SELECT 
    '========================================' as separation;

SELECT 'RÉSUMÉ GLOBAL DES AGENTS' as titre;

SELECT 
    '========================================' as separation;

-- Total des agents
SELECT 
    'Total des agents' as description,
    COUNT(*) as nombre
FROM agents;

-- 2. Agents par catégorie
SELECT 
    '========================================' as separation;

SELECT 'AGENTS PAR CATÉGORIE' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
    COUNT(*) as nombre,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM agents), 2) as pourcentage
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
GROUP BY c.libele, c.id
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END;

-- 3. Agents par type actuel
SELECT 
    '========================================' as separation;

SELECT 'AGENTS PAR TYPE ACTUEL' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    COALESCE(ta.libele, 'SANS TYPE') as type_agent,
    COUNT(*) as nombre,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM agents), 2) as pourcentage
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele, ta.id
ORDER BY nombre DESC;

-- 4. Matrice croisée : Catégorie vs Type d'agent
SELECT 
    '========================================' as separation;

SELECT 'MATRICE : CATÉGORIE vs TYPE D''AGENT' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
    COALESCE(ta.libele, 'SANS TYPE') as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY c.libele, c.id, ta.libele, ta.id
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END,
    ta.libele;

-- 5. Agents qui auront besoin d'être mis à jour
SELECT 
    '========================================' as separation;

SELECT 'AGENTS À METTRE À JOUR' as titre;

SELECT 
    '========================================' as separation;

-- Agents avec catégorie mais pas type FONCTIONNAIRE
SELECT 
    'Avec catégorie mais pas FONCTIONNAIRE' as cas,
    COUNT(*) as nombre
FROM agents
WHERE id_categorie IN (5, 6, 8, 9)
  AND (id_type_d_agent IS NULL OR id_type_d_agent != 1);

-- Agents sans catégorie mais pas type CONTRACTUEL
SELECT 
    'Sans catégorie mais pas CONTRACTUEL' as cas,
    COUNT(*) as nombre
FROM agents
WHERE (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9))
  AND (id_type_d_agent IS NULL OR id_type_d_agent NOT IN (2, 16, 17));

-- 6. Échantillon d'agents sans type
SELECT 
    '========================================' as separation;

SELECT 'ÉCHANTILLON D''AGENTS SANS TYPE (10 premiers)' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    COALESCE(c.libele, 'Aucune') as categorie,
    COALESCE(ta.libele, 'Aucun') as type_agent
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE a.id_type_d_agent IS NULL
LIMIT 10;

-- 7. Échantillon d'agents sans catégorie
SELECT 
    '========================================' as separation;

SELECT 'ÉCHANTILLON D''AGENTS SANS CATÉGORIE (10 premiers)' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    COALESCE(c.libele, 'Aucune') as categorie,
    COALESCE(ta.libele, 'Aucun') as type_agent
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE a.id_categorie IS NULL OR a.id_categorie NOT IN (5, 6, 8, 9)
LIMIT 10;

