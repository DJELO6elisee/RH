-- Schéma pour l'authentification par empreinte digitale (WebAuthn)
-- ================================================================

-- Table pour stocker les credentials WebAuthn
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id SERIAL PRIMARY KEY,
    id_utilisateur INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    device_name VARCHAR(255),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user ON webauthn_credentials(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_active ON webauthn_credentials(is_active);

-- Table pour stocker les challenges WebAuthn (temporaires)
CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id SERIAL PRIMARY KEY,
    challenge TEXT NOT NULL UNIQUE,
    id_utilisateur INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'registration' ou 'authentication'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les challenges
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON webauthn_challenges(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- Nettoyer automatiquement les challenges expirés (à exécuter périodiquement)
-- DELETE FROM webauthn_challenges WHERE expires_at < CURRENT_TIMESTAMP;

