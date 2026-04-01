-- Script pour créer la table nominations liée à la table agents
-- Champs : Nature, Numéro et Date de signature

-- Créer la table nominations
CREATE TABLE IF NOT EXISTS nominations (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    nature VARCHAR(200) NOT NULL,
    numero VARCHAR(100) NOT NULL,
    date_signature DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contrainte unique sur le numéro pour éviter les doublons
    UNIQUE(numero)
);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_nominations_agent ON nominations(id_agent);
CREATE INDEX IF NOT EXISTS idx_nominations_date ON nominations(date_signature);
CREATE INDEX IF NOT EXISTS idx_nominations_nature ON nominations(nature);

-- Ajouter des commentaires pour documenter la table
COMMENT ON TABLE nominations IS 'Table des nominations des agents';
COMMENT ON COLUMN nominations.id IS 'Identifiant unique de la nomination';
COMMENT ON COLUMN nominations.id_agent IS 'Référence vers l''agent concerné';
COMMENT ON COLUMN nominations.nature IS 'Nature de la nomination (ex: nomination, promotion, mutation, etc.)';
COMMENT ON COLUMN nominations.numero IS 'Numéro de la nomination';
COMMENT ON COLUMN nominations.date_signature IS 'Date de signature de la nomination';
COMMENT ON COLUMN nominations.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN nominations.updated_at IS 'Date de dernière modification';

-- Afficher un message de confirmation
SELECT 'Table nominations créée avec succès' as message;
