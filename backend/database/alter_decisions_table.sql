-- Migration: Ajouter id_direction et id_sous_direction à la table decisions
-- Pour permettre de créer des décisions collectives pour une direction ou une sous-direction spécifique

ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS id_direction INTEGER REFERENCES directions(id),
ADD COLUMN IF NOT EXISTS id_sous_direction INTEGER REFERENCES sous_directions(id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_decisions_id_direction ON decisions(id_direction);
CREATE INDEX IF NOT EXISTS idx_decisions_id_sous_direction ON decisions(id_sous_direction);


-- Commentaires
COMMENT ON COLUMN decisions.id_direction IS 'ID de la direction concernée par la décision collective (si applicable)';
COMMENT ON COLUMN decisions.id_sous_direction IS 'ID de la sous-direction concernée par la décision collective (si applicable)';
