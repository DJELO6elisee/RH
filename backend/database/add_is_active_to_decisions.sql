-- Migration: Ajouter le champ is_active à la table decisions
-- Ce champ permet d'activer/désactiver une décision

ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- Index pour améliorer les performances des requêtes sur les décisions actives
CREATE INDEX IF NOT EXISTS idx_decisions_is_active ON decisions(is_active) WHERE is_active = TRUE;

-- Commentaire
COMMENT ON COLUMN decisions.is_active IS 'Indique si la décision est active (une seule décision active par type)';

