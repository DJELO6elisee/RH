-- ===============================================================================
-- Script d'ajout des colonnes manquantes aux tables existantes
-- ===============================================================================

-- Ajouter colonnes à la table directions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directions' AND column_name = 'id_direction_generale'
    ) THEN
        ALTER TABLE public.directions ADD COLUMN id_direction_generale INTEGER;
        RAISE NOTICE '✅ Colonne id_direction_generale ajoutée à directions';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directions' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.directions ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '✅ Colonne code ajoutée à directions';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directions' AND column_name = 'directeur_id'
    ) THEN
        ALTER TABLE public.directions ADD COLUMN directeur_id INTEGER;
        RAISE NOTICE '✅ Colonne directeur_id ajoutée à directions';
    END IF;
END $$;

-- Ajouter colonnes à la table sous_directions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sous_directions' AND column_name = 'id_direction'
    ) THEN
        ALTER TABLE public.sous_directions ADD COLUMN id_direction INTEGER;
        RAISE NOTICE '✅ Colonne id_direction ajoutée à sous_directions';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sous_directions' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.sous_directions ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '✅ Colonne code ajoutée à sous_directions';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sous_directions' AND column_name = 'sous_directeur_id'
    ) THEN
        ALTER TABLE public.sous_directions ADD COLUMN sous_directeur_id INTEGER;
        RAISE NOTICE '✅ Colonne sous_directeur_id ajoutée à sous_directions';
    END IF;
END $$;

-- Ajouter contraintes de clés étrangères
DO $$
BEGIN
    -- directions -> direction_generale
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_directions_direction_generale'
    ) THEN
        ALTER TABLE public.directions
            ADD CONSTRAINT fk_directions_direction_generale 
            FOREIGN KEY (id_direction_generale) 
            REFERENCES public.direction_generale(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_directions_direction_generale ajoutée';
    END IF;
    
    -- sous_directions -> directions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_sous_directions_direction'
    ) THEN
        ALTER TABLE public.sous_directions
            ADD CONSTRAINT fk_sous_directions_direction 
            FOREIGN KEY (id_direction) 
            REFERENCES public.directions(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_sous_directions_direction ajoutée';
    END IF;
END $$;

-- Créer index
CREATE INDEX IF NOT EXISTS idx_directions_direction_generale ON public.directions(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_directions_code ON public.directions(code);
CREATE INDEX IF NOT EXISTS idx_sous_directions_direction ON public.sous_directions(id_direction);
CREATE INDEX IF NOT EXISTS idx_sous_directions_code ON public.sous_directions(code);

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Colonnes ajoutées aux tables existantes!';
    RAISE NOTICE '';
END $$;




















