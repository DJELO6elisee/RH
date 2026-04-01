-- Script pour corriger la contrainte de vérification situation_militaire
-- Exécuter ce script dans votre base de données PostgreSQL

-- =====================================================
-- CORRECTION DE LA CONTRAINTE SITUATION_MILITAIRE
-- =====================================================

-- 1. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_situation_militaire_check;

-- 2. Ajouter la nouvelle contrainte avec les bonnes valeurs
ALTER TABLE agents ADD CONSTRAINT agents_situation_militaire_check 
    CHECK (situation_militaire IS NULL OR 
           situation_militaire IN (
               'Exempté', 'Réformé', 'Bon pour le service', 'Dispensé', 'Non concerné',
               'EXEMPTÉ', 'RÉFORMÉ', 'BON POUR LE SERVICE', 'DISPENSÉ', 'NON CONCERNÉ'
           ));

-- 3. Afficher un message de confirmation
SELECT 'Contrainte situation_militaire corrigée avec succès' as status;

-- 4. Vérifier les valeurs actuelles dans la table
SELECT DISTINCT situation_militaire, COUNT(*) as count
FROM agents 
WHERE situation_militaire IS NOT NULL
GROUP BY situation_militaire
ORDER BY situation_militaire;
