-- Script pour créer un DRH pour chaque entité administrative
-- ============================================================
-- Les DRH sont des agents existants dans la base de données

-- Supprimer les anciens DRH d'entités s'ils existent
DELETE FROM utilisateurs WHERE username LIKE 'drh.%';

-- Créer un DRH pour chaque entité administrative en liant aux agents existants
INSERT INTO utilisateurs (username, email, password_hash, id_role, id_agent, is_active) VALUES

-- Ministère de la Santé et de l'Hygiène Publique (id_ministere = 3)
('drh.dsp', 'drissa.bamba@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 8, TRUE), -- Direction de la Santé Publique (id=7) - Agent BAMBA Drissa (id=8)
('drh.dh', 'henriette.kouadio@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 9, TRUE),  -- Direction des Hôpitaux (id=8) - Agent KOUADIO Henriette (id=9)
('drh.dp', 'moussa.kone@sante.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 10, TRUE),  -- Direction de la Pharmacie (id=9) - Agent KONE Moussa (id=10)

-- Ministère de l'Économie et des Finances (id_ministere = 4)
('drh.db', 'mariam.traore@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 11, TRUE),  -- Direction du Budget (id=10) - Agent TRAORE Mariam (id=11)
('drh.dc', 'sekou.diabate@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 12, TRUE),  -- Direction de la Comptabilité (id=11) - Agent DIABATE Sékou (id=12)
('drh.di', 'aicha.kouame@finances.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 13, TRUE),  -- Direction des Impôts (id=12) - Agent KOUAME Aïcha (id=13)

-- Ministère de l'Intérieur et de la Sécurité (id_ministere = 5)
('drh.ds', 'oumar.sangare@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 14, TRUE),  -- Direction de la Sécurité (id=13) - Agent SANGARE Oumar (id=14)
('drh.dc', 'kadi.kone@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 15, TRUE),  -- Direction de la Circulation (id=14) - Agent KONE Kadi (id=15)
('drh.dp', 'yaya.traore@interieur.gouv.ci', '$2b$10$Qti.sGI6f.DWQusAxDifvuOROjiVZjgAE0e.5zD0T3eJBVBwbB5TG', 4, 16, TRUE); -- Direction de la Police (id=15) - Agent TRAORE Yaya (id=16)

-- Vérifier les utilisateurs créés
SELECT 
    u.id,
    u.username,
    u.email,
    r.nom as role,
    u.is_active,
    u.created_at
FROM utilisateurs u
JOIN roles r ON u.id_role = r.id
WHERE u.username LIKE 'drh.%'
ORDER BY u.username;

-- Afficher les informations de connexion pour chaque DRH avec les détails des agents
SELECT 
    u.username as "Nom d'utilisateur",
    u.email as "Email",
    'admin123' as "Mot de passe (temporaire)",
    CONCAT(a.nom, ' ', a.prenom) as "Nom complet de l'agent",
    a.matricule as "Matricule",
    ea.nom as "Entité",
    ea.sigle as "Sigle",
    m.nom as "Ministère",
    r.nom as "Rôle"
FROM utilisateurs u
JOIN roles r ON u.id_role = r.id
JOIN agents a ON u.id_agent = a.id
LEFT JOIN entites_administratives ea ON a.id_entite_principale = ea.id -- Lien via l'agent
LEFT JOIN ministeres m ON ea.id_ministere = m.id
WHERE u.username LIKE 'drh.%'
ORDER BY u.username;
