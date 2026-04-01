-- Script SQL amélioré pour accorder les permissions sur les tables de congés
-- Ce script détecte automatiquement l'utilisateur qui a besoin des permissions

-- =====================================================
-- INSTRUCTIONS D'UTILISATION
-- =====================================================
-- 
-- OPTION 1 : Si vous connaissez l'utilisateur, modifiez la variable ci-dessous
-- OPTION 2 : Connectez-vous avec l'utilisateur qui a besoin des permissions, puis exécutez ce script
--
-- Pour trouver l'utilisateur utilisé par votre application:
-- 1. Regardez dans backend/.env -> DB_USER
-- 2. Ou exécutez: node backend/scripts/find-db-user.js
--

-- =====================================================
-- VARIABLE À MODIFIER (si vous connaissez l'utilisateur)
-- =====================================================
-- Remplacez NULL par le nom de votre utilisateur, ou laissez NULL pour utiliser CURRENT_USER
\set target_user NULL

-- =====================================================
-- SCRIPT AUTOMATIQUE
-- =====================================================

DO $$
DECLARE
    target_user_name TEXT;
    user_exists BOOLEAN;
BEGIN
    -- Déterminer l'utilisateur cible
    IF :'target_user' IS NOT NULL AND :'target_user' != 'NULL' THEN
        target_user_name := :'target_user';
        RAISE NOTICE 'Utilisation de l''utilisateur spécifié: %', target_user_name;
    ELSE
        target_user_name := CURRENT_USER;
        RAISE NOTICE 'Utilisation de l''utilisateur actuel: %', target_user_name;
    END IF;
    
    -- Vérifier que l'utilisateur existe
    SELECT EXISTS(
        SELECT 1 FROM pg_roles WHERE rolname = target_user_name
    ) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'L''utilisateur "%" n''existe pas! Créez-le d''abord avec: CREATE USER "%" WITH PASSWORD ''mot_de_passe'';', target_user_name, target_user_name;
    END IF;
    
    RAISE NOTICE '✅ Accords des permissions à l''utilisateur: %', target_user_name;
    
    -- Permissions sur agent_conges
    BEGIN
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO %I', target_user_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO %I', target_user_name);
        RAISE NOTICE '  ✅ Permissions accordées sur agent_conges';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ⚠️ Erreur lors de l''attribution des permissions sur agent_conges: %', SQLERRM;
    END;
    
    -- Permissions sur jours_feries
    BEGIN
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO %I', target_user_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO %I', target_user_name);
        RAISE NOTICE '  ✅ Permissions accordées sur jours_feries';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ⚠️ Erreur lors de l''attribution des permissions sur jours_feries: %', SQLERRM;
    END;
    
    -- Permissions sur la fonction calculer_jours_ouvres
    BEGIN
        EXECUTE format('GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO %I', target_user_name);
        RAISE NOTICE '  ✅ Permissions accordées sur calculer_jours_ouvres';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '  ⚠️ Erreur lors de l''attribution des permissions sur calculer_jours_ouvres: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '✨ Toutes les permissions ont été accordées à l''utilisateur: %', target_user_name;
    
END $$;

-- =====================================================
-- VÉRIFICATION DES PERMISSIONS
-- =====================================================

-- Afficher les permissions accordées sur agent_conges
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee, privilege_type;

-- Afficher les permissions accordées sur jours_feries
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'jours_feries'
ORDER BY grantee, privilege_type;

-- Lister tous les utilisateurs de la base de données (pour référence)
SELECT 
    rolname as username,
    rolsuper as is_superuser,
    rolcanlogin as can_login
FROM pg_roles
WHERE rolcanlogin = true
ORDER BY rolname;

