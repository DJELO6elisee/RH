-- Script SQL pour corriger les permissions sur les tables et fonctions de gestion des congés
-- À exécuter par un SUPERUSER PostgreSQL sur le serveur de production

-- =====================================================
-- MÉTHODE 1 : Utiliser l'utilisateur actuel (recommandé)
-- =====================================================
-- Ce script utilise CURRENT_USER qui est l'utilisateur actuellement connecté
-- Exécutez ce script en vous connectant avec l'utilisateur qui a besoin des permissions

DO $$
DECLARE
    db_user TEXT;
BEGIN
    -- Utiliser l'utilisateur actuel
    db_user := CURRENT_USER;
    
    RAISE NOTICE 'Accord des permissions à l''utilisateur: %', db_user;
    
    -- Permissions sur agent_conges
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO %I', db_user);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO %I', db_user);
    
    -- Permissions sur jours_feries
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO %I', db_user);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO %I', db_user);
    
    -- Permissions sur la fonction calculer_jours_ouvres
    EXECUTE format('GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO %I', db_user);
    
    RAISE NOTICE '✅ Permissions accordées avec succès à l''utilisateur: %', db_user;
END $$;

-- =====================================================
-- MÉTHODE 2 : Spécifier un utilisateur manuellement
-- =====================================================
-- Décommentez et remplacez 'votre_utilisateur_db' par le nom réel de votre utilisateur
-- Assurez-vous que l'utilisateur existe d'abord avec: CREATE USER votre_utilisateur_db;

/*
-- Vérifier que l'utilisateur existe d'abord
SELECT rolname FROM pg_roles WHERE rolname = 'votre_utilisateur_db';

-- Si l'utilisateur n'existe pas, créez-le (décommentez cette ligne):
-- CREATE USER votre_utilisateur_db WITH PASSWORD 'mot_de_passe';

-- Permissions sur agent_conges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "votre_utilisateur_db";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "votre_utilisateur_db";

-- Permissions sur jours_feries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "votre_utilisateur_db";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "votre_utilisateur_db";

-- Permissions sur la fonction calculer_jours_ouvres
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "votre_utilisateur_db";
*/

-- Vérification des permissions
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('agent_conges', 'jours_feries');

-- Lister les utilisateurs qui ont des permissions sur agent_conges
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges';

