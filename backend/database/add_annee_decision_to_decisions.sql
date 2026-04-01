-- Migration: Ajouter le champ année de décision à la table decisions
-- Permet de stocker l'année pour laquelle le numéro de décision est généré (année en cours ou 2 années précédentes)

ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS annee_decision INTEGER;

-- Index pour filtrer par année
CREATE INDEX IF NOT EXISTS idx_decisions_annee_decision ON decisions(annee_decision);

-- Commentaire
COMMENT ON COLUMN decisions.annee_decision IS 'Année de la décision (pour la génération du numéro, année en cours ou 2 années précédentes)';

-- Optionnel : remplir annee_decision pour les enregistrements existants à partir de date_decision ou du numéro_acte
UPDATE decisions 
SET annee_decision = EXTRACT(YEAR FROM date_decision)::INTEGER 
WHERE annee_decision IS NULL AND date_decision IS NOT NULL;

SELECT 'Colonne annee_decision ajoutée à la table decisions.' AS message;
