-- Table de liaison entre agents et associations (distincte des syndicats)
CREATE TABLE IF NOT EXISTS agents_associations (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    id_association INTEGER NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
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
    UNIQUE(id_agent, id_association, date_adhesion)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_agents_associations_agent ON agents_associations(id_agent);
CREATE INDEX IF NOT EXISTS idx_agents_associations_association ON agents_associations(id_association);
CREATE INDEX IF NOT EXISTS idx_agents_associations_statut ON agents_associations(statut);

-- Commentaires
COMMENT ON TABLE agents_associations IS 'Table de liaison entre agents et associations';
COMMENT ON COLUMN agents_associations.id_agent IS 'Référence à l''agent';
COMMENT ON COLUMN agents_associations.id_association IS 'Référence à l''association';
COMMENT ON COLUMN agents_associations.date_adhesion IS 'Date d''adhésion à l''association';
COMMENT ON COLUMN agents_associations.date_fin IS 'Date de fin d''adhésion (si applicable)';
COMMENT ON COLUMN agents_associations.role IS 'Rôle de l''agent dans l''association';
COMMENT ON COLUMN agents_associations.statut IS 'Statut de l''adhésion: actif, inactif, resigne';
COMMENT ON COLUMN agents_associations.fichier_attestation_url IS 'URL ou chemin du fichier d''attestation d''adhésion';
COMMENT ON COLUMN agents_associations.fichier_attestation_nom IS 'Nom original du fichier d''attestation';
COMMENT ON COLUMN agents_associations.fichier_attestation_taille IS 'Taille du fichier d''attestation en octets';
COMMENT ON COLUMN agents_associations.fichier_attestation_type IS 'Type MIME du fichier d''attestation';
