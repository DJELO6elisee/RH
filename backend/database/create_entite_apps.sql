-- Script pour créer les applications entité et lier les DRH aux entités
-- ====================================================================

-- Table pour stocker les configurations des applications entité
CREATE TABLE IF NOT EXISTS entite_apps (
    id SERIAL PRIMARY KEY,
    id_entite INTEGER REFERENCES entites_administratives(id) ON DELETE CASCADE,
    id_drh INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    app_name VARCHAR(100) NOT NULL,
    app_port INTEGER UNIQUE NOT NULL,
    app_url VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les configurations d'applications pour chaque entité
INSERT INTO entite_apps (id_entite, id_drh, app_name, app_port, app_url) VALUES

-- Ministère de la Santé et de l'Hygiène Publique
(7, (SELECT id FROM utilisateurs WHERE username = 'drh.dsp'), 'app-dsp', 3001, 'http://localhost:3001'),
(8, (SELECT id FROM utilisateurs WHERE username = 'drh.dh'), 'app-dh', 3002, 'http://localhost:3002'),
(9, (SELECT id FROM utilisateurs WHERE username = 'drh.dp'), 'app-dp', 3003, 'http://localhost:3003'),

-- Ministère de l'Économie et des Finances
(10, (SELECT id FROM utilisateurs WHERE username = 'drh.db'), 'app-db', 3004, 'http://localhost:3004'),
(11, (SELECT id FROM utilisateurs WHERE username = 'drh.dc'), 'app-dc', 3005, 'http://localhost:3005'),
(12, (SELECT id FROM utilisateurs WHERE username = 'drh.di'), 'app-di', 3006, 'http://localhost:3006'),

-- Ministère de l'Intérieur et de la Sécurité
(13, (SELECT id FROM utilisateurs WHERE username = 'drh.ds'), 'app-ds', 3007, 'http://localhost:3007'),
(14, (SELECT id FROM utilisateurs WHERE username = 'drh.dc'), 'app-dc-circulation', 3008, 'http://localhost:3008'),
(15, (SELECT id FROM utilisateurs WHERE username = 'drh.dp'), 'app-dp-police', 3009, 'http://localhost:3009');

-- Afficher le résumé des applications créées
SELECT 
    ea.id as "ID Entité",
    ea.nom as "Entité",
    ea.sigle as "Sigle",
    u.username as "DRH",
    u.email as "Email DRH",
    app.app_name as "Nom App",
    app.app_port as "Port",
    app.app_url as "URL"
FROM entite_apps app
JOIN entites_administratives ea ON app.id_entite = ea.id
JOIN utilisateurs u ON app.id_drh = u.id
ORDER BY app.app_port;
