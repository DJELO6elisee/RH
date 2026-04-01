-- ===============================================================================
-- Script de correction: Ajouter les colonnes manquantes à agents
-- ===============================================================================

-- Ajouter les colonnes si elles n'existent pas
DO $$ 
BEGIN
    -- id_direction_generale
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_direction_generale'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN id_direction_generale INTEGER;
        RAISE NOTICE '✅ Colonne id_direction_generale ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction_generale existe déjà';
    END IF;
    
    -- id_direction
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_direction'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN id_direction INTEGER;
        RAISE NOTICE '✅ Colonne id_direction ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction existe déjà';
    END IF;
    
    -- id_sous_direction
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_sous_direction'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN id_sous_direction INTEGER;
        RAISE NOTICE '✅ Colonne id_sous_direction ajoutée';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_sous_direction existe déjà';
    END IF;
END $$;

-- Ajouter les contraintes de clés étrangères
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agents_direction_generale'
    ) THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_direction_generale 
            FOREIGN KEY (id_direction_generale) 
            REFERENCES public.direction_generale(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_agents_direction_generale ajoutée';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agents_direction'
    ) THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_direction 
            FOREIGN KEY (id_direction) 
            REFERENCES public.directions(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_agents_direction ajoutée';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_agents_sous_direction'
    ) THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_sous_direction 
            FOREIGN KEY (id_sous_direction) 
            REFERENCES public.sous_directions(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_agents_sous_direction ajoutée';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Colonnes et contraintes ajoutées avec succès !';
END $$;

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_agents_direction_generale ON public.agents(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_agents_direction ON public.agents(id_direction);
CREATE INDEX IF NOT EXISTS idx_agents_sous_direction ON public.agents(id_sous_direction);

