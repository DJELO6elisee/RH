--
-- Migration: workflow directeur_service_exterieur et niveaux d'évolution
-- À exécuter pour activer le nouveau workflow des demandes (ministre, chef_cabinet, DG, DSE).
--

-- 1. Agrandir la colonne niveau_evolution_demande puis ajouter 'valide_par_directeur_service_exterieur' à la contrainte
--    La colonne était initialement en VARCHAR(30), ce qui est trop court pour 'valide_par_directeur_service_exterieur'
ALTER TABLE public.demandes
    ALTER COLUMN niveau_evolution_demande TYPE VARCHAR(255);

ALTER TABLE public.demandes DROP CONSTRAINT IF EXISTS demandes_niveau_evolution_demande_check;
ALTER TABLE public.demandes ADD CONSTRAINT demandes_niveau_evolution_demande_check CHECK (
    (niveau_evolution_demande)::text = ANY (ARRAY[
        'soumis'::text, 'valide_par_superieur'::text, 'valide_par_chef_service'::text,
        'valide_par_sous_directeur'::text, 'valide_par_directeur'::text, 'valide_par_drh'::text,
        'valide_par_dir_cabinet'::text, 'valide_par_chef_cabinet'::text,
        'valide_par_directeur_central'::text, 'valide_par_directeur_general'::text,
        'valide_par_ministre'::text, 'valide_par_directeur_service_exterieur'::text,
        'retour_ministre'::text, 'retour_directeur_general'::text, 'retour_directeur_central'::text,
        'retour_chef_cabinet'::text, 'retour_dir_cabinet'::text, 'retour_drh'::text,
        'retour_directeur'::text, 'retour_sous_directeur'::text, 'retour_chef_service'::text,
        'finalise'::text, 'rejete'::text,
        'rejete_par_chef_service'::text, 'rejete_par_sous_directeur'::text, 'rejete_par_directeur'::text,
        'rejete_par_drh'::text, 'rejete_par_dir_cabinet'::text, 'rejete_par_chef_cabinet'::text,
        'rejete_par_directeur_central'::text, 'rejete_par_directeur_general'::text,
        'rejete_par_ministre'::text, 'rejete_par_directeur_service_exterieur'::text
    ])
);

-- 2. Ajouter 'directeur_service_exterieur' à la contrainte niveau_actuel
--    NOTE: la colonne niveau_actuel doit être assez longue pour contenir la valeur.
ALTER TABLE public.demandes
    ALTER COLUMN niveau_actuel TYPE VARCHAR(50);

ALTER TABLE public.demandes DROP CONSTRAINT IF EXISTS demandes_niveau_actuel_check;
ALTER TABLE public.demandes ADD CONSTRAINT demandes_niveau_actuel_check CHECK (
    (niveau_actuel)::text = ANY (ARRAY[
        'soumis'::text, 'chef_service'::text, 'sous_directeur'::text, 'directeur'::text,
        'drh'::text, 'dir_cabinet'::text, 'chef_cabinet'::text, 'directeur_central'::text,
        'directeur_general'::text, 'directeur_service_exterieur'::text, 'ministre'::text,
        'finalise'::text, 'rejete'::text
    ])
);

-- 3. Colonnes pour la validation par directeur_service_exterieur (si elles n'existent pas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'demandes' AND column_name = 'statut_directeur_service_exterieur') THEN
        ALTER TABLE public.demandes ADD COLUMN statut_directeur_service_exterieur VARCHAR(50) DEFAULT 'en_attente';
        RAISE NOTICE 'Colonne statut_directeur_service_exterieur ajoutée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'demandes' AND column_name = 'date_validation_directeur_service_exterieur') THEN
        ALTER TABLE public.demandes ADD COLUMN date_validation_directeur_service_exterieur TIMESTAMP WITHOUT TIME ZONE;
        RAISE NOTICE 'Colonne date_validation_directeur_service_exterieur ajoutée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'demandes' AND column_name = 'commentaire_directeur_service_exterieur') THEN
        ALTER TABLE public.demandes ADD COLUMN commentaire_directeur_service_exterieur TEXT;
        RAISE NOTICE 'Colonne commentaire_directeur_service_exterieur ajoutée';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'demandes' AND column_name = 'id_validateur_directeur_service_exterieur') THEN
        ALTER TABLE public.demandes ADD COLUMN id_validateur_directeur_service_exterieur INTEGER REFERENCES public.agents(id) ON DELETE SET NULL;
        RAISE NOTICE 'Colonne id_validateur_directeur_service_exterieur ajoutée';
    END IF;
END $$;

-- Contrainte CHECK pour statut_directeur_service_exterieur (optionnel, comme les autres statut_*)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demandes_statut_directeur_service_exterieur_check') THEN
        ALTER TABLE public.demandes ADD CONSTRAINT demandes_statut_directeur_service_exterieur_check
            CHECK ((statut_directeur_service_exterieur)::text = ANY (ARRAY['en_attente'::text, 'approuve'::text, 'rejete'::text]));
        RAISE NOTICE 'Contrainte statut_directeur_service_exterieur ajoutée';
    END IF;
END $$;
