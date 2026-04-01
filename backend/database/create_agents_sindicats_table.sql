-- Table de liaison entre agents et syndicats (distincte des associations)
CREATE TABLE IF NOT EXISTS agents_sindicats (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_sindicat INTEGER NOT NULL REFERENCES sindicats(id) ON DELETE CASCADE,
    date_adhesion DATE NOT NULL,
    date_fin DATE,
    role VARCHAR(200),
    statut VARCHAR(50) DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'resigne')),
    -- Fichier d'attestation d'adhésion
    fichier_attestation_url VARCHAR(500),
    fichier_attestation_nom VARCHAR(255),
    fichier_attestation_taille INTEGER,
    fichier_attestation_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, id_sindicat, date_adhesion)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agents_sindicats_agent ON agents_sindicats(id_agent);
CREATE INDEX IF NOT EXISTS idx_agents_sindicats_sindicat ON agents_sindicats(id_sindicat);
CREATE INDEX IF NOT EXISTS idx_agents_sindicats_statut ON agents_sindicats(statut);

-- Commentaires
COMMENT ON TABLE agents_sindicats IS 'Table de liaison entre agents et syndicats';
COMMENT ON COLUMN agents_sindicats.id_agent IS 'Référence à l''agent';
COMMENT ON COLUMN agents_sindicats.id_sindicat IS 'Référence au syndicat';
COMMENT ON COLUMN agents_sindicats.date_adhesion IS 'Date d''adhésion au syndicat';
COMMENT ON COLUMN agents_sindicats.date_fin IS 'Date de fin d''adhésion (si applicable)';
COMMENT ON COLUMN agents_sindicats.role IS 'Rôle de l''agent dans le syndicat';
COMMENT ON COLUMN agents_sindicats.statut IS 'Statut de l''adhésion: actif, inactif, resigne';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_url IS 'URL ou chemin du fichier d''attestation d''adhésion';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_nom IS 'Nom original du fichier d''attestation';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_taille IS 'Taille du fichier d''attestation en octets';
COMMENT ON COLUMN agents_sindicats.fichier_attestation_type IS 'Type MIME du fichier d''attestation';
