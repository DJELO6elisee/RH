-- Script SQL SIMPLE pour accorder les permissions
-- Exécutez ce script en vous connectant AVEC l'utilisateur qui a besoin des permissions
-- ou en tant que SUPERUSER pour accorder les permissions à un autre utilisateur

-- =====================================================
-- ÉTAPE 1 : Connectez-vous à PostgreSQL
-- =====================================================
-- psql -U postgres -d votre_base_de_donnees
-- ou
-- sudo -u postgres psql votre_base_de_donnees

-- =====================================================
-- ÉTAPE 2 : Exécutez les commandes ci-dessous
-- =====================================================
-- Remplacez "nom_utilisateur" par le nom réel de votre utilisateur
-- Exemple: si votre utilisateur est "rh_user", remplacez par GRANT ... TO "rh_user";

-- Permissions sur agent_conges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "nom_utilisateur";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "nom_utilisateur";

-- Permissions sur jours_feries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "nom_utilisateur";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "nom_utilisateur";

-- Permissions sur la fonction calculer_jours_ouvres
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "nom_utilisateur";

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister tous les utilisateurs (pour trouver le bon nom)
SELECT rolname FROM pg_roles WHERE rolcanlogin = true ORDER BY rolname;

-- Vérifier les permissions accordées
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee;

