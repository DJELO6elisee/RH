-- Script pour créer les 4 tables d'historique des agents
-- 1. fonction_anterieur
-- 2. emploi_anterieur  
-- 3. stage
-- 4. etude_diplome

-- ============================================
-- 1. TABLE FONCTION_ANTERIEUR
-- ============================================
CREATE TABLE IF NOT EXISTS fonction_anterieur (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE,
    libele_poste VARCHAR(200) NOT NULL,
    structure VARCHAR(200) NOT NULL,
    id_position INTEGER REFERENCES positions(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour fonction_anterieur
CREATE INDEX IF NOT EXISTS idx_fonction_anterieur_agent ON fonction_anterieur(id_agent);
CREATE INDEX IF NOT EXISTS idx_fonction_anterieur_dates ON fonction_anterieur(date_debut, date_fin);

-- Commentaires pour fonction_anterieur
COMMENT ON TABLE fonction_anterieur IS 'Historique des fonctions antérieures des agents';
COMMENT ON COLUMN fonction_anterieur.id IS 'Identifiant unique de la fonction antérieure';
COMMENT ON COLUMN fonction_anterieur.id_agent IS 'Référence vers l''agent';
COMMENT ON COLUMN fonction_anterieur.date_debut IS 'Date de début de la fonction';
COMMENT ON COLUMN fonction_anterieur.date_fin IS 'Date de fin de la fonction (NULL si toujours en cours)';
COMMENT ON COLUMN fonction_anterieur.libele_poste IS 'Libellé du poste occupé';
COMMENT ON COLUMN fonction_anterieur.structure IS 'Structure où le poste était exercé';
COMMENT ON COLUMN fonction_anterieur.id_position IS 'Référence vers la position dans le système';

-- ============================================
-- 2. TABLE EMPLOI_ANTERIEUR
-- ============================================
CREATE TABLE IF NOT EXISTS emploi_anterieur (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date_emploi DATE NOT NULL,
    emploi VARCHAR(200) NOT NULL,
    structure VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour emploi_anterieur
CREATE INDEX IF NOT EXISTS idx_emploi_anterieur_agent ON emploi_anterieur(id_agent);
CREATE INDEX IF NOT EXISTS idx_emploi_anterieur_date ON emploi_anterieur(date_emploi);

-- Commentaires pour emploi_anterieur
COMMENT ON TABLE emploi_anterieur IS 'Historique des emplois antérieurs des agents';
COMMENT ON COLUMN emploi_anterieur.id IS 'Identifiant unique de l''emploi antérieur';
COMMENT ON COLUMN emploi_anterieur.id_agent IS 'Référence vers l''agent';
COMMENT ON COLUMN emploi_anterieur.date_emploi IS 'Date de l''emploi';
COMMENT ON COLUMN emploi_anterieur.emploi IS 'Type d''emploi exercé';
COMMENT ON COLUMN emploi_anterieur.structure IS 'Structure où l''emploi était exercé';

-- ============================================
-- 3. TABLE STAGE
-- ============================================
CREATE TABLE IF NOT EXISTS stage (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    intitule_stage VARCHAR(300) NOT NULL,
    date_stage DATE NOT NULL,
    duree_stage INTEGER, -- Durée en jours
    etablissement VARCHAR(200) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    pays VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour stage
CREATE INDEX IF NOT EXISTS idx_stage_agent ON stage(id_agent);
CREATE INDEX IF NOT EXISTS idx_stage_date ON stage(date_stage);
CREATE INDEX IF NOT EXISTS idx_stage_etablissement ON stage(etablissement);

-- Commentaires pour stage
COMMENT ON TABLE stage IS 'Historique des stages des agents';
COMMENT ON COLUMN stage.id IS 'Identifiant unique du stage';
COMMENT ON COLUMN stage.id_agent IS 'Référence vers l''agent';
COMMENT ON COLUMN stage.intitule_stage IS 'Intitulé du stage';
COMMENT ON COLUMN stage.date_stage IS 'Date du stage';
COMMENT ON COLUMN stage.duree_stage IS 'Durée du stage en jours';
COMMENT ON COLUMN stage.etablissement IS 'Établissement où le stage s''est déroulé';
COMMENT ON COLUMN stage.ville IS 'Ville de l''établissement';
COMMENT ON COLUMN stage.pays IS 'Pays de l''établissement';

-- ============================================
-- 4. TABLE ETUDE_DIPLOME
-- ============================================
CREATE TABLE IF NOT EXISTS etude_diplome (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    diplome VARCHAR(300) NOT NULL,
    date_diplome INTEGER NOT NULL,
    ecole VARCHAR(200) NOT NULL,
    ville VARCHAR(100) NOT NULL,
    pays VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour etude_diplome
CREATE INDEX IF NOT EXISTS idx_etude_diplome_agent ON etude_diplome(id_agent);
CREATE INDEX IF NOT EXISTS idx_etude_diplome_date ON etude_diplome(date_diplome);
CREATE INDEX IF NOT EXISTS idx_etude_diplome_ecole ON etude_diplome(ecole);

-- Commentaires pour etude_diplome
COMMENT ON TABLE etude_diplome IS 'Historique des études et diplômes des agents';
COMMENT ON COLUMN etude_diplome.id IS 'Identifiant unique du diplôme';
COMMENT ON COLUMN etude_diplome.id_agent IS 'Référence vers l''agent';
COMMENT ON COLUMN etude_diplome.diplome IS 'Nom du diplôme obtenu';
COMMENT ON COLUMN etude_diplome.date_diplome IS 'Année d''obtention du diplôme';
COMMENT ON COLUMN etude_diplome.ecole IS 'École ou université';
COMMENT ON COLUMN etude_diplome.ville IS 'Ville de l''école';
COMMENT ON COLUMN etude_diplome.pays IS 'Pays de l''école';

-- ============================================
-- MESSAGE DE CONFIRMATION
-- ============================================
SELECT 'Tables d''historique des agents créées avec succès' as message;
