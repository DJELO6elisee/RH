-- ===============================================================================
-- Script de mise à jour des agents avec leurs affectations
-- ===============================================================================
-- Ce script extrait les directions générales des fonctions et
-- met à jour les affectations des agents
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Mettre à jour id_direction_generale pour les agents
-- ayant une fonction de Direction Générale
-- ===============================================================================

-- Mettre à jour les agents avec fonction "DG INDUSTRIE TOURISTIQUE ET HOTELIERE"
UPDATE public.agents a
SET id_direction_generale = (
    SELECT id FROM public.direction_generale 
    WHERE code = 'DG ITH' LIMIT 1
)
WHERE a.fonction_actuelle LIKE '%DG INDUSTRIE TOURISTIQUE%'
   OR a.fonction_actuelle LIKE '%DIRECTION GENERALE%INDUSTRIE%'
   OR a.fonction_actuelle LIKE '%DIRECTEUR GENERAL%INDUSTRIE%';

-- Mettre à jour les agents avec fonction "DIRECTION GENERALE DES LOISIRS"
UPDATE public.agents a
SET id_direction_generale = (
    SELECT id FROM public.direction_generale 
    WHERE code = 'DG LOISIRS' LIMIT 1
)
WHERE a.fonction_actuelle LIKE '%DIRECTION GENERALE%LOISIRS%'
   OR a.fonction_actuelle LIKE '%DIRECTEUR GENERAL%LOISIRS%';

-- ===============================================================================
-- ETAPE 2: Mettre à jour id_direction pour les agents
-- en fonction de leur affectation (colonne Direction du CSV)
-- ===============================================================================

-- CABINET
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 00 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) = 'CABINET';

-- CELLULE DE PASSATION DES MARCHES PUBLICS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 00 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%CELLULE%MARCHES%';

-- INSP. GEN. DU TOURISME ET DES LOISIRS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 05 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%INSP%GEN%';

-- DIRECTION DES AFFAIRES FINANCIERES
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 15 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%AFFAIRES FINANCIERES%';

-- DIRECTION DU GUICHET UNIQUE
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 20 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%GUICHET UNIQUE%';

-- DIRECTION DES RESSOURCES HUMAINES
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 25 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%RESSOURCES HUMAINES%'
   OR UPPER(TRIM(a.affectation_direction)) = 'DRH';

-- DIR. COMMUNICATION ET DOCUMENTATION
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 30 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%COMMUNICATION%';

-- DIR. PLANIFICATION, STATISTIQ & PROJETS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 35 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%PLANIFICATION%';

-- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 40 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%INFORMAT%DIGITAL%';

-- DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 45 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%AFFAIRES JURIDIQUES%';

-- DIR. SECURITE TOURISTIQUE ET DES LOISIRS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 50 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%SECURITE TOURISTIQUE%';

-- GESTIONNAIRE DU PATRIMOINE
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 55 00 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%GESTIONNAIRE%PATRIMOINE%';

-- DIRECTION DES ACTIVITES TOURISTIQUES
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 10 05 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%ACTIVITES TOURISTIQUES%';

-- DIR. COOPERATION ET PROFESSIONNALISATION
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 10 05 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%COOPERATION%PROFESSIONNAL%';

-- DIRECTION DES SERVICES EXTERIEURS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 10 05 15 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%SERVICES EXTERIEURS%';

-- DIR. PARCS DE LOISIRS
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 10 10 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%PARCS%LOISIRS%';

-- DIR. VALOR., FORM. & PROMO JEUX TRADIT
UPDATE public.agents a
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 10 10 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_direction)) LIKE '%VALOR%JEUX%';

-- ===============================================================================
-- ETAPE 3: Mettre à jour id_sous_direction pour les agents
-- ===============================================================================

-- S/D DU BUDGET & DE LA COMPTABILITE
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 15 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%BUDGET%COMPTABILITE%';

-- S/D DES ETUDES ET CONTROLE DE GESTION
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 15 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%ETUDES%CONTROLE%GESTION%';

-- S/D DE L'INFORMATION ET SENSIBILISATION
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 20 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%INFORMATION%SENSIBILISATION%';

-- S/D SUIVI INVESTISSEMENT ET RECOUVREMENT
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 20 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%SUIVI INVESTISSEMENT%';

-- S/D SUIVI DES ACTES & AUTORISATIONS
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 20 15 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%SUIVI%ACTES%AUTORISATIONS%';

-- S/D DE LA GESTION DU PERSONNEL
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 25 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%GESTION%PERSONNEL%';

-- S/D DE L'ACTION SOCIALE
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 25 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%ACTION SOCIALE%';

-- S/D DU RENFORCEMENT DES CAPACITES
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 25 15 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%RENFORCEMENT%CAPACITES%';

-- S/D DE LA DOCUMENTATION & DES ARCHIVES
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 30 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%DOCUMENTATION%ARCHIVES%';

-- S/D DE LA PRODUCTION ET DU DEV NUMERIQUE
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 30 15 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%PRODUCTION%NUMERIQUE%';

-- S/D DE LA PLANIF & DES PROJETS
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 35 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%PLANIF%PROJETS%';

-- S/D DES STATISTIQUES
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 35 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%STATISTIQUES%';

-- S/D DE L'AMENAG, FONCIER TOUR ET LOISIRS
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 35 15 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%AMENAG%FONCIER%';

-- S/D DE L'INFORMATIQUE
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 40 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%INFORMATIQUE%'
  AND UPPER(TRIM(a.affectation_service)) NOT LIKE '%DIGITAL%';

-- S/D DIGITALISATION ET DEVELOP STARTUPS
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 40 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%DIGITALISATION%STARTUPS%';

-- SOUS-DIRECTION DE LA LEGISLATION
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 45 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%LEGISLATION%';

-- SOUS-DIRECTION DU CONTENTIEUX
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 45 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%CONTENTIEUX%';

-- S/D PREVENTION ET GESTION DES RISQUES
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 50 05 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%PREVENTION%RISQUES%';

-- BRIGARDE TOURISTIQUE ET DES LOISIRS
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 50 10 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%BRIGADE%TOURISTIQUE%';

-- S/D PROMO SECURITE TOUR ET DES LOISIRS
UPDATE public.agents a
SET id_sous_direction = (
    SELECT id FROM public.sous_directions 
    WHERE code = '47 05 50 15 00 00' LIMIT 1
)
WHERE UPPER(TRIM(a.affectation_service)) LIKE '%PROMO%SECURITE%';

-- ===============================================================================
-- ETAPE 4: Statistiques de mise à jour
-- ===============================================================================

DO $$
DECLARE
    v_agents_avec_dg INTEGER;
    v_agents_avec_direction INTEGER;
    v_agents_avec_sous_direction INTEGER;
    v_agents_sans_affectation INTEGER;
    v_total_agents INTEGER;
BEGIN
    -- Compter les agents
    SELECT COUNT(*) INTO v_total_agents FROM public.agents;
    SELECT COUNT(*) INTO v_agents_avec_dg FROM public.agents WHERE id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_avec_direction FROM public.agents WHERE id_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_avec_sous_direction FROM public.agents WHERE id_sous_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_sans_affectation FROM public.agents 
    WHERE id_direction_generale IS NULL AND id_direction IS NULL AND id_sous_direction IS NULL AND id_service IS NULL;
    
    RAISE NOTICE '✅ Mise à jour des affectations des agents terminée !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Statistiques:';
    RAISE NOTICE '   Total d''agents: %', v_total_agents;
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
END $$;

-- ===============================================================================
-- ETAPE 5: Créer une vue pour visualiser la hiérarchie complète
-- ===============================================================================

CREATE OR REPLACE VIEW v_hierarchie_complete AS
SELECT 
    a.id as agent_id,
    a.matricule,
    a.nom,
    a.prenom,
    a.fonction_actuelle,
    m.nom as ministere,
    dg.libelle as direction_generale,
    d.libelle as direction,
    sd.libelle as sous_direction,
    s.libelle as service
FROM public.agents a
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
LEFT JOIN public.direction_generale dg ON a.id_direction_generale = dg.id
LEFT JOIN public.directions d ON a.id_direction = d.id
LEFT JOIN public.sous_directions sd ON a.id_sous_direction = sd.id
LEFT JOIN public.services s ON a.id_service = s.id
ORDER BY m.nom, dg.libelle, d.libelle, sd.libelle, s.libelle, a.nom;

COMMENT ON VIEW v_hierarchie_complete IS 'Vue complète de la hiérarchie organisationnelle avec tous les agents';

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Vue v_hierarchie_complete créée avec succès !';
    RAISE NOTICE 'Utilisez: SELECT * FROM v_hierarchie_complete;';
END $$;

