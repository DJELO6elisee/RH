-- Schéma pour les tables d'institutions (séparées des ministères)
-- =============================================================

-- Table des agents pour les institutions
CREATE TABLE IF NOT EXISTS agents_institutions_main (
    id SERIAL PRIMARY KEY,
    id_civilite INTEGER REFERENCES civilites(id) ON DELETE SET NULL,
    id_situation_matrimoniale INTEGER REFERENCES situation_matrimonials(id) ON DELETE SET NULL,
    id_nationalite INTEGER REFERENCES nationalites(id) ON DELETE SET NULL,
    id_type_d_agent INTEGER REFERENCES type_d_agents(id) ON DELETE SET NULL,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    id_entite_principale INTEGER REFERENCES entites_institutions(id) ON DELETE SET NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    date_de_naissance DATE NOT NULL,
    lieu_de_naissance VARCHAR(200),
    age INTEGER,
    telephone1 VARCHAR(20),
    telephone2 VARCHAR(20),
    sexe CHAR(1) CHECK (sexe IN ('M', 'F')),
    nom_de_la_mere VARCHAR(100),
    nom_du_pere VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    date_mariage DATE,
    nom_conjointe VARCHAR(100),
    nombre_enfant INTEGER DEFAULT 0,
    ad_pro_rue VARCHAR(255),
    ad_pro_ville VARCHAR(100),
    ad_pro_batiment VARCHAR(100),
    ad_pri_rue VARCHAR(255),
    ad_pri_ville VARCHAR(100),
    ad_pri_batiment VARCHAR(100),
    statut_emploi VARCHAR(20) DEFAULT 'actif' CHECK (statut_emploi IN ('actif', 'inactif', 'retraite', 'demission', 'licencie')),
    date_embauche DATE,
    date_fin_contrat DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des enfants pour les institutions
CREATE TABLE IF NOT EXISTS enfants_institutions (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER REFERENCES agents_institutions_main(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    sexe CHAR(1) CHECK (sexe IN ('M', 'F')),
    date_de_naissance DATE NOT NULL,
    scolarise BOOLEAN DEFAULT FALSE,
    ayant_droit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de séminaires de formation pour les institutions
CREATE TABLE IF NOT EXISTS type_de_seminaire_de_formation_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    annee INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des services pour les institutions (créée avant type_de_documents_institutions)
CREATE TABLE IF NOT EXISTS services_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_institution, libelle)
);

-- Table des types de documents pour les institutions
CREATE TABLE IF NOT EXISTS type_de_documents_institutions (
    id SERIAL PRIMARY KEY,
    id_service INTEGER REFERENCES services_institutions(id) ON DELETE SET NULL,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tiers pour les institutions
CREATE TABLE IF NOT EXISTS tiers_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des dossiers pour les institutions
CREATE TABLE IF NOT EXISTS dossiers_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    id_entite INTEGER REFERENCES entites_institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_institution, id_entite, libelle)
);

-- Table des classeurs pour les institutions
CREATE TABLE IF NOT EXISTS classeurs_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    id_dossier INTEGER REFERENCES dossiers_institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_institution, id_dossier, libelle)
);

-- Index pour les tables d'institutions
CREATE INDEX IF NOT EXISTS idx_agents_institutions_main_id_institution ON agents_institutions_main(id_institution);
CREATE INDEX IF NOT EXISTS idx_agents_institutions_main_id_entite_principale ON agents_institutions_main(id_entite_principale);
CREATE INDEX IF NOT EXISTS idx_agents_institutions_main_statut_emploi ON agents_institutions_main(statut_emploi);
CREATE INDEX IF NOT EXISTS idx_agents_institutions_main_date_embauche ON agents_institutions_main(date_embauche);
CREATE INDEX IF NOT EXISTS idx_type_seminaire_institutions_id_institution ON type_de_seminaire_de_formation_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_type_documents_institutions_id_institution ON type_de_documents_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_tiers_institutions_id_institution ON tiers_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_services_institutions_id_institution ON services_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_dossiers_institutions_id_institution ON dossiers_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_dossiers_institutions_id_entite ON dossiers_institutions(id_entite);
CREATE INDEX IF NOT EXISTS idx_classeurs_institutions_id_institution ON classeurs_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_classeurs_institutions_id_dossier ON classeurs_institutions(id_dossier);
