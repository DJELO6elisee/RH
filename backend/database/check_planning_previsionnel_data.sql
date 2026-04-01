-- Script de diagnostic pour vérifier les données de planning prévisionnel
-- Ce script permet de voir quels agents ont des dates de départ en congés

-- 1. Vérifier le nombre total d'enregistrements avec date_depart_conges
SELECT 
    COUNT(*) as total_avec_date,
    COUNT(CASE WHEN type_conge = 'grouped' THEN 1 END) as grouped,
    COUNT(CASE WHEN type_conge = 'individual' THEN 1 END) as individual,
    COUNT(CASE WHEN type_conge IS NULL THEN 1 END) as null_type,
    COUNT(DISTINCT annee) as annees_differentes
FROM agent_conges
WHERE date_depart_conges IS NOT NULL;

-- 2. Voir les enregistrements par année
SELECT 
    annee,
    COUNT(*) as nombre_agents,
    COUNT(CASE WHEN type_conge = 'grouped' THEN 1 END) as grouped,
    COUNT(CASE WHEN type_conge = 'individual' THEN 1 END) as individual,
    COUNT(CASE WHEN type_conge IS NULL THEN 1 END) as null_type
FROM agent_conges
WHERE date_depart_conges IS NOT NULL
GROUP BY annee
ORDER BY annee DESC;

-- 3. Voir quelques exemples d'enregistrements
SELECT 
    ac.id,
    ac.id_agent,
    ac.annee,
    ac.date_depart_conges,
    ac.type_conge,
    a.nom,
    a.prenom,
    a.matricule
FROM agent_conges ac
JOIN agents a ON ac.id_agent = a.id
WHERE ac.date_depart_conges IS NOT NULL
ORDER BY ac.annee DESC, ac.date_depart_conges DESC
LIMIT 10;

