-- Table des associations (séparée des syndicats)
CREATE TABLE IF NOT EXISTS associations (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_associations_libele ON associations(libele);

-- Commentaires
COMMENT ON TABLE associations IS 'Table des associations (distincte des syndicats)';
COMMENT ON COLUMN associations.libele IS 'Nom de l''association';
COMMENT ON COLUMN associations.description IS 'Description de l''association';
