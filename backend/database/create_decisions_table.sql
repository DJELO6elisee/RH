-- Migration: Créer la table decisions pour gérer les décisions collectives et individuelles
-- Les décisions collectives s'appliquent aux agents simples
-- Les décisions individuelles s'appliquent aux directeurs et sous-directeurs

CREATE TABLE IF NOT EXISTS decisions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('collective', 'individuelle')),
    numero_acte VARCHAR(255),
    chemin_document VARCHAR(500),
    date_decision DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES agents(id),
    
    -- Contrainte : au moins un des deux (numero_acte ou chemin_document) doit être présent
    CONSTRAINT check_decision_data CHECK (
        (numero_acte IS NOT NULL AND numero_acte != '') OR 
        (chemin_document IS NOT NULL AND chemin_document != '')
    )
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(type);
CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(date_decision);
CREATE INDEX IF NOT EXISTS idx_decisions_created_by ON decisions(created_by);

-- Commentaires
COMMENT ON TABLE decisions IS 'Table pour gérer les décisions collectives et individuelles de cessation de service';
COMMENT ON COLUMN decisions.type IS 'Type de décision: collective (agents simples) ou individuelle (directeurs/sous-directeurs)';
COMMENT ON COLUMN decisions.numero_acte IS 'Numéro de l''acte de décision';
COMMENT ON COLUMN decisions.chemin_document IS 'Chemin vers le document uploadé';
COMMENT ON COLUMN decisions.date_decision IS 'Date de la décision';

