-- Script SQL pour créer la table d'historique des retraits et restaurations d'agents
-- Date de création: 2024
-- Description: Permet de conserver l'historique complet de tous les retraits et restaurations d'agents

-- Créer la table d'historique si elle n'existe pas
CREATE TABLE IF NOT EXISTS historique_retrait_restauration (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    type_action VARCHAR(20) NOT NULL CHECK (type_action IN ('retrait', 'restauration')),
    motif TEXT,
    date_action TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_historique_agent ON historique_retrait_restauration(id_agent);
CREATE INDEX IF NOT EXISTS idx_historique_date ON historique_retrait_restauration(date_action);
CREATE INDEX IF NOT EXISTS idx_historique_type ON historique_retrait_restauration(type_action);

-- Commentaire sur la table
COMMENT ON TABLE historique_retrait_restauration IS 'Historique complet de tous les retraits et restaurations d''agents';
COMMENT ON COLUMN historique_retrait_restauration.id_agent IS 'Référence vers l''agent concerné';
COMMENT ON COLUMN historique_retrait_restauration.type_action IS 'Type d''action: retrait ou restauration';
COMMENT ON COLUMN historique_retrait_restauration.motif IS 'Motif de l''action (retrait ou restauration)';
COMMENT ON COLUMN historique_retrait_restauration.date_action IS 'Date et heure exacte de l''action';

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Table historique_retrait_restauration créée avec succès.';
END $$;
