-- Script SQL pour vérifier les agents à la retraite
-- Ce script permet de vérifier quels agents ont une date de retraite passée
-- et devraient apparaître dans la liste "Agents à la Retraite"

-- Afficher la date actuelle
SELECT 
    CURRENT_DATE as date_actuelle,
    CURRENT_TIMESTAMP as timestamp_actuel;

-- Vérifier les agents avec date_retraite passée (strictement avant aujourd'hui)
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    CASE 
        WHEN a.date_retraite < CURRENT_DATE THEN 'PASSÉE - Doit apparaître dans la liste'
        WHEN a.date_retraite = CURRENT_DATE THEN 'AUJOURD\'HUI - Ne doit PAS apparaître'
        WHEN a.date_retraite > CURRENT_DATE THEN 'FUTURE - Ne doit PAS apparaître'
        ELSE 'NULL'
    END as statut_date,
    a.retire as est_retire_manuellement,
    CASE 
        WHEN a.retire = true THEN 'OUI - Exclu de la liste (retiré manuellement)'
        WHEN a.retire = false OR a.retire IS NULL THEN 'NON - Peut apparaître si date passée'
        ELSE 'N/A'
    END as statut_retrait
FROM agents a
WHERE a.date_retraite IS NOT NULL
ORDER BY a.date_retraite DESC;

-- Compter les agents qui DEVRAIENT apparaître dans "Agents à la Retraite"
-- (date_retraite passée ET non retirés manuellement)
SELECT 
    COUNT(*) as nombre_agents_a_la_retraite
FROM agents a
WHERE a.date_retraite IS NOT NULL 
AND CAST(a.date_retraite AS DATE) < CAST(CURRENT_DATE AS DATE)
AND (a.retire IS NULL OR a.retire = false);

-- Afficher la liste complète des agents qui DEVRAIENT apparaître
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retraite,
    CURRENT_DATE - a.date_retraite as jours_ecoules_depuis_retraite,
    a.retire as est_retire_manuellement
FROM agents a
WHERE a.date_retraite IS NOT NULL 
AND CAST(a.date_retraite AS DATE) < CAST(CURRENT_DATE AS DATE)
AND (a.retire IS NULL OR a.retire = false)
ORDER BY a.date_retraite DESC;

