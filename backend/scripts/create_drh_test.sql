-- Script SQL pour créer un agent DRH de test
-- Ce script crée un DRH pour le Ministère des Ressources Humaines (ID: 1)

-- 1. Vérifier et créer le ministère s'il n'existe pas
INSERT INTO ministeres (id, code, nom, sigle, description, adresse, telephone, email, website, logo_url, is_active, created_at, updated_at)
VALUES (
    1, 
    'MIN001', 
    'Ministère des Ressources Humaines', 
    'MRH', 
    'Ministère chargé de la gestion des ressources humaines de l''État', 
    'Abidjan, Côte d''Ivoire', 
    '+225 20 30 40 50', 
    'contact@mrh.gov.ci', 
    'https://mrh.gov.ci', 
    '/img/logo-mrh.png', 
    true, 
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    sigle = EXCLUDED.sigle,
    description = EXCLUDED.description,
    updated_at = NOW();

-- 2. Créer l'agent DRH
INSERT INTO agents (
    id, 
    matricule, 
    nom, 
    prenom, 
    date_naissance, 
    lieu_naissance, 
    telephone, 
    email, 
    adresse, 
    id_civilite, 
    id_situation_matrimoniale, 
    id_nationalite, 
    id_type_agent, 
    id_ministere, 
    id_grade, 
    id_service, 
    id_fonction, 
    date_embauche, 
    statut, 
    created_at, 
    updated_at
)
VALUES (
    1, 
    'DRH001', 
    'KOUAME', 
    'Jean-Baptiste', 
    '1975-03-15', 
    'Abidjan', 
    '+225 07 12 34 56', 
    'drh@mrh.gov.ci', 
    'Cocody, Abidjan', 
    1, -- Homme (supposé que l'ID 1 = Homme dans la table civilites)
    1, -- Marié (supposé que l'ID 1 = Marié dans situation_matrimonials)
    1, -- Ivoirien (supposé que l'ID 1 = Ivoirien dans nationalites)
    1, -- Fonctionnaire (supposé que l'ID 1 = Fonctionnaire dans type_d_agents)
    1, -- Ministère des Ressources Humaines
    1, -- Grade DRH (supposé que l'ID 1 = DRH dans grades)
    1, -- Service DRH (supposé que l'ID 1 = DRH dans services)
    1, -- Fonction DRH (supposé que l'ID 1 = DRH dans fonctions)
    '2010-01-15', 
    'Actif', 
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    prenom = EXCLUDED.prenom,
    email = EXCLUDED.email,
    updated_at = NOW();

-- 3. Vérifier et créer le rôle DRH s'il n'existe pas
INSERT INTO roles (id, nom, description, permissions, is_active, created_at, updated_at)
VALUES (
    2, 
    'DRH', 
    'Directeur des Ressources Humaines', 
    '["read", "write", "delete", "manage_agents", "manage_grades", "manage_services", "manage_fonctions", "view_reports", "manage_organization"]', 
    true, 
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nom = EXCLUDED.nom,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- 4. Créer le compte utilisateur pour le DRH
INSERT INTO utilisateurs (
    id, 
    username, 
    email, 
    password_hash, 
    id_role, 
    id_agent, 
    is_active, 
    last_login, 
    created_at, 
    updated_at
)
VALUES (
    2, 
    'drh.mrh', 
    'drh@mrh.gov.ci', 
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- mot de passe: "password"
    2, -- Rôle DRH
    1, -- Agent DRH créé ci-dessus
    true, 
    NULL, 
    NOW(), 
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    updated_at = NOW();

-- 5. Créer les données de référence nécessaires si elles n'existent pas

-- Civilités
INSERT INTO civilites (id, libelle, created_at, updated_at)
VALUES 
    (1, 'Monsieur', NOW(), NOW()),
    (2, 'Madame', NOW(), NOW()),
    (3, 'Mademoiselle', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Situations matrimoniales
INSERT INTO situation_matrimonials (id, libelle, created_at, updated_at)
VALUES 
    (1, 'Marié(e)', NOW(), NOW()),
    (2, 'Célibataire', NOW(), NOW()),
    (3, 'Divorcé(e)', NOW(), NOW()),
    (4, 'Veuf/Veuve', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Nationalités
INSERT INTO nationalites (id, libelle, created_at, updated_at)
VALUES 
    (1, 'Ivoirien(ne)', NOW(), NOW()),
    (2, 'Français(e)', NOW(), NOW()),
    (3, 'Malien(ne)', NOW(), NOW()),
    (4, 'Burkinabé', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Types d'agents
INSERT INTO type_d_agents (id, libelle, created_at, updated_at)
VALUES 
    (1, 'Fonctionnaire', NOW(), NOW()),
    (2, 'Contractuel', NOW(), NOW()),
    (3, 'Stagiaire', NOW(), NOW()),
    (4, 'Vacataire', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Grades
INSERT INTO grades (id, libelle, description, created_at, updated_at)
VALUES 
    (1, 'Directeur des Ressources Humaines', 'DRH - Grade A+', NOW(), NOW()),
    (2, 'Directeur', 'Directeur - Grade A', NOW(), NOW()),
    (3, 'Chef de Service', 'Chef de Service - Grade B', NOW(), NOW()),
    (4, 'Agent Principal', 'Agent Principal - Grade C', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Services
INSERT INTO services (id, libelle, description, id_ministere, created_at, updated_at)
VALUES 
    (1, 'Direction des Ressources Humaines', 'Service DRH du ministère', 1, NOW(), NOW()),
    (2, 'Service de la Formation', 'Service de formation des agents', 1, NOW(), NOW()),
    (3, 'Service de la Paie', 'Service de gestion de la paie', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Fonctions
INSERT INTO fonctions (id, libelle, description, id_ministere, created_at, updated_at)
VALUES 
    (1, 'Directeur des Ressources Humaines', 'Fonction de DRH', 1, NOW(), NOW()),
    (2, 'Chef de Service Formation', 'Responsable de la formation', 1, NOW(), NOW()),
    (3, 'Agent de Paie', 'Gestionnaire de la paie', 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Afficher les informations créées
SELECT 
    '=== INFORMATIONS DU DRH CRÉÉ ===' as info;

SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.email,
    a.telephone,
    m.nom as ministere,
    g.libelle as grade,
    s.libelle as service,
    f.libelle as fonction
FROM agents a
LEFT JOIN ministeres m ON a.id_ministere = m.id
LEFT JOIN grades g ON a.id_grade = g.id
LEFT JOIN directions s ON a.id_direction = s.id
LEFT JOIN fonctions f ON a.id_fonction = f.id
WHERE a.id = 1;

SELECT 
    '=== COMPTE UTILISATEUR ===' as info;

SELECT 
    u.id,
    u.username,
    u.email,
    r.nom as role,
    u.is_active,
    a.nom || ' ' || a.prenom as agent_nom
FROM utilisateurs u
LEFT JOIN roles r ON u.id_role = r.id
LEFT JOIN agents a ON u.id_agent = a.id
WHERE u.id = 2;

SELECT 
    '=== INFORMATIONS DE CONNEXION ===' as info;

SELECT 
    'Nom d''utilisateur: drh.mrh' as login_info
UNION ALL
SELECT 
    'Mot de passe: password' as login_info
UNION ALL
SELECT 
    'Email: drh@mrh.gov.ci' as login_info
UNION ALL
SELECT 
    'Ministère: Ministère des Ressources Humaines' as login_info
UNION ALL
SELECT 
    'Rôle: DRH (Directeur des Ressources Humaines)' as login_info;

-- 7. Vérifier que tout est bien créé
SELECT 
    '=== VÉRIFICATION DES DONNÉES ===' as info;

SELECT 
    'Ministères' as table_name,
    COUNT(*) as count
FROM ministeres
UNION ALL
SELECT 
    'Agents' as table_name,
    COUNT(*) as count
FROM agents
UNION ALL
SELECT 
    'Utilisateurs' as table_name,
    COUNT(*) as count
FROM utilisateurs
UNION ALL
SELECT 
    'Rôles' as table_name,
    COUNT(*) as count
FROM roles;

COMMIT;
