-- Script de migration des grades, échelons et catégories depuis la table agents
-- vers les tables grades_agents, echelons_agents et categories_agents
-- 
-- Ce script migre les données existantes de id_grade, id_echelon et id_categorie
-- de la table agents vers les nouvelles tables d'historique

-- =====================================================
-- MIGRATION DES GRADES
-- =====================================================

-- Insérer les grades des agents dans grades_agents
-- Pour chaque agent qui a un id_grade non NULL et qui n'a pas déjà une entrée dans grades_agents
INSERT INTO grades_agents (id_agent, id_grade, id_nomination, date_entree, date_sortie)
SELECT 
    a.id as id_agent,
    a.id_grade,
    NULL as id_nomination,  -- Pas de nomination associée pour les données historiques
    COALESCE(
        a.date_embauche, 
        a.date_prise_service_au_ministere, 
        a.created_at::DATE,
        CURRENT_DATE
    ) as date_entree,
    NULL as date_sortie  -- Pas de date de sortie car ce sont les grades actuels
FROM agents a
WHERE a.id_grade IS NOT NULL
    -- Éviter les doublons : ne pas insérer si l'agent a déjà une entrée avec ce grade
    AND NOT EXISTS (
        SELECT 1 
        FROM grades_agents ga 
        WHERE ga.id_agent = a.id 
            AND ga.id_grade = a.id_grade
            AND ga.date_entree = COALESCE(
                a.date_embauche, 
                a.date_prise_service_au_ministere, 
                a.created_at::DATE,
                CURRENT_DATE
            )
    )
ORDER BY a.id;

-- Afficher le nombre de grades migrés
SELECT 
    COUNT(*) as nombre_grades_migres,
    'Grades migrés depuis la table agents vers grades_agents' as message
FROM grades_agents ga
WHERE ga.id_nomination IS NULL 
    AND ga.date_sortie IS NULL
    AND EXISTS (
        SELECT 1 
        FROM agents a 
        WHERE a.id = ga.id_agent 
            AND a.id_grade = ga.id_grade
    );

-- =====================================================
-- MIGRATION DES ÉCHELONS
-- =====================================================

-- Insérer les échelons des agents dans echelons_agents
-- Pour chaque agent qui a un id_echelon non NULL et qui n'a pas déjà une entrée dans echelons_agents
INSERT INTO echelons_agents (id_agent, id_echelon, id_nomination, date_entree, date_sortie)
SELECT 
    a.id as id_agent,
    a.id_echelon,
    NULL as id_nomination,  -- Pas de nomination associée pour les données historiques
    COALESCE(
        a.date_embauche, 
        a.date_prise_service_au_ministere, 
        a.created_at::DATE,
        CURRENT_DATE
    ) as date_entree,
    NULL as date_sortie  -- Pas de date de sortie car ce sont les échelons actuels
FROM agents a
WHERE a.id_echelon IS NOT NULL
    -- Éviter les doublons : ne pas insérer si l'agent a déjà une entrée avec cet échelon
    AND NOT EXISTS (
        SELECT 1 
        FROM echelons_agents ea 
        WHERE ea.id_agent = a.id 
            AND ea.id_echelon = a.id_echelon
            AND ea.date_entree = COALESCE(
                a.date_embauche, 
                a.date_prise_service_au_ministere, 
                a.created_at::DATE,
                CURRENT_DATE
            )
    )
ORDER BY a.id;

-- Afficher le nombre d'échelons migrés
SELECT 
    COUNT(*) as nombre_echelons_migres,
    'Échelons migrés depuis la table agents vers echelons_agents' as message
FROM echelons_agents ea
WHERE ea.id_nomination IS NULL 
    AND ea.date_sortie IS NULL
    AND EXISTS (
        SELECT 1 
        FROM agents a 
        WHERE a.id = ea.id_agent 
            AND a.id_echelon = ea.id_echelon
    );

-- =====================================================
-- RÉSUMÉ DE LA MIGRATION
-- =====================================================

-- Afficher un résumé complet
SELECT 
    'Résumé de la migration' as titre,
    (SELECT COUNT(*) FROM agents WHERE id_grade IS NOT NULL) as agents_avec_grade,
    (SELECT COUNT(*) FROM grades_agents) as total_grades_agents,
    (SELECT COUNT(*) FROM agents WHERE id_echelon IS NOT NULL) as agents_avec_echelon,
    (SELECT COUNT(*) FROM echelons_agents) as total_echelons_agents;

-- Vérification : agents avec grade mais sans entrée dans grades_agents
SELECT 
    a.id,
    a.nom,
    a.prenom,
    a.matricule,
    a.id_grade,
    'Agent avec grade mais sans entrée dans grades_agents' as probleme
FROM agents a
WHERE a.id_grade IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM grades_agents ga 
        WHERE ga.id_agent = a.id
    );

-- Vérification : agents avec échelon mais sans entrée dans echelons_agents
SELECT 
    a.id,
    a.nom,
    a.prenom,
    a.matricule,
    a.id_echelon,
    'Agent avec échelon mais sans entrée dans echelons_agents' as probleme
FROM agents a
WHERE a.id_echelon IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM echelons_agents ea 
        WHERE ea.id_agent = a.id
    );

-- =====================================================
-- MIGRATION DES CATÉGORIES
-- =====================================================

-- Insérer les catégories des agents dans categories_agents
-- Pour chaque agent qui a un id_categorie non NULL et qui n'a pas déjà une entrée dans categories_agents
INSERT INTO categories_agents (id_agent, id_categorie, id_nomination, date_entree, date_sortie)
SELECT 
    a.id as id_agent,
    a.id_categorie,
    NULL as id_nomination,  -- Pas de nomination associée pour les données historiques
    COALESCE(
        a.date_embauche, 
        a.date_prise_service_au_ministere, 
        a.created_at::DATE,
        CURRENT_DATE
    ) as date_entree,
    NULL as date_sortie  -- Pas de date de sortie car ce sont les catégories actuelles
FROM agents a
WHERE a.id_categorie IS NOT NULL
    -- Éviter les doublons : ne pas insérer si l'agent a déjà une entrée avec cette catégorie
    AND NOT EXISTS (
        SELECT 1 
        FROM categories_agents ca 
        WHERE ca.id_agent = a.id 
            AND ca.id_categorie = a.id_categorie
            AND ca.date_entree = COALESCE(
                a.date_embauche, 
                a.date_prise_service_au_ministere, 
                a.created_at::DATE,
                CURRENT_DATE
            )
    )
ORDER BY a.id;

-- Afficher le nombre de catégories migrées
SELECT 
    COUNT(*) as nombre_categories_migrees,
    'Catégories migrées depuis la table agents vers categories_agents' as message
FROM categories_agents ca
WHERE ca.id_nomination IS NULL 
    AND ca.date_sortie IS NULL
    AND EXISTS (
        SELECT 1 
        FROM agents a 
        WHERE a.id = ca.id_agent 
            AND a.id_categorie = ca.id_categorie
    );

-- =====================================================
-- RÉSUMÉ COMPLET DE LA MIGRATION
-- =====================================================

-- Afficher un résumé complet incluant les catégories
SELECT 
    'Résumé de la migration' as titre,
    (SELECT COUNT(*) FROM agents WHERE id_grade IS NOT NULL) as agents_avec_grade,
    (SELECT COUNT(*) FROM grades_agents) as total_grades_agents,
    (SELECT COUNT(*) FROM agents WHERE id_echelon IS NOT NULL) as agents_avec_echelon,
    (SELECT COUNT(*) FROM echelons_agents) as total_echelons_agents,
    (SELECT COUNT(*) FROM agents WHERE id_categorie IS NOT NULL) as agents_avec_categorie,
    (SELECT COUNT(*) FROM categories_agents) as total_categories_agents;

-- Vérification : agents avec catégorie mais sans entrée dans categories_agents
SELECT 
    a.id,
    a.nom,
    a.prenom,
    a.matricule,
    a.id_categorie,
    'Agent avec catégorie mais sans entrée dans categories_agents' as probleme
FROM agents a
WHERE a.id_categorie IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM categories_agents ca 
        WHERE ca.id_agent = a.id
    );

-- Message de fin
SELECT 'Migration terminée avec succès !' as message;

