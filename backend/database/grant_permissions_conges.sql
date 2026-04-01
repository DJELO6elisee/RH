-- Script pour donner les permissions nécessaires sur les tables et fonctions de gestion des congés
-- À exécuter avec un utilisateur ayant les privilèges SUPERUSER ou le propriétaire de la base

-- Récupérer l'utilisateur actuel de la base de données
-- Si l'utilisateur est spécifique, remplacer CURRENT_USER par le nom de l'utilisateur
DO $$
DECLARE
    db_user TEXT;
BEGIN
    -- Récupérer l'utilisateur de la base depuis les variables d'environnement ou utiliser CURRENT_USER
    -- Dans ce script, nous utilisons CURRENT_USER pour la portabilité
    -- Si vous connaissez le nom de l'utilisateur, remplacez CURRENT_USER par son nom
    db_user := CURRENT_USER;
    
    -- Permissions sur la table agent_conges
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO %I', db_user);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO %I', db_user);
    EXECUTE format('ALTER TABLE agent_conges OWNER TO %I', db_user);
    
    RAISE NOTICE 'Permissions accordées sur agent_conges pour l''utilisateur: %', db_user;
    
    -- Permissions sur la table jours_feries
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO %I', db_user);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO %I', db_user);
    EXECUTE format('ALTER TABLE jours_feries OWNER TO %I', db_user);
    
    RAISE NOTICE 'Permissions accordées sur jours_feries pour l''utilisateur: %', db_user;
    
    -- Permissions sur la fonction calculer_jours_ouvres
    EXECUTE format('GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO %I', db_user);
    EXECUTE format('ALTER FUNCTION calculer_jours_ouvres(DATE, DATE) OWNER TO %I', db_user);
    
    RAISE NOTICE 'Permissions accordées sur calculer_jours_ouvres pour l''utilisateur: %', db_user;
END $$;

-- Alternative: Donner les permissions explicitement à un utilisateur spécifique
-- Décommentez et remplacez 'votre_utilisateur_db' par le nom de votre utilisateur de base de données
/*
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO votre_utilisateur_db;
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO votre_utilisateur_db;
ALTER TABLE agent_conges OWNER TO votre_utilisateur_db;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO votre_utilisateur_db;
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO votre_utilisateur_db;
ALTER TABLE jours_feries OWNER TO votre_utilisateur_db;

GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO votre_utilisateur_db;
ALTER FUNCTION calculer_jours_ouvres(DATE, DATE) OWNER TO votre_utilisateur_db;
*/

-- Vérifier les permissions accordées
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN ('agent_conges', 'jours_feries');

-- Vérifier les permissions sur les séquences
SELECT 
    schemaname,
    sequencename,
    sequenceowner
FROM pg_sequences 
WHERE sequencename IN ('agent_conges_id_seq', 'jours_feries_id_seq');

-- Vérifier les permissions sur la fonction
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'calculer_jours_ouvres';

