-- Test de comparaison de dates pour comprendre le problème
-- Ce script teste différentes comparaisons de dates

-- Afficher la date actuelle
SELECT 
    CURRENT_DATE as date_actuelle,
    CURRENT_TIMESTAMP as timestamp_actuel,
    NOW() as maintenant;

-- Test avec des dates spécifiques (celles visibles dans l'image)
SELECT 
    'Test de comparaison' as test,
    '2024-12-31'::DATE as date_test_2024,
    '2023-12-31'::DATE as date_test_2023,
    '2022-12-31'::DATE as date_test_2022,
    CURRENT_DATE as date_actuelle,
    CASE 
        WHEN '2024-12-31'::DATE < CURRENT_DATE THEN '✅ 2024-12-31 < aujourd''hui'
        WHEN '2024-12-31'::DATE = CURRENT_DATE THEN '⚠️ 2024-12-31 = aujourd''hui'
        WHEN '2024-12-31'::DATE > CURRENT_DATE THEN '❌ 2024-12-31 > aujourd''hui'
    END as comparaison_2024,
    CASE 
        WHEN '2023-12-31'::DATE < CURRENT_DATE THEN '✅ 2023-12-31 < aujourd''hui'
        WHEN '2023-12-31'::DATE = CURRENT_DATE THEN '⚠️ 2023-12-31 = aujourd''hui'
        WHEN '2023-12-31'::DATE > CURRENT_DATE THEN '❌ 2023-12-31 > aujourd''hui'
    END as comparaison_2023,
    CASE 
        WHEN '2022-12-31'::DATE < CURRENT_DATE THEN '✅ 2022-12-31 < aujourd''hui'
        WHEN '2022-12-31'::DATE = CURRENT_DATE THEN '⚠️ 2022-12-31 = aujourd''hui'
        WHEN '2022-12-31'::DATE > CURRENT_DATE THEN '❌ 2022-12-31 > aujourd''hui'
    END as comparaison_2022;

-- Test de la requête exacte utilisée dans getRetiredByRetirement
SELECT 
    'Requête exacte getRetiredByRetirement' as test,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    a.date_retraite::DATE as date_retraite_cast,
    CURRENT_DATE::DATE as current_date_cast,
    a.date_retraite::DATE < CURRENT_DATE::DATE as condition_verifiee,
    a.retire as retire_manuellement,
    (a.retire IS NULL OR a.retire = false) as condition_retire_verifiee
FROM agents a
WHERE a.date_retraite IS NOT NULL 
AND a.date_retraite::DATE < CURRENT_DATE::DATE
AND (a.retire IS NULL OR a.retire = false)
ORDER BY a.date_retraite DESC;

