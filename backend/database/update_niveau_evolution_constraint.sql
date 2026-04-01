-- Script pour mettre à jour la contrainte sur niveau_evolution_demande
-- Ajouter les nouveaux niveaux de validation

-- Supprimer l'ancienne contrainte
ALTER TABLE demandes DROP CONSTRAINT IF EXISTS demandes_niveau_evolution_demande_check;

-- Créer la nouvelle contrainte avec tous les niveaux possibles
ALTER TABLE demandes ADD CONSTRAINT demandes_niveau_evolution_demande_check
    CHECK (niveau_evolution_demande IN (
        'soumis',
        'valide_par_superieur',
        'valide_par_chef_service',
        'valide_par_sous_directeur',
        'valide_par_directeur',
        'valide_par_drh',
        'valide_par_dir_cabinet',
        'valide_par_chef_cabinet',
        'valide_par_directeur_central',
        'valide_par_directeur_general',
        'valide_par_ministre',
        'retour_ministre',
        'retour_directeur_general',
        'retour_directeur_central',
        'retour_chef_cabinet',
        'retour_dir_cabinet',
        'retour_drh',
        'retour_directeur',
        'retour_sous_directeur',
        'retour_chef_service',
        'finalise',
        'rejete',
        'rejete_par_chef_service',
        'rejete_par_sous_directeur',
        'rejete_par_directeur',
        'rejete_par_drh',
        'rejete_par_dir_cabinet',
        'rejete_par_chef_cabinet',
        'rejete_par_directeur_central',
        'rejete_par_directeur_general',
        'rejete_par_ministre'
    ));

-- Afficher un message de confirmation
SELECT 'Contrainte niveau_evolution_demande mise à jour avec succès!' as message;
