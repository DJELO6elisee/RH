-- =====================================================
-- SCRIPT POUR ACCORDER LES PERMISSIONS À TOUS LES UTILISATEURS POSSIBLES
-- =====================================================
-- Ce script accorde les permissions aux utilisateurs les plus probables
-- Exécutez ce script en tant que SUPERUSER dans phpPgAdmin
-- =====================================================

-- Permissions pour isegroup
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup";

-- Permissions pour isegroup_admin
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup_admin";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup_admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup_admin";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup_admin";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup_admin";

-- Permissions pour postgres (au cas où)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "postgres";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "postgres";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "postgres";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "postgres";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "postgres";

-- Vérifier les permissions accordées
SELECT 
    grantee AS "Utilisateur",
    privilege_type AS "Permission"
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
  AND grantee IN ('isegroup', 'isegroup_admin', 'postgres')
ORDER BY grantee, privilege_type;

