-- Correction de la contrainte workflow_demandes_niveau_validation_check
-- pour inclure tous les nouveaux rôles de la hiérarchie

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE workflow_demandes DROP CONSTRAINT IF EXISTS workflow_demandes_niveau_validation_check;

-- 2. Créer la nouvelle contrainte avec tous les rôles
ALTER TABLE workflow_demandes ADD CONSTRAINT workflow_demandes_niveau_validation_check 
CHECK (
    (niveau_validation::text = ANY (ARRAY[
        'chef_service'::character varying,
        'sous_directeur'::character varying,
        'directeur'::character varying,
        'drh'::character varying,
        'dir_cabinet'::character varying,
        'chef_cabinet'::character varying,
        'directeur_central'::character varying,
        'directeur_general'::character varying,
        'ministre'::character varying
    ]))
);

-- 3. Vérifier que la contrainte a été créée
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'workflow_demandes_niveau_validation_check'
AND conrelid = 'workflow_demandes'::regclass;
