-- Correction rapide de la contrainte situation_militaire
-- Exécuter ce script dans votre base de données PostgreSQL

-- Supprimer l'ancienne contrainte
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_situation_militaire_check;

-- Ajouter la nouvelle contrainte avec les bonnes valeurs
ALTER TABLE agents ADD CONSTRAINT agents_situation_militaire_check 
    CHECK (situation_militaire IS NULL OR 
           situation_militaire IN (
               'Exempté', 'Réformé', 'Bon pour le service', 'Dispensé', 'Non concerné',
               'EXEMPTÉ', 'RÉFORMÉ', 'BON POUR LE SERVICE', 'DISPENSÉ', 'NON CONCERNÉ'
           ));

-- Message de confirmation
SELECT 'Contrainte situation_militaire corrigée avec succès' as status;
