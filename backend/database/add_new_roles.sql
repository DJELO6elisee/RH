-- Ajout des nouveaux rôles dans la base de données
-- ===================================================

-- Insertion des nouveaux rôles
INSERT INTO roles (nom, description, permissions) VALUES
('directeur', 'Directeur avec accès complet à la gestion de sa direction', '{"direction": true, "agents_direction": true, "reports_direction": true, "validations": true, "all_demandes": true}'),
('sous_directeur', 'Sous-directeur avec accès à la gestion de sa sous-direction', '{"sous_direction": true, "agents_sous_direction": true, "reports_sous_direction": true, "validations": true}'),
('dir_cabinet', 'Directeur de cabinet avec accès stratégique et de supervision', '{"cabinet": true, "supervision": true, "reports_cabinet": true, "validations_cabinet": true, "all_directions": true}')
ON CONFLICT (nom) DO NOTHING;

-- Afficher tous les rôles après insertion
SELECT * FROM roles ORDER BY id;

