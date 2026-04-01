-- Script SQL pour vérifier les agents qui sont déjà à la retraite
-- selon les conditions : Grades A4, A5, A6, A7 = 65 ans, autres = 60 ans
-- Date de retraite = 31 décembre de l'année de retraite

-- Afficher la date actuelle
SELECT 
    CURRENT_DATE as date_actuelle,
    CURRENT_TIMESTAMP as timestamp_actuel;

-- Fonction pour calculer l'âge de retraite basé sur le grade
-- Grades A4, A5, A6, A7 : 65 ans
-- Autres grades : 60 ans
CREATE OR REPLACE FUNCTION calculate_retirement_age(grade_libele TEXT)
RETURNS INTEGER AS $$
DECLARE
    grade_normalise TEXT;
BEGIN
    IF grade_libele IS NULL THEN
        RETURN 60; -- Par défaut 60 ans
    END IF;
    
    -- Normaliser le grade : supprimer les espaces et mettre en majuscules
    grade_normalise := UPPER(REPLACE(grade_libele, ' ', ''));
    
    -- Grades spéciaux qui partent à 65 ans
    IF grade_normalise IN ('A4', 'A5', 'A6', 'A7') THEN
        RETURN 65;
    ELSE
        RETURN 60;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Calculer la date de retraite (31 décembre de l'année de retraite)
CREATE OR REPLACE FUNCTION calculate_retirement_date(date_naissance DATE, grade_libele TEXT)
RETURNS DATE AS $$
DECLARE
    birth_year INTEGER;
    retirement_age INTEGER;
    retirement_year INTEGER;
BEGIN
    IF date_naissance IS NULL THEN
        RETURN NULL;
    END IF;
    
    birth_year := EXTRACT(YEAR FROM date_naissance);
    retirement_age := calculate_retirement_age(grade_libele);
    retirement_year := birth_year + retirement_age;
    
    -- La date de retraite est toujours le 31 décembre de l'année de retraite
    RETURN TO_DATE(retirement_year || '-12-31', 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VÉRIFICATION : Agents qui DEVRAIENT être à la retraite aujourd'hui
-- ============================================================================
SELECT 
    'AGENTS DÉJÀ À LA RETRAITE (selon calcul)' as type_verification,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_de_naissance,
    g.libele as grade_libele,
    calculate_retirement_age(g.libele) as age_retraite,
    EXTRACT(YEAR FROM a.date_de_naissance) + calculate_retirement_age(g.libele) as annee_retraite,
    calculate_retirement_date(a.date_de_naissance, g.libele) as date_retraite_calculee,
    a.date_retraite as date_retraite_stockee,
    CASE 
        WHEN a.date_retraite IS NOT NULL THEN
            CASE 
                WHEN a.date_retraite = calculate_retirement_date(a.date_de_naissance, g.libele) THEN '✅ CORRECTE'
                WHEN a.date_retraite < calculate_retirement_date(a.date_de_naissance, g.libele) THEN '⚠️ AVANCÉE'
                WHEN a.date_retraite > calculate_retirement_date(a.date_de_naissance, g.libele) THEN '⚠️ RETARDÉE'
                ELSE '⚠️ DIFFÉRENTE'
            END
        ELSE '❌ NON DÉFINIE'
    END as statut_date_retraite,
    CASE 
        WHEN calculate_retirement_date(a.date_de_naissance, g.libele) < CURRENT_DATE THEN '✅ DÉJÀ À LA RETRAITE'
        WHEN calculate_retirement_date(a.date_de_naissance, g.libele) = CURRENT_DATE THEN '⚠️ RETRAITE AUJOURD''HUI'
        WHEN calculate_retirement_date(a.date_de_naissance, g.libele) > CURRENT_DATE THEN '⏳ PAS ENCORE'
        ELSE '❌ INCONNU'
    END as statut_retraite,
    a.retire as est_retire_manuellement,
    CURRENT_DATE - calculate_retirement_date(a.date_de_naissance, g.libele) as jours_ecoules_depuis_retraite
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_de_naissance IS NOT NULL
AND calculate_retirement_date(a.date_de_naissance, g.libele) < CURRENT_DATE
AND (a.retire IS NULL OR a.retire = false)
ORDER BY calculate_retirement_date(a.date_de_naissance, g.libele) DESC, a.nom, a.prenom;

-- ============================================================================
-- COMPTAGE : Nombre d'agents déjà à la retraite
-- ============================================================================
SELECT 
    'STATISTIQUES' as type_verification,
    COUNT(*) as nombre_agents_deja_a_la_retraite,
    COUNT(CASE WHEN calculate_retirement_date(a.date_de_naissance, g.libele) < CURRENT_DATE THEN 1 END) as avec_date_passee,
    COUNT(CASE WHEN a.date_retraite IS NOT NULL AND a.date_retraite < CURRENT_DATE THEN 1 END) as avec_date_stockee_passee,
    COUNT(CASE WHEN a.retire = true THEN 1 END) as retires_manuellement
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_de_naissance IS NOT NULL
AND calculate_retirement_date(a.date_de_naissance, g.libele) < CURRENT_DATE
AND (a.retire IS NULL OR a.retire = false);

-- ============================================================================
-- DÉTAILS : Liste complète avec toutes les informations
-- ============================================================================
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_de_naissance,
    EXTRACT(YEAR FROM a.date_de_naissance) as annee_naissance,
    EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM a.date_de_naissance) as age_actuel,
    g.libele as grade_libele,
    calculate_retirement_age(g.libele) as age_retraite_requis,
    EXTRACT(YEAR FROM a.date_de_naissance) + calculate_retirement_age(g.libele) as annee_retraite_calculee,
    calculate_retirement_date(a.date_de_naissance, g.libele) as date_retraite_calculee,
    a.date_retraite as date_retraite_stockee,
    a.retire as retire_manuellement,
    CASE 
        WHEN calculate_retirement_date(a.date_de_naissance, g.libele) < CURRENT_DATE THEN 
            CURRENT_DATE - calculate_retirement_date(a.date_de_naissance, g.libele)
        ELSE NULL
    END as jours_ecoules_depuis_retraite_calculee,
    CASE 
        WHEN a.date_retraite IS NOT NULL AND a.date_retraite < CURRENT_DATE THEN 
            CURRENT_DATE - a.date_retraite
        ELSE NULL
    END as jours_ecoules_depuis_retraite_stockee
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_de_naissance IS NOT NULL
ORDER BY 
    CASE 
        WHEN calculate_retirement_date(a.date_de_naissance, g.libele) < CURRENT_DATE THEN 1
        ELSE 2
    END,
    calculate_retirement_date(a.date_de_naissance, g.libele) DESC,
    a.nom,
    a.prenom;

-- ============================================================================
-- VÉRIFICATION : Agents avec date_retraite stockée mais qui ne correspondent pas au calcul
-- ============================================================================
SELECT 
    'INCOHÉRENCES DÉTECTÉES' as type_verification,
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_de_naissance,
    g.libele as grade_libele,
    calculate_retirement_date(a.date_de_naissance, g.libele) as date_retraite_calculee,
    a.date_retraite as date_retraite_stockee,
    a.date_retraite - calculate_retirement_date(a.date_de_naissance, g.libele) as difference_jours,
    CASE 
        WHEN a.date_retraite < calculate_retirement_date(a.date_de_naissance, g.libele) THEN 'Date stockée plus tôt que calculée'
        WHEN a.date_retraite > calculate_retirement_date(a.date_de_naissance, g.libele) THEN 'Date stockée plus tard que calculée'
        ELSE 'Dates identiques'
    END as type_incoherence
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_de_naissance IS NOT NULL
AND a.date_retraite IS NOT NULL
AND a.date_retraite != calculate_retirement_date(a.date_de_naissance, g.libele)
ORDER BY ABS(a.date_retraite - calculate_retirement_date(a.date_de_naissance, g.libele)) DESC;

-- Nettoyer les fonctions temporaires (optionnel)
-- DROP FUNCTION IF EXISTS calculate_retirement_age(TEXT);
-- DROP FUNCTION IF EXISTS calculate_retirement_date(DATE, TEXT);

