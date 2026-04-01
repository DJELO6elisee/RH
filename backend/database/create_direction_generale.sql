-- ============================================================================
-- Script de création de la table direction_generale
-- ============================================================================
-- Cette table représente les directions générales au sein des ministères
-- Elle est liée aux tables: ministeres, directions, et agents
-- ============================================================================

-- Création de la séquence pour l'ID
CREATE SEQUENCE IF NOT EXISTS public.direction_generale_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.direction_generale_id_seq OWNER TO postgres;

-- Création de la table direction_generale
CREATE TABLE IF NOT EXISTS public.direction_generale (
    id integer NOT NULL DEFAULT nextval('direction_generale_id_seq'::regclass),
    id_ministere integer NOT NULL,
    libelle character varying(200) NOT NULL,
    directeur_general_id integer,
    description text,
    code character varying(20),
    adresse text,
    telephone character varying(20),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT direction_generale_pkey PRIMARY KEY (id)
);

ALTER TABLE public.direction_generale OWNER TO postgres;

-- Commentaires sur la table
COMMENT ON TABLE public.direction_generale IS 'Table des directions générales au sein des ministères';
COMMENT ON COLUMN public.direction_generale.id IS 'Identifiant unique de la direction générale';
COMMENT ON COLUMN public.direction_generale.id_ministere IS 'Référence au ministère de tutelle';
COMMENT ON COLUMN public.direction_generale.libelle IS 'Nom de la direction générale';
COMMENT ON COLUMN public.direction_generale.directeur_general_id IS 'Référence à l''agent qui dirige la direction générale';
COMMENT ON COLUMN public.direction_generale.description IS 'Description détaillée de la direction générale';
COMMENT ON COLUMN public.direction_generale.code IS 'Code ou sigle de la direction générale';
COMMENT ON COLUMN public.direction_generale.is_active IS 'Indique si la direction générale est active';

-- Ajout de la contrainte de clé étrangère vers ministeres
ALTER TABLE public.direction_generale
    ADD CONSTRAINT fk_direction_generale_ministere 
    FOREIGN KEY (id_ministere) 
    REFERENCES public.ministeres(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Ajout de la contrainte de clé étrangère vers agents (directeur général)
ALTER TABLE public.direction_generale
    ADD CONSTRAINT fk_direction_generale_directeur 
    FOREIGN KEY (directeur_general_id) 
    REFERENCES public.agents(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- ============================================================================
-- Modification de la table directions pour ajouter le lien vers direction_generale
-- ============================================================================

-- Ajout de la colonne id_direction_generale dans la table directions
ALTER TABLE public.directions 
    ADD COLUMN IF NOT EXISTS id_direction_generale integer;

-- Ajout du commentaire sur la colonne
COMMENT ON COLUMN public.directions.id_direction_generale IS 'Référence à la direction générale de tutelle';

-- Ajout de la contrainte de clé étrangère
ALTER TABLE public.directions
    ADD CONSTRAINT fk_directions_direction_generale 
    FOREIGN KEY (id_direction_generale) 
    REFERENCES public.direction_generale(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- ============================================================================
-- Modification de la table agents pour ajouter le lien vers direction_generale
-- ============================================================================

-- Ajout de la colonne id_direction_generale dans la table agents (optionnel)
ALTER TABLE public.agents 
    ADD COLUMN IF NOT EXISTS id_direction_generale integer;

-- Ajout du commentaire sur la colonne
COMMENT ON COLUMN public.agents.id_direction_generale IS 'Référence à la direction générale d''affectation de l''agent';

-- Ajout de la contrainte de clé étrangère
ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_direction_generale 
    FOREIGN KEY (id_direction_generale) 
    REFERENCES public.direction_generale(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- ============================================================================
-- Création des index pour optimiser les performances
-- ============================================================================

-- Index sur id_ministere pour les recherches par ministère
CREATE INDEX IF NOT EXISTS idx_direction_generale_ministere 
    ON public.direction_generale(id_ministere);

-- Index sur directeur_general_id pour les recherches par directeur
CREATE INDEX IF NOT EXISTS idx_direction_generale_directeur 
    ON public.direction_generale(directeur_general_id);

-- Index sur is_active pour filtrer les directions actives
CREATE INDEX IF NOT EXISTS idx_direction_generale_active 
    ON public.direction_generale(is_active);

-- Index sur la colonne id_direction_generale dans directions
CREATE INDEX IF NOT EXISTS idx_directions_direction_generale 
    ON public.directions(id_direction_generale);

-- Index sur la colonne id_direction_generale dans agents
CREATE INDEX IF NOT EXISTS idx_agents_direction_generale 
    ON public.agents(id_direction_generale);

-- ============================================================================
-- Trigger pour mettre à jour automatiquement updated_at
-- ============================================================================

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_direction_generale_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger
DROP TRIGGER IF EXISTS trigger_update_direction_generale_updated_at ON public.direction_generale;

CREATE TRIGGER trigger_update_direction_generale_updated_at
    BEFORE UPDATE ON public.direction_generale
    FOR EACH ROW
    EXECUTE FUNCTION public.update_direction_generale_updated_at();

-- ============================================================================
-- Données de test (optionnel - à décommenter si nécessaire)
-- ============================================================================

/*
-- Exemple d'insertion
INSERT INTO public.direction_generale (id_ministere, libelle, code, description, is_active)
VALUES 
    (1, 'Direction Générale des Ressources Humaines', 'DGRH', 'Gestion des ressources humaines du ministère', true),
    (1, 'Direction Générale du Budget et des Finances', 'DGBF', 'Gestion budgétaire et financière', true);
*/

-- ============================================================================
-- Permissions (à adapter selon vos besoins)
-- ============================================================================

-- GRANT ALL ON TABLE public.direction_generale TO postgres;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.direction_generale TO votre_user;
-- GRANT USAGE, SELECT ON SEQUENCE public.direction_generale_id_seq TO votre_user;

COMMENT ON TABLE public.direction_generale IS 'Table des directions générales - Créée le ' || CURRENT_TIMESTAMP;

