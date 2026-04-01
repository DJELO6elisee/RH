-- Script pour corriger les permissions sur les séquences
-- À exécuter avec un utilisateur ayant les droits d'administration

-- Accorder les permissions sur la séquence sessions_id_seq
GRANT USAGE, SELECT ON SEQUENCE sessions_id_seq TO PUBLIC;

-- Accorder les permissions sur la table sessions
GRANT INSERT, SELECT, UPDATE, DELETE ON TABLE sessions TO PUBLIC;

-- Accorder les permissions sur toutes les séquences pour éviter les problèmes futurs
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE ' || quote_ident(r.sequence_name) || ' TO PUBLIC';
    END LOOP;
END $$;

-- Accorder les permissions sur toutes les tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ' || quote_ident(r.tablename) || ' TO PUBLIC';
    END LOOP;
END $$;

-- Alternative : Si vous avez un utilisateur spécifique (remplacez 'votre_utilisateur' par le nom réel)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO votre_utilisateur;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO votre_utilisateur;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO votre_utilisateur;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO votre_utilisateur;

