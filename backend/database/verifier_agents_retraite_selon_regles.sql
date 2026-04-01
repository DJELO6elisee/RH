-- ============================================================================
-- SCRIPT DE VÉRIFICATION : Vérifier si les agents respectent les règles
-- de calcul de la retraite
-- ============================================================================
-- 
-- Règles à respecter :
-- 1. Agents fonctionnaires uniquement (id_type_d_agent = 1)
-- 2. Grades A4, A5, A6, A7 : Retraite à 65 ans
-- 3. Autres grades : Retraite à 60 ans
-- 4. Date de retraite = 31 décembre de l'année de retraite
-- 5. Point de départ = date_de_naissance (pas date de prise de service)
-- 6. Date de retraite calculée < date actuelle (passée)
-- ============================================================================

-- 1. DATE ACTUELLE
-- ============================================================================
SELECT 
    '=== DATE ACTUELLE ===' as section,
    CURRENT_DATE as date_actuelle;

-- 2. CALCUL DE L'ÂGE DE RETRAITE SELON LE GRADE
-- ============================================================================
-- Grades A4, A5, A6, A7 : 65 ans
-- Autres grades : 60 ans

-- 3. VÉRIFICATION DES AGENTS SPÉCIFIQUES VISIBLES DANS L'IMAGE
-- ============================================================================
SELECT 
    '=== VÉRIFICATION AGENTS SPÉCIFIQUES ===' as section,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    ta.libele as type_agent,
    CASE 
        WHEN a.id_type_d_agent = 1 THEN '✅ FONCTIONNAIRE'
        ELSE '❌ NON FONCTIONNAIRE (ne devrait PAS apparaître)'
    END as verification_type,
    a.date_de_naissance,
    EXTRACT(YEAR FROM a.date_de_naissance) as annee_naissance,
    g.libele as grade_libele,
    -- Calcul de l'âge de retraite selon le grade
    CASE 
        WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
        ELSE 60
    END as age_retraite_requis,
    -- Calcul de la date de retraite (31 décembre de l'année de retraite)
    MAKE_DATE(
        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
        CASE 
            WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
            ELSE 60
        END,
        12,
        31
    ) as date_retraite_calculee,
    -- Date de retraite stockée
    a.date_retraite as date_retraite_stockee,
    CURRENT_DATE as date_actuelle,
    -- Vérification si la date calculée est passée
    CASE 
        WHEN MAKE_DATE(
            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
            CASE 
                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                ELSE 60
            END,
            12,
            31
        )::DATE < CURRENT_DATE::DATE THEN '✅ DATE PASSÉE (devrait apparaître)'
        WHEN MAKE_DATE(
            EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
            CASE 
                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                ELSE 60
            END,
            12,
            31
        )::DATE = CURRENT_DATE::DATE THEN '⚠️ DATE AUJOURD''HUI (ne devrait PAS apparaître)'
        ELSE '❌ DATE FUTURE (ne devrait PAS apparaître)'
    END as verification_date,
    -- Statut global
    CASE 
        WHEN a.id_type_d_agent = 1 
             AND g.libele IS NOT NULL
             AND a.date_de_naissance IS NOT NULL
             AND MAKE_DATE(
                 EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                 CASE 
                     WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                     ELSE 60
                 END,
                 12,
                 31
             )::DATE < CURRENT_DATE::DATE
             AND (a.retire IS NULL OR a.retire = false)
            THEN '✅ DEVRAIT apparaître dans la liste'
        ELSE '❌ NE DEVRAIT PAS apparaître dans la liste'
    END as statut_final
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.matricule IN ('507163S', '865486M', '506863X', '506865Z')
ORDER BY a.date_retraite DESC;

-- 4. TOUS LES AGENTS QUI DEVRAIENT APPARAÎTRE (selon les nouvelles règles)
-- ============================================================================
SELECT 
    '=== AGENTS QUI DEVRAIENT APPARAÎTRE ===' as section,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    ta.libele as type_agent,
    a.date_de_naissance,
    EXTRACT(YEAR FROM a.date_de_naissance) as annee_naissance,
    g.libele as grade_libele,
    CASE 
        WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
        ELSE 60
    END as age_retraite_requis,
    MAKE_DATE(
        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
        CASE 
            WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
            ELSE 60
        END,
        12,
        31
    ) as date_retraite_calculee,
    CURRENT_DATE - MAKE_DATE(
        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
        CASE 
            WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
            ELSE 60
        END,
        12,
        31
    ) as jours_ecoules_depuis_retraite
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_de_naissance IS NOT NULL
AND a.id_type_d_agent = 1
AND g.libele IS NOT NULL
AND MAKE_DATE(
    EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
    CASE 
        WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
        ELSE 60
    END,
    12,
    31
)::DATE < CURRENT_DATE::DATE
AND (a.retire IS NULL OR a.retire = false)
ORDER BY MAKE_DATE(
    EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
    CASE 
        WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
        ELSE 60
    END,
    12,
    31
) DESC;

-- 5. STATISTIQUES
-- ============================================================================
SELECT 
    '=== STATISTIQUES ===' as section,
    COUNT(*) FILTER (WHERE a.date_de_naissance IS NOT NULL AND a.id_type_d_agent = 1 AND g.libele IS NOT NULL) as total_fonctionnaires_avec_grade,
    COUNT(*) FILTER (WHERE a.date_de_naissance IS NOT NULL 
                     AND a.id_type_d_agent = 1 
                     AND g.libele IS NOT NULL
                     AND MAKE_DATE(
                         EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
                         CASE 
                             WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                             ELSE 60
                         END,
                         12,
                         31
                     )::DATE < CURRENT_DATE::DATE
                     AND (a.retire IS NULL OR a.retire = false)) as agents_qui_devraient_apparaitre,
    COUNT(*) FILTER (WHERE a.id_type_d_agent != 1 OR a.id_type_d_agent IS NULL) as agents_non_fonctionnaires,
    COUNT(*) FILTER (WHERE a.date_de_naissance IS NULL) as agents_sans_date_naissance,
    COUNT(*) FILTER (WHERE g.libele IS NULL) as agents_sans_grade
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id;

