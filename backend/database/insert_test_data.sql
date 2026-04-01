-- Script d'insertion des données de test
-- ======================================
-- Ce script insère des données de test avec des agents et utilisateurs

-- 1. INSÉRER DES AGENTS DE TEST
INSERT INTO agents (
    id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent,
    id_ministere, id_entite_principale, nom, prenom, matricule,
    date_de_naissance, lieu_de_naissance, age, telephone1, telephone2,
    sexe, nom_de_la_mere, nom_du_pere, email, statut_emploi, date_embauche
) VALUES
-- Ministère RH
(1, 2, 1, 1, 1, 1, 'KOUAME', 'Jean', 'RH001', '1980-01-15', 'Abidjan', 44, '+225 07 12 34 56', '+225 05 12 34 56', 'M', 'KOUAME Marie', 'KOUAME Paul', 'jean.kouame@rh.gouv.ci', 'actif', '2010-01-15'),
(2, 1, 1, 1, 1, 2, 'TRAORE', 'Marie', 'RH002', '1985-03-20', 'Bouaké', 39, '+225 07 23 45 67', '+225 05 23 45 67', 'F', 'TRAORE Fatou', 'TRAORE Ibrahim', 'marie.traore@rh.gouv.ci', 'actif', '2012-03-20'),
(1, 2, 1, 2, 1, 3, 'DIABATE', 'Paul', 'RH003', '1978-07-10', 'Daloa', 46, '+225 07 34 56 78', '+225 05 34 56 78', 'M', 'DIABATE Aminata', 'DIABATE Sékou', 'paul.diabate@rh.gouv.ci', 'actif', '2008-07-10'),

-- Ministère Éducation
(1, 2, 1, 1, 2, 4, 'KONE', 'Fatou', 'EDU001', '1982-11-25', 'Korhogo', 42, '+225 07 45 67 89', '+225 05 45 67 89', 'F', 'KONE Mariam', 'KONE Moussa', 'fatou.kone@education.gouv.ci', 'actif', '2011-11-25'),
(1, 1, 1, 1, 2, 5, 'SANGARE', 'Ibrahim', 'EDU002', '1975-05-12', 'San-Pédro', 49, '+225 07 56 78 90', '+225 05 56 78 90', 'M', 'SANGARE Aïcha', 'SANGARE Oumar', 'ibrahim.sangare@education.gouv.ci', 'actif', '2009-05-12'),
(2, 2, 1, 2, 2, 6, 'OUATTARA', 'Aminata', 'EDU003', '1988-09-08', 'Yamoussoukro', 36, '+225 07 67 89 01', '+225 05 67 89 01', 'F', 'OUATTARA Kadi', 'OUATTARA Ali', 'aminata.ouattara@education.gouv.ci', 'actif', '2013-09-08'),

-- Ministère Santé
(1, 2, 1, 1, 3, 7, 'BAMBA', 'Drissa', 'SANTE001', '1983-04-18', 'Gagnoa', 41, '+225 07 78 90 12', '+225 05 78 90 12', 'M', 'BAMBA Mariam', 'BAMBA Yaya', 'drissa.bamba@sante.gouv.ci', 'actif', '2010-04-18'),
(2, 1, 1, 1, 3, 8, 'KOUADIO', 'Henriette', 'SANTE002', '1987-12-03', 'Man', 37, '+225 07 89 01 23', '+225 05 89 01 23', 'F', 'KOUADIO Rose', 'KOUADIO Jean', 'henriette.kouadio@sante.gouv.ci', 'actif', '2012-12-03'),
(1, 2, 1, 2, 3, 9, 'KONE', 'Moussa', 'SANTE003', '1981-08-22', 'Divo', 43, '+225 07 90 12 34', '+225 05 90 12 34', 'M', 'KONE Fatou', 'KONE Sékou', 'moussa.kone@sante.gouv.ci', 'actif', '2009-08-22'),

-- Ministère Finances
(1, 2, 1, 1, 4, 10, 'TRAORE', 'Mariam', 'FIN001', '1984-06-14', 'Anyama', 40, '+225 07 01 23 45', '+225 05 01 23 45', 'F', 'TRAORE Aïcha', 'TRAORE Ibrahim', 'mariam.traore@finances.gouv.ci', 'actif', '2011-06-14'),
(1, 1, 1, 1, 4, 11, 'DIABATE', 'Sékou', 'FIN002', '1979-02-28', 'Bingerville', 45, '+225 07 12 34 56', '+225 05 12 34 56', 'M', 'DIABATE Mariam', 'DIABATE Oumar', 'sekou.diabate@finances.gouv.ci', 'actif', '2008-02-28'),
(2, 2, 1, 2, 4, 12, 'KOUAME', 'Aïcha', 'FIN003', '1986-10-17', 'Cocody', 38, '+225 07 23 45 67', '+225 05 23 45 67', 'F', 'KOUAME Fatou', 'KOUAME Paul', 'aicha.kouame@finances.gouv.ci', 'actif', '2013-10-17'),

-- Ministère Intérieur
(1, 2, 1, 1, 5, 13, 'SANGARE', 'Oumar', 'INT001', '1980-03-05', 'Marcory', 44, '+225 07 34 56 78', '+225 05 34 56 78', 'M', 'SANGARE Mariam', 'SANGARE Ibrahim', 'oumar.sangare@interieur.gouv.ci', 'actif', '2010-03-05'),
(1, 1, 1, 1, 5, 14, 'KONE', 'Kadi', 'INT002', '1983-11-12', 'Plateau', 41, '+225 07 45 67 89', '+225 05 45 67 89', 'F', 'KONE Aïcha', 'KONE Moussa', 'kadi.kone@interieur.gouv.ci', 'actif', '2011-11-12'),
(2, 2, 1, 2, 5, 15, 'TRAORE', 'Yaya', 'INT003', '1985-07-25', 'Treichville', 39, '+225 07 56 78 90', '+225 05 56 78 90', 'M', 'TRAORE Fatou', 'TRAORE Sékou', 'yaya.traore@interieur.gouv.ci', 'actif', '2012-07-25')
ON CONFLICT (matricule) DO NOTHING;

-- 2. INSÉRER DES UTILISATEURS DE TEST
-- Note: Les mots de passe sont hashés avec bcrypt (salt rounds: 12)
-- Mot de passe en clair pour tous: "password123"
INSERT INTO utilisateurs (username, email, password_hash, id_role, id_agent, is_active) VALUES
-- Ministère RH
('admin.rh', 'admin.rh@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 2, 1, true),
('agent.rh1', 'agent.rh1@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 2, true),
('agent.rh2', 'agent.rh2@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 3, true),

-- Ministère Éducation
('admin.education', 'admin.education@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 2, 4, true),
('agent.education1', 'agent.education1@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 5, true),
('agent.education2', 'agent.education2@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 6, true),

-- Ministère Santé
('admin.sante', 'admin.sante@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 2, 7, true),
('agent.sante1', 'agent.sante1@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 8, true),
('agent.sante2', 'agent.sante2@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 9, true),

-- Ministère Finances
('admin.finances', 'admin.finances@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 2, 10, true),
('agent.finances1', 'agent.finances1@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 11, true),
('agent.finances2', 'agent.finances2@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 12, true),

-- Ministère Intérieur
('admin.interieur', 'admin.interieur@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 2, 13, true),
('agent.interieur1', 'agent.interieur1@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 14, true),
('agent.interieur2', 'agent.interieur2@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 3, 15, true),

-- Super Admin (pour tests)
('super.admin', 'super.admin@gouv.ci', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 1, 1, true)
ON CONFLICT (username) DO NOTHING;

-- 3. INSÉRER DES ENFANTS DE TEST
INSERT INTO enfants (id_agent, nom, prenom, sexe, date_de_naissance, scolarise, ayant_droit) VALUES
(1, 'KOUAME', 'Paul', 'M', '2010-05-15', true, true),
(1, 'KOUAME', 'Marie', 'F', '2012-08-20', true, true),
(2, 'TRAORE', 'Ibrahim', 'M', '2015-03-10', true, true),
(4, 'KONE', 'Fatou', 'F', '2011-11-25', true, true),
(4, 'KONE', 'Moussa', 'M', '2014-07-18', true, true),
(7, 'BAMBA', 'Aïcha', 'F', '2013-09-12', true, true),
(10, 'TRAORE', 'Sékou', 'M', '2016-01-30', true, true),
(13, 'SANGARE', 'Mariam', 'F', '2012-04-22', true, true)
ON CONFLICT DO NOTHING;

-- 4. VÉRIFICATION DES DONNÉES INSÉRÉES
SELECT 
    'Vérification des données de test' as statut,
    COUNT(*) as total_agents
FROM agents;

SELECT 
    'Vérification des utilisateurs' as statut,
    COUNT(*) as total_utilisateurs
FROM utilisateurs;

SELECT 
    'Vérification des enfants' as statut,
    COUNT(*) as total_enfants
FROM enfants;

-- 5. AFFICHAGE DE LA HIÉRARCHIE COMPLÈTE
SELECT 
    'Hiérarchie complète' as info,
    u.username,
    u.email,
    r.nom as role_nom,
    a.nom as agent_nom,
    a.prenom as agent_prenom,
    a.matricule,
    m.nom as ministere_nom,
    m.code as ministere_code,
    e.nom as entite_nom
FROM utilisateurs u
LEFT JOIN roles r ON u.id_role = r.id
LEFT JOIN agents a ON u.id_agent = a.id
LEFT JOIN ministeres m ON a.id_ministere = m.id
LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
ORDER BY m.nom, u.username;

-- 6. STATISTIQUES PAR MINISTÈRE
SELECT 
    'Statistiques par ministère' as info,
    m.nom as ministere_nom,
    COUNT(DISTINCT a.id) as nb_agents,
    COUNT(DISTINCT e.id) as nb_entites,
    COUNT(DISTINCT u.id) as nb_utilisateurs
FROM ministeres m
LEFT JOIN agents a ON m.id = a.id_ministere
LEFT JOIN entites_administratives e ON m.id = e.id_ministere
LEFT JOIN utilisateurs u ON a.id = u.id_agent
GROUP BY m.id, m.nom
ORDER BY m.nom;

-- Message de fin
SELECT 'Données de test insérées avec succès !' as message;
SELECT 'Vous pouvez maintenant tester les routes d''authentification avec ces utilisateurs.' as info;
SELECT 'Mot de passe pour tous les utilisateurs: password123' as password_info;
