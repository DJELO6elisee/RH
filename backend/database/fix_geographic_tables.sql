-- Script de correction des tables géographiques
-- =============================================
-- Ce script met à jour la structure des tables géographiques
-- pour correspondre aux définitions dans geographic_tables_simplified.sql

-- Supprimer l'ancienne table localites simplifiée si elle existe
DROP TABLE IF EXISTS localites CASCADE;

-- Créer la table des régions
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

-- Créer la table des départements
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

-- Créer la table des localités avec tous les champs
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

-- Ajouter les colonnes géographiques aux tables existantes si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter les colonnes géographiques aux ministères
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministeres' AND column_name = 'id_region') THEN
        ALTER TABLE ministeres ADD COLUMN id_region INTEGER REFERENCES regions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministeres' AND column_name = 'id_departement') THEN
        ALTER TABLE ministeres ADD COLUMN id_departement INTEGER REFERENCES departements(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministeres' AND column_name = 'id_localite') THEN
        ALTER TABLE ministeres ADD COLUMN id_localite INTEGER REFERENCES localites(id);
    END IF;

    -- Ajouter les colonnes géographiques aux entités administratives
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entites_administratives' AND column_name = 'id_region') THEN
        ALTER TABLE entites_administratives ADD COLUMN id_region INTEGER REFERENCES regions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entites_administratives' AND column_name = 'id_departement') THEN
        ALTER TABLE entites_administratives ADD COLUMN id_departement INTEGER REFERENCES departements(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entites_administratives' AND column_name = 'id_localite') THEN
        ALTER TABLE entites_administratives ADD COLUMN id_localite INTEGER REFERENCES localites(id);
    END IF;

    -- Ajouter les colonnes géographiques aux institutions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'id_region') THEN
        ALTER TABLE institutions ADD COLUMN id_region INTEGER REFERENCES regions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'id_departement') THEN
        ALTER TABLE institutions ADD COLUMN id_departement INTEGER REFERENCES departements(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutions' AND column_name = 'id_localite') THEN
        ALTER TABLE institutions ADD COLUMN id_localite INTEGER REFERENCES localites(id);
    END IF;

    -- Ajouter les colonnes géographiques aux entités institutions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entites_institutions' AND column_name = 'id_region') THEN
        ALTER TABLE entites_institutions ADD COLUMN id_region INTEGER REFERENCES regions(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entites_institutions' AND column_name = 'id_departement') THEN
        ALTER TABLE entites_institutions ADD COLUMN id_departement INTEGER REFERENCES departements(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entites_institutions' AND column_name = 'id_localite') THEN
        ALTER TABLE entites_institutions ADD COLUMN id_localite INTEGER REFERENCES localites(id);
    END IF;
END $$;

-- Insérer quelques données de test pour les régions
INSERT INTO regions (code, libele, chef_lieu, description) VALUES
('ABJ', 'Abidjan', 'Abidjan', 'Région économique d\'Abidjan'),
('YAM', 'Yamoussoukro', 'Yamoussoukro', 'Région de Yamoussoukro'),
('BOU', 'Bouaké', 'Bouaké', 'Région de Bouaké')
ON CONFLICT (code) DO NOTHING;

-- Insérer quelques données de test pour les départements
INSERT INTO departements (id_region, code, libele, chef_lieu, description) VALUES
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-01', 'Abidjan Centre', 'Plateau', 'Département central d\'Abidjan'),
((SELECT id FROM regions WHERE code = 'ABJ'), 'ABJ-02', 'Cocody', 'Cocody', 'Département de Cocody'),
((SELECT id FROM regions WHERE code = 'YAM'), 'YAM-01', 'Yamoussoukro Centre', 'Yamoussoukro', 'Département central de Yamoussoukro')
ON CONFLICT (code) DO NOTHING;

-- Insérer quelques données de test pour les localités
INSERT INTO localites (id_departement, code, libele, type_localite, description) VALUES
((SELECT id FROM departements WHERE code = 'ABJ-01'), 'ABJ-01-001', 'Plateau', 'commune', 'Centre-ville d\'Abidjan'),
((SELECT id FROM departements WHERE code = 'ABJ-02'), 'ABJ-02-001', 'Cocody', 'commune', 'Commune de Cocody'),
((SELECT id FROM departements WHERE code = 'YAM-01'), 'YAM-01-001', 'Yamoussoukro', 'commune', 'Centre de Yamoussoukro')
ON CONFLICT (code) DO NOTHING;

-- Commentaires sur les tables
COMMENT ON TABLE regions IS 'Table des régions administratives';
COMMENT ON TABLE departements IS 'Table des départements avec référence aux régions';
COMMENT ON TABLE localites IS 'Table des localités (villes, communes, villages) avec référence aux départements';

-- Commentaires sur les colonnes importantes
COMMENT ON COLUMN regions.code IS 'Code unique de la région (ex: ABJ, YAM)';
COMMENT ON COLUMN departements.code IS 'Code unique du département (ex: ABJ-01)';
COMMENT ON COLUMN localites.code IS 'Code unique de la localité (ex: ABJ-01-001)';
COMMENT ON COLUMN localites.type_localite IS 'Type de localité (commune, ville, village, etc.)';

COMMIT;
