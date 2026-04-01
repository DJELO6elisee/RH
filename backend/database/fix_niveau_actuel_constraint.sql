-- Script pour corriger la contrainte niveau_actuel_check
-- Ajouter les valeurs manquantes pour niveau_actuel

-- Supprimer l'ancienne contrainte
ALTER TABLE demandes DROP CONSTRAINT IF EXISTS demandes_niveau_actuel_check;

-- Créer la nouvelle contrainte avec toutes les valeurs possibles
ALTER TABLE demandes ADD CONSTRAINT demandes_niveau_actuel_check
    CHECK (niveau_actuel IN (
        'soumis',
        'chef_service',
        'sous_directeur',
        'directeur',
        'drh',
        'dir_cabinet',
        'chef_cabinet',
        'directeur_central',
        'directeur_general',
        'ministre',
        'finalise',
        'rejete'
    ));

-- Afficher un message de confirmation
SELECT 'Contrainte niveau_actuel mise à jour avec succès!' as message;
