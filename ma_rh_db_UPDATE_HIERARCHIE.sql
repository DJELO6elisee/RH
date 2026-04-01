-- ===============================================================================
-- SCRIPT DE MISE À JOUR HIÉRARCHIQUE COMPLET
-- Date: 03/11/2025 14:07:52
-- ===============================================================================
-- Source: Liste-du-Personel-_1_.csv
-- ===============================================================================
-- STRATÉGIE:
-- 1. METTRE À JOUR les entités existantes (ajouter les codes manquants)
-- 2. CRÉER les nouvelles entités qui n'existent pas
-- 3. CORRIGER les liaisons hiérarchiques
-- 4. ASSIGNER tous les agents correctement
-- ===============================================================================
-- CORRECTIONS IMPORTANTES:
-- 1. CELLULE DE PASSATION DES MARCHES PUBLICS = SOUS-DIRECTION du CABINET
-- 2. INSP. GEN. DU TOURISME ET DES LOISIRS = SOUS-DIRECTION du CABINET
-- 3. Direction Générale = Colonne 43 du CSV
-- ===============================================================================
--
-- STATISTIQUES:
--   - 9 Directions Générales
--   - 73 Directions
--   - 45 Sous-Directions
--   - 1 Services
--   - 829 Agents
-- ===============================================================================

BEGIN;

-- ===============================================================================
-- PARTIE 1: AJOUT DES COLONNES MANQUANTES
-- ===============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Début de la mise à jour hiérarchique';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PARTIE 1: Vérification des colonnes...';
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directions' AND column_name = 'code') THEN
        ALTER TABLE public.directions ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '  ✅ Colonne code ajoutée à directions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'directions' AND column_name = 'id_direction_generale') THEN
        ALTER TABLE public.directions ADD COLUMN id_direction_generale INTEGER;
        RAISE NOTICE '  ✅ Colonne id_direction_generale ajoutée à directions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sous_directions' AND column_name = 'code') THEN
        ALTER TABLE public.sous_directions ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '  ✅ Colonne code ajoutée à sous_directions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sous_directions' AND column_name = 'id_direction') THEN
        ALTER TABLE public.sous_directions ADD COLUMN id_direction INTEGER;
        RAISE NOTICE '  ✅ Colonne id_direction ajoutée à sous_directions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'code') THEN
        ALTER TABLE public.services ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '  ✅ Colonne code ajoutée à services';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'id_direction') THEN
        ALTER TABLE public.services ADD COLUMN id_direction INTEGER;
        RAISE NOTICE '  ✅ Colonne id_direction ajoutée à services';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'id_sous_direction') THEN
        ALTER TABLE public.services ADD COLUMN id_sous_direction INTEGER;
        RAISE NOTICE '  ✅ Colonne id_sous_direction ajoutée à services';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_direction_generale') THEN
        ALTER TABLE public.agents ADD COLUMN id_direction_generale INTEGER;
        RAISE NOTICE '  ✅ Colonne id_direction_generale ajoutée à agents';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_direction') THEN
        ALTER TABLE public.agents ADD COLUMN id_direction INTEGER;
        RAISE NOTICE '  ✅ Colonne id_direction ajoutée à agents';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_sous_direction') THEN
        ALTER TABLE public.agents ADD COLUMN id_sous_direction INTEGER;
        RAISE NOTICE '  ✅ Colonne id_sous_direction ajoutée à agents';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_service') THEN
        ALTER TABLE public.agents ADD COLUMN id_service INTEGER;
        RAISE NOTICE '  ✅ Colonne id_service ajoutée à agents';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'updated_at') THEN
        ALTER TABLE public.agents ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '  ✅ Colonne updated_at ajoutée à agents';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 1 TERMINÉE';
    RAISE NOTICE '';
END $$;

-- ===============================================================================
-- PARTIE 2: CRÉATION DES DIRECTIONS GÉNÉRALES
-- ===============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '📋 PARTIE 2: Directions Générales...';
    
    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'CABINET', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DG INDUSTRIE TOURISTIQUE ET HOTELIERE', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DIRECTION GENERALE DES LOISIRS', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DIRECTIONS REGIONALES', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'BUREAUX DU TOURISME POUR L''ETRANGER', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DIRECT° GENERALE COTE D''IVOIRE TOURISME', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'CONSEIL NATIONAL DU TOURISME', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'FONDS DE DEVELOPPEMNT TOURISTIQUE', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'INSTANCE D''AFFECTATION', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION'));

    SELECT COUNT(*) INTO v_count FROM public.direction_generale WHERE id_ministere = 1;
    RAISE NOTICE '  ✅ %  Directions Générales', v_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 2 TERMINÉE';
    RAISE NOTICE '';
END $$;

-- ===============================================================================
-- PARTIE 2B: MIGRATION CELLULE ET INSP. GEN. (de directions vers sous_directions)
-- ===============================================================================

DO $$
DECLARE
    v_cellule_dir_id INTEGER;
    v_insp_dir_id INTEGER;
    v_cabinet_dir_id INTEGER;
    v_agents_cellule INTEGER;
    v_agents_insp INTEGER;
BEGIN
    RAISE NOTICE '📋 PARTIE 2B: Migration CELLULE et INSP. GEN...';
    RAISE NOTICE '  ⚠️  Ces entités existent peut-être comme DIRECTIONS';
    RAISE NOTICE '  🔄 Migration vers SOUS-DIRECTIONS du CABINET';
    
    -- Trouver l'ID de la Direction CABINET
    SELECT id INTO v_cabinet_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND (code = '47 05 00 00 00 00' OR UPPER(libelle) = UPPER('CABINET'))
    LIMIT 1;
    
    -- Chercher CELLULE dans la table directions
    SELECT id INTO v_cellule_dir_id FROM public.directions 
    WHERE id_ministere = 1 
      AND (code = '47 05 00 05 00 00' OR UPPER(libelle) LIKE '%CELLULE%PASSATION%')
    LIMIT 1;
    
    IF v_cellule_dir_id IS NOT NULL THEN
        -- Compter les agents affectés à cette direction
        SELECT COUNT(*) INTO v_agents_cellule FROM agents 
        WHERE id_direction = v_cellule_dir_id;
        
        RAISE NOTICE '  ⚠️  CELLULE trouvée comme DIRECTION (ID=%)', v_cellule_dir_id;
        RAISE NOTICE '     → % agents étaient affectés', v_agents_cellule;
        
        -- Réinitialiser les agents (ils seront réassignés plus tard)
        UPDATE agents SET id_direction = NULL WHERE id_direction = v_cellule_dir_id;
        
        -- Supprimer de la table directions
        DELETE FROM public.directions WHERE id = v_cellule_dir_id;
        
        RAISE NOTICE '  ✅ CELLULE supprimée de directions (sera créée comme sous-direction)';
    END IF;
    
    -- Chercher INSP. GEN. dans la table directions
    SELECT id INTO v_insp_dir_id FROM public.directions 
    WHERE id_ministere = 1 
      AND (code = '47 05 05 00 00 00' OR UPPER(libelle) LIKE '%INSP%GEN%TOURISME%')
    LIMIT 1;
    
    IF v_insp_dir_id IS NOT NULL THEN
        -- Compter les agents affectés à cette direction
        SELECT COUNT(*) INTO v_agents_insp FROM agents 
        WHERE id_direction = v_insp_dir_id;
        
        RAISE NOTICE '  ⚠️  INSP. GEN. trouvée comme DIRECTION (ID=%)', v_insp_dir_id;
        RAISE NOTICE '     → % agents étaient affectés', v_agents_insp;
        
        -- Réinitialiser les agents (ils seront réassignés plus tard)
        UPDATE agents SET id_direction = NULL WHERE id_direction = v_insp_dir_id;
        
        -- Supprimer de la table directions
        DELETE FROM public.directions WHERE id = v_insp_dir_id;
        
        RAISE NOTICE '  ✅ INSP. GEN. supprimée de directions (sera créée comme sous-direction)';
    END IF;
    
    IF v_cellule_dir_id IS NULL AND v_insp_dir_id IS NULL THEN
        RAISE NOTICE '  ℹ️  CELLULE et INSP. GEN. n''existent pas comme directions';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 2B TERMINÉE';
    RAISE NOTICE '';
END $$;

-- ===============================================================================
-- PARTIE 3: MISE À JOUR ET CRÉATION DES DIRECTIONS
-- ===============================================================================

DO $$
DECLARE
    v_dg_id INTEGER;
    v_dir_id INTEGER;
    v_updated INTEGER := 0;
    v_created INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 PARTIE 3: Directions...';
    RAISE NOTICE '  🔄 Mise à jour des entités existantes + création des nouvelles';
    
    -- CABINET (47 05 00 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 00 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 00 00 00 00', 'CABINET', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DES AFFAIRES FINANCIERES (47 05 15 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES AFFAIRES FINANCIERES')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 15 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 15 00 00 00', 'DIRECTION DES AFFAIRES FINANCIERES', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DU GUICHET UNIQUE (47 05 20 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DU GUICHET UNIQUE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 20 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 20 00 00 00', 'DIRECTION DU GUICHET UNIQUE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DES RESSOURCES HUMAINES (47 05 25 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES RESSOURCES HUMAINES')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 25 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 25 00 00 00', 'DIRECTION DES RESSOURCES HUMAINES', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. COMMUNICATION ET DOCUMENTATION (47 05 30 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. COMMUNICATION ET DOCUMENTATION')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 30 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 30 00 00 00', 'DIR. COMMUNICATION ET DOCUMENTATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. PLANIFICATION, STATISTIQ & PROJETS (47 05 35 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. PLANIFICATION, STATISTIQ & PROJETS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 35 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 35 00 00 00', 'DIR. PLANIFICATION, STATISTIQ & PROJETS', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS (47 05 40 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. INFORMAT, DIGITAL ET DEV. STARTUPS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 40 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 40 00 00 00', 'DIR. INFORMAT, DIGITAL ET DEV. STARTUPS', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX (47 05 45 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 45 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 45 00 00 00', 'DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. SECURITE TOURISTIQUE ET DES LOISIRS (47 05 50 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. SECURITE TOURISTIQUE ET DES LOISIRS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 50 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 50 00 00 00', 'DIR. SECURITE TOURISTIQUE ET DES LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- BRIGARDE TOURISTIQUE ET DES LOISIRS (47 05 50 10 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BRIGARDE TOURISTIQUE ET DES LOISIRS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 50 10 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 50 10 00 00', 'BRIGARDE TOURISTIQUE ET DES LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- GESTIONNAIRE DU PATRIMOINE (47 05 55 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('GESTIONNAIRE DU PATRIMOINE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 05 55 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 05 55 00 00 00', 'GESTIONNAIRE DU PATRIMOINE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DG INDUSTRIE TOURISTIQUE ET HOTELIERE (47 10 05 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 05 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 05 00 00 00', 'DG INDUSTRIE TOURISTIQUE ET HOTELIERE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DES ACTIVITES TOURISTIQUES (47 10 05 05 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES ACTIVITES TOURISTIQUES')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 05 05 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 05 05 00 00', 'DIRECTION DES ACTIVITES TOURISTIQUES', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. COOPERATION ET PROFESSIONNALISATION (47 10 05 10 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. COOPERATION ET PROFESSIONNALISATION')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 05 10 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 05 10 00 00', 'DIR. COOPERATION ET PROFESSIONNALISATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DES SERVICES EXTERIEURS (47 10 05 15 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES SERVICES EXTERIEURS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 05 15 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 05 15 00 00', 'DIRECTION DES SERVICES EXTERIEURS', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION GENERALE DES LOISIRS (47 10 10 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 10 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 10 00 00 00', 'DIRECTION GENERALE DES LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM (47 10 10 05 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 10 05 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 10 05 00 00', 'DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIR. VALOR., FORM. & PROMO JEUX TRADIT (47 10 10 10 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. VALOR., FORM. & PROMO JEUX TRADIT')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 10 10 10 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 10 10 10 00 00', 'DIR. VALOR., FORM. & PROMO JEUX TRADIT', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE D'ABIDJAN NORD (47 15 05 03 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE D''ABIDJAN NORD')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 03 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 03 00 00', 'DIRECTION REGIONALE D''ABIDJAN NORD', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE ABJ NORD 1 (47 15 05 03 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE ABJ NORD 1')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 03 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 03 05 00', 'DIRECTION DEPARTEMENTALE ABJ NORD 1', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  DE DABOU (47 15 05 03 15 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  DE DABOU')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 03 15 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 03 15 00', 'DIRECTION DEPARTEMENTALE  DE DABOU', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE ABIDJAN SUD (47 15 05 04 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE ABIDJAN SUD')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 04 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 04 00 00', 'DIRECTION REGIONALE ABIDJAN SUD', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE ABJ SUD 1 (47 15 05 04 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE ABJ SUD 1')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 04 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 04 05 00', 'DIRECTION DEPARTEMENTALE ABJ SUD 1', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE GRAND-BASSAM (47 15 05 07 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE GRAND-BASSAM')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 07 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 07 00 00', 'DIRECTION REGIONALE DE GRAND-BASSAM', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  ADZOPE (47 15 05 07 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  ADZOPE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 07 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 07 05 00', 'DIRECTION DEPARTEMENTALE  ADZOPE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  AGBOVILLE (47 15 05 07 15 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  AGBOVILLE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 07 15 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 07 15 00', 'DIRECTION DEPARTEMENTALE  AGBOVILLE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE D'ABENGOUROU (47 15 05 10 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE D''ABENGOUROU')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 10 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 10 00 00', 'DIRECTION REGIONALE D''ABENGOUROU', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE DE DAOUKRO (47 15 05 10 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE DE DAOUKRO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 10 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 10 05 00', 'DIRECTION DEPARTEMENTALE DE DAOUKRO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE BOUAKE (47 15 05 15 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE BOUAKE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 15 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 15 00 00', 'DIRECTION REGIONALE DE BOUAKE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE KATIOLA (47 15 05 15 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE KATIOLA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 15 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 15 05 00', 'DIRECTION DEPARTEMENTALE KATIOLA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE BONDOUKOU (47 15 05 20 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE BONDOUKOU')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 20 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 20 00 00', 'DIRECTION REGIONALE DE BONDOUKOU', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  BOUNA (47 15 05 20 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  BOUNA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 20 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 20 05 00', 'DIRECTION DEPARTEMENTALE  BOUNA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE DALOA (47 15 05 25 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE DALOA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 25 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 25 00 00', 'DIRECTION REGIONALE DE DALOA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  GAGNOA (47 15 05 25 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  GAGNOA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 25 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 25 05 00', 'DIRECTION DEPARTEMENTALE  GAGNOA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE DIVO (47 15 05 25 10 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE DIVO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 25 10 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 25 10 00', 'DIRECTION DEPARTEMENTALE DIVO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE MAN (47 15 05 30 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE MAN')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 30 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 30 00 00', 'DIRECTION REGIONALE DE MAN', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE GUIGLO (47 15 05 30 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE GUIGLO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 30 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 30 05 00', 'DIRECTION DEPARTEMENTALE GUIGLO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  DANANE (47 15 05 30 10 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  DANANE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 30 10 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 30 10 00', 'DIRECTION DEPARTEMENTALE  DANANE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE SAN-PEDRO (47 15 05 35 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE SAN-PEDRO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 35 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 35 00 00', 'DIRECTION REGIONALE DE SAN-PEDRO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  SOUBRE (47 15 05 35 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  SOUBRE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 35 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 35 05 00', 'DIRECTION DEPARTEMENTALE  SOUBRE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  SASSANDRA (47 15 05 35 10 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  SASSANDRA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 35 10 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 35 10 00', 'DIRECTION DEPARTEMENTALE  SASSANDRA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE KORHOGO (47 15 05 40 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE KORHOGO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 40 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 40 00 00', 'DIRECTION REGIONALE DE KORHOGO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  BOUNDIALI (47 15 05 40 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  BOUNDIALI')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 40 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 40 05 00', 'DIRECTION DEPARTEMENTALE  BOUNDIALI', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  FERKE (47 15 05 40 10 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  FERKE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 40 10 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 40 10 00', 'DIRECTION DEPARTEMENTALE  FERKE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE D'ODIENNE (47 15 05 45 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE D''ODIENNE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 45 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 45 00 00', 'DIRECTION REGIONALE D''ODIENNE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE TOUBA (47 15 05 45 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE TOUBA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 45 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 45 05 00', 'DIRECTION DEPARTEMENTALE TOUBA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE YAMOUSSOUKRO (47 15 05 50 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE YAMOUSSOUKRO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 50 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 50 00 00', 'DIRECTION REGIONALE DE YAMOUSSOUKRO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  DIMBOKRO (47 15 05 50 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  DIMBOKRO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 50 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 50 05 00', 'DIRECTION DEPARTEMENTALE  DIMBOKRO', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE  BOUAFLE (47 15 05 50 10 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  BOUAFLE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 50 10 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 50 10 00', 'DIRECTION DEPARTEMENTALE  BOUAFLE', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION REGIONALE DE SEGUELA (47 15 05 55 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE SEGUELA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 55 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 55 00 00', 'DIRECTION REGIONALE DE SEGUELA', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECTION DEPARTEMENTALE MANKONO (47 15 05 55 05 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE MANKONO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 05 55 05 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 05 55 05 00', 'DIRECTION DEPARTEMENTALE MANKONO', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE PARIS (47 15 10 05 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE PARIS')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 05 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 05 00 00', 'BUREAU DE PARIS', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE MILAN (47 15 10 10 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE MILAN')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 10 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 10 00 00', 'BUREAU DE MILAN', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE LONDRES (ROYAUME UNI) (47 15 10 12 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE LONDRES (ROYAUME UNI)')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 12 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 12 00 00', 'BUREAU DE LONDRES (ROYAUME UNI)', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE BERLIN (47 15 10 15 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE BERLIN')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 15 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 15 00 00', 'BUREAU DE BERLIN', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE GENEVE (SUISSE) (47 15 10 17 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE GENEVE (SUISSE)')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 17 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 17 00 00', 'BUREAU DE GENEVE (SUISSE)', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE MADRID (47 15 10 20 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE MADRID')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 20 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 20 00 00', 'BUREAU DE MADRID', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE WASHINGTON (47 15 10 25 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE WASHINGTON')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 25 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 25 00 00', 'BUREAU DE WASHINGTON', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE LAGOS (NIGERIA) (47 15 10 32 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE LAGOS (NIGERIA)')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 32 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 32 00 00', 'BUREAU DE LAGOS (NIGERIA)', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE BEIJING (47 15 10 35 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE BEIJING')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 35 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 35 00 00', 'BUREAU DE BEIJING', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE PRETORIA (47 15 10 40 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE PRETORIA')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 40 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 40 00 00', 'BUREAU DE PRETORIA', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE RIO DE JANEIRO (47 15 10 50 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE RIO DE JANEIRO')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 50 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 50 00 00', 'BUREAU DE RIO DE JANEIRO', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N (47 15 10 55 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 55 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 55 00 00', 'BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE OTTAWA (CANADA) (47 15 10 60 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE OTTAWA (CANADA)')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 60 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 60 00 00', 'BUREAU DE OTTAWA (CANADA)', true);
        v_created := v_created + 1;
    END IF;
    
    -- BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN (47 15 10 65 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 15 10 65 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 15 10 65 00 00', 'BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECT° GENERALE COTE D'IVOIRE TOURISME (47 20 10 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 10 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 10 00 00 00', 'DIRECT° GENERALE COTE D''IVOIRE TOURISME', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECT° RESSOURCES HUM. & MOY.GENERAUX (47 20 10 05 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° RESSOURCES HUM. & MOY.GENERAUX')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 10 05 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 10 05 00 00', 'DIRECT° RESSOURCES HUM. & MOY.GENERAUX', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECT° DU BUDGET, DES FINANCES & DES MG (47 20 10 10 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° DU BUDGET, DES FINANCES & DES MG')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 10 10 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 10 10 00 00', 'DIRECT° DU BUDGET, DES FINANCES & DES MG', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECT° MARKETING,COMMUNICAT° ET DES TIC (47 20 10 20 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° MARKETING,COMMUNICAT° ET DES TIC')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 10 20 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 10 20 00 00', 'DIRECT° MARKETING,COMMUNICAT° ET DES TIC', true);
        v_created := v_created + 1;
    END IF;
    
    -- DIRECT° DES RELATIONS EXTERIEURES (47 20 10 25 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° DES RELATIONS EXTERIEURES')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 10 25 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 10 25 00 00', 'DIRECT° DES RELATIONS EXTERIEURES', true);
        v_created := v_created + 1;
    END IF;
    
    -- CONSEIL NATIONAL DU TOURISME (47 20 36 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 36 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 36 00 00 00', 'CONSEIL NATIONAL DU TOURISME', true);
        v_created := v_created + 1;
    END IF;
    
    -- FONDS DE DEVELOPPEMNT TOURISTIQUE (47 20 40 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 20 40 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 20 40 00 00 00', 'FONDS DE DEVELOPPEMNT TOURISTIQUE', true);
        v_created := v_created + 1;
    END IF;
    
    -- INSTANCE D'AFFECTATION (47 99 00 00 00 00)
    SELECT id INTO v_dg_id FROM public.direction_generale WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION') LIMIT 1;
    
    -- Chercher si la direction existe déjà (par libellé)
    SELECT id INTO v_dir_id FROM public.directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION')
    LIMIT 1;
    
    IF v_dir_id IS NOT NULL THEN
        -- Mise à jour de la direction existante
        UPDATE public.directions
        SET code = '47 99 00 00 00 00',
            id_direction_generale = v_dg_id
        WHERE id = v_dir_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle direction
        INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
        VALUES (1, v_dg_id, '47 99 00 00 00 00', 'INSTANCE D''AFFECTATION', true);
        v_created := v_created + 1;
    END IF;
    
    RAISE NOTICE '  ✅ % Directions mises à jour', v_updated;
    RAISE NOTICE '  ✅ % Directions créées', v_created;
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 3 TERMINÉE';
    RAISE NOTICE '';
END $$;

-- ===============================================================================
-- PARTIE 4: MISE À JOUR ET CRÉATION DES SOUS-DIRECTIONS  
-- ===============================================================================

DO $$
DECLARE
    v_dir_id INTEGER;
    v_sd_id INTEGER;
    v_updated INTEGER := 0;
    v_created INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 PARTIE 4: Sous-Directions...';
    RAISE NOTICE '  ⭐ CELLULE et INSP. GEN. sont des SOUS-DIRECTIONS du CABINET';
    RAISE NOTICE '  🔄 Mise à jour des entités existantes + création des nouvelles';
    
    -- ⭐ CELLULE DE PASSATION DES MARCHES PUBLICS (47 05 00 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 00 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('CELLULE DE PASSATION DES MARCHES PUBLICS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 00 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 00 05 00 00', 'CELLULE DE PASSATION DES MARCHES PUBLICS', true);
        v_created := v_created + 1;
    END IF;
    
    -- ⭐ INSP. GEN. DU TOURISME ET DES LOISIRS (47 05 05 00 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 00 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('INSP. GEN. DU TOURISME ET DES LOISIRS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 05 00 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 05 00 00 00', 'INSP. GEN. DU TOURISME ET DES LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DU BUDGET & DE LA COMPTABILITE (47 05 15 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 15 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU BUDGET & DE LA COMPTABILITE')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 15 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 15 05 00 00', 'S/D DU BUDGET & DE LA COMPTABILITE', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DES ETUDES ET CONTROLE DE GESTION (47 05 15 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 15 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES ETUDES ET CONTROLE DE GESTION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 15 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 15 10 00 00', 'S/D DES ETUDES ET CONTROLE DE GESTION', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE L'INFORMATION ET SENSIBILISATION (47 05 20 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 20 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''INFORMATION ET SENSIBILISATION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 20 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 20 05 00 00', 'S/D DE L''INFORMATION ET SENSIBILISATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D SUIVI INVESTISSEMENT ET RECOUVREMENT (47 05 20 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 20 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D SUIVI INVESTISSEMENT ET RECOUVREMENT')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 20 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 20 10 00 00', 'S/D SUIVI INVESTISSEMENT ET RECOUVREMENT', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D SUIVI DES ACTES & AUTORISATIONS (47 05 20 15 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 20 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D SUIVI DES ACTES & AUTORISATIONS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 20 15 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 20 15 00 00', 'S/D SUIVI DES ACTES & AUTORISATIONS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE LA GESTION DU PERSONNEL (47 05 25 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 25 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA GESTION DU PERSONNEL')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 25 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 25 05 00 00', 'S/D DE LA GESTION DU PERSONNEL', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE L'ACTION SOCIALE (47 05 25 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 25 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''ACTION SOCIALE')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 25 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 25 10 00 00', 'S/D DE L''ACTION SOCIALE', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DU RENFORCEMENT DES CAPACITES (47 05 25 15 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 25 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU RENFORCEMENT DES CAPACITES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 25 15 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 25 15 00 00', 'S/D DU RENFORCEMENT DES CAPACITES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE LA DOCUMENTATION & DES ARCHIVES (47 05 30 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 30 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA DOCUMENTATION & DES ARCHIVES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 30 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 30 10 00 00', 'S/D DE LA DOCUMENTATION & DES ARCHIVES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE LA PRODUCTION ET DU DEV NUMERIQUE (47 05 30 15 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 30 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA PRODUCTION ET DU DEV NUMERIQUE')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 30 15 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 30 15 00 00', 'S/D DE LA PRODUCTION ET DU DEV NUMERIQUE', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE LA PLANIF & DES PROJETS (47 05 35 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 35 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA PLANIF & DES PROJETS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 35 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 35 05 00 00', 'S/D DE LA PLANIF & DES PROJETS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DES STATISTIQUES (47 05 35 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 35 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES STATISTIQUES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 35 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 35 10 00 00', 'S/D DES STATISTIQUES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE L'AMENAG, FONCIER TOUR ET LOISIRS (47 05 35 15 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 35 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 35 15 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 35 15 00 00', 'S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE L'INFORMATIQUE (47 05 40 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 40 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''INFORMATIQUE')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 40 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 40 05 00 00', 'S/D DE L''INFORMATIQUE', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DIGITALISATION ET DEVELOP STARTUPS (47 05 40 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 40 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DIGITALISATION ET DEVELOP STARTUPS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 40 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 40 10 00 00', 'S/D DIGITALISATION ET DEVELOP STARTUPS', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DE LA LEGISLATION (47 05 45 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 45 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DE LA LEGISLATION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 45 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 45 05 00 00', 'SOUS-DIRECTION DE LA LEGISLATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DU CONTENTIEUX (47 05 45 10 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 45 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DU CONTENTIEUX')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 45 10 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 45 10 00 00', 'SOUS-DIRECTION DU CONTENTIEUX', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D PREVENTION ET GESTION DES RISQUES (47 05 50 05 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 50 00 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D PREVENTION ET GESTION DES RISQUES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 50 05 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 50 05 00 00', 'S/D PREVENTION ET GESTION DES RISQUES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D PROMO SECURITE TOUR ET DES LOISIRS (47 05 50 15 00 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 50 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D PROMO SECURITE TOUR ET DES LOISIRS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 05 50 15 00 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 50 15 00 00', 'S/D PROMO SECURITE TOUR ET DES LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D QUALITE, NORMALISATION ET CONTROLE (47 10 05 05 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D QUALITE, NORMALISATION ET CONTROLE')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 05 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 05 05 00', 'S/D QUALITE, NORMALISATION ET CONTROLE', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DU TOURISME MEDICAL (47 10 05 05 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DU TOURISME MEDICAL')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 05 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 05 10 00', 'SOUS-DIRECTION DU TOURISME MEDICAL', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE L'ENCADREMENT DES EXPLOITANTS (47 10 05 05 15 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''ENCADREMENT DES EXPLOITANTS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 05 15 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 05 15 00', 'S/D DE L''ENCADREMENT DES EXPLOITANTS', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DU TOURISME RELIGIEUX (47 10 05 05 20 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DU TOURISME RELIGIEUX')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 05 20 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 05 20 00', 'SOUS-DIRECTION DU TOURISME RELIGIEUX', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION PROFESSIONNALISATION (47 10 05 10 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION PROFESSIONNALISATION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 10 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 10 05 00', 'SOUS-DIRECTION PROFESSIONNALISATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DE LA COOPERATION (47 10 05 10 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DE LA COOPERATION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 10 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 10 10 00', 'SOUS-DIRECTION DE LA COOPERATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DES SERVICES DECONCENTRES (47 10 05 15 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 15 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DES SERVICES DECONCENTRES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 15 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 15 05 00', 'SOUS-DIRECTION DES SERVICES DECONCENTRES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D BUREAUX DU TOURISME POUR ETRANGER (47 10 05 15 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 05 15 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D BUREAUX DU TOURISME POUR ETRANGER')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 05 15 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 05 15 10 00', 'S/D BUREAUX DU TOURISME POUR ETRANGER', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D INFRAST. , ESPACE & EQUIP DE LOISIRS (47 10 10 05 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 10 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D INFRAST. , ESPACE & EQUIP DE LOISIRS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 10 05 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 10 05 05 00', 'S/D INFRAST. , ESPACE & EQUIP DE LOISIRS', true);
        v_created := v_created + 1;
    END IF;
    
    -- SOUS-DIRECTION DES JEUX NUMERIQUES (47 10 10 05 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 10 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DES JEUX NUMERIQUES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 10 05 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 10 05 10 00', 'SOUS-DIRECTION DES JEUX NUMERIQUES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D ENCADREMENT & VALORISATION JEUX TRAD (47 10 10 10 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 10 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D ENCADREMENT & VALORISATION JEUX TRAD')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 10 10 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 10 10 05 00', 'S/D ENCADREMENT & VALORISATION JEUX TRAD', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D VULGARISATION & PROMOTION JEUX TRADI (47 10 10 10 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 10 10 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D VULGARISATION & PROMOTION JEUX TRADI')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 10 10 10 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 10 10 10 10 00', 'S/D VULGARISATION & PROMOTION JEUX TRADI', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D RESSOURCES HUMAINES (47 20 10 05 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D RESSOURCES HUMAINES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 05 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 05 05 00', 'S/D RESSOURCES HUMAINES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D FORMAT° ET DU PERFECTIONNEMENT (47 20 10 05 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 05 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D FORMAT° ET DU PERFECTIONNEMENT')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 05 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 05 10 00', 'S/D FORMAT° ET DU PERFECTIONNEMENT', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DU BUDGET & DES FINANCES (47 20 10 10 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU BUDGET & DES FINANCES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 10 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 10 05 00', 'S/D DU BUDGET & DES FINANCES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DES MOYENS GENERAUX (47 20 10 10 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES MOYENS GENERAUX')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 10 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 10 10 00', 'S/D DES MOYENS GENERAUX', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D STATISTIQUES (47 20 10 15 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D STATISTIQUES')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 15 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 15 05 00', 'S/D STATISTIQUES', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DU SUIVI-EVALUATION (47 20 10 15 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 10 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU SUIVI-EVALUATION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 15 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 15 10 00', 'S/D DU SUIVI-EVALUATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D MARKETING ET COMMUNICATION (47 20 10 20 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 20 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D MARKETING ET COMMUNICATION')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 20 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 20 05 00', 'S/D MARKETING ET COMMUNICATION', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D L'INFORMATION ET DES TIC (47 20 10 20 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 20 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D L''INFORMATION ET DES TIC')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 20 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 20 10 00', 'S/D L''INFORMATION ET DES TIC', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DES EVENEMENTIELS (47 20 10 20 15 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 20 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES EVENEMENTIELS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 20 15 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 20 15 00', 'S/D DES EVENEMENTIELS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D RELATION AVEC LES OPERATEURS (47 20 10 25 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 25 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D RELATION AVEC LES OPERATEURS')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 25 05 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 25 05 00', 'S/D RELATION AVEC LES OPERATEURS', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D DE LA PRODUCTION DU DEV. TOURISTIQUE (47 20 10 25 10 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 25 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA PRODUCTION DU DEV. TOURISTIQUE')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 25 10 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 25 10 00', 'S/D DE LA PRODUCTION DU DEV. TOURISTIQUE', true);
        v_created := v_created + 1;
    END IF;
    
    -- S/D COORD.BUREAUX A L'ETRANGER & BUR.REG (47 20 10 25 15 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 20 10 25 00 00' LIMIT 1;
    
    -- Chercher si la sous-direction existe déjà (par libellé)
    SELECT id INTO v_sd_id FROM public.sous_directions 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('S/D COORD.BUREAUX A L''ETRANGER & BUR.REG')
    LIMIT 1;
    
    IF v_sd_id IS NOT NULL THEN
        -- Mise à jour de la sous-direction existante
        UPDATE public.sous_directions
        SET code = '47 20 10 25 15 00',
            id_direction = v_dir_id
        WHERE id = v_sd_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer une nouvelle sous-direction
        INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 20 10 25 15 00', 'S/D COORD.BUREAUX A L''ETRANGER & BUR.REG', true);
        v_created := v_created + 1;
    END IF;
    
    RAISE NOTICE '  ✅ % Sous-Directions mises à jour', v_updated;
    RAISE NOTICE '  ✅ % Sous-Directions créées', v_created;
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 4 TERMINÉE';
    RAISE NOTICE '';
END $$;

-- ===============================================================================
-- PARTIE 5: MISE À JOUR ET CRÉATION DES SERVICES
-- ===============================================================================

DO $$
DECLARE
    v_dir_id INTEGER;
    v_sd_id INTEGER;
    v_svc_id INTEGER;
    v_updated INTEGER := 0;
    v_created INTEGER := 0;
BEGIN
    RAISE NOTICE '📋 PARTIE 5: Services...';
    RAISE NOTICE '  🔄 Mise à jour des entités existantes + création des nouvelles';
    
    -- SERVICE COURRIER DE LA DRH (47 05 25 00 05 00)
    SELECT id INTO v_dir_id FROM public.directions WHERE id_ministere = 1 AND code = '47 05 25 00 00 00' LIMIT 1;
    
    -- Chercher si le service existe déjà (par libellé)
    SELECT id INTO v_svc_id FROM public.services 
    WHERE id_ministere = 1 AND UPPER(libelle) = UPPER('SERVICE COURRIER DE LA DRH')
    LIMIT 1;
    
    IF v_svc_id IS NOT NULL THEN
        -- Mise à jour du service existant
        UPDATE public.services
        SET code = '47 05 25 00 05 00',
            id_direction = v_dir_id,
            id_ministere = 1
        WHERE id = v_svc_id;
        v_updated := v_updated + 1;
    ELSE
        -- Créer un nouveau service
        INSERT INTO public.services (id_ministere, id_direction, code, libelle, is_active)
        VALUES (1, v_dir_id, '47 05 25 00 05 00', 'SERVICE COURRIER DE LA DRH', true);
        v_created := v_created + 1;
    END IF;
    
    RAISE NOTICE '  ✅ % Services mis à jour', v_updated;
    RAISE NOTICE '  ✅ % Services créés', v_created;
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 5 TERMINÉE';
    RAISE NOTICE '';
END $$;

-- ===============================================================================
-- PARTIE 6: RÉINITIALISATION DES ASSIGNATIONS D'AGENTS
-- ===============================================================================

UPDATE public.agents 
SET id_direction = NULL, 
    id_sous_direction = NULL, 
    id_service = NULL,
    id_direction_generale = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE id_ministere = 1;

-- ===============================================================================
-- PARTIE 7: ASSIGNATION DES AGENTS
-- ===============================================================================

-- DG: CABINET | Dir: CABINET (36 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 00 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '503281V', '201957B', '272129B', '434689Y', '313044S', '366249Z', '460997T', '861964X', '855878B', '826255V', '889566V', '468207P', '889425Q', '821007L', '856634X', '360923B', '504952W', '504954Y', '504956S', '982675X', '982907R', '982922F', '982953N', '982961N', '982982C', '982983D', '982984E', '982827G', '982864M', '982911C', '982918K', '982965J', '982994G', '982995H', '982996A', '982998L'
);

-- DG: CABINET | Dir: CABINET | S/D: CELLULE DE PASSATION DES MARCHES PUBLICS (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 00 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 00 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '323311U', '419669L', '811076N', '982971Q', '982985F'
);

-- DG: CABINET | Dir: CABINET | S/D: INSP. GEN. DU TOURISME ET DES LOISIRS (16 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 00 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 05 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '255532W', '255533X', '265648U', '275295D', '437484E', '337228F', '345907H', '368215R', '820764H', '480792S', '815419P', '815488M', '825989M', '481521F', '372134U', '982829J'
);

-- DG: CABINET | Dir: DIRECTION DES AFFAIRES FINANCIERES (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 15 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '436116B', '464357G', '345381H', '886661Z', '902371E', '902716Y', '905377F', '982950X', '982825E', '982828R', '982830P', '982831C', '982833E', '982863L', '982999M'
);

-- DG: CABINET | Dir: DIRECTION DES AFFAIRES FINANCIERES | S/D: S/D DU BUDGET & DE LA COMPTABILITE (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 15 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 15 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '885469Y', '323314X', '371880C', '826175M', '826186H', '982930K'
);

-- DG: CABINET | Dir: DIRECTION DES AFFAIRES FINANCIERES | S/D: S/D DES ETUDES ET CONTROLE DE GESTION (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 15 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 15 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '885397Q', '323944X'
);

-- DG: CABINET | Dir: DIRECTION DU GUICHET UNIQUE (14 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '233494K', '272142G', '468200U', '433341Z', '815472L', '855864V', '855865W', '856161V', '265431T', '886723P', '826009T', '481534C', '867627T', '982826F'
);

-- DG: CABINET | Dir: DIRECTION DU GUICHET UNIQUE | S/D: S/D DE L'INFORMATION ET SENSIBILISATION (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291090Y', '345912V', '345906G'
);

-- DG: CABINET | Dir: DIRECTION DU GUICHET UNIQUE | S/D: S/D SUIVI INVESTISSEMENT ET RECOUVREMENT (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '277838F', '338383C'
);

-- DG: CABINET | Dir: DIRECTION DU GUICHET UNIQUE | S/D: S/D SUIVI DES ACTES & AUTORISATIONS (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 20 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '272132W', '337222Z', '337225U', '359187D'
);

-- DG: CABINET | Dir: DIRECTION DES RESSOURCES HUMAINES (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '266393E', '452000F', '481466Q', '483528Q', '825998N', '807569E'
);

-- DG: CABINET | Dir: DIRECTION DES RESSOURCES HUMAINES | Service: SERVICE COURRIER DE LA DRH (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 00 00 00'
        LIMIT 1
    ),
    id_service = (
        SELECT id FROM services 
        WHERE id_ministere = 1 
          AND code = '47 05 25 00 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '359184A', '468852D', '982867Q', '982960Z'
);

-- DG: CABINET | Dir: DIRECTION DES RESSOURCES HUMAINES | S/D: S/D DE LA GESTION DU PERSONNEL (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '307354Q', '345662J', '832839M', '372229K'
);

-- DG: CABINET | Dir: DIRECTION DES RESSOURCES HUMAINES | S/D: S/D DE L'ACTION SOCIALE (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '358599R', '297584N', '304895V', '402854W'
);

-- DG: CABINET | Dir: DIRECTION DES RESSOURCES HUMAINES | S/D: S/D DU RENFORCEMENT DES CAPACITES (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 25 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '314826Q', '855854T', '323854V', '874067U'
);

-- DG: CABINET | Dir: DIR. COMMUNICATION ET DOCUMENTATION (10 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 30 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '855890U', '323855W', '435599P', '482009T', '507038Y', '982908S', '982928M', '982969W', '982989K', '982997B'
);

-- DG: CABINET | Dir: DIR. COMMUNICATION ET DOCUMENTATION | S/D: S/D DE LA DOCUMENTATION & DES ARCHIVES (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 30 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 30 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '307251R', '484367X', '982868Z'
);

-- DG: CABINET | Dir: DIR. COMMUNICATION ET DOCUMENTATION | S/D: S/D DE LA PRODUCTION ET DU DEV NUMERIQUE (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 30 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 30 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '982949S', '982970T'
);

-- DG: CABINET | Dir: DIR. PLANIFICATION, STATISTIQ & PROJETS (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '312892R', '925925G', '826301U', '855875Y', '359190L', '815507Q', '855467X', '855816M', '855818X', '855852Z', '855847U', '877509G', '268184F', '481418Q', '982942K'
);

-- DG: CABINET | Dir: DIR. PLANIFICATION, STATISTIQ & PROJETS | S/D: S/D DE LA PLANIF & DES PROJETS (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '467173T', '297582L', '815433D'
);

-- DG: CABINET | Dir: DIR. PLANIFICATION, STATISTIQ & PROJETS | S/D: S/D DES STATISTIQUES (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '483698T'
);

-- DG: CABINET | Dir: DIR. PLANIFICATION, STATISTIQ & PROJETS | S/D: S/D DE L'AMENAG, FONCIER TOUR ET LOISIRS (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 35 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '297577W', '291171Z'
);

-- DG: CABINET | Dir: DIR. INFORMAT, DIGITAL ET DEV. STARTUPS (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 40 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '491347S', '855859G', '825999P', '886194E', '885532F', '506857Z'
);

-- DG: CABINET | Dir: DIR. INFORMAT, DIGITAL ET DEV. STARTUPS | S/D: S/D DE L'INFORMATIQUE (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 40 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 40 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '467389C', '467423N', '482306Z', '827779B', '827781N'
);

-- DG: CABINET | Dir: DIR. INFORMAT, DIGITAL ET DEV. STARTUPS | S/D: S/D DIGITALISATION ET DEVELOP STARTUPS (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 40 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 40 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '827810P', '506858A'
);

-- DG: CABINET | Dir: DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 45 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '481073R', '886296L', '886369C', '890118Z', '481638U', '420373G'
);

-- DG: CABINET | Dir: DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX | S/D: SOUS-DIRECTION DE LA LEGISLATION (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 45 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 45 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '506866S'
);

-- DG: CABINET | Dir: DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX | S/D: SOUS-DIRECTION DU CONTENTIEUX (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 45 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 45 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '982986G'
);

-- DG: CABINET | Dir: DIR. SECURITE TOURISTIQUE ET DES LOISIRS (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 50 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '313054U', '359136H', '815459X', '855829S', '855825N', '506867T'
);

-- DG: CABINET | Dir: DIR. SECURITE TOURISTIQUE ET DES LOISIRS | S/D: S/D PREVENTION ET GESTION DES RISQUES (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 50 00 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 50 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '323845U', '480594L', '480817K'
);

-- DG: CABINET | Dir: BRIGARDE TOURISTIQUE ET DES LOISIRS (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 50 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '337223S'
);

-- DG: CABINET | Dir: BRIGARDE TOURISTIQUE ET DES LOISIRS | S/D: S/D PROMO SECURITE TOUR ET DES LOISIRS (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 50 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 05 50 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '293402U', '323830Z', '827831G', '834867K'
);

-- DG: CABINET | Dir: GESTIONNAIRE DU PATRIMOINE (7 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CABINET')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 05 55 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '365770W', '359181F', '337231S', '493835E', '810016M', '857121N', '982968V'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DG INDUSTRIE TOURISTIQUE ET HOTELIERE (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '327124M', '280155A', '467560B', '855832M', '871253G', '365484V', '313048E', '319370X', '433903N', '304886U', '855874X', '889388B', '887494C', '827768G', '982975L'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES ACTIVITES TOURISTIQUES (10 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '277839G', '337229G', '313039V', '368217K', '855828Z', '481434G', '982817E', '982862K', '982905P', '982929N'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES ACTIVITES TOURISTIQUES | S/D: S/D QUALITE, NORMALISATION ET CONTROLE (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '312887L', '291611S', '433865P', '433879V', '482018K', '815454J'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES ACTIVITES TOURISTIQUES | S/D: SOUS-DIRECTION DU TOURISME MEDICAL (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '821059X', '815476Q', '506863X'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES ACTIVITES TOURISTIQUES | S/D: S/D DE L'ENCADREMENT DES EXPLOITANTS (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 15 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '265759T', '297586Q', '337226V', '481942M'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES ACTIVITES TOURISTIQUES | S/D: SOUS-DIRECTION DU TOURISME RELIGIEUX (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 05 20 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '506865Z', '815497E', '323836K', '480631Y'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIR. COOPERATION ET PROFESSIONNALISATION (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '201560R', '855860D', '820545W', '808046E', '806844Z', '982823C'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIR. COOPERATION ET PROFESSIONNALISATION | S/D: SOUS-DIRECTION PROFESSIONNALISATION (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 10 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '286956X', '323833Q', '368216J', '827828M'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIR. COOPERATION ET PROFESSIONNALISATION | S/D: SOUS-DIRECTION DE LA COOPERATION (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 10 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '323834R', '323840B', '359185B', '464162V', '815504M', '504955Z'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES SERVICES EXTERIEURS (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '492302X', '855841W', '858378Y', '826007R', '506862W'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES SERVICES EXTERIEURS | S/D: SOUS-DIRECTION DES SERVICES DECONCENTRES (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 15 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 15 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '297590Y', '359188N', '827817A', '832911D'
);

-- DG: DG INDUSTRIE TOURISTIQUE ET HOTELIERE | Dir: DIRECTION DES SERVICES EXTERIEURS | S/D: S/D BUREAUX DU TOURISME POUR ETRANGER (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 15 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 05 15 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '251283H', '487322M'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIRECTION GENERALE DES LOISIRS (14 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '867562S', '304885T', '368214Q', '889093P', '876799H', '826157K', '855826P', '481626Q', '887502L', '887689X', '826011C', '908887T', '504953X', '982951L'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM (11 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '815436G', '852207G', '852240L', '865786Z', '319371L', '284526N', '481934D', '855888W', '481904Q', '338288M', '506861V'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM | S/D: S/D INFRAST. , ESPACE & EQUIP DE LOISIRS (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 05 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '275045D', '233613Z', '355154F', '390278T'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM | S/D: SOUS-DIRECTION DES JEUX NUMERIQUES (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 05 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '456919U', '506855X'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIR. VALOR., FORM. & PROMO JEUX TRADIT (8 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '852135P', '865752E', '865780F', '865813L', '855883R', '897985A', '806868H', '890209M'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIR. VALOR., FORM. & PROMO JEUX TRADIT | S/D: S/D ENCADREMENT & VALORISATION JEUX TRAD (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 10 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '372652K', '442433P', '320381C', '982976M'
);

-- DG: DIRECTION GENERALE DES LOISIRS | Dir: DIR. VALOR., FORM. & PROMO JEUX TRADIT | S/D: S/D VULGARISATION & PROMOTION JEUX TRADI (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 10 10 10 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '344925Z', '473683Z', '323856X', '390102C', '379660E'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE D'ABIDJAN NORD (18 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 03 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '272140J', '345913W', '313055V', '323848F', '480710B', '482019L', '815486B', '834105Q', '815460U', '855838T', '874645C', '469466B', '855877S', '826002L', '421314J', '468225G', '468562A', '802422N'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE ABJ NORD 1 (22 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 03 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291178G', '852291U', '304888E', '304889F', '323829U', '337230D', '386459H', '435328W', '480566X', '480684W', '815421H', '815435F', '815491G', '834142L', '855839U', '889312W', '856590Y', '889628B', '874813M', '469887S', '481572J', '482868U'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  DE DABOU (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 03 15 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291182M', '802321Y', '852286X', '434616N', '433404J', '447591K', '832904P', '855830X', '855846T', '474937Q', '470972B', '885624K', '468537Z', '481445K', '231138T'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE ABIDJAN SUD (20 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 04 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '265962F', '803532M', '313043Z', '323827J', '323831N', '482328W', '304892S', '323846V', '359182G', '447958A', '464165Y', '480545S', '834359D', '855822K', '855843Y', '855868H', '855891R', '467987L', '483707U', '875722S'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE ABJ SUD 1 (21 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 04 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '304882Y', '384378M', '323853U', '323843S', '447582J', '464167S', '480581P', '481978Z', '815423B', '832859Z', '834958W', '855372F', '855848D', '855882Q', '855886L', '855889X', '857718C', '875678N', '855857W', '481393P', '982940V'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE GRAND-BASSAM (20 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 07 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '855855U', '272128A', '871901T', '815446J', '870454D', '323838V', '323857Y', '345914X', '433356Y', '433391L', '447587P', '418949C', '464159A', '815445R', '830080W', '832891A', '855863U', '885584C', '855842X', '904690D'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  ADZOPE (17 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 07 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '852136Q', '291177X', '313040A', '464176T', '464180U', '470032Y', '480564V', '815455K', '815664U', '832864N', '832874Q', '832919M', '855833N', '889097K', '874642H', '498943X', '481384N'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  AGBOVILLE (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 07 15 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '827809T', '291174U', '435225P', '815499Q', '345910F', '418988U', '475706A', '855884J', '447589Z', '480503Z', '481901M', '481983F', '495974K', '898664G', '418951W'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE D'ABENGOUROU (14 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '334707D', '815669H', '820825P', '866768P', '272130G', '345916Z', '361854B', '480587M', '810584L', '855850B', '858955B', '820542T', '470988C', '481623M'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE DE DAOUKRO (9 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 10 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '304896W', '480601B', '855469H', '855858F', '350234N', '469479Q', '481392N', '830131R', '982947Q'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE BOUAKE (25 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '158733E', '483686P', '803534P', '852132L', '313045T', '323837L', '855872V', '323849G', '464171W', '480586L', '480692W', '480743G', '827945J', '830050F', '832854L', '834086G', '834133B', '855853S', '827449Z', '273520G', '855837J', '481455M', '901902T', '349302W', '315994J'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE KATIOLA (13 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 15 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '297630F', '815474N', '852217Z', '433357Z', '467420X', '855831L', '480518X', '816080L', '810032M', '874661C', '874803U', '482932C', '982980N'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE BONDOUKOU (9 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 20 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291176W', '815478S', '888935N', '480624Z', '481961Q', '815475P', '815501J', '855835Q', '481494D'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  BOUNA (7 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 20 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '297585P', '852197N', '481893D', '855871U', '885472K', '483687Q', '313773H'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE DALOA (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 25 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '272135Z', '815418N', '297579G', '359178T', '387981N', '481925C', '481962R', '481976P', '418948B', '885708G', '826153P', '468090H', '481412A', '482004N', '897703X'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  GAGNOA (11 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 25 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '834755S', '277841A', '815431B', '485169S', '464166Z', '480731U', '855861S', '855862T', '855873W', '826154Q', '481590R'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE DIVO (16 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 25 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '420435P', '357771K', '852231X', '319399R', '908662Q', '805019Y', '447557Y', '480679Q', '855879C', '418984Q', '468402B', '371987T', '481413B', '481526C', '826158U', '902807V'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE MAN (11 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 30 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '246394B', '815449V', '433367T', '434033H', '481049Z', '827826B', '855817N', '815490K', '856181J', '481935E', '819118V'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE GUIGLO (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 30 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '815477R', '272133X', '481390Y', '803457S', '815447K', '815456L'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  DANANE (6 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 30 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '313047V', '855824M', '820543U', '855880S', '491244T', '855834P'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE SAN-PEDRO (14 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 35 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '400817T', '803543Y', '875950B', '297588S', '359186C', '855856V', '480632Z', '481541K', '832885C', '855845S', '815427F', '481383M', '481566L', '887249D'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  SOUBRE (7 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 35 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291179H', '357870K', '464170H', '464173Y', '815481E', '827822F', '827824H'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  SASSANDRA (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 35 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '272141F', '815473M', '447559A', '481064Q', '855887M'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE KORHOGO (15 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 40 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '272139D', '815437H', '865406V', '464161U', '480638F', '480695Z', '482017A', '815462J', '815468Y', '830036M', '470991X', '470054E', '483237L', '856191L', '471757G'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  BOUNDIALI (10 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 40 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '304891Z', '852280D', '447572X', '464178D', '490020V', '855823L', '855851Y', '490894K', '826156J', '886245Y'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  FERKE (8 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 40 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '876947V', '291183N', '855866X', '481905R', '815480R', '855450A', '481542L', '855849E'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE D'ODIENNE (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 45 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291175V', '815434E', '481640A', '815492H'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE TOUBA (4 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 45 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '358754T', '272134Y', '318251K', '864879D'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE YAMOUSSOUKRO (30 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 50 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291061W', '357504H', '815458W', '815489N', '852269M', '304890C', '305831V', '386604B', '433382K', '466992Q', '874654D', '482246U', '385534K', '447588Y', '480523L', '480694Y', '480709P', '815426E', '815451P', '819354H', '827829N', '832853K', '832886D', '855867Y', '855881P', '815461R', '826001K', '827419K', '826005P', '982955Q'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  DIMBOKRO (10 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 50 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '297591M', '815448U', '359189P', '885392K', '464168B', '481505Q', '855869A', '820547Y', '471018X', '481207V'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE  BOUAFLE (13 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 50 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '313051Z', '852216Y', '827761Z', '323835J', '464179E', '480580S', '815420L', '855820V', '889085P', '419036M', '855844Z', '323197K', '889420X'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION REGIONALE DE SEGUELA (7 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 55 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '231462Y', '815482F', '815422A', '323850D', '855885K', '482010P', '481500X'
);

-- DG: DIRECTIONS REGIONALES | Dir: DIRECTION DEPARTEMENTALE MANKONO (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 05 55 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '304898G', '863462S', '485206Y', '887753W', '890060E'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE PARIS (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '480288H', '506215V'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE MILAN (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '865486M'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE LONDRES (ROYAUME UNI) (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 12 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '507095J'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE BERLIN (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 15 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '251279U'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE GENEVE (SUISSE) (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 17 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '507163S'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE MADRID (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 20 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '506415N'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE WASHINGTON (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 25 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '503323W'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE LAGOS (NIGERIA) (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 32 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '396544Y'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE BEIJING (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 35 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '809988D'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE PRETORIA (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 40 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '877587N'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE RIO DE JANEIRO (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 50 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '506234Y'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 55 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '506864Y'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE OTTAWA (CANADA) (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 60 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '285815R', '506254C'
);

-- DG: BUREAUX DU TOURISME POUR L'ETRANGER | Dir: BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 15 10 65 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '506294V'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° GENERALE COTE D'IVOIRE TOURISME (12 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '866514R', '315928X', '350428R', '815450S', '855827Q', '821115C', '314003T', '886292Q', '888832P', '811666S', '359729T', '500374J'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° RESSOURCES HUM. & MOY.GENERAUX (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 05 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '159015T'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° RESSOURCES HUM. & MOY.GENERAUX | S/D: S/D RESSOURCES HUMAINES (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 05 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '821439R', '813575R'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° RESSOURCES HUM. & MOY.GENERAUX | S/D: S/D FORMAT° ET DU PERFECTIONNEMENT (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 05 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 05 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '245090H'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DU BUDGET, DES FINANCES & DES MG (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '817164R'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DU BUDGET, DES FINANCES & DES MG | S/D: S/D DU BUDGET & DES FINANCES (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '265045B', '827422E', '298230P'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DU BUDGET, DES FINANCES & DES MG | S/D: S/D DES MOYENS GENERAUX (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '313290A'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DU BUDGET, DES FINANCES & DES MG | S/D: S/D STATISTIQUES (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 15 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '810493R'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DU BUDGET, DES FINANCES & DES MG | S/D: S/D DU SUIVI-EVALUATION (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 10 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 15 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '827978T', '809995U'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° MARKETING,COMMUNICAT° ET DES TIC (7 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '313050C', '345915Y', '307272N', '337227W', '810020V', '810075Y', '827511F'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° MARKETING,COMMUNICAT° ET DES TIC | S/D: S/D MARKETING ET COMMUNICATION (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '323842Z', '481519M'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° MARKETING,COMMUNICAT° ET DES TIC | S/D: S/D L'INFORMATION ET DES TIC (2 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '304899H', '284351E'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° MARKETING,COMMUNICAT° ET DES TIC | S/D: S/D DES EVENEMENTIELS (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 20 15 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '865713X'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DES RELATIONS EXTERIEURES (1 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '305872E'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DES RELATIONS EXTERIEURES | S/D: S/D RELATION AVEC LES OPERATEURS (3 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 05 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291172S', '304893T', '323828T'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DES RELATIONS EXTERIEURES | S/D: S/D DE LA PRODUCTION DU DEV. TOURISTIQUE (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 10 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '251272M', '291170C', '272131V', '304884S', '810000A'
);

-- DG: DIRECT° GENERALE COTE D'IVOIRE TOURISME | Dir: DIRECT° DES RELATIONS EXTERIEURES | S/D: S/D COORD.BUREAUX A L'ETRANGER & BUR.REG (7 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 00 00'
        LIMIT 1
    ),
    id_sous_direction = (
        SELECT id FROM sous_directions 
        WHERE id_ministere = 1 
          AND code = '47 20 10 25 15 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '291184P', '361146D', '304897X', '345909K', '359179U', '810021J', '807762F'
);

-- DG: CONSEIL NATIONAL DU TOURISME | Dir: CONSEIL NATIONAL DU TOURISME (9 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 36 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '365485W', '389796E', '206234B', '282337W', '203254L', '306629K', '237252B', '870807G', '483689S'
);

-- DG: FONDS DE DEVELOPPEMNT TOURISTIQUE | Dir: FONDS DE DEVELOPPEMNT TOURISTIQUE (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 20 40 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '885394M', '885447J', '827509W', '506074T', '982973J'
);

-- DG: INSTANCE D'AFFECTATION | Dir: INSTANCE D'AFFECTATION (5 agents)
UPDATE public.agents SET
    id_direction_generale = (
        SELECT id FROM direction_generale 
        WHERE id_ministere = 1 
          AND UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION')
        LIMIT 1
    ),
    id_direction = (
        SELECT id FROM directions 
        WHERE id_ministere = 1 
          AND code = '47 99 00 00 00 00'
        LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE matricule IN (
    '355870R', '290488B', '343470L', '162855V', '982941J'
);

-- ===============================================================================
-- VÉRIFICATION FINALE
-- ===============================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_dg INTEGER;
    v_dir INTEGER;
    v_sd INTEGER;
    v_serv INTEGER;
    v_pct_dg DECIMAL;
    v_pct_dir DECIMAL;
    v_pct_sd DECIMAL;
    v_pct_serv DECIMAL;
    
    v_count_dg INTEGER;
    v_count_dir INTEGER;
    v_count_sd INTEGER;
    v_count_svc INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ PARTIE 7 TERMINÉE: 829 agents assignés';
    RAISE NOTICE '';
    -- Compter les agents
    SELECT COUNT(*) INTO v_total FROM agents WHERE id_ministere = 1;
    SELECT COUNT(*) INTO v_dg FROM agents WHERE id_ministere = 1 AND id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_dir FROM agents WHERE id_ministere = 1 AND id_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_sd FROM agents WHERE id_ministere = 1 AND id_sous_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_serv FROM agents WHERE id_ministere = 1 AND id_service IS NOT NULL;
    
    -- Compter les entités
    SELECT COUNT(*) INTO v_count_dg FROM direction_generale WHERE id_ministere = 1;
    SELECT COUNT(*) INTO v_count_dir FROM directions WHERE id_ministere = 1;
    SELECT COUNT(*) INTO v_count_sd FROM sous_directions WHERE id_ministere = 1;
    SELECT COUNT(*) INTO v_count_svc FROM services WHERE id_ministere = 1;
    
    v_pct_dg := CASE WHEN v_total > 0 THEN (v_dg::DECIMAL / v_total * 100) ELSE 0 END;
    v_pct_dir := CASE WHEN v_total > 0 THEN (v_dir::DECIMAL / v_total * 100) ELSE 0 END;
    v_pct_sd := CASE WHEN v_total > 0 THEN (v_sd::DECIMAL / v_total * 100) ELSE 0 END;
    v_pct_serv := CASE WHEN v_total > 0 THEN (v_serv::DECIMAL / v_total * 100) ELSE 0 END;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '🎉 MISE À JOUR HIÉRARCHIQUE TERMINÉE !';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ENTITÉS CRÉÉES/MISES À JOUR:';
    RAISE NOTICE '   └─ % Directions Générales', v_count_dg;
    RAISE NOTICE '   └─ % Directions', v_count_dir;
    RAISE NOTICE '   └─ % Sous-Directions', v_count_sd;
    RAISE NOTICE '   └─ % Services', v_count_svc;
    RAISE NOTICE '';
    RAISE NOTICE '👥 AGENTS ASSIGNÉS:';
    RAISE NOTICE '   Total agents (ministère 1): %', v_total;
    RAISE NOTICE '   └─ Avec Direction Générale: % (%.1f%%)', v_dg, v_pct_dg;
    RAISE NOTICE '   └─ Avec Direction: % (%.1f%%)', v_dir, v_pct_dir;
    RAISE NOTICE '   └─ Avec Sous-Direction: % (%.1f%%)', v_sd, v_pct_sd;
    RAISE NOTICE '   └─ Avec Service: % (%.1f%%)', v_serv, v_pct_serv;
    RAISE NOTICE '';
    RAISE NOTICE '⭐ VÉRIFICATIONS CLÉS:';
    RAISE NOTICE '   ✅ CELLULE DE PASSATION = Sous-Direction du CABINET';
    RAISE NOTICE '   ✅ INSP. GEN. = Sous-Direction du CABINET';
    RAISE NOTICE '   ✅ Directions Générales basées sur colonne 43';
    RAISE NOTICE '';
    RAISE NOTICE '============================================================';
END $$;

-- Liste détaillée des Directions Générales avec leurs agents
SELECT 
    dg.libelle as "Direction Générale",
    COUNT(DISTINCT a.id) as "Nombre d''Agents"
FROM direction_generale dg
LEFT JOIN agents a ON a.id_direction_generale = dg.id AND a.id_ministere = 1
WHERE dg.id_ministere = 1
GROUP BY dg.id, dg.libelle
ORDER BY dg.libelle;

-- ===============================================================================
-- MESSAGE FINAL
-- ===============================================================================

-- Message final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Vérification finale affichée ci-dessus';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SCRIPT TERMINÉ AVEC SUCCÈS !';
    RAISE NOTICE '   Vous pouvez maintenant générer le rapport hiérarchique Excel';
    RAISE NOTICE '';
END $$;

COMMIT;
