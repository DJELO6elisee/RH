-- ===============================================================================
-- Script d'assignation automatique généré depuis le CSV
-- ===============================================================================
-- Généré automatiquement par generate_assignment_sql_from_csv.js
-- ===============================================================================

-- ===============================================================================
-- PARTIE 1: CRÉATION DES ENTITÉS
-- ===============================================================================

-- 1. Créer les Directions Générales
DO $$
BEGIN
    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'CABINET', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('CABINET'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DG INDUSTRIE TOURISTIQUE ET HOTELIERE', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DIRECTION GENERALE DES LOISIRS', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DIRECTIONS REGIONALES', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('DIRECTIONS REGIONALES'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'BUREAUX DU TOURISME POUR L''ETRANGER', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'DIRECT° GENERALE COTE D''IVOIRE TOURISME', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'CONSEIL NATIONAL DU TOURISME', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'FONDS DE DEVELOPPEMNT TOURISTIQUE', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE'));

    INSERT INTO public.direction_generale (id_ministere, libelle, is_active)
    SELECT 1, 'INSTANCE D''AFFECTATION', true
    WHERE NOT EXISTS (SELECT 1 FROM public.direction_generale WHERE UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION'));

END $$;

-- 2. Créer les Directions
DO $$
BEGIN
    -- CABINET
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 00 00 00 00', 'CABINET', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 00 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('CABINET'))
    );

    -- CELLULE DE PASSATION DES MARCHES PUBLICS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 00 05 00 00', 'CELLULE DE PASSATION DES MARCHES PUBLICS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 00 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('CELLULE DE PASSATION DES MARCHES PUBLICS'))
    );

    -- INSP. GEN. DU TOURISME ET DES LOISIRS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 05 00 00 00', 'INSP. GEN. DU TOURISME ET DES LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 05 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('INSP. GEN. DU TOURISME ET DES LOISIRS'))
    );

    -- DIRECTION DES AFFAIRES FINANCIERES
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 15 00 00 00', 'DIRECTION DES AFFAIRES FINANCIERES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 15 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES AFFAIRES FINANCIERES'))
    );

    -- DIRECTION DU GUICHET UNIQUE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 20 00 00 00', 'DIRECTION DU GUICHET UNIQUE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 20 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DU GUICHET UNIQUE'))
    );

    -- DIRECTION DES RESSOURCES HUMAINES
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 25 00 00 00', 'DIRECTION DES RESSOURCES HUMAINES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 25 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES RESSOURCES HUMAINES'))
    );

    -- DIR. COMMUNICATION ET DOCUMENTATION
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 30 00 00 00', 'DIR. COMMUNICATION ET DOCUMENTATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 30 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. COMMUNICATION ET DOCUMENTATION'))
    );

    -- DIR. PLANIFICATION, STATISTIQ & PROJETS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 35 00 00 00', 'DIR. PLANIFICATION, STATISTIQ & PROJETS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 35 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. PLANIFICATION, STATISTIQ & PROJETS'))
    );

    -- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 40 00 00 00', 'DIR. INFORMAT, DIGITAL ET DEV. STARTUPS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 40 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. INFORMAT, DIGITAL ET DEV. STARTUPS'))
    );

    -- DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 45 00 00 00', 'DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 45 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX'))
    );

    -- DIR. SECURITE TOURISTIQUE ET DES LOISIRS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 50 00 00 00', 'DIR. SECURITE TOURISTIQUE ET DES LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 50 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. SECURITE TOURISTIQUE ET DES LOISIRS'))
    );

    -- BRIGARDE TOURISTIQUE ET DES LOISIRS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 50 10 00 00', 'BRIGARDE TOURISTIQUE ET DES LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 50 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BRIGARDE TOURISTIQUE ET DES LOISIRS'))
    );

    -- GESTIONNAIRE DU PATRIMOINE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 55 00 00 00', 'GESTIONNAIRE DU PATRIMOINE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 05 55 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('GESTIONNAIRE DU PATRIMOINE'))
    );

    -- DG INDUSTRIE TOURISTIQUE ET HOTELIERE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 00 00 00', 'DG INDUSTRIE TOURISTIQUE ET HOTELIERE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 05 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE'))
    );

    -- DIRECTION DES ACTIVITES TOURISTIQUES
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 05 00 00', 'DIRECTION DES ACTIVITES TOURISTIQUES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 05 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES ACTIVITES TOURISTIQUES'))
    );

    -- DIR. COOPERATION ET PROFESSIONNALISATION
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 10 00 00', 'DIR. COOPERATION ET PROFESSIONNALISATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 05 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. COOPERATION ET PROFESSIONNALISATION'))
    );

    -- DIRECTION DES SERVICES EXTERIEURS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 15 00 00', 'DIRECTION DES SERVICES EXTERIEURS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 05 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DES SERVICES EXTERIEURS'))
    );

    -- DIRECTION GENERALE DES LOISIRS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 00 00 00', 'DIRECTION GENERALE DES LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 10 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS'))
    );

    -- DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 05 00 00', 'DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 10 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM'))
    );

    -- DIR. VALOR., FORM. & PROMO JEUX TRADIT
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 10 00 00', 'DIR. VALOR., FORM. & PROMO JEUX TRADIT', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 10 10 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIR. VALOR., FORM. & PROMO JEUX TRADIT'))
    );

    -- DIRECTION REGIONALE D'ABIDJAN NORD
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 03 00 00', 'DIRECTION REGIONALE D''ABIDJAN NORD', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 03 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE D''ABIDJAN NORD'))
    );

    -- DIRECTION DEPARTEMENTALE ABJ NORD 1
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 03 05 00', 'DIRECTION DEPARTEMENTALE ABJ NORD 1', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 03 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE ABJ NORD 1'))
    );

    -- DIRECTION DEPARTEMENTALE  DE DABOU
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 03 15 00', 'DIRECTION DEPARTEMENTALE  DE DABOU', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 03 15 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  DE DABOU'))
    );

    -- DIRECTION REGIONALE ABIDJAN SUD
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 04 00 00', 'DIRECTION REGIONALE ABIDJAN SUD', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 04 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE ABIDJAN SUD'))
    );

    -- DIRECTION DEPARTEMENTALE ABJ SUD 1
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 04 05 00', 'DIRECTION DEPARTEMENTALE ABJ SUD 1', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 04 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE ABJ SUD 1'))
    );

    -- DIRECTION REGIONALE DE GRAND-BASSAM
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 07 00 00', 'DIRECTION REGIONALE DE GRAND-BASSAM', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 07 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE GRAND-BASSAM'))
    );

    -- DIRECTION DEPARTEMENTALE  ADZOPE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 07 05 00', 'DIRECTION DEPARTEMENTALE  ADZOPE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 07 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  ADZOPE'))
    );

    -- DIRECTION DEPARTEMENTALE  AGBOVILLE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 07 15 00', 'DIRECTION DEPARTEMENTALE  AGBOVILLE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 07 15 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  AGBOVILLE'))
    );

    -- DIRECTION REGIONALE D'ABENGOUROU
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 10 00 00', 'DIRECTION REGIONALE D''ABENGOUROU', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE D''ABENGOUROU'))
    );

    -- DIRECTION DEPARTEMENTALE DE DAOUKRO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 10 05 00', 'DIRECTION DEPARTEMENTALE DE DAOUKRO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 10 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE DE DAOUKRO'))
    );

    -- DIRECTION REGIONALE DE BOUAKE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 15 00 00', 'DIRECTION REGIONALE DE BOUAKE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE BOUAKE'))
    );

    -- DIRECTION DEPARTEMENTALE KATIOLA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 15 05 00', 'DIRECTION DEPARTEMENTALE KATIOLA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 15 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE KATIOLA'))
    );

    -- DIRECTION REGIONALE DE BONDOUKOU
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 20 00 00', 'DIRECTION REGIONALE DE BONDOUKOU', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 20 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE BONDOUKOU'))
    );

    -- DIRECTION DEPARTEMENTALE  BOUNA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 20 05 00', 'DIRECTION DEPARTEMENTALE  BOUNA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 20 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  BOUNA'))
    );

    -- DIRECTION REGIONALE DE DALOA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 25 00 00', 'DIRECTION REGIONALE DE DALOA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 25 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE DALOA'))
    );

    -- DIRECTION DEPARTEMENTALE  GAGNOA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 25 05 00', 'DIRECTION DEPARTEMENTALE  GAGNOA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 25 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  GAGNOA'))
    );

    -- DIRECTION DEPARTEMENTALE DIVO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 25 10 00', 'DIRECTION DEPARTEMENTALE DIVO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 25 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE DIVO'))
    );

    -- DIRECTION REGIONALE DE MAN
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 30 00 00', 'DIRECTION REGIONALE DE MAN', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 30 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE MAN'))
    );

    -- DIRECTION DEPARTEMENTALE GUIGLO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 30 05 00', 'DIRECTION DEPARTEMENTALE GUIGLO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 30 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE GUIGLO'))
    );

    -- DIRECTION DEPARTEMENTALE  DANANE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 30 10 00', 'DIRECTION DEPARTEMENTALE  DANANE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 30 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  DANANE'))
    );

    -- DIRECTION REGIONALE DE SAN-PEDRO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 35 00 00', 'DIRECTION REGIONALE DE SAN-PEDRO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 35 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE SAN-PEDRO'))
    );

    -- DIRECTION DEPARTEMENTALE  SOUBRE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 35 05 00', 'DIRECTION DEPARTEMENTALE  SOUBRE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 35 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  SOUBRE'))
    );

    -- DIRECTION DEPARTEMENTALE  SASSANDRA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 35 10 00', 'DIRECTION DEPARTEMENTALE  SASSANDRA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 35 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  SASSANDRA'))
    );

    -- DIRECTION REGIONALE DE KORHOGO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 40 00 00', 'DIRECTION REGIONALE DE KORHOGO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 40 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE KORHOGO'))
    );

    -- DIRECTION DEPARTEMENTALE  BOUNDIALI
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 40 05 00', 'DIRECTION DEPARTEMENTALE  BOUNDIALI', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 40 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  BOUNDIALI'))
    );

    -- DIRECTION DEPARTEMENTALE  FERKE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 40 10 00', 'DIRECTION DEPARTEMENTALE  FERKE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 40 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  FERKE'))
    );

    -- DIRECTION REGIONALE D'ODIENNE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 45 00 00', 'DIRECTION REGIONALE D''ODIENNE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 45 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE D''ODIENNE'))
    );

    -- DIRECTION DEPARTEMENTALE TOUBA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 45 05 00', 'DIRECTION DEPARTEMENTALE TOUBA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 45 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE TOUBA'))
    );

    -- DIRECTION REGIONALE DE YAMOUSSOUKRO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 50 00 00', 'DIRECTION REGIONALE DE YAMOUSSOUKRO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 50 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE YAMOUSSOUKRO'))
    );

    -- DIRECTION DEPARTEMENTALE  DIMBOKRO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 50 05 00', 'DIRECTION DEPARTEMENTALE  DIMBOKRO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 50 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  DIMBOKRO'))
    );

    -- DIRECTION DEPARTEMENTALE  BOUAFLE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 50 10 00', 'DIRECTION DEPARTEMENTALE  BOUAFLE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 50 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE  BOUAFLE'))
    );

    -- DIRECTION REGIONALE DE SEGUELA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 55 00 00', 'DIRECTION REGIONALE DE SEGUELA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 55 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION REGIONALE DE SEGUELA'))
    );

    -- DIRECTION DEPARTEMENTALE MANKONO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 05 55 05 00', 'DIRECTION DEPARTEMENTALE MANKONO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 05 55 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECTION DEPARTEMENTALE MANKONO'))
    );

    -- BUREAU DE PARIS
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 05 00 00', 'BUREAU DE PARIS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE PARIS'))
    );

    -- BUREAU DE MILAN
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 10 00 00', 'BUREAU DE MILAN', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE MILAN'))
    );

    -- BUREAU DE LONDRES (ROYAUME UNI)
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 12 00 00', 'BUREAU DE LONDRES (ROYAUME UNI)', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 12 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE LONDRES (ROYAUME UNI)'))
    );

    -- BUREAU DE BERLIN
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 15 00 00', 'BUREAU DE BERLIN', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE BERLIN'))
    );

    -- BUREAU DE GENEVE (SUISSE)
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 17 00 00', 'BUREAU DE GENEVE (SUISSE)', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 17 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE GENEVE (SUISSE)'))
    );

    -- BUREAU DE MADRID
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 20 00 00', 'BUREAU DE MADRID', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 20 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE MADRID'))
    );

    -- BUREAU DE WASHINGTON
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 25 00 00', 'BUREAU DE WASHINGTON', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 25 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE WASHINGTON'))
    );

    -- BUREAU DE LAGOS (NIGERIA)
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 32 00 00', 'BUREAU DE LAGOS (NIGERIA)', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 32 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE LAGOS (NIGERIA)'))
    );

    -- BUREAU DE BEIJING
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 35 00 00', 'BUREAU DE BEIJING', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 35 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE BEIJING'))
    );

    -- BUREAU DE PRETORIA
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 40 00 00', 'BUREAU DE PRETORIA', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 40 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE PRETORIA'))
    );

    -- BUREAU DE RIO DE JANEIRO
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 50 00 00', 'BUREAU DE RIO DE JANEIRO', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 50 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE RIO DE JANEIRO'))
    );

    -- BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 55 00 00', 'BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 55 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N'))
    );

    -- BUREAU DE OTTAWA (CANADA)
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 60 00 00', 'BUREAU DE OTTAWA (CANADA)', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 60 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE OTTAWA (CANADA)'))
    );

    -- BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 15 10 65 00 00', 'BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 15 10 65 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN'))
    );

    -- DIRECT° GENERALE COTE D'IVOIRE TOURISME
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 00 00 00', 'DIRECT° GENERALE COTE D''IVOIRE TOURISME', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 10 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME'))
    );

    -- DIRECT° RESSOURCES HUM. & MOY.GENERAUX
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 05 00 00', 'DIRECT° RESSOURCES HUM. & MOY.GENERAUX', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 10 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° RESSOURCES HUM. & MOY.GENERAUX'))
    );

    -- DIRECT° DU BUDGET, DES FINANCES & DES MG
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 10 00 00', 'DIRECT° DU BUDGET, DES FINANCES & DES MG', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 10 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° DU BUDGET, DES FINANCES & DES MG'))
    );

    -- DIRECT° MARKETING,COMMUNICAT° ET DES TIC
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 20 00 00', 'DIRECT° MARKETING,COMMUNICAT° ET DES TIC', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 10 20 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° MARKETING,COMMUNICAT° ET DES TIC'))
    );

    -- DIRECT° DES RELATIONS EXTERIEURES
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 25 00 00', 'DIRECT° DES RELATIONS EXTERIEURES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 10 25 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('DIRECT° DES RELATIONS EXTERIEURES'))
    );

    -- CONSEIL NATIONAL DU TOURISME
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 36 00 00 00', 'CONSEIL NATIONAL DU TOURISME', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 36 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME'))
    );

    -- FONDS DE DEVELOPPEMNT TOURISTIQUE
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 40 00 00 00', 'FONDS DE DEVELOPPEMNT TOURISTIQUE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 20 40 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE'))
    );

    -- INSTANCE D'AFFECTATION
    INSERT INTO public.directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 99 00 00 00 00', 'INSTANCE D''AFFECTATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.directions 
        WHERE code = '47 99 00 00 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION'))
    );

END $$;

-- 3. Créer les Sous-Directions
DO $$
BEGIN
    -- S/D DU BUDGET & DE LA COMPTABILITE
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 15 05 00 00', 'S/D DU BUDGET & DE LA COMPTABILITE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 15 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU BUDGET & DE LA COMPTABILITE'))
    );

    -- S/D DES ETUDES ET CONTROLE DE GESTION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 15 10 00 00', 'S/D DES ETUDES ET CONTROLE DE GESTION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 15 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES ETUDES ET CONTROLE DE GESTION'))
    );

    -- S/D DE L'INFORMATION ET SENSIBILISATION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 20 05 00 00', 'S/D DE L''INFORMATION ET SENSIBILISATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 20 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''INFORMATION ET SENSIBILISATION'))
    );

    -- S/D SUIVI INVESTISSEMENT ET RECOUVREMENT
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 20 10 00 00', 'S/D SUIVI INVESTISSEMENT ET RECOUVREMENT', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 20 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D SUIVI INVESTISSEMENT ET RECOUVREMENT'))
    );

    -- S/D SUIVI DES ACTES & AUTORISATIONS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 20 15 00 00', 'S/D SUIVI DES ACTES & AUTORISATIONS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 20 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D SUIVI DES ACTES & AUTORISATIONS'))
    );

    -- S/D DE LA GESTION DU PERSONNEL
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 25 05 00 00', 'S/D DE LA GESTION DU PERSONNEL', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 25 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA GESTION DU PERSONNEL'))
    );

    -- S/D DE L'ACTION SOCIALE
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 25 10 00 00', 'S/D DE L''ACTION SOCIALE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 25 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''ACTION SOCIALE'))
    );

    -- S/D DU RENFORCEMENT DES CAPACITES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 25 15 00 00', 'S/D DU RENFORCEMENT DES CAPACITES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 25 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU RENFORCEMENT DES CAPACITES'))
    );

    -- S/D DE LA DOCUMENTATION & DES ARCHIVES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 30 10 00 00', 'S/D DE LA DOCUMENTATION & DES ARCHIVES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 30 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA DOCUMENTATION & DES ARCHIVES'))
    );

    -- S/D DE LA PRODUCTION ET DU DEV NUMERIQUE
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 30 15 00 00', 'S/D DE LA PRODUCTION ET DU DEV NUMERIQUE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 30 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA PRODUCTION ET DU DEV NUMERIQUE'))
    );

    -- S/D DE LA PLANIF & DES PROJETS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 35 05 00 00', 'S/D DE LA PLANIF & DES PROJETS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 35 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA PLANIF & DES PROJETS'))
    );

    -- S/D DES STATISTIQUES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 35 10 00 00', 'S/D DES STATISTIQUES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 35 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES STATISTIQUES'))
    );

    -- S/D DE L'AMENAG, FONCIER TOUR ET LOISIRS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 35 15 00 00', 'S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 35 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS'))
    );

    -- S/D DE L'INFORMATIQUE
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 40 05 00 00', 'S/D DE L''INFORMATIQUE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 40 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''INFORMATIQUE'))
    );

    -- S/D DIGITALISATION ET DEVELOP STARTUPS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 40 10 00 00', 'S/D DIGITALISATION ET DEVELOP STARTUPS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 40 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DIGITALISATION ET DEVELOP STARTUPS'))
    );

    -- SOUS-DIRECTION DE LA LEGISLATION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 45 05 00 00', 'SOUS-DIRECTION DE LA LEGISLATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 45 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DE LA LEGISLATION'))
    );

    -- SOUS-DIRECTION DU CONTENTIEUX
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 45 10 00 00', 'SOUS-DIRECTION DU CONTENTIEUX', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 45 10 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DU CONTENTIEUX'))
    );

    -- S/D PREVENTION ET GESTION DES RISQUES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 50 05 00 00', 'S/D PREVENTION ET GESTION DES RISQUES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 50 05 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D PREVENTION ET GESTION DES RISQUES'))
    );

    -- S/D PROMO SECURITE TOUR ET DES LOISIRS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 05 50 15 00 00', 'S/D PROMO SECURITE TOUR ET DES LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 05 50 15 00 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D PROMO SECURITE TOUR ET DES LOISIRS'))
    );

    -- S/D QUALITE, NORMALISATION ET CONTROLE
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 05 05 00', 'S/D QUALITE, NORMALISATION ET CONTROLE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 05 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D QUALITE, NORMALISATION ET CONTROLE'))
    );

    -- SOUS-DIRECTION DU TOURISME MEDICAL
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 05 10 00', 'SOUS-DIRECTION DU TOURISME MEDICAL', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 05 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DU TOURISME MEDICAL'))
    );

    -- S/D DE L'ENCADREMENT DES EXPLOITANTS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 05 15 00', 'S/D DE L''ENCADREMENT DES EXPLOITANTS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 05 15 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE L''ENCADREMENT DES EXPLOITANTS'))
    );

    -- SOUS-DIRECTION DU TOURISME RELIGIEUX
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 05 20 00', 'SOUS-DIRECTION DU TOURISME RELIGIEUX', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 05 20 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DU TOURISME RELIGIEUX'))
    );

    -- SOUS-DIRECTION PROFESSIONNALISATION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 10 05 00', 'SOUS-DIRECTION PROFESSIONNALISATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 10 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION PROFESSIONNALISATION'))
    );

    -- SOUS-DIRECTION DE LA COOPERATION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 10 10 00', 'SOUS-DIRECTION DE LA COOPERATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 10 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DE LA COOPERATION'))
    );

    -- SOUS-DIRECTION DES SERVICES DECONCENTRES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 15 05 00', 'SOUS-DIRECTION DES SERVICES DECONCENTRES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 15 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DES SERVICES DECONCENTRES'))
    );

    -- S/D BUREAUX DU TOURISME POUR ETRANGER
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 05 15 10 00', 'S/D BUREAUX DU TOURISME POUR ETRANGER', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 05 15 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D BUREAUX DU TOURISME POUR ETRANGER'))
    );

    -- S/D INFRAST. , ESPACE & EQUIP DE LOISIRS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 05 05 00', 'S/D INFRAST. , ESPACE & EQUIP DE LOISIRS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 10 05 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D INFRAST. , ESPACE & EQUIP DE LOISIRS'))
    );

    -- SOUS-DIRECTION DES JEUX NUMERIQUES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 05 10 00', 'SOUS-DIRECTION DES JEUX NUMERIQUES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 10 05 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SOUS-DIRECTION DES JEUX NUMERIQUES'))
    );

    -- S/D ENCADREMENT & VALORISATION JEUX TRAD
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 10 05 00', 'S/D ENCADREMENT & VALORISATION JEUX TRAD', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 10 10 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D ENCADREMENT & VALORISATION JEUX TRAD'))
    );

    -- S/D VULGARISATION & PROMOTION JEUX TRADI
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 10 10 10 10 00', 'S/D VULGARISATION & PROMOTION JEUX TRADI', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 10 10 10 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D VULGARISATION & PROMOTION JEUX TRADI'))
    );

    -- S/D RESSOURCES HUMAINES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 05 05 00', 'S/D RESSOURCES HUMAINES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 05 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D RESSOURCES HUMAINES'))
    );

    -- S/D FORMAT° ET DU PERFECTIONNEMENT
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 05 10 00', 'S/D FORMAT° ET DU PERFECTIONNEMENT', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 05 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D FORMAT° ET DU PERFECTIONNEMENT'))
    );

    -- S/D DU BUDGET & DES FINANCES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 10 05 00', 'S/D DU BUDGET & DES FINANCES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 10 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU BUDGET & DES FINANCES'))
    );

    -- S/D DES MOYENS GENERAUX
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 10 10 00', 'S/D DES MOYENS GENERAUX', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 10 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES MOYENS GENERAUX'))
    );

    -- S/D STATISTIQUES
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 15 05 00', 'S/D STATISTIQUES', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 15 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D STATISTIQUES'))
    );

    -- S/D DU SUIVI-EVALUATION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 15 10 00', 'S/D DU SUIVI-EVALUATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 15 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DU SUIVI-EVALUATION'))
    );

    -- S/D MARKETING ET COMMUNICATION
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 20 05 00', 'S/D MARKETING ET COMMUNICATION', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 20 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D MARKETING ET COMMUNICATION'))
    );

    -- S/D L'INFORMATION ET DES TIC
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 20 10 00', 'S/D L''INFORMATION ET DES TIC', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 20 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D L''INFORMATION ET DES TIC'))
    );

    -- S/D DES EVENEMENTIELS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 20 15 00', 'S/D DES EVENEMENTIELS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 20 15 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DES EVENEMENTIELS'))
    );

    -- S/D RELATION AVEC LES OPERATEURS
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 25 05 00', 'S/D RELATION AVEC LES OPERATEURS', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 25 05 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D RELATION AVEC LES OPERATEURS'))
    );

    -- S/D DE LA PRODUCTION DU DEV. TOURISTIQUE
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 25 10 00', 'S/D DE LA PRODUCTION DU DEV. TOURISTIQUE', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 25 10 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D DE LA PRODUCTION DU DEV. TOURISTIQUE'))
    );

    -- S/D COORD.BUREAUX A L'ETRANGER & BUR.REG
    INSERT INTO public.sous_directions (id_ministere, code, libelle, is_active)
    SELECT 1, '47 20 10 25 15 00', 'S/D COORD.BUREAUX A L''ETRANGER & BUR.REG', true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sous_directions 
        WHERE code = '47 20 10 25 15 00'
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('S/D COORD.BUREAUX A L''ETRANGER & BUR.REG'))
    );

END $$;

-- 4. Créer les Services
DO $$
BEGIN
    -- SERVICE COURRIER DE LA DRH
    INSERT INTO public.services (id_ministere, id_direction, code, libelle, is_active)
    SELECT 
        1,
        (SELECT id FROM public.directions WHERE code = '47 05 25 00 00 00' LIMIT 1),
        '47 05 25 00 05 00',
        'SERVICE COURRIER DE LA DRH',
        true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.services 
        WHERE code = '47 05 25 00 05 00' 
           OR (id_ministere = 1 AND UPPER(libelle) = UPPER('SERVICE COURRIER DE LA DRH'))
    );

END $$;

-- ===============================================================================
-- PARTIE 2: ASSIGNATION DES DIRECTIONS GÉNÉRALES AUX AGENTS
-- ===============================================================================

-- Assigner la DG "CABINET" à 203 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('CABINET')
    LIMIT 1
)
WHERE matricule IN (
    '503281V', '201957B', '272129B', '434689Y', '313044S', '366249Z', '460997T', '861964X', '855878B', '826255V',
    '889566V', '468207P', '889425Q', '821007L', '856634X', '360923B', '504952W', '504954Y', '504956S', '982675X',
    '982907R', '982922F', '982953N', '982961N', '982982C', '982983D', '982984E', '982827G', '982864M', '982911C',
    '982918K', '982965J', '982994G', '982995H', '982996A', '982998L', '323311U', '419669L', '811076N', '982971Q',
    '982985F', '255532W', '255533X', '265648U', '275295D', '437484E', '337228F', '345907H', '368215R', '820764H',
    '480792S', '815419P', '815488M', '825989M', '481521F', '372134U', '982829J', '436116B', '464357G', '345381H',
    '886661Z', '902371E', '902716Y', '905377F', '982950X', '982825E', '982828R', '982830P', '982831C', '982833E',
    '982863L', '982999M', '885469Y', '323314X', '371880C', '826175M', '826186H', '982930K', '885397Q', '323944X',
    '233494K', '272142G', '468200U', '433341Z', '815472L', '855864V', '855865W', '856161V', '265431T', '886723P',
    '826009T', '481534C', '867627T', '982826F', '291090Y', '345912V', '345906G', '277838F', '338383C', '272132W',
    '337222Z', '337225U', '359187D', '266393E', '452000F', '481466Q', '483528Q', '825998N', '807569E', '359184A',
    '468852D', '982867Q', '982960Z', '307354Q', '345662J', '832839M', '372229K', '358599R', '297584N', '304895V',
    '402854W', '314826Q', '855854T', '323854V', '874067U', '855890U', '323855W', '435599P', '482009T', '507038Y',
    '982908S', '982928M', '982969W', '982989K', '982997B', '307251R', '484367X', '982868Z', '982949S', '982970T',
    '312892R', '925925G', '826301U', '855875Y', '359190L', '815507Q', '855467X', '855816M', '855818X', '855852Z',
    '855847U', '877509G', '268184F', '481418Q', '982942K', '467173T', '297582L', '815433D', '483698T', '297577W',
    '291171Z', '491347S', '855859G', '825999P', '886194E', '885532F', '506857Z', '467389C', '467423N', '482306Z',
    '827779B', '827781N', '827810P', '506858A', '481073R', '886296L', '886369C', '890118Z', '481638U', '420373G',
    '506866S', '982986G', '313054U', '359136H', '815459X', '855829S', '855825N', '506867T', '323845U', '480594L',
    '480817K', '337223S', '293402U', '323830Z', '827831G', '834867K', '365770W', '359181F', '337231S', '493835E',
    '810016M', '857121N', '982968V'
);

-- Assigner la DG "DG INDUSTRIE TOURISTIQUE ET HOTELIERE" à 69 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('DG INDUSTRIE TOURISTIQUE ET HOTELIERE')
    LIMIT 1
)
WHERE matricule IN (
    '327124M', '280155A', '467560B', '855832M', '871253G', '365484V', '313048E', '319370X', '433903N', '304886U',
    '855874X', '889388B', '887494C', '827768G', '982975L', '277839G', '337229G', '313039V', '368217K', '855828Z',
    '481434G', '982817E', '982862K', '982905P', '982929N', '312887L', '291611S', '433865P', '433879V', '482018K',
    '815454J', '821059X', '815476Q', '506863X', '265759T', '297586Q', '337226V', '481942M', '506865Z', '815497E',
    '323836K', '480631Y', '201560R', '855860D', '820545W', '808046E', '806844Z', '982823C', '286956X', '323833Q',
    '368216J', '827828M', '323834R', '323840B', '359185B', '464162V', '815504M', '504955Z', '492302X', '855841W',
    '858378Y', '826007R', '506862W', '297590Y', '359188N', '827817A', '832911D', '251283H', '487322M'
);

-- Assigner la DG "DIRECTION GENERALE DES LOISIRS" à 48 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('DIRECTION GENERALE DES LOISIRS')
    LIMIT 1
)
WHERE matricule IN (
    '867562S', '304885T', '368214Q', '889093P', '876799H', '826157K', '855826P', '481626Q', '887502L', '887689X',
    '826011C', '908887T', '504953X', '982951L', '815436G', '852207G', '852240L', '865786Z', '319371L', '284526N',
    '481934D', '855888W', '481904Q', '338288M', '506861V', '275045D', '233613Z', '355154F', '390278T', '456919U',
    '506855X', '852135P', '865752E', '865780F', '865813L', '855883R', '897985A', '806868H', '890209M', '372652K',
    '442433P', '320381C', '982976M', '344925Z', '473683Z', '323856X', '390102C', '379660E'
);

-- Assigner la DG "DIRECTIONS REGIONALES" à 422 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('DIRECTIONS REGIONALES')
    LIMIT 1
)
WHERE matricule IN (
    '272140J', '345913W', '313055V', '323848F', '480710B', '482019L', '815486B', '834105Q', '815460U', '855838T',
    '874645C', '469466B', '855877S', '826002L', '421314J', '468225G', '468562A', '802422N', '291178G', '852291U',
    '304888E', '304889F', '323829U', '337230D', '386459H', '435328W', '480566X', '480684W', '815421H', '815435F',
    '815491G', '834142L', '855839U', '889312W', '856590Y', '889628B', '874813M', '469887S', '481572J', '482868U',
    '291182M', '802321Y', '852286X', '434616N', '433404J', '447591K', '832904P', '855830X', '855846T', '474937Q',
    '470972B', '885624K', '468537Z', '481445K', '231138T', '265962F', '803532M', '313043Z', '323827J', '323831N',
    '482328W', '304892S', '323846V', '359182G', '447958A', '464165Y', '480545S', '834359D', '855822K', '855843Y',
    '855868H', '855891R', '467987L', '483707U', '875722S', '304882Y', '384378M', '323853U', '323843S', '447582J',
    '464167S', '480581P', '481978Z', '815423B', '832859Z', '834958W', '855372F', '855848D', '855882Q', '855886L',
    '855889X', '857718C', '875678N', '855857W', '481393P', '982940V', '855855U', '272128A', '871901T', '815446J',
    '870454D', '323838V', '323857Y', '345914X', '433356Y', '433391L', '447587P', '418949C', '464159A', '815445R',
    '830080W', '832891A', '855863U', '885584C', '855842X', '904690D', '852136Q', '291177X', '313040A', '464176T',
    '464180U', '470032Y', '480564V', '815455K', '815664U', '832864N', '832874Q', '832919M', '855833N', '889097K',
    '874642H', '498943X', '481384N', '827809T', '291174U', '435225P', '815499Q', '345910F', '418988U', '475706A',
    '855884J', '447589Z', '480503Z', '481901M', '481983F', '495974K', '898664G', '418951W', '334707D', '815669H',
    '820825P', '866768P', '272130G', '345916Z', '361854B', '480587M', '810584L', '855850B', '858955B', '820542T',
    '470988C', '481623M', '304896W', '480601B', '855469H', '855858F', '350234N', '469479Q', '481392N', '830131R',
    '982947Q', '158733E', '483686P', '803534P', '852132L', '313045T', '323837L', '855872V', '323849G', '464171W',
    '480586L', '480692W', '480743G', '827945J', '830050F', '832854L', '834086G', '834133B', '855853S', '827449Z',
    '273520G', '855837J', '481455M', '901902T', '349302W', '315994J', '297630F', '815474N', '852217Z', '433357Z',
    '467420X', '855831L', '480518X', '816080L', '810032M', '874661C', '874803U', '482932C', '982980N', '291176W',
    '815478S', '888935N', '480624Z', '481961Q', '815475P', '815501J', '855835Q', '481494D', '297585P', '852197N',
    '481893D', '855871U', '885472K', '483687Q', '313773H', '272135Z', '815418N', '297579G', '359178T', '387981N',
    '481925C', '481962R', '481976P', '418948B', '885708G', '826153P', '468090H', '481412A', '482004N', '897703X',
    '834755S', '277841A', '815431B', '485169S', '464166Z', '480731U', '855861S', '855862T', '855873W', '826154Q',
    '481590R', '420435P', '357771K', '852231X', '319399R', '908662Q', '805019Y', '447557Y', '480679Q', '855879C',
    '418984Q', '468402B', '371987T', '481413B', '481526C', '826158U', '902807V', '246394B', '815449V', '433367T',
    '434033H', '481049Z', '827826B', '855817N', '815490K', '856181J', '481935E', '819118V', '815477R', '272133X',
    '481390Y', '803457S', '815447K', '815456L', '313047V', '855824M', '820543U', '855880S', '491244T', '855834P',
    '400817T', '803543Y', '875950B', '297588S', '359186C', '855856V', '480632Z', '481541K', '832885C', '855845S',
    '815427F', '481383M', '481566L', '887249D', '291179H', '357870K', '464170H', '464173Y', '815481E', '827822F',
    '827824H', '272141F', '815473M', '447559A', '481064Q', '855887M', '272139D', '815437H', '865406V', '464161U',
    '480638F', '480695Z', '482017A', '815462J', '815468Y', '830036M', '470991X', '470054E', '483237L', '856191L',
    '471757G', '304891Z', '852280D', '447572X', '464178D', '490020V', '855823L', '855851Y', '490894K', '826156J',
    '886245Y', '876947V', '291183N', '855866X', '481905R', '815480R', '855450A', '481542L', '855849E', '291175V',
    '815434E', '481640A', '815492H', '358754T', '272134Y', '318251K', '864879D', '291061W', '357504H', '815458W',
    '815489N', '852269M', '304890C', '305831V', '386604B', '433382K', '466992Q', '874654D', '482246U', '385534K',
    '447588Y', '480523L', '480694Y', '480709P', '815426E', '815451P', '819354H', '827829N', '832853K', '832886D',
    '855867Y', '855881P', '815461R', '826001K', '827419K', '826005P', '982955Q', '297591M', '815448U', '359189P',
    '885392K', '464168B', '481505Q', '855869A', '820547Y', '471018X', '481207V', '313051Z', '852216Y', '827761Z',
    '323835J', '464179E', '480580S', '815420L', '855820V', '889085P', '419036M', '855844Z', '323197K', '889420X',
    '231462Y', '815482F', '815422A', '323850D', '855885K', '482010P', '481500X', '304898G', '863462S', '485206Y',
    '887753W', '890060E'
);

-- Assigner la DG "BUREAUX DU TOURISME POUR L'ETRANGER" à 16 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('BUREAUX DU TOURISME POUR L''ETRANGER')
    LIMIT 1
)
WHERE matricule IN (
    '480288H', '506215V', '865486M', '507095J', '251279U', '507163S', '506415N', '503323W', '396544Y', '809988D',
    '877587N', '506234Y', '506864Y', '285815R', '506254C', '506294V'
);

-- Assigner la DG "DIRECT° GENERALE COTE D'IVOIRE TOURISME" à 52 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('DIRECT° GENERALE COTE D''IVOIRE TOURISME')
    LIMIT 1
)
WHERE matricule IN (
    '866514R', '315928X', '350428R', '815450S', '855827Q', '821115C', '314003T', '886292Q', '888832P', '811666S',
    '359729T', '500374J', '159015T', '821439R', '813575R', '245090H', '817164R', '265045B', '827422E', '298230P',
    '313290A', '810493R', '827978T', '809995U', '313050C', '345915Y', '307272N', '337227W', '810020V', '810075Y',
    '827511F', '323842Z', '481519M', '304899H', '284351E', '865713X', '305872E', '291172S', '304893T', '323828T',
    '251272M', '291170C', '272131V', '304884S', '810000A', '291184P', '361146D', '304897X', '345909K', '359179U',
    '810021J', '807762F'
);

-- Assigner la DG "CONSEIL NATIONAL DU TOURISME" à 9 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('CONSEIL NATIONAL DU TOURISME')
    LIMIT 1
)
WHERE matricule IN (
    '365485W', '389796E', '206234B', '282337W', '203254L', '306629K', '237252B', '870807G', '483689S'
);

-- Assigner la DG "FONDS DE DEVELOPPEMNT TOURISTIQUE" à 5 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('FONDS DE DEVELOPPEMNT TOURISTIQUE')
    LIMIT 1
)
WHERE matricule IN (
    '885394M', '885447J', '827509W', '506074T', '982973J'
);

-- Assigner la DG "INSTANCE D'AFFECTATION" à 5 agents
UPDATE public.agents
SET id_direction_generale = (
    SELECT id FROM public.direction_generale
    WHERE UPPER(libelle) = UPPER('INSTANCE D''AFFECTATION')
    LIMIT 1
)
WHERE matricule IN (
    '355870R', '290488B', '343470L', '162855V', '982941J'
);

-- ===============================================================================
-- PARTIE 3: ASSIGNATION DES DIRECTIONS/SOUS-DIRECTIONS/SERVICES
-- ===============================================================================

-- CABINET (36 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 00 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '503281V', '201957B', '272129B', '434689Y', '313044S', '366249Z', '460997T', '861964X', '855878B', '826255V',
    '889566V', '468207P', '889425Q', '821007L', '856634X', '360923B', '504952W', '504954Y', '504956S', '982675X',
    '982907R', '982922F', '982953N', '982961N', '982982C', '982983D', '982984E', '982827G', '982864M', '982911C',
    '982918K', '982965J', '982994G', '982995H', '982996A', '982998L'
);

-- CELLULE DE PASSATION DES MARCHES PUBLICS (5 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 00 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '323311U', '419669L', '811076N', '982971Q', '982985F'
);

-- INSP. GEN. DU TOURISME ET DES LOISIRS (16 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 05 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '255532W', '255533X', '265648U', '275295D', '437484E', '337228F', '345907H', '368215R', '820764H', '480792S',
    '815419P', '815488M', '825989M', '481521F', '372134U', '982829J'
);

-- DIRECTION DES AFFAIRES FINANCIERES (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 15 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '436116B', '464357G', '345381H', '886661Z', '902371E', '902716Y', '905377F', '982950X', '982825E', '982828R',
    '982830P', '982831C', '982833E', '982863L', '982999M'
);

-- S/D DU BUDGET & DE LA COMPTABILITE (6 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 15 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '885469Y', '323314X', '371880C', '826175M', '826186H', '982930K'
);

-- S/D DES ETUDES ET CONTROLE DE GESTION (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 15 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '885397Q', '323944X'
);

-- DIRECTION DU GUICHET UNIQUE (14 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 20 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '233494K', '272142G', '468200U', '433341Z', '815472L', '855864V', '855865W', '856161V', '265431T', '886723P',
    '826009T', '481534C', '867627T', '982826F'
);

-- S/D DE L'INFORMATION ET SENSIBILISATION (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 20 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '291090Y', '345912V', '345906G'
);

-- S/D SUIVI INVESTISSEMENT ET RECOUVREMENT (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 20 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '277838F', '338383C'
);

-- S/D SUIVI DES ACTES & AUTORISATIONS (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 20 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '272132W', '337222Z', '337225U', '359187D'
);

-- DIRECTION DES RESSOURCES HUMAINES (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 25 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '266393E', '452000F', '481466Q', '483528Q', '825998N', '807569E'
);

-- SERVICE COURRIER DE LA DRH (4 agents)
UPDATE public.agents
SET id_service = (
    SELECT id FROM public.services
    WHERE code = '47 05 25 00 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '359184A', '468852D', '982867Q', '982960Z'
);

-- S/D DE LA GESTION DU PERSONNEL (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 25 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '307354Q', '345662J', '832839M', '372229K'
);

-- S/D DE L'ACTION SOCIALE (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 25 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '358599R', '297584N', '304895V', '402854W'
);

-- S/D DU RENFORCEMENT DES CAPACITES (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 25 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '314826Q', '855854T', '323854V', '874067U'
);

-- DIR. COMMUNICATION ET DOCUMENTATION (10 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 30 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '855890U', '323855W', '435599P', '482009T', '507038Y', '982908S', '982928M', '982969W', '982989K', '982997B'
);

-- S/D DE LA DOCUMENTATION & DES ARCHIVES (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 30 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '307251R', '484367X', '982868Z'
);

-- S/D DE LA PRODUCTION ET DU DEV NUMERIQUE (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 30 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '982949S', '982970T'
);

-- DIR. PLANIFICATION, STATISTIQ & PROJETS (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 35 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '312892R', '925925G', '826301U', '855875Y', '359190L', '815507Q', '855467X', '855816M', '855818X', '855852Z',
    '855847U', '877509G', '268184F', '481418Q', '982942K'
);

-- S/D DE LA PLANIF & DES PROJETS (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 35 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '467173T', '297582L', '815433D'
);

-- S/D DES STATISTIQUES (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 35 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '483698T'
);

-- S/D DE L'AMENAG, FONCIER TOUR ET LOISIRS (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 35 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '297577W', '291171Z'
);

-- DIR. INFORMAT, DIGITAL ET DEV. STARTUPS (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 40 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '491347S', '855859G', '825999P', '886194E', '885532F', '506857Z'
);

-- S/D DE L'INFORMATIQUE (5 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 40 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '467389C', '467423N', '482306Z', '827779B', '827781N'
);

-- S/D DIGITALISATION ET DEVELOP STARTUPS (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 40 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '827810P', '506858A'
);

-- DIR.  AFFAIRES JURIDIQUES ET CONTENTIEUX (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 45 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '481073R', '886296L', '886369C', '890118Z', '481638U', '420373G'
);

-- SOUS-DIRECTION DE LA LEGISLATION (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 45 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '506866S'
);

-- SOUS-DIRECTION DU CONTENTIEUX (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 45 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '982986G'
);

-- DIR. SECURITE TOURISTIQUE ET DES LOISIRS (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 50 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '313054U', '359136H', '815459X', '855829S', '855825N', '506867T'
);

-- S/D PREVENTION ET GESTION DES RISQUES (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 50 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '323845U', '480594L', '480817K'
);

-- BRIGARDE TOURISTIQUE ET DES LOISIRS (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 50 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '337223S'
);

-- S/D PROMO SECURITE TOUR ET DES LOISIRS (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 05 50 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '293402U', '323830Z', '827831G', '834867K'
);

-- GESTIONNAIRE DU PATRIMOINE (7 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 05 55 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '365770W', '359181F', '337231S', '493835E', '810016M', '857121N', '982968V'
);

-- DG INDUSTRIE TOURISTIQUE ET HOTELIERE (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 05 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '327124M', '280155A', '467560B', '855832M', '871253G', '365484V', '313048E', '319370X', '433903N', '304886U',
    '855874X', '889388B', '887494C', '827768G', '982975L'
);

-- DIRECTION DES ACTIVITES TOURISTIQUES (10 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 05 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '277839G', '337229G', '313039V', '368217K', '855828Z', '481434G', '982817E', '982862K', '982905P', '982929N'
);

-- S/D QUALITE, NORMALISATION ET CONTROLE (6 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 05 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '312887L', '291611S', '433865P', '433879V', '482018K', '815454J'
);

-- SOUS-DIRECTION DU TOURISME MEDICAL (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 05 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '821059X', '815476Q', '506863X'
);

-- S/D DE L'ENCADREMENT DES EXPLOITANTS (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 05 15 00'
    LIMIT 1
)
WHERE matricule IN (
    '265759T', '297586Q', '337226V', '481942M'
);

-- SOUS-DIRECTION DU TOURISME RELIGIEUX (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 05 20 00'
    LIMIT 1
)
WHERE matricule IN (
    '506865Z', '815497E', '323836K', '480631Y'
);

-- DIR. COOPERATION ET PROFESSIONNALISATION (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 05 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '201560R', '855860D', '820545W', '808046E', '806844Z', '982823C'
);

-- SOUS-DIRECTION PROFESSIONNALISATION (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 10 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '286956X', '323833Q', '368216J', '827828M'
);

-- SOUS-DIRECTION DE LA COOPERATION (6 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 10 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '323834R', '323840B', '359185B', '464162V', '815504M', '504955Z'
);

-- DIRECTION DES SERVICES EXTERIEURS (5 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 05 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '492302X', '855841W', '858378Y', '826007R', '506862W'
);

-- SOUS-DIRECTION DES SERVICES DECONCENTRES (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 15 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '297590Y', '359188N', '827817A', '832911D'
);

-- S/D BUREAUX DU TOURISME POUR ETRANGER (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 05 15 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '251283H', '487322M'
);

-- DIRECTION GENERALE DES LOISIRS (14 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 10 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '867562S', '304885T', '368214Q', '889093P', '876799H', '826157K', '855826P', '481626Q', '887502L', '887689X',
    '826011C', '908887T', '504953X', '982951L'
);

-- DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM (11 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 10 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '815436G', '852207G', '852240L', '865786Z', '319371L', '284526N', '481934D', '855888W', '481904Q', '338288M',
    '506861V'
);

-- S/D INFRAST. , ESPACE & EQUIP DE LOISIRS (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 10 05 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '275045D', '233613Z', '355154F', '390278T'
);

-- SOUS-DIRECTION DES JEUX NUMERIQUES (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 10 05 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '456919U', '506855X'
);

-- DIR. VALOR., FORM. & PROMO JEUX TRADIT (8 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 10 10 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '852135P', '865752E', '865780F', '865813L', '855883R', '897985A', '806868H', '890209M'
);

-- S/D ENCADREMENT & VALORISATION JEUX TRAD (4 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 10 10 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '372652K', '442433P', '320381C', '982976M'
);

-- S/D VULGARISATION & PROMOTION JEUX TRADI (5 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 10 10 10 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '344925Z', '473683Z', '323856X', '390102C', '379660E'
);

-- DIRECTION REGIONALE D'ABIDJAN NORD (18 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 03 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '272140J', '345913W', '313055V', '323848F', '480710B', '482019L', '815486B', '834105Q', '815460U', '855838T',
    '874645C', '469466B', '855877S', '826002L', '421314J', '468225G', '468562A', '802422N'
);

-- DIRECTION DEPARTEMENTALE ABJ NORD 1 (22 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 03 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '291178G', '852291U', '304888E', '304889F', '323829U', '337230D', '386459H', '435328W', '480566X', '480684W',
    '815421H', '815435F', '815491G', '834142L', '855839U', '889312W', '856590Y', '889628B', '874813M', '469887S',
    '481572J', '482868U'
);

-- DIRECTION DEPARTEMENTALE  DE DABOU (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 03 15 00'
    LIMIT 1
)
WHERE matricule IN (
    '291182M', '802321Y', '852286X', '434616N', '433404J', '447591K', '832904P', '855830X', '855846T', '474937Q',
    '470972B', '885624K', '468537Z', '481445K', '231138T'
);

-- DIRECTION REGIONALE ABIDJAN SUD (20 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 04 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '265962F', '803532M', '313043Z', '323827J', '323831N', '482328W', '304892S', '323846V', '359182G', '447958A',
    '464165Y', '480545S', '834359D', '855822K', '855843Y', '855868H', '855891R', '467987L', '483707U', '875722S'
);

-- DIRECTION DEPARTEMENTALE ABJ SUD 1 (21 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 04 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '304882Y', '384378M', '323853U', '323843S', '447582J', '464167S', '480581P', '481978Z', '815423B', '832859Z',
    '834958W', '855372F', '855848D', '855882Q', '855886L', '855889X', '857718C', '875678N', '855857W', '481393P',
    '982940V'
);

-- DIRECTION REGIONALE DE GRAND-BASSAM (20 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 07 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '855855U', '272128A', '871901T', '815446J', '870454D', '323838V', '323857Y', '345914X', '433356Y', '433391L',
    '447587P', '418949C', '464159A', '815445R', '830080W', '832891A', '855863U', '885584C', '855842X', '904690D'
);

-- DIRECTION DEPARTEMENTALE  ADZOPE (17 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 07 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '852136Q', '291177X', '313040A', '464176T', '464180U', '470032Y', '480564V', '815455K', '815664U', '832864N',
    '832874Q', '832919M', '855833N', '889097K', '874642H', '498943X', '481384N'
);

-- DIRECTION DEPARTEMENTALE  AGBOVILLE (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 07 15 00'
    LIMIT 1
)
WHERE matricule IN (
    '827809T', '291174U', '435225P', '815499Q', '345910F', '418988U', '475706A', '855884J', '447589Z', '480503Z',
    '481901M', '481983F', '495974K', '898664G', '418951W'
);

-- DIRECTION REGIONALE D'ABENGOUROU (14 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '334707D', '815669H', '820825P', '866768P', '272130G', '345916Z', '361854B', '480587M', '810584L', '855850B',
    '858955B', '820542T', '470988C', '481623M'
);

-- DIRECTION DEPARTEMENTALE DE DAOUKRO (9 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 10 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '304896W', '480601B', '855469H', '855858F', '350234N', '469479Q', '481392N', '830131R', '982947Q'
);

-- DIRECTION REGIONALE DE BOUAKE (25 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '158733E', '483686P', '803534P', '852132L', '313045T', '323837L', '855872V', '323849G', '464171W', '480586L',
    '480692W', '480743G', '827945J', '830050F', '832854L', '834086G', '834133B', '855853S', '827449Z', '273520G',
    '855837J', '481455M', '901902T', '349302W', '315994J'
);

-- DIRECTION DEPARTEMENTALE KATIOLA (13 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 15 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '297630F', '815474N', '852217Z', '433357Z', '467420X', '855831L', '480518X', '816080L', '810032M', '874661C',
    '874803U', '482932C', '982980N'
);

-- DIRECTION REGIONALE DE BONDOUKOU (9 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 20 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '291176W', '815478S', '888935N', '480624Z', '481961Q', '815475P', '815501J', '855835Q', '481494D'
);

-- DIRECTION DEPARTEMENTALE  BOUNA (7 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 20 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '297585P', '852197N', '481893D', '855871U', '885472K', '483687Q', '313773H'
);

-- DIRECTION REGIONALE DE DALOA (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 25 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '272135Z', '815418N', '297579G', '359178T', '387981N', '481925C', '481962R', '481976P', '418948B', '885708G',
    '826153P', '468090H', '481412A', '482004N', '897703X'
);

-- DIRECTION DEPARTEMENTALE  GAGNOA (11 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 25 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '834755S', '277841A', '815431B', '485169S', '464166Z', '480731U', '855861S', '855862T', '855873W', '826154Q',
    '481590R'
);

-- DIRECTION DEPARTEMENTALE DIVO (16 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 25 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '420435P', '357771K', '852231X', '319399R', '908662Q', '805019Y', '447557Y', '480679Q', '855879C', '418984Q',
    '468402B', '371987T', '481413B', '481526C', '826158U', '902807V'
);

-- DIRECTION REGIONALE DE MAN (11 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 30 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '246394B', '815449V', '433367T', '434033H', '481049Z', '827826B', '855817N', '815490K', '856181J', '481935E',
    '819118V'
);

-- DIRECTION DEPARTEMENTALE GUIGLO (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 30 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '815477R', '272133X', '481390Y', '803457S', '815447K', '815456L'
);

-- DIRECTION DEPARTEMENTALE  DANANE (6 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 30 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '313047V', '855824M', '820543U', '855880S', '491244T', '855834P'
);

-- DIRECTION REGIONALE DE SAN-PEDRO (14 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 35 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '400817T', '803543Y', '875950B', '297588S', '359186C', '855856V', '480632Z', '481541K', '832885C', '855845S',
    '815427F', '481383M', '481566L', '887249D'
);

-- DIRECTION DEPARTEMENTALE  SOUBRE (7 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 35 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '291179H', '357870K', '464170H', '464173Y', '815481E', '827822F', '827824H'
);

-- DIRECTION DEPARTEMENTALE  SASSANDRA (5 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 35 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '272141F', '815473M', '447559A', '481064Q', '855887M'
);

-- DIRECTION REGIONALE DE KORHOGO (15 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 40 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '272139D', '815437H', '865406V', '464161U', '480638F', '480695Z', '482017A', '815462J', '815468Y', '830036M',
    '470991X', '470054E', '483237L', '856191L', '471757G'
);

-- DIRECTION DEPARTEMENTALE  BOUNDIALI (10 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 40 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '304891Z', '852280D', '447572X', '464178D', '490020V', '855823L', '855851Y', '490894K', '826156J', '886245Y'
);

-- DIRECTION DEPARTEMENTALE  FERKE (8 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 40 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '876947V', '291183N', '855866X', '481905R', '815480R', '855450A', '481542L', '855849E'
);

-- DIRECTION REGIONALE D'ODIENNE (4 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 45 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '291175V', '815434E', '481640A', '815492H'
);

-- DIRECTION DEPARTEMENTALE TOUBA (4 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 45 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '358754T', '272134Y', '318251K', '864879D'
);

-- DIRECTION REGIONALE DE YAMOUSSOUKRO (30 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 50 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '291061W', '357504H', '815458W', '815489N', '852269M', '304890C', '305831V', '386604B', '433382K', '466992Q',
    '874654D', '482246U', '385534K', '447588Y', '480523L', '480694Y', '480709P', '815426E', '815451P', '819354H',
    '827829N', '832853K', '832886D', '855867Y', '855881P', '815461R', '826001K', '827419K', '826005P', '982955Q'
);

-- DIRECTION DEPARTEMENTALE  DIMBOKRO (10 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 50 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '297591M', '815448U', '359189P', '885392K', '464168B', '481505Q', '855869A', '820547Y', '471018X', '481207V'
);

-- DIRECTION DEPARTEMENTALE  BOUAFLE (13 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 50 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '313051Z', '852216Y', '827761Z', '323835J', '464179E', '480580S', '815420L', '855820V', '889085P', '419036M',
    '855844Z', '323197K', '889420X'
);

-- DIRECTION REGIONALE DE SEGUELA (7 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 55 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '231462Y', '815482F', '815422A', '323850D', '855885K', '482010P', '481500X'
);

-- DIRECTION DEPARTEMENTALE MANKONO (5 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 05 55 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '304898G', '863462S', '485206Y', '887753W', '890060E'
);

-- BUREAU DE PARIS (2 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '480288H', '506215V'
);

-- BUREAU DE MILAN (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '865486M'
);

-- BUREAU DE LONDRES (ROYAUME UNI) (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 12 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '507095J'
);

-- BUREAU DE BERLIN (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 15 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '251279U'
);

-- BUREAU DE GENEVE (SUISSE) (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 17 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '507163S'
);

-- BUREAU DE MADRID (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 20 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '506415N'
);

-- BUREAU DE WASHINGTON (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 25 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '503323W'
);

-- BUREAU DE LAGOS (NIGERIA) (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 32 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '396544Y'
);

-- BUREAU DE BEIJING (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 35 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '809988D'
);

-- BUREAU DE PRETORIA (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 40 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '877587N'
);

-- BUREAU DE RIO DE JANEIRO (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 50 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '506234Y'
);

-- BUREAU DE RABAT (AF.OUEST, AF.CENT, AF N (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 55 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '506864Y'
);

-- BUREAU DE OTTAWA (CANADA) (2 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 60 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '285815R', '506254C'
);

-- BUREAU DE DOHA  (MOYEN ORIENT, EXT ORIEN (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 15 10 65 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '506294V'
);

-- DIRECT° GENERALE COTE D'IVOIRE TOURISME (12 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 10 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '866514R', '315928X', '350428R', '815450S', '855827Q', '821115C', '314003T', '886292Q', '888832P', '811666S',
    '359729T', '500374J'
);

-- DIRECT° RESSOURCES HUM. & MOY.GENERAUX (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 10 05 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '159015T'
);

-- S/D RESSOURCES HUMAINES (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 05 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '821439R', '813575R'
);

-- S/D FORMAT° ET DU PERFECTIONNEMENT (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 05 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '245090H'
);

-- DIRECT° DU BUDGET, DES FINANCES & DES MG (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 10 10 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '817164R'
);

-- S/D DU BUDGET & DES FINANCES (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 10 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '265045B', '827422E', '298230P'
);

-- S/D DES MOYENS GENERAUX (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 10 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '313290A'
);

-- S/D STATISTIQUES (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 15 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '810493R'
);

-- S/D DU SUIVI-EVALUATION (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 15 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '827978T', '809995U'
);

-- DIRECT° MARKETING,COMMUNICAT° ET DES TIC (7 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 10 20 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '313050C', '345915Y', '307272N', '337227W', '810020V', '810075Y', '827511F'
);

-- S/D MARKETING ET COMMUNICATION (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 20 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '323842Z', '481519M'
);

-- S/D L'INFORMATION ET DES TIC (2 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 20 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '304899H', '284351E'
);

-- S/D DES EVENEMENTIELS (1 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 20 15 00'
    LIMIT 1
)
WHERE matricule IN (
    '865713X'
);

-- DIRECT° DES RELATIONS EXTERIEURES (1 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 10 25 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '305872E'
);

-- S/D RELATION AVEC LES OPERATEURS (3 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 25 05 00'
    LIMIT 1
)
WHERE matricule IN (
    '291172S', '304893T', '323828T'
);

-- S/D DE LA PRODUCTION DU DEV. TOURISTIQUE (5 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 25 10 00'
    LIMIT 1
)
WHERE matricule IN (
    '251272M', '291170C', '272131V', '304884S', '810000A'
);

-- S/D COORD.BUREAUX A L'ETRANGER & BUR.REG (7 agents)
UPDATE public.agents
SET id_sous_direction = (
    SELECT id FROM public.sous_directions
    WHERE code = '47 20 10 25 15 00'
    LIMIT 1
)
WHERE matricule IN (
    '291184P', '361146D', '304897X', '345909K', '359179U', '810021J', '807762F'
);

-- CONSEIL NATIONAL DU TOURISME (9 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 36 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '365485W', '389796E', '206234B', '282337W', '203254L', '306629K', '237252B', '870807G', '483689S'
);

-- FONDS DE DEVELOPPEMNT TOURISTIQUE (5 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 20 40 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '885394M', '885447J', '827509W', '506074T', '982973J'
);

-- INSTANCE D'AFFECTATION (7 agents)
UPDATE public.agents
SET id_direction = (
    SELECT id FROM public.directions
    WHERE code = '47 99 00 00 00 00'
    LIMIT 1
)
WHERE matricule IN (
    '355870R', '290488B', '343470L', '162855V', '982941J', 'total general               :    829  agents', 'SOURCE GESPERS AU 22/10/2025'
);

-- ===============================================================================
-- STATISTIQUES
-- ===============================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_dir INTEGER;
    v_dg INTEGER;
    v_sd INTEGER;
    v_serv INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM agents;
    SELECT COUNT(*) INTO v_dir FROM agents WHERE id_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_dg FROM agents WHERE id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_sd FROM agents WHERE id_sous_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_serv FROM agents WHERE id_service IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Assignation automatique terminée !';
    RAISE NOTICE '   Total: % agents', v_total;
    RAISE NOTICE '   Direction: % (%.1f%%)', v_dir, (v_dir::DECIMAL / v_total * 100);
    RAISE NOTICE '   DG: % (%.1f%%)', v_dg, (v_dg::DECIMAL / v_total * 100);
    RAISE NOTICE '   S/D: % (%.1f%%)', v_sd, (v_sd::DECIMAL / v_total * 100);
    RAISE NOTICE '   Service: % (%.1f%%)', v_serv, (v_serv::DECIMAL / v_total * 100);
    RAISE NOTICE '';
END $$;
