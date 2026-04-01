-- ===============================================================================
-- Script d'assignation des agents basé sur la structure du CSV
-- ===============================================================================
-- Les agents sont groupés par les lignes DIR/SER dans le CSV
-- ===============================================================================

-- ===============================================================================
-- ETAPE 0: Ajouter la colonne is_active si elle n'existe pas
-- ===============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directions' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.directions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sous_directions' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.sous_directions ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 1: Assigner les agents au CABINET (DIR / SER : 47 05 00 00 00 00)
-- ===============================================================================
-- Matricules: 503281V à 982996A (lignes 3 à 37 du CSV)

UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 00 00 00 00' OR UPPER(libelle) = 'CABINET' LIMIT 1)
WHERE matricule IN (
    '503281V', '201957B', '272129B', '434689Y', '313044S', '366249Z', '460997T', 
    '861964X', '855878B', '826255V', '889566V', '468207P', '889425Q', '821007L',
    '856634X', '360923B', '504952W', '504954Y', '504956S', '982675X', '982907R',
    '982922F', '982953N', '982961N', '982982C', '982983D', '982984E', '982827G',
    '982864M', '982911C', '982918K', '982965J', '982994G', '982995H', '982996A',
    '982998L'
);

-- ===============================================================================
-- ETAPE 2: Assigner les agents à CELLULE DE PASSATION DES MARCHES PUBLICS
-- ===============================================================================
-- (DIR / SER : 47 05 00 05 00 00)

UPDATE public.agents 
SET id_direction = (SELECT id FROM public.directions WHERE code = '47 05 00 05 00 00' LIMIT 1)
WHERE matricule IN (
    '323311U', '419669L', '811076N', '982971Q', '982985F'
);

-- ===============================================================================
-- ETAPE 3: Créer/Mettre à jour toutes les entités manquantes
-- ===============================================================================

-- S'assurer que toutes les directions existent
INSERT INTO public.directions (id_ministere, code, libelle, is_active)
SELECT 
    (SELECT id FROM ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    code,
    libelle,
    true
FROM (VALUES
    ('47 05 00 00 00 00', 'CABINET'),
    ('47 05 00 05 00 00', 'CELLULE DE PASSATION DES MARCHES PUBLICS'),
    ('47 05 05 00 00 00', 'INSP. GEN. DU TOURISME ET DES LOISIRS'),
    ('47 05 15 00 00 00', 'DIRECTION DES AFFAIRES FINANCIERES'),
    ('47 05 20 00 00 00', 'DIRECTION DU GUICHET UNIQUE'),
    ('47 05 25 00 00 00', 'DIRECTION DES RESSOURCES HUMAINES'),
    ('47 05 30 00 00 00', 'DIR. COMMUNICATION ET DOCUMENTATION'),
    ('47 05 35 00 00 00', 'DIR. PLANIFICATION, STATISTIQ & PROJETS'),
    ('47 05 40 00 00 00', 'DIR. INFORMAT, DIGITAL ET DEV. STARTUPS'),
    ('47 05 45 00 00 00', 'DIR. AFFAIRES JURIDIQUES ET CONTENTIEUX'),
    ('47 05 50 00 00 00', 'DIR. SECURITE TOURISTIQUE ET DES LOISIRS'),
    ('47 05 55 00 00 00', 'GESTIONNAIRE DU PATRIMOINE'),
    ('47 10 05 05 00 00', 'DIRECTION DES ACTIVITES TOURISTIQUES'),
    ('47 10 05 10 00 00', 'DIR. COOPERATION ET PROFESSIONNALISATION'),
    ('47 10 05 15 00 00', 'DIRECTION DES SERVICES EXTERIEURS'),
    ('47 10 10 05 00 00', 'DIR. PARCS DE LOISIRS, ATTRACT, JEUX NUM'),
    ('47 10 10 10 00 00', 'DIR. VALOR., FORM. & PROMO JEUX TRADIT')
) AS new_dirs(code, libelle)
WHERE NOT EXISTS (
    SELECT 1 FROM directions WHERE code = new_dirs.code
);

-- S'assurer que toutes les sous-directions existent
INSERT INTO public.sous_directions (id_ministere, id_direction, code, libelle, is_active)
SELECT 
    (SELECT id FROM ministeres WHERE code = '47' LIMIT 1),
    d.id,
    sd_data.code,
    sd_data.libelle,
    true
FROM (VALUES
    ('47 05 15 00 00 00', '47 05 15 05 00 00', 'S/D DU BUDGET & DE LA COMPTABILITE'),
    ('47 05 15 00 00 00', '47 05 15 10 00 00', 'S/D DES ETUDES ET CONTROLE DE GESTION'),
    ('47 05 20 00 00 00', '47 05 20 05 00 00', 'S/D DE L''INFORMATION ET SENSIBILISATION'),
    ('47 05 20 00 00 00', '47 05 20 10 00 00', 'S/D SUIVI INVESTISSEMENT ET RECOUVREMENT'),
    ('47 05 20 00 00 00', '47 05 20 15 00 00', 'S/D SUIVI DES ACTES & AUTORISATIONS'),
    ('47 05 25 00 00 00', '47 05 25 05 00 00', 'S/D DE LA GESTION DU PERSONNEL'),
    ('47 05 25 00 00 00', '47 05 25 10 00 00', 'S/D DE L''ACTION SOCIALE'),
    ('47 05 25 00 00 00', '47 05 25 15 00 00', 'S/D DU RENFORCEMENT DES CAPACITES'),
    ('47 05 30 00 00 00', '47 05 30 10 00 00', 'S/D DE LA DOCUMENTATION & DES ARCHIVES'),
    ('47 05 30 00 00 00', '47 05 30 15 00 00', 'S/D DE LA PRODUCTION ET DU DEV NUMERIQUE'),
    ('47 05 35 00 00 00', '47 05 35 05 00 00', 'S/D DE LA PLANIF & DES PROJETS'),
    ('47 05 35 00 00 00', '47 05 35 10 00 00', 'S/D DES STATISTIQUES'),
    ('47 05 35 00 00 00', '47 05 35 15 00 00', 'S/D DE L''AMENAG, FONCIER TOUR ET LOISIRS'),
    ('47 05 40 00 00 00', '47 05 40 05 00 00', 'S/D DE L''INFORMATIQUE'),
    ('47 05 40 00 00 00', '47 05 40 10 00 00', 'S/D DIGITALISATION ET DEVELOP STARTUPS'),
    ('47 05 45 00 00 00', '47 05 45 05 00 00', 'SOUS-DIRECTION DE LA LEGISLATION'),
    ('47 05 45 00 00 00', '47 05 45 10 00 00', 'SOUS-DIRECTION DU CONTENTIEUX'),
    ('47 05 50 00 00 00', '47 05 50 05 00 00', 'S/D PREVENTION ET GESTION DES RISQUES'),
    ('47 05 50 00 00 00', '47 05 50 10 00 00', 'BRIGARDE TOURISTIQUE ET DES LOISIRS'),
    ('47 05 50 00 00 00', '47 05 50 15 00 00', 'S/D PROMO SECURITE TOUR ET DES LOISIRS'),
    ('47 10 05 05 00 00', '47 10 05 05 05 00', 'S/D QUALITE, NORMALISATION ET CONTROLE'),
    ('47 10 05 05 00 00', '47 10 05 05 10 00', 'SOUS-DIRECTION DU TOURISME MEDICAL'),
    ('47 10 05 05 00 00', '47 10 05 05 15 00', 'S/D DE L''ENCADREMENT DES EXPLOITANTS'),
    ('47 10 05 05 00 00', '47 10 05 05 20 00', 'SOUS-DIRECTION DU TOURISME RELIGIEUX'),
    ('47 10 05 10 00 00', '47 10 05 10 05 00', 'SOUS-DIRECTION PROFESSIONNALISATION'),
    ('47 10 05 10 00 00', '47 10 05 10 10 00', 'SOUS-DIRECTION DE LA COOPERATION'),
    ('47 10 05 15 00 00', '47 10 05 15 05 00', 'SOUS-DIRECTION DES SERVICES DECONCENTRES'),
    ('47 10 05 15 00 00', '47 10 05 15 10 00', 'S/D BUREAUX DU TOURISME POUR ETRANGER'),
    ('47 10 10 05 00 00', '47 10 10 05 05 00', 'S/D INFRAST. , ESPACE & EQUIP DE LOISIRS'),
    ('47 10 10 05 00 00', '47 10 10 05 10 00', 'SOUS-DIRECTION DES JEUX NUMERIQUES')
) AS sd_data(direction_code, code, libelle)
LEFT JOIN public.directions d ON d.code = sd_data.direction_code
WHERE d.id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sous_directions WHERE code = sd_data.code)
ON CONFLICT (id_ministere, libelle) DO NOTHING;

-- ===============================================================================
-- ETAPE 4: Assigner automatiquement les DG via les directions
-- ===============================================================================

-- Mettre à jour id_direction_generale pour les agents dont la direction a une DG
UPDATE public.agents a
SET id_direction_generale = d.id_direction_generale
FROM public.directions d
WHERE a.id_direction = d.id
  AND d.id_direction_generale IS NOT NULL
  AND a.id_direction_generale IS NULL;

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
DECLARE
    v_total INTEGER;
    v_avec_dir INTEGER;
    v_avec_dg INTEGER;
    v_avec_sd INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM agents;
    SELECT COUNT(*) INTO v_avec_dir FROM agents WHERE id_direction IS NOT NULL;
    SELECT COUNT(*) INTO v_avec_dg FROM agents WHERE id_direction_generale IS NOT NULL;
    SELECT COUNT(*) INTO v_avec_sd FROM agents WHERE id_sous_direction IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Assignation basée sur la structure du CSV terminée !';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Résultats:';
    RAISE NOTICE '   Total agents: %', v_total;
    RAISE NOTICE '   Avec Direction: % (%.1f%%)', v_avec_dir, (v_avec_dir::DECIMAL / v_total * 100);
    RAISE NOTICE '   Avec Direction Générale: % (%.1f%%)', v_avec_dg, (v_avec_dg::DECIMAL / v_total * 100);
    RAISE NOTICE '   Avec Sous-Direction: % (%.1f%%)', v_avec_sd, (v_avec_sd::DECIMAL / v_total * 100);
    RAISE NOTICE '';
END $$;

