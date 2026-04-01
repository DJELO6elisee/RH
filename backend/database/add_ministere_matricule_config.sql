-- ============================================================================
-- Table de configuration du format de matricule contractuel par ministère
-- ============================================================================
-- Le ministère 1 (Tourisme) utilise la syntaxe historique : Lettre + 6 chiffres (ex: A000101)
-- Les autres ministères utilisent : préfixe + séquence (ex: M2000001 si prefix='M2')
-- ============================================================================

-- CREATE TABLE IF NOT EXISTS public.ministere_matricule_config (
--     id_ministere INTEGER NOT NULL PRIMARY KEY REFERENCES public.ministeres(id) ON DELETE CASCADE,
--     prefix VARCHAR(50) NOT NULL,
--     prochaine_sequence INTEGER NOT NULL DEFAULT 1,
--     nb_chiffres INTEGER NOT NULL DEFAULT 6,
--     created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- COMMENT ON TABLE public.ministere_matricule_config IS 'Configuration de la génération du matricule des agents contractuels par ministère';
-- COMMENT ON COLUMN public.ministere_matricule_config.id_ministere IS 'ID du ministère';
-- COMMENT ON COLUMN public.ministere_matricule_config.prefix IS 'Préfixe du matricule (ex: M2, M10, CONTRAT)';
-- COMMENT ON COLUMN public.ministere_matricule_config.prochaine_sequence IS 'Prochain numéro de séquence à attribuer';
-- COMMENT ON COLUMN public.ministere_matricule_config.nb_chiffres IS 'Nombre de chiffres pour la partie numérique (ex: 6 donne 000001)';

-- ============================================================================
-- Exemples d'insertion pour un ministère
-- ============================================================================
-- Remplacez id_ministere par l'ID de votre ministère (ex: 2, 10, 11...).
-- prefix : préfixe du matricule (ex: M2 → M2000001, M10 → M10000001, CONTRAT → CONTRAT000001)
-- prochaine_sequence : 1 pour démarrer à 000001 (ou un nombre plus grand si vous avez déjà des matricules)
-- nb_chiffres : nombre de chiffres (6 → 000001, 5 → 00001)
-- ============================================================================

-- Ministère 2 : préfixe M2, 6 chiffres → M2000001, M2000002, ...
-- INSERT INTO public.ministere_matricule_config (id_ministere, prefix, prochaine_sequence, nb_chiffres)
-- VALUES (2, 'M2', 1, 6)
-- ON CONFLICT (id_ministere) DO UPDATE SET
--     prefix = EXCLUDED.prefix,
--     nb_chiffres = EXCLUDED.nb_chiffres,
--     updated_at = CURRENT_TIMESTAMP;

-- Ministère 10 : préfixe M10, 6 chiffres → M10000001, M10000002, ...
INSERT INTO public.ministere_matricule_config (id_ministere, prefix, prochaine_sequence, nb_chiffres)
VALUES (10, 'M10', 1, 6)
ON CONFLICT (id_ministere) DO UPDATE SET
    prefix = EXCLUDED.prefix,
    nb_chiffres = EXCLUDED.nb_chiffres,
    updated_at = CURRENT_TIMESTAMP;

-- Autre exemple : préfixe "CONTRAT" pour le ministère 10 → CONTRAT000001, CONTRAT000002, ...
-- INSERT INTO public.ministere_matricule_config (id_ministere, prefix, prochaine_sequence, nb_chiffres)
-- VALUES (10, 'CONTRAT', 1, 6)
-- ON CONFLICT (id_ministere) DO UPDATE SET
--     prefix = EXCLUDED.prefix,
--     nb_chiffres = EXCLUDED.nb_chiffres,
--     updated_at = CURRENT_TIMESTAMP;
