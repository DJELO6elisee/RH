-- Troisième partie : Tables principales et index

-- Table des agents (table principale)
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    id_civilite INTEGER REFERENCES civilites(id) ON DELETE SET NULL,
    id_situation_matrimoniale INTEGER REFERENCES situation_matrimonials(id) ON DELETE SET NULL,
    id_nationalite INTEGER REFERENCES nationalites(id) ON DELETE SET NULL,
    id_type_d_agent INTEGER REFERENCES type_d_agents(id) ON DELETE SET NULL,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE SET NULL,
    id_entite_principale INTEGER REFERENCES entites_administratives(id) ON DELETE SET NULL,
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

-- Table des enfants
CREATE TABLE IF NOT EXISTS enfants (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER REFERENCES agents(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    sexe CHAR(1) CHECK (sexe IN ('M', 'F')),
    date_de_naissance DATE NOT NULL,
    scolarise BOOLEAN DEFAULT FALSE,
    ayant_droit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des types de séminaires de formation
CREATE TABLE IF NOT EXISTS type_de_seminaire_de_formation (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    annee INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des services (créée avant type_de_documents)
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_ministere, libelle)
);

-- Table des types de documents
CREATE TABLE IF NOT EXISTS type_de_documents (
    id SERIAL PRIMARY KEY,
    id_service INTEGER REFERENCES services(id) ON DELETE SET NULL,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des tiers
CREATE TABLE IF NOT EXISTS tiers (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    telephone VARCHAR(20),
    adresse TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des dossiers
CREATE TABLE IF NOT EXISTS dossiers (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    id_entite INTEGER REFERENCES entites_administratives(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_ministere, id_entite, libelle)
);

-- Table des classeurs
CREATE TABLE IF NOT EXISTS classeurs (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER REFERENCES ministeres(id) ON DELETE CASCADE,
    id_dossier INTEGER REFERENCES dossiers(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_ministere, id_dossier, libelle)
);

-- Index pour les nouvelles références
CREATE INDEX IF NOT EXISTS idx_agents_id_ministere ON agents(id_ministere);
CREATE INDEX IF NOT EXISTS idx_agents_id_entite_principale ON agents(id_entite_principale);
CREATE INDEX IF NOT EXISTS idx_agents_statut_emploi ON agents(statut_emploi);
CREATE INDEX IF NOT EXISTS idx_agents_date_embauche ON agents(date_embauche);
CREATE INDEX IF NOT EXISTS idx_type_seminaire_id_ministere ON type_de_seminaire_de_formation(id_ministere);
CREATE INDEX IF NOT EXISTS idx_type_documents_id_ministere ON type_de_documents(id_ministere);
CREATE INDEX IF NOT EXISTS idx_tiers_id_ministere ON tiers(id_ministere);
CREATE INDEX IF NOT EXISTS idx_services_id_ministere ON services(id_ministere);
CREATE INDEX IF NOT EXISTS idx_dossiers_id_ministere ON dossiers(id_ministere);
CREATE INDEX IF NOT EXISTS idx_dossiers_id_entite ON dossiers(id_entite);
CREATE INDEX IF NOT EXISTS idx_classeurs_id_ministere ON classeurs(id_ministere);
CREATE INDEX IF NOT EXISTS idx_classeurs_id_dossier ON classeurs(id_dossier);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Création des triggers pour toutes les tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_updated_at_%I ON %I;
            CREATE TRIGGER update_updated_at_%I 
            BEFORE UPDATE ON %I 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;
