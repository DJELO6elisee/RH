-- Migration: Ajouter l'année au titre de laquelle le congé est demandé (pour choisir le bon numéro de décision)
-- Utilisé pour le congé annuel : cette année est envoyée au backend et sert à récupérer la décision correspondante à l'affichage sur le document.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'demandes' AND column_name = 'annee_au_titre_conge'
    ) THEN
        ALTER TABLE demandes ADD COLUMN annee_au_titre_conge INTEGER;
        RAISE NOTICE 'Colonne annee_au_titre_conge ajoutée à la table demandes.';
    ELSE
        RAISE NOTICE 'Colonne annee_au_titre_conge existe déjà.';
    END IF;
END $$;

COMMENT ON COLUMN demandes.annee_au_titre_conge IS 'Année au titre de laquelle le congé est demandé (congé annuel). Utilisée pour sélectionner le numéro de décision affiché sur le certificat.';
