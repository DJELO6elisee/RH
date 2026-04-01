-- =====================================================
-- SCRIPT POUR ACCORDER LES PERMISSIONS
-- Utilisateur cible : isegroup
-- =====================================================

-- Permissions sur agent_conges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup";

-- Permissions sur jours_feries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup";

-- Permissions sur la fonction calculer_jours_ouvres
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup";

-- Permissions sur agent_route_assignments
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_route_assignments TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_route_assignments_id_seq TO "isegroup";

-- VÉRIFICATION : Vérifier que les permissions ont été accordées
SELECT 
    grantee AS utilisateur,
    privilege_type AS permission
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
  AND grantee = 'isegroup'
ORDER BY privilege_type;

-- Afficher toutes les permissions sur agent_conges
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee, privilege_type;

