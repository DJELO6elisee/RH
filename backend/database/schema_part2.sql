-- Suite du script de création des tables

-- Table des spécialités
CREATE TABLE IF NOT EXISTS specialites (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des langues
CREATE TABLE IF NOT EXISTS langues (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des niveaux de langues
CREATE TABLE IF NOT EXISTS niveau_langues (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des motifs de départ
CREATE TABLE IF NOT EXISTS motif_de_departs (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de congés
CREATE TABLE IF NOT EXISTS type_de_conges (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des autres absences
CREATE TABLE IF NOT EXISTS autre_absences (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des distinctions
CREATE TABLE IF NOT EXISTS distinctions (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    nature VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types d'établissements
CREATE TABLE IF NOT EXISTS type_etablissements (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des unités administratives
CREATE TABLE IF NOT EXISTS unite_administratives (
    id SERIAL PRIMARY KEY,
    id_fonction INTEGER REFERENCES fonctions(id) ON DELETE SET NULL,
    capacite_acceuil INTEGER,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des diplômes
CREATE TABLE IF NOT EXISTS diplomes (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    type_de_diplome VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types d'agents
CREATE TABLE IF NOT EXISTS type_d_agents (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    automatique BOOLEAN DEFAULT FALSE,
    numero_initial INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de matériels
CREATE TABLE IF NOT EXISTS type_de_materiels (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des ministères (définie dans hierarchy_schema.sql)

-- Table des types de destinations
CREATE TABLE IF NOT EXISTS type_de_destinations (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des natures d'accidents
CREATE TABLE IF NOT EXISTS nature_d_accidents (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des sanctions
CREATE TABLE IF NOT EXISTS sanctions (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des syndicats
CREATE TABLE IF NOT EXISTS sindicats (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de courriers
CREATE TABLE IF NOT EXISTS type_de_couriers (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des natures d'actes
CREATE TABLE IF NOT EXISTS nature_actes (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des localités (définition simplifiée remplacée par geographic_tables_simplified.sql)
-- La table localites est maintenant définie dans geographic_tables_simplified.sql
-- avec tous les champs nécessaires (code, type_localite, id_departement, etc.)

-- Table des situations matrimoniales
CREATE TABLE IF NOT EXISTS situation_matrimonials (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des modes d'entrée
CREATE TABLE IF NOT EXISTS mode_d_entrees (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des positions
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des pathologies
CREATE TABLE IF NOT EXISTS pathologies (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des handicaps
CREATE TABLE IF NOT EXISTS handicaps (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des niveaux informatiques
CREATE TABLE IF NOT EXISTS niveau_informatiques (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des logiciels
CREATE TABLE IF NOT EXISTS logiciels (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de retraites
CREATE TABLE IF NOT EXISTS type_de_retraites (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
