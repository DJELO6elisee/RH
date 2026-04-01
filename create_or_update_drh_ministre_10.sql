-- ============================================================================
-- Script de création/mise à jour du DRH pour le ministère 10
-- ============================================================================
-- Ce script crée ou met à jour un DRH pour le ministère 10 (MINAGRI001)
-- ============================================================================

BEGIN;

-- Variables pour l'agent (à personnaliser selon vos besoins)
DO $body$
DECLARE
    v_ministere_id INTEGER;
    v_agent_id INTEGER;
    v_role_id INTEGER;
    v_user_id INTEGER;
    v_matricule VARCHAR(50) := 'DRHMINTEST01';           -- Matricule de l'agent
    v_nom VARCHAR(100) := 'DRH';                    -- Nom de l'agent
    v_prenom VARCHAR(100) := 'MINTEST';                -- Prénom de l'agent
    v_date_naissance DATE := '1980-05-15';             -- Date de naissance
    v_annee_naissance VARCHAR(4);
    v_email VARCHAR(255) := 'drh.ministere.test@agriculture.gouv.ci'; -- Email de l'agent
    v_password VARCHAR(255);                           -- Mot de passe (Nom+Année)
    -- IMPORTANT : Ce hash a été généré avec generate_password_hash.py
    -- Le hash correspond à : Nom + Année de naissance (DRH1980)
    -- Hash généré le 2025-01-06 : $2b$12$APd1faLSFf1s6xUlwftGD.IDI56uScVNidntCbw7AKncCazAGZvGu
    v_password_hash VARCHAR(255) := '$2b$12$APd1faLSFf1s6xUlwftGD.IDI56uScVNidntCbw7AKncCazAGZvGu';  -- Hash du mot de passe (généré avec Python)
    v_sexe CHAR(1) := 'M';                            -- Sexe (M ou F)
    v_telephone VARCHAR(20) := '+225 07 77 12 34 56';    -- Téléphone
BEGIN
    -- 1. Récupérer l'ID du ministère 10 (MINAGRI001)
    SELECT id INTO v_ministere_id 
    FROM public.ministeres 
    WHERE (id = 10 OR code = 'MINAGRI001')
    LIMIT 1;
    
    IF v_ministere_id IS NULL THEN
        RAISE EXCEPTION 'Le Ministère 10 (MINAGRI001) n''a pas été trouvé';
    END IF;
    
    RAISE NOTICE 'Ministère trouvé avec ID: %', v_ministere_id;
    
    -- 2. Extraire l'année de naissance
    v_annee_naissance := EXTRACT(YEAR FROM v_date_naissance)::VARCHAR;
    
    -- 3. Construire le mot de passe : Nom + Année de naissance
    v_password := v_nom || v_annee_naissance;
    
    RAISE NOTICE 'Mot de passe en clair: % (ne pas afficher en production !)', v_password;
    
    -- 4. Vérifier si l'agent existe déjà
    SELECT id INTO v_agent_id 
    FROM public.agents 
    WHERE matricule = v_matricule
    LIMIT 1;
    
    IF v_agent_id IS NULL THEN
        -- Créer l'agent
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
    ELSE
        -- Mettre à jour l'agent pour s'assurer qu'il appartient au bon ministère
        UPDATE public.agents
        SET 
            id_ministere = v_ministere_id,
            nom = v_nom,
            prenom = v_prenom,
            email = v_email,
            telephone1 = v_telephone,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_agent_id;
        
        RAISE NOTICE 'Agent existant mis à jour avec ID: %', v_agent_id;
    END IF;
    
    -- 5. Vérifier si le rôle DRH existe
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
    
    -- 6. Vérifier si l'utilisateur existe déjà
    SELECT id INTO v_user_id 
    FROM public.utilisateurs 
    WHERE username = v_matricule
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        -- Créer l'utilisateur
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
        )
        RETURNING id INTO v_user_id;
        
        RAISE NOTICE 'Compte utilisateur créé avec ID: %', v_user_id;
    ELSE
        -- Mettre à jour l'utilisateur pour s'assurer qu'il a le bon agent et rôle
        UPDATE public.utilisateurs
        SET 
            id_agent = v_agent_id,
            id_role = v_role_id,
            password_hash = v_password_hash,
            email = v_email,
            is_active = true,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_id;
        
        RAISE NOTICE 'Compte utilisateur existant mis à jour avec ID: %', v_user_id;
    END IF;
    
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'OPÉRATION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'INFORMATIONS DE CONNEXION :';
    RAISE NOTICE 'Nom d''utilisateur : %', v_matricule;
    RAISE NOTICE 'Mot de passe : %', v_password;
    RAISE NOTICE 'Rôle : DRH';
    RAISE NOTICE 'Ministère ID : %', v_ministere_id;
    RAISE NOTICE 'Agent ID : %', v_agent_id;
    RAISE NOTICE 'Utilisateur ID : %', v_user_id;
    RAISE NOTICE '==================================================';
    
END $body$;

COMMIT;

-- Vérification finale
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.is_active,
    u.id_agent,
    r.nom as role_nom,
    a.id as agent_id,
    a.matricule,
    a.nom || ' ' || a.prenom as agent_nom_complet,
    a.id_ministere,
    m.code as ministere_code,
    m.nom as ministere_nom,
    CASE 
        WHEN a.id_ministere = 10 THEN '✅ Configuration correcte - Peut se connecter au ministère 10'
        ELSE '❌ Problème: Agent n''appartient pas au ministère 10 (appartient au ministère ' || COALESCE(a.id_ministere::text, 'NULL') || ')'
    END as statut_verification
FROM public.utilisateurs u
LEFT JOIN public.roles r ON u.id_role = r.id
LEFT JOIN public.agents a ON u.id_agent = a.id
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
WHERE u.username = 'DRHMINTEST01';
