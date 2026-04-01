-- Table pour stocker les codes de connexion des agents
CREATE TABLE IF NOT EXISTS agent_login_codes (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    code VARCHAR(8) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte de clé étrangère
    CONSTRAINT fk_agent_login_codes_agent_id 
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    
    -- Index pour les performances
    CONSTRAINT unique_active_code_per_agent 
        UNIQUE (agent_id, code)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agent_login_codes_agent_id ON agent_login_codes(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_login_codes_code ON agent_login_codes(code);
CREATE INDEX IF NOT EXISTS idx_agent_login_codes_expires_at ON agent_login_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_login_codes_used_at ON agent_login_codes(used_at);

-- Commentaires sur la table
COMMENT ON TABLE agent_login_codes IS 'Codes de connexion temporaires pour les agents';
COMMENT ON COLUMN agent_login_codes.agent_id IS 'ID de l\'agent';
COMMENT ON COLUMN agent_login_codes.code IS 'Code de connexion (8 caractères hexadécimaux)';
COMMENT ON COLUMN agent_login_codes.expires_at IS 'Date et heure d\'expiration du code';
COMMENT ON COLUMN agent_login_codes.used_at IS 'Date et heure d\'utilisation du code (NULL si non utilisé)';
COMMENT ON COLUMN agent_login_codes.created_at IS 'Date et heure de création du code';
