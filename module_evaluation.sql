-- Script SQL pour créer la table d'évaluations annuelles des agents
-- A exécuter sur la base de données de production PostgreSQL

CREATE TABLE IF NOT EXISTS public.module_evaluation (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    annee INTEGER NOT NULL,
    
    -- Critère 1 : Assiduité / 5
    note_assiduite NUMERIC(3,1) DEFAULT 0.0 CHECK (note_assiduite >= 0.0 AND note_assiduite <= 5.0),
    comment_assiduite TEXT,
    
    -- Critère 2 : Esprit d’initiative / 3
    note_initiative NUMERIC(3,1) DEFAULT 0.0 CHECK (note_initiative >= 0.0 AND note_initiative <= 3.0),
    comment_initiative TEXT,
    
    -- Critère 3 : Esprit d’équipe / 3
    note_equipe NUMERIC(3,1) DEFAULT 0.0 CHECK (note_equipe >= 0.0 AND note_equipe <= 3.0),
    comment_equipe TEXT,
    
    -- Critère 4 : Rendement / 5
    note_rendement NUMERIC(3,1) DEFAULT 0.0 CHECK (note_rendement >= 0.0 AND note_rendement <= 5.0),
    comment_rendement TEXT,
    
    -- Critère 5 : La discipline / 4
    note_discipline NUMERIC(3,1) DEFAULT 0.0 CHECK (note_discipline >= 0.0 AND note_discipline <= 4.0),
    comment_discipline TEXT,
    
    -- Note globale sur 20 et commentaires généraux
    note_finale NUMERIC(4,2) DEFAULT 0.0 CHECK (note_finale >= 0.0 AND note_finale <= 20.0),
    comment_general TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Assurer qu'il n'y ait qu'une seule notation par agent par an
    CONSTRAINT unique_agent_annee UNIQUE (id_agent, annee)
);

-- Index pour accélérer les recherches par agent et par année
CREATE INDEX IF NOT EXISTS idx_evaluation_agent ON public.module_evaluation(id_agent);
CREATE INDEX IF NOT EXISTS idx_evaluation_annee ON public.module_evaluation(annee);

-- Commentaire descriptif sur la table
COMMENT ON TABLE public.module_evaluation IS 'Table de stockage des évaluations annuelles des agents sur 20 points';
