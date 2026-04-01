-- Ajout de la colonne manquante pour le prénom du conjoint(e)
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS prenom_conjointe VARCHAR(100);

