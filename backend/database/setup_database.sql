-- Script principal de configuration de la base de données
-- ======================================================
-- Ce script exécute tous les scripts nécessaires dans l'ordre

-- Message de début
SELECT 'Début de la configuration de la base de données...' as message;
SELECT CURRENT_TIMESTAMP as start_time;

-- 1. Création des tables (si pas déjà fait)
-- Note: Ces scripts doivent être exécutés séparément si les tables n'existent pas
-- \i schema.sql
-- \i schema_part2.sql
-- \i schema_part3.sql
-- \i hierarchy_schema.sql
-- \i auth_schema.sql
-- \i institutions_schema.sql

-- 2. Insertion des données par défaut
\i insert_default_data.sql

-- 3. Insertion des données de test
\i insert_test_data.sql

-- 4. Vérification des données
\i verify_data.sql

-- Message de fin
SELECT 'Configuration de la base de données terminée avec succès !' as message;
SELECT CURRENT_TIMESTAMP as end_time;

-- Instructions finales
SELECT 'INSTRUCTIONS FINALES:' as info;
SELECT '1. Vérifiez que toutes les tables ont été créées' as step1;
SELECT '2. Vérifiez que toutes les données ont été insérées' as step2;
SELECT '3. Testez les routes d''authentification avec les utilisateurs créés' as step3;
SELECT '4. Mot de passe pour tous les utilisateurs: password123' as step4;
