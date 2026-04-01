-- ========================================
-- VÉRIFICATION PAR MATRICULE
-- ========================================
-- 
-- Ce script affiche les agents regroupés par type
-- pour faciliter la vérification manuelle
-- ========================================

-- 1. Échantillon d'agents avec catégorie (futurs FONCTIONNAIRES)
SELECT 
    '========================================' as separation;

SELECT 'ÉCHANTILLON : AGENTS AVEC CATÉGORIE (→ FONCTIONNAIRES)' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    c.libele as categorie,
    COALESCE(ta.libele, 'AUCUN TYPE') as type_actuel,
    '→ FONCTIONNAIRE' as changement
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE a.id_categorie IN (5, 6, 8, 9)
ORDER BY c.libele, a.matricule
LIMIT 30;

-- Total d'agents avec catégorie
SELECT 
    'TOTAL agents avec catégorie' as description,
    COUNT(*) as nombre
FROM agents
WHERE id_categorie IN (5, 6, 8, 9);

-- 2. Échantillon d'agents sans catégorie (futurs CONTRACTUELS)
SELECT 
    '========================================' as separation;

SELECT 'ÉCHANTILLON : AGENTS SANS CATÉGORIE (→ CONTRACTUELS)' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    'AUCUNE' as categorie,
    COALESCE(ta.libele, 'AUCUN TYPE') as type_actuel,
    '→ CONTRACTUEL' as changement
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE (a.id_categorie IS NULL OR a.id_categorie NOT IN (5, 6, 8, 9))
ORDER BY a.matricule
LIMIT 30;

-- Total d'agents sans catégorie
SELECT 
    'TOTAL agents sans catégorie' as description,
    COUNT(*) as nombre
FROM agents
WHERE (id_categorie IS NULL OR id_categorie NOT IN (5, 6, 8, 9));

-- 3. Vérification spécifique de quelques matricules du CSV
SELECT 
    '========================================' as separation;

SELECT 'VÉRIFICATION DE MATRICULES SPÉCIFIQUES DU CSV' as titre;

SELECT 
    '========================================' as separation;

-- Quelques matricules avec catégorie du CSV
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    COALESCE(c.libele, 'AUCUNE') as categorie,
    COALESCE(ta.libele, 'AUCUN') as type_actuel,
    CASE 
        WHEN a.id_categorie IN (5, 6, 8, 9) THEN 'FONCTIONNAIRE'
        ELSE 'CONTRACTUEL'
    END as type_attendu
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE a.matricule IN (
    '201957B',  -- Catégorie A dans le CSV
    '272129B',  -- Catégorie A dans le CSV
    '503281V',  -- Sans catégorie (CONTRA.ECH.S.SP) dans le CSV
    '504952W',  -- Sans catégorie (EXPERT) dans le CSV
    '982827G',  -- Sans catégorie (CONTRACTUEL) dans le CSV
    '982911C',  -- Sans catégorie (CONTRACTUEL) dans le CSV
    '255532W',  -- Catégorie A dans le CSV
    '255533X'   -- Catégorie A dans le CSV
)
ORDER BY 
    CASE 
        WHEN a.id_categorie IN (5, 6, 8, 9) THEN 1
        ELSE 2
    END,
    a.matricule;

-- 4. Statistiques par emploi pour les agents sans catégorie
SELECT 
    '========================================' as separation;

SELECT 'EMPLOIS DES AGENTS SANS CATÉGORIE' as titre;

SELECT 
    '========================================' as separation;

SELECT 
    e.libele as emploi,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN emplois e ON a.id_emploi = e.id
WHERE (a.id_categorie IS NULL OR a.id_categorie NOT IN (5, 6, 8, 9))
GROUP BY e.libele
ORDER BY nombre DESC
LIMIT 15;

