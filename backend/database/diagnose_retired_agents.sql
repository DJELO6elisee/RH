-- Script de diagnostic pour comprendre pourquoi des agents apparaissent dans la liste
-- "Agents à la Retraite" alors qu'ils ne devraient pas

-- ============================================================================
-- 1. AFFICHER LA DATE ACTUELLE DU SERVEUR
-- ============================================================================
SELECT 
    CURRENT_DATE as date_actuelle_serveur,
    CURRENT_TIMESTAMP as timestamp_actuel_serveur,
    CURRENT_TIME as heure_actuelle_serveur;

-- ============================================================================
-- 2. TOUS LES AGENTS AVEC UNE DATE DE RETRAITE (peu importe la date)
-- ============================================================================
SELECT 
    'TOUS LES AGENTS AVEC date_retraite' as type_verification,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.retire as retire_manuellement,
    a.date_de_naissance,
    EXTRACT(YEAR FROM a.date_de_naissance) as annee_naissance,
    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_de_naissance) as age_actuel,
    -- Comparaison avec la date actuelle
    CASE 
        WHEN a.date_retraite IS NULL THEN 'NULL'
        WHEN a.date_retraite::DATE < CURRENT_DATE::DATE THEN '✅ PASSÉE (devrait apparaître)'
        WHEN a.date_retraite::DATE = CURRENT_DATE::DATE THEN '⚠️ AUJOURD''HUI (ne devrait PAS apparaître)'
        WHEN a.date_retraite::DATE > CURRENT_DATE::DATE THEN '❌ FUTURE (ne devrait PAS apparaître)'
        ELSE 'INCONNU'
    END as statut_par_rapport_aujourdhui,
    -- Calcul des jours
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
    END as difference_jours,
    -- Type de l'agent
    ta.libele as type_agent
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE a.date_retraite IS NOT NULL
ORDER BY a.date_retraite DESC;

-- ============================================================================
-- 3. AGENTS QUI APPEARAÎTRAIENT DANS LA LISTE "Agents à la Retraite"
-- (Selon la logique actuelle de getRetiredByRetirement)
-- ============================================================================
SELECT 
    'AGENTS QUI APPARAISSENT ACTUELLEMENT' as type_verification,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.retire as retire_manuellement,
    CASE 
        WHEN a.retire = true THEN 'EXCLU (retire=true)'
        WHEN a.retire = false OR a.retire IS NULL THEN 'INCLUS (retire=false ou NULL)'
        ELSE 'INCONNU'
    END as raison_inclusion,
    CURRENT_DATE::DATE - a.date_retraite::DATE as jours_ecoules,
    a.date_de_naissance,
    g.libele as grade_libele
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_retraite IS NOT NULL 
AND a.date_retraite::DATE < CURRENT_DATE::DATE
AND (a.retire IS NULL OR a.retire = false)
ORDER BY a.date_retraite DESC;

-- ============================================================================
-- 4. COMPTAGE DÉTAILLÉ
-- ============================================================================
SELECT 
    'STATISTIQUES' as type_verification,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL) as total_avec_date_retraite,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE < CURRENT_DATE::DATE) as avec_date_passee,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE = CURRENT_DATE::DATE) as avec_date_aujourdhui,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL AND a.date_retraite::DATE > CURRENT_DATE::DATE) as avec_date_future,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL 
                     AND a.date_retraite::DATE < CURRENT_DATE::DATE 
                     AND (a.retire IS NULL OR a.retire = false)) as apparait_dans_liste,
    COUNT(*) FILTER (WHERE a.date_retraite IS NOT NULL 
                     AND a.date_retraite::DATE < CURRENT_DATE::DATE 
                     AND a.retire = true) as exclus_car_retire_manuel,
    COUNT(*) FILTER (WHERE a.date_retraite IS NULL) as sans_date_retraite
FROM agents a;

-- ============================================================================
-- 5. VÉRIFICATION DES DATES FUTURES QUI APPARAÎTRAIENT (PROBLÈME POTENTIEL)
-- ============================================================================
SELECT 
    '⚠️ PROBLÈME : Dates futures qui apparaîtraient' as type_verification,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    CURRENT_DATE as date_actuelle,
    a.date_retraite::DATE - CURRENT_DATE::DATE as jours_restants,
    a.retire as retire_manuellement
FROM agents a
WHERE a.date_retraite IS NOT NULL 
AND a.date_retraite::DATE >= CURRENT_DATE::DATE
ORDER BY a.date_retraite ASC;

-- ============================================================================
-- 6. VÉRIFICATION SPÉCIFIQUE DES AGENTS VISIBLES DANS L'IMAGE
-- (Si vous connaissez leurs matricules)
-- ============================================================================
SELECT 
    'VÉRIFICATION AGENTS SPÉCIFIQUES' as type_verification,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.date_de_naissance,
    CURRENT_DATE as date_actuelle,
    CASE 
        WHEN a.date_retraite IS NULL THEN 'NULL'
        WHEN a.date_retraite::DATE < CURRENT_DATE::DATE THEN '✅ PASSÉE'
        WHEN a.date_retraite::DATE = CURRENT_DATE::DATE THEN '⚠️ AUJOURD''HUI'
        WHEN a.date_retraite::DATE > CURRENT_DATE::DATE THEN '❌ FUTURE'
    END as statut,
    a.retire as retire_manuellement,
    g.libele as grade
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.matricule IN ('507163S', '865486M', '506863X', '506865Z')
ORDER BY a.date_retraite DESC;

