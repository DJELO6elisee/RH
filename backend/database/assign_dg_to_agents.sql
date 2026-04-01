-- ===============================================================================
-- Script d'assignation des Directions Générales aux agents
-- ===============================================================================
-- Basé sur la direction de l'agent, assigner automatiquement la DG
-- ===============================================================================

-- Mettre à jour id_direction_generale pour les agents dont la direction a une DG
UPDATE public.agents a
SET id_direction_generale = d.id_direction_generale
FROM public.directions d
WHERE a.id_direction = d.id
  AND d.id_direction_generale IS NOT NULL
  AND a.id_direction_generale IS NULL;

-- Afficher les résultats
DO $$
DECLARE
    v_agents_avec_dg INTEGER;
    v_agents_sans_dg INTEGER;
    v_total_agents INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_agents FROM public.agents;
    SELECT COUNT(*) INTO v_agents_avec_dg FROM public.agents WHERE id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_agents_sans_dg FROM public.agents WHERE id_direction_generale IS NULL AND id_direction IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Assignation des DG terminée !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Résultats:';
    RAISE NOTICE '   Total agents: %', v_total_agents;
    RAISE NOTICE '   Agents avec DG: % (%.1f%%)', 
        v_agents_avec_dg, 
        (v_agents_avec_dg::DECIMAL / NULLIF(v_total_agents, 0) * 100);
    RAISE NOTICE '   Agents sans DG (mais avec Direction): %', v_agents_sans_dg;
    RAISE NOTICE '';
END $$;




















