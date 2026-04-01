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
    ('mutation'::character varying)::text
])));