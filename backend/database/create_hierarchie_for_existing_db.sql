-- ===============================================================================
-- Script de création de la hiérarchie pour base de données existante
-- ===============================================================================
-- Ce script crée uniquement ce qui manque sans toucher aux tables existantes
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Créer la table direction_generale
-- ===============================================================================

CREATE TABLE IF NOT EXISTS public.direction_generale (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER NOT NULL,
    libelle VARCHAR(200) NOT NULL,
    directeur_general_id INTEGER,
    description TEXT,
    code VARCHAR(20),
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_direction_generale_ministere 
        FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE,
    CONSTRAINT fk_direction_generale_directeur 
        FOREIGN KEY (directeur_general_id) REFERENCES public.agents(id) ON DELETE SET NULL
);

-- ===============================================================================
-- ETAPE 2: Créer la table directions
-- ===============================================================================

CREATE TABLE IF NOT EXISTS public.directions (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER NOT NULL,
    id_direction_generale INTEGER,
    code VARCHAR(50),
    libelle VARCHAR(200) NOT NULL,
    directeur_id INTEGER,
    description TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_directions_ministere 
        FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE,
    CONSTRAINT fk_directions_direction_generale 
        FOREIGN KEY (id_direction_generale) REFERENCES public.direction_generale(id) ON DELETE SET NULL,
    CONSTRAINT fk_directions_directeur 
        FOREIGN KEY (directeur_id) REFERENCES public.agents(id) ON DELETE SET NULL
);

-- ===============================================================================
-- ETAPE 3: Créer la table sous_directions
-- ===============================================================================

CREATE TABLE IF NOT EXISTS public.sous_directions (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER NOT NULL,
    id_direction INTEGER,
    code VARCHAR(50),
    libelle VARCHAR(200) NOT NULL,
    sous_directeur_id INTEGER,
    description TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sous_directions_ministere 
        FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE,
    CONSTRAINT fk_sous_directions_direction 
        FOREIGN KEY (id_direction) REFERENCES public.directions(id) ON DELETE SET NULL,
    CONSTRAINT fk_sous_directions_sous_directeur 
        FOREIGN KEY (sous_directeur_id) REFERENCES public.agents(id) ON DELETE SET NULL
);

-- ===============================================================================
-- ETAPE 4: Ajouter les colonnes manquantes à la table agents
-- ===============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_direction_generale') THEN
        ALTER TABLE public.agents ADD COLUMN id_direction_generale INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_direction') THEN
        ALTER TABLE public.agents ADD COLUMN id_direction INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'id_sous_direction') THEN
        ALTER TABLE public.agents ADD COLUMN id_sous_direction INTEGER;
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 5: Ajouter les contraintes de clés étrangères pour agents
-- ===============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_agents_direction_generale') THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_direction_generale 
            FOREIGN KEY (id_direction_generale) REFERENCES public.direction_generale(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_agents_direction') THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_direction 
            FOREIGN KEY (id_direction) REFERENCES public.directions(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_agents_sous_direction') THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_sous_direction 
            FOREIGN KEY (id_sous_direction) REFERENCES public.sous_directions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 6: Créer les index
-- ===============================================================================

CREATE INDEX IF NOT EXISTS idx_direction_generale_ministere ON public.direction_generale(id_ministere);
CREATE INDEX IF NOT EXISTS idx_direction_generale_directeur ON public.direction_generale(directeur_general_id);
CREATE INDEX IF NOT EXISTS idx_directions_ministere ON public.directions(id_ministere);
CREATE INDEX IF NOT EXISTS idx_directions_direction_generale ON public.directions(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_directions_code ON public.directions(code);
CREATE INDEX IF NOT EXISTS idx_sous_directions_ministere ON public.sous_directions(id_ministere);
CREATE INDEX IF NOT EXISTS idx_sous_directions_direction ON public.sous_directions(id_direction);
CREATE INDEX IF NOT EXISTS idx_sous_directions_code ON public.sous_directions(code);
CREATE INDEX IF NOT EXISTS idx_agents_direction_generale ON public.agents(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_agents_direction ON public.agents(id_direction);
CREATE INDEX IF NOT EXISTS idx_agents_sous_direction ON public.agents(id_sous_direction);

-- ===============================================================================
-- ETAPE 7: Créer les triggers pour updated_at
-- ===============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_direction_generale_updated_at ON public.direction_generale;
CREATE TRIGGER trigger_direction_generale_updated_at
    BEFORE UPDATE ON public.direction_generale
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_directions_updated_at ON public.directions;
CREATE TRIGGER trigger_directions_updated_at
    BEFORE UPDATE ON public.directions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_sous_directions_updated_at ON public.sous_directions;
CREATE TRIGGER trigger_sous_directions_updated_at
    BEFORE UPDATE ON public.sous_directions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables créées avec succès !';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables créées:';
    RAISE NOTICE '  - direction_generale';
    RAISE NOTICE '  - directions';
    RAISE NOTICE '  - sous_directions';
    RAISE NOTICE '';
    RAISE NOTICE 'Colonnes ajoutées à agents:';
    RAISE NOTICE '  - id_direction_generale';
    RAISE NOTICE '  - id_direction';
    RAISE NOTICE '  - id_sous_direction';
END $$;




















