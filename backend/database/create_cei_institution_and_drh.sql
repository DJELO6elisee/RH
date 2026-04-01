-- =====================================================
-- SCRIPT : Création de l'institution CEI et du DRH
-- =====================================================
-- Date : Décembre 2024
-- Description : Crée l'institution "Commission Électorale Indépendante" (CEI)
--               et un agent DRH avec son compte utilisateur
-- =====================================================

-- ==========================================
-- 0. PRÉPARATION : Gérer la contrainte de clé étrangère
-- ==========================================
-- La contrainte utilisateurs_id_agent_fkey pointe vers agents (ministères)
-- mais nous créons un agent dans agents_institutions_main (institutions)
-- Nous devons donc supprimer temporairement la contrainte
ALTER TABLE utilisateurs DROP CONSTRAINT IF EXISTS utilisateurs_id_agent_fkey;

-- ==========================================
-- 1. CRÉER L'INSTITUTION CEI
-- ==========================================
INSERT INTO institutions (
    id,
    code,
    nom,
    sigle,
    description,
    adresse,
    telephone,
    email,
    website,
    is_active,
    created_at,
    updated_at
)
VALUES (
    7, -- ID fixe pour la CEI
    'INST007',
    'COMMISSION ELECTORALE INDEPENDANTE',
    'CEI',
    'Commission chargée de l''organisation et de la supervision des élections en Côte d''Ivoire',
    'Cocody, Abidjan, Côte d''Ivoire',
    '+225 27 20 12 34 56',
    'contact@cei.ci',
    'https://www.cei.ci',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    sigle = EXCLUDED.sigle,
    description = EXCLUDED.description,
    adresse = EXCLUDED.adresse,
    telephone = EXCLUDED.telephone,
    email = EXCLUDED.email,
    website = EXCLUDED.website,
    updated_at = CURRENT_TIMESTAMP;

-- Vérifier que la séquence est correcte
SELECT setval('institutions_id_seq', (SELECT MAX(id) FROM institutions));

-- ==========================================
-- 2. CRÉER L'AGENT DRH
-- ==========================================
-- Note: Vous devrez ajuster les valeurs selon vos besoins réels
INSERT INTO agents_institutions_main (
    id_civilite,
    id_situation_matrimoniale,
    id_nationalite,
    id_type_d_agent,
    id_institution,
    nom,
    prenom,
    matricule,
    date_de_naissance,
    lieu_de_naissance,
    age,
    telephone1,
    email,
    sexe,
    statut_emploi,
    date_embauche,
    created_at,
    updated_at
)
VALUES (
    1, -- ID de la civilité (Monsieur/Madame) - ajustez selon votre table
    1, -- ID de la situation matrimoniale - ajustez selon votre table
    1, -- ID de la nationalité (Côte d'Ivoire) - ajustez selon votre table
    1, -- ID du type d'agent (Fonctionnaire) - ajustez selon votre table
    7, -- ID de l'institution CEI
    'KOUAME', -- Nom du DRH
    'Jean', -- Prénom du DRH
    'CEI-DRH-001', -- Matricule unique
    '1980-01-15', -- Date de naissance (ajustez)
    'Abidjan', -- Lieu de naissance
    EXTRACT(YEAR FROM AGE('1980-01-15'::date))::INTEGER, -- Calcul automatique de l'âge
    '+225 07 14 15 16 17', -- Téléphone
    'drh.cei@cei.ci', -- Email
    'M', -- Sexe (M ou F)
    'actif', -- Statut emploi
    CURRENT_DATE, -- Date d'embauche
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (matricule) DO UPDATE SET
    nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP
RETURNING id;

-- ==========================================
-- 3. CRÉER LE RÔLE DRH (si nécessaire)
-- ==========================================
INSERT INTO roles (nom, description, created_at, updated_at)
VALUES ('DRH', 'Directeur des Ressources Humaines', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (nom) DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

-- ==========================================
-- 4. CRÉER LE COMPTE UTILISATEUR DU DRH
-- ==========================================
-- Supprimer l'utilisateur existant s'il existe (pour éviter les conflits)
DELETE FROM utilisateurs WHERE username = 'drh.cei';

-- Récupérer les IDs nécessaires et créer l'utilisateur
DO $body$
DECLARE
    agent_drh_id INTEGER;
    role_drh_id INTEGER;
    hashed_password TEXT;
BEGIN
    -- Récupérer l'ID de l'agent DRH
    SELECT id INTO agent_drh_id 
    FROM agents_institutions_main 
    WHERE matricule = 'CEI-DRH-001';
    
    -- Récupérer l'ID du rôle DRH
    SELECT id INTO role_drh_id 
    FROM roles 
    WHERE LOWER(nom) = 'drh'
    LIMIT 1;
    
    -- Hash du mot de passe (déjà défini dans le script)
    hashed_password := '$2b$10$C.69m5CSL.UpfmvevLuaTeLtCScqDIReoezOp3ZOnZ7DnEwyO95bi';
    
    -- Vérifier que tout est OK
    IF agent_drh_id IS NULL THEN
        RAISE NOTICE '❌ Erreur: Agent DRH non trouvé (matricule: CEI-DRH-001)';
        RETURN;
    END IF;
    
    IF role_drh_id IS NULL THEN
        RAISE NOTICE '❌ Erreur: Rôle DRH non trouvé';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Agent DRH trouvé (ID: %)', agent_drh_id;
    RAISE NOTICE '✅ Rôle DRH trouvé (ID: %)', role_drh_id;
END $body$;

-- Insérer l'utilisateur (en dehors du bloc DO pour éviter les problèmes de contrainte)
-- Utiliser une approche simple avec des sous-requêtes scalaires
INSERT INTO utilisateurs (
    username,
    email,
    password_hash,
    id_role,
    id_agent,
    is_active,
    created_at,
    updated_at
)
VALUES (
    'drh.cei',
    'drh.cei@cei.ci',
    '$2b$10$C.69m5CSL.UpfmvevLuaTeLtCScqDIReoezOp3ZOnZ7DnEwyO95bi',
    (SELECT id FROM roles WHERE LOWER(nom) = 'drh' LIMIT 1),
    (SELECT id FROM agents_institutions_main WHERE matricule = 'CEI-DRH-001' LIMIT 1),
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    id_role = EXCLUDED.id_role,
    id_agent = EXCLUDED.id_agent,
    updated_at = CURRENT_TIMESTAMP;

-- ==========================================
-- 4. VÉRIFICATIONS
-- ==========================================
-- Vérifier que l'institution a été créée
SELECT 
    id,
    code,
    nom,
    sigle,
    is_active
FROM institutions 
WHERE id = 7;

-- Vérifier que l'agent DRH a été créé
SELECT 
    id,
    nom,
    prenom,
    matricule,
    email,
    id_institution
FROM agents_institutions_main 
WHERE matricule = 'CEI-DRH-001';

-- Vérifier que le compte utilisateur a été créé
SELECT 
    u.id,
    u.username,
    u.email,
    r.nom as role_nom,
    a.nom || ' ' || a.prenom as agent_nom
FROM utilisateurs u
LEFT JOIN roles r ON u.id_role = r.id
LEFT JOIN agents_institutions_main a ON u.id_agent = a.id
WHERE u.username = 'drh.cei';

-- ==========================================
-- 5. RESTAURER LA CONTRAINTE (OPTIONNEL)
-- ==========================================
-- NOTE: La contrainte n'est PAS recréée car elle ne peut pas vérifier les agents des institutions
-- La colonne id_agent est nullable et peut référencer soit agents (ministères) soit agents_institutions_main (institutions)
-- 
-- Si vous souhaitez quand même recréer la contrainte (pour les agents des ministères uniquement),
-- décommentez les lignes suivantes, mais cela empêchera les utilisateurs d'institutions d'avoir un id_agent:
--
-- ALTER TABLE utilisateurs 
-- ADD CONSTRAINT utilisateurs_id_agent_fkey 
-- FOREIGN KEY (id_agent) REFERENCES agents(id) ON DELETE SET NULL;
--
-- ATTENTION: Si vous recréez cette contrainte, l'utilisateur drh.cei créé ci-dessus
-- ne pourra plus être mis à jour car son id_agent pointe vers agents_institutions_main

-- ==========================================
-- NOTES IMPORTANTES
-- ==========================================
-- 1. Vous devez générer le hash bcrypt du mot de passe avant d'exécuter ce script
--    Exemple avec Node.js:
--    const bcrypt = require('bcrypt');
--    const hash = await bcrypt.hash('CEI2024', 10);
--    Remplacez '$2b$10$YourBcryptHashHere' par le hash généré
--
-- 2. Ajustez les IDs des tables de référence (civilites, situation_matrimoniale, etc.)
--    selon vos données existantes
--
-- 3. Le matricule 'CEI-DRH-001' doit être unique dans votre base de données
--
-- 4. Vérifiez que le rôle 'DRH' existe dans la table roles, sinon créez-le d'abord:
--    INSERT INTO roles (nom, description) 
--    VALUES ('DRH', 'Directeur des Ressources Humaines') 
--    RETURNING id;

