-- Migration: Ajouter id_agent à la table decisions
-- Pour permettre de lier une décision individuelle à un agent spécifique (directeur, sous-directeur, etc.)

ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS id_agent INTEGER REFERENCES agents(id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_decisions_id_agent ON decisions(id_agent);

-- Commentaire
COMMENT ON COLUMN decisions.id_agent IS 'ID de l''agent concerné par la décision individuelle (directeur, sous-directeur, DRH, etc.)';
