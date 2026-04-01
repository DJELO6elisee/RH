-- Ajout des colonnes pour la demande de type "besoin_personnel"
ALTER TABLE public.demandes
ADD COLUMN IF NOT EXISTS nombre_agents INTEGER NULL,
ADD COLUMN IF NOT EXISTS poste_souhaite VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS agents_satisfaits INTEGER DEFAULT 0;

-- Commentaire: la colonne agents_satisfaits permettra à la hiérarchie
-- (Directeurs, Sous directeurs, DRH etc.) de marquer combien d'agents
-- ont été physiquement affectés suite à cette demande. Le reste à satisfaire 
-- sera calculable via : (nombre_agents - agents_satisfaits)

-- Mise à jour de la contrainte CHECK pour inclure le nouveau type "besoin_personnel"
ALTER TABLE public.demandes DROP CONSTRAINT IF EXISTS demandes_type_demande_check;

ALTER TABLE public.demandes
ADD CONSTRAINT demandes_type_demande_check 
CHECK (((type_demande)::text = ANY (ARRAY[
    ('absence'::character varying)::text, 
    ('sortie_territoire'::character varying)::text, 
    ('attestation_travail'::character varying)::text, 
    ('attestation_presence'::character varying)::text, 
    ('note_service'::character varying)::text, 
    ('certificat_cessation'::character varying)::text,
    ('certificat_reprise_service'::character varying)::text,
    ('certificat_non_jouissance_conge'::character varying)::text,
    ('mutation'::character varying)::text,
    ('besoin_personnel'::character varying)::text
])));

DO $$
BEGIN
    RAISE NOTICE '✅ Migration réussie : Colonnes et contrainte CHECK ajoutées pour "besoin_personnel"';
END $$;
