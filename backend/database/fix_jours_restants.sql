-- Script pour corriger les jours_restants dans la table agent_conges
-- Ce script recalcule jours_restants = jours_alloues - jours_pris pour toutes les entrées
-- et s'assure que jours_restants ne peut pas être négatif

-- IMPORTANT: Ce script doit être exécuté pour corriger toutes les incohérences existantes
-- 
-- ÉTAPE PRÉLIMINAIRE: S'assurer que le trigger de recalcul automatique est actif
-- Exécutez d'abord: ensure_trigger_jours_restants.sql pour garantir que le calcul est dynamique
--
-- Le trigger garantit maintenant que jours_restants est TOUJOURS recalculé automatiquement
-- à chaque INSERT/UPDATE, même si jours_restants est modifié directement

-- Étape 1: Afficher les incohérences avant correction
SELECT 
    id,
    id_agent,
    annee,
    jours_alloues,
    jours_pris,
    jours_restants as jours_restants_actuel,
    (jours_alloues - jours_pris) as jours_restants_calcule,
    CASE 
        WHEN jours_restants != GREATEST(0, jours_alloues - jours_pris) THEN '❌ INCOHÉRENT'
        ELSE '✅ OK'
    END as statut
FROM agent_conges
WHERE jours_restants != GREATEST(0, jours_alloues - jours_pris)
ORDER BY id_agent, annee;

-- Étape 2: Corriger TOUTES les entrées en recalculant jours_restants
-- Cette commande met à jour même les entrées qui semblent correctes pour garantir la cohérence
UPDATE agent_conges
SET jours_restants = GREATEST(0, jours_alloues - jours_pris),
    updated_at = CURRENT_TIMESTAMP
WHERE jours_restants != GREATEST(0, jours_alloues - jours_pris);

-- Afficher le nombre d'entrées corrigées
SELECT 
    COUNT(*) as nombre_entrees_corrigees
FROM agent_conges
WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '1 second';

-- Vérification finale : Afficher un résumé des données corrigées
SELECT 
    COUNT(*) as total_entrees,
    SUM(CASE WHEN jours_restants = GREATEST(0, jours_alloues - jours_pris) THEN 1 ELSE 0 END) as entrees_coherentes,
    SUM(CASE WHEN jours_restants != GREATEST(0, jours_alloues - jours_pris) THEN 1 ELSE 0 END) as entrees_incoherentes
FROM agent_conges;

-- Afficher quelques exemples de données corrigées
SELECT 
    id_agent,
    annee,
    jours_alloues,
    jours_pris,
    jours_restants,
    (jours_alloues - jours_pris) as verification,
    CASE 
        WHEN jours_restants = GREATEST(0, jours_alloues - jours_pris) THEN '✅ OK'
        ELSE '❌ INCOHÉRENT'
    END as statut
FROM agent_conges
ORDER BY id_agent, annee
LIMIT 20;

