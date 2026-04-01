-- ============================================================================
-- Ajouter id_ministere aux tables emplois et fonctions pour filtrage par ministère
-- ============================================================================

-- Table emplois
ALTER TABLE public.emplois ADD COLUMN IF NOT EXISTS id_ministere INTEGER REFERENCES public.ministeres(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.emplois.id_ministere IS 'Ministère de rattachement (null = commun à tous)';
CREATE INDEX IF NOT EXISTS idx_emplois_id_ministere ON public.emplois(id_ministere);

-- Table fonctions
ALTER TABLE public.fonctions ADD COLUMN IF NOT EXISTS id_ministere INTEGER REFERENCES public.ministeres(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.fonctions.id_ministere IS 'Ministère de rattachement (null = commun à tous)';
CREATE INDEX IF NOT EXISTS idx_fonctions_id_ministere ON public.fonctions(id_ministere);

