BEGIN;

WITH role_cible AS (
    SELECT r.id
    FROM roles r
    WHERE LOWER(r.nom) = 'agent'
    ORDER BY r.id
    LIMIT 1
),
role_fallback AS (
    SELECT COALESCE(
        (SELECT id FROM role_cible),
        3  -- à adapter si le rôle agent a un autre id
    ) AS id_role_agent
),
agent_candidates AS (
    SELECT
        a.id AS agent_id,
        TRIM(a.matricule) AS username,
        LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    LOWER(
                        TRANSLATE(
                            TRIM(a.nom),
                            'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
                            'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy'
                        )
                    ),
                    '\s+',
                    '',
                    'g'
                ),
                '[^a-z0-9]',
                '',
                'g'
            )
        ) AS nom_normalise,
        TO_CHAR(a.date_de_naissance, 'YYYY') AS birth_year,
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
        ) AS email_cible,
        LOWER(
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
            )
        ) AS email_normalise,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(
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
                )
            )
            ORDER BY a.id
        ) AS email_rank
    FROM agents a
    WHERE a.matricule IS NOT NULL
      AND a.nom IS NOT NULL
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
        CASE
            WHEN ac.email_rank > 1 THEN ac.username || '@auto.local'
            WHEN EXISTS (
                SELECT 1
                FROM utilisateurs u2
                WHERE LOWER(u2.email) = ac.email_normalise
            ) THEN ac.username || '@auto.local'
            ELSE ac.email_cible
        END,
        MD5(ac.nom_normalise || ac.birth_year),
        (SELECT id_role_agent FROM role_fallback),
        ac.agent_id,
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM agent_candidates ac
    RETURNING id, username, email, id_agent, created_at
)
SELECT
    i.id            AS utilisateur_id,
    i.username,
    i.email,
    i.id_agent,
    i.created_at
FROM inserted i
ORDER BY i.id;

COMMIT;