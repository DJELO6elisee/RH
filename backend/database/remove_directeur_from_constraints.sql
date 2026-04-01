-- Suppression du rôle 'directeur' des contraintes de base de données
-- car il est remplacé par 'drh' dans la nouvelle hiérarchie

-- 1. Mettre à jour la contrainte workflow_demandes_niveau_validation_check
ALTER TABLE workflow_demandes DROP CONSTRAINT IF EXISTS workflow_demandes_niveau_validation_check;

ALTER TABLE workflow_demandes ADD CONSTRAINT workflow_demandes_niveau_validation_check 
CHECK (
    (niveau_validation::text = ANY (ARRAY[
        'chef_service'::character varying,
        'sous_directeur'::character varying,
        'drh'::character varying,
        'dir_cabinet'::character varying,
        'chef_cabinet'::character varying,
        'directeur_central'::character varying,
        'directeur_general'::character varying,
        'ministre'::character varying
    ]))
);

-- 2. Mettre à jour la contrainte demandes_niveau_evolution_demande_check
ALTER TABLE demandes DROP CONSTRAINT IF EXISTS demandes_niveau_evolution_demande_check;

ALTER TABLE demandes ADD CONSTRAINT demandes_niveau_evolution_demande_check CHECK (
    (niveau_evolution_demande::text = ANY (ARRAY[
        'soumis'::character varying,
        'valide_par_superieur'::character varying,
        'valide_par_chef_service'::character varying,
        'valide_par_sous_directeur'::character varying,
        'valide_par_drh'::character varying,
        'valide_par_dir_cabinet'::character varying,
        'valide_par_chef_cabinet'::character varying,
        'valide_par_directeur_central'::character varying,
        'valide_par_directeur_general'::character varying,
        'valide_par_ministre'::character varying,
        'retour_ministre'::character varying,
        'retour_directeur_general'::character varying,
        'retour_directeur_central'::character varying,
        'retour_chef_cabinet'::character varying,
        'retour_dir_cabinet'::character varying,
        'retour_drh'::character varying,
        'retour_sous_directeur'::character varying,
        'retour_chef_service'::character varying,
        'finalise'::character varying,
        'rejete'::character varying
    ]))
);

-- 3. Vérifier les contraintes mises à jour
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname IN ('workflow_demandes_niveau_validation_check', 'demandes_niveau_evolution_demande_check')
ORDER BY conname;
