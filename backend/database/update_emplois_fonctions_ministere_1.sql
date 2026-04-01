-- ============================================================================
-- Attribuer id_ministere = 1 à tous les emplois et fonctions existants (NULL)
-- À exécuter après add_id_ministere_emplois_fonctions.sql si les données
-- existantes doivent être rattachées au ministère 1
-- ============================================================================

-- Vérifier que le ministère 1 existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.ministeres WHERE id = 1) THEN
        RAISE EXCEPTION 'Le ministère avec id = 1 n''existe pas dans la table ministeres.';
    END IF;
END $$;

-- Emplois : rattacher au ministère 1 tous les enregistrements sans ministère
UPDATE public.emplois
SET id_ministere = 1
WHERE id_ministere IS NULL;

-- Fonctions : rattacher au ministère 1 tous les enregistrements sans ministère
UPDATE public.fonctions
SET id_ministere = 1
WHERE id_ministere IS NULL;

-- Résumé (optionnel, pour vérification)
DO $$
DECLARE
    nb_emplois  INTEGER;
    nb_fonctions INTEGER;
BEGIN
    SELECT COUNT(*) INTO nb_emplois  FROM public.emplois  WHERE id_ministere = 1;
    SELECT COUNT(*) INTO nb_fonctions FROM public.fonctions WHERE id_ministere = 1;
    RAISE NOTICE 'Emplois  rattachés au ministère 1 : %', nb_emplois;
    RAISE NOTICE 'Fonctions rattachées au ministère 1 : %', nb_fonctions;
END $$;
