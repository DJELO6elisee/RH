-- ===============================================================================
-- Script d'importation des données UNIQUEMENT
-- ===============================================================================
-- N'ajoute PAS de colonnes aux tables existantes
-- Insère seulement les données dans les nouvelles tables
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Insérer les 2 Directions Générales
-- ===============================================================================

INSERT INTO public.direction_generale (id_ministere, code, libelle, is_active)
VALUES
    ((SELECT id FROM public.ministeres LIMIT 1), 'DG ITH', 'DG INDUSTRIE TOURISTIQUE ET HOTELIERE', true),
    ((SELECT id FROM public.ministeres LIMIT 1), 'DG LOISIRS', 'DIRECTION GENERALE DES LOISIRS', true)
ON CONFLICT DO NOTHING;

-- ===============================================================================
-- ETAPE 2: Insérer les 16 Directions
-- ===============================================================================

INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES
    -- Niveau Ministère (sans DG)
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 00 00 00 00', 'CABINET', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 00 05 00 00', 'CELLULE DE PASSATION DES MARCHES PUBLICS', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 05 00 00 00', 'INSP. GEN. DU TOURISME ET DES LOISIRS', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 15 00 00 00', 'DIRECTION DES AFFAIRES FINANCIERES', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 20 00 00 00', 'DIRECTION DU GUICHET UNIQUE', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 25 00 00 00', 'DIRECTION DES RESSOURCES HUMAINES', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 30 00 00 00', 'DIR. COMMUNICATION ET DOCUMENTATION', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 35 00 00 00', 'DIR. PLANIFICATION, STATISTIQ & PROJETS', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 40 00 00 00', 'DIR. INFORMAT, DIGITAL ET DEV. STARTUPS', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 45 00 00 00', 'DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 50 00 00 00', 'DIR. SECURITE TOURISTIQUE ET DES LOISIRS', true),
    ((SELECT id FROM public.ministeres LIMIT 1), NULL, '47 05 55 00 00 00', 'GESTIONNAIRE DU PATRIMOINE', true),
    
    -- Sous DG ITH
    ((SELECT id FROM public.ministeres LIMIT 1), (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1), '47 10 05 05 00 00', 'DIRECTION DES ACTIVITES TOURISTIQUES', true),
    ((SELECT id FROM public.ministeres LIMIT 1), (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1), '47 10 05 10 00 00', 'DIR. COOPERATION ET PROFESSIONNALISATION', true),
    ((SELECT id FROM public.ministeres LIMIT 1), (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1), '47 10 05 15 00 00', 'DIRECTION DES SERVICES EXTERIEURS', true),
    
    -- Sous DG LOISIRS
    ((SELECT id FROM public.ministeres LIMIT 1), (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1), '47 10 10 05 00 00', 'DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM', true),
    ((SELECT id FROM public.ministeres LIMIT 1), (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1), '47 10 10 10 00 00', 'DIR. VALOR., FORM. & PROMO JEUX TRADIT', true)
ON CONFLICT DO NOTHING;

-- ===============================================================================
-- ETAPE 3: Insérer les Sous-Directions
-- ===============================================================================

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
SELECT 
    (SELECT id FROM public.ministeres LIMIT 1),
    d.id,
    sd_data.code,
    sd_data.libelle,
    true
FROM (VALUES
    -- S/D de DIRECTION DES AFFAIRES FINANCIERES
    ('47 05 15 00 00 00', '47 05 15 05 00 00', 'S/D DU BUDGET & DE LA COMPTABILITE'),
    ('47 05 15 00 00 00', '47 05 15 10 00 00', 'S/D DES ETUDES ET CONTROLE DE GESTION'),
    
    -- S/D de DIRECTION DU GUICHET UNIQUE
    ('47 05 20 00 00 00', '47 05 20 05 00 00', 'S/D DE L''INFORMATION ET SENSIBILISATION'),
    ('47 05 20 00 00 00', '47 05 20 10 00 00', 'S/D SUIVI INVESTISSEMENT ET RECOUVREMENT'),
    ('47 05 20 00 00 00', '47 05 20 15 00 00', 'S/D SUIVI DES ACTES & AUTORISATIONS'),
    
    -- S/D de DIRECTION DES RESSOURCES HUMAINES
    ('47 05 25 00 00 00', '47 05 25 05 00 00', 'S/D DE LA GESTION DU PERSONNEL'),
    ('47 05 25 00 00 00', '47 05 25 10 00 00', 'S/D DE L''ACTION SOCIALE'),
    ('47 05 25 00 00 00', '47 05 25 15 00 00', 'S/D DU RENFORCEMENT DES CAPACITES'),
    
    -- S/D de DIR. COMMUNICATION ET DOCUMENTATION
    ('47 05 30 00 00 00', '47 05 30 10 00 00', 'S/D DE LA DOCUMENTATION & DES ARCHIVES'),
    ('47 05 30 00 00 00', '47 05 30 15 00 00', 'S/D DE LA PRODUCTION ET DU DEV NUMERIQUE'),
    
    -- S/D de DIR. PLANIFICATION, STATISTIQ & PROJETS
    ('47 05 35 00 00 00', '47 05 35 05 00 00', 'S/D DE LA PLANIF & DES PROJETS'),
    ('47 05 35 00 00 00', '47 05 35 10 00 00', 'S/D DES STATISTIQUES'),
    ('47 05 35 00 00 00', '47 05 35 15 00 00', 'S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS'),
    
    -- S/D de DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
    ('47 05 40 00 00 00', '47 05 40 05 00 00', 'S/D DE L''INFORMATIQUE'),
    ('47 05 40 00 00 00', '47 05 40 10 00 00', 'S/D DIGITALISATION ET DEVELOP STARTUPS'),
    
    -- S/D de DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX
    ('47 05 45 00 00 00', '47 05 45 05 00 00', 'SOUS-DIRECTION DE LA LEGISLATION'),
    ('47 05 45 00 00 00', '47 05 45 10 00 00', 'SOUS-DIRECTION DU CONTENTIEUX'),
    
    -- S/D de DIR. SECURITE TOURISTIQUE ET DES LOISIRS
    ('47 05 50 00 00 00', '47 05 50 05 00 00', 'S/D PREVENTION ET GESTION DES RISQUES'),
    ('47 05 50 00 00 00', '47 05 50 10 00 00', 'BRIGARDE TOURISTIQUE ET DES LOISIRS'),
    ('47 05 50 00 00 00', '47 05 50 15 00 00', 'S/D PROMO SECURITE TOUR ET DES LOISIRS'),
    
    -- S/D de DIRECTION DES ACTIVITES TOURISTIQUES
    ('47 10 05 05 00 00', '47 10 05 05 05 00', 'S/D QUALITE, NORMALISATION ET CONTROLE'),
    ('47 10 05 05 00 00', '47 10 05 05 10 00', 'SOUS-DIRECTION DU TOURISME MEDICAL'),
    ('47 10 05 05 00 00', '47 10 05 05 15 00', 'S/D DE L''ENCADREMENT DES EXPLOITANTS'),
    ('47 10 05 05 00 00', '47 10 05 05 20 00', 'SOUS-DIRECTION DU TOURISME RELIGIEUX'),
    
    -- S/D de DIR. COOPERATION ET PROFESSIONNALISATION
    ('47 10 05 10 00 00', '47 10 05 10 05 00', 'SOUS-DIRECTION PROFESSIONNALISATION'),
    ('47 10 05 10 00 00', '47 10 05 10 10 00', 'SOUS-DIRECTION DE LA COOPERATION'),
    
    -- S/D de DIRECTION DES SERVICES EXTERIEURS
    ('47 10 05 15 00 00', '47 10 05 15 05 00', 'SOUS-DIRECTION DES SERVICES DECONCENTRES'),
    ('47 10 05 15 00 00', '47 10 05 15 10 00', 'S/D BUREAUX DU TOURISME POUR ETRANGER'),
    
    -- S/D de DIR. PARCS DE LOISIRS
    ('47 10 10 05 00 00', '47 10 10 05 05 00', 'S/D INFRAST. , ESPACE & EQUIP DE LOISIRS'),
    ('47 10 10 05 00 00', '47 10 10 05 10 00', 'SOUS-DIRECTION DES JEUX NUMERIQUES')
) AS sd_data(direction_code, code, libelle)
LEFT JOIN public.directions d ON d.code = sd_data.direction_code
WHERE d.id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
DECLARE
    v_dg INTEGER;
    v_dir INTEGER;
    v_sd INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_dg FROM public.direction_generale;
    SELECT COUNT(*) INTO v_dir FROM public.directions;
    SELECT COUNT(*) INTO v_sd FROM public.sous_directions;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Importation terminée !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Résultats:';
    RAISE NOTICE '   - Directions Générales: %', v_dg;
    RAISE NOTICE '   - Directions: %', v_dir;
    RAISE NOTICE '   - Sous-Directions: %', v_sd;
    RAISE NOTICE '';
END $$;




















