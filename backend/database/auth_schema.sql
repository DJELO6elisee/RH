-- Schéma d'authentification et gestion des utilisateurs
-- ===================================================

-- Table des rôles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_role INTEGER REFERENCES roles(id) ON DELETE RESTRICT,
    id_agent INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sessions JWT
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    id_utilisateur INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tentatives de connexion
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    ip_address INET,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour l'authentification
CREATE INDEX IF NOT EXISTS idx_utilisateurs_username ON utilisateurs(username);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_id_role ON utilisateurs(id_role);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);

-- Insertion des rôles par défaut
INSERT INTO roles (nom, description, permissions) VALUES
('super_admin', 'Super administrateur avec accès complet à tous les ministères', '{"all": true}'),
('drh', 'Directeur des ressources humaines avec accès à son ministère et entités', '{"ministere": true, "entites": true, "agents": true, "reports": true}'),
('agent', 'Agent avec accès limité à ses propres données', '{"profile": true, "documents": true}'),
('admin_entite', 'Administrateur d''entité avec accès à son entité', '{"entite": true, "agents_entite": true, "reports_entite": true}')
ON CONFLICT (nom) DO NOTHING;
