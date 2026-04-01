-- Création de la table des signatures agents
CREATE TABLE IF NOT EXISTS public.agent_signatures (
    id              SERIAL PRIMARY KEY,
    id_agent        INTEGER NOT NULL,
    signature_url   VARCHAR(500) NOT NULL,
    signature_path  VARCHAR(255) NOT NULL,
    signature_name  VARCHAR(255),
    signature_size  INTEGER,
    signature_type  VARCHAR(100),
    is_active       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.agent_signatures IS
    'Signatures numériques des agents utilisées pour l''émargement';

COMMENT ON COLUMN public.agent_signatures.id IS
    'Identifiant unique de la signature';
COMMENT ON COLUMN public.agent_signatures.id_agent IS
    'Référence vers l''agent concerné';
COMMENT ON COLUMN public.agent_signatures.signature_url IS
    'URL publique de la signature';
COMMENT ON COLUMN public.agent_signatures.signature_path IS
    'Chemin relatif du fichier de signature';
COMMENT ON COLUMN public.agent_signatures.signature_name IS
    'Nom original du fichier de signature';
COMMENT ON COLUMN public.agent_signatures.signature_size IS
    'Taille du fichier de signature en octets';
COMMENT ON COLUMN public.agent_signatures.signature_type IS
    'Type MIME de la signature';
COMMENT ON COLUMN public.agent_signatures.is_active IS
    'Indique si la signature est active pour l''agent';

-- Clé étrangère vers la table agents
ALTER TABLE public.agent_signatures
    ADD CONSTRAINT agent_signatures_id_agent_fkey
        FOREIGN KEY (id_agent) REFERENCES public.agents (id)
        ON DELETE CASCADE;

-- Index facultatif pour accélérer les recherches par agent
CREATE INDEX IF NOT EXISTS idx_agent_signatures_id_agent
    ON public.agent_signatures (id_agent);