-- Script principal pour configurer le système géographique
-- =====================================================
-- Ce script crée les tables, ajoute les index et insère les données d'exemple

-- 1. Création des tables géographiques
\echo 'Création des tables géographiques...'
\i geographic_tables.sql

-- 2. Création des index pour optimiser les performances
\echo 'Création des index...'
\i geographic_indexes.sql

-- 3. Insertion des données d'exemple
\echo 'Insertion des données d\'exemple...'
\i geographic_sample_data.sql

-- 4. Mise à jour des statistiques
\echo 'Mise à jour des statistiques...'
ANALYZE regions;
ANALYZE departements;
ANALYZE localites;
ANALYZE agents_localites;
ANALYZE affectations_geographiques;

-- 5. Vérification de l'installation
\echo 'Vérification de l\'installation...'
SELECT 
    'Tables créées' as etape,
    COUNT(*) as nombre
FROM information_schema.tables 
WHERE table_name IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
UNION ALL
SELECT 
    'Index créés',
    COUNT(*)
FROM pg_indexes 
WHERE tablename IN ('regions', 'departements', 'localites', 'agents_localites', 'affectations_geographiques')
UNION ALL
SELECT 
    'Régions insérées',
    COUNT(*)
FROM regions
UNION ALL
SELECT 
    'Départements insérés',
    COUNT(*)
FROM departements
UNION ALL
SELECT 
    'Localités insérées',
    COUNT(*)
FROM localites;

-- 6. Test des performances
\echo 'Test des performances...'
\i performance_test.sql

\echo 'Installation du système géographique terminée avec succès!'

