-- Données d'exemple pour les tables géographiques
-- ==============================================
-- Données pour la Côte d'Ivoire

-- Insertion des régions
INSERT INTO regions (code, nom, chef_lieu, superficie, population, description) VALUES
('ABJ', 'Abidjan', 'Abidjan', 2119, 4765000, 'Région économique de la Côte d''Ivoire'),
('YAM', 'Yamoussoukro', 'Yamoussoukro', 2070, 355573, 'Capitale politique de la Côte d''Ivoire'),
('BOU', 'Bouaké', 'Bouaké', 14000, 2000000, 'Région du centre de la Côte d''Ivoire'),
('DAL', 'Daloa', 'Daloa', 11000, 1500000, 'Région de l''ouest de la Côte d''Ivoire'),
('KOR', 'Korhogo', 'Korhogo', 12000, 1200000, 'Région du nord de la Côte d''Ivoire'),
('MAN', 'Man', 'Man', 8000, 1000000, 'Région de l''ouest montagneux'),
('SAN', 'San-Pédro', 'San-Pédro', 6000, 800000, 'Région du sud-ouest portuaire'),
('BON', 'Bondoukou', 'Bondoukou', 10000, 900000, 'Région de l''est de la Côte d''Ivoire');

-- Insertion des départements
INSERT INTO departements (id_region, code, nom, chef_lieu, superficie, population, description) VALUES
-- Départements d'Abidjan
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-01', 'Abidjan', 'Abidjan', 2119, 4765000, 'Département d''Abidjan'),
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-02', 'Anyama', 'Anyama', 500, 200000, 'Département d''Anyama'),
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-03', 'Bingerville', 'Bingerville', 300, 150000, 'Département de Bingerville'),

-- Départements de Yamoussoukro
((SELECT id FROM regions WHERE code = 'YAM'), 'YAM-01', 'Yamoussoukro', 'Yamoussoukro', 2070, 355573, 'Département de Yamoussoukro'),
((SELECT id FROM regions WHERE code = 'YAM'), 'YAM-02', 'Toumodi', 'Toumodi', 800, 100000, 'Département de Toumodi'),

-- Départements de Bouaké
((SELECT id FROM regions WHERE code = 'BOU'), 'BOU-01', 'Bouaké', 'Bouaké', 5000, 800000, 'Département de Bouaké'),
((SELECT id FROM regions WHERE code = 'BOU'), 'BOU-02', 'Sakassou', 'Sakassou', 3000, 200000, 'Département de Sakassou'),
((SELECT id FROM regions WHERE code = 'BOU'), 'BOU-03', 'Béoumi', 'Béoumi', 2000, 150000, 'Département de Béoumi'),

-- Départements de Daloa
((SELECT id FROM regions WHERE code = 'DAL'), 'DAL-01', 'Daloa', 'Daloa', 4000, 600000, 'Département de Daloa'),
((SELECT id FROM regions WHERE code = 'DAL'), 'DAL-02', 'Issia', 'Issia', 3000, 200000, 'Département d''Issia'),
((SELECT id FROM regions WHERE code = 'DAL'), 'DAL-03', 'Vavoua', 'Vavoua', 2000, 150000, 'Département de Vavoua'),

-- Départements de Korhogo
((SELECT id FROM regions WHERE code = 'KOR'), 'KOR-01', 'Korhogo', 'Korhogo', 5000, 400000, 'Département de Korhogo'),
((SELECT id FROM regions WHERE code = 'KOR'), 'KOR-02', 'Ferkessédougou', 'Ferkessédougou', 3000, 200000, 'Département de Ferkessédougou'),

-- Départements de Man
((SELECT id FROM regions WHERE code = 'MAN'), 'MAN-01', 'Man', 'Man', 3000, 300000, 'Département de Man'),
((SELECT id FROM regions WHERE code = 'MAN'), 'MAN-02', 'Danané', 'Danané', 2000, 150000, 'Département de Danané'),

-- Départements de San-Pédro
((SELECT id FROM regions WHERE code = 'SAN'), 'SAN-01', 'San-Pédro', 'San-Pédro', 2000, 400000, 'Département de San-Pédro'),
((SELECT id FROM regions WHERE code = 'SAN'), 'SAN-02', 'Sassandra', 'Sassandra', 2000, 200000, 'Département de Sassandra'),

-- Départements de Bondoukou
((SELECT id FROM regions WHERE code = 'BON'), 'BON-01', 'Bondoukou', 'Bondoukou', 4000, 300000, 'Département de Bondoukou'),
((SELECT id FROM regions WHERE code = 'BON'), 'BON-02', 'Bouna', 'Bouna', 3000, 200000, 'Département de Bouna');

-- Insertion des localités (villes principales)
INSERT INTO localites (id_departement, code, nom, type_localite, population, superficie, latitude, longitude, altitude, description) VALUES
-- Localités d'Abidjan
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-001', 'Abidjan', 'ville', 4765000, 2119, 5.3600, -4.0083, 10, 'Capitale économique de la Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-002', 'Cocody', 'commune', 500000, 200, 5.3500, -4.0000, 15, 'Commune résidentielle d''Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-003', 'Plateau', 'commune', 200000, 50, 5.3200, -4.0200, 20, 'Centre des affaires d''Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-004', 'Marcory', 'commune', 300000, 100, 5.3000, -4.0100, 5, 'Commune industrielle d''Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-005', 'Yopougon', 'commune', 800000, 300, 5.3800, -4.0500, 25, 'Plus grande commune d''Abidjan'),

-- Localités d'Anyama
((SELECT id FROM departements WHERE code = 'ABJ-02'), 'ABJ-02-001', 'Anyama', 'ville', 150000, 200, 5.4000, -4.1000, 30, 'Ville d''Anyama'),
((SELECT id FROM departements WHERE code = 'ABJ-02'), 'ABJ-02-002', 'Songon', 'commune', 50000, 100, 5.4200, -4.1200, 35, 'Commune de Songon'),

-- Localités de Bingerville
((SELECT id FROM departements WHERE code = 'ABJ-03'), 'ABJ-03-001', 'Bingerville', 'ville', 100000, 150, 5.3500, -3.9000, 40, 'Ancienne capitale de la Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'ABJ-03'), 'ABJ-03-002', 'Adjamé', 'commune', 200000, 100, 5.3300, -3.9500, 45, 'Commune d''Adjamé'),

-- Localités de Yamoussoukro
((SELECT id FROM departements WHERE code = 'YAM-01'), 'YAM-01-001', 'Yamoussoukro', 'ville', 355573, 2070, 6.8200, -5.2800, 200, 'Capitale politique de la Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'YAM-01'), 'YAM-01-002', 'Attiégouakro', 'village', 5000, 50, 6.8000, -5.3000, 220, 'Village d''Attiégouakro'),

-- Localités de Bouaké
((SELECT id FROM departements WHERE code = 'BOU-01'), 'BOU-01-001', 'Bouaké', 'ville', 800000, 2000, 7.6900, -5.0300, 300, 'Deuxième ville de Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'BOU-01'), 'BOU-01-002', 'Sakassou', 'ville', 200000, 500, 7.5000, -5.2000, 250, 'Ville de Sakassou'),

-- Localités de Daloa
((SELECT id FROM departements WHERE code = 'DAL-01'), 'DAL-01-001', 'Daloa', 'ville', 600000, 1500, 6.8700, -6.4500, 400, 'Ville de Daloa'),
((SELECT id FROM departements WHERE code = 'DAL-01'), 'DAL-01-002', 'Issia', 'ville', 200000, 800, 6.5000, -6.2000, 350, 'Ville d''Issia'),

-- Localités de Korhogo
((SELECT id FROM departements WHERE code = 'KOR-01'), 'KOR-01-001', 'Korhogo', 'ville', 400000, 1200, 9.4600, -5.6300, 500, 'Ville de Korhogo'),
((SELECT id FROM departements WHERE code = 'KOR-01'), 'KOR-01-002', 'Ferkessédougou', 'ville', 200000, 600, 9.2000, -5.8000, 450, 'Ville de Ferkessédougou'),

-- Localités de Man
((SELECT id FROM departements WHERE code = 'MAN-01'), 'MAN-01-001', 'Man', 'ville', 300000, 800, 7.4100, -7.5500, 600, 'Ville de Man'),
((SELECT id FROM departements WHERE code = 'MAN-01'), 'MAN-01-002', 'Danané', 'ville', 150000, 400, 7.2000, -8.1000, 550, 'Ville de Danané'),

-- Localités de San-Pédro
((SELECT id FROM departements WHERE code = 'SAN-01'), 'SAN-01-001', 'San-Pédro', 'ville', 400000, 1000, 4.7500, -6.6400, 10, 'Port de San-Pédro'),
((SELECT id FROM departements WHERE code = 'SAN-01'), 'SAN-01-002', 'Sassandra', 'ville', 200000, 500, 4.9500, -6.0800, 15, 'Ville de Sassandra'),

-- Localités de Bondoukou
((SELECT id FROM departements WHERE code = 'BON-01'), 'BON-01-001', 'Bondoukou', 'ville', 300000, 1000, 8.0400, -2.8000, 400, 'Ville de Bondoukou'),
((SELECT id FROM departements WHERE code = 'BON-01'), 'BON-01-002', 'Bouna', 'ville', 200000, 600, 9.2700, -2.9500, 350, 'Ville de Bouna');

-- Insertion d'exemples d'adresses d'agents
INSERT INTO agents_localites (id_agent, id_localite, type_adresse, adresse_complete, is_principal) VALUES
-- Agent 1 (DRH) - Adresse professionnelle à Abidjan
(1, (SELECT id FROM localites WHERE code = 'ABJ-01-001'), 'professionnelle', 'Immeuble administratif, Plateau, Abidjan', TRUE),
(1, (SELECT id FROM localites WHERE code = 'ABJ-01-002'), 'personnelle', 'Résidence Cocody, Abidjan', FALSE),

-- Agent 2 - Adresse professionnelle à Yamoussoukro
(2, (SELECT id FROM localites WHERE code = 'YAM-01-001'), 'professionnelle', 'Ministère, Yamoussoukro', TRUE),
(2, (SELECT id FROM localites WHERE code = 'YAM-01-001'), 'personnelle', 'Quartier résidentiel, Yamoussoukro', FALSE);

-- Insertion d'exemples d'affectations géographiques
INSERT INTO affectations_geographiques (id_agent, id_localite_source, id_localite_destination, motif, date_debut, date_fin, statut, approbation_requise, approbation_donnee) VALUES
(1, (SELECT id FROM localites WHERE code = 'ABJ-01-001'), (SELECT id FROM localites WHERE code = 'YAM-01-001'), 'Mutation administrative', '2023-01-15', '2023-12-31', 'terminee', TRUE, TRUE),
(2, (SELECT id FROM localites WHERE code = 'YAM-01-001'), (SELECT id FROM localites WHERE code = 'BOU-01-001'), 'Formation professionnelle', '2023-06-01', '2023-08-31', 'terminee', TRUE, TRUE),
(1, (SELECT id FROM localites WHERE code = 'YAM-01-001'), (SELECT id FROM localites WHERE code = 'ABJ-01-001'), 'Retour de mission', '2024-01-01', NULL, 'en_cours', TRUE, FALSE);
