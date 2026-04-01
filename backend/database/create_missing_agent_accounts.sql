-- =====================================================================
-- Script  : create_missing_agent_accounts.sql
-- Objet   : Créer automatiquement des comptes utilisateurs pour tous
--           les agents dépourvus de compte dans l'application RH.
-- Règles  :
--   * Identifiant (username)  = matricule de l'agent (trimé)
--   * Mot de passe initial    = nom de famille en minuscules (sans accents,
--                               ni espaces) concaténé avec l'année de naissance
--                               (ex: nom "Gnanti", année 2025 => "gnanti2025")
--   * Rôle attribué           = rôle "agent" (id_role = 3)
--   * Comptes créés uniquement pour les agents sans utilisateur existant
-- =====================================================================

-- ⚠️  À exécuter sur une sauvegarde ou dans un environnement contrôlé !
--     Certaines opérations (CREATE EXTENSION) nécessitent les droits superuser.

BEGIN;

-- Activer les extensions nécessaires pour le hachage et la normalisation.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

WITH agent_candidates AS (
    SELECT
        a.id                                                    AS agent_id,
        TRIM(a.matricule)                                       AS username,
        LOWER(
            REGEXP_REPLACE(
                unaccent(TRIM(a.nom)),
                '[^a-z0-9]',
                '',
                'g'
            )
        )                                                       AS nom_normalise,
        TO_CHAR(a.date_de_naissance, 'YYYY')                    AS birth_year,
        COALESCE(
            NULLIF(TRIM(a.email), ''),
            LOWER(
                REGEXP_REPLACE(
                    TRIM(a.matricule),
                    '[^a-z0-9]',
                    '',
                    'g'
                )
            ) || '@no-email.local'
        )                                                       AS email_cible
    FROM agents a
    WHERE a.matricule IS NOT NULL
      AND a.date_de_naissance IS NOT NULL
      AND NOT EXISTS (
            SELECT 1
            FROM utilisateurs u
            WHERE u.id_agent = a.id
      )
      AND NOT EXISTS (
            SELECT 1
            FROM utilisateurs u
            WHERE LOWER(u.username) = LOWER(TRIM(a.matricule))
      )
),
inserted AS (
    INSERT INTO utilisateurs (
        username,
        email,
        password_hash,
        id_role,
        id_agent,
        is_active,
        created_at,
        updated_at
    )
    SELECT
        ac.username,
        ac.email_cible,
        crypt(ac.nom_normalise || ac.birth_year, gen_salt('bf', 10)),
        3,
        ac.agent_id,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM agent_candidates ac
    RETURNING id, username, email, id_agent, created_at
)
SELECT
    i.id                AS utilisateur_id,
    i.username,
    i.email,
    i.id_agent,
    i.created_at
FROM inserted i
ORDER BY i.id;

COMMIT;

-- =====================================================================
-- Contrôle post-exécution (optionnel) :
-- Liste des agents encore sans compte après exécution du script.
-- =====================================================================
-- SELECT a.id, a.matricule, a.nom, a.prenom
-- FROM agents a
-- LEFT JOIN utilisateurs u ON u.id_agent = a.id
-- WHERE u.id IS NULL
-- ORDER BY a.id;


