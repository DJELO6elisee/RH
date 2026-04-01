-- Migration pour mettre à jour les contraintes de la table demandes
-- Date: 2025-01-06

-- Supprimer l'ancienne contrainte
ALTER TABLE demandes DROP CONSTRAINT IF EXISTS demandes_niveau_evolution_demande_check;

-- Ajouter la nouvelle contrainte avec toutes les valeurs possibles
ALTER TABLE demandes ADD CONSTRAINT demandes_niveau_evolution_demande_check 
CHECK (niveau_evolution_demande IN (
    'soumis',
    'en_cours_traitement',
    'valide_par_superieur',
    'valide_par_drh',
    'valide_par_direction',
    'valide_par_ministre',
    'retour_ministre',
    'retour_drh',
    'retour_chef_service',
    'finalise',
    'rejete'
));

-- Commentaire pour documenter les valeurs
COMMENT ON CONSTRAINT demandes_niveau_evolution_demande_check ON demandes IS 
'Contraintes pour niveau_evolution_demande : soumis, en_cours_traitement, valide_par_superieur, valide_par_drh, valide_par_direction, valide_par_ministre, retour_ministre, retour_drh, retour_chef_service, finalise, rejete';

-- Vérifier que la contrainte a été appliquée
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'demandes'::regclass 
AND conname = 'demandes_niveau_evolution_demande_check';
