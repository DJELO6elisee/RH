-- Migration pour ajouter 'certificat_non_jouissance_conge' à la contrainte CHECK de type_demande
-- Syntaxe correspondant exactement à votre schéma de base de données

-- Étape 1: Supprimer la contrainte existante
ALTER TABLE public.demandes DROP CONSTRAINT IF EXISTS demandes_type_demande_check;

-- Étape 2: Recréer la contrainte avec 'certificat_non_jouissance_conge' ajouté
-- Utilisation de la même syntaxe que dans votre schéma actuel avec ARRAY et type casting
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
    ('mutation'::character varying)::text
])));

-- Vérification : Afficher la contrainte créée
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.demandes'::regclass 
AND conname = 'demandes_type_demande_check';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Migration réussie : La contrainte demandes_type_demande_check a été mise à jour pour inclure "certificat_non_jouissance_conge"';
END $$;
