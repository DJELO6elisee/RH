-- ============================================
-- DIAGNOSTIC : Vérifier pourquoi les motifs ne s'enregistrent pas
-- ============================================

-- 1. Vérifier que la colonne motif existe
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
  AND column_name = 'motif';

-- 2. Voir toutes les colonnes de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration'
ORDER BY ordinal_position;

-- 3. Vérifier les permissions sur la table
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'historique_retrait_restauration';

-- 4. Vérifier le propriétaire de la table
SELECT 
    tableowner,
    tablename
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'historique_retrait_restauration';

-- 5. Tester une insertion manuelle (remplacez 1811 par un ID d'agent valide)
-- Décommentez et exécutez pour tester :
-- INSERT INTO historique_retrait_restauration (id_agent, type_action, motif, date_action) 
-- VALUES (1811, 'retrait', 'Test de motif manuel', CURRENT_TIMESTAMP) 
-- RETURNING id, id_agent, type_action, motif, date_action;

-- 6. Vérifier les données actuelles
SELECT 
    id,
    id_agent,
    type_action,
    motif,
    date_action
FROM historique_retrait_restauration
ORDER BY id DESC
LIMIT 10;

-- 7. Compter les enregistrements avec et sans motif
SELECT 
    COUNT(*) as total,
    COUNT(motif) as avec_motif,
    COUNT(*) - COUNT(motif) as sans_motif
FROM historique_retrait_restauration;

