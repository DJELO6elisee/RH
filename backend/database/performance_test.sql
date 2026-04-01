-- Script de test des performances des tables géographiques
-- =======================================================

-- Test 1: Vérifier que les index sont créés
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
ORDER BY tablename, indexname;

-- Test 2: Analyser les statistiques des tables
SELECT 
    schemaname,
    tablename,
    n_tup_ins as insertions,
    n_tup_upd as mises_a_jour,
    n_tup_del as suppressions,
    n_live_tup as lignes_actives,
    n_dead_tup as lignes_mortes,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE relname IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
ORDER BY tablename;

-- Test 3: Vérifier l'utilisation des index
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_lus,
    idx_tup_fetch as tuples_recuperes
FROM pg_stat_user_indexes 
WHERE tablename IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
ORDER BY tablename, indexname;

-- Test 4: Mesurer les performances des requêtes principales
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    r.nom as region,
    d.nom as departement,
    l.nom as localite,
    l.population
FROM regions r
JOIN departements d ON r.id = d.id_region
JOIN localites l ON d.id = l.id_departement
WHERE r.is_active = TRUE 
  AND d.is_active = TRUE 
  AND l.is_active = TRUE
ORDER BY r.nom, d.nom, l.nom;

-- Test 5: Mesurer les performances de recherche par nom
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    l.nom as localite,
    d.nom as departement,
    r.nom as region
FROM localites l
JOIN departements d ON l.id_departement = d.id
JOIN regions r ON d.id_region = r.id
WHERE l.nom ILIKE '%abidjan%'
  AND l.is_active = TRUE;

-- Test 6: Mesurer les performances de recherche d'agents par localité
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    al.type_adresse,
    l.nom as localite
FROM agents a
JOIN agents_localites al ON a.id = al.id_agent
JOIN localites l ON al.id_localite = l.id
WHERE l.code = 'ABJ-01-001'
  AND a.statut_emploi = 'actif';

-- Test 7: Mesurer les performances des affectations géographiques
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    a.matricule,
    a.nom,
    ag.motif,
    ag.date_debut,
    ag.date_fin,
    ls.nom as localite_source,
    ld.nom as localite_destination
FROM agents a
JOIN affectations_geographiques ag ON a.id = ag.id_agent
LEFT JOIN localites ls ON ag.id_localite_source = ls.id
LEFT JOIN localites ld ON ag.id_localite_destination = ld.id
WHERE ag.statut = 'en_cours'
  AND ag.date_debut <= CURRENT_DATE;

-- Test 8: Vérifier la taille des tables
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as taille_totale,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as taille_table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as taille_index
FROM pg_tables 
WHERE tablename IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Test 9: Vérifier les contraintes de clés étrangères
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, tc.constraint_name;

-- Test 10: Recommandations d'optimisation
SELECT 
    'Analyse des performances' as type_analyse,
    'Vérifiez que les index sont utilisés dans les requêtes' as recommandation
UNION ALL
SELECT 
    'Maintenance',
    'Exécutez VACUUM ANALYZE sur les tables après insertion de données'
UNION ALL
SELECT 
    'Monitoring',
    'Surveillez pg_stat_user_indexes pour identifier les index non utilisés'
UNION ALL
SELECT 
    'Optimisation',
    'Considérez des index partiels pour les données actives uniquement'
UNION ALL
SELECT 
    'Sécurité',
    'Vérifiez les contraintes de clés étrangères pour l\'intégrité des données';

