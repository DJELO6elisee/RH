-- Script pour ajouter une colonne pour gérer les dettes de congés (soldes négatifs)
-- Cette colonne stockera le nombre de jours dus pour l'année suivante (pour congés exceptionnels)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_conges' AND column_name = 'dette_annee_suivante'
    ) THEN
        ALTER TABLE agent_conges ADD COLUMN dette_annee_suivante INTEGER DEFAULT 0;
        RAISE NOTICE 'Colonne dette_annee_suivante ajoutée';
    ELSE
        RAISE NOTICE 'Colonne dette_annee_suivante existe déjà';
    END IF;
END $$;

COMMENT ON COLUMN agent_conges.dette_annee_suivante IS 'Nombre de jours dus à l''année suivante (pour congés exceptionnels qui dépassent les jours restants). Exemple: si solde négatif = 10, dette_annee_suivante = 10, et l''agent aura 20 jours l''année suivante (30 - 10)';

