-- Tables pour les langues et logiciels des agents

-- Table pour les langues des agents
CREATE TABLE IF NOT EXISTS agent_langues (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_langue INTEGER NOT NULL REFERENCES langues(id) ON DELETE CASCADE,
    id_niveau_langue INTEGER REFERENCES niveau_langues(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, id_langue)
);

-- Table pour les logiciels des agents
CREATE TABLE IF NOT EXISTS agent_logiciels (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_logiciel INTEGER NOT NULL REFERENCES logiciels(id) ON DELETE CASCADE,
    id_niveau_informatique INTEGER REFERENCES niveau_informatiques(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, id_logiciel)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agent_langues_agent ON agent_langues(id_agent);
CREATE INDEX IF NOT EXISTS idx_agent_langues_langue ON agent_langues(id_langue);
CREATE INDEX IF NOT EXISTS idx_agent_logiciels_agent ON agent_logiciels(id_agent);
CREATE INDEX IF NOT EXISTS idx_agent_logiciels_logiciel ON agent_logiciels(id_logiciel);

-- Commentaires pour la documentation
COMMENT ON TABLE agent_langues IS 'Table de liaison entre agents et langues avec niveau et certification';
COMMENT ON TABLE agent_logiciels IS 'Table de liaison entre agents et logiciels avec niveau et certification';

COMMENT ON COLUMN agent_langues.id_agent IS 'Référence vers l\'agent';
COMMENT ON COLUMN agent_langues.id_langue IS 'Référence vers la langue';
COMMENT ON COLUMN agent_langues.id_niveau_langue IS 'Niveau de maîtrise de la langue';


COMMENT ON COLUMN agent_logiciels.id_agent IS 'Référence vers l\'agent';
COMMENT ON COLUMN agent_logiciels.id_logiciel IS 'Référence vers le logiciel';
COMMENT ON COLUMN agent_logiciels.id_niveau_informatique IS 'Niveau de maîtrise du logiciel';

