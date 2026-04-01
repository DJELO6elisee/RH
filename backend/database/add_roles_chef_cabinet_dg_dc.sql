-- Ajout des nouveaux rôles : Chef de Cabinet, Directeur Général (DG), Directeur Central (DC)
-- Date : 12 Octobre 2025

INSERT INTO roles (nom, description, permissions) VALUES
('chef_cabinet', 'Chef de Cabinet avec accès stratégique et de coordination', '{"gestion_cabinet": true, "coordination": true, "reports": true, "acces_directions": true, "validations": true}'),
('directeur_general', 'Directeur Général avec accès complet à l''organisation', '{"gestion_generale": true, "supervision": true, "reports": true, "acces_total": true, "validations": true, "demandes": true}'),
('directeur_central', 'Directeur Central avec accès à la gestion centralisée', '{"gestion_centrale": true, "coordination": true, "reports": true, "acces_central": true, "validations": true, "demandes": true}')
ON CONFLICT (nom) DO NOTHING;

-- Vérification des rôles ajoutés
SELECT id, nom, description, permissions, created_at 
FROM roles 
WHERE nom IN ('chef_cabinet', 'directeur_general', 'directeur_central')
ORDER BY created_at DESC;
