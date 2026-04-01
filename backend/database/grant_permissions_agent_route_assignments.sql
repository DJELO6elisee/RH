-- =====================================================
-- SCRIPT POUR ACCORDER LES PERMISSIONS
-- Table : agent_route_assignments
-- Utilisateur cible : isegroup
-- =====================================================
-- Date : Décembre 2024
-- Description : Accorde les permissions nécessaires sur la table
--               agent_route_assignments pour l'utilisateur isegroup
-- =====================================================

-- Permissions sur la table agent_route_assignments
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_route_assignments TO "isegroup";

-- Permissions sur la séquence (pour l'auto-incrémentation de l'ID)
GRANT USAGE, SELECT ON SEQUENCE agent_route_assignments_id_seq TO "isegroup";

-- ==========================================
-- VÉRIFICATION DES PERMISSIONS
-- ==========================================

-- Vérifier que les permissions ont été accordées sur la table
SELECT 
    grantee AS utilisateur,
    privilege_type AS permission,
    table_name AS table
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_route_assignments'
  AND grantee = 'isegroup'
ORDER BY privilege_type;

-- Vérifier les permissions sur la séquence
SELECT 
    grantee AS utilisateur,
    privilege_type AS permission,
    sequence_name AS sequence
FROM information_schema.usage_privileges 
WHERE object_name = 'agent_route_assignments_id_seq'
  AND grantee = 'isegroup'
ORDER BY privilege_type;

-- ==========================================
-- NOTES
-- ==========================================
-- Si vous utilisez un autre utilisateur que "isegroup", remplacez-le dans les commandes GRANT ci-dessus.
-- Exemples:
--   - Pour "postgres": GRANT ... TO "postgres";
--   - Pour un utilisateur personnalisé: GRANT ... TO "votre_utilisateur";

