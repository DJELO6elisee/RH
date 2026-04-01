-- Script pour créer la table categories_agents
-- Cette table permet de suivre l'historique des catégories des agents
-- Les catégories sont associées aux grades, donc cette table trace l'évolution des catégories

-- Créer la table categories_agents
CREATE TABLE IF NOT EXISTS categories_agents (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_categorie INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    id_nomination INTEGER REFERENCES nominations(id) ON DELETE SET NULL,
    date_entree DATE NOT NULL,
    date_sortie DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte pour éviter les doublons (même agent, même catégorie, même date d'entrée)
    CONSTRAINT unique_agent_categorie_date UNIQUE(id_agent, id_categorie, date_entree)
);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_categories_agents_agent ON categories_agents(id_agent);
CREATE INDEX IF NOT EXISTS idx_categories_agents_categorie ON categories_agents(id_categorie);
CREATE INDEX IF NOT EXISTS idx_categories_agents_nomination ON categories_agents(id_nomination);
CREATE INDEX IF NOT EXISTS idx_categories_agents_date_entree ON categories_agents(date_entree);
CREATE INDEX IF NOT EXISTS idx_categories_agents_date_sortie ON categories_agents(date_sortie);

-- Ajouter des commentaires pour documenter la table
COMMENT ON TABLE categories_agents IS 'Table de suivi de l''historique des catégories des agents';
COMMENT ON COLUMN categories_agents.id IS 'Identifiant unique de l''enregistrement';
COMMENT ON COLUMN categories_agents.id_agent IS 'Référence vers l''agent concerné';
COMMENT ON COLUMN categories_agents.id_categorie IS 'Référence vers la catégorie';
COMMENT ON COLUMN categories_agents.id_nomination IS 'Référence vers la nomination associée (optionnelle)';
COMMENT ON COLUMN categories_agents.date_entree IS 'Date d''entrée dans cette catégorie';
COMMENT ON COLUMN categories_agents.date_sortie IS 'Date de sortie de cette catégorie (optionnelle)';
COMMENT ON COLUMN categories_agents.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN categories_agents.updated_at IS 'Date de dernière modification';

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_categories_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_update_categories_agents_updated_at ON categories_agents;

-- Créer le trigger (syntaxe compatible avec PostgreSQL 9.5+)
CREATE TRIGGER trigger_update_categories_agents_updated_at
    BEFORE UPDATE ON categories_agents
    FOR EACH ROW
    EXECUTE PROCEDURE update_categories_agents_updated_at();

-- Afficher un message de confirmation
SELECT 'Table categories_agents créée avec succès' as message;

