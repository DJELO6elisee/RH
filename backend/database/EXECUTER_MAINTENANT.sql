-- =====================================================
-- SCRIPT À EXÉCUTER IMMÉDIATEMENT DANS phpPgAdmin
-- =====================================================
-- Copiez-collez TOUTES ces commandes dans l'éditeur SQL
-- et exécutez-les (bouton "Exécuter" ou F5)
-- =====================================================

-- ÉTAPE 1 : Vérifier quel utilisateur est utilisé par l'application
-- (Exécutez cette requête pour voir les utilisateurs qui peuvent se connecter)
SELECT rolname AS "Utilisateur", rolsuper AS "Superuser" 
FROM pg_roles 
WHERE rolcanlogin = true 
  AND rolname IN ('isegroup', 'isegroup_admin', 'postgres')
ORDER BY rolname;

-- ÉTAPE 2 : Si vous voyez 'isegroup' dans la liste ci-dessus, exécutez ces commandes :

-- Permissions sur agent_conges pour isegroup
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup";

-- Permissions sur jours_feries pour isegroup
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup";

-- Permissions sur la fonction calculer_jours_ouvres pour isegroup
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup";

-- ÉTAPE 3 : Vérifier que les permissions ont été accordées
SELECT 
    grantee AS "Utilisateur",
    privilege_type AS "Permission"
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
  AND grantee = 'isegroup'
ORDER BY privilege_type;

-- Si vous voyez SELECT, INSERT, UPDATE, DELETE dans les résultats, c'est bon !

