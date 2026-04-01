-- =====================================================
-- SCRIPT SIMPLE POUR ACCORDER LES PERMISSIONS
-- =====================================================
-- À exécuter sur le serveur de production en tant que SUPERUSER
--
-- ÉTAPES :
-- 1. Connectez-vous : sudo -u postgres psql votre_base_de_donnees
-- 2. Exécutez ce script en remplaçant 'VOTRE_UTILISATEUR' par le nom réel
-- =====================================================

-- ÉTAPE 1 : Lister tous les utilisateurs pour trouver celui utilisé par l'application
SELECT rolname AS utilisateur 
FROM pg_roles 
WHERE rolcanlogin = true 
ORDER BY rolname;

-- ÉTAPE 2 : Copiez le nom de l'utilisateur de la liste ci-dessus
-- Puis remplacez 'VOTRE_UTILISATEUR' ci-dessous par ce nom

-- Exemple : si votre utilisateur est "rh_user", remplacez par :
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "rh_user";

-- ⬇️ REMPLACEZ 'VOTRE_UTILISATEUR' CI-DESSOUS ⬇️

-- Permissions sur agent_conges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "VOTRE_UTILISATEUR";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "VOTRE_UTILISATEUR";

-- Permissions sur jours_feries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "VOTRE_UTILISATEUR";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "VOTRE_UTILISATEUR";

-- Permissions sur la fonction calculer_jours_ouvres
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "VOTRE_UTILISATEUR";

-- VÉRIFICATION : Vérifier que les permissions ont été accordées
SELECT 
    grantee AS utilisateur,
    privilege_type AS permission
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
  AND grantee = 'VOTRE_UTILISATEUR'
ORDER BY privilege_type;

