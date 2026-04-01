-- Données d'exemple pour les tables géographiques simplifiées
-- =========================================================
-- Données pour la Côte d'Ivoire

-- Insertion des régions
INSERT INTO regions (code, libele, chef_lieu, description) VALUES
('ABJ', 'District Autonome d''Abidjan', 'Abidjan', 'District Autonome'),
('YAM', 'District Autonome de Yamoussoukro', 'Yamoussoukro', 'District Autonome'),
('BOU', 'Gbêkê', 'Bouaké', 'Région du Centre'),
('DAL', 'Haut-Sassandra', 'Daloa', 'Région de l''Ouest'),
('KOR', 'Poro', 'Korhogo', 'Région du Nord'),
('MAN', 'Tonkpi', 'Man', 'Région de l''Ouest Montagneux'),
('SAN', 'San-Pédro', 'San-Pédro', 'Région du Sud-Ouest'),
('BON', 'Gontougo', 'Bondoukou', 'Région de l''Est');

-- Insertion des départements
INSERT INTO departements (id_region, code, libele, chef_lieu, description) VALUES
-- Départements d'Abidjan
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-01', 'Abidjan', 'Abidjan', 'Département d''Abidjan'),
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-02', 'Anyama', 'Anyama', 'Département d''Anyama'),
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-03', 'Bingerville', 'Bingerville', 'Département de Bingerville'),

-- Départements de Yamoussoukro
((SELECT id FROM regions WHERE code = 'YAM'), 'YAM-01', 'Yamoussoukro', 'Yamoussoukro', 'Département de Yamoussoukro'),
((SELECT id FROM regions WHERE code = 'YAM'), 'YAM-02', 'Toumodi', 'Toumodi', 'Département de Toumodi'),

-- Départements de Bouaké
((SELECT id FROM regions WHERE code = 'BOU'), 'BOU-01', 'Bouaké', 'Bouaké', 'Département de Bouaké'),
((SELECT id FROM regions WHERE code = 'BOU'), 'BOU-02', 'Sakassou', 'Sakassou', 'Département de Sakassou'),
((SELECT id FROM regions WHERE code = 'BOU'), 'BOU-03', 'Béoumi', 'Béoumi', 'Département de Béoumi'),

-- Départements de Daloa
((SELECT id FROM regions WHERE code = 'DAL'), 'DAL-01', 'Daloa', 'Daloa', 'Département de Daloa'),
((SELECT id FROM regions WHERE code = 'DAL'), 'DAL-02', 'Issia', 'Issia', 'Département d''Issia'),
((SELECT id FROM regions WHERE code = 'DAL'), 'DAL-03', 'Vavoua', 'Vavoua', 'Département de Vavoua'),

-- Départements de Korhogo
((SELECT id FROM regions WHERE code = 'KOR'), 'KOR-01', 'Korhogo', 'Korhogo', 'Département de Korhogo'),
((SELECT id FROM regions WHERE code = 'KOR'), 'KOR-02', 'Ferkessédougou', 'Ferkessédougou', 'Département de Ferkessédougou'),

-- Départements de Man
((SELECT id FROM regions WHERE code = 'MAN'), 'MAN-01', 'Man', 'Man', 'Département de Man'),
((SELECT id FROM regions WHERE code = 'MAN'), 'MAN-02', 'Danané', 'Danané', 'Département de Danané'),

-- Départements de San-Pédro
((SELECT id FROM regions WHERE code = 'SAN'), 'SAN-01', 'San-Pédro', 'San-Pédro', 'Département de San-Pédro'),
((SELECT id FROM regions WHERE code = 'SAN'), 'SAN-02', 'Sassandra', 'Sassandra', 'Département de Sassandra'),

-- Départements de Bondoukou
((SELECT id FROM regions WHERE code = 'BON'), 'BON-01', 'Bondoukou', 'Bondoukou', 'Département de Bondoukou'),
((SELECT id FROM regions WHERE code = 'BON'), 'BON-02', 'Bouna', 'Bouna', 'Département de Bouna');

-- Insertion des localités (villes principales)
INSERT INTO localites (id_departement, code, libele, type_localite, description) VALUES
-- Localités d'Abidjan
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-001', 'Abidjan', 'ville', 'Capitale économique de la Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-002', 'Cocody', 'commune', 'Commune résidentielle d''Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-003', 'Plateau', 'commune', 'Centre des affaires d''Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-004', 'Marcory', 'commune', 'Commune industrielle d''Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-005', 'Yopougon', 'commune', 'Plus grande commune d''Abidjan'),

-- Localités d'Anyama
((SELECT id FROM departements WHERE code = 'ABJ-02'), 'ABJ-02-001', 'Anyama', 'ville', 'Ville d''Anyama'),
((SELECT id FROM departements WHERE code = 'ABJ-02'), 'ABJ-02-002', 'Songon', 'commune', 'Commune de Songon'),

-- Localités de Bingerville
((SELECT id FROM departements WHERE code = 'ABJ-03'), 'ABJ-03-001', 'Bingerville', 'ville', 'Ancienne capitale de la Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'ABJ-03'), 'ABJ-03-002', 'Adjamé', 'commune', 'Commune d''Adjamé'),

-- Localités de Yamoussoukro
((SELECT id FROM departements WHERE code = 'YAM-01'), 'YAM-01-001', 'Yamoussoukro', 'ville', 'Capitale politique de la Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'YAM-01'), 'YAM-01-002', 'Attiégouakro', 'village', 'Village d''Attiégouakro'),

-- Localités de Bouaké
((SELECT id FROM departements WHERE code = 'BOU-01'), 'BOU-01-001', 'Bouaké', 'ville', 'Deuxième ville de Côte d''Ivoire'),
((SELECT id FROM departements WHERE code = 'BOU-01'), 'BOU-01-002', 'Sakassou', 'ville', 'Ville de Sakassou'),

-- Localités de Daloa
((SELECT id FROM departements WHERE code = 'DAL-01'), 'DAL-01-001', 'Daloa', 'ville', 'Ville de Daloa'),
((SELECT id FROM departements WHERE code = 'DAL-01'), 'DAL-01-002', 'Issia', 'ville', 'Ville d''Issia'),

-- Localités de Korhogo
((SELECT id FROM departements WHERE code = 'KOR-01'), 'KOR-01-001', 'Korhogo', 'ville', 'Ville de Korhogo'),
((SELECT id FROM departements WHERE code = 'KOR-01'), 'KOR-01-002', 'Ferkessédougou', 'ville', 'Ville de Ferkessédougou'),

-- Localités de Man
((SELECT id FROM departements WHERE code = 'MAN-01'), 'MAN-01-001', 'Man', 'ville', 'Ville de Man'),
((SELECT id FROM departements WHERE code = 'MAN-01'), 'MAN-01-002', 'Danané', 'ville', 'Ville de Danané'),

-- Localités de San-Pédro
((SELECT id FROM departements WHERE code = 'SAN-01'), 'SAN-01-001', 'San-Pédro', 'ville', 'Port de San-Pédro'),
((SELECT id FROM departements WHERE code = 'SAN-01'), 'SAN-01-002', 'Sassandra', 'ville', 'Ville de Sassandra'),

-- Localités de Bondoukou
((SELECT id FROM departements WHERE code = 'BON-01'), 'BON-01-001', 'Bondoukou', 'ville', 'Ville de Bondoukou'),
((SELECT id FROM departements WHERE code = 'BON-01'), 'BON-01-002', 'Bouna', 'ville', 'Ville de Bouna');

-- Exemples de mise à jour des entités administratives avec les relations géographiques
-- (Ces mises à jour supposent que les entités existent déjà dans la base)

-- Exemple de mise à jour d'un ministère
-- UPDATE ministeres SET id_region = (SELECT id FROM regions WHERE code = 'ABJ'), 
--                       id_departement = (SELECT id FROM departements WHERE code = 'ABJ-01'),
--                       id_localite = (SELECT id FROM localites WHERE code = 'ABJ-01-001')
-- WHERE id = 1;

-- Exemple de mise à jour d'une entité administrative
-- UPDATE entites_administratives SET id_region = (SELECT id FROM regions WHERE code = 'YAM'),
--                                   id_departement = (SELECT id FROM departements WHERE code = 'YAM-01'),
--                                   id_localite = (SELECT id FROM localites WHERE code = 'YAM-01-001')
-- WHERE id = 1;

-- Exemple de mise à jour d'une institution
-- UPDATE institutions SET id_region = (SELECT id FROM regions WHERE code = 'BOU'),
--                        id_departement = (SELECT id FROM departements WHERE code = 'BOU-01'),
--                        id_localite = (SELECT id FROM localites WHERE code = 'BOU-01-001')
-- WHERE id = 1;

-- Exemple de mise à jour d'une entité institution
-- UPDATE entites_institutions SET id_region = (SELECT id FROM regions WHERE code = 'DAL'),
--                                id_departement = (SELECT id FROM departements WHERE code = 'DAL-01'),
--                                id_localite = (SELECT id FROM localites WHERE code = 'DAL-01-001')
-- WHERE id = 1;
