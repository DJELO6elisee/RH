-- ============================================================================
-- Script de rollback de la table direction_generale
-- ============================================================================
-- Ce script annule toutes les modifications apportées par
-- create_direction_generale.sql
-- ============================================================================
-- ⚠️  ATTENTION: Ce script supprime définitivement la table et ses données
-- ============================================================================

\echo '=========================================='
\echo 'ROLLBACK de direction_generale'
\echo '=========================================='
\echo ''
\echo '⚠️  ATTENTION: Ce script va supprimer la table direction_generale'
\echo '    et toutes ses données. Cette action est IRRÉVERSIBLE.'
\echo ''
\echo 'Appuyez sur Ctrl+C pour annuler ou Entrée pour continuer...'
\prompt 'Continuer? (tapez YES pour confirmer): ' confirm

\if :{?confirm}
    \if :confirm = 'YES'
        \echo 'Début du rollback...'
        \echo ''

        -- 1. Supprimer le trigger
        \echo '1. Suppression du trigger...'
        DROP TRIGGER IF EXISTS trigger_update_direction_generale_updated_at ON public.direction_generale;
        \echo '   ✓ Trigger supprimé'
        \echo ''

        -- 2. Supprimer la fonction trigger
        \echo '2. Suppression de la fonction trigger...'
        DROP FUNCTION IF EXISTS public.update_direction_generale_updated_at();
        \echo '   ✓ Fonction supprimée'
        \echo ''

        -- 3. Supprimer les contraintes FK sur agents
        \echo '3. Suppression des contraintes sur agents...'
        ALTER TABLE IF EXISTS public.agents 
            DROP CONSTRAINT IF EXISTS fk_agents_direction_generale;
        \echo '   ✓ Contrainte FK supprimée sur agents'
        \echo ''

        -- 4. Supprimer les contraintes FK sur directions
        \echo '4. Suppression des contraintes sur directions...'
        ALTER TABLE IF EXISTS public.directions 
            DROP CONSTRAINT IF EXISTS fk_directions_direction_generale;
        \echo '   ✓ Contrainte FK supprimée sur directions'
        \echo ''

        -- 5. Supprimer l'index sur agents
        \echo '5. Suppression des index...'
        DROP INDEX IF EXISTS public.idx_agents_direction_generale;
        \echo '   ✓ Index sur agents supprimé'
        
        -- 6. Supprimer l'index sur directions
        DROP INDEX IF EXISTS public.idx_directions_direction_generale;
        \echo '   ✓ Index sur directions supprimé'
        \echo ''

        -- 7. Supprimer la colonne dans agents
        \echo '6. Suppression de la colonne id_direction_generale dans agents...'
        ALTER TABLE IF EXISTS public.agents 
            DROP COLUMN IF EXISTS id_direction_generale;
        \echo '   ✓ Colonne supprimée de agents'
        \echo ''

        -- 8. Supprimer la colonne dans directions
        \echo '7. Suppression de la colonne id_direction_generale dans directions...'
        ALTER TABLE IF EXISTS public.directions 
            DROP COLUMN IF EXISTS id_direction_generale;
        \echo '   ✓ Colonne supprimée de directions'
        \echo ''

        -- 9. Supprimer les index de direction_generale
        \echo '8. Suppression des index de direction_generale...'
        DROP INDEX IF EXISTS public.idx_direction_generale_ministere;
        DROP INDEX IF EXISTS public.idx_direction_generale_directeur;
        DROP INDEX IF EXISTS public.idx_direction_generale_active;
        \echo '   ✓ Index supprimés'
        \echo ''

        -- 10. Supprimer la table direction_generale
        \echo '9. Suppression de la table direction_generale...'
        DROP TABLE IF EXISTS public.direction_generale CASCADE;
        \echo '   ✓ Table supprimée'
        \echo ''

        -- 11. Supprimer la séquence
        \echo '10. Suppression de la séquence...'
        DROP SEQUENCE IF EXISTS public.direction_generale_id_seq CASCADE;
        \echo '   ✓ Séquence supprimée'
        \echo ''

        \echo '=========================================='
        \echo 'Rollback terminé avec succès!'
        \echo '=========================================='
        \echo ''
        \echo 'Toutes les modifications ont été annulées.'
        \echo ''
    \else
        \echo 'Rollback annulé (confirmation incorrecte).'
        \echo 'Tapez exactement YES (en majuscules) pour confirmer.'
    \endif
\else
    \echo 'Rollback annulé.'
\endif

-- ============================================================================
-- Vérification post-rollback
-- ============================================================================

\echo 'Vérification post-rollback:'
\echo ''

-- Vérifier que la table n'existe plus
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'direction_generale'
        ) THEN '✓ Table direction_generale n''existe plus'
        ELSE '✗ ERREUR: La table direction_generale existe encore!'
    END as status;

-- Vérifier que la colonne dans directions n'existe plus
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'directions'
            AND column_name = 'id_direction_generale'
        ) THEN '✓ Colonne id_direction_generale supprimée de directions'
        ELSE '✗ ERREUR: La colonne id_direction_generale existe encore dans directions!'
    END as status;

-- Vérifier que la colonne dans agents n'existe plus
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'agents'
            AND column_name = 'id_direction_generale'
        ) THEN '✓ Colonne id_direction_generale supprimée de agents'
        ELSE '✗ ERREUR: La colonne id_direction_generale existe encore dans agents!'
    END as status;

-- Vérifier que la séquence n'existe plus
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public' 
            AND sequence_name = 'direction_generale_id_seq'
        ) THEN '✓ Séquence direction_generale_id_seq supprimée'
        ELSE '✗ ERREUR: La séquence direction_generale_id_seq existe encore!'
    END as status;

\echo ''
\echo 'Vérification terminée.'

