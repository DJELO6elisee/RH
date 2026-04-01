-- Initialisation des jours fériés de Côte d'Ivoire pour l'année 2025
-- Ces jours fériés seront exclus du calcul des jours de congés

INSERT INTO jours_feries (date_feriee, libelle, type_ferie, est_fixe, annee) VALUES
-- Jours fériés fixes annuels
('2025-01-01', 'Jour de l''An', 'national', true, NULL),
('2025-05-01', 'Fête du Travail', 'national', true, NULL),
('2025-07-07', 'Fête de l''Indépendance', 'national', true, NULL),
('2025-08-15', 'Assomption', 'religieux', true, NULL),
('2025-11-01', 'Toussaint', 'religieux', true, NULL),
('2025-12-25', 'Noël', 'religieux', true, NULL),
-- Jours fériés mobiles pour 2025 (Pâques, Ascension, Pentecôte)
('2025-04-13', 'Dimanche de Pâques', 'religieux', false, 2025),
('2025-04-14', 'Lundi de Pâques', 'religieux', false, 2025),
('2025-05-29', 'Ascension', 'religieux', false, 2025),
('2025-06-08', 'Lundi de Pentecôte', 'religieux', false, 2025)
ON CONFLICT (date_feriee) DO NOTHING;

-- Note: Les dates pour Pâques, Ascension et Pentecôte varient chaque année
-- Pour 2025:
-- - Pâques: 13 avril 2025 (dimanche)
-- - Lundi de Pâques: 14 avril 2025
-- - Ascension: 29 mai 2025 (jeudi, 40 jours après Pâques)
-- - Lundi de Pentecôte: 8 juin 2025 (50 jours après Pâques)

