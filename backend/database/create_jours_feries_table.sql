-- Table pour gérer les jours fériés de Côte d'Ivoire
CREATE TABLE IF NOT EXISTS jours_feries (
    id SERIAL PRIMARY KEY,
    date_feriee DATE NOT NULL UNIQUE,
    libelle VARCHAR(255) NOT NULL,
    type_ferie VARCHAR(50) DEFAULT 'national',
    est_fixe BOOLEAN DEFAULT true,
    annee INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_jours_feries_date ON jours_feries(date_feriee);
CREATE INDEX IF NOT EXISTS idx_jours_feries_annee ON jours_feries(annee);

-- Commentaires
COMMENT ON TABLE jours_feries IS 'Table pour gérer les jours fériés de Côte d''Ivoire (exclus du calcul des jours de congés)';
COMMENT ON COLUMN jours_feries.date_feriee IS 'Date du jour férié';
COMMENT ON COLUMN jours_feries.libelle IS 'Libellé du jour férié';
COMMENT ON COLUMN jours_feries.type_ferie IS 'Type de jour férié (national, régional, religieux, etc.)';
COMMENT ON COLUMN jours_feries.est_fixe IS 'Indique si le jour férié est fixe (même date chaque année) ou mobile';
COMMENT ON COLUMN jours_feries.annee IS 'Année spécifique pour les jours mobiles, NULL pour les jours fixes annuels';

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_jours_feries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_jours_feries_updated_at ON jours_feries;

CREATE TRIGGER trigger_update_jours_feries_updated_at
    BEFORE UPDATE ON jours_feries
    FOR EACH ROW
    EXECUTE PROCEDURE update_jours_feries_updated_at();

