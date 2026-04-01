-- ===============================================================================
-- Script de création de la table direction_generale UNIQUEMENT
-- ===============================================================================
-- Les tables directions, sous_directions et services existent déjà
-- Ce script ajoute seulement la table direction_generale et les liens
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

COMMENT ON TABLE public.direction_generale IS 'Directions générales du ministère extraites des fonctions des agents';

-- ===============================================================================
-- ETAPE 2: Ajouter les colonnes manquantes aux tables existantes
-- ===============================================================================

-- Ajouter id_direction_generale à la table directions (si n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directions' AND column_name = 'id_direction_generale'
    ) THEN
        ALTER TABLE public.directions ADD COLUMN id_direction_generale INTEGER;
        RAISE NOTICE '✅ Colonne id_direction_generale ajoutée à la table directions';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction_generale existe déjà dans directions';
    END IF;
END $$;

-- Ajouter code à la table directions (si n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directions' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.directions ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '✅ Colonne code ajoutée à la table directions';
    ELSE
        RAISE NOTICE '⚠️  Colonne code existe déjà dans directions';
    END IF;
END $$;

-- Ajouter id_direction à la table sous_directions (si n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sous_directions' AND column_name = 'id_direction'
    ) THEN
        ALTER TABLE public.sous_directions ADD COLUMN id_direction INTEGER;
        RAISE NOTICE '✅ Colonne id_direction ajoutée à la table sous_directions';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction existe déjà dans sous_directions';
    END IF;
END $$;

-- Ajouter code à la table sous_directions (si n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sous_directions' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.sous_directions ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '✅ Colonne code ajoutée à la table sous_directions';
    ELSE
        RAISE NOTICE '⚠️  Colonne code existe déjà dans sous_directions';
    END IF;
END $$;

-- Ajouter id_sous_direction à la table services (si n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'id_sous_direction'
    ) THEN
        ALTER TABLE public.services ADD COLUMN id_sous_direction INTEGER;
        RAISE NOTICE '✅ Colonne id_sous_direction ajoutée à la table services';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_sous_direction existe déjà dans services';
    END IF;
END $$;

-- Ajouter code à la table services (si n'existe pas)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'code'
    ) THEN
        ALTER TABLE public.services ADD COLUMN code VARCHAR(50);
        RAISE NOTICE '✅ Colonne code ajoutée à la table services';
    ELSE
        RAISE NOTICE '⚠️  Colonne code existe déjà dans services';
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 3: Ajouter les colonnes à la table agents (si n'existent pas)
-- ===============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' AND column_name = 'id_direction_generale'
    ) THEN
        ALTER TABLE public.agents ADD COLUMN id_direction_generale INTEGER;
        RAISE NOTICE '✅ Colonne id_direction_generale ajoutée à la table agents';
    ELSE
        RAISE NOTICE '⚠️  Colonne id_direction_generale existe déjà dans agents';
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 4: Ajouter les contraintes de clés étrangères
-- ===============================================================================

-- Contrainte pour directions.id_direction_generale
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_directions_direction_generale'
    ) THEN
        ALTER TABLE public.directions
            ADD CONSTRAINT fk_directions_direction_generale 
            FOREIGN KEY (id_direction_generale) 
            REFERENCES public.direction_generale(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_directions_direction_generale créée';
    END IF;
END $$;

-- Contrainte pour sous_directions.id_direction
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_sous_directions_direction'
    ) THEN
        ALTER TABLE public.sous_directions
            ADD CONSTRAINT fk_sous_directions_direction 
            FOREIGN KEY (id_direction) 
            REFERENCES public.directions(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_sous_directions_direction créée';
    END IF;
END $$;

-- Contrainte pour services.id_sous_direction
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_services_sous_direction'
    ) THEN
        ALTER TABLE public.services
            ADD CONSTRAINT fk_services_sous_direction 
            FOREIGN KEY (id_sous_direction) 
            REFERENCES public.sous_directions(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Contrainte fk_services_sous_direction créée';
    END IF;
END $$;

-- Contrainte pour agents.id_direction_generale
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
        RAISE NOTICE '✅ Contrainte fk_agents_direction_generale créée';
    END IF;
END $$;

-- ===============================================================================
-- ETAPE 5: Créer les index pour optimiser les performances
-- ===============================================================================

CREATE INDEX IF NOT EXISTS idx_direction_generale_ministere ON public.direction_generale(id_ministere);
CREATE INDEX IF NOT EXISTS idx_direction_generale_directeur ON public.direction_generale(directeur_general_id);
CREATE INDEX IF NOT EXISTS idx_direction_generale_active ON public.direction_generale(is_active);
CREATE INDEX IF NOT EXISTS idx_directions_direction_generale ON public.directions(id_direction_generale);
CREATE INDEX IF NOT EXISTS idx_directions_code ON public.directions(code);
CREATE INDEX IF NOT EXISTS idx_sous_directions_direction ON public.sous_directions(id_direction);
CREATE INDEX IF NOT EXISTS idx_sous_directions_code ON public.sous_directions(code);
CREATE INDEX IF NOT EXISTS idx_services_sous_direction ON public.services(id_sous_direction);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(code);
CREATE INDEX IF NOT EXISTS idx_agents_direction_generale ON public.agents(id_direction_generale);

-- ===============================================================================
-- ETAPE 6: Créer le trigger pour updated_at
-- ===============================================================================

CREATE OR REPLACE FUNCTION public.update_direction_generale_updated_at()
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
    EXECUTE FUNCTION public.update_direction_generale_updated_at();

-- ===============================================================================
-- ETAPE 7: Insérer les 2 Directions Générales
-- ===============================================================================

-- DG INDUSTRIE TOURISTIQUE ET HOTELIERE
INSERT INTO public.direction_generale (id_ministere, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    'DG ITH',
    'DG INDUSTRIE TOURISTIQUE ET HOTELIERE',
    true
) ON CONFLICT DO NOTHING;

-- DIRECTION GENERALE DES LOISIRS
INSERT INTO public.direction_generale (id_ministere, code, libelle, is_active)
VALUES (
    (SELECT id FROM public.ministeres WHERE code = '47' OR nom LIKE '%TOURISME%' LIMIT 1),
    'DG LOISIRS',
    'DIRECTION GENERALE DES LOISIRS',
    true
) ON CONFLICT DO NOTHING;

-- ===============================================================================
-- ETAPE 8: Créer ou mettre à jour la vue v_hierarchie_complete
-- ===============================================================================

CREATE OR REPLACE VIEW v_hierarchie_complete AS
SELECT 
    a.id as agent_id,
    a.matricule,
    a.nom,
    a.prenom,
    a.fonction_actuelle,
    m.nom as ministere,
    dg.libelle as direction_generale,
    d.libelle as direction,
    sd.libelle as sous_direction,
    s.libelle as service
FROM public.agents a
LEFT JOIN public.ministeres m ON a.id_ministere = m.id
LEFT JOIN public.direction_generale dg ON a.id_direction_generale = dg.id
LEFT JOIN public.directions d ON a.id_direction = d.id
LEFT JOIN public.sous_directions sd ON a.id_sous_direction = sd.id
LEFT JOIN public.services s ON a.id_service = s.id
ORDER BY m.nom, dg.libelle, d.libelle, sd.libelle, s.libelle, a.nom;

COMMENT ON VIEW v_hierarchie_complete IS 'Vue complète de la hiérarchie organisationnelle avec tous les agents';

-- ===============================================================================
-- Message de confirmation
-- ===============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Table direction_generale créée avec succès !';
    RAISE NOTICE '✅ Colonnes ajoutées aux tables existantes';
    RAISE NOTICE '✅ 2 Directions Générales insérées';
    RAISE NOTICE '✅ Vue v_hierarchie_complete créée';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Vérification:';
    RAISE NOTICE '   SELECT * FROM direction_generale;';
    RAISE NOTICE '   SELECT * FROM v_hierarchie_complete LIMIT 10;';
END $$;




















