-- ===============================================================================
-- Script de mise à jour des tables existantes
-- ===============================================================================
-- Ce script met à jour les données dans vos tables existantes
-- et crée les liens avec la nouvelle table direction_generale
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Mettre à jour les codes DIR/SER dans vos tables existantes
-- ===============================================================================

-- Mettre à jour les codes dans la table directions (si la colonne existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directions' AND column_name = 'code') THEN
        
        -- CABINET
        UPDATE public.directions SET code = '47 05 00 00 00 00' 
        WHERE UPPER(TRIM(libelle)) = 'CABINET' AND code IS NULL;
        
        -- CELLULE DE PASSATION DES MARCHES PUBLICS
        UPDATE public.directions SET code = '47 05 00 05 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%CELLULE%MARCHES%' AND code IS NULL;
        
        -- INSP. GEN. DU TOURISME ET DES LOISIRS
        UPDATE public.directions SET code = '47 05 05 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%INSP%GEN%' AND code IS NULL;
        
        -- DIRECTION DES AFFAIRES FINANCIERES
        UPDATE public.directions SET code = '47 05 15 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%AFFAIRES FINANCIERES%' AND code IS NULL;
        
        -- DIRECTION DU GUICHET UNIQUE
        UPDATE public.directions SET code = '47 05 20 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%GUICHET UNIQUE%' AND code IS NULL;
        
        -- DIRECTION DES RESSOURCES HUMAINES
        UPDATE public.directions SET code = '47 05 25 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%RESSOURCES HUMAINES%' AND code IS NULL;
        
        -- DIR. COMMUNICATION ET DOCUMENTATION
        UPDATE public.directions SET code = '47 05 30 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%COMMUNICATION%DOCUMENTATION%' AND code IS NULL;
        
        -- DIR. PLANIFICATION, STATISTIQ & PROJETS
        UPDATE public.directions SET code = '47 05 35 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%PLANIFICATION%' AND code IS NULL;
        
        -- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
        UPDATE public.directions SET code = '47 05 40 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%INFORMAT%DIGITAL%' AND code IS NULL;
        
        -- DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX
        UPDATE public.directions SET code = '47 05 45 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%AFFAIRES JURIDIQUES%' AND code IS NULL;
        
        -- DIR. SECURITE TOURISTIQUE ET DES LOISIRS
        UPDATE public.directions SET code = '47 05 50 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%SECURITE TOURISTIQUE%' AND code IS NULL;
        
        -- GESTIONNAIRE DU PATRIMOINE
        UPDATE public.directions SET code = '47 05 55 00 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%GESTIONNAIRE%PATRIMOINE%' AND code IS NULL;
        
        -- DIRECTION DES ACTIVITES TOURISTIQUES
        UPDATE public.directions SET code = '47 10 05 05 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%ACTIVITES TOURISTIQUES%' AND code IS NULL;
        
        -- DIR. COOPERATION ET PROFESSIONNALISATION
        UPDATE public.directions SET code = '47 10 05 10 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%COOPERATION%PROFESSIONNAL%' AND code IS NULL;
        
        -- DIRECTION DES SERVICES EXTERIEURS
        UPDATE public.directions SET code = '47 10 05 15 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%SERVICES EXTERIEURS%' AND code IS NULL;
        
        -- DIR. PARCS DE LOISIRS
        UPDATE public.directions SET code = '47 10 10 05 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%PARCS%LOISIRS%' AND code IS NULL;
        
        -- DIR. VALOR., FORM. & PROMO JEUX TRADIT
        UPDATE public.directions SET code = '47 10 10 10 00 00' 
        WHERE UPPER(TRIM(libelle)) LIKE '%VALOR%JEUX%' AND code IS NULL;
        
        RAISE NOTICE '✅ Codes DIR/SER mis à jour dans la table directions';
    ELSE
        RAISE NOTICE '⚠️  Colonne code non trouvée dans la table directions';
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 2: Lier les directions à leurs directions générales
-- ===============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directions' AND column_name = 'id_direction_generale') THEN
        
        -- Lier les directions à la DG ITH
        UPDATE public.directions 
        SET id_direction_generale = (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1)
        WHERE code IN ('47 10 05 05 00 00', '47 10 05 10 00 00', '47 10 05 15 00 00');
        
        -- Lier les directions à la DG LOISIRS
        UPDATE public.directions 
        SET id_direction_generale = (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1)
        WHERE code IN ('47 10 10 05 00 00', '47 10 10 10 00 00');
        
        RAISE NOTICE '✅ Directions liées à leurs Directions Générales';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction_generale non trouvée dans la table directions';
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 3: Lier les sous-directions à leurs directions
-- ===============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sous_directions' AND column_name = 'id_direction') THEN
        
        -- Exemple: lier S/D Budget à Direction Affaires Financières
        UPDATE public.sous_directions sd
        SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 15 00 00 00' LIMIT 1)
        WHERE UPPER(TRIM(sd.libelle)) LIKE '%BUDGET%COMPTABILITE%';
        
        -- Exemple: lier S/D Gestion Personnel à Direction RH
        UPDATE public.sous_directions sd
        SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 25 00 00 00' LIMIT 1)
        WHERE UPPER(TRIM(sd.libelle)) LIKE '%GESTION%PERSONNEL%';
        
        -- Note: Ajoutez d'autres mises à jour selon vos données
        
        RAISE NOTICE '✅ Sous-Directions liées à leurs Directions';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction non trouvée dans la table sous_directions';
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 4: Mettre à jour les agents
-- ===============================================================================

-- Mettre à jour les agents avec fonction "DG INDUSTRIE TOURISTIQUE ET HOTELIERE"
UPDATE public.agents a
SET id_direction_generale = (
    SELECT id FROM public.direction_generale 
    WHERE code = 'DG ITH' LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'fonction_actuelle'
)
AND (
    a.fonction_actuelle LIKE '%DG INDUSTRIE TOURISTIQUE%'
    OR a.fonction_actuelle LIKE '%DIRECTION GENERALE%INDUSTRIE%'
    OR a.fonction_actuelle LIKE '%DIRECTEUR GENERAL%INDUSTRIE%'
);

-- Mettre à jour les agents avec fonction "DIRECTION GENERALE DES LOISIRS"
UPDATE public.agents a
SET id_direction_generale = (
    SELECT id FROM public.direction_generale 
    WHERE code = 'DG LOISIRS' LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agents' AND column_name = 'fonction_actuelle'
)
AND (
    a.fonction_actuelle LIKE '%DIRECTION GENERALE%LOISIRS%'
    OR a.fonction_actuelle LIKE '%DIRECTEUR GENERAL%LOISIRS%'
);

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
DECLARE
    v_directions_avec_code INTEGER;
    v_directions_avec_dg INTEGER;
    v_sous_directions_avec_direction INTEGER;
    v_agents_avec_dg INTEGER;
BEGIN
    -- Compter les mises à jour
    SELECT COUNT(*) INTO v_directions_avec_code 
    FROM public.directions WHERE code IS NOT NULL;
    
    SELECT COUNT(*) INTO v_directions_avec_dg 
    FROM public.directions WHERE id_direction_generale IS NOT NULL;
    
    SELECT COUNT(*) INTO v_sous_directions_avec_direction 
    FROM public.sous_directions WHERE id_direction IS NOT NULL;
    
    SELECT COUNT(*) INTO v_agents_avec_dg 
    FROM public.agents WHERE id_direction_generale IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Mise à jour des tables existantes terminée !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Statistiques:';
    RAISE NOTICE '   Directions avec code DIR/SER: %', v_directions_avec_code;
    RAISE NOTICE '   Directions liées à une DG: %', v_directions_avec_dg;
    RAISE NOTICE '   Sous-Directions liées à une Direction: %', v_sous_directions_avec_direction;
    RAISE NOTICE '   Agents avec Direction Générale: %', v_agents_avec_dg;
END $$;




















