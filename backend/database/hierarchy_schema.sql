-- Schéma de hiérarchie multi-ministères et entités
-- ================================================

-- Table des ministères
CREATE TABLE IF NOT EXISTS ministeres (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    nom VARCHAR(200) NOT NULL,
    sigle VARCHAR(20),
    description TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    nom VARCHAR(200) NOT NULL,
    sigle VARCHAR(20),
    description TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entites_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    id_entite_parent INTEGER REFERENCES entites_institutions(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    nom VARCHAR(200) NOT NULL,
    sigle VARCHAR(20),
    description TEXT,
    type_entite VARCHAR(50) CHECK (type_entite IN ('direction', 'departement', 'service', 'bureau', 'division')),
    niveau_hierarchique INTEGER DEFAULT 1,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    responsable_id INTEGER, -- Référence temporaire, sera ajoutée après création de agents
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_institution, code)
);

-- Table des entités administratives (départements, directions, etc.)
CREATE TABLE IF NOT EXISTS entites_administratives (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    id_entite_parent INTEGER REFERENCES entites_administratives(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    nom VARCHAR(200) NOT NULL,
    sigle VARCHAR(20),
    description TEXT,
    type_entite VARCHAR(50) CHECK (type_entite IN ('direction', 'departement', 'service', 'bureau', 'division')),
    niveau_hierarchique INTEGER DEFAULT 1,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    responsable_id INTEGER, -- Référence temporaire, sera ajoutée après création de agents
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_ministere, code)
);

-- Table de liaison agents-entités (un agent peut appartenir à une ou plusieurs entités)
CREATE TABLE IF NOT EXISTS agents_entites (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER, -- Référence temporaire, sera ajoutée après création de agents
    id_entite INTEGER REFERENCES entites_administratives(id) ON DELETE CASCADE,
    poste VARCHAR(200),
    date_debut DATE NOT NULL,
    date_fin DATE,
    is_principal BOOLEAN DEFAULT FALSE, -- Poste principal de l'agent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, id_entite, date_debut)
);

CREATE TABLE IF NOT EXISTS agents_entites_institutions (
    id SERIAL PRIMARY KEY,
    id_agent_institution INTEGER, -- Référence temporaire, sera ajoutée après création de agents
    id_entite INTEGER REFERENCES entites_institutions(id) ON DELETE CASCADE,
    poste VARCHAR(200),
    date_debut DATE NOT NULL,
    date_fin DATE,
    is_principal BOOLEAN DEFAULT FALSE, -- Poste principal de l'agent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent_institution, id_entite, date_debut)
);
-- Table des affectations temporaires
CREATE TABLE IF NOT EXISTS affectations_temporaires (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER, -- Référence temporaire, sera ajoutée après création de agents
    id_entite_source INTEGER REFERENCES entites_administratives(id) ON DELETE SET NULL,
    id_entite_destination INTEGER REFERENCES entites_administratives(id) ON DELETE SET NULL,
    motif TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    statut VARCHAR(20) DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
    approbation_drh BOOLEAN DEFAULT FALSE,
    approbation_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affectations_temporaires_institutions (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER, -- Référence temporaire, sera ajoutée après création de agents
    id_entite_source INTEGER REFERENCES entites_institutions(id) ON DELETE SET NULL,
    id_entite_destination INTEGER REFERENCES entites_institutions(id) ON DELETE SET NULL,
    motif TEXT NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    statut VARCHAR(20) DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
    approbation_drh BOOLEAN DEFAULT FALSE,
    approbation_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Table des permissions par entité
CREATE TABLE IF NOT EXISTS permissions_entites (
    id SERIAL PRIMARY KEY,
    id_role INTEGER, -- Référence temporaire, sera ajoutée après création de roles
    id_entite INTEGER REFERENCES entites_administratives(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_role, id_entite)
);

CREATE TABLE IF NOT EXISTS permissions_entites_institutions (
    id SERIAL PRIMARY KEY,
    id_role INTEGER, -- Référence temporaire, sera ajoutée après création de roles
    id_entite INTEGER REFERENCES entites_institutions(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_role, id_entite)
);

-- Index pour la hiérarchie
CREATE INDEX IF NOT EXISTS idx_entites_id_ministere ON entites_administratives(id_ministere);
CREATE INDEX IF NOT EXISTS idx_entites_id_entite_parent ON entites_administratives(id_entite_parent);
CREATE INDEX IF NOT EXISTS idx_entites_type_entite ON entites_administratives(type_entite);
CREATE INDEX IF NOT EXISTS idx_agents_entites_id_agent ON agents_entites(id_agent);
CREATE INDEX IF NOT EXISTS idx_agents_entites_id_entite ON agents_entites(id_entite);
CREATE INDEX IF NOT EXISTS idx_agents_entites_is_principal ON agents_entites(is_principal);
CREATE INDEX IF NOT EXISTS idx_affectations_id_agent ON affectations_temporaires(id_agent);
CREATE INDEX IF NOT EXISTS idx_affectations_statut ON affectations_temporaires(statut);
CREATE INDEX IF NOT EXISTS idx_permissions_entites_id_role ON permissions_entites(id_role);
CREATE INDEX IF NOT EXISTS idx_permissions_entites_id_entite ON permissions_entites(id_entite);

-- Contraintes de validation
ALTER TABLE entites_administratives 
ADD CONSTRAINT chk_niveau_hierarchique 
CHECK (niveau_hierarchique >= 1 AND niveau_hierarchique <= 10);

CREATE INDEX IF NOT EXISTS idx_entites_id_institution ON entites_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_entites_institutions_id_entite_parent ON entites_institutions(id_entite_parent);
CREATE INDEX IF NOT EXISTS idx_entites_institutions_type_entite ON entites_institutions(type_entite);
CREATE INDEX IF NOT EXISTS idx_agents_entites_institutions_id_agent ON agents_entites_institutions(id_agent_institution);
CREATE INDEX IF NOT EXISTS idx_agents_entites_institutions_id_entite ON agents_entites_institutions(id_entite);
CREATE INDEX IF NOT EXISTS idx_agents_entites_institutions_is_principal ON agents_entites_institutions(is_principal);
CREATE INDEX IF NOT EXISTS idx_affectations_institutions_id_agent ON affectations_temporaires_institutions(id_agent);
CREATE INDEX IF NOT EXISTS idx_affectations_institutions_statut ON affectations_temporaires_institutions(statut);
CREATE INDEX IF NOT EXISTS idx_permissions_entites_institutions_id_role ON permissions_entites_institutions(id_role);
CREATE INDEX IF NOT EXISTS idx_permissions_entites_institutions_id_entite ON permissions_entites_institutions(id_entite);

-- Contraintes de validation
ALTER TABLE entites_institutions 
ADD CONSTRAINT chk_niveau_hierarchique 
CHECK (niveau_hierarchique >= 1 AND niveau_hierarchique <= 10);
    