-- ===============================================================================
-- Script d'importation de la hiérarchie depuis le CSV
-- ===============================================================================
-- Ce script parse les codes DIR/SER et extrait les directions générales
-- des fonctions des agents
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Insérer les Directions Générales identifiées
-- ===============================================================================

-- DG INDUSTRIE TOURISTIQUE ET HOTELIERE
INSERT INTO public.direction_generale (id_ministere, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    'DG ITH',
    'DG INDUSTRIE TOURISTIQUE ET HOTELIERE',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION GENERALE DES LOISIRS
INSERT INTO public.direction_generale (id_ministere, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    'DG LOISIRS',
    'DIRECTION GENERALE DES LOISIRS',
    true
) ON CONFLICT DO NOTHING;

-- ===============================================================================
-- ETAPE 2: Insérer les Directions (niveau intermédiaire)
-- ===============================================================================

-- CABINET (niveau ministère - pas de DG)
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 00 00 00 00',
    'CABINET',
    true
) ON CONFLICT DO NOTHING;

-- CELLULE DE PASSATION DES MARCHES PUBLICS
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 00 05 00 00',
    'CELLULE DE PASSATION DES MARCHES PUBLICS',
    true
) ON CONFLICT DO NOTHING;

-- INSP. GEN. DU TOURISME ET DES LOISIRS
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 05 00 00 00',
    'INSP. GEN. DU TOURISME ET DES LOISIRS',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION DES AFFAIRES FINANCIERES
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 15 00 00 00',
    'DIRECTION DES AFFAIRES FINANCIERES',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION DU GUICHET UNIQUE
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 20 00 00 00',
    'DIRECTION DU GUICHET UNIQUE',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION DES RESSOURCES HUMAINES
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 25 00 00 00',
    'DIRECTION DES RESSOURCES HUMAINES',
    true
) ON CONFLICT DO NOTHING;

-- DIR. COMMUNICATION ET DOCUMENTATION
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 30 00 00 00',
    'DIR. COMMUNICATION ET DOCUMENTATION',
    true
) ON CONFLICT DO NOTHING;

-- DIR. PLANIFICATION, STATISTIQ & PROJETS
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 35 00 00 00',
    'DIR. PLANIFICATION, STATISTIQ & PROJETS',
    true
) ON CONFLICT DO NOTHING;

-- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 40 00 00 00',
    'DIR. INFORMAT, DIGITAL ET DEV. STARTUPS',
    true
) ON CONFLICT DO NOTHING;

-- DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 45 00 00 00',
    'DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX',
    true
) ON CONFLICT DO NOTHING;

-- DIR. SECURITE TOURISTIQUE ET DES LOISIRS
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 50 00 00 00',
    'DIR. SECURITE TOURISTIQUE ET DES LOISIRS',
    true
) ON CONFLICT DO NOTHING;

-- GESTIONNAIRE DU PATRIMOINE
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 55 00 00 00',
    'GESTIONNAIRE DU PATRIMOINE',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION DES ACTIVITES TOURISTIQUES (sous DG ITH)
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1),
    '47 10 05 05 00 00',
    'DIRECTION DES ACTIVITES TOURISTIQUES',
    true
) ON CONFLICT DO NOTHING;

-- DIR. COOPERATION ET PROFESSIONNALISATION (sous DG ITH)
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1),
    '47 10 05 10 00 00',
    'DIR. COOPERATION ET PROFESSIONNALISATION',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION DES SERVICES EXTERIEURS (sous DG ITH)
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.direction_generale WHERE code = 'DG ITH' LIMIT 1),
    '47 10 05 15 00 00',
    'DIRECTION DES SERVICES EXTERIEURS',
    true
) ON CONFLICT DO NOTHING;

-- DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM (sous DG LOISIRS)
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1),
    '47 10 10 05 00 00',
    'DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM',
    true
) ON CONFLICT DO NOTHING;

-- DIR. VALOR., FORM. & PROMO JEUX TRADIT (sous DG LOISIRS)
INSERT INTO public.directions (id_ministere, id_direction_generale, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.direction_generale WHERE code = 'DG LOISIRS' LIMIT 1),
    '47 10 10 10 00 00',
    'DIR. VALOR., FORM. & PROMO JEUX TRADIT',
    true
) ON CONFLICT DO NOTHING;

-- ===============================================================================
-- ETAPE 3: Insérer les Sous-Directions
-- ===============================================================================

-- Sous-directions de la DIRECTION DES AFFAIRES FINANCIERES
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 15 00 00 00' LIMIT 1),
    '47 05 15 05 00 00',
    'S/D DU BUDGET & DE LA COMPTABILITE',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 15 00 00 00' LIMIT 1),
    '47 05 15 10 00 00',
    'S/D DES ETUDES ET CONTROLE DE GESTION',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de la DIRECTION DU GUICHET UNIQUE
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 20 00 00 00' LIMIT 1),
    '47 05 20 05 00 00',
    'S/D DE L''INFORMATION ET SENSIBILISATION',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 20 00 00 00' LIMIT 1),
    '47 05 20 10 00 00',
    'S/D SUIVI INVESTISSEMENT ET RECOUVREMENT',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 20 00 00 00' LIMIT 1),
    '47 05 20 15 00 00',
    'S/D SUIVI DES ACTES & AUTORISATIONS',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de la DIRECTION DES RESSOURCES HUMAINES
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 25 00 00 00' LIMIT 1),
    '47 05 25 05 00 00',
    'S/D DE LA GESTION DU PERSONNEL',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 25 00 00 00' LIMIT 1),
    '47 05 25 10 00 00',
    'S/D DE L''ACTION SOCIALE',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 25 00 00 00' LIMIT 1),
    '47 05 25 15 00 00',
    'S/D DU RENFORCEMENT DES CAPACITES',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. COMMUNICATION ET DOCUMENTATION
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 30 00 00 00' LIMIT 1),
    '47 05 30 10 00 00',
    'S/D DE LA DOCUMENTATION & DES ARCHIVES',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 30 00 00 00' LIMIT 1),
    '47 05 30 15 00 00',
    'S/D DE LA PRODUCTION ET DU DEV NUMERIQUE',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. PLANIFICATION, STATISTIQ & PROJETS
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 35 00 00 00' LIMIT 1),
    '47 05 35 05 00 00',
    'S/D DE LA PLANIF & DES PROJETS',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 35 00 00 00' LIMIT 1),
    '47 05 35 10 00 00',
    'S/D DES STATISTIQUES',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 35 00 00 00' LIMIT 1),
    '47 05 35 15 00 00',
    'S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 40 00 00 00' LIMIT 1),
    '47 05 40 05 00 00',
    'S/D DE L''INFORMATIQUE',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 40 00 00 00' LIMIT 1),
    '47 05 40 10 00 00',
    'S/D DIGITALISATION ET DEVELOP STARTUPS',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 45 00 00 00' LIMIT 1),
    '47 05 45 05 00 00',
    'SOUS-DIRECTION DE LA LEGISLATION',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 45 00 00 00' LIMIT 1),
    '47 05 45 10 00 00',
    'SOUS-DIRECTION DU CONTENTIEUX',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. SECURITE TOURISTIQUE ET DES LOISIRS
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 50 00 00 00' LIMIT 1),
    '47 05 50 05 00 00',
    'S/D PREVENTION ET GESTION DES RISQUES',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 50 00 00 00' LIMIT 1),
    '47 05 50 10 00 00',
    'BRIGARDE TOURISTIQUE ET DES LOISIRS',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 05 50 00 00 00' LIMIT 1),
    '47 05 50 15 00 00',
    'S/D PROMO SECURITE TOUR ET DES LOISIRS',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIRECTION DES ACTIVITES TOURISTIQUES
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 05 00 00' LIMIT 1),
    '47 10 05 05 05 00',
    'S/D QUALITE, NORMALISATION ET CONTROLE',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 05 00 00' LIMIT 1),
    '47 10 05 05 10 00',
    'SOUS-DIRECTION DU TOURISME MEDICAL',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 05 00 00' LIMIT 1),
    '47 10 05 05 15 00',
    'S/D DE L''ENCADREMENT DES EXPLOITANTS',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 05 00 00' LIMIT 1),
    '47 10 05 05 20 00',
    'SOUS-DIRECTION DU TOURISME RELIGIEUX',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. COOPERATION ET PROFESSIONNALISATION
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 10 00 00' LIMIT 1),
    '47 10 05 10 05 00',
    'SOUS-DIRECTION PROFESSIONNALISATION',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 10 00 00' LIMIT 1),
    '47 10 05 10 10 00',
    'SOUS-DIRECTION DE LA COOPERATION',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIRECTION DES SERVICES EXTERIEURS
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 15 00 00' LIMIT 1),
    '47 10 05 15 05 00',
    'SOUS-DIRECTION DES SERVICES DECONCENTRES',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 05 15 00 00' LIMIT 1),
    '47 10 05 15 10 00',
    'S/D BUREAUX DU TOURISME POUR ETRANGER',
    true
) ON CONFLICT DO NOTHING;

-- Sous-directions de DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 10 05 00 00' LIMIT 1),
    '47 10 10 05 05 00',
    'S/D INFRAST. , ESPACE & EQUIP DE LOISIRS',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    (SELECT id FROM public.directions WHERE code = '47 10 10 05 00 00' LIMIT 1),
    '47 10 10 05 10 00',
    'SOUS-DIRECTION DES JEUX NUMERIQUES',
    true
) ON CONFLICT DO NOTHING;

-- ===============================================================================
-- ETAPE 4: Insérer les Services
-- ===============================================================================

-- SERVICE COURRIER DE LA DRH
INSERT INTO public.services (id_ministere, id_sous_direction, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    NULL,
    '47 05 25 00 05 00',
    'SERVICE COURRIER DE LA DRH',
    true
) ON CONFLICT DO NOTHING;

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Importation de la hiérarchie terminée avec succès !';
    RAISE NOTICE '📊 Statistiques:';
    RAISE NOTICE '   - % Directions Générales importées', 
        (SELECT COUNT(*) FROM public.direction_generale);
    RAISE NOTICE '   - % Directions importées', 
        (SELECT COUNT(*) FROM public.directions);
    RAISE NOTICE '   - % Sous-Directions importées', 
        (SELECT COUNT(*) FROM public.sous_directions);
    RAISE NOTICE '   - % Services importés', 
        (SELECT COUNT(*) FROM public.services);
END $$;




















