-- ===============================================================================
-- Script d'assignation des agents UNIQUEMENT (sans insertion de données)
-- ===============================================================================
-- Ce script assigne seulement les agents existants aux entités existantes
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Assigner les agents au CABINET
-- ===============================================================================

UPDATE public.agents 
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 00 00 00 00' 
       OR UPPER(libelle) LIKE '%CABINET%' 
    LIMIT 1
)
WHERE matricule IN (
    '503281V', '201957B', '272129B', '434689Y', '313044S', '366249Z', '460997T', 
    '861964X', '855878B', '826255V', '889566V', '468207P', '889425Q', '821007L',
    '856634X', '360923B', '504952W', '504954Y', '504956S', '982675X', '982907R',
    '982922F', '982953N', '982961N', '982982C', '982983D', '982984E', '982827G',
    '982864M', '982911C', '982918K', '982965J', '982994G', '982995H', '982996A',
    '982998L'
);

-- ===============================================================================
-- ETAPE 2: Assigner les agents à CELLULE DE PASSATION DES MARCHES PUBLICS
-- ===============================================================================

UPDATE public.agents 
SET id_direction = (
    SELECT id FROM public.directions 
    WHERE code = '47 05 00 05 00 00' 
       OR UPPER(libelle) LIKE '%CELLULE%MARCHES%'
    LIMIT 1
)
WHERE matricule IN (
    '323311U', '419669L', '811076N', '982971Q', '982985F'
);

-- ===============================================================================
-- ETAPE 3: Assigner automatiquement les DG via les directions
-- ===============================================================================

UPDATE public.agents a
SET id_direction_generale = d.id_direction_generale
FROM public.directions d
WHERE a.id_direction = d.id
  AND d.id_direction_generale IS NOT NULL
  AND a.id_direction_generale IS NULL;

-- ===============================================================================
-- Statistiques
-- ===============================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_dir INTEGER;
    v_dg INTEGER;
    v_sd INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM agents;
    SELECT COUNT(*) INTO v_dir FROM agents WHERE id_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_dg FROM agents WHERE id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_sd FROM agents WHERE id_sous_direction IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Assignation terminée !';
    RAISE NOTICE '   Total: % agents', v_total;
    RAISE NOTICE '   Direction: % (%.1f%%)', v_dir, (v_dir::DECIMAL / v_total * 100);
    RAISE NOTICE '   DG: % (%.1f%%)', v_dg, (v_dg::DECIMAL / v_total * 100);
    RAISE NOTICE '   S/D: % (%.1f%%)', v_sd, (v_sd::DECIMAL / v_total * 100);
    RAISE NOTICE '';
END $$;




















