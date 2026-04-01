-- Script pour garantir que le trigger de recalcul automatique de jours_restants existe et est actif
-- Ce script peut être exécuté à tout moment pour s'assurer que le calcul dynamique fonctionne

-- Étape 1: Vérifier si la fonction existe, sinon la créer
CREATE OR REPLACE FUNCTION recalculer_jours_restants()
RETURNS TRIGGER AS $$
BEGIN
    -- TOUJOURS recalculer jours_restants = jours_alloues - jours_pris
    -- S'assurer que jours_restants ne peut pas être négatif
    -- Ce calcul est DYNAMIQUE et se fait automatiquement à chaque INSERT/UPDATE
    -- Même si jours_restants est passé dans l'UPDATE, cette valeur sera IGNORÉE et recalculée
    NEW.jours_restants = GREATEST(0, COALESCE(NEW.jours_alloues, 30) - COALESCE(NEW.jours_pris, 0));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Étape 2: Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_recalculer_jours_restants ON agent_conges;

-- Étape 3: Créer le trigger pour garantir le calcul dynamique
CREATE TRIGGER trigger_recalculer_jours_restants
    BEFORE INSERT OR UPDATE ON agent_conges
    FOR EACH ROW
    EXECUTE PROCEDURE recalculer_jours_restants();

-- Étape 4: Vérifier que le trigger est bien créé
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'agent_conges'
    AND trigger_name = 'trigger_recalculer_jours_restants';

-- Étape 5: Corriger toutes les données existantes pour garantir la cohérence
UPDATE agent_conges
SET jours_restants = GREATEST(0, jours_alloues - jours_pris),
    updated_at = CURRENT_TIMESTAMP
WHERE jours_restants != GREATEST(0, jours_alloues - jours_pris);

-- Message de confirmation
SELECT '✅ Le trigger de recalcul automatique de jours_restants est maintenant actif et garantit un calcul dynamique !' as status;

