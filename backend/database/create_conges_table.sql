-- Table pour gérer les congés des agents
CREATE TABLE IF NOT EXISTS agent_conges (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    annee INTEGER NOT NULL,
    jours_pris INTEGER DEFAULT 0,
    jours_alloues INTEGER DEFAULT 30,
    jours_restants INTEGER DEFAULT 30,
    jours_reportes INTEGER DEFAULT 0, -- Jours reportés de l'année précédente
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, annee)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agent_conges_agent_annee ON agent_conges(id_agent, annee);
CREATE INDEX IF NOT EXISTS idx_agent_conges_annee ON agent_conges(annee);

-- Commentaires
COMMENT ON TABLE agent_conges IS 'Table pour gérer les congés annuels des agents';
COMMENT ON COLUMN agent_conges.id_agent IS 'Identifiant de l''agent';
COMMENT ON COLUMN agent_conges.annee IS 'Année de référence pour les congés';
COMMENT ON COLUMN agent_conges.jours_pris IS 'Nombre de jours de congés pris dans l''année';
COMMENT ON COLUMN agent_conges.jours_alloues IS 'Nombre de jours de congés alloués pour l''année (30 par défaut + jours reportés)';
COMMENT ON COLUMN agent_conges.jours_restants IS 'Nombre de jours de congés restants';
COMMENT ON COLUMN agent_conges.jours_reportes IS 'Nombre de jours reportés de l''année précédente';

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_agent_conges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
-- Note: Utilisation de EXECUTE PROCEDURE pour compatibilité avec toutes les versions de PostgreSQL
DROP TRIGGER IF EXISTS trigger_update_agent_conges_updated_at ON agent_conges;

CREATE TRIGGER trigger_update_agent_conges_updated_at
    BEFORE UPDATE ON agent_conges
    FOR EACH ROW
    EXECUTE PROCEDURE update_agent_conges_updated_at();

-- Fonction pour recalculer automatiquement jours_restants
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

-- Trigger pour recalculer automatiquement jours_restants avant INSERT ou UPDATE
-- IMPORTANT: Se déclenche sur TOUS les INSERT et UPDATE pour garantir que jours_restants est TOUJOURS recalculé
-- Même si jours_restants est modifié directement dans l'UPDATE, le trigger le recalcule automatiquement
-- Le calcul est donc 100% dynamique et garanti par la base de données
DROP TRIGGER IF EXISTS trigger_recalculer_jours_restants ON agent_conges;

CREATE TRIGGER trigger_recalculer_jours_restants
    BEFORE INSERT OR UPDATE ON agent_conges
    FOR EACH ROW
    EXECUTE PROCEDURE recalculer_jours_restants();

