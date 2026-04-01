-- ===============================================================================
-- Script de mise à jour des affectations des agents
-- ===============================================================================
-- Basé sur les données du CSV - Colonne 43 (Direction)
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Mettre à jour id_direction pour les agents
-- ===============================================================================

-- CABINET
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 00 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) = 'CABINET';

-- CELLULE DE PASSATION DES MARCHES PUBLICS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 00 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%CELLULE%MARCHES%';

-- INSP. GEN. DU TOURISME ET DES LOISIRS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 05 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%INSP%GEN%';

-- DIRECTION DES AFFAIRES FINANCIERES
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 15 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%AFFAIRES FINANCIERES%';

-- DIRECTION DU GUICHET UNIQUE
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 20 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%GUICHET UNIQUE%';

-- DIRECTION DES RESSOURCES HUMAINES
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 25 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%RESSOURCES HUMAINES%'
   OR UPPER(TRIM(COALESCE(direction, ''))) = 'DRH';

-- DIR. COMMUNICATION ET DOCUMENTATION
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 30 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%COMMUNICATION%';

-- DIR. PLANIFICATION, STATISTIQ & PROJETS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 35 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PLANIFICATION%';

-- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 40 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%INFORMAT%DIGITAL%';

-- DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 45 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%AFFAIRES JURIDIQUES%';

-- DIR. SECURITE TOURISTIQUE ET DES LOISIRS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 50 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%SECURITE TOURISTIQUE%';

-- GESTIONNAIRE DU PATRIMOINE
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 55 00 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%GESTIONNAIRE%PATRIMOINE%';

-- DIRECTION DES ACTIVITES TOURISTIQUES
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 10 05 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%ACTIVITES TOURISTIQUES%';

-- DIR. COOPERATION ET PROFESSIONNALISATION
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 10 05 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%COOPERATION%PROFESSIONNAL%';

-- DIRECTION DES SERVICES EXTERIEURS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 10 05 15 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%SERVICES EXTERIEURS%';

-- DIR. PARCS DE LOISIRS
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 10 10 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PARCS%LOISIRS%';

-- DIR. VALOR., FORM. & PROMO JEUX TRADIT
UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 10 10 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%VALOR%JEUX%';

-- ===============================================================================
-- ETAPE 2: Mettre à jour id_direction_generale en fonction de la direction
-- ===============================================================================

-- Pour les agents affectés aux directions sous DG ITH
UPDATE public.agents a
SET id_direction_generale = (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1)
WHERE a.id_direction IN (
    SELECT id FROM public.directions 
    WHERE id_direction_generale = (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1)
);

-- Pour les agents affectés aux directions sous DG LOISIRS
UPDATE public.agents a
SET id_direction_generale = (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1)
WHERE a.id_direction IN (
    SELECT id FROM public.directions 
    WHERE id_direction_generale = (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1)
);

-- ===============================================================================
-- ETAPE 3: Mettre à jour id_sous_direction si l'info existe dans 'direction'
-- ===============================================================================

-- S/D DU BUDGET & DE LA COMPTABILITE
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 15 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%BUDGET%COMPTABILITE%';

-- S/D DES ETUDES ET CONTROLE DE GESTION
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 15 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%ETUDES%CONTROLE%GESTION%';

-- S/D DE L'INFORMATION ET SENSIBILISATION
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 20 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%INFORMATION%SENSIBILISATION%';

-- S/D SUIVI INVESTISSEMENT ET RECOUVREMENT
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 20 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%SUIVI INVESTISSEMENT%';

-- S/D SUIVI DES ACTES & AUTORISATIONS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 20 15 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%SUIVI%ACTES%AUTORISATIONS%';

-- S/D DE LA GESTION DU PERSONNEL
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 25 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%GESTION%PERSONNEL%';

-- S/D DE L'ACTION SOCIALE
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 25 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%ACTION SOCIALE%';

-- S/D DU RENFORCEMENT DES CAPACITES
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 25 15 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%RENFORCEMENT%CAPACITES%';

-- S/D DE LA DOCUMENTATION & DES ARCHIVES
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 30 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%DOCUMENTATION%ARCHIVES%';

-- S/D DE LA PRODUCTION ET DU DEV NUMERIQUE
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 30 15 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PRODUCTION%NUMERIQUE%';

-- S/D DE LA PLANIF & DES PROJETS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 35 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PLANIF%PROJETS%';

-- S/D DES STATISTIQUES
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 35 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%STATISTIQUES%';

-- S/D DE L'AMENAG, FONCIER TOUR ET LOISIRS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 35 15 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%AMENAG%FONCIER%';

-- S/D DE L'INFORMATIQUE
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 40 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%INFORMATIQUE%'
  AND UPPER(TRIM(COALESCE(direction, ''))) NOT LIKE '%DIGITAL%';

-- S/D DIGITALISATION ET DEVELOP STARTUPS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 40 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%DIGITALISATION%STARTUPS%';

-- SOUS-DIRECTION DE LA LEGISLATION
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 45 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%LEGISLATION%';

-- SOUS-DIRECTION DU CONTENTIEUX
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 45 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%CONTENTIEUX%';

-- S/D PREVENTION ET GESTION DES RISQUES
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 50 05 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PREVENTION%RISQUES%';

-- BRIGARDE TOURISTIQUE ET DES LOISIRS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 50 10 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%BRIGADE%TOURISTIQUE%';

-- S/D PROMO SECURITE TOUR ET DES LOISIRS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 05 50 15 00 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PROMO%SECURITE%';

-- S/D QUALITE, NORMALISATION ET CONTROLE
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 05 05 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%QUALITE%NORMALISATION%';

-- SOUS-DIRECTION DU TOURISME MEDICAL
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 05 10 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%TOURISME MEDICAL%';

-- S/D DE L'ENCADREMENT DES EXPLOITANTS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 05 15 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%ENCADREMENT%EXPLOITANTS%';

-- SOUS-DIRECTION DU TOURISME RELIGIEUX
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 05 20 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%TOURISME RELIGIEUX%';

-- SOUS-DIRECTION PROFESSIONNALISATION
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 10 05 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%PROFESSIONNALISATION%';

-- SOUS-DIRECTION DE LA COOPERATION
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 10 10 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%COOPERATION%'
  AND UPPER(TRIM(COALESCE(direction, ''))) NOT LIKE '%PROFESSIONNALISATION%';

-- SOUS-DIRECTION DES SERVICES DECONCENTRES
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 15 05 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%SERVICES DECONCENTRES%';

-- S/D BUREAUX DU TOURISME POUR ETRANGER
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 05 15 10 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%BUREAUX%TOURISME%ETRANGER%';

-- S/D INFRAST. , ESPACE & EQUIP DE LOISIRS
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 10 05 05 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%INFRAST%ESPACE%EQUIP%LOISIRS%';

-- SOUS-DIRECTION DES JEUX NUMERIQUES
UPDATE public.agents 
SET id_sous_direction = (SELECT id FROM public.sous_directions WHERE code = '47 10 10 05 10 00' LIMIT 1)
WHERE UPPER(TRIM(COALESCE(direction, ''))) LIKE '%JEUX NUMERIQUES%';

-- ===============================================================================
-- ETAPE 4: Mettre à jour id_direction si sous-direction trouvée
-- ===============================================================================

-- Si un agent a une sous-direction, mettre à jour sa direction
UPDATE public.agents a
SET id_direction = sd.id_direction
FROM public.sous_directions sd
WHERE a.id_sous_direction = sd.id
  AND a.id_direction IS NULL;

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
DECLARE
    v_total_agents INTEGER;
    v_agents_avec_dg INTEGER;
    v_agents_avec_direction INTEGER;
    v_agents_avec_sous_direction INTEGER;
    v_agents_sans_affectation INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_agents FROM public.agents;
    SELECT COUNT(*) INTO v_agents_avec_dg FROM public.agents WHERE id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_avec_direction FROM public.agents WHERE id_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_avec_sous_direction FROM public.agents WHERE id_sous_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_sans_affectation FROM public.agents 
    WHERE id_direction_generale IS NULL AND id_direction IS NULL AND id_sous_direction IS NULL AND id_service IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Mise à jour des affectations des agents terminée !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Statistiques:';
    RAISE NOTICE '   Total agents: %', v_total_agents;
    RAISE NOTICE '   Agents avec Direction Générale: % (%.1f%%)', 
        v_agents_avec_dg, 
        (v_agents_avec_dg::DECIMAL / NULLIF(v_total_agents, 0) * 100);
    RAISE NOTICE '   Agents avec Direction: % (%.1f%%)', 
        v_agents_avec_direction,
        (v_agents_avec_direction::DECIMAL / NULLIF(v_total_agents, 0) * 100);
    RAISE NOTICE '   Agents avec Sous-Direction: % (%.1f%%)', 
        v_agents_avec_sous_direction,
        (v_agents_avec_sous_direction::DECIMAL / NULLIF(v_total_agents, 0) * 100);
    RAISE NOTICE '   Agents sans affectation: % (%.1f%%)', 
        v_agents_sans_affectation,
        (v_agents_sans_affectation::DECIMAL / NULLIF(v_total_agents, 0) * 100);
    RAISE NOTICE '';
END $$;




















