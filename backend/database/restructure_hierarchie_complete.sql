-- ===============================================================================
-- Script de restructuration complète de la hiérarchie organisationnelle
-- ===============================================================================
-- Ce script crée la hiérarchie: 
-- Ministère -> Direction Générale -> Direction -> Sous-Direction -> Service
-- ===============================================================================

-- ===============================================================================
-- ETAPE 1: Vérifier et créer la table direction_generale si elle n'existe pas
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

COMMENT ON TABLE public.direction_generale IS 'Directions générales du ministère (DG)';

-- ===============================================================================
-- ETAPE 2: Créer la table directions (si elle n'existe pas déjà)
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

-- Ajouter la colonne id_direction_generale si elle n'existe pas
ALTER TABLE public.directions 
    ADD COLUMN IF NOT EXISTS id_direction_generale INTEGER;

-- Ajouter la colonne code si elle n'existe pas
ALTER TABLE public.directions 
    ADD COLUMN IF NOT EXISTS code VARCHAR(50);

COMMENT ON TABLE public.directions IS 'Directions du ministère';
COMMENT ON COLUMN public.directions.code IS 'Code DIR/SER de la direction';

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

-- Ajouter la colonne id_direction si elle n'existe pas
ALTER TABLE public.sous_directions 
    ADD COLUMN IF NOT EXISTS id_direction INTEGER;

-- Ajouter la colonne code si elle n'existe pas
ALTER TABLE public.sous_directions 
    ADD COLUMN IF NOT EXISTS code VARCHAR(50);

COMMENT ON TABLE public.sous_directions IS 'Sous-directions du ministère';
COMMENT ON COLUMN public.sous_directions.code IS 'Code DIR/SER de la sous-direction';

-- ===============================================================================
-- ETAPE 4: Créer la table services
-- ===============================================================================

CREATE TABLE IF NOT EXISTS public.services (
    id SERIAL PRIMARY KEY,
    id_ministere INTEGER NOT NULL,
    id_sous_direction INTEGER,
    code VARCHAR(50),
    libelle VARCHAR(200) NOT NULL,
    responsable_id INTEGER,
    description TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_services_ministere 
        FOREIGN KEY (id_ministere) REFERENCES public.ministeres(id) ON DELETE CASCADE,
    CONSTRAINT fk_services_sous_direction 
        FOREIGN KEY (id_sous_direction) REFERENCES public.sous_directions(id) ON DELETE SET NULL,
    CONSTRAINT fk_services_responsable 
        FOREIGN KEY (responsable_id) REFERENCES public.agents(id) ON DELETE SET NULL
);

-- Ajouter la colonne id_sous_direction si elle n'existe pas
ALTER TABLE public.services 
    ADD COLUMN IF NOT EXISTS id_sous_direction INTEGER;

-- Ajouter la colonne code si elle n'existe pas
ALTER TABLE public.services 
    ADD COLUMN IF NOT EXISTS code VARCHAR(50);

COMMENT ON TABLE public.services IS 'Services du ministère';
COMMENT ON COLUMN public.services.code IS 'Code DIR/SER du service';

-- ===============================================================================
-- ETAPE 5: Mettre à jour la table agents avec toutes les relations
-- ===============================================================================

-- Ajouter les colonnes manquantes dans agents
ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS id_direction_generale INTEGER;

ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS id_direction INTEGER;

ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS id_sous_direction INTEGER;

ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS id_service INTEGER;

-- Supprimer les anciennes contraintes si elles existent
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS fk_agents_direction_generale;
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS fk_agents_direction;
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS fk_agents_sous_direction;
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS fk_agents_service;

-- Ajouter les nouvelles contraintes
ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_direction_generale 
    FOREIGN KEY (id_direction_generale) REFERENCES public.direction_generale(id) ON DELETE SET NULL;

ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_direction 
    FOREIGN KEY (id_direction) REFERENCES public.directions(id) ON DELETE SET NULL;

ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_sous_direction 
    FOREIGN KEY (id_sous_direction) REFERENCES public.sous_directions(id) ON DELETE SET NULL;

ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_service 
    FOREIGN KEY (id_service) REFERENCES public.services(id) ON DELETE SET NULL;

-- ===============================================================================
-- ETAPE 6: Créer les index pour optimiser les performances
-- ===============================================================================

-- Index pour direction_generale
CREATE INDEX IF NOT EXISTS idx_direction_generale_ministere ON public.direction_generale(id_ministere);
CREATE INDEX IF NOT EXISTS idx_direction_generale_directeur ON public.direction_generale(directeur_general_id);
CREATE INDEX IF NOT EXISTS idx_direction_generale_active ON public.direction_generale(is_active);

-- Index pour directions
CREATE INDEX IF NOT EXISTS idx_directions_ministere ON public.directions(id_ministere);
CREATE INDEX IF NOT EXISTS idx_directions_direction_generale ON public.directions(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_directions_directeur ON public.directions(directeur_id);
CREATE INDEX IF NOT EXISTS idx_directions_code ON public.directions(code);
CREATE INDEX IF NOT EXISTS idx_directions_active ON public.directions(is_active);

-- Index pour sous_directions
CREATE INDEX IF NOT EXISTS idx_sous_directions_ministere ON public.sous_directions(id_ministere);
CREATE INDEX IF NOT EXISTS idx_sous_directions_direction ON public.sous_directions(id_direction);
CREATE INDEX IF NOT EXISTS idx_sous_directions_sous_directeur ON public.sous_directions(sous_directeur_id);
CREATE INDEX IF NOT EXISTS idx_sous_directions_code ON public.sous_directions(code);
CREATE INDEX IF NOT EXISTS idx_sous_directions_active ON public.sous_directions(is_active);

-- Index pour services
CREATE INDEX IF NOT EXISTS idx_services_ministere ON public.services(id_ministere);
CREATE INDEX IF NOT EXISTS idx_services_sous_direction ON public.services(id_sous_direction);
CREATE INDEX IF NOT EXISTS idx_services_responsable ON public.services(responsable_id);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

-- Index pour agents
CREATE INDEX IF NOT EXISTS idx_agents_direction_generale ON public.agents(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_agents_direction ON public.agents(id_direction);
CREATE INDEX IF NOT EXISTS idx_agents_sous_direction ON public.agents(id_sous_direction);
CREATE INDEX IF NOT EXISTS idx_agents_service ON public.agents(id_service);

-- ===============================================================================
-- ETAPE 7: Créer les triggers pour updated_at
-- ===============================================================================

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour direction_generale
DROP TRIGGER IF EXISTS trigger_direction_generale_updated_at ON public.direction_generale;
CREATE TRIGGER trigger_direction_generale_updated_at
    BEFORE UPDATE ON public.direction_generale
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour directions
DROP TRIGGER IF EXISTS trigger_directions_updated_at ON public.directions;
CREATE TRIGGER trigger_directions_updated_at
    BEFORE UPDATE ON public.directions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour sous_directions
DROP TRIGGER IF EXISTS trigger_sous_directions_updated_at ON public.sous_directions;
CREATE TRIGGER trigger_sous_directions_updated_at
    BEFORE UPDATE ON public.sous_directions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour services
DROP TRIGGER IF EXISTS trigger_services_updated_at ON public.services;
CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Structure de la hiérarchie organisationnelle créée avec succès !';
    RAISE NOTICE '📋 Tables créées/mises à jour:';
    RAISE NOTICE '   - direction_generale (Directions Générales)';
    RAISE NOTICE '   - directions (Directions)';
    RAISE NOTICE '   - sous_directions (Sous-Directions)';
    RAISE NOTICE '   - services (Services)';
    RAISE NOTICE '   - agents (Mis à jour avec toutes les relations)';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Hiérarchie: Ministère → DG → Direction → Sous-Direction → Service';
END $$;




















