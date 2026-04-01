-- Script pour créer la table echelons_agents
-- Cette table permet de suivre l'historique des échelons des agents

-- Créer la table echelons_agents
CREATE TABLE IF NOT EXISTS echelons_agents (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_echelon INTEGER NOT NULL REFERENCES echelons(id) ON DELETE RESTRICT,
    id_nomination INTEGER REFERENCES nominations(id) ON DELETE SET NULL,
    date_entree DATE NOT NULL,
    date_sortie DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte pour éviter les doublons (même agent, même échelon, même date d'entrée)
    CONSTRAINT unique_agent_echelon_date UNIQUE(id_agent, id_echelon, date_entree)
);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_echelons_agents_agent ON echelons_agents(id_agent);
CREATE INDEX IF NOT EXISTS idx_echelons_agents_echelon ON echelons_agents(id_echelon);
CREATE INDEX IF NOT EXISTS idx_echelons_agents_nomination ON echelons_agents(id_nomination);
CREATE INDEX IF NOT EXISTS idx_echelons_agents_date_entree ON echelons_agents(date_entree);
CREATE INDEX IF NOT EXISTS idx_echelons_agents_date_sortie ON echelons_agents(date_sortie);

-- Ajouter des commentaires pour documenter la table
COMMENT ON TABLE echelons_agents IS 'Table de suivi de l''historique des échelons des agents';
COMMENT ON COLUMN echelons_agents.id IS 'Identifiant unique de l''enregistrement';
COMMENT ON COLUMN echelons_agents.id_agent IS 'Référence vers l''agent concerné';
COMMENT ON COLUMN echelons_agents.id_echelon IS 'Référence vers l''échelon';
COMMENT ON COLUMN echelons_agents.id_nomination IS 'Référence vers la nomination associée (optionnelle)';
COMMENT ON COLUMN echelons_agents.date_entree IS 'Date d''entrée dans cet échelon';
COMMENT ON COLUMN echelons_agents.date_sortie IS 'Date de sortie de cet échelon (optionnelle)';
COMMENT ON COLUMN echelons_agents.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN echelons_agents.updated_at IS 'Date de dernière modification';

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_echelons_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_echelons_agents_updated_at ON echelons_agents;

-- Créer le trigger (syntaxe compatible avec PostgreSQL 9.5+)
CREATE TRIGGER trigger_update_echelons_agents_updated_at
    BEFORE UPDATE ON echelons_agents
    FOR EACH ROW
    EXECUTE PROCEDURE update_echelons_agents_updated_at();

-- Afficher un message de confirmation
SELECT 'Table echelons_agents créée avec succès' as message;

