-- Migration: Ajouter 'certificat_prise_service' aux types de documents autorisés dans documents_autorisation
-- Ce script crée ou met à jour une contrainte CHECK sur type_document

-- Étape 1: Supprimer la contrainte existante si elle existe
ALTER TABLE public.documents_autorisation 
DROP CONSTRAINT IF EXISTS documents_autorisation_type_document_check;

-- Étape 2: Créer/Mettre à jour la contrainte CHECK avec tous les types de documents autorisés
ALTER TABLE public.documents_autorisation
ADD CONSTRAINT documents_autorisation_type_document_check 
CHECK (((type_document)::text = ANY (ARRAY[
    ('autorisation_absence'::character varying)::text,
    ('autorisation_sortie_territoire'::character varying)::text,
    ('attestation_presence'::character varying)::text,
    ('attestation_travail'::character varying)::text,
    ('certificat_cessation'::character varying)::text,
    ('certificat_reprise_service'::character varying)::text,
    ('certificat_non_jouissance_conge'::character varying)::text,
    ('certificat_prise_service'::character varying)::text,
    ('note_de_service'::character varying)::text,
    ('note_de_service_mutation'::character varying)::text
])));

-- Vérification : Afficher la contrainte créée
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.documents_autorisation'::regclass 
AND conname = 'documents_autorisation_type_document_check';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Migration réussie : La contrainte documents_autorisation_type_document_check a été créée/mise à jour pour inclure "certificat_prise_service"';
END $$;
