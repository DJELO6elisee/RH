-- ============================================================================
-- SCRIPT DE VÉRIFICATION : Pourquoi des agents apparaissent dans la liste
-- "Agents à la Retraite"
-- ============================================================================
-- 
-- Ce script vous permet de comprendre exactement pourquoi certains agents
-- apparaissent dans la liste "Agents à la Retraite"
--
-- Exécutez ce script dans votre base de données PostgreSQL
-- ============================================================================

-- 1. AFFICHER LA DATE ACTUELLE DU SERVEUR
-- ============================================================================
SELECT 
    '=== DATE ACTUELLE DU SERVEUR ===' as section,
    CURRENT_DATE as date_actuelle,
    CURRENT_TIMESTAMP as timestamp_actuel;

-- 2. TOUS LES AGENTS AVEC UNE DATE DE RETRAITE
-- ============================================================================
SELECT 
    '=== TOUS LES AGENTS AVEC date_retraite ===' as section,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.date_de_naissance,
    a.retire as retire_manuellement,
    -- Statut de la date par rapport à aujourd'hui
    CASE 
        WHEN a.date_retraite IS NULL THEN 'NULL'
        WHEN a.date_retraite::DATE < CURRENT_DATE::DATE THEN '✅ PASSÉE (apparaît dans la liste)'
        WHEN a.date_retraite::DATE = CURRENT_DATE::DATE THEN '⚠️ AUJOURD''HUI (n''apparaît PAS)'
        WHEN a.date_retraite::DATE > CURRENT_DATE::DATE THEN '❌ FUTURE (n''apparaît PAS)'
        ELSE 'INCONNU'
    END as statut_date,
    -- Nombre de jours
    CASE 
        WHEN a.date_retraite IS NOT NULL THEN
            CASE 
                WHEN a.date_retraite::DATE < CURRENT_DATE::DATE THEN 
                    CURRENT_DATE::DATE - a.date_retraite::DATE
                WHEN a.date_retraite::DATE > CURRENT_DATE::DATE THEN 
                    (a.date_retraite::DATE - CURRENT_DATE::DATE) * -1
                ELSE 0
            END
        ELSE NULL
    END as difference_jours
FROM agents a
WHERE a.date_retraite IS NOT NULL
ORDER BY a.date_retraite DESC;

-- 3. AGENTS QUI APPARAISSENT ACTUELLEMENT DANS LA LISTE
-- (Selon la logique de getRetiredByRetirement)
-- ============================================================================
SELECT 
    '=== AGENTS QUI APPARAISSENT DANS LA LISTE ===' as section,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.retire as retire_manuellement,
    CURRENT_DATE::DATE - a.date_retraite::DATE as jours_ecoules_depuis_retraite,
    -- Pourquoi cet agent apparaît
    CASE 
        WHEN a.date_retraite::DATE < CURRENT_DATE::DATE AND (a.retire IS NULL OR a.retire = false) 
            THEN '✅ Apparaît : date passée ET non retiré manuellement'
        WHEN a.retire = true 
            THEN '❌ N''apparaît PAS : retiré manuellement'
        ELSE '❌ N''apparaît PAS : autre raison'
    END as raison_apparition
FROM agents a
WHERE a.date_retraite IS NOT NULL 
AND a.date_retraite::DATE < CURRENT_DATE::DATE
AND (a.retire IS NULL OR a.retire = false)
ORDER BY a.date_retraite DESC;

-- 4. STATISTIQUES GLOBALES
-- ============================================================================
SELECT 
    '=== STATISTIQUES ===' as section,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL) as total_agents_avec_date_retraite,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE < CURRENT_DATE::DATE) as agents_avec_date_passee,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE = CURRENT_DATE::DATE) as agents_avec_date_aujourdhui,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE > CURRENT_DATE::DATE) as agents_avec_date_future,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL 
                     AND a.date_retraite::DATE < CURRENT_DATE::DATE 
                     AND (a.retire IS NULL OR a.retire = false)) as agents_qui_apparaissent_dans_liste,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL 
                     AND a.date_retraite::DATE < CURRENT_DATE::DATE 
                     AND a.retire = true) as agents_exclus_car_retire_manuellement
FROM agents a;

-- 5. TEST AVEC LES DATES VISIBLES DANS L'INTERFACE
-- ============================================================================
SELECT 
    '=== TEST DES DATES VISIBLES ===' as section,
    CURRENT_DATE::DATE as date_actuelle_serveur,
    '2024-12-31'::DATE as date_test_2024,
    '2023-12-31'::DATE as date_test_2023,
    '2022-12-31'::DATE as date_test_2022,
    CASE 
        WHEN '2024-12-31'::DATE < CURRENT_DATE::DATE THEN '✅ 2024-12-31 est PASSÉE (apparaîtrait)'
        WHEN '2024-12-31'::DATE = CURRENT_DATE::DATE THEN '⚠️ 2024-12-31 est AUJOURD''HUI (n''apparaîtrait PAS)'
        WHEN '2024-12-31'::DATE > CURRENT_DATE::DATE THEN '❌ 2024-12-31 est FUTURE (n''apparaîtrait PAS)'
    END as statut_2024,
    CASE 
        WHEN '2023-12-31'::DATE < CURRENT_DATE::DATE THEN '✅ 2023-12-31 est PASSÉE (apparaîtrait)'
        WHEN '2023-12-31'::DATE = CURRENT_DATE::DATE THEN '⚠️ 2023-12-31 est AUJOURD''HUI (n''apparaîtrait PAS)'
        WHEN '2023-12-31'::DATE > CURRENT_DATE::DATE THEN '❌ 2023-12-31 est FUTURE (n''apparaîtrait PAS)'
    END as statut_2023,
    CASE 
        WHEN '2022-12-31'::DATE < CURRENT_DATE::DATE THEN '✅ 2022-12-31 est PASSÉE (apparaîtrait)'
        WHEN '2022-12-31'::DATE = CURRENT_DATE::DATE THEN '⚠️ 2022-12-31 est AUJOURD''HUI (n''apparaîtrait PAS)'
        WHEN '2022-12-31'::DATE > CURRENT_DATE::DATE THEN '❌ 2022-12-31 est FUTURE (n''apparaîtrait PAS)'
    END as statut_2022;

-- 6. VÉRIFICATION DES AGENTS SPÉCIFIQUES VISIBLES DANS L'IMAGE
-- ============================================================================
SELECT 
    '=== VÉRIFICATION AGENTS SPÉCIFIQUES ===' as section,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.date_de_naissance,
    CURRENT_DATE::DATE as date_actuelle,
    CASE 
        WHEN a.date_retraite IS NULL THEN 'NULL'
        WHEN a.date_retraite::DATE < CURRENT_DATE::DATE THEN '✅ PASSÉE'
        WHEN a.date_retraite::DATE = CURRENT_DATE::DATE THEN '⚠️ AUJOURD''HUI'
        WHEN a.date_retraite::DATE > CURRENT_DATE::DATE THEN '❌ FUTURE'
    END as statut_date,
    a.retire as retire_manuellement,
    CASE 
        WHEN a.date_retraite IS NOT NULL 
             AND a.date_retraite::DATE < CURRENT_DATE::DATE 
             AND (a.retire IS NULL OR a.retire = false) 
            THEN '✅ DEVRAIT apparaître'
        ELSE '❌ NE DEVRAIT PAS apparaître'
    END as devrait_apparaitre
FROM agents a
WHERE a.matricule IN ('507163S', '865486M', '506863X', '506865Z')
ORDER BY a.date_retraite DESC;

-- ============================================================================
-- RÉSUMÉ DE LA LOGIQUE
-- ============================================================================
-- 
-- Un agent apparaît dans la liste "Agents à la Retraite" si :
-- 1. Il a une date_retraite stockée dans la base (date_retraite IS NOT NULL)
-- 2. Cette date est strictement inférieure à la date actuelle du serveur
--    (date_retraite::DATE < CURRENT_DATE::DATE)
-- 3. L'agent n'est pas retiré manuellement (retire IS NULL OR retire = false)
--
-- IMPORTANT : La logique utilise uniquement la colonne 'date_retraite' 
-- stockée dans la table agents, PAS un calcul basé sur la date de naissance
-- et le grade.
-- ============================================================================

