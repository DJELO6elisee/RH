-- Script SQL pour créer la table des prolongements de retraite
-- Date de création: 2025
-- Description: Permet de stocker les informations de prolongement de retraite des agents

-- Créer la table des prolongements de retraite si elle n'existe pas
CREATE TABLE IF NOT EXISTS prolongements_retraite (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    numero_acte VARCHAR(255),
    nombre_annees INTEGER,
    chemin_fichier VARCHAR(500),
    nom_fichier VARCHAR(255),
    taille_fichier BIGINT,
    type_fichier VARCHAR(100),
    age_retraite_initial INTEGER,
    age_retraite_prolonge INTEGER,
    date_retraite_initial DATE,
    date_retraite_prolongee DATE,
    date_prolongement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Créer des index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_prolongements_agent ON prolongements_retraite(id_agent);
CREATE INDEX IF NOT EXISTS idx_prolongements_date ON prolongements_retraite(date_prolongement);
CREATE INDEX IF NOT EXISTS idx_prolongements_numero_acte ON prolongements_retraite(numero_acte);

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE prolongements_retraite IS 'Historique des prolongements de retraite des agents';
COMMENT ON COLUMN prolongements_retraite.id_agent IS 'Référence vers l''agent concerné';
COMMENT ON COLUMN prolongements_retraite.numero_acte IS 'Numéro de l''acte de prolongement';
COMMENT ON COLUMN prolongements_retraite.nombre_annees IS 'Nombre d''années de prolongement';
COMMENT ON COLUMN prolongements_retraite.chemin_fichier IS 'Chemin relatif du fichier uploadé';
COMMENT ON COLUMN prolongements_retraite.nom_fichier IS 'Nom original du fichier';
COMMENT ON COLUMN prolongements_retraite.taille_fichier IS 'Taille du fichier en octets';
COMMENT ON COLUMN prolongements_retraite.type_fichier IS 'Type MIME du fichier';
COMMENT ON COLUMN prolongements_retraite.age_retraite_initial IS 'Âge de retraite avant le prolongement';
COMMENT ON COLUMN prolongements_retraite.age_retraite_prolonge IS 'Nouvel âge de retraite après prolongement';
COMMENT ON COLUMN prolongements_retraite.date_retraite_initial IS 'Date de retraite avant le prolongement';
COMMENT ON COLUMN prolongements_retraite.date_retraite_prolongee IS 'Nouvelle date de retraite après prolongement';
COMMENT ON COLUMN prolongements_retraite.date_prolongement IS 'Date et heure du prolongement';

-- Afficher un message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Table prolongements_retraite créée avec succès.';
END $$;


