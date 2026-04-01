-- ============================================================================
-- Script de correction du DRH pour le ministère 10
-- ============================================================================
-- Ce script corrige l'association du DRH avec le ministère 10
-- ============================================================================

BEGIN;

DO $body$
DECLARE
    v_ministere_id INTEGER;
    v_agent_id INTEGER;
    v_user_id INTEGER;
BEGIN
    -- 1. Récupérer l'ID du ministère 10
    SELECT id INTO v_ministere_id 
    FROM public.ministeres 
    WHERE id = 10 OR code = 'MINAGRI001'
    LIMIT 1;
    
    IF v_ministere_id IS NULL THEN
        RAISE EXCEPTION 'Le Ministère 10 (MINAGRI001) n''a pas été trouvé';
    END IF;
    
    RAISE NOTICE 'Ministère trouvé avec ID: %', v_ministere_id;
    
    -- 2. Trouver l'agent DRH par matricule
    SELECT id INTO v_agent_id 
    FROM public.agents 
    WHERE matricule = 'DRHMINTEST01'
    LIMIT 1;
    
    IF v_agent_id IS NULL THEN
        RAISE EXCEPTION 'L''agent avec le matricule DRHMINTEST01 n''a pas été trouvé';
    END IF;
    
    RAISE NOTICE 'Agent trouvé avec ID: %', v_agent_id;
    
    -- 3. Mettre à jour l'agent pour qu'il appartienne au ministère 10
    UPDATE public.agents
    SET 
        id_ministere = v_ministere_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_agent_id;
    
    RAISE NOTICE 'Agent mis à jour avec id_ministere = %', v_ministere_id;
    
    -- 4. Vérifier que l'utilisateur a bien l'agent associé
    SELECT id INTO v_user_id 
    FROM public.utilisateurs 
    WHERE username = 'DRHMINTEST01'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'L''utilisateur avec le username DRHMINTEST01 n''a pas été trouvé';
    END IF;
    
    -- 5. Mettre à jour l'utilisateur pour s'assurer qu'il a l'agent associé
    UPDATE public.utilisateurs
    SET 
        id_agent = v_agent_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_user_id AND (id_agent IS NULL OR id_agent != v_agent_id);
    
    RAISE NOTICE 'Utilisateur mis à jour avec id_agent = %', v_agent_id;
    
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'CORRECTION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Ministère ID: %', v_ministere_id;
    RAISE NOTICE 'Agent ID: %', v_agent_id;
    RAISE NOTICE 'Utilisateur ID: %', v_user_id;
    RAISE NOTICE '==================================================';
    
END $body$;

COMMIT;

-- Vérification finale
SELECT 
    u.username,
    u.id_agent,
    a.matricule,
    a.id_ministere,
    m.code as ministere_code,
    m.nom as ministere_nom,
    CASE 
        WHEN a.id_ministere = 10 THEN '✅ Configuration correcte'
        ELSE '❌ Problème: Agent n''appartient pas au ministère 10'
    END as statut
FROM public.utilisateurs u
LEFT JOIN public.agents a ON u.id_agent = a.id
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
WHERE u.username = 'DRHMINTEST01';
