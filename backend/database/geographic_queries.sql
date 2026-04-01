-- Requêtes utiles pour les tables géographiques
-- ============================================

-- 1. Requête pour obtenir la hiérarchie complète : Région → Département → Localité
SELECT 
    r.nom as region,
    r.code as code_region,
    d.nom as departement,
    d.code as code_departement,
    l.nom as localite,
    l.code as code_localite,
    l.type_localite,
    l.population,
    l.superficie
FROM regions r
LEFT JOIN departements d ON r.id = d.id_region
LEFT JOIN localites l ON d.id = l.id_departement
WHERE r.is_active = TRUE 
  AND d.is_active = TRUE 
  AND l.is_active = TRUE
ORDER BY r.nom, d.nom, l.nom;

-- 2. Requête pour obtenir tous les départements d'une région
SELECT 
    d.id,
    d.code,
    d.nom,
    d.chef_lieu,
    d.superficie,
    d.population,
    r.nom as region
FROM departements d
JOIN regions r ON d.id_region = r.id
WHERE r.code = 'ABJ' -- Remplacer par le code de région souhaité
  AND d.is_active = TRUE
ORDER BY d.nom;

-- 3. Requête pour obtenir toutes les localités d'un département
SELECT 
    l.id,
    l.code,
    l.nom,
    l.type_localite,
    l.population,
    l.superficie,
    l.latitude,
    l.longitude,
    d.nom as departement,
    r.nom as region
FROM localites l
JOIN departements d ON l.id_departement = d.id
JOIN regions r ON d.id_region = r.id
WHERE d.code = 'ABJ-01' -- Remplacer par le code de département souhaité
  AND l.is_active = TRUE
ORDER BY l.nom;

-- 4. Requête pour obtenir les adresses d'un agent
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    al.type_adresse,
    al.adresse_complete,
    l.nom as localite,
    d.nom as departement,
    r.nom as region,
    al.is_principal
FROM agents a
JOIN agents_localites al ON a.id = al.id_agent
JOIN localites l ON al.id_localite = l.id
JOIN departements d ON l.id_departement = d.id
JOIN regions r ON d.id_region = r.id
WHERE a.id = 1 -- Remplacer par l'ID de l'agent souhaité
ORDER BY al.is_principal DESC, al.type_adresse;

-- 5. Requête pour obtenir l'historique des affectations géographiques d'un agent
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    ag.motif,
    ag.date_debut,
    ag.date_fin,
    ag.statut,
    ls.nom as localite_source,
    ds.nom as departement_source,
    rs.nom as region_source,
    ld.nom as localite_destination,
    dd.nom as departement_destination,
    rd.nom as region_destination
FROM agents a
JOIN affectations_geographiques ag ON a.id = ag.id_agent
LEFT JOIN localites ls ON ag.id_localite_source = ls.id
LEFT JOIN departements ds ON ls.id_departement = ds.id
LEFT JOIN regions rs ON ds.id_region = rs.id
LEFT JOIN localites ld ON ag.id_localite_destination = ld.id
LEFT JOIN departements dd ON ld.id_departement = dd.id
LEFT JOIN regions rd ON dd.id_region = rd.id
WHERE a.id = 1 -- Remplacer par l'ID de l'agent souhaité
ORDER BY ag.date_debut DESC;

-- 6. Requête pour obtenir les statistiques par région
SELECT 
    r.nom as region,
    r.code as code_region,
    COUNT(DISTINCT d.id) as nombre_departements,
    COUNT(DISTINCT l.id) as nombre_localites,
    SUM(l.population) as population_totale,
    SUM(l.superficie) as superficie_totale
FROM regions r
LEFT JOIN departements d ON r.id = d.id_region AND d.is_active = TRUE
LEFT JOIN localites l ON d.id = l.id_departement AND l.is_active = TRUE
WHERE r.is_active = TRUE
GROUP BY r.id, r.nom, r.code
ORDER BY population_totale DESC;

-- 7. Requête pour rechercher une localité par nom (avec index trigram)
SELECT 
    l.nom as localite,
    l.code as code_localite,
    l.type_localite,
    l.population,
    d.nom as departement,
    r.nom as region
FROM localites l
JOIN departements d ON l.id_departement = d.id
JOIN regions r ON d.id_region = r.id
WHERE l.nom ILIKE '%abidjan%' -- Recherche insensible à la casse
  AND l.is_active = TRUE
ORDER BY l.population DESC;

-- 8. Requête pour obtenir les agents d'une localité
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    a.email,
    a.telephone1,
    al.type_adresse,
    al.adresse_complete,
    al.is_principal
FROM agents a
JOIN agents_localites al ON a.id = al.id_agent
JOIN localites l ON al.id_localite = l.id
WHERE l.code = 'ABJ-01-001' -- Remplacer par le code de localité souhaité
  AND a.statut_emploi = 'actif'
ORDER BY al.is_principal DESC, a.nom;

-- 9. Requête pour obtenir les affectations en cours
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    ag.motif,
    ag.date_debut,
    ag.date_fin,
    ls.nom as localite_source,
    ld.nom as localite_destination,
    ag.statut
FROM agents a
JOIN affectations_geographiques ag ON a.id = ag.id_agent
LEFT JOIN localites ls ON ag.id_localite_source = ls.id
LEFT JOIN localites ld ON ag.id_localite_destination = ld.id
WHERE ag.statut = 'en_cours'
  AND ag.date_debut <= CURRENT_DATE
  AND (ag.date_fin IS NULL OR ag.date_fin >= CURRENT_DATE)
ORDER BY ag.date_debut DESC;

-- 10. Requête pour obtenir les statistiques d'utilisation des localités
SELECT 
    l.nom as localite,
    l.type_localite,
    l.population,
    COUNT(DISTINCT al.id_agent) as nombre_agents,
    COUNT(DISTINCT ag.id) as nombre_affectations
FROM localites l
LEFT JOIN agents_localites al ON l.id = al.id_localite
LEFT JOIN affectations_geographiques ag ON l.id = ag.id_localite_source OR l.id = ag.id_localite_destination
WHERE l.is_active = TRUE
GROUP BY l.id, l.nom, l.type_localite, l.population
ORDER BY nombre_agents DESC, l.population DESC;

