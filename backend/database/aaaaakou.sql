-- Script SQL pour insérer 20 agents dans le Ministère 10
-- Noms et prénoms typiquement ivoiriens

-- INSERT INTO public.agents (
--     nom, 
--     prenom, 
--     matricule, 
--     sexe, 
--     id_ministere, 
--     id_civilite, 
--     id_situation_matrimoniale, 
--     id_nationalite, 
--     id_type_d_agent, 
--     statut_emploi, 
--     date_de_naissance,
--     created_at,
--     updated_at
-- ) VALUES 
-- ('KOUASSI', 'Jean-Philippe', 'MT-100001', 'M', 10, 1, 1, 1, 1, 'actif', '1985-05-12', NOW(), NOW()),
-- ('KONÉ', 'Mariam', 'MT-100002', 'F', 10, 2, 2, 1, 1, 'actif', '1990-03-24', NOW(), NOW()),
-- ('TRAORÉ', 'Ibrahim', 'MT-100003', 'M', 10, 1, 1, 1, 1, 'actif', '1982-11-05', NOW(), NOW()),
-- ('COULIBALY', 'Fatoumata', 'MT-100004', 'F', 10, 2, 1, 1, 1, 'actif', '1988-07-15', NOW(), NOW()),
-- ('BAKAYOKO', 'Youssouf', 'MT-100005', 'M', 10, 1, 1, 1, 1, 'actif', '1980-09-30', NOW(), NOW()),
-- ('YAO', 'Kouamé N''Guessan', 'MT-100006', 'M', 10, 1, 3, 1, 1, 'actif', '1992-01-18', NOW(), NOW()),
-- ('DIARRASSOUBA', 'Adama', 'MT-100007', 'M', 10, 1, 1, 1, 1, 'actif', '1987-12-02', NOW(), NOW()),
-- ('TOURÉ', 'Sékou', 'MT-100008', 'M', 10, 1, 2, 1, 1, 'actif', '1984-06-21', NOW(), NOW()),
-- ('GNAORÉ', 'Désirée', 'MT-100009', 'F', 10, 2, 1, 1, 1, 'actif', '1991-04-10', NOW(), NOW()),
-- ('DIALLO', 'Abdoulaye', 'MT-100010', 'M', 10, 1, 1, 1, 1, 'actif', '1983-08-08', NOW(), NOW()),
-- ('OUATTARA', 'Alassane Serge', 'MT-100011', 'M', 10, 1, 1, 1, 1, 'actif', '1986-10-14', NOW(), NOW()),
-- ('BOHUI', 'Gbogbo Paul', 'MT-100012', 'M', 10, 1, 1, 1, 1, 'actif', '1979-02-27', NOW(), NOW()),
-- ('SYLLA', 'Moussa', 'MT-100013', 'M', 10, 1, 2, 1, 1, 'actif', '1993-05-19', NOW(), NOW()),
-- ('KOFFI', 'Amoin Carine', 'MT-100014', 'F', 10, 2, 1, 1, 1, 'actif', '1989-11-30', NOW(), NOW()),
-- ('DAGO', 'Ange-Marie', 'MT-100015', 'F', 10, 2, 3, 1, 1, 'actif', '1995-07-04', NOW(), NOW()),
-- ('CAMARA', 'Sidiki', 'MT-100016', 'M', 10, 1, 1, 1, 1, 'actif', '1981-01-11', NOW(), NOW()),
-- ('MEITÉ', 'Souleymane', 'MT-100017', 'M', 10, 1, 1, 1, 1, 'actif', '1984-03-16', NOW(), NOW()),
-- ('KEITA', 'Fanta', 'MT-100018', 'F', 10, 2, 2, 1, 1, 'actif', '1990-09-22', NOW(), NOW()),
-- ('AMANI', 'Kouassi Olivier', 'MT-100019', 'M', 10, 1, 1, 1, 1, 'actif', '1982-08-14', NOW(), NOW()),
-- ('CISBÉ', 'Amadou', 'MT-100020', 'M', 10, 1, 1, 1, 1, 'actif', '1988-12-25', NOW(), NOW());

-- Script de mise à jour des dates de retraite pour les 20 nouveaux agents
-- Basé sur la règle : Année de naissance + 60 ans, au 31 décembre.

-- UPDATE public.agents
-- SET 
--     date_retraite = MAKE_DATE(
--         EXTRACT(YEAR FROM date_de_naissance)::INTEGER + 60, 
--         12, 
--         31
--     ),
--     updated_at = NOW()
-- WHERE id_ministere = 10 
--   AND matricule LIKE 'MT-1000%';

-- Vérification des résultats
-- SELECT 
--     nom, 
--     prenom, 
--     matricule, 
--     date_de_naissance, 
--     date_retraite 
-- FROM public.agents 
-- WHERE id_ministere = 10 
--   AND matricule LIKE 'MT-1000%';

-- Mise à jour des dates de retraite pour le Ministère 10
-- Basé sur le grade actuel de l'agent

UPDATE public.agents a
SET 
    date_retraite = MAKE_DATE(
        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + (
            CASE 
                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                ELSE 60
            END
        ), 
        12, 
        31
    ),
    updated_at = NOW()
FROM public.grades g
WHERE a.id_grade = g.id
  AND a.id_ministere = 10;

-- Note : Si vos agents utilisent le champ grade_prefectoral (ID numérique pointant vers grades)
-- décommentez et utilisez ce bloc à la place du précédent :
/*
UPDATE public.agents a
SET 
    date_retraite = MAKE_DATE(
        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + (
            CASE 
                WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
                ELSE 60
            END
        ), 
        12, 
        31
    ),
    updated_at = NOW()
FROM public.grades g
WHERE a.grade_prefectoral ~ '^[0-9]+$' 
  AND a.grade_prefectoral::INTEGER = g.id
  AND a.id_ministere = 10;
*/

-- Vérification des mises à jour
SELECT 
    a.nom, 
    a.prenom, 
    a.matricule, 
    g.libele as grade,
    a.date_de_naissance, 
    a.date_retraite 
FROM public.agents a
JOIN public.grades g ON a.id_grade = g.id
WHERE a.id_ministere = 10
ORDER BY a.nom, a.prenom;
