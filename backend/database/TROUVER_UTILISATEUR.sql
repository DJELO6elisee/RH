-- =====================================================
-- SCRIPT POUR TROUVER L'UTILISATEUR EXACT UTILISÉ PAR L'APPLICATION
-- =====================================================
-- Exécutez cette requête pour trouver tous les utilisateurs possibles
-- =====================================================

-- Lister tous les utilisateurs qui peuvent se connecter
SELECT 
    rolname AS "Nom de l'utilisateur",
    rolsuper AS "Est Superuser",
    rolcanlogin AS "Peut se connecter"
FROM pg_roles 
WHERE rolcanlogin = true 
ORDER BY rolname;

-- Vérifier les permissions actuelles sur agent_conges
SELECT 
    grantee AS "Utilisateur avec permissions",
    privilege_type AS "Type de permission"
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee, privilege_type;

-- Vérifier qui est le propriétaire des tables
SELECT 
    tablename AS "Table",
    tableowner AS "Propriétaire"
FROM pg_tables 
WHERE tablename IN ('agent_conges', 'jours_feries')
ORDER BY tablename;

-- =====================================================
-- APRÈS AVOIR IDENTIFIÉ L'UTILISATEUR :
-- Remplacez "NOM_UTILISATEUR" dans les commandes ci-dessous
-- =====================================================

-- Exemple si l'utilisateur est "mon_utilisateur" :
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "mon_utilisateur";

