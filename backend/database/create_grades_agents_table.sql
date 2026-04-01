-- Script pour créer la table grades_agents
-- Cette table permet de suivre l'historique des grades des agents

-- Créer la table grades_agents
CREATE TABLE IF NOT EXISTS grades_agents (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_grade INTEGER NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    id_nomination INTEGER REFERENCES nominations(id) ON DELETE SET NULL,
    date_entree DATE NOT NULL,
    date_sortie DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte pour éviter les doublons (même agent, même grade, même date d'entrée)
    CONSTRAINT unique_agent_grade_date UNIQUE(id_agent, id_grade, date_entree)
);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_grades_agents_agent ON grades_agents(id_agent);
CREATE INDEX IF NOT EXISTS idx_grades_agents_grade ON grades_agents(id_grade);
CREATE INDEX IF NOT EXISTS idx_grades_agents_nomination ON grades_agents(id_nomination);
CREATE INDEX IF NOT EXISTS idx_grades_agents_date_entree ON grades_agents(date_entree);
CREATE INDEX IF NOT EXISTS idx_grades_agents_date_sortie ON grades_agents(date_sortie);

-- Ajouter des commentaires pour documenter la table
COMMENT ON TABLE grades_agents IS 'Table de suivi de l''historique des grades des agents';
COMMENT ON COLUMN grades_agents.id IS 'Identifiant unique de l''enregistrement';
COMMENT ON COLUMN grades_agents.id_agent IS 'Référence vers l''agent concerné';
COMMENT ON COLUMN grades_agents.id_grade IS 'Référence vers le grade';
COMMENT ON COLUMN grades_agents.id_nomination IS 'Référence vers la nomination associée (optionnelle)';
COMMENT ON COLUMN grades_agents.date_entree IS 'Date d''entrée dans ce grade';
COMMENT ON COLUMN grades_agents.date_sortie IS 'Date de sortie de ce grade (optionnelle)';
COMMENT ON COLUMN grades_agents.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN grades_agents.updated_at IS 'Date de dernière modification';

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_grades_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_grades_agents_updated_at ON grades_agents;

-- Créer le trigger (syntaxe compatible avec PostgreSQL 9.5+)
CREATE TRIGGER trigger_update_grades_agents_updated_at
    BEFORE UPDATE ON grades_agents
    FOR EACH ROW
    EXECUTE PROCEDURE update_grades_agents_updated_at();

-- Afficher un message de confirmation
SELECT 'Table grades_agents créée avec succès' as message;

