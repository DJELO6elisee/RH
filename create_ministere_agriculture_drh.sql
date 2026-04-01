-- ============================================================================
-- Script de création du Ministère de l'Agriculture avec un agent DRH
-- ============================================================================
-- Ce script crée :
-- 1. Le Ministère de l'Agriculture
-- 2. Un agent (DRH)
-- 3. Le rôle DRH (si non existant)
-- 4. Un compte utilisateur pour l'agent
-- ============================================================================

-- ============================================================================
-- IMPORTANT : Avant d'exécuter ce script, vous devez générer le hash du mot de passe
-- en utilisant le script Python : generate_password_hash.py
-- Le hash généré doit être inséré dans la variable v_password_hash ci-dessous
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CRÉATION DU MINISTÈRE DE L'AGRICULTURE
-- ============================================================================

-- Insertion du ministère (si non existant)
-- INSERT INTO public.ministeres (
--     code,
--     nom,
--     sigle,
--     description,
--     is_active,
--     created_at,
--     updated_at
-- ) VALUES (
--     'MINAGRI001',                                  -- Code du ministère
--     'MINISTÈRE DE L''AGRICULTURE',             -- Nom du ministère
--     'MINAGRI',                                  -- Sigle
--     'Ministère chargé de l''agriculture et du développement rural',  -- Description
--     true,                                        -- Actif
--     CURRENT_TIMESTAMP,                          -- Date de création
--     CURRENT_TIMESTAMP                           -- Date de mise à jour
-- )
-- ON CONFLICT (code) DO NOTHING;  -- Ne rien faire si le code existe déjà

-- ============================================================================
-- 2. CRÉATION DE L'AGENT DRH
-- ============================================================================

-- Variables pour l'agent (à personnaliser selon vos besoins)
DO $body$
DECLARE
    v_ministere_id INTEGER;
    v_agent_id INTEGER;
    v_role_id INTEGER;
    v_matricule VARCHAR(50) := 'DRHMINSP01';           -- Matricule de l'agent
    v_nom VARCHAR(100) := 'DRH';                    -- Nom de l'agent
    v_prenom VARCHAR(100) := 'MINTEST';                -- Prénom de l'agent
    v_date_naissance DATE := '1980-05-15';             -- Date de naissance
    v_annee_naissance VARCHAR(4);
    v_email VARCHAR(255) := 'drh.ministere.test@agriculture.gouv.ci'; -- Email de l'agent
    v_password VARCHAR(255);                           -- Mot de passe (Nom+Année)
    -- IMPORTANT : Ce hash a été généré avec generate_password_hash.py
    -- Le hash correspond à : Nom + Année de naissance (DRH1980)
    v_password_hash VARCHAR(255) := '$2b$12$F4CReKrB.Z51.so7NyO7WuKBn.8X5tb6246EH2/Mjzt5AuCuSdcjq';  -- Hash du mot de passe (généré avec Python)
    v_sexe CHAR(1) := 'M';                            -- Sexe (M ou F)
    v_telephone VARCHAR(20) := '+225 07 77 12 34 56';    -- Téléphone
BEGIN
    -- Récupérer l'ID du ministère de l'Agriculture
    SELECT id INTO v_ministere_id 
    FROM public.ministeres 
    WHERE code = 'MINAGRI001' 
    LIMIT 1;
    
    IF v_ministere_id IS NULL THEN
        RAISE EXCEPTION 'Le Ministère de l''Agriculture n''a pas été trouvé';
    END IF;
    
    RAISE NOTICE 'Ministère trouvé avec ID: %', v_ministere_id;
    
    -- Extraire l'année de naissance
    v_annee_naissance := EXTRACT(YEAR FROM v_date_naissance)::VARCHAR;
    
    -- Construire le mot de passe : Nom + Année de naissance
    v_password := v_nom || v_annee_naissance;
    
    -- Le hash du mot de passe a été pré-généré avec generate_password_hash.py
    
    RAISE NOTICE 'Mot de passe en clair: % (ne pas afficher en production !)', v_password;
    
    -- Insertion de l'agent
    INSERT INTO public.agents (
        nom,
        prenom,
        matricule,
        date_de_naissance,
        sexe,
        email,
        telephone1,
        id_ministere,
        statut_emploi,
        date_embauche,
        age,
        created_at,
        updated_at
    ) VALUES (
        v_nom,
        v_prenom,
        v_matricule,
        v_date_naissance,
        v_sexe,
        v_email,
        v_telephone,
        v_ministere_id,
        'actif',
        CURRENT_DATE,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_date_naissance))::INTEGER,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_agent_id;
    
    RAISE NOTICE 'Agent créé avec ID: %', v_agent_id;
    
    -- ============================================================================
    -- 3. CRÉATION DU RÔLE DRH (si non existant)
    -- ============================================================================
    
    -- Vérifier si le rôle DRH existe déjà
    SELECT id INTO v_role_id 
    FROM public.roles 
    WHERE nom = 'DRH' 
    LIMIT 1;
    
    -- Si le rôle n'existe pas, le créer
    IF v_role_id IS NULL THEN
        INSERT INTO public.roles (
            nom,
            description,
            permissions,
            created_at,
            updated_at
        ) VALUES (
            'DRH',
            'Directeur des Ressources Humaines - Accès complet à la gestion RH',
            '{"gestion_agents": true, "gestion_conges": true, "gestion_formations": true, "gestion_evaluations": true, "rapports": true, "administration": true}'::jsonb,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO v_role_id;
        
        RAISE NOTICE 'Rôle DRH créé avec ID: %', v_role_id;
    ELSE
        RAISE NOTICE 'Rôle DRH déjà existant avec ID: %', v_role_id;
    END IF;
    
    -- ============================================================================
    -- 4. CRÉATION DU COMPTE UTILISATEUR
    -- ============================================================================
    
    -- Insertion du compte utilisateur
    INSERT INTO public.utilisateurs (
        username,
        email,
        password_hash,
        id_role,
        id_agent,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_matricule,              -- Username = Matricule de l'agent
        v_email,                  -- Email de l'agent
        v_password_hash,          -- Hash du mot de passe
        v_role_id,                -- ID du rôle DRH
        v_agent_id,               -- ID de l'agent
        true,                     -- Compte actif
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE 'Compte utilisateur créé avec succès !';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'INFORMATIONS DE CONNEXION :';
    RAISE NOTICE 'Nom d''utilisateur : %', v_matricule;
    RAISE NOTICE 'Mot de passe : %', v_password;
    RAISE NOTICE 'Rôle : DRH';
    RAISE NOTICE 'Ministère : Ministère de l''Agriculture';
    RAISE NOTICE '==================================================';
    
END $body$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION DES DONNÉES CRÉÉES
-- ============================================================================

-- Afficher le ministère créé
SELECT 
    id,
    code,
    nom,
    sigle,
    is_active
FROM public.ministeres
WHERE code = 'MINAGRI001';

-- Afficher l'agent créé
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.email,
    a.date_de_naissance,
    a.statut_emploi,
    m.nom as ministere
FROM public.agents a
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
WHERE a.matricule = 'DRHMINTEST01';

-- Afficher le rôle DRH
SELECT 
    id,
    nom,
    description,
    permissions
FROM public.roles
WHERE nom = 'DRH';

-- Afficher le compte utilisateur créé
SELECT 
    u.id,
    u.username,
    u.email,
    u.is_active,
    r.nom as role,
    a.nom || ' ' || a.prenom as agent_complet
FROM public.utilisateurs u
LEFT JOIN public.roles r ON u.id_role = r.id
LEFT JOIN public.agents a ON u.id_agent = a.id
WHERE u.username = 'DRHMINTEST01';

