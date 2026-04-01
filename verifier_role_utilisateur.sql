-- Vérifier le rôle attaché au compte (remplacer 'VOTRE_USERNAME' par le login ou l'email)
-- Les rôles avec privilèges de gestion (tableau de bord, ESPACE GESTION) : chef_service (9), chef_cabinet (13), dir_cabinet (12), directeur (10), sous_directeur (11), directeur_general (14), directeur_central (15), inspecteur_general (21), directeur_service_exterieur (26), drh (2 ou 6), super_admin (1)

SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.id_role,
    r.nom AS role_nom,
    r.description AS role_description
FROM utilisateurs u
JOIN roles r ON r.id = u.id_role
WHERE u.username = '165466'   -- ou: u.email = 'votre@email.com'
   OR u.id = 123;                      -- ou l'id utilisateur

-- Pour lister tous les comptes et leur rôle (utile pour repérer qui a chef_service / chef_cabinet)
-- SELECT u.id, u.username, u.id_role, r.nom AS role_nom FROM utilisateurs u JOIN roles r ON r.id = u.id_role ORDER BY r.nom, u.username;

-- =============================================================================
-- CORRECTION : attribuer un rôle de gestion (tableau de bord + ESPACE GESTION)
-- =============================================================================
-- Actuellement ces comptes ont id_role = 3 (agent). Pour voir le tableau de bord
-- et l'ESPACE GESTION, il faut mettre un rôle de gestion.
--
-- Rôles possibles :
--   9  = chef_service   (accès à son service)
--  13  = chef_cabinet   (accès au cabinet)
--  12  = dir_cabinet    (directeur de cabinet)
--  10  = directeur      (accès à sa direction)
--  11  = sous_directeur (accès à sa sous-direction)
-- =============================================================================

-- Exemple : passer le compte 165466 (email jeanelise...) en Chef de Service
-- UPDATE utilisateurs SET id_role = 9 WHERE id = 1010;

-- Exemple : passer le compte 327124M en Chef de Service
-- UPDATE utilisateurs SET id_role = 9 WHERE id = 123;

-- Après la mise à jour : l'utilisateur doit se DÉCONNECTER puis se RECONNECTER
-- pour que l'application charge le nouveau rôle.
