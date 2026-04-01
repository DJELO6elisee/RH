-- Script d'insertion des données par défaut
-- =========================================
-- Ce script insère des données de base dans toutes les tables de référence

-- 1. CIVILITÉS
INSERT INTO civilites (libele) VALUES
('Monsieur'),
('Madame'),
('Mademoiselle'),
('Docteur'),
('Professeur')
ON CONFLICT (libele) DO NOTHING;

-- 2. NATIONALITÉS
INSERT INTO nationalites (libele) VALUES
('Ivoirienne'),
('Française'),
('Maliienne'),
('Burkina Faso'),
('Guinéenne'),
('Sénégalaise'),
('Ghanéenne'),
('Nigériane'),
('Libérienne'),
('Sierra Léonaise'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 3. SITUATIONS MATRIMONIALES
INSERT INTO situation_matrimonials (libele) VALUES
('Célibataire'),
('Marié(e)'),
('Divorcé(e)'),
('Veuf/Veuve'),
('Concubinage'),
('Union libre')
ON CONFLICT (libele) DO NOTHING;

-- 4. PAYS
INSERT INTO pays (libele) VALUES
('Côte d''Ivoire'),
('France'),
('Mali'),
('Burkina Faso'),
('Guinée'),
('Sénégal'),
('Ghana'),
('Nigéria'),
('Libéria'),
('Sierra Leone'),
('Maroc'),
('Tunisie'),
('Algérie'),
('Cameroun'),
('Gabon'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 5. CATÉGORIES
INSERT INTO categories (libele) VALUES
('A'),
('B'),
('C'),
('D'),
('E'),
('F'),
('G'),
('H')
ON CONFLICT (libele) DO NOTHING;

-- 6. GRADES (par catégorie)
INSERT INTO grades (id_categorie, libele, numero_ordre, age_de_retraite) VALUES
-- Catégorie A
(1, 'Directeur Général', 1, 65),
(1, 'Directeur', 2, 65),
(1, 'Sous-Directeur', 3, 65),
(1, 'Chef de Service', 4, 65),
(1, 'Chef de Bureau', 5, 65),
(1, 'Chef de Division', 6, 65),
(1, 'Inspecteur Principal', 7, 65),
(1, 'Inspecteur', 8, 65),
(1, 'Contrôleur Principal', 9, 65),
(1, 'Contrôleur', 10, 65),

-- Catégorie B
(2, 'Secrétaire Administratif Principal', 1, 60),
(2, 'Secrétaire Administratif', 2, 60),
(2, 'Secrétaire de Direction Principal', 3, 60),
(2, 'Secrétaire de Direction', 4, 60),
(2, 'Rédacteur Principal', 5, 60),
(2, 'Rédacteur', 6, 60),
(2, 'Comptable Principal', 7, 60),
(2, 'Comptable', 8, 60),

-- Catégorie C
(3, 'Agent Principal', 1, 60),
(3, 'Agent', 2, 60),
(3, 'Commis Principal', 3, 60),
(3, 'Commis', 4, 60),
(3, 'Ouvrier Principal', 5, 60),
(3, 'Ouvrier', 6, 60),

-- Catégorie D
(4, 'Aide-Comptable', 1, 60),
(4, 'Aide-Secrétaire', 2, 60),
(4, 'Aide-Agent', 3, 60),
(4, 'Stagiaire', 4, 60)
ON CONFLICT (id_categorie, numero_ordre) DO NOTHING;

-- 7. EMPLOIS
INSERT INTO emplois (libele, libele_court) VALUES
('Directeur des Ressources Humaines', 'DRH'),
('Directeur Administratif et Financier', 'DAF'),
('Directeur Technique', 'DT'),
('Chef de Service RH', 'CSRH'),
('Chef de Service Administratif', 'CSA'),
('Chef de Service Financier', 'CSF'),
('Chef de Service Technique', 'CST'),
('Secrétaire de Direction', 'SD'),
('Secrétaire Administrative', 'SA'),
('Comptable', 'COMPT'),
('Agent de Bureau', 'AB'),
('Agent de Maintenance', 'AM'),
('Agent de Sécurité', 'AS'),
('Chauffeur', 'CHAUF'),
('Gardien', 'GARD'),
('Femme de Ménage', 'FM'),
('Stagiaire', 'STAG')
ON CONFLICT (libele) DO NOTHING;

-- 8. ÉCHELONS
INSERT INTO echelons (indice, salaire_net, libele) VALUES
('1000', 500000, 'Échelon 1'),
('1100', 550000, 'Échelon 2'),
('1200', 600000, 'Échelon 3'),
('1300', 650000, 'Échelon 4'),
('1400', 700000, 'Échelon 5'),
('1500', 750000, 'Échelon 6'),
('1600', 800000, 'Échelon 7'),
('1700', 850000, 'Échelon 8'),
('1800', 900000, 'Échelon 9'),
('1900', 950000, 'Échelon 10'),
('2000', 1000000, 'Échelon 11'),
('2100', 1050000, 'Échelon 12'),
('2200', 1100000, 'Échelon 13'),
('2300', 1150000, 'Échelon 14'),
('2400', 1200000, 'Échelon 15')
ON CONFLICT (indice) DO NOTHING;

-- 9. SPÉCIALITÉS
INSERT INTO specialites (libele) VALUES
('Ressources Humaines'),
('Administration'),
('Comptabilité'),
('Finance'),
('Informatique'),
('Maintenance'),
('Sécurité'),
('Transport'),
('Communication'),
('Formation'),
('Juridique'),
('Médical'),
('Technique'),
('Commercial'),
('Marketing'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 10. LANGUES
INSERT INTO langues (libele) VALUES
('Français'),
('Anglais'),
('Espagnol'),
('Arabe'),
('Mandarin'),
('Allemand'),
('Italien'),
('Portugais'),
('Russe'),
('Japonais'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 11. NIVEAUX DE LANGUES
INSERT INTO niveau_langues (libele) VALUES
('Débutant'),
('Intermédiaire'),
('Avancé'),
('Courant'),
('Bilingue'),
('Natif')
ON CONFLICT (libele) DO NOTHING;

-- 12. MOTIFS DE DÉPART
INSERT INTO motif_de_departs (libele) VALUES
('Retraite'),
('Démission'),
('Licenciement'),
('Fin de contrat'),
('Mutation'),
('Décès'),
('Invalidité'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 13. TYPES DE CONGÉS
INSERT INTO type_de_conges (libele) VALUES
('Congé annuel'),
('Congé maladie'),
('Congé maternité'),
('Congé paternité'),
('Congé exceptionnel'),
('Congé sans solde'),
('Congé formation'),
('Congé sabbatique'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 14. AUTRES ABSENCES
INSERT INTO autre_absences (libele) VALUES
('Absence non justifiée'),
('Absence justifiée'),
('Retard'),
('Sortie autorisée'),
('Mission'),
('Formation'),
('Réunion'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 15. DISTINCTIONS
INSERT INTO distinctions (libele, nature) VALUES
('Ordre National', 'Décoration'),
('Médaille du Travail', 'Décoration'),
('Médaille d''Honneur', 'Décoration'),
('Lettre de Félicitations', 'Reconnaissance'),
('Certificat de Mérite', 'Reconnaissance'),
('Prix d''Excellence', 'Reconnaissance'),
('Autre', 'Autre')
ON CONFLICT (libele) DO NOTHING;

-- 16. TYPES D'ÉTABLISSEMENTS
INSERT INTO type_etablissements (libele) VALUES
('Ministère'),
('Direction'),
('Service'),
('Bureau'),
('Division'),
('Cabinet'),
('Secrétariat'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 17. UNITÉS ADMINISTRATIVES
INSERT INTO unite_administratives (id_fonction, capacite_acceuil, libele) VALUES
(1, 50, 'Direction Générale'),
(2, 30, 'Direction Administrative'),
(3, 25, 'Direction Technique'),
(4, 20, 'Service RH'),
(5, 15, 'Service Comptable'),
(6, 10, 'Service Maintenance'),
(7, 8, 'Bureau du Directeur'),
(8, 5, 'Secrétariat'),
(9, 3, 'Accueil')
ON CONFLICT (libele) DO NOTHING;

-- 18. DIPLÔMES
INSERT INTO diplomes (libele, type_de_diplome) VALUES
('Baccalauréat', 'Secondaire'),
('BTS', 'Technique'),
('DUT', 'Technique'),
('Licence', 'Supérieur'),
('Master', 'Supérieur'),
('Doctorat', 'Supérieur'),
('CAP', 'Professionnel'),
('BEP', 'Professionnel'),
('Certificat', 'Formation'),
('Attestation', 'Formation'),
('Autre', 'Autre')
ON CONFLICT (libele) DO NOTHING;

-- 19. TYPES D'AGENTS
INSERT INTO type_d_agents (libele, automatique, numero_initial) VALUES
('Fonctionnaire', true, 1),
('Contractuel', true, 1),
('Stagiaire', true, 1),
('Vacataire', true, 1),
('Consultant', false, 1),
('Prestataire', false, 1),
('Autre', false, 1)
ON CONFLICT (libele) DO NOTHING;

-- 20. TYPES DE MATÉRIELS
INSERT INTO type_de_materiels (libele) VALUES
('Ordinateur'),
('Imprimante'),
('Téléphone'),
('Fax'),
('Photocopieuse'),
('Scanner'),
('Véhicule'),
('Mobilier'),
('Équipement de Bureau'),
('Équipement Technique'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 21. TYPES DE DESTINATIONS
INSERT INTO type_de_destinations (libele) VALUES
('Ministère'),
('Direction'),
('Service'),
('Bureau'),
('Institution'),
('Organisme'),
('Entreprise'),
('Particulier'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 22. NATURES D'ACCIDENTS
INSERT INTO nature_d_accidents (libele) VALUES
('Accident de travail'),
('Accident de trajet'),
('Accident domestique'),
('Accident de la route'),
('Maladie professionnelle'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 23. SANCTIONS
INSERT INTO sanctions (libele) VALUES
('Avertissement'),
('Blâme'),
('Mise à pied'),
('Rétrogradation'),
('Licenciement'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 24. SYNDICATS
INSERT INTO sindicats (libele) VALUES
('SYNACAS-CI'),
('DIGNITE'),
('FESACI'),
('CGTCI'),
('UGTCI'),
('Autre'),
('Aucun')
ON CONFLICT (libele) DO NOTHING;

-- 25. TYPES DE COURRIERS
INSERT INTO type_de_couriers (libele) VALUES
('Lettre'),
('Note de service'),
('Circulaire'),
('Décision'),
('Arrêté'),
('Décret'),
('Rapport'),
('Procès-verbal'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 26. NATURES D'ACTES
INSERT INTO nature_actes (libele) VALUES
('Recrutement'),
('Promotion'),
('Mutation'),
('Sanction'),
('Formation'),
('Évaluation'),
('Retraite'),
('Départ'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 27. LOCALITÉS
INSERT INTO localites (libele) VALUES
('Abidjan'),
('Bouaké'),
('Daloa'),
('Korhogo'),
('San-Pédro'),
('Yamoussoukro'),
('Gagnoa'),
('Man'),
('Divo'),
('Anyama'),
('Bingerville'),
('Cocody'),
('Marcory'),
('Plateau'),
('Treichville'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 28. MODES D'ENTRÉE
INSERT INTO mode_d_entrees (libele) VALUES
('Concours'),
('Recrutement direct'),
('Mutation'),
('Détachement'),
('Mise à disposition'),
('Contrat'),
('Stage'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 29. POSITIONS
INSERT INTO positions (libele) VALUES
('En activité'),
('En congé'),
('En mission'),
('En formation'),
('En détachement'),
('En disponibilité'),
('En retraite'),
('Démissionnaire'),
('Licencié'),
('Décédé'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 30. PATHOLOGIES
INSERT INTO pathologies (libele) VALUES
('Hypertension'),
('Diabète'),
('Asthme'),
('Maladie cardiaque'),
('Maladie rénale'),
('Maladie hépatique'),
('Cancer'),
('VIH/SIDA'),
('Tuberculose'),
('Autre'),
('Aucune')
ON CONFLICT (libele) DO NOTHING;

-- 31. HANDICAPS
INSERT INTO handicaps (libele) VALUES
('Handicap moteur'),
('Handicap visuel'),
('Handicap auditif'),
('Handicap mental'),
('Handicap psychique'),
('Handicap multiple'),
('Autre'),
('Aucun')
ON CONFLICT (libele) DO NOTHING;

-- 32. NIVEAUX INFORMATIQUES
INSERT INTO niveau_informatiques (libele) VALUES
('Débutant'),
('Intermédiaire'),
('Avancé'),
('Expert'),
('Autre')
ON CONFLICT (libele) DO NOTHING;


-- 33. LOGICIELS
INSERT INTO logiciels (libele) VALUES
('Microsoft Office'),
('Microsoft Word'),
('Microsoft Excel'),
('Microsoft PowerPoint'),
('Microsoft Access'),
('Adobe Acrobat'),
('Photoshop'),
('AutoCAD'),
('SAP'),
('Oracle'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 34. TYPES DE RETRAITES
INSERT INTO type_de_retraites (libele) VALUES
('Retraite normale'),
('Retraite anticipée'),
('Retraite pour invalidité'),
('Retraite pour ancienneté'),
('Retraite spéciale'),
('Autre')
ON CONFLICT (libele) DO NOTHING;

-- 35. MINISTÈRES (données de base)
INSERT INTO ministeres (id, code, nom, sigle, description, adresse, telephone, email, is_active) VALUES
(1, 'MIN001', 'Ministère des Ressources Humaines', 'MRH', 'Ministère chargé de la gestion des ressources humaines de l''État', 'Avenue de la République, Abidjan', '+225 20 30 40 50', 'contact@rh.gouv.ci', true),
(2, 'MIN002', 'Ministère de l''Éducation Nationale et de l''Alphabétisation', 'MENA', 'Ministère chargé de l''éducation et de l''alphabétisation', 'Avenue Franchet d''Esperey, Abidjan', '+225 20 30 40 60', 'contact@education.gouv.ci', true),
(3, 'MIN003', 'Ministère de la Santé et de l''Hygiène Publique', 'MSHP', 'Ministère chargé de la santé publique', 'Boulevard de la République, Abidjan', '+225 20 30 40 70', 'contact@sante.gouv.ci', true),
(4, 'MIN004', 'Ministère de l''Économie et des Finances', 'MEF', 'Ministère chargé de l''économie et des finances', 'Avenue du Général de Gaulle, Abidjan', '+225 20 30 40 80', 'contact@finances.gouv.ci', true),
(5, 'MIN005', 'Ministère de l''Intérieur et de la Sécurité', 'MIS', 'Ministère chargé de l''intérieur et de la sécurité', 'Avenue de la Paix, Abidjan', '+225 20 30 40 90', 'contact@interieur.gouv.ci', true)
ON CONFLICT (id) DO NOTHING;

-- 36. ENTITÉS ADMINISTRATIVES (exemples pour chaque ministère)
INSERT INTO entites_administratives (id_ministere, code, nom, sigle, type_entite, niveau_hierarchique, telephone, email, is_active) VALUES
-- Ministère RH
(1, 'DRH', 'Direction des Ressources Humaines', 'DRH', 'direction', 1, '+225 20 30 40 51', 'drh@rh.gouv.ci', true),
(1, 'SRH', 'Service des Ressources Humaines', 'SRH', 'service', 2, '+225 20 30 40 52', 'srh@rh.gouv.ci', true),
(1, 'SADM', 'Service Administratif', 'SADM', 'service', 2, '+225 20 30 40 53', 'sadm@rh.gouv.ci', true),

-- Ministère Éducation
(2, 'DEP', 'Direction de l''Éducation Primaire', 'DEP', 'direction', 1, '+225 20 30 40 61', 'dep@education.gouv.ci', true),
(2, 'DES', 'Direction de l''Éducation Secondaire', 'DES', 'direction', 1, '+225 20 30 40 62', 'des@education.gouv.ci', true),
(2, 'DALF', 'Direction de l''Alphabétisation et de la Formation', 'DALF', 'direction', 1, '+225 20 30 40 63', 'dalf@education.gouv.ci', true),

-- Ministère Santé
(3, 'DSP', 'Direction de la Santé Publique', 'DSP', 'direction', 1, '+225 20 30 40 71', 'dsp@sante.gouv.ci', true),
(3, 'DH', 'Direction des Hôpitaux', 'DH', 'direction', 1, '+225 20 30 40 72', 'dh@sante.gouv.ci', true),
(3, 'DP', 'Direction de la Pharmacie', 'DP', 'direction', 1, '+225 20 30 40 73', 'dp@sante.gouv.ci', true),

-- Ministère Finances
(4, 'DB', 'Direction du Budget', 'DB', 'direction', 1, '+225 20 30 40 81', 'db@finances.gouv.ci', true),
(4, 'DC', 'Direction de la Comptabilité', 'DC', 'direction', 1, '+225 20 30 40 82', 'dc@finances.gouv.ci', true),
(4, 'DI', 'Direction des Impôts', 'DI', 'direction', 1, '+225 20 30 40 83', 'di@finances.gouv.ci', true),

-- Ministère Intérieur
(5, 'DS', 'Direction de la Sécurité', 'DS', 'direction', 1, '+225 20 30 40 91', 'ds@interieur.gouv.ci', true),
(5, 'DC', 'Direction de la Circulation', 'DC', 'direction', 1, '+225 20 30 40 92', 'dc@interieur.gouv.ci', true),
(5, 'DP', 'Direction de la Police', 'DP', 'direction', 1, '+225 20 30 40 93', 'dp@interieur.gouv.ci', true)
ON CONFLICT (id_ministere, code) DO NOTHING;

-- 37. FONCTIONS (basées sur les emplois)
INSERT INTO fonctions (libele, nbr_agent) VALUES
('Direction Générale', 5),
('Direction Administrative', 8),
('Direction Technique', 6),
('Service RH', 12),
('Service Comptable', 10),
('Service Maintenance', 8),
('Bureau du Directeur', 3),
('Secrétariat', 15),
('Accueil', 5),
('Sécurité', 20),
('Transport', 8),
('Nettoyage', 12),
('Autre', 0)
ON CONFLICT (libele) DO NOTHING;

-- Vérification des données insérées
SELECT 
    'Vérification des données insérées' as statut,
    COUNT(*) as total_tables
FROM (
    SELECT 'civilites' as table_name, COUNT(*) as count FROM civilites
    UNION ALL SELECT 'nationalites', COUNT(*) FROM nationalites
    UNION ALL SELECT 'situation_matrimonials', COUNT(*) FROM situation_matrimonials
    UNION ALL SELECT 'pays', COUNT(*) FROM pays
    UNION ALL SELECT 'categories', COUNT(*) FROM categories
    UNION ALL SELECT 'grades', COUNT(*) FROM grades
    UNION ALL SELECT 'emplois', COUNT(*) FROM emplois
    UNION ALL SELECT 'echelons', COUNT(*) FROM echelons
    UNION ALL SELECT 'specialites', COUNT(*) FROM specialites
    UNION ALL SELECT 'langues', COUNT(*) FROM langues
    UNION ALL SELECT 'niveau_langues', COUNT(*) FROM niveau_langues
    UNION ALL SELECT 'motif_de_departs', COUNT(*) FROM motif_de_departs
    UNION ALL SELECT 'type_de_conges', COUNT(*) FROM type_de_conges
    UNION ALL SELECT 'autre_absences', COUNT(*) FROM autre_absences
    UNION ALL SELECT 'distinctions', COUNT(*) FROM distinctions
    UNION ALL SELECT 'type_etablissements', COUNT(*) FROM type_etablissements
    UNION ALL SELECT 'unite_administratives', COUNT(*) FROM unite_administratives
    UNION ALL SELECT 'diplomes', COUNT(*) FROM diplomes
    UNION ALL SELECT 'type_d_agents', COUNT(*) FROM type_d_agents
    UNION ALL SELECT 'type_de_materiels', COUNT(*) FROM type_de_materiels
    UNION ALL SELECT 'type_de_destinations', COUNT(*) FROM type_de_destinations
    UNION ALL SELECT 'nature_d_accidents', COUNT(*) FROM nature_d_accidents
    UNION ALL SELECT 'sanctions', COUNT(*) FROM sanctions
    UNION ALL SELECT 'sindicats', COUNT(*) FROM sindicats
    UNION ALL SELECT 'type_de_couriers', COUNT(*) FROM type_de_couriers
    UNION ALL SELECT 'nature_actes', COUNT(*) FROM nature_actes
    UNION ALL SELECT 'localites', COUNT(*) FROM localites
    UNION ALL SELECT 'mode_d_entrees', COUNT(*) FROM mode_d_entrees
    UNION ALL SELECT 'positions', COUNT(*) FROM positions
    UNION ALL SELECT 'pathologies', COUNT(*) FROM pathologies
    UNION ALL SELECT 'handicaps', COUNT(*) FROM handicaps
    UNION ALL SELECT 'niveau_informatiques', COUNT(*) FROM niveau_informatiques
    UNION ALL SELECT 'logiciels', COUNT(*) FROM logiciels
    UNION ALL SELECT 'type_de_retraites', COUNT(*) FROM type_de_retraites
    UNION ALL SELECT 'ministeres', COUNT(*) FROM ministeres
    UNION ALL SELECT 'entites_administratives', COUNT(*) FROM entites_administratives
    UNION ALL SELECT 'fonctions', COUNT(*) FROM fonctions
) as counts;

-- Message de fin
SELECT 'Données par défaut insérées avec succès !' as message;
