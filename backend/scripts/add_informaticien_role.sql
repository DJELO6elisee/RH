INSERT INTO roles (nom, description) 
SELECT 'informaticien', 'Rôle pour les administrateurs informatiques (Dashboard Informaticien)'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nom = 'informaticien');
