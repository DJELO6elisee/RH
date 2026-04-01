-- Script pour ajouter 'directeur' à la contrainte CHECK de workflow_demandes
-- Cette valeur est utilisée dans le code mais manquait dans la contrainte

-- Supprimer l'ancienne contrainte
ALTER TABLE workflow_demandes DROP CONSTRAINT IF EXISTS workflow_demandes_niveau_validation_check;

-- Créer la nouvelle contrainte avec 'directeur' ajouté
ALTER TABLE workflow_demandes ADD CONSTRAINT workflow_demandes_niveau_validation_check 
CHECK (
    (niveau_validation::text = ANY (ARRAY[
        'chef_service'::character varying,
        'sous_directeur'::character varying,
        'directeur'::character varying,  -- Ajouté pour corriger l'erreur
        'drh'::character varying,
        'dir_cabinet'::character varying,
        'chef_cabinet'::character varying,
        'directeur_central'::character varying,
        'directeur_general'::character varying,
        'ministre'::character varying
    ]))
);

-- Vérifier que la contrainte a été appliquée
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'workflow_demandes_niveau_validation_check'
AND conrelid = 'workflow_demandes'::regclass;

-- Afficher un message de confirmation
SELECT 'Contrainte workflow_demandes_niveau_validation_check mise à jour avec succès! La valeur directeur a été ajoutée.' as message;

