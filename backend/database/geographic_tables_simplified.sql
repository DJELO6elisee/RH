-- Tables géographiques simplifiées pour le système RH
-- ================================================
-- Hiérarchie : Régions → Départements → Localités
-- Relations avec les entités administratives

-- Table des régions
CREATE TABLE IF NOT EXISTS regions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    libele VARCHAR(100) NOT NULL,
    chef_lieu VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des départements
CREATE TABLE IF NOT EXISTS departements (
    id SERIAL PRIMARY KEY,
    id_region INTEGER REFERENCES regions(id) ON DELETE CASCADE,
    code VARCHAR(10) UNIQUE NOT NULL,
    libele VARCHAR(100) NOT NULL,
    chef_lieu VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des localités (villes, communes, villages)
CREATE TABLE IF NOT EXISTS localites (
    id SERIAL PRIMARY KEY,
    id_departement INTEGER REFERENCES departements(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    libele VARCHAR(100) NOT NULL,
    type_localite VARCHAR(50) CHECK (type_localite IN ('commune', 'ville', 'village', 'quartier', 'secteur')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajout des colonnes géographiques aux tables existantes

-- Ajout de la relation géographique aux ministères
ALTER TABLE ministeres ADD COLUMN IF NOT EXISTS id_region INTEGER REFERENCES regions(id);
ALTER TABLE ministeres ADD COLUMN IF NOT EXISTS id_departement INTEGER REFERENCES departements(id);
ALTER TABLE ministeres ADD COLUMN IF NOT EXISTS id_localite INTEGER REFERENCES localites(id);


-- Ajout de la relation géographique aux entités administratives
ALTER TABLE entites_administratives ADD COLUMN IF NOT EXISTS id_region INTEGER REFERENCES regions(id);
ALTER TABLE entites_administratives ADD COLUMN IF NOT EXISTS id_departement INTEGER REFERENCES departements(id);
ALTER TABLE entites_administratives ADD COLUMN IF NOT EXISTS id_localite INTEGER REFERENCES localites(id);

-- Ajout de la relation géographique aux institutions
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS id_region INTEGER REFERENCES regions(id);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS id_departement INTEGER REFERENCES departements(id);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS id_localite INTEGER REFERENCES localites(id);

-- Ajout de la relation géographique aux entités institutions
ALTER TABLE entites_institutions ADD COLUMN IF NOT EXISTS id_region INTEGER REFERENCES regions(id);
ALTER TABLE entites_institutions ADD COLUMN IF NOT EXISTS id_departement INTEGER REFERENCES departements(id);
ALTER TABLE entites_institutions ADD COLUMN IF NOT EXISTS id_localite INTEGER REFERENCES localites(id);


-- Commentaires sur les tables
COMMENT ON TABLE regions IS 'Table des régions administratives';
COMMENT ON TABLE departements IS 'Table des départements avec référence aux régions';
COMMENT ON TABLE localites IS 'Table des localités (villes, communes, villages) avec référence aux départements';

-- Commentaires sur les colonnes importantes
COMMENT ON COLUMN regions.code IS 'Code unique de la région (ex: ABJ, YAM)';
COMMENT ON COLUMN departements.code IS 'Code unique du département (ex: ABJ-01)';
COMMENT ON COLUMN localites.code IS 'Code unique de la localité (ex: ABJ-01-001)';
COMMENT ON COLUMN localites.type_localite IS 'Type de localité (commune, ville, village, etc.)';

-- Commentaires sur les nouvelles colonnes géographiques
COMMENT ON COLUMN ministeres.id_region IS 'Région d\'implantation du ministère';
COMMENT ON COLUMN ministeres.id_departement IS 'Département d\'implantation du ministère';
COMMENT ON COLUMN ministeres.id_localite IS 'Localité d\'implantation du ministère';

COMMENT ON COLUMN entites_administratives.id_region IS 'Région d\'implantation de l\'entité administrative';
COMMENT ON COLUMN entites_administratives.id_departement IS 'Département d\'implantation de l\'entité administrative';
COMMENT ON COLUMN entites_administratives.id_localite IS 'Localité d\'implantation de l\'entité administrative';

COMMENT ON COLUMN institutions.id_region IS 'Région d\'implantation de l\'institution';
COMMENT ON COLUMN institutions.id_departement IS 'Département d\'implantation de l\'institution';
COMMENT ON COLUMN institutions.id_localite IS 'Localité d\'implantation de l\'institution';

COMMENT ON COLUMN entites_institutions.id_region IS 'Région d\'implantation de l\'entité institution';
COMMENT ON COLUMN entites_institutions.id_departement IS 'Département d\'implantation de l\'entité institution';
COMMENT ON COLUMN entites_institutions.id_localite IS 'Localité d\'implantation de l\'entité institution';
