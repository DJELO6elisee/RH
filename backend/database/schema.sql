-- Script de création des tables pour l'application de gestion des ressources humaines

-- Table des civilités
CREATE TABLE IF NOT EXISTS civilites (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des nationalités
CREATE TABLE IF NOT EXISTS nationalites (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des fonctions
CREATE TABLE IF NOT EXISTS fonctions (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    nbr_agent INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des pays
CREATE TABLE IF NOT EXISTS pays (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des grades
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    id_categorie INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    libele VARCHAR(100) NOT NULL,
    numero_ordre INTEGER NOT NULL,
    age_de_retraite INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_categorie, numero_ordre)
);

-- Table des emplois
CREATE TABLE IF NOT EXISTS emplois (
    id SERIAL PRIMARY KEY,
    libele VARCHAR(200) NOT NULL UNIQUE,
    libele_court VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des échelons
CREATE TABLE IF NOT EXISTS echelons (
    id SERIAL PRIMARY KEY,
    indice VARCHAR(20) NOT NULL UNIQUE,
    salaire_net DECIMAL(10,2),
    libele VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
