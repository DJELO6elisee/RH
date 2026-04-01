-- ============================================================================
-- Script de vérification de la table direction_generale
-- ============================================================================
-- Ce script vérifie que la table direction_generale et ses relations
-- ont été correctement créées
-- ============================================================================

\echo '=========================================='
\echo 'Vérification de la table direction_generale'
\echo '=========================================='
\echo ''

-- 1. Vérifier l'existence de la table
\echo '1. Vérification de l''existence de la table...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'direction_generale'
        ) THEN '✓ Table direction_generale existe'
        ELSE '✗ Table direction_generale n''existe pas'
    END as status;

\echo ''

-- 2. Vérifier la structure de la table
\echo '2. Structure de la table direction_generale:'
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'direction_generale'
ORDER BY ordinal_position;

\echo ''

-- 3. Vérifier les contraintes de clés étrangères
\echo '3. Contraintes de clés étrangères:'
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'direction_generale'
AND tc.table_schema = 'public';

\echo ''

-- 4. Vérifier les index créés
\echo '4. Index créés sur direction_generale:'
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'direction_generale';

\echo ''

-- 5. Vérifier la nouvelle colonne dans la table directions
\echo '5. Vérification de la colonne id_direction_generale dans directions:'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'directions'
            AND column_name = 'id_direction_generale'
        ) THEN '✓ Colonne id_direction_generale existe dans directions'
        ELSE '✗ Colonne id_direction_generale n''existe pas dans directions'
    END as status;

\echo ''

-- 6. Vérifier la nouvelle colonne dans la table agents
\echo '6. Vérification de la colonne id_direction_generale dans agents:'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'agents'
            AND column_name = 'id_direction_generale'
        ) THEN '✓ Colonne id_direction_generale existe dans agents'
        ELSE '✗ Colonne id_direction_generale n''existe pas dans agents'
    END as status;

\echo ''

-- 7. Vérifier les contraintes FK sur directions
\echo '7. Contraintes FK sur directions.id_direction_generale:'
SELECT
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'directions'
AND kcu.column_name = 'id_direction_generale'
AND tc.table_schema = 'public';

\echo ''

-- 8. Vérifier les contraintes FK sur agents
\echo '8. Contraintes FK sur agents.id_direction_generale:'
SELECT
    tc.constraint_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'agents'
AND kcu.column_name = 'id_direction_generale'
AND tc.table_schema = 'public';

\echo ''

-- 9. Vérifier le trigger
\echo '9. Trigger sur direction_generale:'
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'direction_generale';

\echo ''

-- 10. Vérifier la séquence
\echo '10. Séquence direction_generale_id_seq:'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.sequences 
            WHERE sequence_schema = 'public' 
            AND sequence_name = 'direction_generale_id_seq'
        ) THEN '✓ Séquence direction_generale_id_seq existe'
        ELSE '✗ Séquence direction_generale_id_seq n''existe pas'
    END as status;

\echo ''

-- 11. Statistiques de la table
\echo '11. Statistiques de la table:'
SELECT 
    COUNT(*) as nombre_directions_generales,
    COUNT(CASE WHEN is_active = true THEN 1 END) as actives,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactives,
    COUNT(directeur_general_id) as avec_directeur
FROM public.direction_generale;

\echo ''

-- 12. Test de relations
\echo '12. Test des relations (si des données existent):'
SELECT 
    dg.libelle as direction_generale,
    m.nom as ministere,
    COALESCE(a.nom || ' ' || a.prenom, 'Aucun') as directeur_general,
    COUNT(d.id) as nombre_directions
FROM public.direction_generale dg
LEFT JOIN public.ministeres m ON dg.id_ministere = m.id
LEFT JOIN public.agents a ON dg.directeur_general_id = a.id
LEFT JOIN public.directions d ON d.id_direction_generale = dg.id
GROUP BY dg.libelle, m.nom, a.nom, a.prenom
LIMIT 10;

\echo ''
\echo '=========================================='
\echo 'Vérification terminée!'
\echo '=========================================='

